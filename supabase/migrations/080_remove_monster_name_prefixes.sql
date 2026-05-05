-- Remove the old UI-only monster label from persisted VTT token/media names.

update public.tokens
set name = regexp_replace(name, '^\s*\[Monster\]\s*', '', 'i')
where name ~* '^\s*\[Monster\]\s*';

update public.media_items
set name = regexp_replace(name, '^\s*\[Monster\]\s*', '', 'i')
where name ~* '^\s*\[Monster\]\s*';
