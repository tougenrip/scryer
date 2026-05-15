-- Death saves (5e: 3 successes stabilize, 3 failures = dead) and
-- concentration tracking for PCs. Both live on `characters` because
-- they're long-lived and per-character (NPCs/monsters die at 0 HP and
-- don't generally concentrate; if needed later we can mirror to tokens).
--
-- An auto-reset trigger zeroes the death-save marks the moment HP
-- rises above 0, regardless of which path performed the heal.

alter table public.characters
  add column if not exists death_save_successes integer not null default 0
    check (death_save_successes between 0 and 3),
  add column if not exists death_save_failures integer not null default 0
    check (death_save_failures between 0 and 3),
  -- True once a character has been stabilized: no more death saves
  -- needed even at 0 HP, but they're still unconscious until healed.
  add column if not exists is_stable boolean not null default false,
  add column if not exists is_concentrating boolean not null default false,
  -- Free-form spell label when concentrating ("Hex", "Hold Person").
  add column if not exists concentrating_on text;

-- Auto-reset death-save state when HP rises above 0. Without this,
-- a heal mid-encounter would clear the unconscious state but leave
-- stale failure/success marks lingering for the next time.
create or replace function public.reset_death_saves_on_heal()
returns trigger language plpgsql as $$
begin
  if new.hp_current > 0 and (old.hp_current is null or old.hp_current <= 0) then
    new.death_save_successes := 0;
    new.death_save_failures := 0;
    new.is_stable := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reset_death_saves_on_heal on public.characters;
create trigger trg_reset_death_saves_on_heal
  before update on public.characters
  for each row
  when (old.hp_current is distinct from new.hp_current)
  execute function public.reset_death_saves_on_heal();
