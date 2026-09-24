# মূল হিসাবের RLS / Admin সেটআপ

আপনার বর্তমান সিস্টেমে Admin authentication **Member Supabase project**-এ, কিন্তু `members/payments/profits/expenses/assets/notices` টেবিল **Main Supabase project**-এ। তাই Member project-এর login session দিয়ে Main project-এর RLS-কে Admin হিসেবে চেনানো যায় না। এর কারণেই `new row violates row-level security policy` দেখা যাচ্ছিল।

নিরাপদ সমাধান হলো Main Supabase project-এও একই Admin-এর একটি Auth account রাখা এবং সেটির UUID আপনার বিদ্যমান `admin_users` table-এ রাখা। Frontend-এ দুই project-এ একই Admin credentials দিয়ে session নেওয়া যাবে; Member project দিয়ে member administration এবং Main project session দিয়ে হিসাবের write permission কাজ করবে।

এই ফাইলটি এখনই না বুঝে কোনো SQL চালাবেন না। আগে Main Supabase Dashboard → Authentication → Users-এ একই Admin email-এর account আছে কি না দেখুন। না থাকলে একই email/password দিয়ে account তৈরি করুন। তারপর সেই Main-project User UID আপনার বিদ্যমান `admin_users.user_id`-এ যুক্ত করতে হবে।

এই একবারের সেটআপ ছাড়া frontend থেকে RLS নিরাপদভাবে bypass করার চেষ্টা করা হবে না। `anon`-কে INSERT/UPDATE permission দেওয়া হবে না।
