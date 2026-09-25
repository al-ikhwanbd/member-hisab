# অ্যাডমিন দিয়ে সদস্যের পাসওয়ার্ড রিসেট

এই সংস্করণে অ্যাডমিন কোনো সদস্যের পুরোনো পাসওয়ার্ড দেখতে পাবেন না। বরং `যুক্ত করা সদস্য অ্যাকাউন্ট` তালিকা থেকে **🔑 নতুন পাসওয়ার্ড সেট** চাপলে নতুন পাসওয়ার্ড দুবার দিয়ে সেট করতে পারবেন।

## একবারের Supabase সেটআপ

এই ফোল্ডারের `supabase/functions/admin-reset-member-password/index.ts` Edge Function হিসেবে Member Supabase project-এ deploy করতে হবে। Function-টি `SUPABASE_SERVICE_ROLE_KEY` ব্যবহার করে Auth password পরিবর্তন করে এবং caller-কে `member_admins` টেবিল দিয়ে যাচাই করে।

Supabase CLI দিয়ে, Member Supabase project-এ:

```bash
supabase functions deploy admin-reset-member-password
```

Deploy-এর পরে Function-টি এই URL-এ থাকবে:

`https://YOUR-PROJECT-REF.supabase.co/functions/v1/admin-reset-member-password`

প্রজেক্টের স্বাভাবিক Supabase Edge Function secrets-এ `SUPABASE_SERVICE_ROLE_KEY` থাকতে হবে। Supabase-managed Edge Functions-এ এটি সাধারণত আগে থেকেই available থাকে।

**গুরুত্বপূর্ণ:** Service Role Key কখনো `member-auth.js`, HTML বা public JavaScript-এ বসাবেন না।

Function deploy না করা পর্যন্ত নতুন বাটনটি দেখাবে, কিন্তু চাপলে সেটআপ/Function সংক্রান্ত error দেখাবে। বাকি Member ও Admin সিস্টেম আগের মতো চলবে।


## নতুন: Admin Panel-এ সর্বশেষ সেট করা পাসওয়ার্ড সংরক্ষণ

Admin কোনো সদস্যের জন্য নতুন পাসওয়ার্ড সেট করলে **সর্বশেষ সেট করা পাসওয়ার্ডটি ওই Admin ব্রাউজারের localStorage-এ সংরক্ষিত থাকে**। যুক্ত করা সদস্য অ্যাকাউন্ট তালিকায় 👁️ চাপলে সেটি দেখা যাবে। এটি Supabase database-এ plain-text password হিসেবে রাখা হয় না।

অন্য ব্রাউজার/অন্য ডিভাইসে এই সংরক্ষিত password দেখা যাবে না। Browser data/site data মুছে দিলে সংরক্ষিত password-ও মুছে যেতে পারে।
