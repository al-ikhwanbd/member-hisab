-- Al-Ikhwan Website UI Settings - additive migration
-- This adds only one JSONB settings column to the existing site_settings row.
-- It does not delete or alter existing member, payment, profit, expense, notice,
-- admin, auth, or other business data.

alter table public.site_settings
  add column if not exists ui_settings jsonb not null default '{}'::jsonb;

-- Keep the existing public-read/admin-write policies unchanged.
-- The existing site_settings policies already cover this new column.

grant select on table public.site_settings to anon, authenticated;
grant insert, update on table public.site_settings to authenticated;
