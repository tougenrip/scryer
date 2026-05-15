-- Belt-and-braces reset for the death-save state. Migration 105 already
-- clears marks on heal (HP rises above 0). This adds the inverse: when
-- a PC is freshly knocked out (HP transitions from > 0 to <= 0), wipe
-- any leftover successes / failures / stable flag from a previous death.
--
-- Without this, a player who became stable, was healed, and went down
-- again could see stale dots. The heal trigger should already have
-- cleared them, but if anything missed, this guarantees a clean slate
-- on the very next knockout.

create or replace function public.reset_death_saves_on_knockout()
returns trigger language plpgsql as $$
begin
  if new.hp_current <= 0 and old.hp_current > 0 then
    new.death_save_successes := 0;
    new.death_save_failures := 0;
    new.is_stable := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reset_death_saves_on_knockout on public.characters;
create trigger trg_reset_death_saves_on_knockout
  before update on public.characters
  for each row
  when (old.hp_current is distinct from new.hp_current)
  execute function public.reset_death_saves_on_knockout();
