# Al-Ikhwan Member Hisab — Member Login Fix

এই সংস্করণে মূল হিসাবের Database অপরিবর্তিত রাখা হয়েছে।

## কী ঠিক করা হয়েছে
- Member Admin login এখন `member_admins` table ব্যবহার করে।
- Member login/signup Member Supabase project-এ থাকে।
- মূল হিসাবের existing Supabase project থেকে `members`, `payments`, `profits`, `expenses` পড়া হয়।
- Member account ও মূল সদস্যকে `mobile` নম্বর দিয়ে মিলানো হয়; `member_id` column-এর উপর আর নির্ভর করা হয় না।
- Admin approval-এর আগে মূল `members` table-এ একই mobile নম্বরের active member থাকতে হবে।
- Admin Public করলে অনুমোদিত সদস্যরা সকল সদস্যের হিসাব দেখতে পাবে।
- Admin Hide করলে সদস্য শুধু নিজের হিসাব দেখতে পাবে।
- Visibility setting `member_visibility_settings`-এ থাকে।

## গুরুত্বপূর্ণ
এই ফাইলের `member-auth-schema.sql` বর্তমান Member project-এর জন্য নিরাপদ setup note।
পুরোনো schema বা নতুন আলাদা project তৈরি করার SQL চালাবেন না।

## GitHub upload
শুধু পরিবর্তিত ফাইলগুলো replace করলেই যথেষ্ট:
- member-auth.js
- member-auth-config.js
- member.html
- member-auth-schema.sql (ঐচ্ছিক; SQL চালানো জরুরি নয় যদি visibility row ইতিমধ্যে থাকে)
- README-MEMBER-FIX-BN.md

## Cache
GitHub Pages deploy হওয়ার পর member.html-এ `member-auth.js?v=3` ও config `?v=3` আছে, তাই browser cache এড়ানো হবে।


## নতুন সদস্য অ্যাকাউন্ট পদ্ধতি
সদস্য যে কোনো বৈধ ১১ সংখ্যার মোবাইল নম্বর দিয়ে Sign Up করতে পারবে। Admin Pending account-এর পাশে মূল হিসাবের সদস্যের নাম নির্বাচন করে **যুক্ত করুন ও অনুমোদন** করবেন। এতে Sign Up-এর মোবাইল নম্বরই login নম্বর থাকবে, আর হিসাব কোন মূল সদস্যের হবে তা আলাদা link table-এ সংরক্ষিত হবে।

একবার `member-account-linking.sql` Member Supabase project-এ চালাতে হবে।

## নতুন: ইমেইল অথবা ফোন—দুইভাবেই Member Account

Member Login পেজে এখন:
- ফোন নম্বর দিয়ে Login/Sign Up করা যাবে
- ইমেইল দিয়ে Login/Sign Up করা যাবে
- Sign Up-এর পর account `pending` থাকবে
- Admin যাচাই করে মূল সদস্য নির্বাচন করে অনুমোদন করবেন

### গুরুত্বপূর্ণ Supabase সেটিং
ফোন নম্বর দিয়ে account-এর জন্য এই সিস্টেম Supabase Auth-এর ভিতরে একটি internal email identifier ব্যবহার করে। তাই Member Supabase project-এর Authentication → Providers → Email-এ **Confirm email বন্ধ (OFF)** রাখতে হবে। Email provider চালু থাকবে।

`member-account-linking.sql`-এর নতুন অংশটি চালিয়ে `member_profiles.email` column ও unique index তৈরি করতে হবে। আগের linking SQL ইতিমধ্যে চালানো থাকলেও এই নতুন অংশটি একবার চালানো নিরাপদ।
