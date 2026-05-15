-- 5e RAW: a creature drops concentration the moment they fall
-- unconscious (HP <= 0). Mirroring that on the DB so concentration
-- can't linger past a knockout regardless of which client/path
-- lowered the HP.

create or replace function public.drop_concentration_on_knockout()
returns trigger language plpgsql as $$
begin
  if new.hp_current <= 0 and (old.hp_current is null or old.hp_current > 0) then
    new.is_concentrating := false;
    new.concentrating_on := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_drop_concentration_on_knockout on public.characters;
create trigger trg_drop_concentration_on_knockout
  before update on public.characters
  for each row
  when (old.hp_current is distinct from new.hp_current)
  execute function public.drop_concentration_on_knockout();
