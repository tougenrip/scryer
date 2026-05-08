-- Bring factions to parity with NPCs/world_locations: a `hidden_from_players`
-- flag (RLS-enforced) and a `dm_notes` text field (application-layer
-- enforced — RLS can't filter columns).

alter table public.factions
  add column if not exists hidden_from_players boolean default false not null;

alter table public.factions
  add column if not exists dm_notes text;

create index if not exists idx_factions_hidden
  on public.factions(campaign_id, hidden_from_players);

-- Replace existing select policy with one that hides flagged rows from
-- non-DM campaign members.
drop policy if exists "Campaign members can view factions" on public.factions;
create policy "Campaign members can view factions"
  on public.factions for select
  using (
    exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = factions.campaign_id
        and cm.user_id = auth.uid()
    )
    and (
      exists (
        select 1 from public.campaigns c
        where c.id = factions.campaign_id and c.dm_user_id = auth.uid()
      )
      or hidden_from_players = false
    )
  );
