-- Allow the campaign DM, not only campaign_members rows, to manage VTT combat.
-- Also add missing combat_participants policies so starting combat can insert
-- selected table tokens into initiative order.

drop policy if exists "Campaign members can view encounters" on public.combat_encounters;
drop policy if exists "Campaign members can create encounters" on public.combat_encounters;
drop policy if exists "Campaign members can update encounters" on public.combat_encounters;
drop policy if exists "Campaign members can delete encounters" on public.combat_encounters;

alter table public.combat_encounters enable row level security;

create policy "Campaign participants can view encounters"
  on public.combat_encounters
  for select
  using (
    exists (
      select 1
      from public.campaigns c
      where c.id = combat_encounters.campaign_id
        and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.campaign_members cm
      where cm.campaign_id = combat_encounters.campaign_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Campaign participants can create encounters"
  on public.combat_encounters
  for insert
  with check (
    exists (
      select 1
      from public.campaigns c
      where c.id = combat_encounters.campaign_id
        and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.campaign_members cm
      where cm.campaign_id = combat_encounters.campaign_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Campaign participants can update encounters"
  on public.combat_encounters
  for update
  using (
    exists (
      select 1
      from public.campaigns c
      where c.id = combat_encounters.campaign_id
        and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.campaign_members cm
      where cm.campaign_id = combat_encounters.campaign_id
        and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.campaigns c
      where c.id = combat_encounters.campaign_id
        and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.campaign_members cm
      where cm.campaign_id = combat_encounters.campaign_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Campaign participants can delete encounters"
  on public.combat_encounters
  for delete
  using (
    exists (
      select 1
      from public.campaigns c
      where c.id = combat_encounters.campaign_id
        and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.campaign_members cm
      where cm.campaign_id = combat_encounters.campaign_id
        and cm.user_id = auth.uid()
    )
  );

alter table public.combat_participants enable row level security;

drop policy if exists "Campaign participants can view combat participants" on public.combat_participants;
drop policy if exists "Campaign participants can create combat participants" on public.combat_participants;
drop policy if exists "Campaign participants can update combat participants" on public.combat_participants;
drop policy if exists "Campaign participants can delete combat participants" on public.combat_participants;

create policy "Campaign participants can view combat participants"
  on public.combat_participants
  for select
  using (
    exists (
      select 1
      from public.combat_encounters ce
      join public.campaigns c on c.id = ce.campaign_id
      where ce.id = combat_participants.encounter_id
        and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.combat_encounters ce
      join public.campaign_members cm on cm.campaign_id = ce.campaign_id
      where ce.id = combat_participants.encounter_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Campaign participants can create combat participants"
  on public.combat_participants
  for insert
  with check (
    exists (
      select 1
      from public.combat_encounters ce
      join public.campaigns c on c.id = ce.campaign_id
      where ce.id = combat_participants.encounter_id
        and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.combat_encounters ce
      join public.campaign_members cm on cm.campaign_id = ce.campaign_id
      where ce.id = combat_participants.encounter_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Campaign participants can update combat participants"
  on public.combat_participants
  for update
  using (
    exists (
      select 1
      from public.combat_encounters ce
      join public.campaigns c on c.id = ce.campaign_id
      where ce.id = combat_participants.encounter_id
        and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.combat_encounters ce
      join public.campaign_members cm on cm.campaign_id = ce.campaign_id
      where ce.id = combat_participants.encounter_id
        and cm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.combat_encounters ce
      join public.campaigns c on c.id = ce.campaign_id
      where ce.id = combat_participants.encounter_id
        and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.combat_encounters ce
      join public.campaign_members cm on cm.campaign_id = ce.campaign_id
      where ce.id = combat_participants.encounter_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Campaign participants can delete combat participants"
  on public.combat_participants
  for delete
  using (
    exists (
      select 1
      from public.combat_encounters ce
      join public.campaigns c on c.id = ce.campaign_id
      where ce.id = combat_participants.encounter_id
        and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.combat_encounters ce
      join public.campaign_members cm on cm.campaign_id = ce.campaign_id
      where ce.id = combat_participants.encounter_id
        and cm.user_id = auth.uid()
    )
  );
