-- Generalize loot_duels: a duel can now be casual (no loot transfer) so
-- players can challenge each other for any reason. Also have the resolve
-- trigger announce the result in chat so spectators don't have to be in
-- the modal to see who won.

alter table public.loot_duels
  alter column loot_id drop not null;

-- Replace the resolve trigger with a version that:
--   1) handles loot_id being null (no transfer)
--   2) posts a system message to vtt_messages on resolve

create or replace function public.resolve_loot_duel()
returns trigger
language plpgsql
security definer
as $$
declare
  v_winner_character uuid;
  v_winner_user uuid;
  v_winner_name text;
  v_loser_name text;
  v_item_name text;
  v_game_label text;
  v_outcome text;
  v_active_map uuid;
begin
  if new.defender_choice is null or new.challenger_choice is null then
    return new;
  end if;
  if new.status not in ('choosing','revealing') then
    return new;
  end if;

  if new.game = 'rps' then
    if new.defender_choice = new.challenger_choice then
      new.defender_choice := null;
      new.challenger_choice := null;
      new.defender_locked_at := null;
      new.challenger_locked_at := null;
      new.status := 'tie_rematch';
      return new;
    end if;
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
  else
    return new;
  end if;

  new.status := 'done';
  new.winner_character_id := v_winner_character;
  new.resolved_at := now();
  new.reveal_at := now();

  -- Loot transfer (only when this duel is tied to a loot row).
  if new.loot_id is not null then
    update public.party_loot
    set claimed_by_character_id = v_winner_character,
        claimed_at = now(),
        pending_claim_by_character_id = null,
        pending_claim_at = null,
        challenge_until = null
    where id = new.loot_id;

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
  end if;

  -- Build a chat announcement.
  select name into v_winner_name from public.characters where id = v_winner_character;
  select name into v_loser_name from public.characters
   where id = case when v_winner_character = new.defender_character_id
                   then new.challenger_character_id
                   else new.defender_character_id end;
  if new.loot_id is not null then
    select item_name into v_item_name from public.party_loot where id = new.loot_id;
  end if;
  v_game_label := case when new.game = 'rps' then 'rock-paper-scissors' else 'coin flip' end;

  -- Pick an active map for the message; chat is map-scoped so we attach to
  -- whichever map is currently active for this campaign (best effort).
  select id into v_active_map from public.media_items
   where campaign_id = new.campaign_id
   order by updated_at desc
   limit 1;

  insert into public.vtt_messages (campaign_id, map_id, user_id, body, payload)
  values (
    new.campaign_id,
    v_active_map,
    v_winner_user,
    case
      when new.loot_id is not null then
        coalesce(v_winner_name, 'Someone') || ' beat ' ||
        coalesce(v_loser_name, 'someone') || ' at ' || v_game_label ||
        ' for ' || coalesce(v_item_name, 'the loot') || '.'
      else
        coalesce(v_winner_name, 'Someone') || ' beat ' ||
        coalesce(v_loser_name, 'someone') || ' at ' || v_game_label || '.'
    end,
    jsonb_build_object(
      'kind', 'duel-result',
      'duel_id', new.id,
      'game', new.game,
      'winner_character_id', v_winner_character,
      'loser_character_id', case
        when v_winner_character = new.defender_character_id
        then new.challenger_character_id
        else new.defender_character_id end,
      'item_name', v_item_name,
      'defender_choice', new.defender_choice,
      'challenger_choice', new.challenger_choice
    )
  );

  perform v_winner_user;
  perform v_outcome;
  return new;
end;
$$;

drop trigger if exists trg_resolve_loot_duel on public.loot_duels;
create trigger trg_resolve_loot_duel
  before update on public.loot_duels
  for each row
  execute function public.resolve_loot_duel();
