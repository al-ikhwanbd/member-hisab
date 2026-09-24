-- আল ইখওয়ান: সদস্যদের জন্য পুরো হিসাব Public/Hidden নিয়ন্ত্রণ
-- একবার Main Supabase SQL Editor-এ চালাতে হবে।

create table if not exists public.accounting_visibility (
  id integer primary key check (id = 1),
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.accounting_visibility (id,is_public)
values (1,false)
on conflict (id) do nothing;

alter table public.accounting_visibility enable row level security;

drop policy if exists "accounting_visibility_public_read" on public.accounting_visibility;
create policy "accounting_visibility_public_read"
on public.accounting_visibility for select
to anon, authenticated
using (true);

drop policy if exists "accounting_visibility_admin_insert" on public.accounting_visibility;
create policy "accounting_visibility_admin_insert"
on public.accounting_visibility for insert
to authenticated
with check (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));

drop policy if exists "accounting_visibility_admin_update" on public.accounting_visibility;
create policy "accounting_visibility_admin_update"
on public.accounting_visibility for update
to authenticated
using (exists (select 1 from public.admin_users au where au.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));

drop policy if exists "accounting_visibility_admin_delete" on public.accounting_visibility;
create policy "accounting_visibility_admin_delete"
on public.accounting_visibility for delete
to authenticated
using (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));
