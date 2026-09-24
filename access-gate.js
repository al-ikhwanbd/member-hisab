(function(){const $=id=>document.getElementById(id);const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));const authEmail=id=>`member-${String(id)}@member.al-ikhwanbd.github.io`;const validMobile=v=>/^01\d{9}$/.test(String(v||'').replace(/[\s-]/g,''));let ms,main,members=[];function msg(id,t,ok=false){const e=$(id);if(e){e.textContent=t;e.className='message '+(ok?'success':'error')}}function panel(x){$('accessChooser').hidden=true;$('memberAccessPanel').hidden=x!=='member';$('memberSignupPanel').hidden=x!=='signup';$('adminAccessPanel').hidden=x!=='admin'}async function loadMembers(){const r=await main.from('members').select('id,name,serial_no,mobile,status').eq('status','active').order('serial_no',{ascending:true,nullsFirst:false}).order('created_at');if(r.error)return;members=r.data||[];for(const id of ['accessMember','accessSignupMember']){const e=$(id);e.innerHTML='<option value="">-- সদস্যের নাম নির্বাচন করুন --</option>'+members.map((m,i)=>`<option value="${esc(m.id)}">${Number(m.serial_no||i+1).toLocaleString('bn-BD')}. ${esc(m.name)}</option>`).join('')}}async function memberLogin(e){e.preventDefault();const id=$('accessMember').value,p=$('accessPassword').value;if(!members.some(m=>String(m.id)===String(id))||p.length<6){msg('memberAccessMsg','সদস্যের নাম ও সঠিক পাসওয়ার্ড দিন।');return}msg('memberAccessMsg','লগইন হচ্ছে...',true);const authPromise=ms.auth.signInWithPassword({email:authEmail(id),password:p});const timeout=new Promise(resolve=>setTimeout(()=>resolve({error:{message:'সুপাবেস লগইন সার্ভার থেকে নির্ধারিত সময়ে উত্তর পাওয়া যায়নি। ইন্টারনেট সংযোগ বা Member Supabase Auth সেটিংস পরীক্ষা করুন।'}}),15000));const r=await Promise.race([authPromise,timeout]);if(r.error){msg('memberAccessMsg',r.error.message||'সদস্যের নাম অথবা পাসওয়ার্ড সঠিক নয়।');return}const prof=await ms.from('member_profiles').select('status').eq('id',r.data.user.id).maybeSingle();const link=await ms.from('member_account_links').select('main_member_id').eq('member_user_id',r.data.user.id).maybeSingle();if(prof.data?.status!=='approved'||!link.data?.main_member_id){await ms.auth.signOut();msg('memberAccessMsg',prof.data?.status!=='approved'?'আপনার অ্যাকাউন্ট এখনো অনুমোদিত নয়।':'আপনার হিসাব এখনো সংযুক্ত করা হয়নি।');return}window.__MEMBER_MAIN_ID=link.data.main_member_id;window.enterMemberApp()}async function signup(e){e.preventDefault();const id=$('accessSignupMember').value,address=$('accessAddress').value.trim(),mobile=$('accessMobile').value.replace(/[\s-]/g,''),p=$('accessSignupPassword').value,m=members.find(x=>String(x.id)===String(id));if(!m||address.length<2||!validMobile(mobile)||p.length<6){msg('memberSignupMsg','সদস্য, ঠিকানা, সঠিক মোবাইল ও কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।');return}msg('memberSignupMsg','অ্যাকাউন্ট তৈরি হচ্ছে...',true);const r=await ms.auth.signUp({email:authEmail(id),password:p,options:{data:{full_name:m.name,mobile,main_member_id:id,login_method:'member_name'}}});if(r.error){msg('memberSignupMsg',r.error.message);return}const ins=await ms.from('member_profiles').insert({id:r.data.user.id,full_name:m.name,address,mobile,status:'pending'});if(ins.error){await ms.auth.signOut();msg('memberSignupMsg',ins.error.message);return}await ms.auth.signOut();panel('member');msg('memberAccessMsg','অ্যাকাউন্ট তৈরি হয়েছে। অ্যাডমিন অনুমোদনের পর লগইন করতে পারবেন।',true)}async function adminLogin(){
  const email=$('gateAdminEmail').value.trim().toLowerCase(),password=$('gateAdminPassword').value;
  if(!email||!password){msg('adminAccessMsg','ইমেইল ও পাসওয়ার্ড দিন।');return}
  if(!ms){msg('adminAccessMsg','Admin authentication configuration পাওয়া যায়নি।');return}
  const btn=$('gateAdminLogin'); if(btn)btn.disabled=true;
  msg('adminAccessMsg','লগইন হচ্ছে...',true);
  try{
    // আগের কার্যকর Admin Login-এর মতো: Admin পরিচয় Member Supabase-এ যাচাই হবে।
    const authPromise=ms.auth.signInWithPassword({email,password});
    const timeout=new Promise(resolve=>setTimeout(()=>resolve({data:null,error:{message:'Supabase লগইন সার্ভার থেকে নির্ধারিত সময়ে উত্তর পাওয়া যায়নি।'}}),15000));
    const r=await Promise.race([authPromise,timeout]);
    if(r.error){msg('adminAccessMsg',r.error.message||'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।');return}
    if(!r.data?.user){msg('adminAccessMsg','লগইন সম্পন্ন হয়নি। আবার চেষ্টা করুন।');return}
    const a=await ms.from('member_admins').select('user_id').eq('user_id',r.data.user.id).maybeSingle();
    if(a.error){await ms.auth.signOut();msg('adminAccessMsg','অ্যাডমিন অনুমতি যাচাই করা যায়নি। Member Supabase-এর member_admins/RLS সেটিংস পরীক্ষা করুন।');return}
    if(!a.data){await ms.auth.signOut();msg('adminAccessMsg','এই অ্যাকাউন্টে অ্যাডমিন অনুমতি নেই।');return}
    window.__ADMIN_MEMBER_USER={id:r.data.user.id,email:r.data.user.email||email};
    // হিসাবের Main Supabase-এও একই Admin credential দিয়ে session নেওয়ার চেষ্টা।
    let mainOk=false, mainErr=null;
    if(main){
      const candidates=[email,'mdkefayatullah25@gmail.com','alikhwanisbd@gmail.com'].filter((v,i,a)=>v&&a.indexOf(v)===i);
      for(const em of candidates){
        const mr=await main.auth.signInWithPassword({email:em,password});
        if(!mr.error){mainOk=true;break}
        mainErr=mr.error;
      }
    }
    window.__ADMIN_MAIN_AUTH=mainOk;
    window.enterAdminApp();
    if(mainOk) msg('adminAccessMsg','এডমিন লগইন সফল হয়েছে।',true);
    else msg('adminAccessMsg','এডমিন লগইন সফল হয়েছে। মূল হিসাবের Admin session পাওয়া যায়নি; হিসাবের RLS/credential পরীক্ষা করুন।',true);
    $('gateAdminPassword').value='';
  }catch(err){
    console.error(err);
    try{await ms.auth.signOut()}catch(_){}
    msg('adminAccessMsg',err?.message||'অ্যাডমিন লগইনে অপ্রত্যাশিত সমস্যা হয়েছে।');
  }finally{if(btn)btn.disabled=false}
}
async function restore(){
  try{
    const m=await ms.auth.getSession();
    if(m.data.session){
      const p=await ms.from('member_profiles').select('status').eq('id',m.data.session.user.id).maybeSingle();
      const l=await ms.from('member_account_links').select('main_member_id').eq('member_user_id',m.data.session.user.id).maybeSingle();
      if(p.data?.status==='approved'&&l.data?.main_member_id){window.__MEMBER_MAIN_ID=l.data.main_member_id;window.enterMemberApp();return}
      const a=await ms.from('member_admins').select('user_id').eq('user_id',m.data.session.user.id).maybeSingle();
      if(a.data){window.__ADMIN_MEMBER_USER={id:m.data.session.user.id,email:m.data.session.user.email||'Admin'};window.enterAdminApp();return}
    }
    // Main Supabase session থাকলেও admin অনুমতি Member Supabase-এ যাচাই না হওয়া পর্যন্ত Admin খুলবে না।
  }catch(err){console.error('restore auth error',err)}
}
document.addEventListener('DOMContentLoaded',async()=>{try{ms=window.supabase.createClient(window.MEMBER_SUPABASE_URL,window.MEMBER_SUPABASE_ANON_KEY);main=window.supabase.createClient(window.MAIN_SUPABASE_URL,window.MAIN_SUPABASE_ANON_KEY);window.__MAIN_SB=main;window.__MEMBER_AUTH_SB=ms;await loadMembers();$('chooseMemberLogin').onclick=()=>panel('member');$('chooseAdminLogin').onclick=()=>panel('admin');$('showSignup').onclick=()=>panel('signup');$('backToMemberLogin').onclick=()=>panel('member');$('memberLoginForm').onsubmit=memberLogin;$('memberSignupForm').onsubmit=signup;$('gateAdminLogin').onclick=adminLogin;await restore()}catch(err){console.error(err);msg('memberAccessMsg','লগইন সিস্টেম চালু করতে সমস্যা হয়েছে: '+(err?.message||'অজানা সমস্যা'));}})})();
