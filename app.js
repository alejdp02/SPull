// Phoenix Pull — Modern Light Build (Supabase)
const { createClient } = supabase;
if (!window.PHX_CONFIG) { alert("Missing config.js with Supabase URL & anon key."); }
const supa = createClient(window.PHX_CONFIG.supabaseUrl, window.PHX_CONFIG.supabaseAnonKey);

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function show(id){ document.getElementById(id)?.classList.remove('hidden'); }
function hide(id){ document.getElementById(id)?.classList.add('hidden'); }
function toast(msg){
  const t=document.createElement('div'); t.textContent=msg;
  Object.assign(t.style,{position:'fixed',bottom:'18px',left:'50%',transform:'translateX(-50%)',background:'rgba(2,6,23,.9)',color:'#fff',padding:'10px 14px',borderRadius:'10px',zIndex:9999});
  document.body.appendChild(t); setTimeout(()=>t.remove(),1400);
}

// Data
const DATA = {
  Pastries:[
    {name:'Croissant', note:'10–12 (depending on day)', shelf:'2 Days'},
    {name:'Chocolate Croissant', note:'6', shelf:'2 Days'},
    {name:'Cheese Danish', note:'6', shelf:'2 Days'},
    {name:'Birthday Cake Pop', note:'3 packs', shelf:'2 Days'},
    {name:'Dog Cake Pop', note:'3 packs', shelf:'2 Days'},
    {name:'Chocolate Cake Pop', note:'3 packs', shelf:'2 Days'},
    {name:'Cookies and Cream Cake Pop', note:'2 packs', shelf:'2 Days'},
    {name:'Vanilla Bean Danish', note:'6', shelf:'2 Days'},
    {name:'Vanilla Bean Scone', note:'1 pack', shelf:'2 Days'},
    {name:'Chocolate Chip Cookie', note:'5', shelf:'2 Days'},
    {name:'Blueberry Muffin', note:'1', shelf:'2 Days'},
    {name:'Banana Bread', note:'6', shelf:'2 Days'},
    {name:'Lemon Loaf', note:'5', shelf:'2 Days'},
    {name:'Pumpkin Loaf', note:'5', shelf:'2 Days'},
    {name:'Coffee Cake', note:'5', shelf:'2 Days'},
    {name:'Dog Cookies', note:'Have 5 at all times', shelf:'12 Days'}
  ],
  Sandwiches:[
    {name:'Bacon Gouda', note:'6', shelf:'3 Days'},
    {name:'Sausage Cheddar', note:'6', shelf:'3 Days'},
    {name:'Impossible', note:'4', shelf:'3 Days'},
    {name:'Double Smoked', note:'6', shelf:'3 Days'},
    {name:'Chicken Maple', note:'3', shelf:'3 Days'},
    {name:'Turkey Bacon', note:'4', shelf:'3 Days'},
    {name:'Spinach Feta', note:'6', shelf:'3 Days'},
    {name:'Ham and Cheese Croissant', note:'6–8 (depending on day)', shelf:'2 Days'},
    {name:'Tomato Mozz', note:'4', shelf:'2 Days'},
    {name:'Turkey Pesto', note:'4', shelf:'2 Days'},
    {name:'Grilled Cheese', note:'4', shelf:'2 Days'},
    {name:'Pepper Egg Bites', note:'8', shelf:'7 Days'},
    {name:'Bacon Egg Bites', note:'8', shelf:'7 Days'},
    {name:'Potato Chive Bites', note:'8', shelf:'7 Days'},
    {name:'Egg Pesto Mozzarella', note:'5', shelf:'3 Days'},
    {name:'Bacon Sausage and Egg Wrap', note:'3', shelf:'3 Days'}
  ]
};

// Session/Profile
let session = null, profile = null;
async function getSession(){ const { data } = await supa.auth.getSession(); return data.session; }
async function signIn(email, password){ const { data, error } = await supa.auth.signInWithPassword({ email, password }); if(error) throw error; session = data.session; await afterAuth(); log('login', {}); }
async function signUp(email, password, display_name){
  const { data, error } = await supa.auth.signUp({ email, password }); if(error) throw error; session = data.session;
  const uid = data.user?.id; if(uid){ await supa.from('profiles').upsert({ id: uid, email, display_name, role:'user', active:true }); }
  await afterAuth();
}
async function signOut(){ await supa.auth.signOut(); log('logout', {}); session=null; profile=null; route(); }
async function fetchProfile(){
  const uid = session?.user?.id; if(!uid) return null;
  const { data, error } = await supa.from('profiles').select('*').eq('id', uid).maybeSingle();
  if(error) throw error; return data;
}
function isAdmin(){ return profile?.role === 'admin'; }

// Logs
async function log(action, payload){ try{ const u = session?.user; await supa.from('interactions').insert({ user_id:u?.id, user_email:u?.email, action, payload }); }catch{} }

// Quantities
async function loadQuantities(){
  const u = session?.user; if(!u) return new Map();
  const { data, error } = await supa.from('quantities').select('*').eq('user_id', u.id);
  if(error) throw error;
  const map = new Map(); for(const r of data){ map.set(`${r.category}__${r.item_name}`, r); } return map;
}
async function upsertQuantity(category, item_name, changes){
  const u = session?.user; if(!u) return;
  const row = { user_id:u.id, category, item_name, ...changes, updated_at:new Date().toISOString() };
  const { error } = await supa.from('quantities').upsert(row, { onConflict:'user_id,category,item_name' });
  if(error) console.error(error);
}

// Admin
async function renderUsers(){
  const { data, error } = await supa.from('profiles').select('id,email,display_name,role,active,created_at').order('created_at',{ascending:false});
  if(error){ $('#usersTable').innerHTML = `<p class="text-muted">Error loading users.</p>`; return; }
  const rows = (data||[]).map(u=>`
    <tr class="border-b border-line">
      <td class="py-2">${u.display_name || u.email}</td>
      <td class="py-2 text-muted text-sm">${u.email}</td>
      <td class="py-2"><span class="px-2 py-1 rounded-full border border-line ${u.role==='admin'?'bg-green-100':''}">${u.role}</span></td>
      <td class="py-2">${u.active ? '✅' : '⛔'}</td>
      <td class="py-2 text-sm text-muted">${new Date(u.created_at).toLocaleString()}</td>
      <td class="py-2">
        <div class="flex gap-2">
          <button class="btn tap rounded-xl border-2 border-brand text-brand px-3" data-act="toggle" data-id="${u.id}">${u.active?'Deactivate':'Activate'}</button>
          <button class="btn tap rounded-xl border-2 border-brand text-brand px-3" data-act="role" data-id="${u.id}">Role</button>
        </div>
      </td>
    </tr>`).join('');
  $('#usersTable').innerHTML = `<table class="w-full text-left">
    <thead><tr class="text-muted text-sm"><th class="py-2">Name</th><th class="py-2">Email</th><th class="py-2">Role</th><th class="py-2">Active</th><th class="py-2">Created</th><th class="py-2">Actions</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6" class="py-4 text-muted">No users</td></tr>'}</tbody></table>`;

  $('#usersTable').onclick = async (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const id = btn.dataset.id; const act = btn.dataset.act;
    if(act==='toggle'){
      const { data } = await supa.from('profiles').select('active').eq('id', id).maybeSingle();
      if(!data) return; await supa.from('profiles').update({ active: !data.active }).eq('id', id); renderUsers();
    }
    if(act==='role'){
      const role = prompt('Set role for user (admin/user):', 'user'); if(!role || !['admin','user'].includes(role)) return;
      await supa.from('profiles').update({ role }).eq('id', id); renderUsers();
    }
  };
}
async function renderLogFilters(){
  const { data } = await supa.from('profiles').select('email').order('email');
  const opts = ['<option value="all">All users</option>'].concat((data||[]).map(u=>`<option value="${u.email}">${u.email}</option>`));
  $('#logUserFilter').innerHTML = opts.join('');
}
async function renderLogs(){
  const who = $('#logUserFilter')?.value || 'all';
  const act = $('#logActionFilter')?.value || 'all';
  let q = supa.from('interactions').select('*').order('created_at',{ascending:false}).limit(1000);
  if(who!=='all') q = q.eq('user_email', who);
  if(act!=='all') q = q.eq('action', act);
  const { data, error } = await q;
  if(error){ $('#logsTable').innerHTML = `<p class="text-muted">Error loading logs.</p>`; return; }
  const rows = (data||[]).map(l=>`
    <tr class="border-b border-line">
      <td class="py-2">${new Date(l.created_at).toLocaleString()}</td>
      <td class="py-2">${l.user_email || ''}</td>
      <td class="py-2">${l.action}</td>
      <td class="py-2 text-xs text-muted"><code>${escapeHtml(JSON.stringify(l.payload||{}))}</code></td>
    </tr>`).join('');
  $('#logsTable').innerHTML = `<table class="w-full text-left">
    <thead><tr class="text-muted text-sm"><th class="py-2">When</th><th class="py-2">User</th><th class="py-2">Action</th><th class="py-2">Data</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4" class="py-4 text-muted">No logs</td></tr>'}</tbody></table>`;
}
function escapeHtml(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }
function wireAdmin(){
  $('#gotoApp')?.addEventListener('click', ()=>{ location.hash=''; route(); });
  $('#logoutA')?.addEventListener('click', signOut);
  $('#inviteForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = $('#inviteEmail').value.trim();
    const role = $('#inviteRole').value;
    if(!email) return;
    const { error } = await supa.auth.signInWithOtp({ email, options:{ emailRedirectTo: window.location.origin }});
    if(error){ alert(error.message || 'Could not send invite'); return; }
    toast('Invite sent! Have them check email.');
    setTimeout(renderUsers, 1500);
  });
  $('#logUserFilter')?.addEventListener('change', renderLogs);
  $('#logActionFilter')?.addEventListener('change', renderLogs);
  $('#exportCSV')?.addEventListener('click', async ()=>{
    const { data, error } = await supa.from('interactions').select('*').order('created_at',{ascending:false}).limit(5000);
    if(error) return alert('Export failed');
    const header = ['created_at','user_email','action','payload'];
    const rows = (data||[]).map(l=> [l.created_at, l.user_email||'', l.action, JSON.stringify(l.payload||{}).replaceAll('\n',' ')]);
    const csv = [header.join(','), ...rows.map(r=> r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(','))].join('\n');
    const blob = new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='logs.csv'; a.click(); URL.revokeObjectURL(a.href);
  });
  $('#clearLogs')?.addEventListener('click', async ()=>{
    if(!confirm('Clear ALL logs?')) return;
    await supa.from('interactions').delete().neq('id','00000000-0000-0000-0000-000000000000'); await renderLogs(); toast('Logs cleared');
  });
}

// Pull UI
const STORAGE_FILTERS = 'phoenix_filters_light_v1';
function getFilters(){ try{ return JSON.parse(localStorage.getItem(STORAGE_FILTERS)||'{}') }catch{ return {} } }
function saveFilters(o){ localStorage.setItem(STORAGE_FILTERS, JSON.stringify(o)); }

function buildChips(){
  const chips = $('#chips'); if(!chips) return; chips.innerHTML='';
  const mk = (label, cat, active=false) => `<button class="chip ${active?'active':''} tap rounded-full px-4 font-bold text-sm" data-cat="${cat}">${label}</button>`;
  chips.insertAdjacentHTML('beforeend', mk('All','all',true));
  Object.keys(DATA).forEach(c=> chips.insertAdjacentHTML('beforeend', mk(c,c)));
  chips.addEventListener('click', (e)=>{
    const b = e.target.closest('.chip'); if(!b) return;
    $$('#chips .chip').forEach(x=>x.classList.remove('active')); b.classList.add('active');
    const f = getFilters(); f.cat = b.dataset.cat; saveFilters(f); applyFilters();
  });
  const f = getFilters(); if(f.cat){ $$('#chips .chip').forEach(x=> x.classList.toggle('active', x.dataset.cat===f.cat)); }
}

function card(cat,item,qty=0,restock=false){
  return `<div class="bg-card border border-line rounded-2xl shadow-soft">
    <div class="flex items-center justify-between gap-3 p-3">
      <div><div class="font-extrabold">${item.name}</div><div class="text-muted text-sm">${item.note||''} · ${item.shelf||''}</div></div>
      <label class="flex items-center gap-2"><input type="checkbox" class="restock accent-brand" ${restock?'checked':''}/> <span class="text-sm">Restock</span></label>
    </div>
    <div class="h-px bg-line/70"></div>
    <div class="flex items-center gap-2 p-3">
      <div class="text-muted text-sm">Pull</div>
      <div class="ml-auto flex items-center gap-2">
        <button class="btn dec tap rounded-xl border border-line bg-white text-xl font-extrabold">–</button>
        <input class="num w-[90px] tap text-center bg-white border border-line rounded-xl text-lg" type="number" inputmode="numeric" min="0" step="1" value="${qty}" />
        <button class="btn inc tap rounded-xl border border-line bg-white text-xl font-extrabold">+</button>
      </div>
    </div>
  </div>`;
}

async function renderApp(){
  const list = $('#list'); if(!list) return;
  list.innerHTML = '<div class="text-muted">Loading…</div>';
  const qmap = await loadQuantities().catch(()=> new Map());
  let html='';
  for(const cat of Object.keys(DATA)){
    html += `<div class="space-y-4" data-section="${cat}">`;
    for(const it of DATA[cat]){
      const key = `${cat}__${it.name}`; const row = qmap.get(key);
      html += card(cat,it,row?.qty||0,row?.restock||false);
    }
    html += `</div>`;
  }
  list.innerHTML = html;
  $('#who') && ($('#who').textContent = `@${profile?.display_name || session?.user?.email || ''}`);
  attachHandlers(); applyFilters(); updateTotal();
}

function currentCat(){ const a=$('#chips .chip.active'); return a?a.dataset.cat:'all'; }
function applyFilters(){
  const q = ($('#search')?.value||'').trim().toLowerCase();
  const onlyQty = $('#onlyQty')?.checked;
  const cat = currentCat();
  $$('#list [data-section]').forEach(sec=>{
    sec.querySelectorAll('.bg-card').forEach(card=>{
      const name = card.querySelector('.font-extrabold').textContent.toLowerCase();
      const qty = Number(card.querySelector('.num').value||0);
      const isCat = sec.dataset.section===cat || cat==='all';
      const matchQ = !q || name.includes(q);
      const matchQty = !onlyQty || qty>0;
      card.style.display = (isCat && matchQ && matchQty) ? '' : 'none';
    });
  });
  const f=getFilters(); f.onlyQty=!!onlyQty; f.search=q; saveFilters(f);
}
function updateTotal(){
  let total=0; $$('#list .num').forEach(n=> total+=Number(n.value||0));
  $('#total') && ($('#total').textContent=total);
}
function attachHandlers(){
  const f=getFilters(); if(f.search && $('#search')) $('#search').value=f.search; if(typeof f.onlyQty==='boolean' && $('#onlyQty')) $('#onlyQty').checked=f.onlyQty;
  $('#search')?.addEventListener('input', applyFilters);
  $('#onlyQty')?.addEventListener('input', applyFilters);

  function withRepeat(button, step){
    let t,rep;
    const fire=()=>{
      const card=button.closest('.bg-card'); const num=card.querySelector('.num');
      num.value=Math.max(0, Number(num.value||0)+step);
      const sec=card.closest('[data-section]').dataset.section; const name=card.querySelector('.font-extrabold').textContent;
      upsertQuantity(sec,name,{qty:Number(num.value)}); updateTotal(); vibrate(10);
    };
    const start=()=>{ fire(); t=setTimeout(()=> rep=setInterval(fire, 90), 350) };
    const end=()=>{ clearTimeout(t); clearInterval(rep); };
    button.addEventListener('mousedown', start); document.addEventListener('mouseup', end);
    button.addEventListener('touchstart', (e)=>{ e.preventDefault(); start(); }, {passive:false});
    button.addEventListener('touchend', end);
  }
  $$('#list .inc').forEach(b=> withRepeat(b,+1));
  $$('#list .dec').forEach(b=> withRepeat(b,-1));

  $('#list')?.addEventListener('input', (e)=>{
    if(e.target.classList.contains('num')){
      const card=e.target.closest('.bg-card');
      const sec=card.closest('[data-section]').dataset.section;
      const name=card.querySelector('.font-extrabold').textContent;
      const v=Math.max(0, Number(e.target.value||0)); e.target.value=v;
      upsertQuantity(sec,name,{qty:v}); updateTotal();
    }
  });
  $('#list')?.addEventListener('change', (e)=>{
    if(e.target.classList.contains('restock')){
      const card=e.target.closest('.bg-card'); const sec=card.closest('[data-section]').dataset.section;
      const name=card.querySelector('.font-extrabold').textContent;
      upsertQuantity(sec,name,{restock:e.target.checked});
    }
  });

  // Summary bottom sheet
  $('#send')?.addEventListener('click', openModal);
  $('#close')?.addEventListener('click', closeModal);
  $('#modal')?.addEventListener('click', (e)=>{ if(e.target.id==='modal') closeModal(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); });

  $('#copy')?.addEventListener('click', copyBoth);
  $('#copyPull')?.addEventListener('click', copyPull);
  $('#copyRestock')?.addEventListener('click', copyRestock);
  $('#clear')?.addEventListener('click', clearAll);
  $('#print')?.addEventListener('click', ()=> window.print());
}

function vibrate(ms){ if(navigator.vibrate) try{ navigator.vibrate(ms);}catch{} }
function itemsToPull(){
  const items=[]; $$('#list [data-section]').forEach(sec=>{
    sec.querySelectorAll('.bg-card').forEach(card=>{
      const name=card.querySelector('.font-extrabold').textContent; const qty=Number(card.querySelector('.num').value||0);
      if(qty>0) items.push({name,qty});
    });
  }); items.sort((a,b)=> a.name.localeCompare(b.name)); return items;
}
function itemsToRestock(){
  const items=[]; $$('#list [data-section]').forEach(sec=>{
    sec.querySelectorAll('.bg-card').forEach(card=>{
      const name=card.querySelector('.font-extrabold').textContent; const checked=card.querySelector('.restock').checked;
      if(checked) items.push({name});
    });
  }); items.sort((a,b)=> a.name.localeCompare(b.name)); return items;
}
function openModal(){
  const pulls=itemsToPull(); const restocks=itemsToRestock();
  const pullHtml=pulls.length?pulls.map(i=>`<div class='flex justify-between py-2 border-b border-dashed border-line'><div>${i.name}</div><div class='font-extrabold'>${i.qty}</div></div>`).join(''):'<p class="text-muted">No pull items.</p>';
  const restockHtml=restocks.length?restocks.map(i=>`<div class='flex justify-between py-2 border-b border-dashed border-line'><div>${i.name}</div><div class='font-extrabold'>✓</div></div>`).join(''):'<p class="text-muted">No restock items.</p>';
  $('#summary').innerHTML = `<div class="space-y-3"><div><h4 class="text-brand font-bold mb-1">Items to Pull</h4>${pullHtml}</div><div><h4 class="text-brand font-bold mb-1">Items to Restock</h4>${restockHtml}</div></div>`;
  $('#modal')?.classList.add('open'); document.body.style.overflow='hidden';
  log('send_summary', {pulls,restocks});
}
function closeModal(){ $('#modal')?.classList.remove('open'); document.body.style.overflow=''; }
function copyBoth(){
  const pulls=itemsToPull().map(i=>`${i.name}: ${i.qty}`).join('\n')||'(none)';
  const rest=itemsToRestock().map(i=>`${i.name}`).join('\n')||'(none)';
  const text=`Items to Pull\n${pulls}\n\nItems to Restock\n${rest}`;
  navigator.clipboard.writeText(text).then(()=>toast('Copied')).catch(()=>alert('Copy failed'));
}
function copyPull(){ const pulls=itemsToPull().map(i=>`${i.name}: ${i.qty}`).join('\n')||'(none)'; navigator.clipboard.writeText(pulls).then(()=>toast('Copied Pull')).catch(()=>alert('Copy failed')); }
function copyRestock(){ const rest=itemsToRestock().map(i=>`${i.name}`).join('\n')||'(none)'; navigator.clipboard.writeText(rest).then(()=>toast('Copy Restock')).catch(()=>alert('Copy failed')); }
async function clearAll(){
  if(!confirm('Set all quantities to 0?')) return;
  $$('#list .num').forEach(n=> n.value=0); updateTotal(); applyFilters();
  const u=session?.user; if(u){ await supa.from('quantities').update({qty:0}).eq('user_id', u.id); }
  toast('Cleared');
}

// Routing
function blockIfInactive(){
  if(profile && profile.active===false){ alert('Your account is deactivated. Contact an admin.'); signOut(); return true; }
  return false;
}
async function afterAuth(){ profile = await fetchProfile().catch(()=>null); if(blockIfInactive()) return; route(); }
async function route(){
  session = await getSession();
  if(!session){ hide('view-admin'); hide('view-app'); show('view-login'); wireLogin(); return; }
  profile = await fetchProfile().catch(()=>null); if(blockIfInactive()) return;
  hide('view-login');
  if(location.hash==='#admin'){
    if(isAdmin()){ show('view-admin'); hide('view-app'); wireAdmin(); await renderUsers(); await renderLogFilters(); await renderLogs(); }
    else { toast('Admins only'); location.hash=''; show('view-app'); hide('view-admin'); buildChips(); await renderApp(); wireAppNav(); }
  } else {
    show('view-app'); hide('view-admin'); buildChips(); await renderApp(); wireAppNav();
  }
}

// Login wiring
function wireLogin(){
  $('#toSignup')?.addEventListener('click', ()=> $('#signupDialog')?.showModal());
  $('#signupForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault(); const email=$('#signupEmail').value.trim(); const pw=$('#signupPass').value; const name=$('#signupName').value.trim();
    try{ await signUp(email,pw,name); $('#signupDialog')?.close(); }catch(err){ alert(err.message||'Sign up failed'); }
  });
  $('#resetPw')?.addEventListener('click', async ()=>{
    const email=prompt('Enter your email to receive a reset link:'); if(!email) return;
    const { error } = await supa.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if(error) alert(error.message); else toast('Reset email sent');
  });
  $('#loginForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault(); try{ await signIn($('#loginEmail').value.trim(), $('#loginPass').value); }catch(err){ alert(err.message||'Login failed'); }
  });
}
function wireAppNav(){ $('#adminBtn')?.addEventListener('click', ()=>{ location.hash='#admin'; route(); }); $('#logout')?.addEventListener('click', signOut); }

// Start
route();
