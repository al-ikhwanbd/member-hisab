/* Shared website settings loader. Public settings are read-only for visitors. */
(function(){
  const DEFAULTS={
    site_name:'আল ইখওয়ান ইসলামী সংস্থা বাংলাদেশ',
    site_tagline:'সংস্থার হিসাব অনলাইনে দেখুন',
    hero_title:'আল ইখওয়ান ইসলামী সংস্থা বাংলাদেশ',
    hero_subtitle:'বানিপুর, কেন্দুয়া, নেত্রকোনা, মোমেনশাহী, ঢাকা',
    address:'বানিপুর, কেন্দুয়া, নেত্রকোনা, মোমেনশাহী, ঢাকা',
    phone:'', email:'', facebook_url:'', website_url:'',
    logo_url:'Al ikhwan logo.jpg', favicon_url:'icon-192.png', hero_image_url:'',
    primary_color:'#087f4e', secondary_color:'#0f6b4a', accent_color:'#f0b429',
    background_color:'#f4f8f6', card_color:'#ffffff', text_color:'#17322a',
    footer_text:'আল ইখওয়ান ইসলামী সংস্থা বাংলাদেশ', footer_subtext:'সকল অধিকার সংরক্ষিত',
    member_footer_subtext:'সদস্য অ্যাকাউন্ট', menu_title:'মেইন মেনু',
    menu_personal:'সদস্যদের ব্যক্তিগত হিসাব', menu_members:'সকল সদস্যদের হিসাব',
    menu_due:'সংস্থার মোট হিসাব', menu_profit:'লভ্যাংশ ও খরচের বিবরণ',
    menu_fund:'অবশিষ্ট তহবিলের খাত', menu_notices:'নোটিশ',
    meta_description:'আল ইখওয়ান ইসলামী সংস্থা বাংলাদেশের হিসাব দেখুন'
  };
  const DEFAULT_UI_SETTINGS={
    colors:{header:DEFAULTS.primary_color,footer:'#076f45',button:DEFAULTS.primary_color,loading:'#ffffff'},
    menu:[
      {id:'personal',icon:'👤',label:DEFAULTS.menu_personal,enabled:true},
      {id:'members',icon:'👥',label:DEFAULTS.menu_members,enabled:true},
      {id:'due',icon:'📊',label:DEFAULTS.menu_due,enabled:true},
      {id:'profitExpenseDetails',icon:'📋',label:DEFAULTS.menu_profit,enabled:true},
      {id:'fund',icon:'💰',label:DEFAULTS.menu_fund,enabled:true},
      {id:'notices',icon:'📢',label:DEFAULTS.menu_notices,enabled:true},
      {id:'admin',icon:'🔐',label:'এডমিন প্যানেল',enabled:true}
    ],
    admin_submenu:[
      {id:'memberApproval',icon:'📝',label:'নতুন সদস্য অনুমোদন',enabled:true},
      {id:'memberLogin',icon:'🧑‍💻',label:'মেম্বার লগইন / অ্যাকাউন্ট',enabled:true}
    ],
    add_options:[
      {id:'member',label:'নতুন সদস্য',enabled:true},
      {id:'payment',label:'মাসিক জমা',enabled:true},
      {id:'profit',label:'লভ্যাংশ',enabled:true},
      {id:'expense',label:'বিবিধ খরচ',enabled:true},
      {id:'asset',label:'অবশিষ্ট তহবিলের খাত',enabled:true},
      {id:'notice',label:'নোটিশ',enabled:true}
    ],
    manage_options:[
      {id:'members',label:'সদস্য ব্যবস্থাপনা',enabled:true},
      {id:'payments',label:'জমা ব্যবস্থাপনা',enabled:true},
      {id:'profits',label:'লভ্যাংশ ব্যবস্থাপনা',enabled:true},
      {id:'dividendVisibility',label:'সদস্যদের লভ্যাংশ Public/Hide',enabled:true},
      {id:'expenses',label:'খরচ ব্যবস্থাপনা',enabled:true},
      {id:'assets',label:'অবশিষ্ট তহবিলের খাত ব্যবস্থাপনা',enabled:true},
      {id:'notices',label:'নোটিশ ব্যবস্থাপনা',enabled:true},
      {id:'websiteSettings',label:'⚙️ ওয়েবসাইট সেটিংস',enabled:true}
    ]
    ,member_account:{
      chooser:{title:'সদস্য অ্যাকাউন্ট',subtitle:'লগইন করতে বা নতুন অ্যাকাউন্ট তৈরি করতে একটি অপশন বেছে নিন।',login_button:'সদস্য লগইন',login_button_icon:'🔐',signup_button:'📝 নতুন সদস্য সাইন আপ'},
      login:{title:'সদস্য লগইন',subtitle:'আপনার সদস্যের নাম নির্বাচন করে পাসওয়ার্ড দিয়ে লগইন করুন।',member_label:'সদস্যের নাম',member_placeholder:'-- সদস্যের নাম নির্বাচন করুন --',password_label:'পাসওয়ার্ড',password_placeholder:'পাসওয়ার্ড',submit:'সদস্য লগইন',submit_icon:'🔐',password_show_icon:'👁️',password_hide_icon:'🙈',back:'← আগের পেজে ফিরে যান',signup_link:'📝 নতুন অ্যাকাউন্ট তৈরি করুন'},
      signup:{title:'নতুন সদস্য অ্যাকাউন্ট',subtitle:'আপনার সদস্যের নাম নির্বাচন করে ঠিকানা, মোবাইল নম্বর ও পাসওয়ার্ড দিয়ে সাইন আপ করুন। অ্যাডমিন অনুমোদনের পর হিসাব দেখা যাবে।',member_label:'সদস্যের নাম',member_placeholder:'-- সদস্যের নাম নির্বাচন করুন --',address_label:'ঠিকানা',address_placeholder:'আপনার ঠিকানা',mobile_label:'মোবাইল নম্বর',mobile_placeholder:'01XXXXXXXXX',password_label:'পাসওয়ার্ড',password_placeholder:'কমপক্ষে ৬ অক্ষর',submit:'📝 অ্যাকাউন্ট তৈরি করুন',back:'← আগের পেজে ফিরে যান',login_link:'🔐 সদস্য লগইনে যান'},
      pending:{title:'অ্যাডমিন অনুমোদনের অপেক্ষায়',message:'আপনার অ্যাকাউন্ট তৈরি হয়েছে। অ্যাডমিন অনুমোদন করার পর আপনি আপনার ব্যক্তিগত হিসাব দেখতে পারবেন।',logout:'লগআউট'},
      dashboard:{eyebrow:'সদস্য অ্যাকাউন্ট',logout:'লগআউট',name_label:'নাম',address_label:'ঠিকানা',mobile_label:'লগইন মোবাইল',main_member_label:'মূল সদস্য'},
      admin:{title:'মেম্বার অনুমোদন',subtitle:'শুধু অনুমোদিত অ্যাডমিনের জন্য — এখান থেকে সদস্য অনুমোদন ও হিসাবের দৃশ্যমানতা নিয়ন্ত্রণ করা যাবে',email_label:'অ্যাডমিন ইমেইল',password_label:'পাসওয়ার্ড',login_button:'অ্যাডমিন লগইন',pending_heading:'Pending সদস্য অ্যাকাউন্ট',approve_button:'যুক্ত করুন ও অনুমোদন',reject_button:'বাতিল',pending_empty:'কোনো Pending account নেই',rule_note:'নতুন নিয়ম: সদস্য সাইন আপের সময় মূল সদস্য তালিকা থেকে নিজের নাম নির্বাচন করবে। অ্যাডমিন তথ্য যাচাই করে একই সদস্যকে অ্যাকাউন্টের সঙ্গে যুক্ত করে অনুমোদন করবেন। লগইনের সময় সদস্যের নাম ও পাসওয়ার্ড ব্যবহার হবে।',linked_heading:'🔗 যুক্ত করা সদস্য অ্যাকাউন্ট',linked_note:'🔐 কোনো সদস্য পাসওয়ার্ড ভুলে গেলে এখানে নতুন পাসওয়ার্ড সেট করতে পারবেন। অ্যাকাউন্ট ডিলেট করলে শুধু সদস্যের লগইন অ্যাকাউন্ট ও সংযোগ মুছে যাবে; মূল সদস্যের হিসাব থাকবে। পরে একই সদস্য যে কোনো মোবাইল নম্বর দিয়ে নতুন অ্যাকাউন্ট তৈরি করতে পারবেন।',reset_button:'🔑 নতুন পাসওয়ার্ড সেট',delete_button:'🗑️ অ্যাকাউন্ট ডিলেট',linked_empty:'এখনো কোনো অ্যাকাউন্ট যুক্ত করা হয়নি।'}
    }
  };
  window.AL_IKHWAN_DEFAULT_UI_SETTINGS=DEFAULT_UI_SETTINGS;
  window.AL_IKHWAN_DEFAULT_SETTINGS=DEFAULTS;
  window.AL_IKHWAN_SETTINGS=Object.assign({},DEFAULTS);

  function safeUrl(v,fallback){
    const s=String(v||'').trim();
    if(!s)return fallback||'';
    if(/^https?:\/\//i.test(s)||/^[^\s]+\.(jpg|jpeg|png|webp|svg)(\?.*)?$/i.test(s)||s.startsWith('data:image/')) return s;
    return fallback||'';
  }
  function setText(selector,value){document.querySelectorAll(selector).forEach(el=>{el.textContent=value??'';});}
  function apply(s){
    s=Object.assign({},DEFAULTS,s||{});
    const ui=Object.assign({},DEFAULT_UI_SETTINGS,s.ui_settings||{});
    ui.colors=Object.assign({},DEFAULT_UI_SETTINGS.colors,(s.ui_settings&&s.ui_settings.colors)||{});
    ['menu','admin_submenu','add_options','manage_options'].forEach(key=>{
      const defaults=DEFAULT_UI_SETTINGS[key]||[];
      const raw=Array.isArray(ui[key])?ui[key]:[];
      const map=new Map(raw.map(x=>[String(x.id),x]));
      ui[key]=defaults.map(x=>Object.assign({},x,map.get(String(x.id))||{}));
    });
    s.ui_settings=ui;
    window.AL_IKHWAN_SETTINGS=s;
    const root=document.documentElement;
    root.style.setProperty('--primary-color',s.primary_color);
    root.style.setProperty('--secondary-color',s.secondary_color);
    root.style.setProperty('--accent-color',s.accent_color);
    root.style.setProperty('--site-bg',s.background_color);
    root.style.setProperty('--card-bg',s.card_color);
    root.style.setProperty('--text-color',s.text_color);
    root.style.setProperty('--header-color',ui.colors.header||s.primary_color);
    root.style.setProperty('--footer-color',ui.colors.footer||'#076f45');
    root.style.setProperty('--button-color',ui.colors.button||s.primary_color);
    root.style.setProperty('--loading-screen-bg',ui.colors.loading||'#ffffff');
    root.style.setProperty('--green',s.primary_color);
    root.style.setProperty('--green-dark',s.secondary_color);
    root.style.setProperty('--green-soft',s.background_color);
    root.style.setProperty('--text',s.text_color);
    root.style.setProperty('--white',s.card_color);
    const logo=safeUrl(s.logo_url,DEFAULTS.logo_url);
    document.querySelectorAll('.logo,.drawer-logo img').forEach(img=>{img.src=logo;img.alt=s.site_name+'-এর লোগো';});
    document.querySelectorAll('.brand').forEach(a=>a.setAttribute('aria-label',s.site_name));
    setText('.brand-text strong',s.site_name); setText('.brand-text span',s.site_tagline);
    setText('.hero h1',s.hero_title||s.site_name); setText('.hero p',s.hero_subtitle||s.address);
    setText('.drawer-title',s.menu_title);
    const menuMap=new Map((ui.menu||[]).map(x=>[String(x.id),x]));
    (ui.menu||[]).forEach(x=>{
      const a=document.querySelector(`#mobileMenu a[data-view="${x.id}"]`);
      if(a){
        a.style.display=x.enabled?'flex':'none';
        const span=a.querySelector('span');
        if(span)span.textContent=x.icon||'';
        const text=[...a.childNodes].find(n=>n.nodeType===3);
        if(text)text.textContent=x.label||'';
        else a.appendChild(document.createTextNode(x.label||''));
      }
    });
    const adminItem=menuMap.get('admin');
    const adminSubmenu=document.getElementById('adminMenuSubmenu');
    if(adminSubmenu)adminSubmenu.style.display=adminItem&&adminItem.enabled?'block':'none';
    const adminSubMap=new Map((ui.admin_submenu||[]).map(x=>[String(x.id),x]));
    document.querySelectorAll('#adminMenuSubmenu a[data-admin-submenu]').forEach(a=>{
      const x=adminSubMap.get(String(a.dataset.adminSubmenu));
      if(!x)return;
      a.style.display=x.enabled?'flex':'none';
      const span=a.querySelector('span');
      if(span)span.textContent=x.icon||'';
      const text=[...a.childNodes].find(n=>n.nodeType===3);
      if(text)text.textContent=x.label||'';
    });
    const labels={personal:s.menu_personal,members:s.menu_members,due:s.menu_due,profitExpenseDetails:s.menu_profit,fund:s.menu_fund,notices:s.menu_notices};
    Object.keys(labels).forEach(k=>{
      const x=menuMap.get(k);
      const a=document.querySelector(`#memberMobileMenu a[data-member-view="${k}"]`);
      if(a && (!x || x.enabled!==false)){
        const span=a.querySelector('span'); a.textContent=''; if(span)a.appendChild(span);
        a.appendChild(document.createTextNode((x&&x.label)||labels[k]||''));
      }
    });
    document.querySelectorAll('#mobileMenu .drawer-title').forEach(el=>el.textContent=s.menu_title);
    document.querySelectorAll('footer .container').forEach(footer=>{
      const isMember=document.body.classList.contains('member-page');
      const subText=isMember?(s.member_footer_subtext||s.footer_subtext):s.footer_subtext;
      const contact=[s.phone&&`📞 ${s.phone}`,s.email&&`✉️ ${s.email}`,s.facebook_url&&`Facebook: ${s.facebook_url}`].filter(Boolean).join(' · ');
      footer.innerHTML=`© <span id="footerYear">${new Date().getFullYear()}</span> ${String(s.footer_text||s.site_name)}${contact?`<div class="footer-contact">${contact}</div>`:''}<div class="footer-sub">${String(subText||'')}</div>`;
    });
    const meta=document.querySelector('meta[name="description"]'); if(meta)meta.content=s.meta_description||s.site_name;
    const title=document.querySelector('title'); if(title)title.textContent=s.site_name+' — হিসাব';
    const icon=safeUrl(s.favicon_url,'icon-192.png');
    document.querySelectorAll('link[rel="icon"]').forEach(l=>l.href=icon);
    if(s.hero_image_url){document.querySelectorAll('.hero').forEach(h=>h.style.backgroundImage=`linear-gradient(rgba(0,0,0,.22),rgba(0,0,0,.22)),url("${s.hero_image_url.replace(/"/g,'%22')}")`);}
    else document.querySelectorAll('.hero').forEach(h=>h.style.backgroundImage='');
    document.title=s.site_name+' — হিসাব';
    window.dispatchEvent(new CustomEvent('site-settings-applied',{detail:s}));
  }
  async function load(){
    try{
      if(!window.supabase||!window.MAIN_SUPABASE_URL||!window.MAIN_SUPABASE_ANON_KEY){apply(DEFAULTS);return DEFAULTS;}
      const client=window.supabase.createClient(window.MAIN_SUPABASE_URL,window.MAIN_SUPABASE_ANON_KEY);
      const {data,error}=await client.from('site_settings').select('*').eq('id',1).maybeSingle();
      if(error){console.warn('site_settings:',error.message);apply(DEFAULTS);return DEFAULTS;}
      apply(data||DEFAULTS);return Object.assign({},DEFAULTS,data||{});
    }catch(e){console.warn('site settings load:',e);apply(DEFAULTS);return DEFAULTS;}
  }
  window.loadAlIkhwanSiteSettings=load;
  window.applyAlIkhwanSiteSettings=apply;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>load(),{once:true});else load();
})();
