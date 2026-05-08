-- Bounties can now carry an image (wanted-poster portrait, evidence photo, etc.)
alter table public.bounty_board
  add column if not exists image_url text;
