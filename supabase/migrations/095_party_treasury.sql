-- Shared coin pool, one row per campaign. Loot dumps coin straight in here
-- (no per-player claim — coin is fungible). DM has full edit rights for
-- off-encounter awards / corrections.

create table if not exists public.party_treasury (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  cp integer not null default 0,
  sp integer not null default 0,
  ep integer not null default 0,
  gp integer not null default 0,
  pp integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.party_treasury enable row level security;

drop policy if exists "Treasury select policy" on public.party_treasury;
create policy "Treasury select policy"
  on public.party_treasury for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = party_treasury.campaign_id and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = party_treasury.campaign_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Treasury insert policy" on public.party_treasury;
create policy "Treasury insert policy"
  on public.party_treasury for insert
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = party_treasury.campaign_id and c.dm_user_id = auth.uid()
    )
  );

-- Players can NOT update treasury directly. Coin awards go through RPC
-- functions defined in the loot module. DM can update freely.
drop policy if exists "Treasury update policy" on public.party_treasury;
create policy "Treasury update policy"
  on public.party_treasury for update
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = party_treasury.campaign_id and c.dm_user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.party_treasury;
