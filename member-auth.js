(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
  const money=n=>`৳ ${Number(n||0).toLocaleString('bn-BD')}`;
  const months=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  const validMobile=v=>/^01\d{9}$/.test(String(v||'').replace(/[\s-]/g,''));
  const normalizeMobile=v=>String(v||'').replace(/[\s-]/g,'');
  const memberReady=window.MEMBER_SUPABASE_URL&&window.MEMBER_SUPABASE_ANON_KEY&&window.supabase;
  const mainReady=window.MAIN_SUPABASE_URL&&window.MAIN_SUPABASE_ANON_KEY&&window.supabase;
  const sb=memberReady?window.supabase.createClient(window.MEMBER_SUPABASE_URL,window.MEMBER_SUPABASE_ANON_KEY):null;
  const mainSb=mainReady?window.supabase.createClient(window.MAIN_SUPABASE_URL,window.MAIN_SUPABASE_ANON_KEY):null;
  let currentProfile=null;
  let currentMainMember=null;
  let mainData={members:[],payments:[],profits:[],expenses:[],assets:[],notices:[]};
  const DEFAULT_MONTHLY_REQUIRED=500;
  let monthlyRequired=DEFAULT_MONTHLY_REQUIRED;

  function msg(text,ok=false,id='authMsg'){const el=$(id);if(!el)return;el.textContent=text;el.className='message '+(ok?'success':'error');}
  function toggle(mode){const signup=mode==='signup';$('signupForm').hidden=!signup;$('loginForm').hidden=signup;$('showSignup').classList.toggle('active',signup);$('showLogin').classList.toggle('active',!signup);$('authTitle').textContent=signup?'সদস্য অ্যাকাউন্ট তৈরি':'সদস্য লগইন';$('authSubtitle').textContent=signup?'নাম, ঠিকানা ও মোবাইল নম্বর দিয়ে অ্যাকাউন্ট তৈরি করুন।':'অনুমোদিত সদস্যরা মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে প্রবেশ করুন।';$('authMsg').textContent='';}
  function showOnly(which){$('authCard').hidden=which!=='auth';$('pendingCard').hidden=which!=='pending';$('dashboard').hidden=which!=='dashboard';}
  function calcPaid(member,year='all'){
    const target=year==='all'||!year?null:String(year);
    return mainData.payments.filter(p=>String(p.member_id)===String(member.id)&&(target===null||String(p.year)===target)).reduce((s,p)=>s+Number(p.paid_amount||0),0);
  }
  function years(){
    const set=new Set(['2021','2022','2023','2024']);
    mainData.payments.forEach(p=>{if(Number(p.paid_amount||0)>0)set.add(String(p.year));});
    return [...set].sort((a,b)=>Number(a)-Number(b));
  }
  function required(year='all'){return (year==='all'?years().length:1)*monthlyRequired*12;}
  function due(member,year='all'){return Math.max(required(year)-calcPaid(member,year),0);}
  function detectMonthly(){const p=mainData.payments.find(x=>Number(x.required_amount)>0);monthlyRequired=Number(p?.required_amount||DEFAULT_MONTHLY_REQUIRED)||DEFAULT_MONTHLY_REQUIRED;}
  function findMemberByMobile(mobile){return mainData.members.find(m=>normalizeMobile(m.mobile)===mobile)||null;}
  async function loadMainData(onlyMember=null){
    if(!mainSb) throw new Error('মূল হিসাবের Supabase configuration পাওয়া যায়নি।');
    const [m,p,pr,e]=await Promise.all([
      mainSb.from('members').select('*').eq('status','active').order('serial_no',{ascending:true,nullsFirst:false}).order('created_at'),
      mainSb.from('payments').select('*').order('year').order('month'),
      mainSb.from('profits').select('*').order('year'),
      mainSb.from('expenses').select('*').order('date',{ascending:false})
    ]);
    const errors=[m,p,pr,e].filter(x=>x.error);
    if(errors.length) throw errors[0].error;
    mainData={members:m.data||[],payments:p.data||[],profits:pr.data||[],expenses:e.data||[],assets:[],notices:[]};
    detectMonthly();
    currentMainMember=onlyMember?findMemberByMobile(onlyMember):null;
    return currentMainMember;
  }
  async function signUp(e){
    e.preventDefault();
    if(!sb){msg('সদস্য Login configuration পাওয়া যায়নি।');return;}
    const f=new FormData(e.currentTarget),name=String(f.get('full_name')||'').trim(),address=String(f.get('address')||'').trim(),mobile=normalizeMobile(f.get('mobile')),password=String(f.get('password')||'');
    if(name.length<2||address.length<2){msg('নাম ও ঠিকানা সঠিকভাবে দিন।');return;}
    if(!validMobile(mobile)){msg('সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন।');return}
    if(password.length<6){msg('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');return}
    if(!mainSb){msg('মূল হিসাবের সংযোগ পাওয়া যায়নি।');return}
    msg('অ্যাকাউন্ট যাচাই ও তৈরি হচ্ছে...',true);
    try{
      const {data:existing,error:me}=await mainSb.from('members').select('id,name,mobile,status').eq('status','active').eq('mobile',mobile).maybeSingle();
      if(me) throw me;
      if(!existing){msg('এই মোবাইল নম্বরটি অনুমোদিত সদস্য তালিকায় নেই। আগে মূল সাইটে সদস্য হিসেবে তথ্য থাকতে হবে।');return;}
      const {data,error}=await sb.auth.signUp({phone:'+88'+mobile,password});
      if(error) throw error;
      const uid=data.user?.id;if(!uid) throw new Error('অ্যাকাউন্ট তৈরি হয়েছে, কিন্তু ব্যবহারকারী আইডি পাওয়া যায়নি।');
      const {error:pe}=await sb.from('member_profiles').insert({id:uid,full_name:name,address,mobile,status:'pending'});
      if(pe){await sb.auth.signOut();throw pe;}
      await sb.auth.signOut();e.currentTarget.reset();toggle('login');msg('অ্যাকাউন্ট তৈরি হয়েছে। অ্যাডমিন অনুমোদনের পর লগইন করতে পারবেন।',true);
    }catch(err){msg(err.message||'অ্যাকাউন্ট তৈরি করা যায়নি।');}
  }
  async function signIn(e){
    e.preventDefault();
    if(!sb){msg('সদস্য Login configuration পাওয়া যায়নি।');return;}
    const f=new FormData(e.currentTarget),mobile=normalizeMobile(f.get('mobile')),password=String(f.get('password')||'');
    if(!validMobile(mobile)){msg('সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন।');return}
    msg('লগইন হচ্ছে...',true);
    const {error}=await sb.auth.signInWithPassword({phone:'+88'+mobile,password});
    if(error){msg(error.message);return}
    await loadSession();
  }
  async function loadSession(){
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.user){showOnly('auth');return}
    const {data,error}=await sb.from('member_profiles').select('*').eq('id',session.user.id).maybeSingle();
    if(error||!data){await sb.auth.signOut();msg('সদস্য প্রোফাইল পাওয়া যায়নি।');showOnly('auth');return}
    currentProfile=data;
    if(data.status!=='approved'){showOnly('pending');return}
    try{
      await loadMainData(data.mobile);
      if(!currentMainMember){msg('এই সদস্যের মোবাইল নম্বর মূল সদস্য তালিকায় পাওয়া যায়নি। অ্যাডমিনকে তথ্য যাচাই করতে বলুন।');await sb.auth.signOut();showOnly('auth');return;}
    }catch(err){msg(err.message||'হিসাব লোড করা যায়নি।');showOnly('auth');return}
    showOnly('dashboard');
    $('memberName').textContent=data.full_name;$('memberMobile').textContent=data.mobile;
    $('memberProfile').innerHTML=`<div class="profile-item"><span>নাম</span><strong>${esc(data.full_name)}</strong></div><div class="profile-item"><span>ঠিকানা</span><strong>${esc(data.address)}</strong></div><div class="profile-item"><span>মোবাইল</span><strong>${esc(data.mobile)}</strong></div><div class="profile-item"><span>অবস্থা</span><strong>অনুমোদিত</strong></div>`;
    await loadDashboard();
  }
  async function getVisibility(){const {data,error}=await sb.from('member_visibility_settings').select('all_members_public').eq('id',true).maybeSingle();if(error)return false;return !!data?.all_members_public;}
  async function setVisibility(isPublic){const {error}=await sb.from('member_visibility_settings').upsert({id:true,all_members_public:!!isPublic,updated_at:new Date().toISOString()},{onConflict:'id'});if(error){msg(error.message,false,'adminMsg');return;}msg(isPublic?'সকল সদস্যের হিসাব Public করা হয়েছে।':'সকল সদস্যের হিসাব Hide করা হয়েছে।',true,'adminMsg');await loadPending();}
  window.memberSetPublic=()=>setVisibility(true);window.memberSetHide=()=>setVisibility(false);
  function memberRows(list){
    return list.slice().sort((a,b)=>Number(a.serial_no||999999)-Number(b.serial_no||999999)).map((m,i)=>`<tr><td>${Number(m.serial_no||i+1).toLocaleString('bn-BD')}</td><td class="name">${esc(m.name)}</td><td>${money(calcPaid(m,'all'))}</td><td>${money(due(m,'all'))}</td></tr>`).join('');
  }
  function personalRows(m){
    return years().map(y=>`<tr><td>${y}</td><td>${money(calcPaid(m,y))}</td><td>${money(due(m,y))}</td></tr>`).join('');
  }
  async function loadDashboard(){
    const publicAll=await getVisibility();
    $('personalSummary').innerHTML=`<article><span>সকল বছরের মোট পরিশোধ</span><strong>${money(calcPaid(currentMainMember,'all'))}</strong></article><article><span>সকল বছরের মোট বাকি</span><strong>${money(due(currentMainMember,'all'))}</strong></article><article><span>সদস্যের অবস্থা</span><strong>অনুমোদিত</strong></article>`;
    $('personalAccount').innerHTML=`<div class="table-wrap"><table><thead><tr><th>সাল</th><th>পরিশোধ</th><th>বাকি</th></tr></thead><tbody>${personalRows(currentMainMember)||'<tr><td colspan="3">কোনো হিসাব পাওয়া যায়নি</td></tr>'}</tbody></table></div>`;
    const approved=mainData.members.length;
    const totalPaid=mainData.payments.reduce((s,p)=>s+Number(p.paid_amount||0),0);
    const totalProfit=mainData.profits.reduce((s,p)=>s+Number(p.total_profit||0),0);
    const totalExpense=mainData.expenses.reduce((s,p)=>s+Number(p.amount||0),0);
    $('organizationSummary').innerHTML=`<div class="summary-grid"><article><span>সকল সদস্যের হিসাব</span><strong>${publicAll?'Public':'Hide'}</strong></article><article><span>সদস্য সংখ্যা</span><strong>${approved.toLocaleString('bn-BD')}</strong></article><article><span>মোট পরিশোধ</span><strong>${money(totalPaid)}</strong></article><article><span>মোট লভ্যাংশ</span><strong>${money(totalProfit)}</strong></article><article><span>মোট খরচ</span><strong>${money(totalExpense)}</strong></article></div>`;
    const section=$('allMembersSection');section.hidden=!publicAll;
    if(publicAll){$('allMembersAccount').innerHTML=`<div class="table-wrap"><table class="member-report-table"><thead><tr><th>ক্রমিক</th><th class="name">সদস্যের নাম</th><th>মোট পরিশোধ</th><th>মোট বাকি</th></tr></thead><tbody>${memberRows(mainData.members)}</tbody></table></div>`;}
  }
  async function logout(){if(sb)await sb.auth.signOut();currentProfile=null;currentMainMember=null;showOnly('auth');toggle('login');}
  async function adminLogin(e){
    e.preventDefault();if(!sb){msg('Member Supabase configuration পাওয়া যায়নি।','adminMsg');return;}
    const f=new FormData(e.currentTarget),email=String(f.get('email')||'').trim(),password=String(f.get('password')||'');
    const {data,error}=await sb.auth.signInWithPassword({email,password});
    if(error){msg(error.message,false,'adminMsg');return}
    const {data:au,error:ae}=await sb.from('member_admins').select('user_id').eq('user_id',data.user.id).maybeSingle();
    if(ae||!au){await sb.auth.signOut();msg('এই অ্যাকাউন্টে অ্যাডমিন অনুমতি নেই।',false,'adminMsg');return}
    e.currentTarget.hidden=true;await loadPending();
  }
  async function loadPending(){
    const box=$('pendingMembers');box.hidden=false;const publicAll=await getVisibility();
    const controls=`<div class="visibility-controls"><div><b>সকল সদস্যের হিসাব:</b> <strong>${publicAll?'Public':'Hide'}</strong></div><div><button class="small-btn approve" onclick="window.memberSetPublic()">🟢 সকলের হিসাব Public</button> <button class="small-btn reject" onclick="window.memberSetHide()">🔴 সকলের হিসাব Hide</button></div></div>`;
    const {data,error}=await sb.from('member_profiles').select('id,full_name,address,mobile,created_at,status').eq('status','pending').order('created_at',{ascending:true});
    if(error){msg(error.message,false,'adminMsg');return}
    let rows='';
    for(const x of (data||[])){
      let exists=false;try{const {data:m}=await mainSb.from('members').select('id,name,mobile,status').eq('status','active').eq('mobile',normalizeMobile(x.mobile)).maybeSingle();exists=!!m;}catch{}
      rows+=`<tr><td>${esc(x.full_name)}</td><td class="name">${esc(x.address)}</td><td>${esc(x.mobile)}</td><td>${exists?'মূল তালিকায় আছে':'⚠️ মূল তালিকায় নেই'}</td><td>${new Date(x.created_at).toLocaleDateString('bn-BD')}</td><td><button class="small-btn approve" onclick="window.memberApprove('${x.id}')" ${exists?'':'disabled'}>অনুমোদন</button> <button class="small-btn reject" onclick="window.memberReject('${x.id}')">বাতিল</button></td></tr>`;
    }
    box.innerHTML=controls+`<table><thead><tr><th>নাম</th><th>ঠিকানা</th><th>মোবাইল</th><th>সদস্য মিল</th><th>তারিখ</th><th>অ্যাকশন</th></tr></thead><tbody>${rows||'<tr><td colspan="6">কোনো Pending account নেই</td></tr>'}</tbody></table>`;
  }
  async function setStatus(id,status){
    if(status==='approved'){
      const {data:p}=await sb.from('member_profiles').select('mobile').eq('id',id).maybeSingle();
      if(!p){msg('সদস্য প্রোফাইল পাওয়া যায়নি।',false,'adminMsg');return}
      const {data:m,error:me}=await mainSb.from('members').select('id,name,mobile,status').eq('status','active').eq('mobile',normalizeMobile(p.mobile)).maybeSingle();
      if(me||!m){msg('এই মোবাইল নম্বরটি মূল সদস্য তালিকায় পাওয়া যায়নি। আগে মূল সাইটে সদস্যটি যোগ করুন।',false,'adminMsg');return}
    }
    const {error}=await sb.from('member_profiles').update({status,approved_at:status==='approved'?new Date().toISOString():null}).eq('id',id).eq('status','pending');
    if(error){msg(error.message,false,'adminMsg');return}await loadPending();
  }
  window.memberApprove=id=>setStatus(id,'approved');window.memberReject=id=>setStatus(id,'rejected');
  $('showSignup').onclick=()=>toggle('signup');$('showLogin').onclick=()=>toggle('login');$('signupForm').onsubmit=signUp;$('loginForm').onsubmit=signIn;$('memberLogout').onclick=logout;$('pendingLogout').onclick=logout;$('adminLoginForm').onsubmit=adminLogin;$('footerYear').textContent=new Date().getFullYear();
  if(location.hash==='#admin')$('adminPanel').hidden=false; else $('adminPanel').hidden=true;
  if(!sb||!mainSb){msg('প্রয়োজনীয় Supabase configuration পাওয়া যায়নি।',false);}else loadSession();
})();
