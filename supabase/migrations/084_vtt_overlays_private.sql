-- DM-only "private" overlays: AOE areas and drawings hidden from non-owners.
-- Used so the DM can prep a scene without players seeing.

alter table public.vtt_aoe_areas
  add column if not exists is_private boolean not null default false;

alter table public.vtt_drawings
  add column if not exists is_private boolean not null default false;

-- AOE: SELECT requires (campaign member) AND (not private OR is owner).
drop policy if exists "Campaign members can view aoe areas" on public.vtt_aoe_areas;
create policy "Campaign members can view aoe areas"
  on public.vtt_aoe_areas
  for select
  using (
    (
      exists (
        select 1 from public.campaigns c
        where c.id = vtt_aoe_areas.campaign_id and c.dm_user_id = auth.uid()
      )
      or exists (
        select 1 from public.campaign_members cm
        where cm.campaign_id = vtt_aoe_areas.campaign_id and cm.user_id = auth.uid()
      )
    )
    and (not is_private or owner_user_id = auth.uid())
  );

-- Drawings: same model.
drop policy if exists "Campaign members can view drawings" on public.vtt_drawings;
create policy "Campaign members can view drawings"
  on public.vtt_drawings
  for select
  using (
    (
      exists (
        select 1 from public.campaigns c
        where c.id = vtt_drawings.campaign_id and c.dm_user_id = auth.uid()
      )
      or exists (
        select 1 from public.campaign_members cm
        where cm.campaign_id = vtt_drawings.campaign_id and cm.user_id = auth.uid()
      )
    )
    and (not is_private or owner_user_id = auth.uid())
  );
