-- Al-Ikhwan: member signup account -> existing main member linking
-- RUN THIS ONLY IN THE MEMBER SUPABASE PROJECT

create table if not exists public.member_account_links (
  member_user_id uuid primary key references auth.users(id) on delete cascade,
  main_member_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(main_member_id)
);

alter table public.member_account_links enable row level security;

drop policy if exists "member links select own or admin" on public.member_account_links;
create policy "member links select own or admin" on public.member_account_links
for select to authenticated
using (
  member_user_id = auth.uid()
  or exists (select 1 from public.member_admins a where a.user_id = auth.uid())
);

drop policy if exists "member links admin insert" on public.member_account_links;
create policy "member links admin insert" on public.member_account_links
for insert to authenticated
with check (exists (select 1 from public.member_admins a where a.user_id = auth.uid()));

drop policy if exists "member links admin update" on public.member_account_links;
create policy "member links admin update" on public.member_account_links
for update to authenticated
using (exists (select 1 from public.member_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.member_admins a where a.user_id = auth.uid()));

drop policy if exists "member links admin delete" on public.member_account_links;
create policy "member links admin delete" on public.member_account_links
for delete to authenticated
using (exists (select 1 from public.member_admins a where a.user_id = auth.uid()));

-- Optional: keep updated_at current when a link changes.
create or replace function public.member_account_links_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists member_account_links_touch on public.member_account_links;
create trigger member_account_links_touch
before update on public.member_account_links
for each row execute function public.member_account_links_touch_updated_at();
