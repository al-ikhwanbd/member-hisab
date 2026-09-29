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
    s=Object.assign({},DEFAULTS,s||{}); window.AL_IKHWAN_SETTINGS=s;
    const root=document.documentElement;
    root.style.setProperty('--primary-color',s.primary_color);
    root.style.setProperty('--secondary-color',s.secondary_color);
    root.style.setProperty('--accent-color',s.accent_color);
    root.style.setProperty('--site-bg',s.background_color);
    root.style.setProperty('--card-bg',s.card_color);
    root.style.setProperty('--text-color',s.text_color);
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
    const labels={personal:s.menu_personal,members:s.menu_members,due:s.menu_due,profitExpenseDetails:s.menu_profit,fund:s.menu_fund,notices:s.menu_notices};
    Object.keys(labels).forEach(k=>{const a=document.querySelector(`#mobileMenu a[data-view="${k}"],#memberMobileMenu a[data-member-view="${k}"]`);if(a){const span=a.querySelector('span');a.textContent='';if(span)a.appendChild(span);a.appendChild(document.createTextNode(labels[k]||''));}});
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
