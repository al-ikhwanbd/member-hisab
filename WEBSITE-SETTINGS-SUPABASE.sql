-- Al-Ikhwan Website Settings
-- এই SQL মূল হিসাবের Supabase project-এ একবার চালাতে হবে।
create table if not exists public.site_settings (
  id smallint primary key default 1 check (id=1),
  site_name text not null default 'আল ইখওয়ান ইসলামী সংস্থা বাংলাদেশ',
  site_tagline text not null default 'সংস্থার হিসাব অনলাইনে দেখুন',
  hero_title text not null default 'আল ইখওয়ান ইসলামী সংস্থা বাংলাদেশ',
  hero_subtitle text not null default 'বানিপুর, কেন্দুয়া, নেত্রকোনা, মোমেনশাহী, ঢাকা',
  address text not null default 'বানিপুর, কেন্দুয়া, নেত্রকোনা, মোমেনশাহী, ঢাকা',
  phone text not null default '', email text not null default '',
  facebook_url text not null default '', website_url text not null default '',
  logo_url text not null default 'Al ikhwan logo.jpg',
  favicon_url text not null default 'icon-192.png',
  hero_image_url text not null default '',
  primary_color text not null default '#087f4e', secondary_color text not null default '#0f6b4a',
  accent_color text not null default '#f0b429', background_color text not null default '#f4f8f6',
  card_color text not null default '#ffffff', text_color text not null default '#17322a',
  footer_text text not null default 'আল ইখওয়ান ইসলামী সংস্থা বাংলাদেশ',
  footer_subtext text not null default 'সকল অধিকার সংরক্ষিত',
  member_footer_subtext text not null default 'সদস্য অ্যাকাউন্ট',
  menu_title text not null default 'মেইন মেনু',
  menu_personal text not null default 'সদস্যদের ব্যক্তিগত হিসাব',
  menu_members text not null default 'সকল সদস্যদের হিসাব',
  menu_due text not null default 'সংস্থার মোট হিসাব',
  menu_profit text not null default 'লভ্যাংশ ও খরচের বিবরণ',
  menu_fund text not null default 'অবশিষ্ট তহবিলের খাত',
  menu_notices text not null default 'নোটিশ',
  meta_description text not null default 'আল ইখওয়ান ইসলামী সংস্থা বাংলাদেশের হিসাব দেখুন',
  updated_at timestamptz not null default now(), updated_by uuid
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;
alter table public.site_settings enable row level security;
drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "site_settings_admin_insert" on public.site_settings;
create policy "site_settings_admin_insert" on public.site_settings for insert to authenticated with check (exists(select 1 from public.admin_users au where au.user_id=auth.uid()));
drop policy if exists "site_settings_admin_update" on public.site_settings;
create policy "site_settings_admin_update" on public.site_settings for update to authenticated using (exists(select 1 from public.admin_users au where au.user_id=auth.uid())) with check (exists(select 1 from public.admin_users au where au.user_id=auth.uid()));

-- Logo/favicon/banner upload-এর জন্য public bucket.
insert into storage.buckets (id,name,public) values ('site-assets','site-assets',true) on conflict (id) do update set public=true;
drop policy if exists "site_assets_public_read" on storage.objects;
create policy "site_assets_public_read" on storage.objects for select to anon, authenticated using (bucket_id='site-assets');
drop policy if exists "site_assets_admin_insert" on storage.objects;
create policy "site_assets_admin_insert" on storage.objects for insert to authenticated with check (bucket_id='site-assets' and exists(select 1 from public.admin_users au where au.user_id=auth.uid()));
drop policy if exists "site_assets_admin_update" on storage.objects;
create policy "site_assets_admin_update" on storage.objects for update to authenticated using (bucket_id='site-assets' and exists(select 1 from public.admin_users au where au.user_id=auth.uid())) with check (bucket_id='site-assets' and exists(select 1 from public.admin_users au where au.user_id=auth.uid()));
drop policy if exists "site_assets_admin_delete" on storage.objects;
create policy "site_assets_admin_delete" on storage.objects for delete to authenticated using (bucket_id='site-assets' and exists(select 1 from public.admin_users au where au.user_id=auth.uid()));
