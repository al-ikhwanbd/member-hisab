(function(){const $=id=>document.getElementById(id);const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));const authEmail=id=>`member-${String(id)}@member.al-ikhwanbd.github.io`;const validMobile=v=>/^01\d{9}$/.test(String(v||'').replace(/[\s-]/g,''));let ms,main,members=[];function msg(id,t,ok=false){const e=$(id);if(e){e.textContent=t;e.className='message '+(ok?'success':'error')}}function panel(x){$('accessChooser').hidden=true;$('memberAccessPanel').hidden=x!=='member';$('memberSignupPanel').hidden=x!=='signup';$('adminAccessPanel').hidden=x!=='admin'}async function loadMembers(){const r=await main.from('members').select('id,name,serial_no,mobile,status').eq('status','active').order('serial_no',{ascending:true,nullsFirst:false}).order('created_at');if(r.error)return;members=r.data||[];for(const id of ['accessMember','accessSignupMember']){const e=$(id);e.innerHTML='<option value="">-- সদস্যের নাম নির্বাচন করুন --</option>'+members.map((m,i)=>`<option value="${esc(m.id)}">${Number(m.serial_no||i+1).toLocaleString('bn-BD')}. ${esc(m.name)}</option>`).join('')}}async function loadAccountingVisibility(){
  if(!main){window.__MEMBER_ACCOUNTING_PUBLIC=false;return false;}
  const r=await Promise.race([
    main.from('accounting_visibility').select('id,is_public').eq('id',1).maybeSingle(),
    new Promise(resolve=>setTimeout(()=>resolve({data:null,error:{message:'হিসাবের Public/Hide অবস্থা যাচাই করতে সময় শেষ হয়েছে।'}}),10000))
  ]);
  if(r.error){console.warn('accounting visibility:',r.error.message);window.__MEMBER_ACCOUNTING_PUBLIC=false;return false;}
  window.__MEMBER_ACCOUNTING_PUBLIC=!!r.data?.is_public;
  return window.__MEMBER_ACCOUNTING_PUBLIC;
}
async function memberLogin(e){
  e.preventDefault();
  if(!ms){msg('memberAccessMsg','সদস্য Login configuration পাওয়া যায়নি।');return}
  const id=$('accessMember').value;
  const p=$('accessPassword').value;
  const selected=members.find(m=>String(m.id)===String(id));
  if(!selected){msg('memberAccessMsg','আগে তালিকা থেকে আপনার সদস্যের নাম নির্বাচন করুন।');return}
  if(p.length<6){msg('memberAccessMsg','সঠিক পাসওয়ার্ড দিন।');return}
  msg('memberAccessMsg','লগইন হচ্ছে...',true);
  try{
    const authPromise=ms.auth.signInWithPassword({email:authEmail(id),password:p});
    const r=await Promise.race([
      authPromise,
      new Promise(resolve=>setTimeout(()=>resolve({data:null,error:{message:'Member Supabase Auth থেকে নির্ধারিত সময়ে উত্তর পাওয়া যায়নি।'}}),20000))
    ]);
    if(r.error){msg('memberAccessMsg',r.error.message||'সদস্যের নাম অথবা পাসওয়ার্ড সঠিক নয়।');return}
    const uid=r.data?.user?.id;
    if(!uid){msg('memberAccessMsg','লগইন সম্পন্ন হয়েছে, কিন্তু সদস্যের User ID পাওয়া যায়নি।');return}

    const profileResult=await Promise.race([
      ms.from('member_profiles').select('*').eq('id',uid).maybeSingle(),
      new Promise(resolve=>setTimeout(()=>resolve({data:null,error:{message:'Member profile যাচাই করতে সময় শেষ হয়েছে।'}}),15000))
    ]);
    if(profileResult.error||!profileResult.data){await ms.auth.signOut();msg('memberAccessMsg',profileResult.error?.message||'সদস্য প্রোফাইল পাওয়া যায়নি।');return}
    const profile=profileResult.data;
    if(profile.status!=='approved'){
      await ms.auth.signOut();
      msg('memberAccessMsg','আপনার অ্যাকাউন্ট এখনো অনুমোদিত নয়।');
      return;
    }

    const linkResult=await Promise.race([
      ms.from('member_account_links').select('main_member_id').eq('member_user_id',uid).maybeSingle(),
      new Promise(resolve=>setTimeout(()=>resolve({data:null,error:{message:'সদস্যের হিসাব সংযোগ যাচাই করতে সময় শেষ হয়েছে।'}}),15000))
    ]);
    if(linkResult.error||!linkResult.data?.main_member_id){
      await ms.auth.signOut();
      msg('memberAccessMsg',linkResult.error?.message||'আপনার অ্যাকাউন্টের সঙ্গে কোনো সদস্যের হিসাব এখনো যুক্ত করা হয়নি। অ্যাডমিনকে সদস্য যুক্ত করতে বলুন।');
      return;
    }

    // Main হিসাবের ডেটা লোড সফল না হওয়া পর্যন্ত Dashboard খুলব না।
    window.__MEMBER_MAIN_ID=linkResult.data.main_member_id;
    try{
      await loadMemberMainData(linkResult.data.main_member_id);
    }catch(err){
      msg('memberAccessMsg',err?.message||'মূল হিসাব লোড করা যায়নি।');
      return;
    }
    window.__MEMBER_PROFILE=profile;
    window.__MEMBER_USER_ID=uid;
    window.enterMemberApp();
  }catch(err){
    console.error('member login error',err);
    msg('memberAccessMsg',err?.message||'সদস্য লগইনে অপ্রত্যাশিত সমস্যা হয়েছে।');
  }
}
async function loadMemberMainData(onlyMemberId){
  if(!main)throw new Error('মূল হিসাবের Supabase configuration পাওয়া যায়নি।');
  const isPublic=await loadAccountingVisibility();
  const fetchPayments=async(memberId=null)=>{
    const rows=[];const pageSize=1000;
    for(let from=0;;from+=pageSize){
      let query=main.from('payments').select('*').order('year').order('month').range(from,from+pageSize-1);
      if(memberId)query=query.eq('member_id',memberId);
      const r=await Promise.race([
        query,
        new Promise(resolve=>setTimeout(()=>resolve({data:null,error:{message:memberId?'আপনার ব্যক্তিগত জমার তথ্য লোড করতে সময় শেষ হয়েছে।':'সদস্যদের হিসাব লোড করতে সময় শেষ হয়েছে।'}}),20000))
      ]);
      if(r.error)throw r.error; rows.push(...(r.data||[])); if(!r.data||r.data.length<pageSize)break;
    }
    return rows;
  };
  const queries=isPublic?[
    main.from('members').select('*').eq('status','active').order('serial_no',{ascending:true,nullsFirst:false}).order('created_at'),
    (async()=>({data:await fetchPayments(),error:null}))(),
    main.from('profits').select('*').order('year'),
    main.from('expenses').select('*').order('date',{ascending:false}),
    main.from('assets').select('*').eq('status','active').order('date',{ascending:false}),
    main.from('notices').select('*').eq('status','published').order('publish_date',{ascending:false})
  ]:[
    main.from('members').select('*').eq('id',onlyMemberId).eq('status','active').maybeSingle(),
    (async()=>({data:await fetchPayments(onlyMemberId),error:null}))(),
    Promise.resolve({data:[],error:null}),Promise.resolve({data:[],error:null}),Promise.resolve({data:[],error:null}),Promise.resolve({data:[],error:null})
  ];
  const results=await Promise.race([
    Promise.all(queries),
    new Promise(resolve=>setTimeout(()=>resolve({__timeout:true}),30000))
  ]);
  if(results?.__timeout)throw new Error('মূল হিসাবের Supabase থেকে সময়মতো তথ্য পাওয়া যায়নি।');
  const [m,p,pr,e,a,n]=results;
  const errors=[m,p,pr,e,a,n].filter(x=>x?.error);
  if(errors.length)throw errors[0].error;
  const memberRows=isPublic?(m.data||[]):(m.data?[m.data]:[]);
  window.__MEMBER_ACCOUNTING_PUBLIC=isPublic;
  window.__MEMBER_MAIN_DATA={members:memberRows,payments:p||[],profits:pr.data||[],expenses:e.data||[],assets:a.data||[],notices:n.data||[]};
}
async function signup(e){e.preventDefault();const id=$('accessSignupMember').value,address=$('accessAddress').value.trim(),mobile=$('accessMobile').value.replace(/[\s-]/g,''),p=$('accessSignupPassword').value,m=members.find(x=>String(x.id)===String(id));if(!m||address.length<2||!validMobile(mobile)||p.length<6){msg('memberSignupMsg','সদস্য, ঠিকানা, সঠিক মোবাইল ও কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।');return}msg('memberSignupMsg','অ্যাকাউন্ট তৈরি হচ্ছে...',true);const r=await ms.auth.signUp({email:authEmail(id),password:p,options:{data:{full_name:m.name,mobile,main_member_id:id,login_method:'member_name'}}});if(r.error){msg('memberSignupMsg',r.error.message);return}const ins=await ms.from('member_profiles').insert({id:r.data.user.id,full_name:m.name,address,mobile,status:'pending'});if(ins.error){await ms.auth.signOut();msg('memberSignupMsg',ins.error.message);return}await ms.auth.signOut();panel('member');msg('memberAccessMsg','অ্যাকাউন্ট তৈরি হয়েছে। অ্যাডমিন অনুমোদনের পর লগইন করতে পারবেন।',true)}async function adminLogin(){
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
    const session=m.data?.session;
    if(!session)return;
    const uid=session.user.id;
    const a=await ms.from('member_admins').select('user_id').eq('user_id',uid).maybeSingle();
    if(a.data){
      window.__ADMIN_MEMBER_USER={id:uid,email:session.user.email||'Admin'};
      window.enterAdminApp();
      return;
    }
    const p=await ms.from('member_profiles').select('status').eq('id',uid).maybeSingle();
    const l=await ms.from('member_account_links').select('main_member_id').eq('member_user_id',uid).maybeSingle();
    if(p.data?.status==='approved'&&l.data?.main_member_id){
      window.__MEMBER_MAIN_ID=l.data.main_member_id;
      try{
        await loadMemberMainData(l.data.main_member_id);
      }catch(err){
        console.error('member restore data error',err);
        await ms.auth.signOut();
        msg('memberAccessMsg',err?.message||'সদস্যের হিসাব পুনরুদ্ধার করা যায়নি। আবার লগইন করুন।');
        return;
      }
      window.__MEMBER_USER_ID=uid;
      window.enterMemberApp();
      return;
    }
    // অনুমোদিত Member/Admin নয়—পুরোনো/অসম্পূর্ণ session রেখে Login Gate-এ আটকে রাখা যাবে না।
    await ms.auth.signOut();
  }catch(err){console.error('restore auth error',err)}
}
document.addEventListener('DOMContentLoaded',async()=>{try{ms=window.supabase.createClient(window.MEMBER_SUPABASE_URL,window.MEMBER_SUPABASE_ANON_KEY);main=window.supabase.createClient(window.MAIN_SUPABASE_URL,window.MAIN_SUPABASE_ANON_KEY);window.__MAIN_SB=main;window.__MEMBER_AUTH_SB=ms;await loadMembers();$('chooseMemberLogin').onclick=()=>panel('member');$('chooseAdminLogin').onclick=()=>panel('admin');$('showSignup').onclick=()=>panel('signup');$('backToMemberLogin').onclick=()=>panel('member');$('memberLoginForm').onsubmit=memberLogin;$('memberSignupForm').onsubmit=signup;$('gateAdminLogin').onclick=adminLogin;await restore()}catch(err){console.error(err);msg('memberAccessMsg','লগইন সিস্টেম চালু করতে সমস্যা হয়েছে: '+(err?.message||'অজানা সমস্যা'));}})})();
