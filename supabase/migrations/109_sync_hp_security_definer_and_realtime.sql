-- Migration 107's HP-sync triggers run with the CALLER's permissions
-- by default (SECURITY INVOKER). When a player heals their own PC via
-- the mobile companion they have UPDATE on `characters` (their row)
-- but the trigger then tries to UPDATE `public.tokens`, which RLS
-- silently rejects for that user — so the sync never happens and
-- the combat rail stays stale.
--
-- Fix: re-create both sync functions as SECURITY DEFINER so they run
-- with the schema owner's privileges and can mirror HP across tables
-- regardless of who initiated the change.
--
-- Also makes sure `tokens` is in the realtime publication so token
-- HP updates from this trigger (or any other path) push to clients.

create or replace function public.sync_character_hp_to_tokens()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

create or replace function public.sync_token_hp_to_character()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

-- Idempotent realtime registration. `add table` errors if the table
-- is already a member, so we wrap in a guard.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tokens'
  ) then
    execute 'alter publication supabase_realtime add table public.tokens';
  end if;
end $$;
