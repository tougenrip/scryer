-- Two-way HP sync between `characters` and PC tokens. Without this,
-- a heal that updates `characters.hp_current` (death-save Nat 20,
-- mobile companion, desktop sheet) leaves `tokens.hp_current` stale,
-- so the combat rail keeps rendering the PC as downed even after
-- they're back up.
--
-- Both triggers are AFTER UPDATE and guarded with `is distinct from`
-- so the loop terminates after one round-trip.

-- Character → tokens.
create or replace function public.sync_character_hp_to_tokens()
returns trigger language plpgsql as $$
begin
  if new.hp_current is distinct from old.hp_current then
    update public.tokens
      set hp_current = new.hp_current
      where character_id = new.id
        and hp_current is distinct from new.hp_current;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_character_hp_to_tokens on public.characters;
create trigger trg_sync_character_hp_to_tokens
  after update on public.characters
  for each row
  when (old.hp_current is distinct from new.hp_current)
  execute function public.sync_character_hp_to_tokens();

-- Tokens → character. Only fires when the token is bound to a PC.
create or replace function public.sync_token_hp_to_character()
returns trigger language plpgsql as $$
begin
  if new.character_id is not null
     and new.hp_current is distinct from old.hp_current then
    update public.characters
      set hp_current = new.hp_current
      where id = new.character_id
        and hp_current is distinct from new.hp_current;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_token_hp_to_character on public.tokens;
create trigger trg_sync_token_hp_to_character
  after update on public.tokens
  for each row
  when (old.hp_current is distinct from new.hp_current)
  execute function public.sync_token_hp_to_character();
