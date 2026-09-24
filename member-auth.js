(function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
  const money=n=>`৳ ${Number(n||0).toLocaleString('bn-BD')}`;
  const months=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  const validMobile=v=>/^01\d{9}$/.test(String(v||'').replace(/[\s-]/g,''));
  const normalizeMobile=v=>String(v||'').replace(/[\s-]/g,'');
  // Phone Auth is disabled in this Supabase project. We keep the user's mobile
  // number as the login identifier, but use a deterministic internal email for Auth.
  const authEmailFromMemberId=id=>`member-${String(id)}@member.al-ikhwanbd.github.io`;
  let selectableMembers=[];
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
  function showChooser(){
    $('memberAuthChooser').hidden=false;
    $('loginPanel').hidden=true;
    $('signupPanel').hidden=true;
    $('authTitle').textContent='সদস্য অ্যাকাউন্ট';
    $('authSubtitle').textContent='লগইন করতে বা নতুন অ্যাকাউন্ট তৈরি করতে একটি অপশন বেছে নিন।';
    $('authMsg').textContent='';
  }
  function openAuthPanel(mode){
    const signup=mode==='signup';
    $('memberAuthChooser').hidden=true;
    $('loginPanel').hidden=signup;
    $('signupPanel').hidden=!signup;
    $('authTitle').textContent=signup?'নতুন সদস্য অ্যাকাউন্ট':'সদস্য লগইন';
    $('authSubtitle').textContent=signup?'আপনার সদস্যের নাম নির্বাচন করে ঠিকানা, মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে সাইন আপ করুন। অ্যাডমিন অনুমোদনের পর হিসাব দেখা যাবে.':'আপনার সদস্যের নাম নির্বাচন করে পাসওয়ার্ড দিয়ে লগইন করুন।';
    $('authMsg').textContent='';
  }

  function setMemberMenu(open){
    const menu=$('memberMobileMenu'),overlay=$('memberMenuOverlay'),btn=$('memberMenuBtn');
    if(!menu||!overlay||!btn)return;
    menu.classList.toggle('open',open);overlay.classList.toggle('show',open);btn.setAttribute('aria-expanded',String(open));document.body.classList.toggle('menu-open',open);
  }
  function syncMemberMenu(which){
    const btn=$('memberMenuBtn');
    if(btn)btn.hidden=!(which==='dashboard'||which==='pending');
    if(which!=='dashboard'&&which!=='pending')setMemberMenu(false);
  }
  function showOnly(which){$('authCard').hidden=which!=='auth';$('pendingCard').hidden=which!=='pending';$('dashboard').hidden=which!=='dashboard';syncMemberMenu(which);}
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
function findMemberById(id){return mainData.members.find(m=>String(m.id)===String(id))||null;}
  function memberLabel(m,i){return `${Number(m.serial_no||i+1).toLocaleString('bn-BD')}. ${m.name}${m.mobile?' — '+m.mobile:''}`;}
  async function loadSelectableMembers(){
    if(!mainSb) return;
    const {data,error}=await mainSb.from('members').select('id,name,serial_no,mobile,status').eq('status','active').order('serial_no',{ascending:true,nullsFirst:false}).order('created_at');
    if(error){msg(error.message);return;}
    selectableMembers=data||[];
    ['loginMember','signupMember'].forEach(id=>{
      const el=$(id); if(!el)return;
      el.innerHTML='<option value="">-- সদস্যের নাম নির্বাচন করুন --</option>'+selectableMembers.map((m,i)=>`<option value="${esc(m.id)}">${esc(memberLabel(m,i))}</option>`).join('');
    });
  }
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
    currentMainMember=onlyMember?findMemberById(onlyMember):null;
    return currentMainMember;
  }
  async function signUp(e){
    e.preventDefault();
    const form=e.currentTarget;
    if(!sb){msg('সদস্য Login configuration পাওয়া যায়নি।');return;}
    const f=new FormData(form),memberId=String(f.get('member_id')||''),address=String(f.get('address')||'').trim(),mobile=normalizeMobile(f.get('mobile')),password=String(f.get('password')||'');
    const selected=findMemberById(memberId)||selectableMembers.find(m=>String(m.id)===memberId);
    if(!selected){msg('আগে তালিকা থেকে আপনার সদস্যের নাম নির্বাচন করুন।');return;}
    if(address.length<2){msg('সঠিক ঠিকানা দিন।');return}
    if(!validMobile(mobile)){msg('সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন।');return}
    if(password.length<6){msg('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');return}
    const authEmail=authEmailFromMemberId(memberId);
    msg('অ্যাকাউন্ট তৈরি হচ্ছে...',true);
    try{
      const {data,error}=await sb.auth.signUp({email:authEmail,password,options:{data:{full_name:selected.name,mobile:mobile||null,main_member_id:memberId,login_method:'member_name'}}});
      if(error) throw error;
      const uid=data.user?.id;if(!uid) throw new Error('অ্যাকাউন্ট তৈরি হয়েছে, কিন্তু ব্যবহারকারী আইডি পাওয়া যায়নি।');
      const {error:pe}=await sb.from('member_profiles').insert({id:uid,full_name:selected.name,address,mobile:mobile||null,status:'pending'});
      if(pe){await sb.auth.signOut();throw pe;}
      await sb.auth.signOut();form.reset();$('signupMember').value='';openAuthPanel('login');msg('অ্যাকাউন্ট তৈরি হয়েছে। অ্যাডমিন আপনার তথ্য যাচাই করে অনুমোদন করবেন। এরপর সদস্যের নাম ও পাসওয়ার্ড দিয়ে লগইন করতে পারবেন।',true);
    }catch(err){
      const raw=String(err?.message||'');
      if(/rate limit/i.test(raw)||/email rate limit/i.test(raw)){
        msg('Supabase-এ Email Confirmation এখনো চালু আছে। Member Supabase → Authentication → Providers → Email → Confirm email = OFF করুন। সদস্যের কাছে কোনো ইমেইল লাগবে না।');
      }else{
        msg(raw||'অ্যাকাউন্ট তৈরি করা যায়নি।');
      }
    }
  }
  async function signIn(e){
    e.preventDefault();
    if(!sb){msg('সদস্য Login configuration পাওয়া যায়নি।');return;}
    const f=new FormData(e.currentTarget),memberId=String(f.get('member_id')||''),password=String(f.get('password')||'');
    const selected=findMemberById(memberId)||selectableMembers.find(m=>String(m.id)===memberId);
    if(!selected){msg('আগে তালিকা থেকে আপনার সদস্যের নাম নির্বাচন করুন।');return}
    if(password.length<6){msg('সঠিক পাসওয়ার্ড দিন।');return}
    msg('লগইন হচ্ছে...',true);
    const {error}=await sb.auth.signInWithPassword({email:authEmailFromMemberId(memberId),password});
    if(error){msg('সদস্যের নাম অথবা পাসওয়ার্ড সঠিক নয়।');return}
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
      const {data:link,error:le}=await sb.from('member_account_links').select('main_member_id').eq('member_user_id',session.user.id).maybeSingle();
      if(le) throw le;
      if(!link?.main_member_id) throw new Error('আপনার অ্যাকাউন্টের সঙ্গে কোনো সদস্যের হিসাব এখনো যুক্ত করা হয়নি। অ্যাডমিনকে সদস্য যুক্ত করতে বলুন।');
      await loadMainData(link.main_member_id);
      if(!currentMainMember) throw new Error('অ্যাডমিন যে সদস্যের সঙ্গে অ্যাকাউন্ট যুক্ত করেছেন, সেই সদস্যটি মূল তালিকায় পাওয়া যায়নি।');
    }catch(err){msg(err.message||'হিসাব লোড করা যায়নি।');showOnly('auth');return}
    showOnly('dashboard');
    $('memberName').textContent=currentProfile.full_name;$('memberMobile').textContent=currentProfile.mobile||'—';
    $('memberProfile').innerHTML=`<div class="profile-item"><span>নাম</span><strong>${esc(currentProfile.full_name)}</strong></div><div class="profile-item"><span>ঠিকানা</span><strong>${esc(currentProfile.address)}</strong></div><div class="profile-item"><span>লগইন মোবাইল</span><strong>${esc(currentProfile.mobile)}</strong></div><div class="profile-item"><span>মূল সদস্য</span><strong>${esc(currentMainMember.name)}</strong></div>`;
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
  async function logout(){if(sb)await sb.auth.signOut();currentProfile=null;currentMainMember=null;showOnly('auth');showChooser();}
  async function adminLogin(e){
    e.preventDefault();
    const form=e.currentTarget;if(!sb){msg('Member Supabase configuration পাওয়া যায়নি।','adminMsg');return;}
    const f=new FormData(form),email=String(f.get('email')||'').trim(),password=String(f.get('password')||'');
    const {data,error}=await sb.auth.signInWithPassword({email,password});
    if(error){msg(error.message,false,'adminMsg');return}
    const {data:au,error:ae}=await sb.from('member_admins').select('user_id').eq('user_id',data.user.id).maybeSingle();
    if(ae||!au){await sb.auth.signOut();msg('এই অ্যাকাউন্টে অ্যাডমিন অনুমতি নেই।',false,'adminMsg');return}
    form.hidden=true;await loadPending();
  }
  async function loadPending(){
    const box=$('pendingMembers');box.hidden=false;const publicAll=await getVisibility();
    const controls=`<div class="visibility-controls"><div><b>সকল সদস্যের হিসাব:</b> <strong>${publicAll?'Public':'Hide'}</strong></div><div><button class="small-btn approve" onclick="window.memberSetPublic()">🟢 সকলের হিসাব Public</button> <button class="small-btn reject" onclick="window.memberSetHide()">🔴 সকলের হিসাব Hide</button></div></div>`;
    const {data:membersList,error:me}=await mainSb.from('members').select('id,name,serial_no,mobile,status').eq('status','active').order('serial_no',{ascending:true,nullsFirst:false}).order('created_at');
    if(me){msg(me.message,false,'adminMsg');return}
    const {data:pending,error}=await sb.from('member_profiles').select('id,full_name,address,mobile,created_at,status').eq('status','pending').order('created_at',{ascending:true});
    if(error){msg(error.message,false,'adminMsg');return}
    let rows='';
    for(const x of (pending||[])){
      const options=(membersList||[]).map((m,i)=>`<option value="${esc(m.id)}">${Number(m.serial_no||i+1).toLocaleString('bn-BD')}. ${esc(m.name)}${m.mobile?' — '+esc(m.mobile):''}</option>`).join('');
      rows+=`<tr><td>${esc(x.full_name)}</td><td>${esc(x.address)}</td><td>${esc(x.mobile||'')}</td><td><select id="link_${esc(x.id)}"><option value="">-- সদস্যের নাম নির্বাচন করুন --</option>${options}</select></td><td>${new Date(x.created_at).toLocaleDateString('bn-BD')}</td><td><button class="small-btn approve" onclick="window.memberApprove('${x.id}')">যুক্ত করুন ও অনুমোদন</button> <button class="small-btn reject" onclick="window.memberReject('${x.id}')">বাতিল</button></td></tr>`;
    }
    box.innerHTML=controls+`<div class="admin-link-box"><b>নতুন নিয়ম:</b> সদস্য সাইন আপের সময় মূল সদস্য তালিকা থেকে নিজের নাম নির্বাচন করবে। অ্যাডমিন তথ্য যাচাই করে একই সদস্যকে অ্যাকাউন্টের সঙ্গে যুক্ত করে অনুমোদন করবেন। লগইনের সময় সদস্যের নাম ও পাসওয়ার্ড ব্যবহার হবে।</div><table><thead><tr><th>সাইন আপ নাম</th><th>ঠিকানা</th><th>লগইন তথ্য</th><th>মূল সদস্য</th><th>তারিখ</th><th>অ্যাকশন</th></tr></thead><tbody>${rows||'<tr><td colspan="6">কোনো Pending account নেই</td></tr>'}</tbody></table>`;
    await loadLinkedMembers(membersList||[]);
  }
  async function loadLinkedMembers(membersList=[]){
    const box=$('linkedMembers'); if(!box)return; box.hidden=false;
    const {data:links,error}=await sb.from('member_account_links').select('member_user_id,main_member_id,updated_at');
    if(error){box.innerHTML='<div class="admin-link-box">Member account linking table এখনো সেটআপ করা হয়নি। ZIP-এর SQL সেটআপ ফাইল অনুযায়ী একবার সেটআপ করুন।</div>';return}
    const profiles={};
    const ids=(links||[]).map(x=>x.member_user_id);
    if(ids.length){const {data:ps}=await sb.from('member_profiles').select('id,full_name,mobile,status').in('id',ids);(ps||[]).forEach(x=>profiles[x.id]=x);}
    const rows=(links||[]).map((l,i)=>{const p=profiles[l.member_user_id]||{};const m=(membersList||[]).find(x=>String(x.id)===String(l.main_member_id))||{};return `<tr><td>${i+1}</td><td>${esc(p.full_name||'')}</td><td>${esc(p.mobile||'')}</td><td>${esc(m.name||'')}</td><td>${p.status==='approved'?'অনুমোদিত':esc(p.status||'')}</td></tr>`}).join('');
    box.innerHTML=`<h3>🔗 যুক্ত করা সদস্য অ্যাকাউন্ট</h3><table><thead><tr><th>ক্রম</th><th>অ্যাকাউন্ট নাম</th><th>লগইন তথ্য</th><th>মূল সদস্য</th><th>অবস্থা</th></tr></thead><tbody>${rows||'<tr><td colspan="5">এখনো কোনো অ্যাকাউন্ট যুক্ত করা হয়নি।</td></tr>'}</tbody></table>`;
  }
  async function setStatus(id,status){
    if(status==='approved'){
      const select=$(`link_${id}`); const mainMemberId=select?.value||'';
      if(!mainMemberId){msg('আগে মূল সদস্যের নাম নির্বাচন করুন।',false,'adminMsg');return}
      // The table has a unique constraint on main_member_id as well as member_user_id.
      // Check that the selected main member is not already linked to a different account;
      // otherwise PostgREST can reject an upsert on the second unique key.
      const {data:existingLink,error:checkLinkError}=await sb.from('member_account_links')
        .select('member_user_id,main_member_id')
        .eq('main_member_id',mainMemberId)
        .maybeSingle();
      if(checkLinkError){
        msg('সদস্য-অ্যাকাউন্ট সংযোগ যাচাই করা যায়নি: '+(checkLinkError.message||'ডাটাবেস অনুমতি/টেবিল পরীক্ষা করুন।'),false,'adminMsg');
        return;
      }
      if(existingLink && String(existingLink.member_user_id)!==String(id)){
        msg('এই মূল সদস্যের হিসাব ইতিমধ্যে অন্য একটি সদস্য অ্যাকাউন্টের সঙ্গে যুক্ত আছে। অন্য সদস্য নির্বাচন করুন।',false,'adminMsg');
        return;
      }
      const {error:le}=await sb.from('member_account_links').upsert(
        {member_user_id:id,main_member_id:mainMemberId,updated_at:new Date().toISOString()},
        {onConflict:'member_user_id'}
      );
      if(le){
        msg('সদস্য-অ্যাকাউন্ট সংযোগ সংরক্ষণ করা যায়নি: '+(le.message||'ডাটাবেসে সংরক্ষণ ব্যর্থ হয়েছে।'),false,'adminMsg');
        return;
      }
    }
    const {error}=await sb.from('member_profiles').update({status,approved_at:status==='approved'?new Date().toISOString():null}).eq('id',id).eq('status','pending');
    if(error){msg(error.message,false,'adminMsg');return}await loadPending();
  }
  window.memberApprove=id=>setStatus(id,'approved');window.memberReject=id=>setStatus(id,'rejected');
  $('memberMenuBtn').onclick=()=>setMemberMenu(true);
  $('memberMenuClose').onclick=()=>setMemberMenu(false);
  $('memberMenuOverlay').onclick=()=>setMemberMenu(false);
  document.querySelectorAll('#memberMobileMenu a').forEach(a=>a.addEventListener('click',()=>setMemberMenu(false)));
  $('memberMenuLogout').onclick=e=>{e.preventDefault();logout();};
  $('openMemberLogin').onclick=()=>openAuthPanel('login');
  $('openMemberSignup').onclick=()=>openAuthPanel('signup');
  $('loginBack').onclick=showChooser;
  $('signupBack').onclick=showChooser;
  $('loginToSignup').onclick=()=>openAuthPanel('signup');
  $('signupToLogin').onclick=()=>openAuthPanel('login');
  $('signupForm').onsubmit=signUp;$('loginForm').onsubmit=signIn;$('memberLogout').onclick=logout;$('pendingLogout').onclick=logout;$('adminLoginForm').onsubmit=adminLogin;$('footerYear').textContent=new Date().getFullYear();
  if(location.hash==='#admin')$('adminPanel').hidden=false; else $('adminPanel').hidden=true; showChooser();
  if(!sb||!mainSb){msg('প্রয়োজনীয় Supabase configuration পাওয়া যায়নি।',false);}else {loadSelectableMembers();loadSession();}
})();
