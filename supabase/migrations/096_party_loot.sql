-- Items waiting in the party stash. DM commits items here from End-with-Loot;
-- players race to claim. The challenge-window columns are wired in Phase 1
-- but not used yet (Phase 2 turns them on alongside loot_duels).

create table if not exists public.party_loot (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  item_source text not null check (item_source in ('srd','homebrew')),
  item_kind text not null check (item_kind in ('equipment','magic')),
  item_index text not null,
  item_name text not null,
  quantity integer not null default 1,
  rarity text,
  claimed_by_character_id uuid references public.characters(id) on delete set null,
  claimed_at timestamptz,
  -- Phase-2 challenge-window state. Unused in phase 1 (claims finalize
  -- immediately) but we provision the columns so phase 2 only needs RPCs.
  pending_claim_by_character_id uuid references public.characters(id) on delete set null,
  pending_claim_at timestamptz,
  challenge_until timestamptz,
  source_encounter_id uuid references public.encounters(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists party_loot_campaign_idx
  on public.party_loot(campaign_id);
create index if not exists party_loot_unclaimed_idx
  on public.party_loot(campaign_id)
  where claimed_by_character_id is null;

alter table public.party_loot enable row level security;

drop policy if exists "Party loot select policy" on public.party_loot;
create policy "Party loot select policy"
  on public.party_loot for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = party_loot.campaign_id and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = party_loot.campaign_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Party loot insert policy" on public.party_loot;
create policy "Party loot insert policy"
  on public.party_loot for insert
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = party_loot.campaign_id and c.dm_user_id = auth.uid()
    )
  );

drop policy if exists "Party loot delete policy" on public.party_loot;
create policy "Party loot delete policy"
  on public.party_loot for delete
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = party_loot.campaign_id and c.dm_user_id = auth.uid()
    )
  );

-- For phase 1 we let DM AND any campaign member update loot rows so simple
-- "claim" works as a direct update. Phase 2 will tighten this with RPCs +
-- column-level rules.
drop policy if exists "Party loot update policy" on public.party_loot;
create policy "Party loot update policy"
  on public.party_loot for update
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = party_loot.campaign_id and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = party_loot.campaign_id and cm.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.party_loot;
