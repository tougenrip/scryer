import type { VttSampleKind } from "@/lib/vtt/sample-catalog";

/** Max raw download / upload read before we resize. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
/** Max size sent to Ollama after compression (base64 in JSON makes this the main limit). */
const MAX_OLLAMA_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_SLUGS_IN_PROMPT = 100;

type OllamaChatResponse = {
  message?: { content?: string };
  error?: string;
};

function ollamaOptions() {
  const numCtx = Math.min(
    131072,
    Math.max(1024, Number(process.env.OLLAMA_NUM_CTX || "4096") || 4096)
  );
  const numPredict = Math.min(
    1024,
    Math.max(16, Number(process.env.OLLAMA_NUM_PREDICT || "192") || 192)
  );
  return { num_ctx: numCtx, num_predict: numPredict, temperature: 0.2 };
}

function isRunnerStopError(message: string) {
  return /runner has unexpectedly stopped|resource limitations|internal error|out of memory|cuda|metal|failed to create context/i.test(
    message
  );
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Normalize slug compare (catalog slugs are lower-case hyphenated in practice). */
function normalizeSlug(s: string) {
  return s.trim().toLowerCase();
}

/** Map normalized slug back to catalog spelling. */
function buildCanonicalMap(allowed: Set<string>) {
  const m = new Map<string, string>();
  for (const s of allowed) {
    m.set(normalizeSlug(s), s);
  }
  return m;
}

function stripOcrNoise(text: string) {
  return text
    .replace(/<\|[^|]*\|>/g, " ")
    .replace(/<\|/g, " ")
    .replace(/\|>/g, " ")
    .replace(/<\/ref>/gi, " ")
    .replace(/<ref[^>]*>/gi, " ");
}

/** Many models ignore strict JSON. Accept JSON, one-line CHOICE: lists, and substring matches. */
function parseSlugsFromModelText(raw: string, allowed: Set<string>): string[] {
  const byNorm = buildCanonicalMap(allowed);
  const out: string[] = [];
  const add = (s: string) => {
    const c = byNorm.get(normalizeSlug(s));
    if (c) out.push(c);
  };
  const dedupe = (xs: string[]) => [...new Set(xs)];

  const cleaned = stripOcrNoise(raw);
  const trimmed = cleaned.trim();

  // 1) "slugs": [...] (prefer — avoids greedy-\{ \} on huge model output)
  const slugsArr = cleaned.match(/"slugs"\s*:\s*(\[[\s\S]*?\])/i);
  if (slugsArr) {
    try {
      const arr = JSON.parse(slugsArr[1] ?? "[]") as unknown;
      if (Array.isArray(arr)) {
        for (const x of arr) {
          if (typeof x === "string") add(x);
        }
        if (out.length) return dedupe(out);
      }
    } catch {
      // fall through
    }
  }
  const block = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?})\s*```/);
  if (block) {
    try {
      const j = JSON.parse(block[1] ?? "{}") as { slugs?: unknown };
      if (Array.isArray(j.slugs)) {
        for (const x of j.slugs) {
          if (typeof x === "string") add(x);
        }
        if (out.length) return dedupe(out);
      }
    } catch {
      // fall through
    }
  }

  // 2) JSON array of strings: ["a","b"]
  const arrM = trimmed.match(/\[\s*("[^"]*"\s*,\s*)*("[^"]*")\s*\]/);
  if (arrM) {
    try {
      const a = JSON.parse(arrM[0]) as unknown;
      if (Array.isArray(a)) {
        for (const x of a) {
          if (typeof x === "string") add(x);
        }
        if (out.length) return dedupe(out);
      }
    } catch {
      // fall through
    }
  }

  // 3) CHOICE: a, b  (dedicated line or anywhere in the blob after OCR noise)
  const parseChoiceRest = (rest: string) => {
    const r = rest.trim();
    if (!r || /^none$/i.test(r)) return [] as string[];
    const acc: string[] = [];
    for (const part of r.split(/[,;|]+/)) {
      const t = part.replace(/^["'[\]]+|["'[\]]+$/g, "").trim();
      if (t && !/^none$/i.test(t)) {
        const c = byNorm.get(normalizeSlug(t));
        if (c) acc.push(c);
      }
    }
    return acc;
  };
  const choiceLine = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => /^(choice|tags|slugs|pick|selected)\s*:/i.test(l));
  const choiceInline = cleaned.match(/\bCHOICE:\s*([^\n\r]+)/i);
  const choiceRest = choiceLine
    ? choiceLine.replace(/^(choice|tags|slugs|pick|selected)\s*:\s*/i, "")
    : choiceInline
      ? (choiceInline[1] ?? "")
      : "";
  if (choiceRest || choiceLine) {
    const fromChoice = parseChoiceRest(choiceRest);
    if (fromChoice.length > 0) return dedupe(fromChoice);
    if (choiceLine || choiceInline) {
      if (!choiceRest.trim() || /^none$/i.test(choiceRest.trim())) return [];
    }
  }

  // 4) Comma-separated (first line) if it looks like slug tokens only
  const firstLine = trimmed.split(/\r?\n/)[0] ?? "";
  if (firstLine.includes(",") && !firstLine.includes("{") && !firstLine.includes("[")) {
    for (const part of firstLine.split(/[,;]+/)) {
      const t = part.replace(/^["'\s]+|["'\s]+$/g, "").trim();
      if (t && byNorm.has(normalizeSlug(t)) && t.length < 64) add(t);
    }
    if (out.length) return dedupe(out);
  }

  // 5) Substring: each allowed slug mentioned as a token (OCR/vision may add spaces)
  for (const s of allowed) {
    if (!s) continue;
    if (s.length < 1) continue;
    if (new RegExp(`(?:^|[^a-z0-9-])${escapeRegex(s)}(?:$|[^a-z0-9-])`, "i").test(cleaned)) {
      out.push(s);
    }
  }
  return dedupe(out);
}

export function getOllamaTagConfig(): { baseUrl: string; model: string } | null {
  const model = process.env.OLLAMA_TAG_MODEL?.trim() ?? "";
  if (!model) return null;
  const baseUrl = (process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434").replace(
    /\/$/,
    ""
  );
  return { baseUrl, model };
}

type SuggestInput = {
  imageBase64: string;
  folderKind: VttSampleKind;
  /** Extra tag slugs the model may pick (excludes folder kind slug by design). */
  allowedExtraSlugs: string[];
  fileLabel: string;
};

/**
 * Call local Ollama (e.g. deepseek-ocr) to pick slugs for a VTT sample image.
 */
export async function suggestVttTagSlugsWithOllama(input: SuggestInput): Promise<{
  slugs: string[];
  raw: string;
}> {
  const cfg = getOllamaTagConfig();
  if (!cfg) {
    throw new Error("OLLAMA_TAG_MODEL is not set");
  }
  if (input.allowedExtraSlugs.length === 0) {
    return { slugs: [], raw: "" };
  }

  const kindLabel = input.folderKind;
  const allowed = new Set(input.allowedExtraSlugs);
  const allSorted = [...allowed].sort();
  const omitted = allSorted.length > MAX_SLUGS_IN_PROMPT ? allSorted.length - MAX_SLUGS_IN_PROMPT : 0;
  const list = allSorted.slice(0, MAX_SLUGS_IN_PROMPT).join(", ");
  const listNote =
    omitted > 0
      ? ` (Only the first ${MAX_SLUGS_IN_PROMPT} slugs are shown below; ${omitted} more exist only in the app — you cannot pick those here.)`
      : "";
  const prompt = `You label VTT (virtual tabletop) image samples.
File: ${input.fileLabel}. Folder kind "${input.folderKind}" is already applied — do NOT repeat that as a tag.

From ONLY the slugs below, pick 0 to 8 that match the image (theme, place, style). Copy spellings exactly.
${listNote}
Slugs: ${list}

Output EXACTLY one line, nothing else (no code fences, no explanation):
CHOICE:slug-a,slug-b,slug-c
or if none fit: CHOICE:NONE
`;

  const controller = new AbortController();
  const timeoutMs = Math.min(600_000, Math.max(30_000, Number(process.env.OLLAMA_TAG_TIMEOUT_MS || "180000") || 180_000));
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const attempts = [ollamaOptions(), { num_ctx: 2048, num_predict: 96, temperature: 0.2 }];
  let lastError = "";
  let raw = "";
  for (let i = 0; i < attempts.length; i += 1) {
    let res: Response;
    try {
      res = await fetch(`${cfg.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: cfg.model,
          stream: false,
          options: attempts[i],
          messages: [
            {
              role: "user",
              content: prompt,
              images: [input.imageBase64],
            },
          ],
        }),
        signal: controller.signal,
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        clearTimeout(timeout);
        throw new Error(
          "Ollama request timed out (vision models can be slow; try a smaller image or increase OLLAMA_TAG_TIMEOUT_MS)"
        );
      }
      lastError = e instanceof Error ? e.message : "Ollama request failed";
      break;
    }

    const responseText = await res.text();
    let json: OllamaChatResponse;
    try {
      json = JSON.parse(responseText) as OllamaChatResponse;
    } catch {
      lastError = `Ollama returned a non-JSON response (HTTP ${res.status}). Is Ollama running at ${cfg.baseUrl}?`;
      break;
    }

    if (!res.ok || json.error) {
      const message = [json.error, `HTTP ${res.status}`].filter(Boolean).join(" — ") || "Ollama error";
      lastError = message;
      if (i < attempts.length - 1 && isRunnerStopError(message)) {
        continue;
      }
      break;
    }

    raw = (json.message?.content ?? "").trim();
    if (!raw) {
      clearTimeout(timeout);
      return { slugs: [], raw: "" };
    }
    clearTimeout(timeout);
    const slugs = parseSlugsFromModelText(raw, allowed);
    return { slugs, raw };
  }
  clearTimeout(timeout);
  if (lastError) {
    throw new Error(
      lastError +
        " — Try lower limits in .env (OLLAMA_NUM_CTX=2048, OLLAMA_NUM_PREDICT=96) or a smaller model (e.g. llava:7b)."
    );
  }
  throw new Error("Ollama call failed");
}

export function assertImageSize(buf: Buffer, maxBytes: number = MAX_IMAGE_BYTES, which = "file") {
  if (buf.length > maxBytes) {
    const mb = Math.round(maxBytes / 1024 / 1024);
    throw new Error(
      which === "ollama"
        ? `Image is still too large after compressing for the vision request (max ${mb}MB; try a smaller source image).`
        : `Image is too large (${which}, max ${mb}MB)`
    );
  }
}

export { MAX_IMAGE_BYTES, MAX_OLLAMA_IMAGE_BYTES };
