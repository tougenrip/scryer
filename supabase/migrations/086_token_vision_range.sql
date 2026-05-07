alter table public.tokens
  add column if not exists vision_range_ft integer not null default 0
  check (vision_range_ft >= 0 and vision_range_ft <= 500);
