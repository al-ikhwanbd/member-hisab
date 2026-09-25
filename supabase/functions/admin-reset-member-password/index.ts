import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Admin session required.')

    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser()
    if (callerError || !caller) throw new Error('Admin session is invalid.')

    const adminClient = createClient(url, serviceKey)
    const { data: adminRow, error: adminError } = await adminClient
      .from('member_admins').select('user_id').eq('user_id', caller.id).maybeSingle()
    if (adminError || !adminRow) throw new Error('এই অ্যাকাউন্টে অ্যাডমিন অনুমতি নেই।')

    const body = await req.json()
    const memberUserId = String(body?.member_user_id || '')
    const newPassword = String(body?.new_password || '')
    if (!memberUserId) throw new Error('সদস্য অ্যাকাউন্ট পাওয়া যায়নি।')
    if (newPassword.length < 6) throw new Error('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।')

    const { data: link, error: linkError } = await adminClient
      .from('member_account_links').select('member_user_id').eq('member_user_id', memberUserId).maybeSingle()
    if (linkError || !link) throw new Error('এই অ্যাকাউন্টটি অনুমোদিত সদস্য অ্যাকাউন্ট হিসেবে পাওয়া যায়নি।')

    const { data: profile, error: profileError } = await adminClient
      .from('member_profiles').select('id,status').eq('id', memberUserId).maybeSingle()
    if (profileError || !profile || profile.status !== 'approved') throw new Error('সদস্য অ্যাকাউন্টটি অনুমোদিত অবস্থায় নেই।')

    const { error: updateError } = await adminClient.auth.admin.updateUserById(memberUserId, { password: newPassword })
    if (updateError) throw updateError

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Password reset failed.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
