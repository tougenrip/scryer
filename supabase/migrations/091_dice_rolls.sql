-- Persistent dice roll log. The dice-roller context already inserts into
-- `dice_rolls` for shared rolls; the table didn't exist yet, so those writes
-- were silently failing. Creating it now retroactively starts the log.

create table if not exists public.dice_rolls (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  character_id uuid references public.characters(id) on delete set null,
  expression text not null,
  result integer not null,
  breakdown jsonb not null,
  label text,
  advantage boolean not null default false,
  disadvantage boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists dice_rolls_campaign_idx
  on public.dice_rolls(campaign_id, created_at desc);
create index if not exists dice_rolls_user_idx
  on public.dice_rolls(user_id);

alter table public.dice_rolls enable row level security;

drop policy if exists "Campaign members can view rolls" on public.dice_rolls;
create policy "Campaign members can view rolls"
  on public.dice_rolls for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = dice_rolls.campaign_id and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = dice_rolls.campaign_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Authenticated users can insert their own rolls" on public.dice_rolls;
create policy "Authenticated users can insert their own rolls"
  on public.dice_rolls for insert
  with check (user_id = auth.uid());

alter publication supabase_realtime add table public.dice_rolls;
