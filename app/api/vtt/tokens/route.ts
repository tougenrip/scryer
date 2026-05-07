import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import { createClient } from "@/lib/supabase/server";
import { cleanVttDisplayName } from "@/lib/vtt/display-name";

type PlaceTokenPayload = {
  campaignId?: unknown;
  mapId?: unknown;
  token?: {
    name?: unknown;
    image_url?: unknown;
    type?: unknown;
    character_id?: unknown;
    monster_index?: unknown;
    monster_source?: unknown;
    srd_monster_id?: unknown;
    x?: unknown;
    y?: unknown;
  };
};

type UpdateTokenPayload = {
  campaignId?: unknown;
  tokenId?: unknown;
  updates?: Record<string, unknown>;
};

type DeleteTokenPayload = {
  campaignId?: unknown;
  tokenId?: unknown;
};

const TOKEN_UPDATE_COLUMNS = new Set([
  "name",
  "x",
  "y",
  "size",
  "color",
  "rotation",
  "conditions",
  "hp_current",
  "hp_max",
  "scale",
  "image_url",
  "light_radius_ft",
  "vision_range_ft",
]);

const DARKVISION_RACE_INDEXES = new Set([
  'dwarf', 'hill-dwarf', 'mountain-dwarf',
  'elf', 'high-elf', 'wood-elf',
  'gnome', 'forest-gnome', 'rock-gnome',
  'half-elf', 'half-orc', 'tiefling',
]);
const DEEP_DARKVISION_RACE_INDEXES = new Set(['drow']);

function inferVisionRangeFt(raceIndex: string | null | undefined): number {
  if (!raceIndex) return 0;
  if (DEEP_DARKVISION_RACE_INDEXES.has(raceIndex)) return 120;
  if (DARKVISION_RACE_INDEXES.has(raceIndex)) return 60;
  return 0;
}

type TokenRow = {
  id: string;
  name: string | null;
  image_url: string | null;
  character_id: string | null;
  monster_source: string | null;
  monster_index: string | null;
  [key: string]: unknown;
};

type MonsterSummary = {
  index: string;
  name: string;
  armor_class: number | null;
  hit_points: number | null;
  hit_dice: string | null;
  speed: unknown;
  damage_resistances: string[] | null;
  damage_immunities: string[] | null;
  damage_vulnerabilities: string[] | null;
  condition_immunities: string[] | null;
  senses: unknown;
  type: string | null;
  subtype: string | null;
  challenge_rating: number | null;
  actions: unknown[] | null;
  special_abilities: unknown[] | null;
  reactions: unknown[] | null;
  legendary_actions: unknown[] | null;
};

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function cleanMonsterDisplayName(value?: string | null) {
  return cleanVttDisplayName(value, "");
}

async function findSrdMonster(admin: ReturnType<typeof createAdminSupabaseClient>, {
  id,
  index,
  name,
}: {
  id?: string | null;
  index?: string | null;
  name?: string | null;
}) {
  const columns = `
    index,
    name,
    armor_class,
    hit_points,
    hit_dice,
    speed,
    damage_resistances,
    damage_immunities,
    damage_vulnerabilities,
    condition_immunities,
    senses,
    type,
    subtype,
    challenge_rating,
    actions,
    special_abilities,
    reactions,
    legendary_actions
  `;

  if (id) {
    const { data, error } = await admin
      .from("srd_monsters")
      .select(columns)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as MonsterSummary;
  }

  if (index) {
    const { data, error } = await admin
      .from("srd_monsters")
      .select(columns)
      .eq("index", index)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as MonsterSummary;
  }

  const cleanName = cleanMonsterDisplayName(name);
  if (!cleanName) return null;

  const { data, error } = await admin
    .from("srd_monsters")
    .select(columns)
    .ilike("name", cleanName)
    .limit(1);

  if (error) throw error;
  if (data?.[0]) return data[0] as MonsterSummary;

  const normalized = normalizeName(cleanName);
  const { data: candidates, error: candidateError } = await admin
    .from("srd_monsters")
    .select(columns)
    .limit(2000);

  if (candidateError) throw candidateError;
  return ((candidates ?? []) as MonsterSummary[]).find((monster) => normalizeName(monster.name) === normalized) ?? null;
}

async function attachMonsterSummaries(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  rows: TokenRow[],
) {
  const monsterIndexes = Array.from(
    new Set(rows.map((row) => row.monster_index).filter((index): index is string => !!index))
  );
  const byIndex = new Map<string, MonsterSummary>();

  if (monsterIndexes.length > 0) {
    const { data, error } = await admin
      .from("srd_monsters")
      .select(`
        index,
        name,
        armor_class,
        hit_points,
        hit_dice,
        speed,
        damage_resistances,
        damage_immunities,
        damage_vulnerabilities,
        condition_immunities,
        senses,
        type,
        subtype,
        challenge_rating,
        actions,
        special_abilities,
        reactions,
        legendary_actions
      `)
      .in("index", monsterIndexes);
    if (error) throw error;
    ((data ?? []) as MonsterSummary[]).forEach((monster) => byIndex.set(monster.index, monster));
  }

  return Promise.all(
    rows.map(async (token) => {
      const monster =
        (token.monster_index ? byIndex.get(token.monster_index) : null) ??
        (!token.character_id ? await findSrdMonster(admin, { name: token.name }) : null);

      return {
        ...token,
        monster: monster ?? null,
        monster_source: token.monster_source ?? (monster ? "srd" : null),
        monster_index: token.monster_index ?? monster?.index ?? null,
      };
    })
  );
}

async function requireCampaignMapAccess({
  campaignId,
  mapId,
  userId,
}: {
  campaignId: string;
  mapId: string;
  userId: string;
}) {
  const admin = createAdminSupabaseClient();

  const { data: map, error: mapError } = await admin
    .from("media_items")
    .select("id, campaign_id")
    .eq("id", mapId)
    .maybeSingle();

  if (mapError) throw mapError;
  if (!map || map.campaign_id !== campaignId) {
    return { admin, allowed: false, status: 404, error: "Map does not belong to this campaign" };
  }

  const { data: campaign, error: campaignError } = await admin
    .from("campaigns")
    .select("id, dm_user_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError) throw campaignError;
  if (!campaign) {
    return { admin, allowed: false, status: 404, error: "Campaign not found" };
  }

  if (campaign.dm_user_id === userId) {
    return { admin, allowed: true, status: 200, error: null };
  }

  const { data: membership, error: membershipError } = await admin
    .from("campaign_members")
    .select("campaign_id")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) {
    return { admin, allowed: false, status: 403, error: "Not a campaign member" };
  }

  return { admin, allowed: true, status: 200, error: null };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  const mapId = searchParams.get("mapId");

  if (!campaignId || !mapId) {
    return NextResponse.json({ error: "Missing token load fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const access = await requireCampaignMapAccess({ campaignId, mapId, userId: user.id });
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data: rows, error } = await access.admin
      .from("tokens")
      .select(`
        *,
        character:characters(
          user_id,
          image_url,
          name,
          armor_class,
          speed,
          hp_current,
          hp_max,
          class_index,
          race_index,
          senses
        )
      `)
      .eq("map_id", mapId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const tokensWithMonsters = await attachMonsterSummaries(access.admin, (rows ?? []) as TokenRow[]);
    const tokens = tokensWithMonsters.map((token) => ({
      ...token,
      image_url: token.image_url || token.character?.image_url || null,
      name: cleanVttDisplayName(token.name || token.character?.name || token.monster?.name),
      hp_current: token.hp_current ?? token.character?.hp_current ?? token.monster?.hit_points ?? null,
      hp_max: token.hp_max ?? token.character?.hp_max ?? token.monster?.hit_points ?? null,
    }));

    return NextResponse.json({ tokens });
  } catch (e: unknown) {
    const error = e as { message?: string; details?: string; hint?: string; code?: string };
    return NextResponse.json(
      {
        error: error.message || "Could not load tokens",
        details: error.details,
        hint: error.hint,
        code: error.code,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PlaceTokenPayload | null;
  const campaignId = typeof body?.campaignId === "string" ? body.campaignId : null;
  const mapId = typeof body?.mapId === "string" ? body.mapId : null;
  const token = body?.token;
  const name =
    typeof token?.name === "string" && token.name.trim()
      ? cleanVttDisplayName(token.name.trim(), "")
      : null;
  const x = typeof token?.x === "number" && Number.isFinite(token.x) ? token.x : null;
  const y = typeof token?.y === "number" && Number.isFinite(token.y) ? token.y : null;
  const imageUrl =
    typeof token?.image_url === "string" && token.image_url.trim()
      ? token.image_url.trim()
      : null;
  const tokenType = token?.type === "prop" ? "prop" : "token";
  const characterId = typeof token?.character_id === "string" ? token.character_id : null;
  const monsterIndex = typeof token?.monster_index === "string" ? token.monster_index : null;
  const monsterSource = token?.monster_source === "srd" ? "srd" : null;
  const srdMonsterId = typeof token?.srd_monster_id === "string" ? token.srd_monster_id : null;

  if (!campaignId || !mapId || !name || x === null || y === null) {
    return NextResponse.json({ error: "Missing token placement fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminSupabaseClient();

    const { data: campaign, error: campaignError } = await admin
      .from("campaigns")
      .select("id, dm_user_id")
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError) throw campaignError;
    if (!campaign || campaign.dm_user_id !== user.id) {
      return NextResponse.json({ error: "Only the campaign DM can place tokens" }, { status: 403 });
    }

    const { data: map, error: mapError } = await admin
      .from("media_items")
      .select("id, campaign_id")
      .eq("id", mapId)
      .maybeSingle();

    if (mapError) throw mapError;
    if (!map || map.campaign_id !== campaignId) {
      return NextResponse.json({ error: "Map does not belong to this campaign" }, { status: 404 });
    }

    const monster =
      tokenType === "token"
        ? await findSrdMonster(admin, { id: srdMonsterId, index: monsterIndex, name })
        : null;
    const startingHp = monster?.hit_points ?? null;

    let visionRangeFt = 0;
    if (characterId) {
      const { data: char } = await admin
        .from('characters')
        .select('race_index')
        .eq('id', characterId)
        .maybeSingle();
      visionRangeFt = inferVisionRangeFt(char?.race_index ?? null);
    }

    const { data: row, error: insertError } = await admin
      .from("tokens")
      .insert({
        map_id: mapId,
        name,
        x,
        y,
        size: "medium",
        color: tokenType === "prop" ? "#9ca3af" : "#c9b882",
        rotation: 0,
        scale: 1,
        conditions: [],
        image_url: imageUrl,
        hp_current: startingHp,
        hp_max: startingHp,
        character_id: characterId,
        monster_source: monsterSource ?? (monster ? "srd" : null),
        monster_index: monsterIndex ?? monster?.index ?? null,
        vision_range_ft: visionRangeFt,
      })
      .select("*")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      token: {
        ...row,
        monster: monster ?? null,
      },
    });
  } catch (e: unknown) {
    const error = e as { message?: string; details?: string; hint?: string; code?: string };
    return NextResponse.json(
      {
        error: error.message || "Could not place token",
        details: error.details,
        hint: error.hint,
        code: error.code,
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as UpdateTokenPayload | null;
  const campaignId = typeof body?.campaignId === "string" ? body.campaignId : null;
  const tokenId = typeof body?.tokenId === "string" ? body.tokenId : null;
  const updates = body?.updates && typeof body.updates === "object" ? body.updates : null;

  if (!campaignId || !tokenId || !updates) {
    return NextResponse.json({ error: "Missing token update fields" }, { status: 400 });
  }

  const dbUpdates = Object.fromEntries(
    Object.entries(updates).filter(([key, value]) => TOKEN_UPDATE_COLUMNS.has(key) && value !== undefined)
  );

  if (Object.keys(dbUpdates).length === 0) {
    return NextResponse.json({ error: "No valid token update fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminSupabaseClient();

    const { data: campaign, error: campaignError } = await admin
      .from("campaigns")
      .select("id, dm_user_id")
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError) throw campaignError;
    if (!campaign || campaign.dm_user_id !== user.id) {
      return NextResponse.json({ error: "Only the campaign DM can update tokens" }, { status: 403 });
    }

    const { data: token, error: tokenError } = await admin
      .from("tokens")
      .select("id, map_id")
      .eq("id", tokenId)
      .maybeSingle();

    if (tokenError) throw tokenError;

    if (!token?.map_id) {
      return NextResponse.json({ error: "Token does not belong to this campaign" }, { status: 404 });
    }

    const { data: map, error: mapError } = await admin
      .from("media_items")
      .select("id, campaign_id")
      .eq("id", token.map_id)
      .maybeSingle();

    if (mapError) throw mapError;
    if (!map || map.campaign_id !== campaignId) {
      return NextResponse.json({ error: "Token does not belong to this campaign" }, { status: 404 });
    }

    const { data: row, error: updateError } = await admin
      .from("tokens")
      .update(dbUpdates)
      .eq("id", tokenId)
      .select("*")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ token: row });
  } catch (e: unknown) {
    const error = e as { message?: string; details?: string; hint?: string; code?: string };
    return NextResponse.json(
      {
        error: error.message || "Could not update token",
        details: error.details,
        hint: error.hint,
        code: error.code,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as DeleteTokenPayload | null;
  const campaignId = typeof body?.campaignId === "string" ? body.campaignId : null;
  const tokenId = typeof body?.tokenId === "string" ? body.tokenId : null;

  if (!campaignId || !tokenId) {
    return NextResponse.json({ error: "Missing token delete fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminSupabaseClient();

    const { data: campaign, error: campaignError } = await admin
      .from("campaigns")
      .select("id, dm_user_id")
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError) throw campaignError;
    if (!campaign || campaign.dm_user_id !== user.id) {
      return NextResponse.json({ error: "Only the campaign DM can delete tokens" }, { status: 403 });
    }

    const { data: token, error: tokenError } = await admin
      .from("tokens")
      .select("id, map_id")
      .eq("id", tokenId)
      .maybeSingle();

    if (tokenError) throw tokenError;
    if (!token?.map_id) {
      return NextResponse.json({ error: "Token does not belong to this campaign" }, { status: 404 });
    }

    const { data: map, error: mapError } = await admin
      .from("media_items")
      .select("id, campaign_id")
      .eq("id", token.map_id)
      .maybeSingle();

    if (mapError) throw mapError;
    if (!map || map.campaign_id !== campaignId) {
      return NextResponse.json({ error: "Token does not belong to this campaign" }, { status: 404 });
    }

    const { error: participantsDeleteError } = await admin
      .from("combat_participants")
      .delete()
      .eq("token_id", tokenId);

    if (participantsDeleteError) throw participantsDeleteError;

    const { error: deleteError } = await admin
      .from("tokens")
      .delete()
      .eq("id", tokenId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const error = e as { message?: string; details?: string; hint?: string; code?: string };
    return NextResponse.json(
      {
        error: error.message || "Could not delete token",
        details: error.details,
        hint: error.hint,
        code: error.code,
      },
      { status: 500 },
    );
  }
}
