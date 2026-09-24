# আল ইখওয়ান — সহজ Member Login / Sign Up (Final)

## সদস্যের জন্য
- প্রথমে শুধু **সদস্য লগইন** এবং **নতুন সদস্য সাইন আপ**—দুইটি অপশন দেখা যাবে।
- কোনো Login/Sign Up form প্রথম পেজে খোলা থাকবে না।
- Login চাপলে সদস্যের নাম নির্বাচন + পাসওয়ার্ড দেখা যাবে।
- Sign Up চাপলে সদস্যের নাম নির্বাচন + ঠিকানা + মোবাইল + পাসওয়ার্ড দেখা যাবে।
- সদস্যের নাম মূল `members` তালিকা থেকে আসবে।
- Sign Up-এর পর অ্যাডমিন যাচাই ও অনুমোদন করবেন।
- অনুমোদনের পর সদস্য নাম + পাসওয়ার্ড দিয়ে Login করবেন।
- সদস্যের জন্য কোনো Email field নেই এবং সদস্যকে কোনো Email দিতে হবে না।

## Supabase-এর গুরুত্বপূর্ণ সেটিং
এই client-side পদ্ধতিতে Supabase Auth-এর Email provider-এর ভিতরে একটি **internal technical email identifier** ব্যবহার করা হয়; এটি সদস্যের কাছে দেখানো হয় না।

তাই Member Supabase project-এ:
1. Authentication → Providers → Email
2. Email provider **ON** রাখুন
3. **Confirm email = OFF** করুন

Confirm email ON থাকলে Supabase confirmation mail পাঠাতে চেষ্টা করবে এবং `email rate limit exceeded` আসতে পারে। Confirm email OFF থাকলে সদস্যের কাছে কোনো confirmation email যাবে না।

## Admin
Admin login-এর জন্য Admin email আগের মতোই থাকবে। এটি সদস্যের Email Sign Up-এর সঙ্গে সম্পর্কিত নয়।

## প্রথম পেজ
- লগইন না করলে শুধু Admin Login / Member Login প্রবেশ অপশন থাকবে।
- Hamburger (☰) menu তখন থাকবে না।
- Admin সফলভাবে login করলে main হিসাবের সব menu দেখা যাবে।
- Member সফলভাবে login করলে member dashboard-এর menu দেখা যাবে।
