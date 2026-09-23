# Member Hisab V1 — সেটআপ নির্দেশনা

এই ZIPটি V55-এর কপি থেকে তৈরি করা হয়েছে। মূল V55 repository/Supabase-এ কোনো পরিবর্তন করার জন্য এটি ব্যবহার করবেন না।

## এই version-এ যা আছে
- সদস্যের নাম + ঠিকানা + মোবাইল নম্বর + পাসওয়ার্ড দিয়ে account create.
- নতুন account `pending` থাকবে।
- Admin approve করলে member login করে dashboard দেখতে পারবে।
- একই mobile number দ্বিতীয়বার ব্যবহার করা যাবে না।
- Member dashboard-এ নিজের account-এর summary ও মাসভিত্তিক হিসাবের জায়গা রাখা হয়েছে।
- আলাদা Admin login দিয়ে pending member approve/reject করার interface রাখা হয়েছে।

## এখনো যে কাজটি বাকি
নতুন আলাদা Supabase project তৈরি করে সেখানে schema চালাতে হবে। Free-plan active-project limit-এর কারণে এই ZIP-এর ভিতরের config এখন placeholder রাখা হয়েছে।

## গুরুত্বপূর্ণ নিরাপত্তা
`member-auth-config.js`-এ শুধু নতুন project-এর URL এবং publishable/anon key বসাবেন। `service_role` বা কোনো secret key কখনো browser file-এ বসাবেন না।

## Supabase
1. নতুন আলাদা project তৈরি করুন।
2. Authentication-এ Phone provider/password বা প্রয়োজনীয় SMS provider চালু করুন।
3. SQL Editor-এ `member-auth-schema.sql` চালান।
4. V55-এর প্রয়োজনীয় data নতুন project-এ import করুন এবং `member_profiles.member_id`-এর সঙ্গে existing member IDs map করুন।
5. একটি admin Auth user তৈরি করে তার UUID `admin_users` table-এ যোগ করুন।
6. `member-auth-config.js`-এ নতুন project URL ও publishable/anon key বসান।
7. GitHub Pages-এ publish করুন।

## Admin page
`member.html#admin` খুললে Admin approval screen পাওয়া যাবে।

## সতর্কতা
এই V1 ZIP-এর RPC source table structure V55-এর payments/profits/expenses structure ধরে লেখা। নতুন project-এ import করার পরে একটি test member দিয়ে signup → pending → approve → login → dashboard সম্পূর্ণ test করতে হবে।
