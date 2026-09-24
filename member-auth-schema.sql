-- Al-Ikhwan Member Hisab - SAFE CHECK / SETUP NOTES
-- এই ফাইলটি বর্তমান Member Supabase project-এর জন্য।
-- এটি মূল হিসাবের Supabase project-এ চালাবেন না।
-- বর্তমান database-এ member_profiles, member_admins, member_registration_requests,
-- member_visibility_settings ইতিমধ্যে থাকলে নতুন table তৈরির দরকার নেই।
-- এই সংস্করণে member_id column প্রয়োজন নেই; সদস্যকে mobile নম্বর দিয়ে মূল
-- হিসাবের members table-এর সঙ্গে মিলানো হয়। তাই আগের member_id error আর হবে না.

-- Visibility row না থাকলে শুধু এটি চালাতে পারেন:
insert into public.member_visibility_settings (id, all_members_public, updated_at)
values (true, false, now())
on conflict (id) do nothing;

-- Admin table-এ আপনার Auth User ID যুক্ত করার উদাহরণ:
-- insert into public.member_admins (user_id) values ('YOUR-AUTH-USER-UUID')
-- on conflict (user_id) do nothing;
