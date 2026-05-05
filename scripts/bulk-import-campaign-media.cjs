/**
 * Bulk-import local images into Supabase Storage (campaigns bucket) + media_items.
 *
 * Prerequisites:
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment
 *     (Dashboard → Project Settings → API). Service role bypasses RLS.
 *
 * Usage:
 *   node scripts/bulk-import-campaign-media.cjs --campaign <campaign_uuid> --dir ./battlemaps --type map
 *   node scripts/bulk-import-campaign-media.cjs --campaign <campaign_uuid> --dir ./tokens --type token
 *
 *   yarn bulk-import-media -- --campaign <uuid> --dir ./maps --type map
 *
 * Categorization (no separate DB field): folder names become part of the item name, e.g.
 *   tokens/humanoids/goblin.png → name "humanoids / goblin"
 *   maps/cave/level1.webp      → name "cave / level1"
 *
 * Options:
 *   --dry-run    Print planned imports only
 *   --limit N    Stop after N files
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

function parseArgs() {
  const args = process.argv.slice(2);
  const o = {
    campaign: null,
    dir: null,
    type: "map",
    dryRun: false,
    limit: Infinity,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--campaign" && args[i + 1]) {
      o.campaign = args[++i];
      continue;
    }
    if (args[i] === "--dir" && args[i + 1]) {
      o.dir = args[++i];
      continue;
    }
    if (args[i] === "--type" && args[i + 1]) {
      o.type = args[++i];
      continue;
    }
    if (args[i] === "--dry-run") {
      o.dryRun = true;
      continue;
    }
    if (args[i] === "--limit" && args[i + 1]) {
      o.limit = parseInt(args[++i], 10);
      continue;
    }
  }
  return o;
}

function walkFiles(rootDir) {
  const out = [];
  function walk(d, rel) {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      const r = rel ? path.join(rel, e.name) : e.name;
      if (e.isDirectory()) walk(full, r);
      else {
        const ext = path.extname(e.name).toLowerCase();
        if (EXT.has(ext)) out.push({ full, rel: r });
      }
    }
  }
  walk(rootDir, "");
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

function nameFromRel(rel) {
  const noExt = rel.replace(/\.[^.]+$/, "");
  const parts = noExt.split(path.sep).filter(Boolean);
  if (parts.length === 0) return "untitled";
  if (parts.length === 1) return parts[0];
  const base = parts[parts.length - 1];
  const cats = parts.slice(0, -1).join(" / ");
  return `${cats} / ${base}`;
}

function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

async function main() {
  const opts = parseArgs();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!opts.campaign || !opts.dir) {
    console.error(
      "Usage: node scripts/bulk-import-campaign-media.cjs --campaign <uuid> --dir <path> [--type map|token] [--dry-run] [--limit N]"
    );
    process.exit(1);
  }
  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.");
    process.exit(1);
  }
  const absDir = path.resolve(opts.dir);
  if (!fs.existsSync(absDir)) {
    console.error("Directory not found:", absDir);
    process.exit(1);
  }

  const mediaType = opts.type === "token" ? "token" : "map";
  const files = walkFiles(absDir);
  const slice = files.slice(0, opts.limit);

  console.log(`Found ${files.length} image(s); processing ${slice.length}.`);

  if (opts.dryRun) {
    for (const f of slice) {
      console.log("[dry-run]", nameFromRel(f.rel), "<-", f.full);
    }
    return;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const defaultGrid =
    mediaType === "map"
      ? { pixelSize: 50, type: "square", feetPerSquare: 5, bulk_import: true }
      : null;

  let ok = 0;
  let fail = 0;

  for (const f of slice) {
    const buf = fs.readFileSync(f.full);
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${path.basename(f.full).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storagePath = `${opts.campaign}/media/image/${safeName}`;

    const { error: upErr } = await supabase.storage.from("campaigns").upload(storagePath, buf, {
      contentType: guessContentType(f.full),
      cacheControl: "3600",
      upsert: false,
    });
    if (upErr) {
      console.error("Upload failed:", f.rel, upErr.message);
      fail++;
      continue;
    }

    const { data: pub } = supabase.storage.from("campaigns").getPublicUrl(storagePath);
    const publicUrl = pub.publicUrl;
    const itemName = nameFromRel(f.rel);

    const { error: insErr } = await supabase.from("media_items").insert({
      campaign_id: opts.campaign,
      name: itemName,
      image_url: publicUrl,
      type: mediaType,
      grid_config: defaultGrid,
    });
    if (insErr) {
      console.error("Insert failed:", f.rel, insErr.message);
      fail++;
      continue;
    }
    ok++;
    if (ok % 25 === 0) console.log(`… ${ok} imported`);
  }

  console.log(`Done. Imported: ${ok}, failed: ${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
