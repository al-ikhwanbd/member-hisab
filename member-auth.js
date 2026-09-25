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
  const sb=memberReady?window.supabase.createClient(window.MEMBER_SUPABASE_URL,window.MEMBER_SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  const mainSb=mainReady?window.supabase.createClient(window.MAIN_SUPABASE_URL,window.MAIN_SUPABASE_ANON_KEY):null;
  let currentProfile=null;
  let currentMainMember=null;
  let mainData={members:[],payments:[],profits:[],expenses:[],assets:[],notices:[]};
  const DEFAULT_MONTHLY_REQUIRED=500;
  let monthlyRequired=DEFAULT_MONTHLY_REQUIRED;
  let currentDividendPublic=false;

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
  function showOnly(which){$('authCard').hidden=which!=='auth';$('pendingCard').hidden=which!=='pending';$('dashboard').hidden=which!=='dashboard';if($('adminPanel'))$('adminPanel').hidden=true;syncMemberMenu(which);}
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
    // Main হিসাবের মতোই payments-এর সব row page করে নেওয়া হচ্ছে।
    // Supabase-এর default 1000-row limit-এর কারণে Member Dashboard-এ
    // পুরোনো/পরের payment বাদ পড়ে Main হিসাবের সঙ্গে mismatch হচ্ছিল।
    const fetchAllPayments=async()=>{
      const rows=[];
      const pageSize=1000;
      for(let from=0;;from+=pageSize){
        const {data,error}=await mainSb.from('payments').select('*').order('year').order('month').range(from,from+pageSize-1);
        if(error) return {data:null,error};
        rows.push(...(data||[]));
        if(!data || data.length<pageSize) break;
      }
      return {data:rows,error:null};
    };
    const [m,p,pr,e,a,n]=await Promise.all([
      mainSb.from('members').select('*').eq('status','active').order('serial_no',{ascending:true,nullsFirst:false}).order('created_at'),
      fetchAllPayments(),
      mainSb.from('profits').select('*').order('year'),
      mainSb.from('expenses').select('*').order('date',{ascending:false}),
      mainSb.from('assets').select('*').order('date',{ascending:false}),
      mainSb.from('notices').select('*').order('publish_date',{ascending:false})
    ]);
    const errors=[m,p,pr,e,a,n].filter(x=>x.error);
    if(errors.length) throw errors[0].error;
    mainData={members:m.data||[],payments:p.data||[],profits:pr.data||[],expenses:e.data||[],assets:a.data||[],notices:n.data||[]};
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
    if(error){await sb.auth.signOut();msg('সদস্য প্রোফাইল পাওয়া যায়নি।');showOnly('auth');return}
    if(!data){
      const {data:adminRow,error:adminError}=await sb.from('member_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
      if(!adminError&&adminRow){
        location.hash='#admin';
        $('authCard').hidden=true;$('pendingCard').hidden=true;$('dashboard').hidden=true;$('adminPanel').hidden=false;
        await showAdminAuthenticated();
        return;
      }
      await sb.auth.signOut();msg('সদস্য প্রোফাইল পাওয়া যায়নি।');showOnly('auth');return;
    }
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
  function memberMonthPaid(m,y,month){
    return mainData.payments.filter(p=>String(p.member_id)===String(m.id)&&Number(String(p.year))===Number(String(y))&&Number(p.month)===month).reduce((s,p)=>s+Number(p.paid_amount||0),0);
  }
  function memberPaid(m,year='all'){
    const target=year==='all'||!year?null:String(year);
    return mainData.payments.filter(p=>String(p.member_id)===String(m.id)&&(target===null||String(p.year)===target)).reduce((s,p)=>s+Number(p.paid_amount||0),0);
  }
  function memberRequired(year='all'){return (year==='all'?years().length:1)*monthlyRequired*12;}
  function memberDue(m,year='all'){return Math.max(memberRequired(year)-memberPaid(m,year),0);}
  function totalPaid(year='all'){
    const target=year==='all'||!year?null:String(year);
    return mainData.payments.filter(p=>target===null||String(p.year)===target).reduce((s,p)=>s+Number(p.paid_amount||0),0);
  }
  function totalDue(year='all'){
    return Math.max(mainData.members.length*memberRequired(year)-totalPaid(year),0);
  }
  function totalProfit(year='all'){
    const target=year==='all'||!year?null:Number(year);
    return mainData.profits.filter(p=>target===null||Number(p.year)===target).reduce((s,p)=>s+Number(p.total_profit||0),0);
  }
  function totalExpense(year='all'){
    const target=year==='all'||!year?null:Number(year);
    return mainData.expenses.filter(p=>target===null||Number(p.year)===target).reduce((s,p)=>s+Number(p.amount||0),0);
  }
  function totalAssets(year='all'){
    const target=year==='all'||!year?null:Number(year);
    return mainData.assets.filter(p=>target===null||Number(p.year)===target).reduce((s,p)=>s+Number(p.amount||0),0);
  }
  function remainingFund(){return totalPaid('all')+totalProfit('all')-totalExpense('all');}
  function remainingDividend(){return Math.max(totalProfit('all')-totalExpense('all'),0);}
  function memberDividend(m){
    const total=totalPaid('all'),remaining=remainingDividend();
    if(total<=0||remaining<=0)return 0;
    return remaining*(memberPaid(m,'all')/total);
  }
  async function getDividendPublic(memberId){
    if(!mainSb)return false;
    const {data,error}=await mainSb.from('member_dividend_visibility').select('is_public').eq('member_id',memberId).maybeSingle();
    return !error && !!data?.is_public;
  }
  function memberRows(list){
    return list.slice().sort((a,b)=>Number(a.serial_no||999999)-Number(b.serial_no||999999)).map((m,i)=>
      `<tr><td>${Number(m.serial_no||i+1).toLocaleString('bn-BD')}</td><td class="name">${esc(m.name)}</td><td>${money(memberPaid(m,'all'))}</td><td>${money(memberDue(m,'all'))}</td></tr>`).join('');
  }
  function fillMemberReportSelectors(){
    const ys=years();
    const yEl=$('personalYear'), allY=$('allMembersYear'), memEl=$('personalMember');
    if(yEl)yEl.innerHTML='<option value="">-- সাল নির্বাচন করুন --</option><option value="all">সকল বছর</option>'+ys.map(y=>`<option value="${esc(y)}">${esc(y)}</option>`).join('');
    if(allY)allY.innerHTML='<option value="">-- সাল নির্বাচন করুন --</option><option value="all">সকল বছর</option>'+ys.map(y=>`<option value="${esc(y)}">${esc(y)}</option>`).join('');
    if(memEl){
      // Member account keeps the same selection-box UI, but only the logged-in member is selectable.
      memEl.innerHTML=`<option value="${esc(currentMainMember.id)}">${esc(`${Number(currentMainMember.serial_no||'')||''}. ${currentMainMember.name}`.replace(/^\. /,''))}</option>`;
      memEl.value=String(currentMainMember.id);
    }
  }
  function currentMemberSummaryHtml(){
    if(!currentMainMember)return '';
    const paid=memberPaid(currentMainMember,'all');
    const due=memberDue(currentMainMember,'all');
    const dividend=currentDividendPublic?memberDividend(currentMainMember):null;
    const payable=paid+(dividend===null?0:dividend);
    const totalDeposit=totalPaid('all');
    const totalProfitAmount=totalProfit('all');
    const totalExpenseAmount=totalExpense('all');
    const remainingFundAmount=totalDeposit+totalProfitAmount-totalExpenseAmount;
    return `<div class="my-account-home">
      <div class="my-account-member-title">
        <h2>${esc(currentMainMember.name)}</h2>
        <p>সকল বছরের মোট হিসাব</p>
      </div>
      <div class="summary-grid member-home-summary-grid">
        <article><span>মোট পরিশোধ</span><strong>${money(paid)}</strong></article>
        <article><span>মোট বাকি</span><strong>${money(due)}</strong></article>
        <article><span>মোট লভ্যাংশ</span><strong>${dividend===null?'গোপন':money(dividend)}</strong></article>
        <article class="highlight"><span>সর্বমোট প্রাপ্য</span><strong>${money(payable)}</strong></article>
      </div>
      <div class="result-download"><button class="download-btn" type="button" onclick="downloadCurrentMemberAllYearsReport()">⬇️ বিস্তারিত হিসাব ডাউনলোড</button></div>
      <div class="my-account-org-title">
        <h2>সংস্থার মোট হিসাব</h2>
        <p>প্রতিষ্ঠার শুরু থেকে সকল বছরের সমন্বিত হিসাব</p>
      </div>
      <div class="summary-grid total-summary my-account-org-grid">
        <article><span>মোট জমা</span><strong>${money(totalDeposit)}</strong></article>
        <article><span>মোট লভ্যাংশ</span><strong>${money(totalProfitAmount)}</strong></article>
        <article><span>মোট বিবিধ খরচ</span><strong>${money(totalExpenseAmount)}</strong></article>
        <article class="highlight"><span>অবশিষ্ট তহবিল</span><strong>${money(remainingFundAmount)}</strong></article>
      </div>
    </div>`;
  }
  function renderMyAccount(){
    const result=$('myAccountResult');
    if(!result||!currentMainMember)return;
    result.innerHTML=currentMemberSummaryHtml();
  }
  function downloadHtmlFile(filename,html){
    const blob=new Blob([html],{type:'text/html;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=filename;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function reportShell(title,subtitle,body,landscape=false){
    return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>*{box-sizing:border-box}body{font-family:Arial,"Noto Sans Bengali",sans-serif;margin:0;padding:20px;color:#26352f;background:#fff}.report{max-width:${landscape?'1200px':'900px'};margin:auto}.head{text-align:center;border-bottom:2px solid #087f4e;padding-bottom:12px;margin-bottom:18px}.head h1{margin:0;color:#087f4e;font-size:24px}.head p{margin:5px 0;color:#5e6e68}.table-wrap{width:100%;overflow:auto}table{width:100%;border-collapse:collapse}th,td{border:1px solid #c9d6d1;padding:7px 6px;text-align:center;white-space:nowrap;font-size:12px}th{background:#e7f3ed;color:#087f4e;font-weight:800}td.name,th.name{text-align:left}.total-row td{font-weight:800;background:#f0f7f3}.summary{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:16px 0}.summary div{border:1px solid #dce6e1;border-radius:10px;padding:10px;text-align:center}.summary strong{display:block;color:#087f4e;font-size:18px;margin-top:4px}@media print{@page{margin:10mm;size:${landscape?'landscape':'portrait'}}.table-wrap{overflow:visible}table{width:100%}}@media(max-width:600px){body{padding:10px}th,td{font-size:10px;padding:5px 4px}}</style></head><body><div class="report"><div class="head"><h1>আল ইখওয়ান ইসলামী সংস্থা বাংলাদেশ</h1><p>${esc(title)}</p><small>${esc(subtitle)}</small></div>${body}</div></body></html>`;
  }
  function downloadPersonalReport(){
    const y=$('personalYear')?.value||'all',id=$('personalMember')?.value;
    const m=findMemberById(id);if(!m||!y){msg('আগে সাল ও সদস্য নির্বাচন করে অনুসন্ধান করুন।');return;}
    const detailYears=y==='all'?years():[String(y)];
    const rows=detailYears.flatMap(yr=>months.map((monthName,idx)=>{const paid=memberMonthPaid(m,yr,idx+1),d=Math.max(monthlyRequired-paid,0);return `<tr><td>${esc(yr)}</td><td>${monthName}</td><td>${money(paid)}</td><td>${money(d)}</td></tr>`;})).join('');
    const summary=`<div class="summary"><div>মোট পরিশোধ<strong>${money(memberPaid(m,y))}</strong></div><div>মোট বাকি<strong>${money(memberDue(m,y))}</strong></div></div>`;
    const body=`<h2>${esc(m.name)}</h2>${summary}<div class="table-wrap"><table><thead><tr><th>সাল</th><th>মাস</th><th>পরিশোধ</th><th>বাকি</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    downloadHtmlFile(`personal-${String(y).replace(/[^0-9a-zA-Z_-]/g,'')}-${String(m.name).replace(/[^\u0980-\u09FFa-zA-Z0-9_-]+/g,'-')}.html`,reportShell(`${m.name} - ব্যক্তিগত হিসাব`,y==='all'?'সকল বছরের বিস্তারিত হিসাব':`${y} সালের বিস্তারিত হিসাব`,body,false));
  }
  function downloadAllMembersReport(){
    const y=$('allMembersYear')?.value||'all';if(!y){msg('আগে একটি বছর নির্বাচন করে হিসাব দেখুন।');return;}
    if(y==='all'){
      const ys=years();
      const rows=mainData.members.map((m,i)=>`<tr><td>${Number(m.serial_no||i+1).toLocaleString('bn-BD')}</td><td class="name">${esc(m.name)}</td>${ys.map(v=>`<td>${memberPaid(m,v)>0?Number(memberPaid(m,v)).toLocaleString('bn-BD'):''}</td>`).join('')}<td>${Number(memberPaid(m,'all')).toLocaleString('bn-BD')}</td><td>${Number(memberDue(m,'all')).toLocaleString('bn-BD')}</td></tr>`).join('');
      const totals=ys.map(v=>`<td>${Number(totalPaid(v)).toLocaleString('bn-BD')}</td>`).join('');
      const body=`<div class="table-wrap"><table><thead><tr><th>ক্রমিক</th><th class="name">সদস্যের নাম</th>${ys.map(v=>`<th>${esc(v)}</th>`).join('')}<th>মোট পরিশোধ</th><th>মোট বাকি</th></tr></thead><tbody>${rows}</tbody><tfoot><tr class="total-row"><td colspan="2">সর্বমোট</td>${totals}<td>${Number(totalPaid('all')).toLocaleString('bn-BD')}</td><td>${Number(totalDue('all')).toLocaleString('bn-BD')}</td></tr></tfoot></table></div>`;
      downloadHtmlFile('all-members-all-years.html',reportShell('সকল বছরের সকল সদস্যদের হিসাব','সকল বছরের বিস্তারিত হিসাব',body,true));return;
    }
    const rows=mainData.members.map((m,i)=>`<tr><td>${Number(m.serial_no||i+1).toLocaleString('bn-BD')}</td><td class="name">${esc(m.name)}</td>${months.map((_,mi)=>{const p=memberMonthPaid(m,y,mi+1);return `<td>${p>0?Number(p).toLocaleString('bn-BD'):''}</td>`}).join('')}<td>${Number(memberPaid(m,y)).toLocaleString('bn-BD')}</td><td>${Number(memberDue(m,y)).toLocaleString('bn-BD')}</td></tr>`).join('');
    const monthTotals=months.map((_,mi)=>mainData.payments.filter(p=>isCountablePayment(p)&&String(p.year)===String(y)&&Number(p.month)===mi+1).reduce((s,p)=>s+Number(p.paid_amount||0),0)).map(x=>`<td>${x>0?Number(x).toLocaleString('bn-BD'):''}</td>`).join('');
    const body=`<div class="table-wrap"><table><thead><tr><th>ক্রমিক</th><th class="name">সদস্যের নাম</th>${months.map(m=>`<th>${m}</th>`).join('')}<th>মোট পরিশোধ</th><th>মোট বাকি</th></tr></thead><tbody>${rows}</tbody><tfoot><tr class="total-row"><td colspan="2">সর্বমোট</td>${monthTotals}<td>${Number(totalPaid(y)).toLocaleString('bn-BD')}</td><td>${Number(totalDue(y)).toLocaleString('bn-BD')}</td></tr></tfoot></table></div>`;
    downloadHtmlFile(`all-members-${y}.html`,reportShell(`${y} সালের সকল সদস্যদের হিসাব`,'প্রতি মাসে শুধু পরিশোধের পরিমাণ দেখানো হয়েছে',body,true));
  }

  function renderMemberHomeSummary(){
    const result=$('memberHomeSummary');
    if(!result||!currentMainMember)return;
    result.innerHTML=currentMemberSummaryHtml();
  }
  function downloadCurrentMemberAllYearsReport(){
    if(!currentMainMember)return;
    const y=$('personalYear'),id=$('personalMember');
    if(y)y.value='all';
    if(id)id.value=String(currentMainMember.id);
    downloadPersonalReport();
  }

  function renderPersonal(){
    const y=$('personalYear')?.value,id=$('personalMember')?.value;
    if(!$('personalResult'))return;
    $('personalMessage').className='message hidden';
    if(!y||!id){$('personalMessage').textContent='সাল ও সদস্য নির্বাচন করুন।';$('personalMessage').className='message error';return;}
    const m=findMemberById(id);if(!m)return;
    const label=y==='all'?'সকল বছরের মোট হিসাব':`${esc(y)} সালের হিসাব`;
    const detailYears=y==='all'?years():[String(y)];
    const detailRows=detailYears.flatMap(yr=>months.map((monthName,idx)=>{const paid=memberMonthPaid(m,yr,idx+1),d=Math.max(monthlyRequired-paid,0);return `<tr><td>${esc(yr)}</td><td>${monthName}</td><td>${paid>0?money(paid):'৳ ০'}</td><td>${money(d)}</td></tr>`;})).join('');
    const allYearsSummary=y==='all'?`<div class="detail-block member-total-detail"><div class="detail-heading"><span>📊</span><h3>সকল বছরের মোট হিসাব</h3></div><div class="summary-grid personal-total-summary"><article><span>মোট পরিশোধ</span><strong>${money(memberPaid(m,'all'))}</strong></article><article><span>মোট বাকি</span><strong>${money(memberDue(m,'all'))}</strong></article></div></div>`:`<div class="member-summary compact-summary"><div>মোট পরিশোধ<strong>${money(memberPaid(m,y))}</strong></div><div>মোট বাকি<strong>${money(memberDue(m,y))}</strong></div></div>`;
    $('personalResult').innerHTML=`<div class="report-title"><h3>${esc(m.name)}</h3><p>${label}</p></div><div class="print-only personal-print-details"><h4>মাসভিত্তিক বিস্তারিত হিসাব</h4><div class="table-wrap"><table><thead><tr><th>সাল</th><th>মাস</th><th>পরিশোধ</th><th>বাকি</th></tr></thead><tbody>${detailRows}</tbody></table></div></div>${allYearsSummary}<div class="result-download"><button class="download-btn" type="button" onclick="downloadPersonalReport()">⬇️ বিস্তারিত হিসাব ডাউনলোড</button></div>`;
    $('personalResult').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderAllMembers(){
    const y=$('allMembersYear')?.value||'all';
    if(!$('allMembersResult'))return;
    if(!y){$('allMembersResult').innerHTML='<div class="empty-state">একটি বছর নির্বাচন করে হিসাব দেখুন।</div>';return;}
    if(y==='all'){
      const ys=years();
      const rows=mainData.members.map((m,i)=>`<tr><td>${Number(m.serial_no||i+1).toLocaleString('bn-BD')}</td><td class="name nowrap">${esc(m.name)}</td>${ys.map(v=>`<td>${memberPaid(m,v)>0?Number(memberPaid(m,v)).toLocaleString('bn-BD'):''}</td>`).join('')}<td>${Number(memberPaid(m,'all')).toLocaleString('bn-BD')}</td><td>${Number(memberDue(m,'all')).toLocaleString('bn-BD')}</td></tr>`).join('');
      $('allMembersResult').innerHTML=`<div class="report-title"><h3>সকল বছরের সকল সদস্যদের হিসাব</h3><p>যে মাসে টাকা দেওয়া হয়েছে শুধু সেই টাকাই দেখানো হয়েছে</p></div><div class="table-wrap"><table class="member-report-table"><thead><tr><th>ক্রমিক</th><th class="name">সদস্যের নাম</th>${ys.map(v=>`<th>${esc(v)}</th>`).join('')}<th>মোট পরিশোধ</th><th>মোট বাকি</th></tr></thead><tbody>${rows}</tbody><tfoot><tr class="total-row"><td colspan="2">সর্বমোট</td>${ys.map(v=>`<td>${totalPaid(v)>0?Number(totalPaid(v)).toLocaleString('bn-BD'):''}</td>`).join('')}<td>${Number(totalPaid('all')).toLocaleString('bn-BD')}</td><td>${Number(totalDue('all')).toLocaleString('bn-BD')}</td></tr></tfoot></table></div><div class="member-summary"><div>সকল বছরের মোট পরিশোধ<strong>${money(totalPaid('all'))}</strong></div><div>সকল বছরের মোট বাকি<strong>${money(totalDue('all'))}</strong></div></div><div class="result-download"><button class="download-btn" type="button" onclick="downloadAllMembersReport()">⬇️ বিস্তারিত হিসাব ডাউনলোড</button></div>`;
      return;
    }
    const rows=mainData.members.map((m,i)=>`<tr><td>${Number(m.serial_no||i+1).toLocaleString('bn-BD')}</td><td class="name nowrap">${esc(m.name)}</td>${months.map((_,mi)=>{const p=memberMonthPaid(m,y,mi+1);return `<td>${p>0?Number(p).toLocaleString('bn-BD'):''}</td>`}).join('')}<td>${Number(memberPaid(m,y)).toLocaleString('bn-BD')}</td><td>${Number(memberDue(m,y)).toLocaleString('bn-BD')}</td></tr>`).join('');
    const monthTotals=months.map((_,mi)=>mainData.payments.filter(p=>isCountablePayment(p)&&String(p.year)===String(y)&&Number(p.month)===mi+1).reduce((s,p)=>s+Number(p.paid_amount||0),0)).map(x=>`<td>${x>0?Number(x).toLocaleString('bn-BD'):''}</td>`).join('');
    $('allMembersResult').innerHTML=`<div class="report-title"><h3>${esc(y)} সালের সকল সদস্যদের হিসাব</h3><p>প্রতি মাসে শুধু পরিশোধের পরিমাণ দেখানো হয়েছে</p></div><div class="table-wrap"><table class="member-report-table"><thead><tr><th>ক্রমিক</th><th class="name">সদস্যের নাম</th>${months.map(m=>`<th>${m}</th>`).join('')}<th>মোট পরিশোধ</th><th>মোট বাকি</th></tr></thead><tbody>${rows}</tbody><tfoot><tr class="total-row"><td colspan="2">সর্বমোট</td>${monthTotals}<td>${Number(totalPaid(y)).toLocaleString('bn-BD')}</td><td>${Number(totalDue(y)).toLocaleString('bn-BD')}</td></tr></tfoot></table></div><div class="member-summary"><div>মোট পরিশোধ<strong>${money(totalPaid(y))}</strong></div><div>মোট বাকি<strong>${money(totalDue(y))}</strong></div></div><div class="result-download"><button class="download-btn" type="button" onclick="downloadAllMembersReport()">⬇️ বিস্তারিত হিসাব ডাউনলোড</button></div>`;
  }
  function renderTotal(){
    const deposit=totalPaid('all'),profit=totalProfit('all'),expense=totalExpense('all');
    $('totalResult').innerHTML=`<div class="report-title"><h3>সংস্থার মোট হিসাব</h3><p>প্রতিষ্ঠার শুরু থেকে সকল বছরের সমন্বিত হিসাব</p></div><div class="summary-grid total-summary"><article><span>মোট জমা</span><strong>${money(deposit)}</strong></article><article><span>মোট লভ্যাংশ</span><strong>${money(profit)}</strong></article><article><span>মোট বিবিধ খরচ</span><strong>${money(expense)}</strong></article><article class="highlight"><span>অবশিষ্ট তহবিল</span><strong>${money(deposit+profit-expense)}</strong></article></div>`;
  }
  function renderProfitExpenseDetails(){
    const profitRows=mainData.profits.slice().sort((a,b)=>Number(a.year)-Number(b.year)).map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.year)}</td><td class="detail-text">${esc(x.description||'-')}</td><td>${money(x.total_profit)}</td></tr>`).join('');
    const expenseRows=mainData.expenses.slice().sort((a,b)=>Number(a.year||0)-Number(b.year||0)).map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.year)}</td><td class="detail-text">${esc(x.description||'-')}</td><td>${money(x.amount)}</td></tr>`).join('');
    $('profitExpenseDetailsResult').innerHTML=`<div class="detail-block profit-detail"><div class="detail-heading"><span>📈</span><h3>লভ্যাংশের বিস্তারিত বিবরণ</h3></div><div class="table-wrap"><table class="detail-table"><thead><tr><th>ক্রমিক</th><th>সাল</th><th class="detail-text">বিবরণ</th><th>পরিমাণ</th></tr></thead><tbody>${profitRows||'<tr><td colspan="4">কোনো লভ্যাংশের তথ্য নেই।</td></tr>'}</tbody><tfoot><tr class="total-row"><td colspan="3">মোট লভ্যাংশ</td><td>${money(totalProfit('all'))}</td></tr></tfoot></table></div></div>
      <div class="detail-block expense-detail"><div class="detail-heading"><span>🧾</span><h3>খরচের বিস্তারিত বিবরণ</h3></div><div class="table-wrap"><table class="detail-table"><thead><tr><th>ক্রমিক</th><th>সাল</th><th class="detail-text">বিবরণ</th><th>পরিমাণ</th></tr></thead><tbody>${expenseRows||'<tr><td colspan="4">কোনো খরচের তথ্য নেই।</td></tr>'}</tbody><tfoot><tr class="total-row"><td colspan="3">মোট খরচ</td><td>${money(totalExpense('all'))}</td></tr></tfoot></table></div></div>
      <div class="detail-block dividend-summary-detail"><div class="detail-heading"><span>💰</span><h3>লভ্যাংশের সংক্ষিপ্ত হিসাব</h3></div><div class="table-wrap"><table class="detail-table fund-summary-table"><tbody><tr><th>মোট লভ্যাংশ</th><td>${money(totalProfit('all'))}</td></tr><tr><th>মোট খরচ</th><td>${money(totalExpense('all'))}</td></tr><tr class="highlight-row"><th>অবশিষ্ট লভ্যাংশ</th><td><b>${money(remainingDividend())}</b></td></tr></tbody></table></div></div>`;
  }
  function renderFund(){
    const body=mainData.assets.map((a,i)=>`<tr><td>${i+1}</td><td>${esc(a.year)}</td><td>${esc(a.category)}</td><td class="detail-text">${esc(a.description)}</td><td>${money(a.amount)}</td><td>${esc(a.date||'')}</td></tr>`).join('');
    $('fundResult').innerHTML=`<div class="report-title"><h3>তহবিল ব্যবহারের খাতসমূহ</h3><p>যে সকল খাতে তহবিল ব্যবহার করা হয়েছে</p></div><div class="detail-block fund-detail"><div class="detail-heading"><span>🏦</span><h3>তহবিল ব্যবহারের খাতসমূহ</h3></div><div class="table-wrap"><table class="detail-table"><thead><tr><th>ক্রমিক</th><th>সাল</th><th>খাত</th><th class="detail-text">বিস্তারিত</th><th>পরিমাণ</th><th>তারিখ</th></tr></thead><tbody>${body||'<tr><td colspan="6">এখনও কোনো খাত যোগ করা হয়নি।</td></tr>'}</tbody><tfoot><tr class="total-row"><td colspan="4">বিভিন্ন খাতে ব্যবহার করা মোট</td><td>${money(totalAssets('all'))}</td><td></td></tr></tfoot></table></div></div><div class="detail-block fund-summary-detail"><div class="detail-heading"><span>💰</span><h3>তহবিলের সংক্ষিপ্ত হিসাব</h3></div><div class="table-wrap"><table class="detail-table fund-summary-table"><tbody><tr><th>মোট অবশিষ্ট তহবিল</th><td>${money(remainingFund())}</td></tr><tr><th>বিভিন্ন খাতে ব্যবহার</th><td>${money(totalAssets('all'))}</td></tr><tr class="highlight-row"><th>বর্তমান অবশিষ্ট তহবিল</th><td><b>${money(remainingFund())}</b></td></tr></tbody></table></div></div>`;
  }
  function renderNotices(){
    const html=mainData.notices.map(n=>`<article class="notice"><h3>${esc(n.title)}</h3><p>${esc(n.description)}</p><small>${esc(n.publish_date||'')}</small></article>`).join('');
    $('noticeResult').innerHTML=html||'<div class="empty-state">কোনো প্রকাশিত নোটিশ নেই।</div>';
  }
  function showMemberView(view){
    document.querySelectorAll('.member-view').forEach(s=>s.classList.toggle('active',s.id===view));
    document.querySelectorAll('#memberMobileMenu a[data-member-view]').forEach(a=>a.classList.toggle('active',a.dataset.memberView===view));
    setMemberMenu(false);
    if(location.hash!=='#'+view) history.replaceState(null,'','#'+view);
  }
  async function loadDashboard(){
    fillMemberReportSelectors();
    renderTotal();
    renderProfitExpenseDetails();
    renderFund();
    renderNotices();
    const publicAll=await getVisibility();
    const oldSummary=$('personalSummary'); if(oldSummary) oldSummary.innerHTML='';
    const oldAll=$('allMembersSection'); if(oldAll) oldAll.remove();
    // All members visibility follows the existing Public/Hide setting.
    const allSection=$('members');
    allSection.dataset.public=String(publicAll);
    // Keep the section visible; if hidden by admin, explain the existing setting.
    if(!publicAll){
      const result=$('allMembersResult');
      result.innerHTML='<div class="empty-state">সকল সদস্যদের হিসাব বর্তমানে Public করা হয়নি।</div>';
    }
    currentDividendPublic=await getDividendPublic(currentMainMember.id);
    const y=$('personalYear'); if(y)y.value='all';
    const pm=$('personalMember'); if(pm)pm.value=String(currentMainMember.id);
    renderMyAccount();
    renderMemberHomeSummary();
    renderPersonal();
    const hash=location.hash.replace('#','');
    showMemberView(['myAccount','personal','members','due','profitExpenseDetails','fund','notices'].includes(hash)?hash:'myAccount');
  }
  async function logout(){if(sb)await sb.auth.signOut();currentProfile=null;currentMainMember=null;showOnly('auth');showChooser();}
  async function isCurrentUserAdmin(){
    if(!sb)return false;
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.user)return false;
    const {data,error}=await sb.from('member_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
    return !error && !!data;
  }
  async function showAdminAuthenticated(){
    const form=$('adminLoginForm');
    if(form)form.hidden=true;
    await loadPending();
  }
  async function loadAdminSession(){
    if(!sb)return;
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.user)return;
    if(await isCurrentUserAdmin())await showAdminAuthenticated();
  }
  async function adminLogin(e){
    e.preventDefault();
    const form=e.currentTarget;if(!sb){msg('Member Supabase configuration পাওয়া যায়নি।','adminMsg');return;}
    const f=new FormData(form),email=String(f.get('email')||'').trim(),password=String(f.get('password')||'');
    const {data,error}=await sb.auth.signInWithPassword({email,password});
    if(error){msg(error.message,false,'adminMsg');return}
    const {data:au,error:ae}=await sb.from('member_admins').select('user_id').eq('user_id',data.user.id).maybeSingle();
    if(ae||!au){await sb.auth.signOut();msg('এই অ্যাকাউন্টে অ্যাডমিন অনুমতি নেই।',false,'adminMsg');return}
    await showAdminAuthenticated();
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
    const rows=(links||[]).map((l,i)=>{const p=profiles[l.member_user_id]||{};const m=(membersList||[]).find(x=>String(x.id)===String(l.main_member_id))||{};return `<tr><td>${i+1}</td><td>${esc(p.full_name||'')}</td><td>${esc(p.mobile||'')}</td><td>${esc(m.name||'')}</td><td>${p.status==='approved'?'অনুমোদিত':esc(p.status||'')}</td><td><button class="small-btn approve" type="button" onclick="window.memberResetPassword('${esc(l.member_user_id)}','${esc(p.full_name||'সদস্য')}')">🔑 নতুন পাসওয়ার্ড সেট</button></td></tr>`}).join('');
    box.innerHTML=`<h3>🔗 যুক্ত করা সদস্য অ্যাকাউন্ট</h3><div class="admin-link-box">🔐 কোনো সদস্য পাসওয়ার্ড ভুলে গেলে এখানে তার জন্য নতুন পাসওয়ার্ড সেট করতে পারবেন। পুরোনো পাসওয়ার্ড অ্যাডমিনকে দেখানো হয় না।</div><table><thead><tr><th>ক্রম</th><th>অ্যাকাউন্ট নাম</th><th>লগইন তথ্য</th><th>মূল সদস্য</th><th>অবস্থা</th><th>পাসওয়ার্ড</th></tr></thead><tbody>${rows||'<tr><td colspan="6">এখনো কোনো অ্যাকাউন্ট যুক্ত করা হয়নি।</td></tr>'}</tbody></table>`;
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
  async function adminResetMemberPassword(userId,memberName){
    if(!sb)return;
    const sessionResult=await sb.auth.getSession();
    const session=sessionResult?.data?.session;
    if(!session?.access_token){msg('অ্যাডমিন সেশন পাওয়া যায়নি। আবার অ্যাডমিন লগইন করুন।',false,'adminMsg');return}
    const first=prompt(`${memberName||'সদস্য'}-এর জন্য নতুন পাসওয়ার্ড দিন (কমপক্ষে ৬ অক্ষর):`,'');
    if(first===null)return;
    const password=String(first);
    if(password.length<6){msg('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।',false,'adminMsg');return}
    const second=prompt('নতুন পাসওয়ার্ডটি আবার লিখুন:', '');
    if(second===null)return;
    if(password!==String(second)){msg('দুইবার দেওয়া পাসওয়ার্ড এক নয়।',false,'adminMsg');return}
    try{
      const fnUrl=`${window.MEMBER_SUPABASE_URL}/functions/v1/admin-reset-member-password`;
      const res=await fetch(fnUrl,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({member_user_id:userId,new_password:password})});
      const body=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(body.error||body.message||'পাসওয়ার্ড পরিবর্তন করা যায়নি।');
      msg('সদস্যের নতুন পাসওয়ার্ড সফলভাবে সেট করা হয়েছে।',true,'adminMsg');
    }catch(err){msg(`পাসওয়ার্ড সেট করা যায়নি: ${err.message||'সার্ভার/সেটআপ পরীক্ষা করুন।'}`,false,'adminMsg')}
  }
  window.memberApprove=id=>setStatus(id,'approved');window.memberReject=id=>setStatus(id,'rejected');
  window.memberResetPassword=adminResetMemberPassword;
  $('memberMenuBtn').onclick=()=>setMemberMenu(true);
  $('memberMenuClose').onclick=()=>setMemberMenu(false);
  $('memberMenuOverlay').onclick=()=>setMemberMenu(false);
  document.querySelectorAll('#memberMobileMenu a').forEach(a=>a.addEventListener('click',()=>setMemberMenu(false)));
  window.downloadPersonalReport=downloadPersonalReport;window.downloadAllMembersReport=downloadAllMembersReport;window.downloadCurrentMemberAllYearsReport=downloadCurrentMemberAllYearsReport;
  $('memberMenuLogout').onclick=e=>{e.preventDefault();logout();};
  document.querySelectorAll('#memberMobileMenu a[data-member-view]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();showMemberView(a.dataset.memberView);}));
  window.addEventListener('hashchange',()=>{const v=location.hash.replace('#','');if(['myAccount','personal','members','due','profitExpenseDetails','fund','notices'].includes(v)&&!$('dashboard').hidden)showMemberView(v);});
  $('personalForm').onsubmit=e=>{e.preventDefault();renderPersonal();};
  $('membersForm').onsubmit=e=>{e.preventDefault();renderAllMembers();};
  $('openMemberLogin').onclick=()=>openAuthPanel('login');
  $('openMemberSignup').onclick=()=>openAuthPanel('signup');
  $('loginBack').onclick=showChooser;
  $('signupBack').onclick=showChooser;
  $('loginToSignup').onclick=()=>openAuthPanel('signup');
  $('signupToLogin').onclick=()=>openAuthPanel('login');
  $('signupForm').onsubmit=signUp;$('loginForm').onsubmit=signIn;$('memberLogout').onclick=logout;$('pendingLogout').onclick=logout;$('adminLoginForm').onsubmit=adminLogin;$('footerYear').textContent=new Date().getFullYear();
  document.querySelectorAll('[data-password-toggle]').forEach(btn=>btn.addEventListener('click',()=>{
    const input=btn.parentElement?.querySelector('input');
    if(!input)return;
    const showing=input.type==='text';
    input.type=showing?'password':'text';
    btn.textContent=showing?'👁️':'🙈';
    btn.setAttribute('aria-label',showing?'পাসওয়ার্ড দেখুন':'পাসওয়ার্ড লুকান');
  }));
  const isAdminRoute=location.hash==='#admin';
  if(isAdminRoute){
    $('authCard').hidden=true;$('pendingCard').hidden=true;$('dashboard').hidden=true;$('adminPanel').hidden=false;
  }else{
    $('adminPanel').hidden=true;
    showChooser();
  }
  if(!sb||!mainSb){msg('প্রয়োজনীয় Supabase configuration পাওয়া যায়নি।',false);}else if(!isAdminRoute){loadSelectableMembers();loadSession();}else{loadSelectableMembers();loadAdminSession();}

})();
