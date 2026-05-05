-- Re-run safe cleanup for old UI-only monster labels in persisted VTT names.

update public.tokens
set name = regexp_replace(name, '^\s*\[Monster\]\s*', '', 'i')
where name ~* '^\s*\[Monster\]\s*';

update public.media_items
set name = regexp_replace(name, '^\s*\[Monster\]\s*', '', 'i')
where name ~* '^\s*\[Monster\]\s*';
