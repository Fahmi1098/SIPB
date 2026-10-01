const root=document.getElementById('app');
const cfg=window.SIPB_CONFIG;
let client=null,session=null,profile=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const rupiah=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v)||0);
const fmtDate=v=>v?new Intl.DateTimeFormat('id-ID',{dateStyle:'medium'}).format(new Date(v)):'-';
const localDate=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const $=id=>document.getElementById(id);
const BANTEN_LOGO='assets/logo_banten.png';
let sidebarOpen=false;
let topNavPinned=null;
let uiTheme=localStorage.getItem('sipb-theme')||'light';
document.documentElement.dataset.theme=uiTheme;
const toast=(message,type='success')=>{let box=$('toastBox');if(!box){box=document.createElement('div');box.id='toastBox';box.className='toast-box';document.body.appendChild(box)}const el=document.createElement('div');el.className='toast '+type;el.textContent=message;box.appendChild(el);setTimeout(()=>el.remove(),3500)};
const sipbDialog=(type,message,options={})=>new Promise(resolve=>{
  const old=document.getElementById('sipbDialog');
  if(old)old.remove();
  const title=options.title||(type==='confirm'?'Konfirmasi':type==='prompt'?'Input':'Informasi');
  const okText=options.okText||(type==='confirm'?'Ya':'OK');
  const cancelText=options.cancelText||'Batal';
  const wrap=document.createElement('div');
  wrap.id='sipbDialog';
  wrap.className='sipb-dialog-backdrop';
  wrap.innerHTML='<div class="sipb-dialog" role="dialog" aria-modal="true" aria-labelledby="sipbDialogTitle">'+
    '<div class="sipb-dialog-icon">'+(type==='confirm'?'?':type==='prompt'?'✎':'i')+'</div>'+
    '<div class="sipb-dialog-body"><h3 id="sipbDialogTitle">'+esc(title)+'</h3><p>'+esc(message)+'</p>'+
    (type==='prompt'?'<input class="sipb-dialog-input" id="sipbDialogInput" type="text" value="'+esc(options.value||'')+'" autocomplete="off">':'')+
    '</div><div class="sipb-dialog-actions">'+
    (type==='confirm'||type==='prompt'?'<button type="button" class="ghost sipb-dialog-cancel">'+esc(cancelText)+'</button>':'')+
    '<button type="button" class="primary sipb-dialog-ok">'+esc(okText)+'</button></div></div>';
  document.body.appendChild(wrap);
  const ok=wrap.querySelector('.sipb-dialog-ok'), cancel=wrap.querySelector('.sipb-dialog-cancel'), input=wrap.querySelector('.sipb-dialog-input');
  const finish=value=>{wrap.remove();resolve(value)};
  ok.onclick=()=>finish(type==='prompt'?(input?.value??''):true);
  cancel&&(cancel.onclick=()=>finish(type==='prompt'?null:false));
  wrap.addEventListener('click',e=>{if(e.target===wrap&&type!=='prompt')finish(type==='confirm'?false:undefined)});
  if(input){
    input.focus();
    input.select();
    input.addEventListener('keydown',e=>{if(e.key==='Enter')finish(input.value);if(e.key==='Escape')finish(null)});
  }else ok.focus();
});
const sipbAlert=message=>sipbDialog('alert',message,{title:'Pemberitahuan'});
const sipbConfirm=message=>sipbDialog('confirm',message);
const sipbPrompt=(message,value='')=>sipbDialog('prompt',message,{value});
window.SIPBDialog={alert:sipbAlert,confirm:sipbConfirm,prompt:sipbPrompt};
const fail=e=>{console.error(e);toast(e?.message||'Terjadi kesalahan.','error')};
const loading=label=>'<div class="loading-state"><div class="spinner"></div><span>'+esc(label||'Memuat...')+'</span></div>';

function sortableValue(text){
  const raw=String(text||'').trim();
  if(!raw)return '';
  const normalized=raw.toLowerCase().replace(/\s+/g,' ');
  const months={jan:0,feb:1,mar:2,apr:3,mei:4,jun:5,jul:6,agu:7,sep:8,okt:9,nov:10,des:11};
  const dm=normalized.match(/^(\d{1,2})\s+(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)\s+(\d{4})$/i);
  if(dm)return new Date(Number(dm[3]),months[dm[2]],Number(dm[1])).getTime();
  if(/^\d{4}-\d{2}-\d{2}(?:[T ][\d:.+-]*)?$/.test(raw))return new Date(raw).getTime();
  const numeric=raw.replace(/[^\d,.-]/g,'').replace(/\.(?=\d{3}(?:\.|$))/g,'').replace(',','.');
  if(numeric&&/^-?\d+(?:\.\d+)?$/.test(numeric))return Number(numeric);
  return normalized;
}
function sortTable(table,col,dir=1){
  const tbody=table.tBodies[0]; if(!tbody)return;
  const rows=[...tbody.rows];
  rows.sort((a,b)=>{
    const av=sortableValue(a.cells[col]?.textContent||''),bv=sortableValue(b.cells[col]?.textContent||'');
    if(typeof av==='number'&&typeof bv==='number')return (av-bv)*dir;
    return String(av).localeCompare(String(bv),'id',{numeric:true,sensitivity:'base'})*dir;
  });
  rows.forEach(r=>tbody.appendChild(r));
  [...table.tHead.rows[0].cells].forEach((th,i)=>{
    const indicator=th.querySelector('.sort-indicator');
    if(indicator)indicator.textContent=i===col?(dir===1?'↑':'↓'):'↕';
  });
}
function enhanceTables(scope=document){
  const isDocument=scope===document;
  const rootScope=scope?.querySelectorAll?scope:document;
  const tables=isDocument?document.querySelectorAll('#content table'):rootScope.querySelectorAll('table');
  tables.forEach(table=>{
    if(table.dataset.sortReady!=='1'){
      [...(table.tHead?.rows?.[0]?.cells||[])].forEach((th,col)=>{
        const label=th.textContent.trim();
        if(!label||label==='Aksi')return;
        th.classList.add('sortable-th');
        th.dataset.sortCol=String(col);
        const indicator=document.createElement('span');
        indicator.className='sort-indicator';
        indicator.textContent='↕';
        th.appendChild(indicator);
        th.addEventListener('click',()=>{
          const currentCol=Number(table.dataset.sortCol??'-1');
          const currentDir=Number(table.dataset.sortDir||'1');
          const nextDir=currentCol===col?-currentDir:1;
          table.dataset.sortCol=String(col);
          table.dataset.sortDir=String(nextDir);
          sortTable(table,col,nextDir);
          const card=table.closest('.page-card,.recent');
          const sel=card?.querySelector('.table-sort-select');
          const dir=card?.querySelector('.table-sort-direction');
          if(sel)sel.value=String(col);
          if(dir)dir.value=nextDir===1?'asc':'desc';
        });
      });
      table.dataset.sortReady='1';
    }
    const card=table.closest('.page-card,.recent');
    if(!card)return;
    let toolbar=card.querySelector(':scope > .table-tools');
    if(!toolbar){
      const tableWrap=table.closest('.table-wrap');
      const existing=tableWrap?.previousElementSibling?.classList?.contains('filter-bar')
        ?tableWrap.previousElementSibling:null;
      if(existing)toolbar=existing;
      else{
        toolbar=document.createElement('div');
        toolbar.className='filter-bar table-tools';
        tableWrap?.parentNode?.insertBefore(toolbar,tableWrap);
      }
    }
    if(!toolbar.querySelector('.table-sort-select')){
      const sortWrap=document.createElement('label');
      sortWrap.className='table-sort-control';
      sortWrap.innerHTML='<span>Urutkan</span><select class="table-sort-select"><option value="">Kolom…</option></select>';
      const sortSel=sortWrap.querySelector('select');
      [...(table.tHead?.rows?.[0]?.cells||[])].forEach((th,col)=>{
        const label=th.textContent.replace(/[↑↓↕]/g,'').trim();
        if(!label||label==='Aksi')return;
        const opt=document.createElement('option');
        opt.value=String(col);opt.textContent=label;sortSel.appendChild(opt);
      });
      const dirWrap=document.createElement('label');
      dirWrap.className='table-sort-control';
      dirWrap.innerHTML='<span>Arah</span><select class="table-sort-direction"><option value="asc">Naik</option><option value="desc">Turun</option></select>';
      toolbar.appendChild(sortWrap);
      toolbar.appendChild(dirWrap);
      sortSel.addEventListener('change',()=>{
        if(sortSel.value==='')return;
        const direction=dirWrap.querySelector('select').value==='desc'?-1:1;
        table.dataset.sortCol=sortSel.value;
        table.dataset.sortDir=String(direction);
        sortTable(table,Number(sortSel.value),direction);
      });
      dirWrap.querySelector('select').addEventListener('change',()=>{
        if(sortSel.value==='')return;
        const direction=dirWrap.querySelector('select').value==='desc'?-1:1;
        table.dataset.sortCol=sortSel.value;
        table.dataset.sortDir=String(direction);
        sortTable(table,Number(sortSel.value),direction);
      });
    }
    if(!toolbar.querySelector('.table-filter-search') && !toolbar.querySelector('.search-box')){
      const search=document.createElement('div');
      search.className='search-box table-filter-search-box';
      search.innerHTML='<span aria-hidden="true">⌕</span><input class="table-filter-search" type="search" placeholder="Cari di tabel...">';
      toolbar.insertBefore(search,toolbar.firstChild);
      search.querySelector('input').addEventListener('input',e=>{
        const q=e.target.value.toLowerCase().trim();
        table.querySelectorAll('tbody tr').forEach(row=>{
          if(row.querySelector('.empty'))return;
          row.style.display=!q||row.textContent.toLowerCase().includes(q)?'':'none';
        });
      });
    }
  });
}
async function cancelAndDeleteOutgoing(id){
  const cancel=await client.rpc('cancel_barang_keluar',{p_transaksi_id:Number(id)});
  if(cancel.error)throw cancel.error;
  const cleanup=await client.rpc('delete_cancelled_barang_keluar',{p_transaksi_id:Number(id)});
  if(cleanup.error)throw cleanup.error;
  return cleanup.data;
}
function showLogin(message=''){
 root.innerHTML=`<main class="login"><button class="login-theme-toggle theme-toggle" id="loginThemeToggle" type="button"><span class="theme-icon">${uiTheme==='dark'?'☀':'☾'}</span><span>${uiTheme==='dark'?'Mode terang':'Mode gelap'}</span></button><section class="login-shell"><aside class="login-aside"><div class="login-emblem"><img src="${BANTEN_LOGO}" alt="Lambang Provinsi Banten"></div><div class="login-org">PEMERINTAH PROVINSI BANTEN</div><h1>UPTD PENGELOLAAN PENDAPATAN DAERAH MALINGPING</h1><p>Sistem Informasi Pengurus Barang</p><div class="login-rule"></div><small>Portal internal pengelolaan persediaan barang.</small></aside><section class="login-card"><div class="brand"><div><h2>Sistem Informasi Pengurus Barang</h2><p>UPTD PPD Malingping</p></div></div><div class="login-title">Masuk ke sistem</div><p class="login-desc">Gunakan akun yang terdaftar untuk melanjutkan.</p><form id="loginForm"><label for="email">Email</label><input id="email" type="email" required autocomplete="username" placeholder="akun@instansi.go.id"><label for="password">Password</label><div class="password-wrap"><input id="password" type="password" required autocomplete="current-password" placeholder="••••••••"><button type="button" class="password-toggle" id="togglePassword" aria-label="Tampilkan password" title="Tampilkan password"><svg class="eye-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.8"></circle></svg></button></div><button class="primary login-btn" type="submit"><span>Masuk</span><span aria-hidden="true">→</span></button>${message?`<div class="alert">${esc(message)}</div>`:''}</form><div class="login-footer">© ${new Date().getFullYear()} UPTD PPD Malingping</div></section></section></main>`;
 $('togglePassword').onclick=()=>{const p=$('password'),b=$('togglePassword');p.type=p.type==='password'?'text':'password';const shown=p.type==='text';b.setAttribute('aria-label',shown?'Sembunyikan password':'Tampilkan password');b.setAttribute('title',shown?'Sembunyikan password':'Tampilkan password');b.innerHTML="<svg class=\"eye-svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z\"></path><circle cx=\"12\" cy=\"12\" r=\"2.8\"></circle></svg>"};
 $('loginThemeToggle').onclick=()=>{uiTheme=uiTheme==='dark'?'light':'dark';localStorage.setItem('sipb-theme',uiTheme);document.documentElement.dataset.theme=uiTheme;showLogin(message)};
 $('loginForm').addEventListener('submit',async e=>{e.preventDefault();const email=$('email').value.trim(),password=$('password').value,btn=e.submitter;btn.disabled=true;btn.textContent='Memproses...';const {error}=await client.auth.signInWithPassword({email,password});if(error)return showLogin(error.message);sidebarOpen=false;renderApp('dashboard')});
}

async function loadProfile(){const {data,error}=await client.from('user_profiles').select('*').eq('id',session.user.id).maybeSingle();if(error)throw error;profile=data||{nama_lengkap:session.user.email,role:'user',is_active:true};if(profile.is_active===false){await client.auth.signOut();throw new Error('Akun tidak aktif.')}}
async function count(t){const {count,error}=await client.from(t).select('*',{count:'exact',head:true});if(error)throw error;return count||0}
async function dashboard(){
  const names=['barang','barang_masuk','transaksi_keluar'];
  const now=new Date();
  const since=new Date(now.getFullYear(),now.getMonth()-5,1).toISOString();
  const [barangQ,masukQ,keluarQ,recentQ,catQ,outQ]=await Promise.all([
    client.from('barang').select('id,sisa'),
    client.from('barang_masuk').select('jumlah,harga_satuan'),
    client.from('transaksi_keluar').select('id,status'),
    client.from('transaksi_keluar').select('*').order('id',{ascending:false}).limit(6),
    client.from('barang').select('id,kategori:kategori_id(nama_kategori)'),
    client.from('transaksi_keluar').select('tanggal_keluar,status').gte('tanggal_keluar',since).order('tanggal_keluar')
  ]);
  if(barangQ.error||masukQ.error||keluarQ.error||recentQ.error||catQ.error||outQ.error)throw(barangQ.error||masukQ.error||keluarQ.error||recentQ.error||catQ.error||outQ.error);

  const barangData=barangQ.data||[];
  const masukData=masukQ.data||[];
  const keluarData=(keluarQ.data||[]).filter(x=>(x.status||'AKTIF')!=='DIBATALKAN');
  const totalBarang=barangData.length;
  const totalSisa=barangData.reduce((n,r)=>n+(Number(r.sisa)||0),0);
  const totalMasuk=masukData.reduce((n,r)=>n+(Number(r.jumlah)||0),0);
  const nominalMasuk=masukData.reduce((n,r)=>n+((Number(r.jumlah)||0)*(Number(r.harga_satuan)||0)),0);
  const totalKeluar=keluarData.length;
  const recentData=(recentQ.data||[]).filter(r=>(r.status||'AKTIF')==='AKTIF');

  const catMap={};
  (catQ.data||[]).forEach(x=>{const n=x.kategori?.nama_kategori||'Tanpa Kategori';catMap[n]=(catMap[n]||0)+1});
  const catEntries=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,8);

  const monthMap={};
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');monthMap[key]=0}
  (outQ.data||[]).filter(x=>(x.status||'AKTIF')!=='DIBATALKAN').forEach(x=>{const d=new Date(x.tanggal_keluar);const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');if(key in monthMap)monthMap[key]++});
  const monthLabels=Object.keys(monthMap).map(k=>{const [y,m]=k.split('-');return new Intl.DateTimeFormat('id-ID',{month:'short'}).format(new Date(Number(y),Number(m)-1,1))});

  window.SIPB_DASHBOARD_CHARTS={categoryLabels:catEntries.map(x=>x[0]),categoryData:catEntries.map(x=>x[1]),monthLabels,monthData:Object.values(monthMap)};

  return `<section class="welcome card"><div class="welcome-copy"><span class="eyebrow">DASHBOARD</span><h2>Selamat Datang</h2><p>Sistem Informasi Pengurus Barang untuk administrasi persediaan UPTD PPD Malingping.</p><div class="welcome-meta"><span class="status-pill"><i></i> Sistem Online</span><span>•</span><span>${new Intl.DateTimeFormat('id-ID',{dateStyle:'full'}).format(now)}</span></div></div><div class="welcome-emblem"><img src="${BANTEN_LOGO}" alt="Lambang Provinsi Banten"><div><strong>PEMERINTAH PROVINSI BANTEN</strong><span>UPTD PPD MALINGPING</span></div></div></section><section class="stats-grid"><div class="stat-card blue"><span class="stat-icon">${navSvg('barang')}</span><div><small>Total Barang</small><strong>${totalBarang}</strong><em>Master barang</em></div></div><div class="stat-card blue"><span class="stat-icon">${navSvg('barang_masuk')}</span><div><small>Nilai Barang Masuk</small><strong>${rupiah(nominalMasuk)}</strong><em>Total nilai penerimaan</em></div></div><div class="stat-card green"><span class="stat-icon">${navSvg('barang_masuk')}</span><div><small>Jumlah Barang Masuk</small><strong>${totalMasuk.toLocaleString('id-ID')}</strong><em>Total kuantitas masuk</em></div></div><div class="stat-card red"><span class="stat-icon">${navSvg('barang_keluar')}</span><div><small>Barang Keluar</small><strong>${totalKeluar}</strong><em>Transaksi aktif</em></div></div><div class="stat-card purple"><span class="stat-icon">${navSvg('stock_opname')}</span><div><small>Sisa Stok</small><strong>${totalSisa.toLocaleString('id-ID')}</strong><em>Total stok saat ini</em></div></div></section><section class="charts-grid"><article class="card chart-card"><div class="section-head"><div><span class="eyebrow">DISTRIBUSI</span><h3>Barang berdasarkan kategori</h3><p>Delapan kategori dengan jumlah barang terbanyak.</p></div></div><div class="chart-wrap"><canvas id="categoryChart"></canvas></div></article><article class="card chart-card"><div class="section-head"><div><span class="eyebrow">AKTIVITAS</span><h3>Barang keluar per bulan</h3><p>Enam bulan terakhir, transaksi aktif.</p></div></div><div class="chart-wrap"><canvas id="outgoingChart"></canvas></div></article></section><section class="card recent"><div class="section-head"><div><span class="eyebrow">AKTIVITAS TERKINI</span><h3>Transaksi terbaru</h3><p>Enam transaksi barang keluar terakhir.</p></div><button class="ghost" data-page="barang_keluar">Lihat semua <span aria-hidden="true">→</span></button></div><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Penerima</th><th>Tujuan</th></tr></thead><tbody>${recentData.map(r=>`<tr><td>${fmtDate(r.tanggal_keluar)}</td><td><strong>${esc(r.penerima_nama||'-')}</strong></td><td>${esc(r.tujuan_ruangan||'-')}</td></tr>`).join('')||'<tr><td colspan="3" class="empty">Belum ada transaksi.</td></tr>'}</tbody></table></div></section>`}

async function barangPage(){const [{data,error},{data:k,error:ke}]=await Promise.all([client.from('barang').select('*, kategori:kategori_id(nama_kategori)').order('id'),client.from('kategori').select('*').order('nama_kategori')]);if(error)throw error;if(ke)throw ke;return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">MASTER DATA</span><h2>Master Barang</h2><p>Kelola data barang dan informasi stok tanpa field LKI.</p></div>${profile?.role==='admin'?'<button class="primary" id="addBarang">＋ Tambah Barang</button>':''}</div><div class="filter-bar"><div class="search-box">⌕<input id="barangSearch" placeholder="Cari nama, tipe, merk, atau satuan..."></div><select id="barangFilter"><option value="">Semua kategori</option>${(k||[]).map(x=>`<option value="${x.id}">${esc(x.nama_kategori)}</option>`).join('')}</select><span id="barangCount" class="result-count">${data?.length||0} data</span></div><div class="table-wrap"><table id="barangTable"><thead><tr><th>ID</th><th>Nama Barang</th><th>Kategori</th><th>Tipe</th><th>Merk</th><th>Satuan</th><th>Harga Terakhir</th><th>Stok</th><th>Aksi</th></tr></thead><tbody>${(data||[]).map(barangRow).join('')||emptyRow(9)}</tbody></table></div></section>`}
function barangRow(r){const low=Number(r.sisa??0)<=Number(r.stok_minimum??0);return `<tr data-search="${esc([r.nama_barang,r.tipe,r.merk,r.satuan,r.kategori?.nama_kategori].join(' ').toLowerCase())}" data-kategori="${r.kategori_id||''}"><td class="id-cell">#${r.id}</td><td><strong>${esc(r.nama_barang)}</strong></td><td>${esc(r.kategori?.nama_kategori||'-')}</td><td>${esc(r.tipe||'-')}</td><td>${esc(r.merk||'-')}</td><td>${esc(r.satuan||'-')}</td><td>${rupiah(r.harga_terakhir)}</td><td><span class="stock ${low?'low':''}">${r.sisa??0}</span></td><td>${profile?.role==='admin'?'<div class="actions"><button class="btn-sm edit-barang" data-id="'+r.id+'">Edit</button><button class="btn-sm danger delete-barang" data-id="'+r.id+'">Hapus</button></div>':'<span class="badge-soft">Lihat</span>'}</td></tr>`}
function emptyRow(n){return `<tr><td colspan="${n}" class="empty">Belum ada data.</td></tr>`}
async function barangForm(id=null){let row={nama_barang:'',kategori_id:'',tipe:'',merk:'',satuan:'',stok_minimum:0};if(id){const {data,error}=await client.from('barang').select('*').eq('id',id).single();if(error)throw error;row=data}const {data:k,error}=await client.from('kategori').select('*').order('nama_kategori');if(error)throw error;return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">MASTER BARANG</span><h2>${id?'Edit Barang':'Tambah Barang'}</h2><p>Informasi operasional persediaan.</p></div><button class="ghost" id="backBarang">← Kembali</button></div><div class="form-grid"><label>Nama Barang <input id="b_nama" value="${esc(row.nama_barang)}" maxlength="255"></label><label>Kategori <select id="b_kat"><option value="">- Pilih kategori -</option>${(k||[]).map(x=>`<option value="${x.id}" ${String(x.id)===String(row.kategori_id)?'selected':''}>${esc(x.nama_kategori)}</option>`).join('')}</select></label><label>Tipe <input id="b_tipe" value="${esc(row.tipe||'')}"></label><label>Merk <input id="b_merk" value="${esc(row.merk||'')}"></label><label>Satuan <input id="b_satuan" value="${esc(row.satuan||'')}"></label><label>Stok Minimum <input id="b_min" type="number" min="0" value="${row.stok_minimum||0}"></label></div><div class="form-actions"><button class="primary" id="saveBarang">${id?'Simpan Perubahan':'Simpan Barang'}</button><button class="ghost" id="cancelBarang">Batal</button></div></section>`}
async function simple(title,table,cols){const {data,error}=await client.from(table).select('*').order('id',{ascending:false}).limit(200);if(error)throw error;return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">DATA SIPB</span><h2>${title}</h2><p>Maksimal 200 data terbaru.</p></div></div><div class="table-wrap"><table><thead><tr>${cols.map(x=>`<th>${x[1]}</th>`).join('')}</tr></thead><tbody>${(data||[]).map(row=>`<tr>${cols.map(x=>`<td>${esc(row[x[0]])}</td>`).join('')}</tr>`).join('')||emptyRow(cols.length)}</tbody></table></div></section>`}

async function barangMasukPage(){const [{data:rows,error},{data:items,error:ie},{data:kats,error:ke}]=await Promise.all([client.from('barang_masuk').select('*,barang:barang_id(nama_barang,satuan)').order('id',{ascending:false}).limit(200),client.from('barang').select('id,nama_barang,satuan').order('nama_barang'),client.from('kategori').select('*').order('nama_kategori')]);if(error||ie||ke)throw(error||ie||ke);return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">TRANSAKSI PERSEDIAAN</span><h2>Barang Masuk</h2><p>Penerimaan barang akan otomatis menambah stok dan memperbarui harga terakhir.</p></div><button class="primary" id="addMasuk">＋ Rekam Barang Masuk</button></div><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Barang</th><th>Jumlah</th><th>Harga Satuan</th><th>Sumber Dana</th><th>Penyerah</th><th>Penerima</th></tr></thead><tbody>${(rows||[]).map(r=>`<tr><td>${fmtDate(r.tanggal_masuk)}</td><td><strong>${esc(r.barang?.nama_barang||'-')}</strong></td><td>${r.jumlah} ${esc(r.barang?.satuan||'')}</td><td>${rupiah(r.harga_satuan)}</td><td>${esc(r.sumber_dana||'-')}</td><td>${esc(r.nama_penyerah||'-')}</td><td>${esc(r.nama_penerima||'-')}</td></tr>`).join('')||emptyRow(7)}</tbody></table></div></section>`}

async function barangMasukForm(){
  const canCreate=profile?.role==='admin';
  const [{data:items,error},{data:kats,error:ke}]=await Promise.all([
    client.from('barang').select('id,nama_barang,satuan,kategori_id,kategori:kategori_id(nama_kategori)').order('nama_barang'),
    client.from('kategori').select('*').order('nama_kategori')
  ]);
  if(error||ke)throw(error||ke);
  return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">PENERIMAAN</span><h2>Rekam Barang Masuk</h2><p>Stok, transaksi penerimaan, dan batch Kuasi disimpan atomik dalam satu transaksi database.</p></div><button class="ghost" id="backMasuk">← Kembali</button></div><div class="form-grid">
  <label>Barang yang sudah ada <select id="m_barang">${canCreate?'<option value="">＋ Barang baru</option>':''}${items.map(x=>`<option value="${x.id}" data-kuasi="${String(x.kategori?.nama_kategori||'').toLowerCase().includes('kuasi')?'1':'0'}">${esc(x.nama_barang)} — ${esc(x.satuan||'-')}</option>`).join('')}</select></label>
  <label${canCreate?'':' style="display:none"'}>Nama Barang Baru <input id="m_nama" placeholder="Isi jika memilih Barang baru"></label>
  <label${canCreate?'':' style="display:none"'}>Kategori Barang Baru <select id="m_kat"><option value="">- Pilih kategori -</option>${kats.map(x=>`<option value="${x.id}" data-kuasi="${String(x.nama_kategori||'').toLowerCase().includes('kuasi')?'1':'0'}">${esc(x.nama_kategori)}</option>`).join('')}</select></label>
  <label>Tipe <input id="m_tipe" value="-"></label><label>Merk <input id="m_merk" value="-"></label><label>Satuan <input id="m_satuan" placeholder="BUAH / PCS / KOTAK"></label>
  <label>Jumlah Masuk <input id="m_jumlah" type="number" min="1" value="1"></label><label>Harga Satuan <input id="m_harga" type="number" min="0" step="0.01" value="0"></label>
  <label>Sumber Dana <select id="m_sumber"><option>APBD</option><option>APBN</option><option>Lainnya</option></select></label>
  <label>Tanggal Masuk <input id="m_tanggal" type="date" value="${localDate()}"></label>
  <label>Nama Penyerah <input id="m_penyerah" required placeholder="Pihak ke Tiga"></label><label>Nama Penerima <input id="m_penerima" value="${esc(profile?.nama_lengkap||'')}"></label>
  </div><div id="masukKuasi" class="kuasi-box" style="display:none"><strong>📑 Batch Kuasi</strong><span>Isi rentang nomor seri yang diterima. Jumlah harus sama dengan rentang.</span><div class="form-grid"><label>No. Dus <input id="m_dus" placeholder="Contoh: 411"></label><label>No. Seri Awal <input id="m_awal" placeholder="A-001"></label><label>No. Seri Akhir <input id="m_akhir" placeholder="A-100"></label></div></div><div class="form-actions"><button class="primary" id="saveMasuk">Rekam & Tambah Stok</button><button class="ghost" id="cancelMasuk">Batal</button></div></section>`;
}
async function barangKeluarPage(){
  const {data,error}=await client.from('transaksi_keluar').select('*,detail_barang_keluar(count)').order('id',{ascending:false}).limit(200);
  if(error)throw error;
  const activeData=(data||[]).filter(r=>(r.status||'AKTIF')==='AKTIF');
  return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">TRANSAKSI PERSEDIAAN</span><h2>Barang Keluar</h2><p>Hanya transaksi aktif ditampilkan; transaksi yang dibatalkan langsung dihapus.</p></div><button class="primary" id="addKeluar">＋ Rekam Barang Keluar</button></div><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Penyerah</th><th>Penerima</th><th>Tujuan</th><th>Item</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${activeData.map(r=>{const active=(r.status||'AKTIF')==='AKTIF';return '<tr><td>'+fmtDate(r.tanggal_keluar)+'</td><td>'+esc(r.penyerah_nama||'-')+'</td><td><strong>'+esc(r.penerima_nama||'-')+'</strong></td><td>'+esc(r.tujuan_ruangan||'-')+'</td><td>'+(r.detail_barang_keluar?.[0]?.count??0)+'</td><td><span class="badge-soft '+(active?'success':'')+'">'+(active?'AKTIF':'DIBATALKAN')+'</span></td><td>'+'<div class="row-actions"><button class="btn-sm sipb-inline-print" data-id="'+r.id+'">Cetak</button>'+(active&&profile?.role==='admin'?'<button class="btn-sm danger cancel-keluar" data-id="'+r.id+'">Batalkan</button>':'')+'</div>'+'</td></tr>'}).join('')||emptyRow(7)}</tbody></table></div></section>`;
}

async function barangKeluarForm(){const [{data:items,error},{data:pegawai,error:pe}]=await Promise.all([client.from('barang').select('id,nama_barang,satuan,sisa,kategori:kategori_id(id,nama_kategori)').order('nama_barang'),client.from('pegawai').select('id,nama_pegawai,nip,status_pegawai,jabatan').order('nama_pegawai')]);if(error||pe)throw(error||pe);return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">DISTRIBUSI</span><h2>Rekam Barang Keluar</h2><p>Stok akan dikurangi setelah seluruh item lolos validasi.</p></div><button class="ghost" id="backKeluar">← Kembali</button></div><div class="form-grid"><label>Tanggal Keluar <input id="k_tanggal" type="date" value="${localDate()}"></label><label>Penyerah (Gudang) <select id="k_penyerah"><option value="">- Pilih penyerah -</option>${pegawai.map(p=>`<option value="${esc(p.nama_pegawai)}" data-nip="${esc(p.nip||'')}" data-jabatan="${esc(p.jabatan||'')}" data-status="${esc(p.status_pegawai||'')}">${esc(p.nama_pegawai)}</option>`).join('')}</select></label><label>Jabatan Penyerah <input id="k_penyerah_jabatan" readonly></label><label>NIP Penyerah <input id="k_penyerah_nip" readonly></label><label>Penerima (Pemohon) <select id="k_penerima"><option value="">- Pilih pegawai -</option>${pegawai.map(p=>`<option value="${esc(p.nama_pegawai)}" data-nip="${esc(p.nip||'')}" data-jabatan="${esc(p.jabatan||'')}" data-status="${esc(p.status_pegawai||'')}">${esc(p.nama_pegawai)}</option>`).join('')}</select></label><label>Jabatan Penerima <input id="k_jabatan" readonly></label><label>NIP Penerima <input id="k_nip" readonly></label><label>Tujuan / Ruangan <input id="k_tujuan" placeholder="Contoh: Subag Tata Usaha" required></label></div><div class="section-head compact"><div><h3>Daftar Barang</h3><p>Tambahkan satu atau beberapa item.</p></div><button class="ghost" id="addItemKeluar">＋ Tambah Item</button></div><div id="keluarItems"></div><div class="form-actions"><button class="primary" id="saveKeluar">Rekam Transaksi & Kurangi Stok</button><button class="ghost" id="cancelKeluar">Batal</button></div></section>`}

function keluarItemRow(items){
  const id='ki_'+Math.random().toString(36).slice(2,9);
  return '<div class="transaction-row" data-row="'+id+'"><select class="ki-barang"><option value="">- Pilih barang -</option>'+
    items.map(x=>{
      const kat=String(x.kategori?.nama_kategori||'').toLowerCase(),isKuasi=kat.includes('kuasi');
      return '<option value="'+x.id+'" data-stock="'+x.sisa+'" data-unit="'+esc(x.satuan||'')+'" data-kuasi="'+(isKuasi?'kuasi':'')+'">'+esc(x.nama_barang)+' — stok '+x.sisa+' '+esc(x.satuan||'')+(isKuasi?' — FIFO Kuasi':'')+'</option>';
    }).join('')+
    '</select><input class="ki-jumlah" type="number" min="1" value="1" placeholder="Jumlah"><span class="kuasi-hint" aria-live="polite"></span><button type="button" class="btn-sm danger remove-item" title="Hapus baris barang" aria-label="Hapus baris barang">×</button></div>';
}

async function stockOpnamePage(){const [{data:rows,error},{data:items,error:ie}]=await Promise.all([client.from('riwayat_opname').select('*,barang:barang_id(nama_barang)').order('id',{ascending:false}).limit(200),client.from('barang').select('id,nama_barang,sisa,satuan').order('nama_barang')]);if(error||ie)throw(error||ie);return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">PERSEDIAAN</span><h2>Stock Opname</h2><p>Penyesuaian stok fisik terhadap stok sistem.</p></div><button class="primary" id="addOpname">＋ Rekam Stock Opname</button></div><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Barang</th><th>Sistem</th><th>Fisik</th><th>Selisih</th><th>Petugas</th><th>Keterangan</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${fmtDate(r.tanggal_opname)}</td><td>${esc(r.barang?.nama_barang||'-')}</td><td>${r.stok_sistem}</td><td>${r.stok_fisik}</td><td><span class="stock ${r.selisih<0?'low':''}">${r.selisih>0?'+':''}${r.selisih}</span></td><td>${esc(r.petugas||'-')}</td><td>${esc(r.keterangan||'-')}</td></tr>`).join('')||emptyRow(7)}</tbody></table></div></section>`}

async function kuasiPage(){const {data,error}=await client.from('stok_kuasi').select('id,barang_id,prefix_huruf,panjang_digit,digit_awal,digit_akhir,digit_sekarang,sisa_lembar,tanggal_masuk,nomor_dus,barang:barang_id(nama_barang,satuan)').gt('sisa_lembar',0).order('tanggal_masuk',{ascending:true}).order('id',{ascending:true});if(error)throw error;const grouped={};data.forEach(r=>{const k=r.barang_id;if(!grouped[k])grouped[k]=[];grouped[k].push(r)});return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">PERSEDIAAN</span><h2>Stok Kuasi</h2><p>Informasi batch dokumen berseri yang masih tersedia. Urutan batch mengikuti FIFO.</p></div><span class="status-pill">${data.length} batch aktif</span></div><div class="alert-box"><strong>FIFO:</strong> batch dengan tanggal masuk paling lama akan menjadi antrean pertama untuk distribusi.</div><div class="table-wrap"><table><thead><tr><th>Barang</th><th>Tgl Masuk</th><th>Rentang Awal</th><th>Nomor Tersedia</th><th>Sisa</th><th>Dus</th><th>Status</th></tr></thead><tbody>${data.map(r=>{const pad=Number(r.panjang_digit)||0,p=r.prefix_huruf||'',awal=p+String(r.digit_awal).padStart(pad,'0'),akhir=p+String(r.digit_akhir).padStart(pad,'0'),sekarang=p+String(r.digit_sekarang).padStart(pad,'0');const first=grouped[r.barang_id][0].id===r.id;return `<tr><td><strong>${esc(r.barang?.nama_barang||'-')}</strong><br><small>${esc(r.barang?.satuan||'')}</small></td><td>${fmtDate(r.tanggal_masuk)}</td><td>${esc(awal)} → ${esc(akhir)}</td><td><strong>${esc(sekarang)} → ${esc(akhir)}</strong></td><td><span class="stock">${r.sisa_lembar}</span></td><td>${esc(r.nomor_dus||'-')}</td><td>${first?'<span class="badge-soft success">Antrean Pertama</span>':'<span class="badge-soft">Menunggu</span>'}</td></tr>`}).join('')||emptyRow(7)}</tbody></table></div></section>`}

async function kartuPage(){
  const {data:items,error}=await client.from('barang').select('id,nama_barang,satuan,merk,tipe,sisa,harga_terakhir,kategori:kategori_id(nama_kategori)').order('nama_barang');
  if(error)throw error;
  return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">PERSEDIAAN</span><h2>Kartu Persediaan</h2><p>Pilih barang untuk melihat mutasi masuk, keluar, opname, dan saldo berjalan.</p></div></div>
  <div class="filter-bar"><div class="search-box">⌕<input id="kartuSearch" placeholder="Cari nama barang..."></div><select id="kartuBarang"><option value="">-- Pilih barang --</option>${items.map(r=>`<option value="${r.id}">${esc(r.nama_barang)} — ${esc(r.satuan||'-')}</option>`).join('')}</select></div>
  <div id="kartuDetail"></div>
  <div class="table-wrap"><table id="kartuTable"><thead><tr><th>Barang</th><th>Kategori</th><th>Satuan</th><th>Stok Saat Ini</th><th>Harga Terakhir</th><th>Nilai Sisa</th><th>Aksi</th></tr></thead><tbody>${items.map(r=>`<tr data-search="${esc([r.nama_barang,r.merk,r.tipe,r.satuan,r.kategori?.nama_kategori].join(' ').toLowerCase())}"><td><strong>${esc(r.nama_barang)}</strong></td><td>${esc(r.kategori?.nama_kategori||'-')}</td><td>${esc(r.satuan||'-')}</td><td><span class="stock ${Number(r.sisa)<=0?'low':''}">${r.sisa||0}</span></td><td>${rupiah(r.harga_terakhir)}</td><td>${rupiah((Number(r.sisa)||0)*(Number(r.harga_terakhir)||0))}</td><td><button class="btn-sm view-kartu" data-id="${r.id}">Lihat Mutasi</button></td></tr>`).join('')||emptyRow(7)}</tbody></table></div></section>`;
}
async function loadKartuDetail(id){
  const [{data:item,error:ie},{data:masuk,error:me},{data:keluar,error:ke},{data:opname,error:oe}]=await Promise.all([
    client.from('barang').select('id,nama_barang,satuan,merk,tipe,sisa,harga_terakhir,kategori:kategori_id(nama_kategori)').eq('id',id).single(),
    client.from('barang_masuk').select('id,tanggal_masuk,jumlah,harga_satuan,nama_penyerah,nama_penerima,nomor_awal,nomor_akhir,nomor_dus').eq('barang_id',id).order('tanggal_masuk',{ascending:true}).order('id',{ascending:true}),
    client.from('detail_barang_keluar').select('id,transaksi_keluar_id,jumlah,nomor_awal,nomor_akhir,nomor_dus,transaksi:transaksi_keluar_id(id,tanggal_keluar,penerima_nama,penerima_jabatan,penerima_nip,tujuan_ruangan,status,jenis_dokumen)').eq('barang_id',id).order('id',{ascending:true}),
    client.from('riwayat_opname').select('id,tanggal_opname,stok_sistem,stok_fisik,selisih,keterangan,petugas').eq('barang_id',id).order('tanggal_opname',{ascending:true}).order('id',{ascending:true})
  ]);
  if(ie||me||ke||oe)throw(ie||me||ke||oe);
  const rows=[
    ...(masuk||[]).map(r=>({date:r.tanggal_masuk,type:'MASUK',qtyIn:Number(r.jumlah)||0,qtyOut:0,price:Number(r.harga_satuan)||0,desc:'Penerimaan dari '+(r.nama_penyerah||'-')+(r.nomor_awal?' [Seri: '+r.nomor_awal+' - '+(r.nomor_akhir||'-')+']':'')+(r.nomor_dus?' [Dus: '+r.nomor_dus+']':''),id:r.id})),
    ...(keluar||[]).filter(r=>(r.transaksi?.status||'AKTIF')==='AKTIF').map(r=>({date:r.transaksi?.tanggal_keluar,type:'KELUAR',qtyIn:0,qtyOut:Number(r.jumlah)||0,price:0,desc:'Distribusi ke '+(r.transaksi?.penerima_nama||'-')+' ('+(r.transaksi?.tujuan_ruangan||'Umum')+')'+(r.nomor_awal?' [Seri: '+r.nomor_awal+(r.nomor_akhir?' - '+r.nomor_akhir:'')+']':'')+(r.nomor_dus?' [Dus: '+r.nomor_dus+']':''),id:r.id})),
    ...(opname||[]).map(r=>({date:r.tanggal_opname,type:r.selisih>0?'OPNAME IN':'OPNAME OUT',qtyIn:r.selisih>0?Number(r.selisih):0,qtyOut:r.selisih<0?Math.abs(Number(r.selisih)):0,price:0,desc:'Penyesuaian opname fisik: '+(r.keterangan||'-'),id:r.id}))
  ].filter(r=>r.date).sort((x,y)=>{
    const byDate=String(x.date).localeCompare(String(y.date));
    if(byDate!==0)return byDate;
    const rank={MASUK:1,'OPNAME IN':2,'OPNAME OUT':3,KELUAR:4};
    return (rank[x.type]||9)-(rank[y.type]||9)||Number(x.id)-Number(y.id);
  });
  let saldo=0;
  rows.forEach(r=>{saldo+=r.qtyIn-r.qtyOut;r.saldo=saldo});
  const nilai=(Number(item.sisa)||0)*(Number(item.harga_terakhir)||0);
  $('kartuDetail').innerHTML=`<section class="card page-card kartu-detail-card" data-barang-id="${id}"><div class="section-head"><div><span class="eyebrow">BUKU GUDANG</span><h3>${esc(item.nama_barang)}</h3><p>${esc(item.kategori?.nama_kategori||'-')} · ${esc(item.merk||'-')} / ${esc(item.tipe||'-')}</p></div><div class="detail-grid"><div><small>Saldo Fisik</small><strong>${item.sisa||0} ${esc(item.satuan||'')}</strong></div><div><small>Harga Terakhir</small><strong>${rupiah(item.harga_terakhir)}</strong></div><div><small>Nilai Sisa</small><strong>${rupiah(nilai)}</strong></div><div><small>Mutasi</small><strong>${rows.length} transaksi</strong></div></div></div><div class="table-wrap"><table><thead><tr><th>No</th><th>Tanggal</th><th>Jenis</th><th>Uraian / Kronologi</th><th>Harga Beli</th><th>Masuk</th><th>Keluar</th><th>Sisa Saldo</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${fmtDate(r.date)}</td><td><span class="badge-soft ${r.type==='MASUK'||r.type==='OPNAME IN'?'success':''}">${r.type}</span></td><td>${esc(r.desc)}</td><td>${r.price?rupiah(r.price):'-'}</td><td>${r.qtyIn||'-'}</td><td>${r.qtyOut||'-'}</td><td><strong>${r.saldo}</strong></td></tr>`).join('')||emptyRow(8)}</tbody></table></div><div class="form-actions"><button class="ghost" id="closeKartu">Tutup Detail</button></div></section>`;
  $('closeKartu').onclick=()=>$('kartuDetail').innerHTML='';
  enhanceTables($('kartuDetail'));
}
async function kategoriPage(){const {data,error}=await client.from('kategori').select('*').order('id');if(error)throw error;return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">DATA REFERENSI</span><h2>Kategori</h2><p>Kelola klasifikasi barang.</p></div>${profile?.role==='admin'?'<button class="primary" id="addKategori">＋ Tambah Kategori</button>':''}</div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Nama Kategori</th><th>Aksi</th></tr></thead><tbody>${data.map(r=>`<tr><td>#${r.id}</td><td><strong>${esc(r.nama_kategori)}</strong></td><td>${profile?.role==='admin'?'<div class="actions"><button class="btn-sm edit-kat" data-id="'+r.id+'">Edit</button><button class="btn-sm danger delete-kat" data-id="'+r.id+'">Hapus</button></div>':'<span class="badge-soft">Lihat</span>'}</td></tr>`).join('')||emptyRow(3)}</tbody></table></div></section>`}
async function penggunaPage(){
  if(profile?.role!=='admin')return '<section class="card error-card"><h2>Akses ditolak</h2><p>Halaman ini hanya dapat diakses admin.</p></section>';
  const {data,error}=await client.from('user_profiles').select('id,legacy_user_id,username,nama_lengkap,role,is_active,created_at').order('nama_lengkap');
  if(error)throw error;
  return '<section class="card page-card"><div class="section-head"><div><span class="eyebrow">ADMINISTRASI</span><h2>Kelola Pengguna</h2><p>Atur peran dan status akun SIPB. Pembuatan akun Auth dilakukan melalui Supabase Auth.</p></div><span class="status-pill">'+(data?.length||0)+' pengguna</span></div><div class="alert-box"><strong>Catatan:</strong> perubahan di sini berlaku pada hak akses database. Jangan menonaktifkan akun admin terakhir.</div><div class="table-wrap"><table><thead><tr><th>Pengguna</th><th>Username</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+(data||[]).map(u=>'<tr data-user="'+esc(u.id)+'"><td><strong>'+esc(u.nama_lengkap||'-')+'</strong><br><small>'+esc(u.id)+'</small></td><td>'+esc(u.username||'-')+'</td><td><select class="user-role" data-id="'+u.id+'"><option value="admin" '+(u.role==='admin'?'selected':'')+'>Admin</option><option value="user" '+(u.role==='user'?'selected':'')+'>User</option></select></td><td><button type="button" class="status-toggle '+(u.is_active?'on':'')+'" data-id="'+u.id+'" data-active="'+(u.is_active?'1':'0')+'"><span></span>'+(u.is_active?'Aktif':'Nonaktif')+'</button></td><td><button class="btn-sm user-save" data-id="'+u.id+'">Simpan</button></td></tr>').join('')||emptyRow(5)+'</tbody></table></div></section>';
}
async function pegawaiPage(){
  const {data,error}=await client.from('pegawai').select('*').order('nama_pegawai');
  if(error)throw error;
  return '<section class="card page-card"><div class="section-head"><div><span class="eyebrow">DATA REFERENSI</span><h2>Pegawai</h2><p>Kelola data pegawai untuk kebutuhan penyerah dan penerima barang.</p></div>'+
    (profile?.role==='admin'?'<button class="primary" id="addPegawai">＋ Tambah Pegawai</button>':'')+
    '</div><div class="filter-bar"><div class="search-box">⌕<input id="pegawaiSearch" placeholder="Cari nama, NIP, status, atau jabatan..."></div><span id="pegawaiCount" class="result-count">'+(data?.length||0)+' data</span></div>'+
    '<div class="table-wrap"><table id="pegawaiTable"><thead><tr><th>ID</th><th>Nama</th><th>NIP</th><th>Status</th><th>Jabatan</th><th>Aksi</th></tr></thead><tbody>'+
    ((data||[]).map(r=>'<tr data-search="'+esc([r.nama_pegawai,r.nip,r.status_pegawai,r.jabatan].join(' ').toLowerCase())+'"><td class="id-cell">#'+r.id+'</td><td><strong>'+esc(r.nama_pegawai)+'</strong></td><td>'+esc(r.nip||'-')+'</td><td>'+esc(r.status_pegawai||'-')+'</td><td>'+esc(r.jabatan||'-')+'</td><td>'+(profile?.role==='admin'?'<div class="actions"><button class="btn-sm edit-pegawai" data-id="'+r.id+'">Edit</button><button class="btn-sm danger delete-pegawai" data-id="'+r.id+'">Hapus</button></div>':'<span class="badge-soft">Lihat</span>')+'</td></tr>').join('')||emptyRow(6))+
    '</tbody></table></div></section>';
}
async function pegawaiForm(id=null){
  let row={nama_pegawai:'',nip:'',status_pegawai:'Non-ASN',jabatan:''};
  if(id){
    const {data,error}=await client.from('pegawai').select('*').eq('id',id).single();
    if(error)throw error; row=data;
  }
  return '<section class="card page-card"><div class="section-head"><div><span class="eyebrow">DATA REFERENSI</span><h2>'+ (id?'Edit Pegawai':'Tambah Pegawai') +'</h2><p>Data ini digunakan pada transaksi barang masuk dan barang keluar.</p></div><button class="ghost" id="backPegawai">← Kembali</button></div>'+
    '<div class="form-grid"><label>Nama Pegawai <input id="p_nama" maxlength="100" value="'+esc(row.nama_pegawai||'')+'"></label>'+
    '<label>NIP <input id="p_nip" maxlength="50" value="'+esc(row.nip||'')+'"></label>'+
    '<label>Status Kepegawaian <select id="p_status"><option value="ASN" '+(row.status_pegawai==='ASN'?'selected':'')+'>ASN</option><option value="PPPK" '+(row.status_pegawai==='PPPK'?'selected':'')+'>PPPK</option><option value="PNS" '+(row.status_pegawai==='PNS'?'selected':'')+'>PNS</option><option value="Non-ASN" '+(row.status_pegawai==='Non-ASN'||!row.status_pegawai?'selected':'')+'>Non-ASN</option></select></label>'+
    '<label>Jabatan <input id="p_jabatan" maxlength="100" value="'+esc(row.jabatan||'')+'"></label></div>'+
    '<div class="form-actions"><button class="primary" id="savePegawai">'+(id?'Simpan Perubahan':'Simpan Pegawai')+'</button><button class="ghost" id="cancelPegawai">Batal</button></div></section>';
}
async function riwayatPage(){
  const [{data:keluar,error:ke},{data:masuk,error:me},{data:opname,error:oe}]=await Promise.all([
    client.from('transaksi_keluar').select('*,detail_barang_keluar(id,jumlah,nomor_awal,nomor_akhir,nomor_dus,barang:barang_id(nama_barang,satuan))').order('tanggal_keluar',{ascending:false}).order('id',{ascending:false}).limit(200),
    client.from('barang_masuk').select('*,barang:barang_id(nama_barang,satuan)').order('tanggal_masuk',{ascending:false}).order('id',{ascending:false}).limit(200),
    client.from('riwayat_opname').select('*,barang:barang_id(nama_barang,satuan)').order('tanggal_opname',{ascending:false}).order('id',{ascending:false}).limit(200)
  ]);
  if(ke||me||oe)throw(ke||me||oe);
  const rows=[
    ...(masuk||[]).map(r=>({
      type:'MASUK',date:r.tanggal_masuk,id:r.id,party:r.nama_penyerah||'-',
      target:r.nama_penerima||'-',doc:'Penerimaan',status:'AKTIF',
      items:[{name:r.barang?.nama_barang||'-',unit:r.barang?.satuan||'',qty:r.jumlah,serial:r.nomor_awal&&r.nomor_akhir?r.nomor_awal+' → '+r.nomor_akhir:''}]
    })),
    ...(keluar||[]).filter(r=>(r.status||'AKTIF')==='AKTIF').map(r=>({
      type:'KELUAR',date:r.tanggal_keluar,id:r.id,party:r.penerima_nama||'-',
      target:r.tujuan_ruangan||'-',doc:r.jenis_dokumen||'Nota Dinas',status:r.status||'AKTIF',
      items:(r.detail_barang_keluar||[]).map(d=>({
        name:d.barang?.nama_barang||'-',unit:d.barang?.satuan||'',qty:d.jumlah,
        serial:d.nomor_awal&&d.nomor_akhir?d.nomor_awal+' → '+d.nomor_akhir:''
      }))
    })),
    ...(opname||[]).map(r=>({
      type:'OPNAME',date:r.tanggal_opname,id:r.id,party:r.petugas||'-',
      target:r.barang?.nama_barang||'-',doc:'Stock Opname',status:'DICATAT',
      items:[{name:r.barang?.nama_barang||'-',unit:r.barang?.satuan||'',qty:r.stok_fisik,
        serial:'Sistem '+(r.stok_sistem??0)+' → Fisik '+(r.stok_fisik??0)+' (Selisih '+(r.selisih??0)+')'}]
    }))
  ].sort((a,b)=>String(b.date).localeCompare(String(a.date))||Number(b.id)-Number(a.id));
  const key=(type,id)=>type+'_'+id;
  window.__sipbHistory=Object.fromEntries(rows.map(r=>[key(r.type,r.id),r]));
  const tableRows=rows.map(r=>{
    const cancelAction=profile?.role==='admin'&&r.type==='KELUAR'&&r.status==='AKTIF'
      ? '<button class="btn-sm danger history-cancel" data-id="'+r.id+'">Batalkan</button>'
      : '';
    const printAction=r.type==='KELUAR'
      ? '<button class="btn-sm sipb-inline-print" data-id="'+r.id+'">Cetak</button>'
      : '';
    return '<tr data-type="'+r.type+'" data-search="'+esc([r.date,r.party,r.target,r.doc,r.status,r.items.map(i=>i.name).join(' ')].join(' ').toLowerCase())+'">'+
      '<td><span class="badge-soft '+(r.type==='MASUK'?'success':'')+'">'+r.type+'</span></td>'+
      '<td>'+fmtDate(r.date)+'</td><td>#'+r.id+'</td><td><strong>'+esc(r.party)+'</strong></td>'+
      '<td>'+esc(r.target)+'</td><td>'+esc(r.doc)+'</td><td>'+r.items.length+'</td>'+
      '<td><span class="badge-soft '+(r.status==='AKTIF'?'success':'')+'">'+r.status+'</span></td>'+
      '<td><div class="actions"><button class="btn-sm history-detail" data-key="'+key(r.type,r.id)+'">Detail</button>'+
      cancelAction+printAction+'</div></td></tr>';
  }).join('');
  return '<section class="card page-card"><div class="section-head"><div><span class="eyebrow">AUDIT PERSEDIAAN</span><h2>Riwayat Transaksi</h2><p>Gabungan penerimaan dan pengeluaran barang, termasuk rincian item dan nomor seri Kuasi.</p></div><span class="status-pill">'+rows.length+' transaksi</span></div>'+
    '<div class="filter-bar"><div class="search-box">⌕<input id="historySearch" placeholder="Cari tanggal, penerima, barang, atau tujuan..."></div>'+
    '<select id="historyType"><option value="">Semua transaksi</option><option value="MASUK">Barang Masuk</option><option value="KELUAR">Barang Keluar</option><option value="OPNAME">Stock Opname</option></select></div>'+
    '<div class="table-wrap"><table id="historyTable"><thead><tr><th>Jenis</th><th>Tanggal</th><th>No.</th><th>Pihak</th><th>Tujuan/Penerima</th><th>Dokumen</th><th>Item</th><th>Status</th><th>Aksi</th></tr></thead>'+
    '<tbody>'+tableRows+(tableRows?'':emptyRow(9))+'</tbody></table></div></section>';
}
function showHistoryDetail(k){
  const r=window.__sipbHistory?.[k];if(!r)return;
  const box=document.createElement('div');box.className='modal-backdrop';
  box.innerHTML=`<div class="modal-card"><div class="modal-head"><div><span class="eyebrow">${r.type==='MASUK'?'PENERIMAAN':r.type==='OPNAME'?'STOCK OPNAME':'PENGELUARAN'}</span><h2>Detail Transaksi #${r.id}</h2></div><button class="modal-close" aria-label="Tutup">×</button></div><div class="detail-grid"><div><small>Tanggal</small><strong>${fmtDate(r.date)}</strong></div><div><small>Pihak</small><strong>${esc(r.party)}</strong></div><div><small>Tujuan/Penerima</small><strong>${esc(r.target)}</strong></div><div><small>Status</small><strong><span class="badge-soft ${r.status==='AKTIF'?'success':''}">${r.status}</span></strong></div></div><div class="table-wrap"><table><thead><tr><th>Barang</th><th>Satuan</th><th>Jumlah</th><th>Nomor Seri</th></tr></thead><tbody>${r.items.map(i=>'<tr><td><strong>'+esc(i.name)+'</strong></td><td>'+esc(i.unit||'-')+'</td><td>'+i.qty+'</td><td>'+esc(i.serial||'-')+'</td></tr>').join('')}</tbody></table></div></div>`;
  document.body.appendChild(box);enhanceTables(box);const close=()=>box.remove();box.querySelector('.modal-close').onclick=close;box.onclick=e=>{if(e.target===box)close()};
}
const menu=[['dashboard','Dashboard'],['barang_masuk','Barang Masuk'],['barang_keluar','Barang Keluar'],['stock_opname','Stock Opname'],['barang','Master Barang'],['kategori','Kategori'],['pegawai','Pegawai'],['kartu','Kartu Persediaan'],['kuasi','Stok Kuasi'],['riwayat','Riwayat Transaksi'],['pengguna','Kelola Pengguna']];
const topNavGroups=[
  {key:'dashboard',label:'Dashboard',icon:'dashboard',items:[['dashboard','Dashboard']]},
  {key:'barang',label:'Barang',icon:'barang',items:[['barang_masuk','Barang Masuk'],['barang_keluar','Barang Keluar'],['barang','Master Barang']]},
  {key:'persediaan',label:'Persediaan',icon:'stock_opname',items:[['stock_opname','Stock Opname'],['kartu','Kartu Persediaan'],['kuasi','Stok Kuasi']]},
  {key:'referensi',label:'Data Referensi',icon:'kategori',items:[['kategori','Kategori'],['pegawai','Pegawai']]},
  {key:'laporan',label:'Laporan',icon:'riwayat',items:[['riwayat','Riwayat Transaksi']]},
  {key:'admin',label:'Admin',icon:'pengguna',items:[['pengguna','Kelola Pengguna']],adminOnly:true}
];
async function renderApp(page='dashboard', restoreScrollY=null){
  topNavPinned=null;
  const r=await client.auth.getSession();
  session=r.data.session;
  if(!session)return showLogin();
  await loadProfile();
  document.documentElement.dataset.theme=uiTheme;
  root.innerHTML=`<div class="dashboard top-nav-layout"><main class="main"><header class="top">
    <div class="top-brand"><div class="top-brand-mark"><img src="${BANTEN_LOGO}" alt="Lambang Provinsi Banten"></div><div class="top-brand-copy"><strong>SIPB</strong><span>UPTD PPD Malingping</span></div></div>
    <nav class="top-nav" aria-label="Navigasi utama">${topNavGroups.filter(g=>!g.adminOnly||profile?.role==='admin').map(g=>topNavGroup(g,page)).join('')}</nav>
    <div class="top-title"><span>Administrasi Persediaan</span><h1>${menu.find(x=>x[0]===page)?.[1]||'Dashboard'}</h1></div>
    <div class="top-actions"><button class="theme-toggle" id="themeToggle" type="button" aria-label="Ubah tema"><span class="theme-icon">${uiTheme==='dark'?'☀':'☾'}</span><span>${uiTheme==='dark'?'Mode terang':'Mode gelap'}</span></button><span class="status-pill"><i></i> Sistem Online</span><button class="top-logout" id="logout" type="button" aria-label="Keluar">↪</button></div>
  </header><div id="content">${loading('Memuat data...')}</div></main></div>`;
  document.documentElement.dataset.theme=uiTheme;
  $('themeToggle').onclick=()=>{uiTheme=uiTheme==='dark'?'light':'dark';localStorage.setItem('sipb-theme',uiTheme);document.documentElement.dataset.theme=uiTheme;renderApp(page)};
  $('logout').onclick=async()=>{await client.auth.signOut();sidebarOpen=false;showLogin()};
  try{
    let html=page==='dashboard'?await dashboard():page==='barang'?await barangPage():page==='kategori'?await kategoriPage():page==='pegawai'?await pegawaiPage():page==='barang_masuk'?await barangMasukForm():page==='barang_keluar'?await barangKeluarForm():page==='stock_opname'?await stockOpnamePage():page==='kartu'?await kartuPage():page==='kuasi'?await kuasiPage():page==='riwayat'?await riwayatPage():page==='pengguna'?await penggunaPage():await dashboard();
    $('content').innerHTML=html;
    bind(page);
    enhanceTables(document.getElementById('content'));
    if(page==='dashboard')renderDashboardCharts();
    if(Number.isFinite(restoreScrollY)){
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        window.scrollTo(0,restoreScrollY);
      }));
    }
  }catch(e){
    $('content').innerHTML=`<section class="card error-card"><h2>Gagal memuat data</h2><p>${esc(e.message)}</p><button class="primary retry" data-page="${page}">Coba lagi</button></section>`;
    if(Number.isFinite(restoreScrollY)){
      requestAnimationFrame(()=>window.scrollTo(0,restoreScrollY));
    }
  }
}
function navSvg(key){const p={dashboard:'<path d="m3 10 9-7 9 7"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/>',barang_masuk:'<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',barang_keluar:'<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>',stock_opname:'<path d="m5 12 4 4L19 6"/><rect x="3" y="3" width="18" height="18" rx="3"/>',barang:'<path d="M4 6h16v14H4z"/><path d="M8 6V4h8v2"/><path d="M8 11h8"/><path d="M8 15h5"/>',kategori:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>',pegawai:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21c.8-3.7 3-5.5 7-5.5s6.2 1.8 7 5.5"/>',kartu:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>',kuasi:'<path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>',riwayat:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',pengguna:'<circle cx="12" cy="8" r="3"/><path d="M5 21c1-3.3 3.3-5 7-5s6 1.7 7 5"/>'};return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(p[key]||p.dashboard)+'</svg>'}
function navItem(m,page){return '<a href="#'+m[0]+'" data-page="'+m[0]+'" class="'+(page===m[0]?'active':'')+'"><span class="nav-icon">'+navSvg(m[0])+'</span><span>'+m[1]+'</span></a>'}
function topNavGroup(group,page){
  const active=group.items.some(m=>page===m[0]);
  if(group.items.length===1){
    const m=group.items[0];
    return '<a href="#'+m[0]+'" data-page="'+m[0]+'" class="top-nav-link '+(active?'active':'')+'"><span class="nav-icon">'+navSvg(group.icon)+'</span><span>'+group.label+'</span></a>';
  }
  return '<div class="top-nav-group '+(active?'active ':'')+(topNavPinned===group.key?'open':'')+'" data-top-group="'+group.key+'"><button type="button" class="top-nav-trigger" aria-haspopup="true" aria-expanded="'+(topNavPinned===group.key?'true':'false')+'"><span class="nav-icon">'+navSvg(group.icon)+'</span><span>'+group.label+'</span><span class="nav-caret" aria-hidden="true">⌄</span></button><div class="top-submenu">'+
    group.items.map(m=>'<a href="#'+m[0]+'" data-page="'+m[0]+'" class="'+(page===m[0]?'active':'')+'"><span class="nav-icon">'+navSvg(m[0])+'</span><span>'+m[1]+'</span></a>').join('')+
    '</div></div>';
}

function renderDashboardCharts(){
  if(typeof Chart==='undefined')return;
  const data=window.SIPB_DASHBOARD_CHARTS||{};
  const text=getComputedStyle(document.documentElement);
  const muted=text.getPropertyValue('--muted').trim()||'#718096';
  const grid=text.getPropertyValue('--chart-grid').trim()||'rgba(120,140,160,.15)';
  const blue=text.getPropertyValue('--blue-700').trim()||'#0b5cab';
  const accent=text.getPropertyValue('--blue-700').trim()||'#0B5CAB';
  window.SIPBChartInstances?.forEach(x=>x?.destroy?.());
  window.SIPBChartInstances=[];
  const bar=document.getElementById('categoryChart');
  const line=document.getElementById('outgoingChart');
  if(bar){
    window.SIPBChartInstances.push(new Chart(bar,{type:'bar',data:{labels:data.categoryLabels||[],datasets:[{label:'Jumlah barang',data:data.categoryData||[],backgroundColor:accent,borderRadius:7,maxBarThickness:34}]},options:{responsive:true,maintainAspectRatio:false,animation:{duration:900,easing:'easeOutQuart'},plugins:{legend:{display:false}},scales:{x:{ticks:{color:muted,font:{size:11}},grid:{display:false}},y:{beginAtZero:true,ticks:{precision:0,color:muted,font:{size:11}},grid:{color:grid}}}}}));
  }
  if(line){
    window.SIPBChartInstances.push(new Chart(line,{type:'line',data:{labels:data.monthLabels||[],datasets:[{label:'Transaksi aktif',data:data.monthData||[],borderColor:blue,backgroundColor:'rgba(11,92,171,.10)',fill:true,tension:.35,pointRadius:4,pointHoverRadius:6,pointBackgroundColor:accent,pointBorderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,animation:{duration:1100,easing:'easeOutQuart'},plugins:{legend:{display:false}},scales:{x:{ticks:{color:muted,font:{size:11}},grid:{display:false}},y:{beginAtZero:true,ticks:{precision:0,color:muted,font:{size:11}},grid:{color:grid}}}}}));
  }
}

function bind(page){
  if(page==='pengguna'){
    document.querySelectorAll('.status-toggle').forEach(toggle=>toggle.onclick=()=>{
      const active=toggle.dataset.active==='1';
      toggle.dataset.active=active?'0':'1';
      toggle.classList.toggle('on',!active);
      toggle.innerHTML='<span></span>'+(!active?'Aktif':'Nonaktif');
    });
    document.querySelectorAll('.user-save').forEach(btn=>btn.onclick=async()=>{
      const id=btn.dataset.id;
      const role=document.querySelector('.user-role[data-id="'+id+'"]')?.value;
      const active=document.querySelector('.status-toggle[data-id="'+id+'"]')?.dataset.active==='1';
      if(!id||!role)return toast('Data pengguna tidak lengkap.','error');
      if(id===session.user.id&&(role!=='admin'||!active))
        return toast('Akun admin yang sedang digunakan tidak boleh diturunkan atau dinonaktifkan.','error');
      btn.disabled=true;
      btn.textContent='Menyimpan...';
      try{
        const {error}=await client.rpc('manage_user_profile',{p_user_id:id,p_role:role,p_is_active:active});
        if(error)throw error;
        toast('Profil pengguna diperbarui.');
        renderApp('pengguna');
      }catch(e){
        btn.disabled=false;
        btn.textContent='Simpan';
        fail(e);
      }
    });
  }
  if(page==='kartu'){
    const search=$('kartuSearch'),select=$('kartuBarang');
    const apply=()=>{const q=search.value.toLowerCase().trim();document.querySelectorAll('#kartuTable tbody tr[data-search]').forEach(r=>r.style.display=!q||r.dataset.search.includes(q)?'':'none')};
    search.oninput=apply;
    document.querySelectorAll('.view-kartu').forEach(btn=>btn.onclick=async()=>{select.value=btn.dataset.id;$('kartuDetail').innerHTML=loading('Memuat kartu persediaan...');try{await loadKartuDetail(Number(btn.dataset.id))}catch(e){fail(e);$('kartuDetail').innerHTML=''}});
    select.onchange=async()=>{if(!select.value){$('kartuDetail').innerHTML='';return} $('kartuDetail').innerHTML=loading('Memuat kartu persediaan...');try{await loadKartuDetail(Number(select.value))}catch(e){fail(e);$('kartuDetail').innerHTML=''}};
  }
  if(page==='riwayat'){
    const apply=()=>{const q=$('historySearch').value.toLowerCase().trim(),t=$('historyType').value;document.querySelectorAll('#historyTable tbody tr[data-search]').forEach(r=>{r.style.display=(!q||r.dataset.search.includes(q))&&(!t||r.dataset.type===t)?'':'none'})};
    $('historySearch').oninput=apply;$('historyType').onchange=apply;
    document.querySelectorAll('.history-detail').forEach(b=>b.onclick=()=>showHistoryDetail(b.dataset.key));
    document.querySelectorAll('.history-cancel').forEach(btn=>btn.onclick=async()=>{
      const id=Number(btn.dataset.id); if(!id)return;
      if(!(await sipbConfirm('Batalkan transaksi barang keluar #'+id+'? Stok akan dikembalikan dan transaksi tetap tercatat sebagai DIBATALKAN.')))return;
      btn.disabled=true; btn.textContent='Memproses...';
      try{
        await cancelAndDeleteOutgoing(id);
        toast('Transaksi #'+id+' dibatalkan dan riwayatnya dihapus. Stok telah dikembalikan.');
        renderApp('riwayat');
      }catch(e){btn.disabled=false;btn.textContent='Batalkan';fail(e)}
    });
  }
  if(page==='barang'){
    const addBarang=$('addBarang'); if(addBarang) addBarang.onclick=async()=>{$('content').innerHTML=await barangForm();bindForm()};
    const apply=()=>{const q=$('barangSearch').value.toLowerCase().trim(),cat=$('barangFilter').value;let shown=0;document.querySelectorAll('#barangTable tbody tr[data-search]').forEach(r=>{const ok=(!q||r.dataset.search.includes(q))&&(!cat||r.dataset.kategori===cat);r.style.display=ok?'':'none';if(ok)shown++});$('barangCount').textContent=shown+' data'};
    $('barangSearch').oninput=apply;$('barangFilter').onchange=apply;
    document.querySelectorAll('.edit-barang').forEach(btn=>btn.onclick=async()=>{$('content').innerHTML=loading('Memuat barang...');$('content').innerHTML=await barangForm(+btn.dataset.id);bindForm(+btn.dataset.id)});
    document.querySelectorAll('.delete-barang').forEach(btn=>btn.onclick=async()=>{
      const id=Number(btn.dataset.id);
      if(!id)return;
      if(!(await sipbConfirm('Hapus barang ini dari Master Barang? Penghapusan hanya diizinkan jika barang sudah tidak memiliki riwayat Barang Keluar. Data terkait barang yang memang masih tersimpan akan ikut mengikuti aturan database.')))return;
      btn.disabled=true;
      try{
        const {data,error}=await client.rpc('delete_barang_if_no_outgoing',{p_barang_id:id});
        if(error)throw error;
        toast(data?.message||'Barang berhasil dihapus.');
        renderApp('barang');
      }catch(e){
        btn.disabled=false;
        fail(e);
      }
    });
  }
  if(page==='pegawai'){
    const add=$('addPegawai');
    if(add) add.onclick=async()=>{try{$('content').innerHTML=await pegawaiForm();bindPegawaiForm()}catch(e){fail(e)}};
    const apply=()=>{const q=$('pegawaiSearch').value.toLowerCase().trim();let shown=0;document.querySelectorAll('#pegawaiTable tbody tr[data-search]').forEach(r=>{const ok=!q||r.dataset.search.includes(q);r.style.display=ok?'':'none';if(ok)shown++});$('pegawaiCount').textContent=shown+' data'};
    $('pegawaiSearch').oninput=apply;
    document.querySelectorAll('.edit-pegawai').forEach(btn=>btn.onclick=async()=>{try{$('content').innerHTML=loading('Memuat pegawai...');$('content').innerHTML=await pegawaiForm(Number(btn.dataset.id));bindPegawaiForm(Number(btn.dataset.id))}catch(e){fail(e)}});
    document.querySelectorAll('.delete-pegawai').forEach(btn=>btn.onclick=async()=>{if(!(await sipbConfirm('Hapus data pegawai ini? Data historis transaksi tetap tersimpan.')))return;btn.disabled=true;const {error}=await client.from('pegawai').delete().eq('id',Number(btn.dataset.id));if(error){btn.disabled=false;return fail(error)}toast('Pegawai berhasil dihapus.');renderApp('pegawai')});
  }
  if(page==='kategori'){
    const addKategori=$('addKategori'); if(addKategori) addKategori.onclick=async()=>{const n=await sipbPrompt('Nama kategori baru:');if(!n?.trim())return;const {error}=await client.from('kategori').insert({nama_kategori:n.trim()});if(error)return fail(error);toast('Kategori ditambahkan');renderApp('kategori')};
    document.querySelectorAll('.edit-kat').forEach(btn=>btn.onclick=async()=>{const {data,error}=await client.from('kategori').select('*').eq('id',+btn.dataset.id).single();if(error)return fail(error);const n=await sipbPrompt('Nama kategori:',data.nama_kategori);if(!n?.trim())return;const {error:e}=await client.from('kategori').update({nama_kategori:n.trim()}).eq('id',+btn.dataset.id);if(e)return fail(e);toast('Kategori diperbarui');renderApp('kategori')});
    document.querySelectorAll('.delete-kat').forEach(btn=>btn.onclick=async()=>{if(!(await sipbConfirm('Hapus kategori ini? Barang yang masih memakai kategori ini dapat mencegah penghapusan.')))return;const {error}=await client.from('kategori').delete().eq('id',+btn.dataset.id);if(error)return fail(error);toast('Kategori dihapus');renderApp('kategori')});
  }
  if(page==='barang_masuk'){
    bindMasukForm().catch(fail);
  }
  if(page==='barang_keluar'){
    bindKeluarForm().catch(fail);
  }  if(page==='stock_opname') $('addOpname').onclick=async()=>{$('content').innerHTML=await stockOpnameForm();bindOpnameForm()};
}
function bindForm(id){$('backBarang').onclick=()=>renderApp('barang');$('cancelBarang').onclick=()=>renderApp('barang');$('saveBarang').onclick=async()=>{const payload={nama_barang:$('b_nama').value.trim(),kategori_id:$('b_kat').value?+$('b_kat').value:null,tipe:$('b_tipe').value.trim()||'-',merk:$('b_merk').value.trim()||'-',satuan:$('b_satuan').value.trim(),stok_minimum:+$('b_min').value||0};if(!payload.nama_barang)return toast('Nama barang wajib diisi.','error');const btn=$('saveBarang');btn.disabled=true;btn.textContent='Menyimpan...';const q=id?client.from('barang').update(payload).eq('id',id):client.from('barang').insert(payload);const {error}=await q;if(error){btn.disabled=false;btn.textContent=id?'Simpan Perubahan':'Simpan Barang';return fail(error)}toast(id?'Barang diperbarui':'Barang ditambahkan');renderApp('barang')}}
document.addEventListener('click',e=>{
  const trigger=e.target.closest('.top-nav-trigger');
  if(trigger){
    e.preventDefault();
    const group=trigger.closest('.top-nav-group');
    if(group){
      const key=group.dataset.topGroup;
      topNavPinned=topNavPinned===key?null:key;
      document.querySelectorAll('.top-nav-group').forEach(g=>{
        const open=g.dataset.topGroup===topNavPinned;
        g.classList.toggle('open',open);
        g.classList.remove('pinned');
        g.querySelector('.top-nav-trigger')?.setAttribute('aria-expanded',open?'true':'false');
      });
    }
    return;
  }
  const target=e.target.closest('[data-page]');
  if(!target)return;
  e.preventDefault();
  const page=target.dataset.page;
  if(page){
    const currentScrollY=window.scrollY;
    renderApp(page,currentScrollY);
  }
});
async function init(){if(!cfg||!cfg.supabaseUrl||!cfg.supabaseAnonKey||cfg.supabaseUrl.includes('YOUR-PROJECT'))return showLogin('Konfigurasi Supabase belum tersedia.');client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});client.auth.onAuthStateChange(e=>{if(e==='SIGNED_OUT')showLogin()});const r=await client.auth.getSession();session=r.data.session;if(session)renderApp();else showLogin()}
init()
async function stockOpnameForm(){
  const {data:items,error}=await client.from('barang')
    .select('id,nama_barang,satuan,sisa,stok_minimum,kategori:kategori_id(nama_kategori)')
    .order('nama_barang');
  if(error)throw error;
  const eligible=(items||[]).filter(x=>!String(x.kategori?.nama_kategori||'').toLowerCase().includes('kuasi'));
  return '<section class="card page-card"><div class="section-head"><div><span class="eyebrow">PERSEDIAAN</span><h2>Rekam Stock Opname</h2><p>Catat stok fisik dan biarkan database menghitung selisih serta memperbarui saldo secara atomik.</p></div><button class="ghost" id="backOpname">← Kembali</button></div>'+
    '<div class="alert-box"><strong>Catatan:</strong> barang Kuasi tidak ditampilkan karena saldo Kuasi harus direkonsiliasi melalui batch/serial FIFO.</div>'+
    '<div class="form-grid"><label>Barang <select id="o_barang"><option value="">- Pilih barang -</option>'+
    eligible.map(x=>'<option value="'+x.id+'" data-stock="'+(x.sisa??0)+'">'+esc(x.nama_barang)+' — stok '+(x.sisa??0)+' '+esc(x.satuan||'')+'</option>').join('')+
    '</select></label><label>Stok Sistem <input id="o_sistem" type="number" value="0" readonly></label>'+
    '<label>Stok Fisik <input id="o_fisik" type="number" min="0" step="1" value="0"></label>'+
    '<label>Tanggal Opname <input id="o_tanggal" type="date" value="'+localDate()+'"></label>'+
    '<label>Petugas <input id="o_petugas" value="'+esc(profile?.nama_lengkap||session?.user?.email||'')+'" required></label>'+
    '<label style="grid-column:1/-1">Keterangan <textarea id="o_keterangan" rows="3" placeholder="Contoh: Hasil pemeriksaan fisik gudang"></textarea></label></div>'+
    '<div class="form-actions"><button class="primary" id="saveOpname">Simpan Stock Opname</button><button class="ghost" id="cancelOpname">Batal</button></div></section>';
}
async function bindOpnameForm(){
  $('backOpname').onclick=()=>renderApp('stock_opname');
  $('cancelOpname').onclick=()=>renderApp('stock_opname');
  $('o_barang').onchange=()=>{const o=$('o_barang').selectedOptions[0];$('o_sistem').value=o?o.dataset.stock||0:0};
  $('saveOpname').onclick=async()=>{
    const id=Number($('o_barang').value),fisik=Number($('o_fisik').value);
    if(!id)return toast('Pilih barang.','error');
    if(!Number.isInteger(fisik)||fisik<0)return toast('Stok fisik harus bilangan bulat nol atau lebih.','error');
    const btn=$('saveOpname');btn.disabled=true;btn.textContent='Menyimpan...';
    try{
      const result=await client.rpc('record_stock_opname',{
        p_tanggal:$('o_tanggal').value,p_barang_id:id,p_stok_fisik:fisik,
        p_keterangan:$('o_keterangan').value.trim()||null,
        p_petugas:$('o_petugas').value.trim()||profile.nama_lengkap||session.user.email
      });
      if(result.error)throw result.error;
      toast('Stock opname berhasil disimpan (#'+(result.data&&result.data.id||'')+').');
      renderApp('stock_opname');
    }catch(e){
      btn.disabled=false;btn.textContent='Simpan Stock Opname';fail(e);
    }
  };
}
async function bindKeluarForm(){
  const result=await client.from('barang').select('id,nama_barang,satuan,sisa,kategori:kategori_id(id,nama_kategori)').order('nama_barang');
  if(result.error)throw result.error;
  const items=result.data||[];
  const pegawaiQ=await client.from('pegawai').select('id,nama_pegawai,nip,status_pegawai,jabatan').order('nama_pegawai');
  if(pegawaiQ.error)throw pegawaiQ.error;
  const pegawai=pegawaiQ.data||[];
  $('backKeluar').onclick=()=>renderApp('dashboard');
  $('cancelKeluar').onclick=()=>renderApp('dashboard');

  const fillPegawai=(selectId,jabatanId,nipId)=>{
    const select=$(selectId), jabatan=$(jabatanId), nip=$(nipId);
    if(!select)return;
    const opt=select.selectedOptions[0];
    jabatan.value=opt?.dataset.jabatan||'';
    nip.value=opt?.dataset.nip||'';
  };
  $('k_penyerah').onchange=()=>fillPegawai('k_penyerah','k_penyerah_jabatan','k_penyerah_nip');
  $('k_penerima').onchange=()=>fillPegawai('k_penerima','k_jabatan','k_nip');
  const preferred=pegawai.find(p=>String(p.nama_pegawai||'').trim().toLowerCase()===String(profile?.nama_lengkap||'').trim().toLowerCase());
  if(preferred){$('k_penyerah').value=preferred.nama_pegawai;fillPegawai('k_penyerah','k_penyerah_jabatan','k_penyerah_nip');}

  const box=$('keluarItems');
  const syncRemoveButtons=()=>{
    const rows=box.querySelectorAll('.transaction-row');
    const allowRemove=rows.length>1;
    box.querySelectorAll('.remove-item').forEach(btn=>{
      btn.disabled=!allowRemove;
      btn.title=allowRemove?'Hapus baris barang':'Minimal satu barang harus tetap ada';
      btn.setAttribute('aria-label',allowRemove?'Hapus baris barang':'Minimal satu barang harus tetap ada');
    });
  };
  box.addEventListener('click',e=>{
    const btn=e.target.closest('.remove-item');
    if(!btn||btn.disabled)return;
    const row=btn.closest('.transaction-row');
    if(row)row.remove();
    syncRemoveButtons();
  });
  const wireRows=()=>{
    box.querySelectorAll('.ki-barang').forEach(select=>select.onchange=async()=>{
      const hint=select.closest('.transaction-row').querySelector('.kuasi-hint');
      if(select.selectedOptions[0]?.dataset.kuasi==='kuasi'){
        const q=await client.from('stok_kuasi').select('sisa_lembar').eq('barang_id',select.value).gt('sisa_lembar',0);
        if(q.error)throw q.error;
        const total=(q.data||[]).reduce((sum,row)=>sum+Number(row.sisa_lembar||0),0);
        hint.textContent='FIFO: '+total+' lembar pada batch aktif';
        hint.className='kuasi-hint'+(total<1?' warning':'');
      }else{hint.textContent='';hint.className='kuasi-hint'}
    });
    syncRemoveButtons();
  };
  const add=()=>{box.insertAdjacentHTML('beforeend',keluarItemRow(items));wireRows()};
  add();
  $('addItemKeluar').onclick=add;
  $('saveKeluar').onclick=async()=>{
    const penyerah=$('k_penyerah').value.trim(),penerima=$('k_penerima').value.trim(),tujuan=$('k_tujuan').value.trim();
    if(!penyerah)return toast('Pilih penyerah barang.','error');
    if(!penerima)return toast('Pilih penerima barang.','error');
    if(!tujuan)return toast('Tujuan/ruangan wajib diisi.','error');
    const rows=[...box.querySelectorAll('.transaction-row')].map(row=>({barang_id:Number(row.querySelector('.ki-barang').value),jumlah:Number(row.querySelector('.ki-jumlah').value)})).filter(x=>x.barang_id);
    if(!rows.length)return toast('Tambahkan minimal satu barang.','error');
    for(const x of rows)if(!Number.isInteger(x.jumlah)||x.jumlah<1)return toast('Jumlah barang harus bilangan bulat positif.','error');
    const totals={};rows.forEach(x=>{totals[x.barang_id]=(totals[x.barang_id]||0)+x.jumlah});
    for(const id in totals){const item=items.find(x=>x.id==id);if(!item||totals[id]>Number(item.sisa||0))return toast('Stok '+(item?item.nama_barang:id)+' tidak mencukupi.','error')}
    const btn=$('saveKeluar');btn.disabled=true;btn.textContent='Memproses transaksi...';
    try{
      const result=await client.rpc('record_barang_keluar',{
        p_tanggal:$('k_tanggal').value,
        p_penyerah_nama:penyerah,
        p_penyerah_jabatan:$('k_penyerah_jabatan').value.trim()||null,
        p_penyerah_nip:$('k_penyerah_nip').value.trim()||null,
        p_penerima_nama:penerima,
        p_penerima_jabatan:$('k_jabatan').value.trim()||null,
        p_penerima_nip:$('k_nip').value.trim()||null,
        p_tujuan_ruangan:tujuan,
        p_jenis_dokumen:'Nota Dinas',p_items:rows
      });
      if(result.error)throw result.error;
      toast('Barang keluar berhasil direkam (#'+(result.data?.id||'')+').');
      renderApp('barang_keluar');
    }catch(e){btn.disabled=false;btn.textContent='Rekam Transaksi & Kurangi Stok';fail(e)}
  };
}
async function bindMasukForm(){
  $('backMasuk').onclick=()=>renderApp('dashboard');
  $('cancelMasuk').onclick=()=>renderApp('dashboard');
  const toggle=()=>{
    const sel=$('m_barang'), opt=sel.selectedOptions[0];
    const isNew=!sel.value, kat=$('m_kat').selectedOptions[0];
    const kuasi=isNew?(kat?.dataset.kuasi==='1'):(opt?.dataset.kuasi==='1');
    $('masukKuasi').style.display=kuasi?'block':'none';
    if(!kuasi){$('m_dus').value='';$('m_awal').value='';$('m_akhir').value=''}
  };
  $('m_barang').onchange=toggle;$('m_kat').onchange=toggle;toggle();
  $('saveMasuk').onclick=async()=>{
    const existing=Number($('m_barang').value)||null,nama=$('m_nama').value.trim(),jumlah=Number($('m_jumlah').value),harga=Number($('m_harga').value);
    if(!jumlah||jumlah<1)return toast('Jumlah harus lebih dari 0.','error');
    if(harga<0||Number.isNaN(harga))return toast('Harga tidak valid.','error');
    if(!existing&&!nama)return toast('Pilih barang atau isi nama barang baru.','error');
    if(!existing&&!Number($('m_kat').value))return toast('Kategori barang baru wajib dipilih.','error');
    const btn=$('saveMasuk');btn.disabled=true;btn.textContent='Memproses transaksi...';
    try{
      const result=await client.rpc('record_barang_masuk',{
        p_barang_id:existing,p_kategori_id:Number($('m_kat').value)||null,
        p_nama_barang:nama,p_tipe:$('m_tipe').value.trim()||'-',p_merk:$('m_merk').value.trim()||'-',
        p_satuan:$('m_satuan').value.trim()||'PCS',p_jumlah:jumlah,p_harga_satuan:harga,
        p_sumber_dana:$('m_sumber').value,p_tanggal:$('m_tanggal').value,
        p_nama_penyerah:$('m_penyerah').value.trim()||'Pihak ke Tiga',
        p_nama_penerima:$('m_penerima').value.trim()||profile?.nama_lengkap||session.user.email,
        p_nomor_dus:$('m_dus').value.trim()||null,p_nomor_awal:$('m_awal').value.trim()||null,p_nomor_akhir:$('m_akhir').value.trim()||null
      });
      if(result.error)throw result.error;
      toast('Barang masuk berhasil direkam (#'+(result.data?.id||'')+'). Stok diperbarui atomik.');
      renderApp('barang_masuk');
    }catch(e){btn.disabled=false;btn.textContent='Rekam & Tambah Stok';fail(e)}
  };
}


async function bindPegawaiForm(id=null){
  $('backPegawai').onclick=()=>renderApp('pegawai');
  $('cancelPegawai').onclick=()=>renderApp('pegawai');
  $('savePegawai').onclick=async()=>{
    const payload={nama_pegawai:$('p_nama').value.trim(),nip:$('p_nip').value.trim()||null,status_pegawai:$('p_status').value,jabatan:$('p_jabatan').value.trim()||null};
    if(!payload.nama_pegawai)return toast('Nama pegawai wajib diisi.','error');
    const btn=$('savePegawai');btn.disabled=true;btn.textContent='Menyimpan...';
    try{
      const q=id?client.from('pegawai').update(payload).eq('id',id):client.from('pegawai').insert(payload);
      const {error}=await q;if(error)throw error;
      toast(id?'Data pegawai diperbarui.':'Pegawai berhasil ditambahkan.');renderApp('pegawai');
    }catch(e){btn.disabled=false;btn.textContent=id?'Simpan Perubahan':'Simpan Pegawai';fail(e)}
  };
}
