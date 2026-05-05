#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Imports the public 5e-bits API into Scryer's Supabase SRD tables.
 *
 * Usage:
 *   node scripts/import-5e-bits-srd.cjs --dry-run
 *   node scripts/import-5e-bits-srd.cjs --endpoint monsters
 *   node scripts/import-5e-bits-srd.cjs --skip-images
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const API_BASE = "https://www.dnd5eapi.co";
const API_ROOT = `${API_BASE}/api/2014`;
const SOURCE_VERSION = "2014";
const BATCH_SIZE = 100;

const ENDPOINT_TABLES = {
  "ability-scores": "srd_ability_scores",
  alignments: "srd_alignments",
  backgrounds: "srd_backgrounds",
  classes: "srd_classes",
  conditions: "srd_conditions",
  "damage-types": "srd_damage_types",
  equipment: "srd_equipment",
  "equipment-categories": "srd_equipment_categories",
  feats: "srd_feats",
  features: "srd_features",
  languages: "srd_languages",
  "magic-items": "srd_magic_items",
  "magic-schools": "srd_magic_schools",
  monsters: "srd_monsters",
  proficiencies: "srd_proficiencies",
  races: "srd_races",
  "rule-sections": "srd_rule_sections",
  rules: "srd_rules",
  skills: "srd_skills",
  spells: "srd_spells",
  subclasses: "srd_subclasses",
  subraces: "srd_subraces",
  traits: "srd_traits",
  "weapon-properties": "srd_weapon_properties",
};

function parseArgs(argv) {
  const opts = {
    dryRun: false,
    endpoint: null,
    skipImages: false,
    limit: Infinity,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--skip-images") opts.skipImages = true;
    else if (arg === "--endpoint" && argv[i + 1]) opts.endpoint = argv[++i];
    else if (arg === "--limit" && argv[i + 1]) opts.limit = Number(argv[++i]);
    else if (arg === "--help") {
      console.log("Usage: node scripts/import-5e-bits-srd.cjs [--dry-run] [--endpoint monsters] [--skip-images] [--limit N]");
      process.exit(0);
    }
  }

  return opts;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function text(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join("\n\n") || null;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function refIndex(ref) {
  if (typeof ref === "string") return ref;
  return ref?.index ?? ref?.name ?? null;
}

function refIndexes(values) {
  if (!Array.isArray(values)) return [];
  return values.map(refIndex).filter(Boolean);
}

function normalizeArmorClass(value) {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) {
    const firstNumber = value.find((item) => typeof item === "number");
    if (typeof firstNumber === "number") return firstNumber;
    const firstObject = value.find((item) => item && typeof item === "object" && typeof item.value === "number");
    if (firstObject) return firstObject.value;
  }
  if (value && typeof value === "object" && typeof value.value === "number") return value.value;
  return null;
}

function firstCategoryName(value) {
  if (Array.isArray(value)) return value[0]?.name ?? value[0]?.index ?? null;
  return value?.name ?? value?.index ?? null;
}

function tableForEndpoint(endpoint) {
  return ENDPOINT_TABLES[endpoint] ?? `srd_${endpoint.replace(/-/g, "_")}`;
}

function mapCommon(item) {
  return {
    index: item.index,
    name: item.name,
    raw: item,
    source_version: SOURCE_VERSION,
  };
}

function mapItem(endpoint, item) {
  const common = mapCommon(item);

  switch (endpoint) {
    case "ability-scores":
      return {
        ...common,
        full_name: item.full_name ?? null,
        description: text(item.desc),
        skills: item.skills ?? [],
      };
    case "alignments":
      return {
        ...common,
        abbreviation: item.abbreviation ?? null,
        description: text(item.desc),
      };
    case "backgrounds":
      return {
        ...common,
        description: text(item.desc),
        skill_proficiencies: text(refIndexes(item.starting_proficiencies).join(", ")),
        tool_proficiencies: null,
        languages: text(item.language_options?.desc),
        equipment: text([
          ...(item.starting_equipment ?? []).map((entry) => `${entry.equipment?.name ?? entry.equipment?.index} x${entry.quantity ?? 1}`),
          item.starting_equipment_options?.desc,
        ].filter(Boolean)),
        feature: text(item.feature?.desc),
      };
    case "classes":
      return {
        ...common,
        hit_die: item.hit_die ?? null,
        proficiency_choices: item.proficiency_choices ?? [],
        proficiencies: item.proficiencies ?? [],
        saving_throws: refIndexes(item.saving_throws),
        starting_equipment: {
          starting_equipment: item.starting_equipment ?? [],
          starting_equipment_options: item.starting_equipment_options ?? [],
        },
        class_levels: item.class_levels ?? null,
        spellcasting: item.spellcasting ?? null,
        subclasses: refIndexes(item.subclasses),
      };
    case "conditions":
    case "damage-types":
    case "magic-schools":
    case "weapon-properties":
      return {
        ...common,
        description: text(item.desc),
      };
    case "equipment":
      return {
        ...common,
        equipment_category: firstCategoryName(item.equipment_category),
        gear_category: firstCategoryName(item.gear_category),
        cost: item.cost ?? null,
        weight: item.weight ?? null,
        description: text(item.desc),
        weapon_category: item.weapon_category ?? null,
        weapon_range: item.weapon_range ?? null,
        category_range: item.category_range ?? null,
        damage: item.damage ?? null,
        two_handed_damage: item.two_handed_damage ?? null,
        range: item.range ?? null,
        properties: item.properties ?? [],
        armor_category: item.armor_category ?? null,
        armor_class: item.armor_class ?? null,
        str_minimum: item.str_minimum ?? null,
        stealth_disadvantage: item.stealth_disadvantage ?? null,
      };
    case "equipment-categories":
      return {
        ...common,
        equipment: item.equipment ?? [],
      };
    case "feats":
      return {
        ...common,
        description: text(item.desc),
        prerequisites: item.prerequisites ?? [],
      };
    case "features":
      return {
        ...common,
        level: item.level ?? null,
        class_index: item.class?.index ?? null,
        subclass_index: item.subclass?.index ?? null,
        description: text(item.desc),
        feature_specific: item.feature_specific ?? null,
      };
    case "languages":
      return {
        ...common,
        type: item.type ?? null,
        typical_speakers: Array.isArray(item.typical_speakers) ? item.typical_speakers : [],
        script: item.script ?? null,
      };
    case "magic-items":
      return {
        ...common,
        equipment_category: item.equipment_category?.name ?? item.equipment_category?.index ?? null,
        rarity: item.rarity?.name ?? item.rarity?.index ?? null,
        variants: refIndexes(item.variants),
        requires_attunement: item.requires_attunement ?? null,
        variant_of: item.variant_of?.index ?? null,
        description: text(item.desc),
      };
    case "monsters":
      return {
        ...common,
        size: item.size ?? null,
        type: item.type ?? null,
        subtype: item.subtype ?? null,
        alignment: item.alignment ?? null,
        armor_class: normalizeArmorClass(item.armor_class),
        hit_points: item.hit_points ?? null,
        hit_dice: item.hit_dice ?? null,
        speed: item.speed ?? null,
        strength: item.strength ?? null,
        dexterity: item.dexterity ?? null,
        constitution: item.constitution ?? null,
        intelligence: item.intelligence ?? null,
        wisdom: item.wisdom ?? null,
        charisma: item.charisma ?? null,
        proficiencies: item.proficiencies ?? [],
        damage_vulnerabilities: item.damage_vulnerabilities ?? [],
        damage_resistances: item.damage_resistances ?? [],
        damage_immunities: item.damage_immunities ?? [],
        condition_immunities: refIndexes(item.condition_immunities),
        senses: item.senses ?? null,
        languages: item.languages ?? null,
        challenge_rating: item.challenge_rating ?? null,
        xp: item.xp ?? null,
        special_abilities: item.special_abilities ?? [],
        actions: item.actions ?? [],
        legendary_actions: item.legendary_actions ?? [],
        reactions: item.reactions ?? [],
        image_urls: [],
      };
    case "proficiencies":
      return {
        ...common,
        type: item.type ?? null,
        classes: item.classes ?? [],
        races: item.races ?? [],
        reference: item.reference ?? null,
      };
    case "races":
      return {
        ...common,
        speed: item.speed ?? null,
        ability_bonuses: item.ability_bonuses ?? [],
        size: item.size ?? null,
        size_description: item.size_description ?? null,
        languages: item.languages ?? [],
        language_desc: item.language_desc ?? null,
        traits: item.traits ?? [],
        subraces: refIndexes(item.subraces),
      };
    case "rule-sections":
      return {
        ...common,
        description: text(item.desc),
      };
    case "rules":
      return {
        ...common,
        description: text(item.desc),
        subsections: item.subsections ?? [],
      };
    case "skills":
      return {
        ...common,
        description: text(item.desc),
        ability_score: item.ability_score ?? null,
      };
    case "spells":
      return {
        ...common,
        level: item.level ?? 0,
        school: item.school?.name ?? item.school?.index ?? "",
        casting_time: item.casting_time ?? null,
        range: item.range ?? null,
        components: item.components ?? [],
        material: item.material ?? null,
        duration: item.duration ?? null,
        concentration: item.concentration ?? false,
        ritual: item.ritual ?? false,
        description: text(item.desc),
        higher_level: text(item.higher_level),
        classes: refIndexes(item.classes),
      };
    case "subclasses":
      return {
        ...common,
        class_index: item.class?.index ?? null,
        subclass_flavor: item.subclass_flavor ?? null,
        description: text(item.desc),
        features: item.subclass_levels ?? item.features ?? [],
      };
    case "subraces":
      return {
        ...common,
        race: item.race ?? null,
        description: text(item.desc),
        ability_bonuses: item.ability_bonuses ?? [],
        starting_proficiencies: item.starting_proficiencies ?? [],
        languages: item.languages ?? [],
        racial_traits: item.racial_traits ?? [],
      };
    case "traits":
      return {
        ...common,
        description: text(item.desc),
        races: item.races ?? [],
        subraces: item.subraces ?? [],
        proficiencies: item.proficiencies ?? [],
        proficiency_choices: item.proficiency_choices ?? null,
        trait_specific: item.trait_specific ?? null,
      };
    default:
      return common;
  }
}

function mapProficiencyTraining(item) {
  const rawType = String(item.type || "").toLowerCase();
  const referenceUrl = String(item.reference?.url || "");
  let type = null;

  if (rawType.includes("armor") || referenceUrl.includes("/armor")) type = "armor";
  else if (rawType.includes("weapon") || referenceUrl.includes("/weapon")) type = "weapon";
  else if (rawType.includes("tool") || referenceUrl.includes("/tools")) type = "tool";
  else if (rawType.includes("language") || referenceUrl.includes("/languages")) type = "language";

  if (!type) return null;

  return {
    index: item.index,
    name: item.name,
    type,
    description: item.reference?.name ?? item.name ?? null,
    category: item.reference?.index ?? null,
    raw: item,
    source_version: SOURCE_VERSION,
  };
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function imageUrlForMonster(item, skipImages) {
  if (skipImages) return [];

  const candidates = [
    item.image ? `${API_BASE}${item.image}` : null,
    `${API_ROOT}/monsters/${item.index}.png`,
    `${API_BASE}/api/images/monsters/${item.index}.png`,
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, { method: "HEAD" });
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.startsWith("image/")) return [candidate];
    } catch {
      // Try next candidate.
    }
  }

  return [];
}

async function upsertRows(supabase, table, rows, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] ${table}: would upsert ${rows.length} row(s)`);
    return { ok: rows.length, failed: 0 };
  }

  let ok = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: "index" });
    if (error) {
      failed += batch.length;
      console.error(`${table}: upsert failed for batch starting ${i}: ${error.message}`);
    } else {
      ok += batch.length;
    }
  }
  return { ok, failed };
}

async function importEndpoint(supabase, endpoint, url, opts) {
  const list = await fetchJson(`${API_BASE}${url}`);
  const refs = (list.results ?? []).slice(0, opts.limit);
  const table = tableForEndpoint(endpoint);
  const rows = [];
  let imageCount = 0;
  let failedFetches = 0;

  console.log(`${endpoint}: fetching ${refs.length} item(s)`);

  for (const ref of refs) {
    try {
      const item = await fetchJson(`${API_BASE}${ref.url}`);
      const row = mapItem(endpoint, item);
      if (endpoint === "monsters") {
        row.image_urls = await imageUrlForMonster(item, opts.skipImages);
        if (row.image_urls.length > 0) imageCount += 1;
      }
      rows.push(row);
    } catch (error) {
      failedFetches += 1;
      console.error(`${endpoint}: failed ${ref.index ?? ref.url}: ${error.message}`);
    }
  }

  const result = await upsertRows(supabase, table, rows, opts.dryRun);

  if (endpoint === "proficiencies") {
    const trainingRows = rows.map((row) => mapProficiencyTraining(row.raw)).filter(Boolean);
    const trainingResult = await upsertRows(supabase, "srd_proficiencies_training", trainingRows, opts.dryRun);
    console.log(`srd_proficiencies_training: ${trainingResult.ok} ok, ${trainingResult.failed} failed`);
  }

  console.log(`${table}: ${result.ok} ok, ${result.failed} failed, ${failedFetches} fetch failed${endpoint === "monsters" ? `, ${imageCount} image URL(s)` : ""}`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  loadEnvFile(path.join(process.cwd(), ".env.local"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!opts.dryRun && (!url || !key)) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment/.env.local");
  }

  const supabase = opts.dryRun
    ? null
    : createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const root = await fetchJson(API_ROOT);
  const endpoints = Object.entries(root)
    .filter(([endpoint]) => !opts.endpoint || endpoint === opts.endpoint)
    .filter(([endpoint]) => ENDPOINT_TABLES[endpoint]);

  if (opts.endpoint && endpoints.length === 0) {
    throw new Error(`Endpoint "${opts.endpoint}" was not found in ${API_ROOT} or is not mapped`);
  }

  console.log(`${opts.dryRun ? "[dry-run] " : ""}Importing ${endpoints.length} endpoint(s) from ${API_ROOT}`);

  for (const [endpoint, endpointUrl] of endpoints) {
    await importEndpoint(supabase, endpoint, endpointUrl, opts);
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
