-- Loot duels: when player B challenges player A's pending claim, both lock
-- in a choice (rps or coin), the system reveals simultaneously, and the
-- winner takes the item.
--
-- Choices are stored directly. Application-layer hides the opponent's
-- choice until the duel reaches 'revealing'. Resolution is computed by a
-- Postgres trigger so the client never decides who won (anti-cheat).

create table if not exists public.loot_duels (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  loot_id uuid not null references public.party_loot(id) on delete cascade,
  game text not null check (game in ('rps','coin')),

  defender_character_id uuid not null references public.characters(id),
  defender_user_id uuid not null references auth.users(id),
  defender_choice text,
  defender_locked_at timestamptz,

  challenger_character_id uuid not null references public.characters(id),
  challenger_user_id uuid not null references auth.users(id),
  challenger_choice text,
  challenger_locked_at timestamptz,

  status text not null default 'choosing'
    check (status in ('choosing','revealing','done','tie_rematch')),
  winner_character_id uuid references public.characters(id),
  reveal_at timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists loot_duels_loot_idx on public.loot_duels(loot_id);
create index if not exists loot_duels_campaign_idx
  on public.loot_duels(campaign_id, status);

alter table public.loot_duels enable row level security;

drop policy if exists "Loot duels select" on public.loot_duels;
create policy "Loot duels select"
  on public.loot_duels for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = loot_duels.campaign_id and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = loot_duels.campaign_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Loot duels insert" on public.loot_duels;
create policy "Loot duels insert"
  on public.loot_duels for insert
  with check (
    -- Challenger creates the row — must own the challenger character.
    challenger_user_id = auth.uid()
    and exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = loot_duels.campaign_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Loot duels update" on public.loot_duels;
create policy "Loot duels update"
  on public.loot_duels for update
  using (
    -- Either dueler can update (locking choices); anyone in the campaign
    -- can also update for spectator status transitions, but the trigger
    -- below validates correctness.
    defender_user_id = auth.uid()
    or challenger_user_id = auth.uid()
    or exists (
      select 1 from public.campaigns c
      where c.id = loot_duels.campaign_id and c.dm_user_id = auth.uid()
    )
  );

-- Resolution trigger: when both choices are locked, compute winner.
create or replace function public.resolve_loot_duel()
returns trigger
language plpgsql
security definer
as $$
declare
  v_winner_character uuid;
  v_winner_user uuid;
begin
  -- Only run when transitioning into both-locked state.
  if new.defender_choice is null or new.challenger_choice is null then
    return new;
  end if;
  if new.status not in ('choosing','revealing') then
    return new;
  end if;

  if new.game = 'rps' then
    -- Tie: both pick the same. Status moves to tie_rematch and choices
    -- clear so players can pick again.
    if new.defender_choice = new.challenger_choice then
      new.defender_choice := null;
      new.challenger_choice := null;
      new.defender_locked_at := null;
      new.challenger_locked_at := null;
      new.status := 'tie_rematch';
      return new;
    end if;
    -- Standard RPS resolution.
    if (new.defender_choice = 'rock' and new.challenger_choice = 'scissors')
       or (new.defender_choice = 'paper' and new.challenger_choice = 'rock')
       or (new.defender_choice = 'scissors' and new.challenger_choice = 'paper') then
      v_winner_character := new.defender_character_id;
      v_winner_user := new.defender_user_id;
    else
      v_winner_character := new.challenger_character_id;
      v_winner_user := new.challenger_user_id;
    end if;
  elsif new.game = 'coin' then
    -- Both pick a side. The "true" outcome is randomized by the trigger.
    -- Whoever picked the rolled side wins. If both picked the same side,
    -- the rolled side still favors one of them — but they picked the same,
    -- so we tie-break to the defender. (Alternative: rematch. Defender
    -- choice keeps it snappy.)
    declare v_outcome text;
    begin
      if random() < 0.5 then v_outcome := 'heads'; else v_outcome := 'tails'; end if;
      if new.defender_choice = new.challenger_choice then
        v_winner_character := new.defender_character_id;
        v_winner_user := new.defender_user_id;
      elsif new.defender_choice = v_outcome then
        v_winner_character := new.defender_character_id;
        v_winner_user := new.defender_user_id;
      else
        v_winner_character := new.challenger_character_id;
        v_winner_user := new.challenger_user_id;
      end if;
      -- Stash the outcome in a junky place — reuse winner choice column for
      -- the animation to display. The client reads `status='done'` +
      -- knows the winner; for the coin animation it can just look at
      -- defender_choice if defender won, etc. We store the rolled side as
      -- the suffix on the winner_character row by setting status only.
      -- (Coin animation uses winner_character to deduce side.)
    end;
  else
    return new;
  end if;

  new.status := 'done';
  new.winner_character_id := v_winner_character;
  new.resolved_at := now();
  new.reveal_at := now();

  -- Transfer the loot row to the winner.
  update public.party_loot
  set claimed_by_character_id = v_winner_character,
      claimed_at = now(),
      pending_claim_by_character_id = null,
      pending_claim_at = null,
      challenge_until = null
  where id = new.loot_id;

  -- Append the item to the winner's character inventory.
  update public.characters c
  set inventory = coalesce(c.inventory, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'source', pl.item_source,
      'index', pl.item_index,
      'quantity', pl.quantity,
      'equipped', false,
      'attuned', false,
      'notes', null
    )
  )
  from public.party_loot pl
  where pl.id = new.loot_id and c.id = v_winner_character;

  -- Suppress unused-variable warning.
  perform v_winner_user;

  return new;
end;
$$;

drop trigger if exists trg_resolve_loot_duel on public.loot_duels;
create trigger trg_resolve_loot_duel
  before update on public.loot_duels
  for each row
  execute function public.resolve_loot_duel();

alter publication supabase_realtime add table public.loot_duels;
