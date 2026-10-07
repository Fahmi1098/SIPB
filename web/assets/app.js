const root=document.getElementById('app');
const cfg=window.SIPB_CONFIG;
let client=null,session=null,profile=null;
let currentPage='dashboard';
let renderVersion=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const rupiah=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v)||0);
const formatAngka=v=>{const n=Number(v);return Number.isFinite(n)?Math.trunc(n).toLocaleString('id-ID'):''};
const parseAngka=v=>{const s=String(v??'').replace(/[^0-9-]/g,'');return s?Number(s):0};
const formatInputAngka=input=>{if(!input)return;const raw=String(input.value??'').replace(/[^0-9]/g,'');input.value=raw?Number(raw).toLocaleString('id-ID'):''};
document.addEventListener('input',e=>{const el=e.target;if(el?.matches?.('[data-number-format="integer"]')){const before=el.value;formatInputAngka(el);if(before!==el.value){try{el.setSelectionRange(el.value.length,el.value.length)}catch(_){}}}});
const fmtDate=v=>v?new Intl.DateTimeFormat('id-ID',{dateStyle:'medium'}).format(new Date(v)):'-';
const localDate=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const $=id=>document.getElementById(id);
const BANTEN_LOGO='assets/logo_banten.png';
let sidebarOpen=false;
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
function tableFileName(table){
  const card=table.closest('.page-card,.recent,.modal-card');
  const title=card?.querySelector('h2,h3')?.textContent?.trim()||document.title||'SIPB';
  const slug=title.replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-').toLowerCase()||'tabel';
  return 'SIPB-'+slug+'-'+localDate();
}
function tableExportData(table){
  const headers=[...(table.tHead?.rows?.[0]?.cells||[])]
    .map((th,i)=>({i,label:th.textContent.replace(/[↑↓↕]/g,'').trim()}))
    .filter(x=>x.label&&x.label!=='Aksi');
  const bodyRows=[...(table.tBodies?.[0]?.rows||[])];
  const pagedHidden=bodyRows.filter(row=>row.classList.contains('table-pagination-hidden'));
  pagedHidden.forEach(row=>row.classList.remove('table-pagination-hidden'));
  const rows=bodyRows.filter(row=>!row.querySelector('.empty')&&row.dataset.tableSearchMatch!=='0'&&getComputedStyle(row).display!=='none');
  pagedHidden.forEach(row=>row.classList.add('table-pagination-hidden'));
  return {
    headers:headers.map(x=>x.label),
    rows:rows.map(row=>headers.map(x=>String(row.cells[x.i]?.innerText||'').replace(/\s+/g,' ').trim()))
  };
}
function downloadTableBlob(blob,fileName){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function exportTableCSV(table){
  const data=tableExportData(table);
  if(!data.rows.length){toast('Tidak ada data yang dapat diekspor.','error');return}
  const csv=[data.headers,...data.rows].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  downloadTableBlob(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),tableFileName(table)+'.csv');
  toast('CSV berhasil diekspor.');
}
function exportTableExcel(table){
  const data=tableExportData(table);
  if(!data.rows.length){toast('Tidak ada data yang dapat diekspor.','error');return}
  if(window.XLSX){
    const ws=window.XLSX.utils.aoa_to_sheet([data.headers,...data.rows]);
    const wb=window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb,ws,'Data');
    window.XLSX.writeFile(wb,tableFileName(table)+'.xlsx');
    toast('Excel berhasil diekspor.');
    return;
  }
  const head=data.headers.map(v=>'<th>'+esc(v)+'</th>').join('');
  const body=data.rows.map(row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('');
  const html='<!doctype html><html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table></body></html>';
  downloadTableBlob(new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'}),tableFileName(table)+'.xls');
  toast('Excel kompatibel berhasil diekspor.');
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
          table.refreshPagination?.();
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
        table.refreshPagination?.();
      });
      dirWrap.querySelector('select').addEventListener('change',()=>{
        if(sortSel.value==='')return;
        const direction=dirWrap.querySelector('select').value==='desc'?-1:1;
        table.dataset.sortCol=sortSel.value;
        table.dataset.sortDir=String(direction);
        sortTable(table,Number(sortSel.value),direction);
        table.refreshPagination?.();
      });
    }
    if(!toolbar.querySelector('.table-filter-search') && !toolbar.querySelector('.search-box')){
      const search=document.createElement('div');
      search.className='search-box table-filter-search-box';
      search.innerHTML='<span aria-hidden="true">⌕</span><input class="table-filter-search" type="search" placeholder="Cari di tabel...">';
      toolbar.insertBefore(search,toolbar.firstChild);
      search.querySelector('input').addEventListener('input',e=>{
        const q=e.target.value.toLowerCase().trim();
        table.tBodies?.[0]?.querySelectorAll('tr').forEach(row=>{
          if(row.querySelector('.empty'))return;
          row.dataset.tableSearchMatch=!q||row.textContent.toLowerCase().includes(q)?'1':'0';
        });
        table.dataset.page='1';
        table.refreshPagination?.();
      });
    }
    if(!toolbar.querySelector('.table-export-actions')){
      const actions=document.createElement('div');
      actions.className='table-export-actions';
      actions.innerHTML='<button type="button" class="btn-sm table-export-excel" title="Ekspor seluruh data hasil filter ke Excel">Excel</button><button type="button" class="btn-sm table-export-csv" title="Ekspor seluruh data hasil filter ke CSV">CSV</button>';
      toolbar.appendChild(actions);
      actions.querySelector('.table-export-excel').onclick=()=>exportTableExcel(table);
      actions.querySelector('.table-export-csv').onclick=()=>exportTableCSV(table);
    }
    if(table.dataset.paginationReady!=='1'){
      const tableWrap=table.closest('.table-wrap');
      const pager=document.createElement('div');
      pager.className='table-pagination';
      pager.innerHTML='<div class="pagination-info"></div><div class="pagination-controls"><button type="button" class="pagination-prev" aria-label="Halaman sebelumnya">‹</button><span class="pagination-pages"></span><button type="button" class="pagination-next" aria-label="Halaman berikutnya">›</button><label class="pagination-size"><span>Tampilkan</span><select><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option><option value="all">Semua</option></select></label></div>';
      tableWrap?.parentNode?.insertBefore(pager,tableWrap.nextSibling);
      const pageSize=pager.querySelector('select');
      const info=pager.querySelector('.pagination-info');
      const pages=pager.querySelector('.pagination-pages');
      const prev=pager.querySelector('.pagination-prev');
      const next=pager.querySelector('.pagination-next');
      const visibleRows=()=>{
        table.tBodies?.[0]?.querySelectorAll('tr').forEach(row=>{
          if(!row.querySelector('.empty'))row.classList.remove('table-pagination-hidden');
        });
        return [...(table.tBodies?.[0]?.rows||[])].filter(row=>!row.querySelector('.empty')&&row.dataset.tableSearchMatch!=='0'&&getComputedStyle(row).display!=='none');
      };
      const drawPager=(total,page,totalPages)=>{
        info.textContent=total?((page-1)*Number(pageSize.value==='all'?total:pageSize.value)+1)+'–'+Math.min(page*Number(pageSize.value==='all'?total:pageSize.value),total)+' dari '+total:'0 data';
        pages.innerHTML='';
        if(pageSize.value==='all'||totalPages<=1){
          prev.disabled=true;next.disabled=true;return;
        }
        const addPage=(n,label=n)=>{
          const b=document.createElement('button');b.type='button';b.className='pagination-page'+(n===page?' active':'');b.textContent=String(label);b.onclick=()=>{table.dataset.page=String(n);table.refreshPagination?.()};pages.appendChild(b);
        };
        const set=new Set([1,totalPages,page-1,page,page+1]);
        [...set].filter(n=>n>=1&&n<=totalPages).sort((a,b)=>a-b).forEach((n,idx,arr)=>{
          if(idx&&n-arr[idx-1]>1){const dots=document.createElement('span');dots.className='pagination-dots';dots.textContent='…';pages.appendChild(dots)}
          addPage(n);
        });
        prev.disabled=page<=1;next.disabled=page>=totalPages;
      };
      table.refreshPagination=()=>{
        const rows=visibleRows();
        const total=rows.length;
        const rawSize=pageSize.value;
        const size=rawSize==='all'?Math.max(total,1):Number(rawSize)||10;
        const totalPages=Math.max(1,Math.ceil(total/size));
        let page=Math.min(Math.max(Number(table.dataset.page||1),1),totalPages);
        table.dataset.page=String(page);
        const start=(page-1)*size,end=rawSize==='all'?total:start+size;
        rows.forEach((row,i)=>{if(rawSize!=='all'&&(i<start||i>=end))row.classList.add('table-pagination-hidden')});
        drawPager(total,page,totalPages);
      };
      pageSize.addEventListener('change',()=>{table.dataset.page='1';table.refreshPagination()});
      prev.onclick=()=>{table.dataset.page=String(Math.max(1,Number(table.dataset.page||1)-1));table.refreshPagination()};
      next.onclick=()=>{table.dataset.page=String(Number(table.dataset.page||1)+1);table.refreshPagination()};
      table.dataset.paginationReady='1';
      // Hanya amati perubahan baris/data tabel. Jangan mengamati atribut/class,
      // karena refreshPagination sendiri mengubah class dan dapat memicu loop refresh.
      const observer=new MutationObserver(()=>window.requestAnimationFrame(()=>table.refreshPagination()));
      if(table.tBodies?.[0])observer.observe(table.tBodies[0],{subtree:true,childList:true});
    }
    table.refreshPagination?.();
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
 root.innerHTML=`<main class="login"><button class="login-theme-toggle theme-toggle top-action-icon" id="loginThemeToggle" type="button" aria-label="${uiTheme==='dark'?'Mode terang':'Mode gelap'}"><span class="theme-icon">${uiTheme==='dark'?'☀':'☾'}</span><span class="top-action-label">${uiTheme==='dark'?'Mode terang':'Mode gelap'}</span></button><section class="login-shell"><aside class="login-aside"><div class="login-emblem"><img src="${BANTEN_LOGO}" alt="Lambang Provinsi Banten"></div><div class="login-org">PEMERINTAH PROVINSI BANTEN</div><h1>UPTD PENGELOLAAN PENDAPATAN DAERAH MALINGPING</h1><p>Sistem Informasi Pengurus Barang</p><div class="login-rule"></div><small>Portal internal pengelolaan persediaan barang.</small></aside><section class="login-card"><div class="brand"><div><h2>Sistem Informasi Pengurus Barang</h2><p>UPTD PPD Malingping</p></div></div><div class="login-title">Masuk ke sistem</div><p class="login-desc">Gunakan akun yang terdaftar untuk melanjutkan.</p><form id="loginForm"><label for="identifier">Email / Username</label><input id="identifier" type="text" required autocomplete="username" placeholder="akun@instansi.go.id atau username"><label for="password">Password</label><div class="password-wrap"><input id="password" type="password" required autocomplete="current-password" placeholder="••••••••"><button type="button" class="password-toggle" id="togglePassword" aria-label="Tampilkan password" title="Tampilkan password"><svg class="eye-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.8"></circle></svg></button></div><button class="primary login-btn" type="submit"><span>Masuk</span><span aria-hidden="true">→</span></button>${message?`<div class="alert">${esc(message)}</div>`:''}</form><div class="login-footer">© ${new Date().getFullYear()} UPTD PPD Malingping</div></section></section></main>`;
 $('togglePassword').onclick=()=>{const p=$('password'),b=$('togglePassword');p.type=p.type==='password'?'text':'password';const shown=p.type==='text';b.setAttribute('aria-label',shown?'Sembunyikan password':'Tampilkan password');b.setAttribute('title',shown?'Sembunyikan password':'Tampilkan password');b.innerHTML="<svg class=\"eye-svg\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z\"></path><circle cx=\"12\" cy=\"12\" r=\"2.8\"></circle></svg>"};
 $('loginThemeToggle').onclick=()=>{changeSipbTheme(null,message)};
 $('loginForm').addEventListener('submit',async e=>{e.preventDefault();const identifier=$('identifier').value.trim(),password=$('password').value,btn=e.submitter;btn.disabled=true;btn.textContent='Memproses...';
    try{
      const {data,error}=await client.functions.invoke('login-user',{body:{identifier,password}});
      if(error){
        let msg=error.message||'Login gagal.';
        try{const payload=await error.context?.json();msg=payload?.error||payload?.message||msg}catch(_){}
        return showLogin(msg);
      }
      const accessToken=data?.access_token,refreshToken=data?.refresh_token;
      if(!accessToken||!refreshToken)return showLogin('Respons login tidak lengkap.');
      const {error:setError}=await client.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
      if(setError)return showLogin(setError.message);
      sidebarOpen=false;renderApp('dashboard');
    }catch(err){
      showLogin(err?.message||'Login gagal.');
    }finally{
      btn.disabled=false;btn.innerHTML='<span>Masuk</span><span aria-hidden="true">→</span>';
    }});
}

async function loadProfile(){const {data,error}=await client.from('user_profiles').select('*').eq('id',session.user.id).maybeSingle();if(error)throw error;profile=data||{nama_lengkap:session.user.email,role:'user',is_active:true};if(profile.is_active===false){await client.auth.signOut();throw new Error('Akun tidak aktif.')}}
async function count(t){const {count,error}=await client.from(t).select('*',{count:'exact',head:true});if(error)throw error;return count||0}
async function dashboard(){
  const now=new Date();
  const since=new Date(now.getFullYear(),now.getMonth()-5,1).toISOString();
  const [barangQ,masukQ,keluarQ,catQ,masukCatQ,outQ,kuasiQ]=await Promise.all([
    client.from('barang').select('id,kode_barang,nama_barang,keterangan,satuan,sisa,stok_minimum,harga_terakhir'),
    client.from('barang_masuk').select('id,barang_id,jumlah,harga_satuan,keterangan,tanggal_masuk,barang:barang_id(id,nama_barang,satuan,keterangan)'),
    client.from('transaksi_keluar').select('id,status'),
    client.from('barang').select('id,sisa,harga_terakhir,kategori_id,kategori:kategori_id(nama_kategori)'),
    client.from('barang_masuk').select('id,barang_id,jumlah,harga_satuan,barang:barang_id(id,kategori_id,kategori:kategori_id(nama_kategori))'),
    client.from('transaksi_keluar').select('tanggal_keluar,status').gte('tanggal_keluar',since).order('tanggal_keluar'),
    client.from('stok_kuasi').select('id,barang_id,sisa_lembar,barang:barang_id(nama_barang,satuan)').gt('sisa_lembar',0)
  ]);
  const err=barangQ.error||masukQ.error||keluarQ.error||catQ.error||masukCatQ.error||outQ.error||kuasiQ.error;
  if(err)throw err;

  const barangData=barangQ.data||[];
  const masukData=masukQ.data||[];
  const keluarData=(keluarQ.data||[]).filter(x=>(x.status||'AKTIF')!=='DIBATALKAN');

  const totalBarang=barangData.length;
  const totalSisa=barangData.reduce((n,r)=>n+(Number(r.sisa)||0),0);
  const totalMasuk=masukData.reduce((n,r)=>n+(Number(r.jumlah)||0),0);
  const nominalMasuk=masukData.reduce((n,r)=>n+((Number(r.jumlah)||0)*(Number(r.harga_satuan)||0)),0);
  const totalKeluar=keluarData.length;

  const stockAlerts=barangData.filter(r=>Number(r.sisa||0)<=Number(r.stok_minimum||0)).sort((a,b)=>(Number(a.sisa)||0)-(Number(b.sisa)||0));
  const outOfStock=stockAlerts.filter(r=>Number(r.sisa||0)<=0);
  const lowStock=stockAlerts.filter(r=>Number(r.sisa||0)>0);

  const kuasiMap={};
  (kuasiQ.data||[]).forEach(r=>{
    const id=r.barang_id;
    if(!kuasiMap[id])kuasiMap[id]={nama:r.barang?.nama_barang||'-',satuan:r.barang?.satuan||'',sisa:0};
    kuasiMap[id].sisa+=Number(r.sisa_lembar)||0;
  });
  const kuasiLow=Object.values(kuasiMap).filter(r=>r.sisa<=20).sort((a,b)=>a.sisa-b.sisa);

  const catMap={};
  (masukCatQ.data||[]).forEach(x=>{
    const n=x.barang?.kategori?.nama_kategori||'Tanpa Kategori';
    if(!catMap[n])catMap[n]={jenis:new Set(),jumlah:0,nilai:0};
    if(x.barang?.id!=null)catMap[n].jenis.add(x.barang.id);
    catMap[n].jumlah+=Number(x.jumlah)||0;
    catMap[n].nilai+=(Number(x.jumlah)||0)*(Number(x.harga_satuan)||0);
  });
  const catEntries=Object.entries(catMap)
    .map(([name,v])=>[name,{jenis:v.jenis.size,jumlah:v.jumlah,nilai:v.nilai}])
    .sort((a,b)=>b[1].nilai-a[1].nilai);
  const catSummaryRows=catEntries.map(([name,v])=>
    '<tr><td><strong>'+esc(name)+'</strong></td><td class="right">'+v.jenis.toLocaleString('id-ID')+'</td><td class="right">'+v.jumlah.toLocaleString('id-ID')+'</td><td class="right">'+rupiah(v.nilai)+'</td></tr>'
  ).join('');

  // Keterangan pada form Barang Masuk bersifat per-transaksi.
  // Karena itu Dashboard harus membaca barang_masuk.keterangan, bukan hanya barang.keterangan.
  // Baris hanya digabung bila nama + keterangan + harga + satuan benar-benar sama.
  const masterById=new Map(barangData.map(r=>[Number(r.id),r]));
  const rekapMap=new Map();

  masukData.forEach(r=>{
    const master=masterById.get(Number(r.barang_id))||r.barang||{};
    const nama=String(master.nama_barang||'-').trim();
    const keterangan=String(r.keterangan||master.keterangan||'').trim();
    const satuan=String(master.satuan||r.barang?.satuan||'-').trim();
    const harga=Number(r.harga_satuan)||0;
    const jumlah=Number(r.jumlah)||0;
    const key=[
      String(master.kode_barang||'').trim().toLocaleLowerCase('id-ID'),
      String(master.id??r.barang_id??'').trim(),
      nama.toLocaleLowerCase('id-ID'),
      keterangan.toLocaleLowerCase('id-ID'),
      String(harga),
      satuan.toLocaleLowerCase('id-ID')
    ].join('¦');

    const existing=rekapMap.get(key);
    if(existing){
      existing.jumlah+=jumlah;
      existing.sourceCount++;
    }else{
      rekapMap.set(key,{
        kode:String(master.kode_barang||'').trim(),
        nama,keterangan,satuan,harga,jumlah,
        sourceCount:1,
        barangIds:new Set([Number(r.barang_id)])
      });
    }
  });

  // Master lama yang belum memiliki histori Barang Masuk tetap ditampilkan.
  barangData.filter(r=>!masukData.some(m=>Number(m.barang_id)===Number(r.id))).forEach(r=>{
    const kode=String(r.kode_barang||'').trim();
    const nama=String(r.nama_barang||'-').trim();
    const keterangan=String(r.keterangan||'').trim();
    const satuan=String(r.satuan||'-').trim();
    const harga=Number(r.harga_terakhir)||0;
    const key=[
      nama.toLocaleLowerCase('id-ID'),
      keterangan.toLocaleLowerCase('id-ID'),
      String(harga),
      satuan.toLocaleLowerCase('id-ID')
    ].join('¦');
    if(!rekapMap.has(key)){
      rekapMap.set(key,{kode,nama,keterangan,satuan,harga,jumlah:0,sourceCount:0,barangIds:new Set([Number(r.id)])});
    }
  });

  const rekapBarang=[...rekapMap.values()].sort((a,b)=>
    a.nama.localeCompare(b.nama,'id',{sensitivity:'base'})||
    a.keterangan.localeCompare(b.keterangan,'id',{sensitivity:'base'})||
    a.harga-b.harga
  );

  const rekapRows=rekapBarang.map((r,i)=>
    '<tr><td class="id-cell">'+(i+1)+'</td>'+
    '<td><strong>'+esc(r.nama)+'</strong>'+(r.kode?'<small class="rekap-kode">'+esc(r.kode)+'</small>':'')+'</td>'+
    '<td>'+esc(r.keterangan||'-')+'</td>'+
    '<td class="right">'+rupiah(r.harga)+'</td>'+
    '<td class="right">'+r.jumlah.toLocaleString('id-ID')+'</td>'+
    '<td>'+esc(r.satuan)+'</td>'+
    '<td class="right">'+rupiah(r.jumlah*r.harga)+'</td></tr>'
  ).join('');

  const rekapTotalQty=rekapBarang.reduce((n,r)=>n+r.jumlah,0);

  const monthMap={};
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    monthMap[key]=0;
  }
  (outQ.data||[]).filter(x=>(x.status||'AKTIF')!=='DIBATALKAN').forEach(x=>{
    const d=new Date(x.tanggal_keluar);
    const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    if(key in monthMap)monthMap[key]++;
  });
  const monthLabels=Object.keys(monthMap).map(k=>{
    const [y,m]=k.split('-');
    return new Intl.DateTimeFormat('id-ID',{month:'short'}).format(new Date(Number(y),Number(m)-1,1));
  });

  window.SIPB_DASHBOARD_CHARTS={
    categoryLabels:catEntries.slice(0,8).map(x=>x[0]),
    categoryData:catEntries.slice(0,8).map(x=>x[1].jenis),
    monthLabels,
    monthData:Object.values(monthMap)
  };

  const alertList=stockAlerts.slice(0,6).map(r=>{
    const zero=Number(r.sisa||0)<=0;
    return '<div class="stock-alert-row '+(zero?'danger':'warning')+'"><span class="stock-alert-icon">'+navSvg(zero?'barang_keluar':'barang')+'</span><div><strong>'+esc(r.nama_barang)+'</strong><small>Stok '+(Number(r.sisa)||0)+' '+esc(r.satuan||'')+' · Minimum '+(Number(r.stok_minimum)||0)+'</small></div><span class="stock-alert-value">'+(zero?'Habis':'Menipis')+'</span></div>';
  }).join('');

  return '<section class="welcome card"><div class="welcome-copy"><span class="eyebrow">DASHBOARD</span><h2>Selamat Datang</h2><p>Sistem Informasi Pengurus Barang untuk administrasi persediaan UPTD PPD Malingping.</p><div class="welcome-meta"><span class="top-separator" aria-hidden="true"></span><span>•</span><span>'+new Intl.DateTimeFormat('id-ID',{dateStyle:'full'}).format(now)+'</span></div></div><div class="welcome-emblem"><img src="'+BANTEN_LOGO+'" alt="Lambang Provinsi Banten"><div><strong>PEMERINTAH PROVINSI BANTEN</strong><span>UPTD PPD MALINGPING</span></div></div></section>'+
  '<section class="stats-grid"><div class="stat-card blue"><span class="stat-icon">'+navSvg('barang')+'</span><div><small>Total Barang</small><strong>'+totalBarang+'</strong><em>Master barang</em></div></div><div class="stat-card blue"><span class="stat-icon">'+navSvg('barang_masuk')+'</span><div><small>Nilai Barang Masuk</small><strong>'+rupiah(nominalMasuk)+'</strong><em>Total nilai penerimaan</em></div></div><div class="stat-card green"><span class="stat-icon">'+navSvg('barang_masuk')+'</span><div><small>Jumlah Barang Masuk</small><strong>'+totalMasuk.toLocaleString('id-ID')+'</strong><em>Total kuantitas masuk</em></div></div><div class="stat-card red"><span class="stat-icon">'+navSvg('barang_keluar')+'</span><div><small>Barang Keluar</small><strong>'+totalKeluar+'</strong><em>Transaksi aktif</em></div></div><div class="stat-card purple"><span class="stat-icon">'+navSvg('stock_opname')+'</span><div><small>Sisa Stok</small><strong>'+totalSisa.toLocaleString('id-ID')+'</strong><em>Total stok saat ini</em></div></div></section>'+
  '<section class="stock-alert-center card"><div class="section-head"><div><span class="eyebrow">PERINGATAN PERSEDIAAN</span><h3>Pusat Peringatan Stok</h3><p>Barang yang sudah habis atau berada di bawah batas stok minimum.</p></div><div class="stock-alert-counts"><span class="alert-count danger"><strong>'+outOfStock.length+'</strong><small>Habis</small></span><span class="alert-count warning"><strong>'+lowStock.length+'</strong><small>Menipis</small></span><span class="alert-count kuasi"><strong>'+kuasiLow.length+'</strong><small>Kuasi ≤ 20</small></span></div></div><div class="stock-alert-layout"><div class="stock-alert-list">'+(alertList||'<div class="stock-alert-empty"><span>✓</span><div><strong>Stok aman</strong><small>Tidak ada barang yang berada di bawah batas minimum.</small></div></div>')+'</div><div class="stock-alert-side"><div class="stock-alert-side-title">Ringkasan cepat</div><div class="stock-alert-metric"><span>Barang perlu perhatian</span><strong>'+stockAlerts.length+'</strong></div><div class="stock-alert-metric"><span>Batch Kuasi menipis</span><strong>'+kuasiLow.length+'</strong></div><button class="ghost" data-page="barang">Buka Master Barang <span aria-hidden="true">→</span></button></div></div></section>'+
  '<section class="card page-card category-summary-card"><div class="section-head"><div><span class="eyebrow">RINGKASAN KATEGORI</span><h3>Jumlah Barang dan Nominal Berdasarkan Kategori</h3><p>Rekap jenis barang, jumlah masuk, dan nilai penerimaan berdasarkan transaksi Barang Masuk.</p></div></div><div class="table-wrap"><table><thead><tr><th>Kategori</th><th>Jenis Barang</th><th>Jumlah Masuk</th><th>Nominal Barang Masuk</th></tr></thead><tbody>'+(catSummaryRows||emptyRow(4))+'</tbody></table></div></section>'+
  '<section class="charts-grid"><article class="card chart-card"><div class="section-head"><div><span class="eyebrow">DISTRIBUSI</span><h3>Barang berdasarkan kategori</h3><p>Delapan kategori dengan jumlah barang terbanyak.</p></div></div><div class="chart-wrap"><canvas id="categoryChart"></canvas></div></article><article class="card chart-card"><div class="section-head"><div><span class="eyebrow">AKTIVITAS</span><h3>Barang keluar per bulan</h3><p>Enam bulan terakhir, transaksi aktif.</p></div></div><div class="chart-wrap"><canvas id="outgoingChart"></canvas></div></article></section>'+
  '<section class="card recent dashboard-rekap-barang"><div class="section-head"><div><span class="eyebrow">REKAP BARANG MASUK</span><h3>Daftar / Rekap Barang</h3><p>Keterangan diambil langsung dari transaksi Barang Masuk. Nama barang yang sama dipisahkan jika keterangan atau harga berbeda.</p></div><div class="kartu-head-actions"><span class="status-pill">'+rekapBarang.length+' baris</span><span class="status-pill">'+rekapTotalQty.toLocaleString('id-ID')+' masuk</span></div></div><div class="table-wrap"><table id="dashboardBarangTable"><thead><tr><th>No.</th><th>Nama Barang</th><th>Keterangan</th><th>Harga Satuan</th><th>Jumlah Masuk</th><th>Satuan</th><th>Nilai Masuk</th></tr></thead><tbody>'+(rekapRows||emptyRow(7))+'</tbody></table></div></section>';
}
async function barangPage(){
  const [{data,error},{data:k,error:ke},{data:masuk,error:me}]=await Promise.all([
    client.from('barang').select('*, kategori:kategori_id(nama_kategori)').order('id'),
    client.from('kategori').select('*').order('nama_kategori'),
    client.from('barang_masuk').select('id,barang_id,keterangan,harga_satuan,tanggal_masuk').order('tanggal_masuk',{ascending:false}).order('id',{ascending:false})
  ]);
  if(error)throw error;
  if(ke)throw ke;
  if(me)throw me;

  // Keterangan pada Barang Masuk merupakan keterangan per-transaksi.
  // Untuk Master Barang, tampilkan seluruh keterangan unik yang pernah
  // tercatat untuk barang tersebut; keterangan Master tetap menjadi fallback.
  const ketMap=new Map();
  (masuk||[]).forEach(r=>{
    const id=Number(r.barang_id);
    const ket=String(r.keterangan||'').trim();
    if(!id||!ket)return;
    if(!ketMap.has(id))ketMap.set(id,[]);
    const arr=ketMap.get(id);
    if(!arr.some(x=>x.toLocaleLowerCase('id-ID')===ket.toLocaleLowerCase('id-ID')))arr.push(ket);
  });

  const rows=(data||[]).map(r=>{
    const fromMasuk=ketMap.get(Number(r.id))||[];
    const masterKet=String(r.keterangan||'').trim();
    const merged=[...fromMasuk];
    if(masterKet&&!merged.some(x=>x.toLocaleLowerCase('id-ID')===masterKet.toLocaleLowerCase('id-ID')))merged.unshift(masterKet);
    return {...r,keterangan_tampil:merged.join(' · ')};
  });

  return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">MASTER DATA</span><h2>Master Barang</h2><p>Kelola data barang, kode sumber, dan stok persediaan.</p></div>${profile?.role==='admin'?'<div class="kartu-head-actions"><button type="button" class="ghost" id="importPersediaan">⇧ Import Persediaan</button><button class="primary" id="addBarang">＋ Tambah Barang</button></div>':''}</div><div class="filter-bar"><div class="search-box">⌕<input id="barangSearch" placeholder="Cari kode, nama, keterangan, tipe, merk, atau satuan..."></div><select id="barangFilter"><option value="">Semua kategori</option>${(k||[]).map(x=>`<option value="${x.id}">${esc(x.nama_kategori)}</option>`).join('')}</select><span id="barangCount" class="result-count">${data?.length||0} data</span></div><div class="table-wrap master-barang-table-wrap"><table id="barangTable" class="master-barang-table"><thead><tr><th>ID</th><th>Kode Barang</th><th>Nama Barang</th><th>Keterangan</th><th>Kategori</th><th>Tipe</th><th>Merk</th><th>Satuan</th><th>Harga Terakhir</th><th>Stok</th><th>Aksi</th></tr></thead><tbody>${rows.map(barangRow).join('')||emptyRow(11)}</tbody></table></div></section>`
}
function barangRow(r){const low=Number(r.sisa??0)<=Number(r.stok_minimum??0);const ket=String(r.keterangan_tampil??r.keterangan??'').trim();return `<tr data-search="${esc([r.kode_barang,r.nama_barang,ket,r.tipe,r.merk,r.satuan,r.kategori?.nama_kategori].join(' ').toLowerCase())}" data-kategori="${r.kategori_id||''}"><td class="id-cell">#${r.id}</td><td><small>${esc(r.kode_barang||"-")}</small></td><td><strong>${esc(r.nama_barang)}</strong></td><td>${esc(ket||'-')}</td><td>${esc(r.kategori?.nama_kategori||'-')}</td><td>${esc(r.tipe||'-')}</td><td>${esc(r.merk||'-')}</td><td>${esc(r.satuan||'-')}</td><td>${rupiah(r.harga_terakhir)}</td><td><span class="stock ${low?'low':''}">${formatAngka(r.sisa??0)}</span></td><td>${profile?.role==='admin'?'<div class="actions"><button class="btn-sm edit-barang" data-id="'+r.id+'">Edit</button><button class="btn-sm danger delete-barang" data-id="'+r.id+'">Hapus</button></div>':'<span class="badge-soft">Lihat</span>'}</td></tr>`}
function emptyRow(n){return `<tr><td colspan="${n}" class="empty">Belum ada data.</td></tr>`}
async function showImportPersediaanModal(){
  const old=document.getElementById('importPersediaanModal');if(old)old.remove();
  const wrap=document.createElement('div');wrap.id='importPersediaanModal';wrap.className='modal-backdrop';
  wrap.innerHTML='<div class="modal-card user-create-modal"><div class="modal-head"><div><span class="eyebrow">MASTER DATA</span><h2>Import Persediaan</h2><p>Import saldo awal dan penambahan barang dari Excel.</p></div><button type="button" class="modal-close" aria-label="Tutup">×</button></div>'+
    '<div class="form-grid"><label>File Excel <input id="importPersediaanFile" type="file" accept=".xlsx,.xls"></label></div>'+
    '<div class="alert-box"><strong>Tanggal masuk:</strong> gunakan kolom <b>Tanggal Saldo Awal</b> dan <b>Tanggal Bertambah</b> pada Excel. Jika kosong, default <b>31 Desember 2025</b> dan <b>02 Januari 2026</b>. Kolom <b>Tanggal Masuk</b> juga diterima sebagai fallback.</div>'+
    '<div id="importPersediaanPreview" class="import-preview"><div class="badge-soft">Belum ada file dipilih.</div></div>'+
    '<div class="form-actions"><button type="button" class="primary" id="runImportPersediaan" disabled>Import ke SIPB</button><button type="button" class="ghost modal-cancel">Batal</button></div></div>';
  document.body.appendChild(wrap);
  const close=()=>wrap.remove();
  wrap.querySelector('.modal-close').onclick=close;
  wrap.querySelector('.modal-cancel').onclick=close;
  wrap.onclick=e=>{if(e.target===wrap)close()};
  const fileInput=wrap.querySelector('#importPersediaanFile'),preview=wrap.querySelector('#importPersediaanPreview'),run=wrap.querySelector('#runImportPersediaan');
  let importRows=[];
  fileInput.onchange=async()=>{
    importRows=[];run.disabled=true;
    const file=fileInput.files?.[0];
    if(!file){preview.innerHTML='<div class="badge-soft">Belum ada file dipilih.</div>';return}
    preview.innerHTML='<div class="loading-state"><div class="spinner"></div><span>Membaca file...</span></div>';
    try{
      if(!window.XLSX)throw new Error('Library Excel belum tersedia. Muat ulang SIPB.');
      const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
      const sheet=wb.Sheets['Import SIPB']||wb.Sheets[wb.SheetNames[0]];
      if(!sheet)throw new Error('Sheet Excel tidak ditemukan.');
      const raw=window.XLSX.utils.sheet_to_json(sheet,{defval:''});
      const excelDate=v=>{
        if(v instanceof Date&&!Number.isNaN(v.getTime())){
          return v.getFullYear()+'-'+String(v.getMonth()+1).padStart(2,'0')+'-'+String(v.getDate()).padStart(2,'0');
        }
        if(typeof v==='number'&&Number.isFinite(v)&&v>20000){
          const dt=new Date(Date.UTC(1899,11,30)+Math.round(v)*86400000);
          if(!Number.isNaN(dt.getTime()))return dt.toISOString().slice(0,10);
        }
        const s=String(v??'').trim();
        if(!s)return '';
        let m=s.match(/^(\\d{1,2})[\\/.-](\\d{1,2})[\\/.-](\\d{4})$/);
        if(m)return m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0');
        m=s.match(/^(\\d{4})[\\/.-](\\d{1,2})[\\/.-](\\d{1,2})$/);
        return m?m[1]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0'):'';
      };
      const req=['Kode Barang','Nama Barang','Kategori','Saldo Awal (Qty)','Saldo Awal (Nilai)','Bertambah (Qty)','Bertambah (Nilai)'];
      const missing=req.filter(h=>!Object.prototype.hasOwnProperty.call(raw[0]||{},h));
      if(missing.length)throw new Error('Kolom Excel kurang: '+missing.join(', '));
      importRows=raw.map(r=>({
        kode_barang:String(r['Kode Barang']||'').trim(),
        nama_barang:String(r['Nama Barang']||'').trim(),
        kategori:String(r['Kategori']||'').trim(),
        satuan:String(r['Satuan']||'').trim(),
        keterangan:String(r['Keterangan']||r['Keterangan / Spesifikasi']||'').trim(),
        tanggal_saldo_awal:excelDate(r['Tanggal Saldo Awal']||r['Tanggal Saldo']||r['Tanggal Masuk'])||'2025-12-31',
        tanggal_bertambah:excelDate(r['Tanggal Bertambah']||r['Tanggal Penambahan']||r['Tanggal Masuk'])||'2026-01-02',
        saldo_qty:Number(r['Saldo Awal (Qty)']||0),
        saldo_value:Number(r['Saldo Awal (Nilai)']||0),
        bertambah_qty:Number(r['Bertambah (Qty)']||0),
        bertambah_value:Number(r['Bertambah (Nilai)']||0)
      })).filter(r=>r.kode_barang||r.nama_barang);
      const bad=importRows.findIndex(r=>!r.kode_barang||!r.nama_barang||!r.kategori||![r.saldo_qty,r.saldo_value,r.bertambah_qty,r.bertambah_value].every(Number.isFinite)||r.saldo_qty<0||r.bertambah_qty<0||!/^\\d{4}-\\d{2}-\\d{2}$/.test(r.tanggal_saldo_awal)||!/^\\d{4}-\\d{2}-\\d{2}$/.test(r.tanggal_bertambah));
      if(bad>=0)throw new Error('Data Excel pada baris '+(bad+2)+' tidak lengkap atau tidak valid.');
      const seen=new Set();const dup=importRows.find(r=>{const k=r.kode_barang.toLowerCase();if(seen.has(k))return true;seen.add(k);return false});
      if(dup)throw new Error('Kode Barang duplikat di file: '+dup.kode_barang);
      const saldo=importRows.reduce((n,r)=>n+r.saldo_qty,0),tambah=importRows.reduce((n,r)=>n+r.bertambah_qty,0);
      const sample=importRows.slice(0,6).map((r,i)=>'<tr><td>'+(i+1)+'</td><td><small>'+esc(r.kode_barang)+'</small></td><td>'+esc(r.nama_barang)+'</td><td>'+esc(r.keterangan||'-')+'</td><td>'+fmtDate(r.tanggal_saldo_awal)+'</td><td>'+fmtDate(r.tanggal_bertambah)+'</td><td class="right">'+r.saldo_qty.toLocaleString('id-ID')+'</td><td class="right">'+r.bertambah_qty.toLocaleString('id-ID')+'</td></tr>').join('');
      preview.innerHTML='<div class="detail-grid"><div><small>Barang</small><strong>'+importRows.length+'</strong></div><div><small>Saldo Awal</small><strong>'+saldo.toLocaleString('id-ID')+'</strong></div><div><small>Bertambah</small><strong>'+tambah.toLocaleString('id-ID')+'</strong></div><div><small>Tanggal</small><strong>Per baris</strong></div></div><div class="table-wrap"><table><thead><tr><th>No</th><th>Kode</th><th>Barang</th><th>Keterangan</th><th>Tgl Saldo Awal</th><th>Tgl Bertambah</th><th>Saldo Awal</th><th>Bertambah</th></tr></thead><tbody>'+sample+'</tbody></table></div><p class="note">Tanggal dibaca dari Excel per baris. Kolom Keterangan bersifat opsional. Preview 6 baris pertama. Seluruh '+importRows.length+' barang akan diproses.</p>';
      run.disabled=false;
    }catch(err){preview.innerHTML='<div class="alert">'+esc(err?.message||String(err))+'</div>'}
  };
  run.onclick=async()=>{
    if(!importRows.length)return;
    run.disabled=true;run.textContent='Mengimpor...';
    try{
      const {data,error}=await client.rpc('import_rekap_persediaan',{p_rows:importRows});
      if(error)throw error;
      toast('Import berhasil: '+(data?.barang||importRows.length)+' barang dan '+(data?.penerimaan||0)+' histori penerimaan.');
      close();renderApp('barang');
    }catch(err){run.disabled=false;run.textContent='Import ke SIPB';fail(err)}
  };
}
async function barangForm(id=null){
  let row={kode_barang:'',nama_barang:'',keterangan:'',kategori_id:'',tipe:'',merk:'',satuan:'',stok_minimum:0};
  if(id){
    const {data,error}=await client.from('barang').select('*').eq('id',id).single();
    if(error)throw error;
    row=data;
  }
  const {data:k,error}=await client.from('kategori').select('*').order('nama_kategori');
  if(error)throw error;
  return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">MASTER BARANG</span><h2>${id?'Edit Barang':'Tambah Barang'}</h2><p>Informasi operasional persediaan.</p></div><button class="ghost" id="backBarang">← Kembali</button></div><div class="form-grid">
  <label>Kode Barang <input id="b_kode" value="${esc(row.kode_barang||"")}" maxlength="80" placeholder="Kode barang sumber"></label>
  <label>Nama Barang <input id="b_nama" value="${esc(row.nama_barang||'')}" maxlength="255"></label>
  <label style="grid-column:1/-1">Keterangan <textarea id="b_keterangan" rows="3" maxlength="500" placeholder="Keterangan khusus barang, spesifikasi, atau pembeda barang dengan nama yang sama...">${esc(row.keterangan||'')}</textarea></label>
  <label>Kategori <select id="b_kat"><option value="">- Pilih kategori -</option>${(k||[]).map(x=>`<option value="${x.id}" ${String(x.id)===String(row.kategori_id)?'selected':''}>${esc(x.nama_kategori)}</option>`).join('')}</select></label>
  <label>Tipe <input id="b_tipe" value="${esc(row.tipe||'')}"></label>
  <label>Merk <input id="b_merk" value="${esc(row.merk||'')}"></label>
  <label>Satuan <input id="b_satuan" value="${esc(row.satuan||'')}"></label>
  <label>Stok Minimum <input id="b_min" type="text" inputmode="numeric" data-number-format="integer" min="0" value="${formatAngka(row.stok_minimum||0)}"></label>
  </div><div class="form-actions"><button class="primary" id="saveBarang">${id?'Simpan Perubahan':'Simpan Barang'}</button><button class="ghost" id="cancelBarang">Batal</button></div></section>`
}
async function simple(title,table,cols){const {data,error}=await client.from(table).select('*').order('id',{ascending:false}).limit(200);if(error)throw error;return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">DATA SIPB</span><h2>${title}</h2><p>Maksimal 200 data terbaru.</p></div></div><div class="table-wrap"><table><thead><tr>${cols.map(x=>`<th>${x[1]}</th>`).join('')}</tr></thead><tbody>${(data||[]).map(row=>`<tr>${cols.map(x=>`<td>${esc(row[x[0]])}</td>`).join('')}</tr>`).join('')||emptyRow(cols.length)}</tbody></table></div></section>`}

async function barangMasukForm(){
  const canCreate=profile?.role==='admin';
  const [{data:items,error},{data:kats,error:ke}]=await Promise.all([
    client.from('barang').select('id,nama_barang,satuan,kategori_id,tipe,merk,kode_barang,kategori:kategori_id(id,nama_kategori)').order('nama_barang'),
    client.from('kategori').select('*').order('nama_kategori')
  ]);
  if(error||ke)throw(error||ke);
  return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">PENERIMAAN</span><h2>Rekam Barang Masuk</h2><p>Stok, transaksi penerimaan, dan batch Kuasi disimpan atomik dalam satu transaksi database.</p></div><button class="ghost" id="backMasuk">← Kembali</button></div><div class="form-grid">
  <label>Barang yang sudah ada <select id="m_barang">${canCreate?'<option value="">＋ Barang baru</option>':''}${items.map(x=>`<option value="${x.id}" data-kode="${esc(x.kode_barang||'')}" data-kuasi="${String(x.kategori?.nama_kategori||'').toLowerCase().includes('kuasi')?'1':'0'}" data-kategori="${x.kategori_id||''}" data-satuan="${esc(x.satuan||'')}" data-tipe="${esc(x.tipe||'')}" data-merk="${esc(x.merk||'')}">${esc(x.nama_barang)} — ${esc(x.kode_barang||'Tanpa Kode')} · ${esc(x.satuan||'-')}</option>`).join('')}</select></label>
  <label>Kode Barang <input id="m_kode" maxlength="100" placeholder="Contoh: 01.01.01.001"><small class="field-hint">Barang lama ditampilkan otomatis; barang baru dapat diisi di sini.</small></label>
  <label${canCreate?'':' style="display:none"'}>Nama Barang Baru <input id="m_nama" placeholder="Isi jika memilih Barang baru"></label>
  <label${canCreate?'':' style="display:none"'}>Kategori Barang Baru <select id="m_kat"><option value="">- Pilih kategori -</option>${kats.map(x=>`<option value="${x.id}" data-kuasi="${String(x.nama_kategori||'').toLowerCase().includes('kuasi')?'1':'0'}">${esc(x.nama_kategori)}</option>`).join('')}</select></label>
  <label>Tipe <input id="m_tipe" value="-"></label><label>Merk <input id="m_merk" value="-"></label><label>Satuan <input id="m_satuan" placeholder="BUAH / PCS / KOTAK"></label>
  <label>Jumlah Masuk <input id="m_jumlah" type="text" inputmode="numeric" autocomplete="off" data-number-format="integer" min="1" value="1"></label><label>Harga Satuan <input id="m_harga" type="text" inputmode="numeric" autocomplete="off" data-number-format="integer" min="0" value="0"></label>
  <label>Sumber Dana <select id="m_sumber"><option>APBD</option><option>APBN</option><option>Lainnya</option></select></label>
  <label>Tanggal Masuk <input id="m_tanggal" type="date" value="${localDate()}"></label>
  <label>Nama Penyerah <input id="m_penyerah" required placeholder="Pihak ke Tiga"></label><label>Nama Penerima <input id="m_penerima" value="${esc(profile?.nama_lengkap||'')}"></label>
  <label class="field-wide">Keterangan / Spesifikasi <textarea id="m_keterangan" rows="3" maxlength="500" placeholder="Contoh: ukuran, warna, model, jenis, bahan, atau keterangan lain untuk membedakan nama barang yang sama"></textarea><small class="field-hint">Keterangan ini melekat pada transaksi Barang Masuk, bukan Master Barang.</small></label>
  </div><div id="masukKuasi" class="kuasi-box" style="display:none"><strong>📑 Batch Kuasi</strong><span>Isi rentang nomor seri yang diterima. Jumlah harus sama dengan rentang.</span><div class="form-grid"><label>No. Dus <input id="m_dus" placeholder="Contoh: 411"></label><label>No. Seri Awal <input id="m_awal" placeholder="A-001"></label><label>No. Seri Akhir <input id="m_akhir" placeholder="A-100"></label></div></div><div class="form-actions"><button class="primary" id="saveMasuk">Rekam & Tambah Stok</button><button class="ghost" id="cancelMasuk">Batal</button></div></section>`;
}
async function barangKeluarForm(){const [{data:items,error},{data:pegawai,error:pe}]=await Promise.all([client.from('barang').select('id,nama_barang,satuan,sisa,kategori:kategori_id(id,nama_kategori)').order('nama_barang'),client.from('pegawai').select('id,nama_pegawai,nip,status_pegawai,jabatan,unit_kerja').order('nama_pegawai')]);if(error||pe)throw(error||pe);return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">DISTRIBUSI</span><h2>Rekam Barang Keluar</h2><p>Stok akan dikurangi setelah seluruh item lolos validasi.</p></div><button class="ghost" id="backKeluar">← Kembali</button></div><div class="form-grid"><label>Tanggal Keluar <input id="k_tanggal" type="date" value="${localDate()}"></label><label>Penyerah (Gudang) <select id="k_penyerah"><option value="">- Pilih penyerah -</option>${pegawai.map(p=>`<option value="${esc(p.nama_pegawai)}" data-nip="${esc(p.nip||'')}" data-jabatan="${esc(p.jabatan||'')}" data-status="${esc(p.status_pegawai||'')}">${esc(p.nama_pegawai)}</option>`).join('')}</select></label><label>Jabatan Penyerah <input id="k_penyerah_jabatan" readonly></label><label>NIP Penyerah <input id="k_penyerah_nip" readonly></label><label>Penerima (Pemohon) <select id="k_penerima"><option value="">- Pilih pegawai -</option>${pegawai.map(p=>`<option value="${esc(p.nama_pegawai)}" data-nip="${esc(p.nip||'')}" data-jabatan="${esc(p.jabatan||'')}" data-status="${esc(p.status_pegawai||'')}">${esc(p.nama_pegawai)}</option>`).join('')}</select></label><label>Jabatan Penerima <input id="k_jabatan" readonly></label><label>NIP Penerima <input id="k_nip" readonly></label><label>Tujuan / Ruangan <input id="k_tujuan" placeholder="Otomatis dari Unit Kerja/Ruangan Penerima; dapat diedit" required></label></div><div class="section-head compact"><div><h3>Daftar Barang</h3><p>Tambahkan satu atau beberapa item.</p></div><button class="ghost" id="addItemKeluar">＋ Tambah Item</button></div><div id="keluarItems"></div><div class="form-actions"><button class="primary" id="saveKeluar">Rekam Transaksi & Kurangi Stok</button><button class="ghost" id="cancelKeluar">Batal</button></div></section>`}

function keluarItemRow(items){
  const id='ki_'+Math.random().toString(36).slice(2,9);
  return '<div class="transaction-row" data-row="'+id+'"><select class="ki-barang"><option value="">- Pilih barang -</option>'+
    items.map(x=>{
      const kat=String(x.kategori?.nama_kategori||'').toLowerCase(),isKuasi=kat.includes('kuasi');
      return '<option value="'+x.id+'" data-stock="'+x.sisa+'" data-unit="'+esc(x.satuan||'')+'" data-kuasi="'+(isKuasi?'kuasi':'')+'">'+esc(x.nama_barang)+' — stok '+x.sisa+' '+esc(x.satuan||'')+(isKuasi?' — FIFO Kuasi':'')+'</option>';
    }).join('')+
    '</select><input class="ki-jumlah" type="text" inputmode="numeric" data-number-format="integer" value="1" placeholder="Jumlah"><span class="kuasi-hint" aria-live="polite"></span><button type="button" class="btn-sm danger remove-item" title="Hapus baris barang" aria-label="Hapus baris barang">×</button></div>';
}

async function stockOpnamePage(){const [{data:rows,error},{data:items,error:ie}]=await Promise.all([client.from('riwayat_opname').select('*,barang:barang_id(nama_barang)').order('id',{ascending:false}).limit(200),client.from('barang').select('id,nama_barang,sisa,satuan').order('nama_barang')]);if(error||ie)throw(error||ie);return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">PERSEDIAAN</span><h2>Stock Opname</h2><p>Penyesuaian stok fisik terhadap stok sistem.</p></div><button class="primary" id="addOpname">＋ Rekam Stock Opname</button></div><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Barang</th><th>Sistem</th><th>Fisik</th><th>Selisih</th><th>Petugas</th><th>Keterangan</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${fmtDate(r.tanggal_opname)}</td><td>${esc(r.barang?.nama_barang||'-')}</td><td>${r.stok_sistem}</td><td>${r.stok_fisik}</td><td><span class="stock ${r.selisih<0?'low':''}">${r.selisih>0?'+':''}${r.selisih}</span></td><td>${esc(r.petugas||'-')}</td><td>${esc(r.keterangan||'-')}</td></tr>`).join('')||emptyRow(7)}</tbody></table></div></section>`}

async function kuasiPage(){
  const {data,error}=await client.from('stok_kuasi').select('id,barang_id,prefix_huruf,panjang_digit,digit_awal,digit_akhir,digit_sekarang,sisa_lembar,tanggal_masuk,nomor_dus,barang:barang_id(nama_barang,satuan)').gt('sisa_lembar',0).order('tanggal_masuk',{ascending:true}).order('id',{ascending:true});
  if(error)throw error;
  const rows=data||[];
  const grouped={};
  rows.forEach(r=>{const k=r.barang_id;if(!grouped[k])grouped[k]=[];grouped[k].push(r)});
  const totalLembar=rows.reduce((n,r)=>n+(Number(r.sisa_lembar)||0),0);
  const itemCount=Object.keys(grouped).length;
  const firstByBarang=new Set(Object.values(grouped).map(g=>g[0]?.id));
  const batchRows=rows.map(r=>{
    const pad=Number(r.panjang_digit)||0,p=r.prefix_huruf||'';
    const awal=p+String(r.digit_awal).padStart(pad,'0'),akhir=p+String(r.digit_akhir).padStart(pad,'0'),sekarang=p+String(r.digit_sekarang).padStart(pad,'0');
    const first=firstByBarang.has(r.id);
    return '<tr class="kuasi-batch-row" data-id="'+r.id+'"><td><strong>'+esc(r.barang?.nama_barang||'-')+'</strong><br><small>'+esc(r.barang?.satuan||'')+'</small></td><td>'+fmtDate(r.tanggal_masuk)+'</td><td>'+esc(awal)+' → '+esc(akhir)+'</td><td><strong>'+esc(sekarang)+' → '+esc(akhir)+'</strong></td><td><span class="stock '+(Number(r.sisa_lembar)<=20?'low':'')+'">'+r.sisa_lembar+'</span></td><td>'+esc(r.nomor_dus||'-')+'</td><td>'+(first?'<span class="badge-soft success">FIFO berikutnya</span>':'<span class="badge-soft">Menunggu</span>')+'</td><td><button class="btn-sm view-kuasi" data-id="'+r.id+'">Detail</button></td></tr>';
  }).join('');
  return '<section class="card page-card"><div class="section-head"><div><span class="eyebrow">PERSEDIAAN BERSERI</span><h2>Stok Kuasi</h2><p>Pantau batch, rentang nomor, saldo lembar, dan antrean FIFO secara terperinci.</p></div><span class="status-pill">'+rows.length+' batch aktif</span></div>'+
  '<div class="kuasi-summary-grid"><div class="kartu-summary"><span class="kartu-summary-icon">'+navSvg('barang')+'</span><div><small>Item Kuasi</small><strong>'+itemCount+'</strong></div></div><div class="kartu-summary"><span class="kartu-summary-icon">'+navSvg('kartu')+'</span><div><small>Batch Aktif</small><strong>'+rows.length+'</strong></div></div><div class="kartu-summary"><span class="kartu-summary-icon">'+navSvg('stock_opname')+'</span><div><small>Total Lembar</small><strong>'+totalLembar.toLocaleString('id-ID')+'</strong></div></div><div class="kartu-summary '+(rows.some(r=>Number(r.sisa_lembar)<=20)?'attention':'')+'"><span class="kartu-summary-icon">'+navSvg('barang_keluar')+'</span><div><small>Batch Menipis</small><strong>'+rows.filter(r=>Number(r.sisa_lembar)<=20).length+'</strong></div></div></div>'+
  '<div class="alert-box kuasi-fifo-banner"><strong>FIFO aktif:</strong> batch paling lama pada masing-masing barang berada paling depan dalam antrean distribusi. Klik <b>Detail</b> untuk melihat informasi batch dan riwayat distribusi.</div>'+
  '<div class="table-wrap"><table id="kuasiTable"><thead><tr><th>Barang</th><th>Tgl Masuk</th><th>Rentang Batch</th><th>Nomor Berikutnya</th><th>Sisa</th><th>No. Dus</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+(batchRows||emptyRow(8))+'</tbody></table></div></section>';
}

async function showKuasiDetail(id){
  const [{data:batch,error:be},{data:allocations,error:ae},{data:legacy,error:le}]=await Promise.all([
    client.from('stok_kuasi').select('id,barang_id,prefix_huruf,panjang_digit,digit_awal,digit_akhir,digit_sekarang,sisa_lembar,tanggal_masuk,nomor_dus,barang:barang_id(nama_barang,satuan,merk,tipe)').eq('id',id).single(),
    client.from('transaksi_kuasi_alokasi').select('id,transaksi_keluar_id,detail_barang_keluar_id,jumlah,digit_awal,digit_akhir,created_at,transaksi:transaksi_keluar_id(id,tanggal_keluar,penerima_nama,penerima_jabatan,tujuan_ruangan,status,jenis_dokumen),detail:detail_barang_keluar_id(nomor_awal,nomor_akhir,nomor_dus)').eq('stok_kuasi_id',id).order('id',{ascending:false}),
    client.from('detail_barang_keluar').select('id,jumlah,nomor_awal,nomor_akhir,nomor_dus,transaksi:transaksi_keluar_id(id,status)').eq('barang_id',id).limit(5000)
  ]);
  if(be||ae||le)throw(be||ae||le);
  const pad=Number(batch.panjang_digit)||0,p=batch.prefix_huruf||'';
  const awal=p+String(batch.digit_awal).padStart(pad,'0'),akhir=p+String(batch.digit_akhir).padStart(pad,'0'),sekarang=p+String(batch.digit_sekarang).padStart(pad,'0');
  const related=(allocations||[]).filter(r=>(r.transaksi?.status||'AKTIF')==='AKTIF');
  const allocatedDetailIds=new Set((allocations||[]).map(r=>Number(r.detail_barang_keluar_id)));
  const legacyUntracked=(legacy||[]).filter(r=>(r.transaksi?.status||'AKTIF')==='AKTIF'&&!allocatedDetailIds.has(Number(r.id)));
  const box=document.createElement('div');box.className='modal-backdrop';
  box.innerHTML='<div class="modal-card kuasi-detail-modal"><div class="modal-head"><div><span class="eyebrow">DETAIL BATCH KUASI</span><h2>'+esc(batch.barang?.nama_barang||'-')+'</h2><p>'+esc(batch.barang?.satuan||'')+' · '+esc(batch.barang?.merk||'-')+' / '+esc(batch.barang?.tipe||'-')+'</p></div><button class="modal-close" aria-label="Tutup">×</button></div>'+
  '<div class="kuasi-detail-summary"><div><small>Tanggal Masuk</small><strong>'+fmtDate(batch.tanggal_masuk)+'</strong></div><div><small>No. Dus</small><strong>'+esc(batch.nomor_dus||'-')+'</strong></div><div><small>Rentang</small><strong>'+esc(awal)+' → '+esc(akhir)+'</strong></div><div><small>Nomor Berikutnya</small><strong>'+esc(sekarang)+'</strong></div><div><small>Sisa Lembar</small><strong>'+batch.sisa_lembar+'</strong></div></div>'+
  '<div class="alert-box"><strong>FIFO:</strong> histori di bawah diambil langsung dari <b>transaksi_kuasi_alokasi</b>, sehingga hubungan batch dan transaksi tidak lagi ditebak dari nomor dus/seri.</div>'+
  '<div class="section-head compact"><div><h3>Riwayat Distribusi Batch</h3><p>'+related.length+' alokasi tercatat secara exact.</p></div></div>'+
  '<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Transaksi</th><th>Jumlah</th><th>Nomor Seri</th><th>No. Dus</th><th>Penerima</th><th>Tujuan</th></tr></thead><tbody>'+
  (related.map(r=>'<tr><td>'+fmtDate(r.transaksi?.tanggal_keluar)+'</td><td>#'+r.transaksi_keluar_id+'</td><td>'+r.jumlah+'</td><td>'+esc(r.detail?.nomor_awal&&r.detail?.nomor_akhir?r.detail.nomor_awal+' → '+r.detail.nomor_akhir:'-')+'</td><td>'+esc(r.detail?.nomor_dus||batch.nomor_dus||'-')+'</td><td>'+esc(r.transaksi?.penerima_nama||'-')+'</td><td>'+esc(r.transaksi?.tujuan_ruangan||'-')+'</td></tr>').join('')||emptyRow(7))+
  '</tbody></table></div>'+
  (legacyUntracked.length?'<div class="alert-box kuasi-legacy-warning"><strong>Catatan data lama:</strong> '+legacyUntracked.length+' detail Barang Keluar lama belum memiliki alokasi batch. Data tersebut tidak dimasukkan ke histori batch agar tidak menghasilkan hubungan yang keliru.</div>':'')+
  '</div>';
  document.body.appendChild(box);
  enhanceTables(box);
  const close=()=>box.remove();
  box.querySelector('.modal-close').onclick=close;
  box.onclick=e=>{if(e.target===box)close()};
}

async function kartuPage(){
  const {data:items,error}=await client.from('barang').select('id,nama_barang,satuan,merk,tipe,sisa,stok_minimum,harga_terakhir,kategori:kategori_id(id,nama_kategori)').order('nama_barang');
  if(error)throw error;
  const totalNilai=(items||[]).reduce((n,r)=>n+(Number(r.sisa)||0)*(Number(r.harga_terakhir)||0),0);
  const totalStok=(items||[]).reduce((n,r)=>n+(Number(r.sisa)||0),0);
  const needAttention=(items||[]).filter(r=>Number(r.sisa||0)<=Number(r.stok_minimum||0)).length;
  const categories=[...new Map((items||[]).map(r=>[r.kategori_id,r.kategori?.nama_kategori||'Tanpa Kategori'])).entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1])));
  return '<section class="card page-card"><div class="section-head"><div><span class="eyebrow">PERSEDIAAN</span><h2>Kartu Persediaan</h2><p>Rekap saldo, nilai persediaan, dan seluruh mutasi per barang.</p></div><div class="kartu-head-actions"><span class="status-pill">'+items.length+' barang</span></div></div>'+
  '<div class="kartu-summary-grid"><div class="kartu-summary"><span class="kartu-summary-icon">'+navSvg('barang')+'</span><div><small>Total Barang</small><strong>'+items.length+'</strong></div></div><div class="kartu-summary"><span class="kartu-summary-icon">'+navSvg('stock_opname')+'</span><div><small>Total Saldo</small><strong>'+totalStok.toLocaleString('id-ID')+'</strong></div></div><div class="kartu-summary"><span class="kartu-summary-icon">'+navSvg('barang_masuk')+'</span><div><small>Nilai Persediaan</small><strong>'+rupiah(totalNilai)+'</strong></div></div><div class="kartu-summary '+(needAttention?'attention':'')+'"><span class="kartu-summary-icon">'+navSvg('barang_keluar')+'</span><div><small>Perlu Perhatian</small><strong>'+needAttention+'</strong></div></div></div>'+
  '<div class="filter-bar"><div class="search-box">⌕<input id="kartuSearch" placeholder="Cari nama, tipe, merk, atau kategori..."></div><select id="kartuFilterKategori"><option value="">Semua kategori</option>'+categories.map(x=>'<option value="'+esc(x[0]??'')+'">'+esc(x[1])+'</option>').join('')+'</select><select id="kartuFilterStatus"><option value="">Semua stok</option><option value="aman">Stok aman</option><option value="menipis">Stok menipis</option><option value="habis">Stok habis</option></select><select id="kartuBarang"><option value="">-- Pilih barang --</option>'+items.map(r=>'<option value="'+r.id+'">'+esc(r.nama_barang)+' — '+esc(r.satuan||'-')+'</option>').join('')+'</select></div>'+
  '<div id="kartuDetail"></div><div class="table-wrap"><table id="kartuTable"><thead><tr><th>Barang</th><th>Kategori</th><th>Satuan</th><th>Saldo</th><th>Minimum</th><th>Harga Terakhir</th><th>Nilai Sisa</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
  (items.map(r=>{const s=Number(r.sisa)||0,m=Number(r.stok_minimum)||0,status=s<=0?'habis':s<=m?'menipis':'aman';return '<tr data-kategori="'+(r.kategori_id??'')+'" data-status="'+status+'" data-search="'+esc([r.nama_barang,r.merk,r.tipe,r.satuan,r.kategori?.nama_kategori].join(' ').toLowerCase())+'"><td><strong>'+esc(r.nama_barang)+'</strong><br><small>'+esc([r.tipe,r.merk].filter(Boolean).join(' · '))+'</small></td><td>'+esc(r.kategori?.nama_kategori||'-')+'</td><td>'+esc(r.satuan||'-')+'</td><td><span class="stock '+(s<=m?'low':'')+'">'+s+'</span></td><td>'+m+'</td><td>'+rupiah(r.harga_terakhir)+'</td><td>'+rupiah(s*(Number(r.harga_terakhir)||0))+'</td><td><span class="badge-soft '+(status==='aman'?'success':'')+'">'+(status==='habis'?'Habis':status==='menipis'?'Menipis':'Aman')+'</span></td><td><button class="btn-sm view-kartu" data-id="'+r.id+'">Lihat Kartu</button></td></tr>'}).join('')||emptyRow(9))+
  '</tbody></table></div></section>';
}

async function loadKartuDetail(id){
  const [{data:item,error:ie},{data:masuk,error:me},{data:keluar,error:ke},{data:opname,error:oe}]=await Promise.all([
    client.from('barang').select('id,nama_barang,satuan,merk,tipe,sisa,stok_minimum,harga_terakhir,kategori:kategori_id(nama_kategori)').eq('id',id).single(),
    client.from('barang_masuk').select('id,tanggal_masuk,jumlah,harga_satuan,nama_penyerah,nama_penerima,keterangan,nomor_awal,nomor_akhir,nomor_dus').eq('barang_id',id).order('tanggal_masuk',{ascending:true}).order('id',{ascending:true}),
    client.from('detail_barang_keluar').select('id,transaksi_keluar_id,jumlah,nomor_awal,nomor_akhir,nomor_dus,transaksi:transaksi_keluar_id(id,tanggal_keluar,penerima_nama,penerima_jabatan,penerima_nip,tujuan_ruangan,status,jenis_dokumen)').eq('barang_id',id).order('id',{ascending:true}),
    client.from('riwayat_opname').select('id,tanggal_opname,stok_sistem,stok_fisik,selisih,keterangan,petugas').eq('barang_id',id).order('tanggal_opname',{ascending:true}).order('id',{ascending:true})
  ]);
  if(ie||me||ke||oe)throw(ie||me||ke||oe);
  const rows=[
    ...(masuk||[]).map(r=>({date:r.tanggal_masuk,type:'MASUK',qtyIn:Number(r.jumlah)||0,qtyOut:0,price:Number(r.harga_satuan)||0,desc:'Penerimaan dari '+(r.nama_penyerah||'-')+(r.keterangan?' [Keterangan: '+r.keterangan+']':'')+(r.nomor_awal?' [Seri: '+r.nomor_awal+' - '+(r.nomor_akhir||'-')+']':'')+(r.nomor_dus?' [Dus: '+r.nomor_dus+']':''),id:r.id})),
    ...(keluar||[]).filter(r=>(r.transaksi?.status||'AKTIF')==='AKTIF').map(r=>({date:r.transaksi?.tanggal_keluar,type:'KELUAR',qtyIn:0,qtyOut:Number(r.jumlah)||0,price:0,desc:'Distribusi ke '+(r.transaksi?.penerima_nama||'-')+' ('+(r.transaksi?.tujuan_ruangan||'Umum')+')'+(r.nomor_awal?' [Seri: '+r.nomor_awal+(r.nomor_akhir?' - '+r.nomor_akhir:'')+']':'')+(r.nomor_dus?' [Dus '+r.nomor_dus+']':''),id:r.id})),
    ...(opname||[]).map(r=>({date:r.tanggal_opname,type:r.selisih>0?'OPNAME IN':r.selisih<0?'OPNAME OUT':'OPNAME',qtyIn:r.selisih>0?Number(r.selisih):0,qtyOut:r.selisih<0?Math.abs(Number(r.selisih)):0,price:0,desc:'Penyesuaian opname: '+(r.keterangan||'-')+' · Petugas '+(r.petugas||'-'),id:r.id}))
  ].filter(r=>r.date).sort((x,y)=>String(x.date).localeCompare(String(y.date))||Number(x.id)-Number(y.id));
  const net=rows.reduce((n,r)=>n+r.qtyIn-r.qtyOut,0);
  const opening=Number(item.sisa||0)-net;
  let saldo=opening;
  rows.forEach(r=>{saldo+=r.qtyIn-r.qtyOut;r.saldo=saldo});
  const totalIn=rows.reduce((n,r)=>n+r.qtyIn,0);
  const totalOut=rows.reduce((n,r)=>n+r.qtyOut,0);
  const adj=rows.reduce((n,r)=>n+(r.type==='OPNAME IN'?r.qtyIn:r.type==='OPNAME OUT'?-r.qtyOut:0),0);
  const nilai=(Number(item.sisa)||0)*(Number(item.harga_terakhir)||0);
  const status=Number(item.sisa||0)<=0?'Habis':Number(item.sisa||0)<=Number(item.stok_minimum||0)?'Menipis':'Aman';
  const movementRows=rows.map((r,i)=>'<tr><td>'+(i+1)+'</td><td>'+fmtDate(r.date)+'</td><td><span class="badge-soft '+(r.type==='MASUK'||r.type==='OPNAME IN'?'success':'')+'">'+r.type+'</span></td><td>'+esc(r.desc)+'</td><td>'+(r.price?rupiah(r.price):'-')+'</td><td>'+(r.qtyIn||'-')+'</td><td>'+(r.qtyOut||'-')+'</td><td><strong>'+r.saldo+'</strong></td></tr>').join('');
  $('kartuDetail').innerHTML=`<section class="card page-card kartu-detail-card" data-barang-id="${id}"><div class="section-head"><div><span class="eyebrow">KARTU PERSEDIAAN · MUTASI</span><h3>${esc(item.nama_barang)}</h3><p>${esc(item.kategori?.nama_kategori||'-')} · ${esc(item.merk||'-')} / ${esc(item.tipe||'-')}</p></div><div class="row-actions"><span class="badge-soft ${status==='Aman'?'success':''}">${status}</span><button class="ghost" id="closeKartu">Tutup Detail</button></div></div><div class="kartu-detail-summary"><div><small>Saldo Sekarang</small><strong>${item.sisa} ${esc(item.satuan||'')}</strong></div><div><small>Saldo Awal Berdasarkan Mutasi</small><strong>${opening}</strong></div><div><small>Total Masuk</small><strong>${totalIn}</strong></div><div><small>Total Keluar</small><strong>${totalOut}</strong></div><div><small>Penyesuaian</small><strong>${adj}</strong></div><div><small>Nilai Sisa</small><strong>${rupiah(nilai)}</strong></div></div><div class="kartu-legend"><span><i class="in"></i> Masuk</span><span><i class="out"></i> Keluar</span><span><i class="adj"></i> Opname</span></div><div class="table-wrap"><table><thead><tr><th>No</th><th>Tanggal</th><th>Jenis</th><th>Uraian / Kronologi</th><th>Harga Beli</th><th>Masuk</th><th>Keluar</th><th>Sisa Saldo</th></tr></thead><tbody>${movementRows||emptyRow(8)}</tbody></table></div></section>`;
  $('closeKartu').onclick=()=>$('kartuDetail').innerHTML='';
  enhanceTables($('kartuDetail'));
  $('closeKartu').onclick=()=>$('kartuDetail').innerHTML='';
  enhanceTables($('kartuDetail'));
}


async function fetchAllSipbRows(table,select='*'){
  const all=[],pageSize=1000;
  let offset=0;
  while(true){
    const q=await client.from(table).select(select).range(offset,offset+pageSize-1);
    if(q.error)throw q.error;
    const rows=q.data||[];
    all.push(...rows);
    if(rows.length<pageSize)break;
    offset+=pageSize;
  }
  return all;
}
function sipbBackupTables(){
  return ['kategori','pegawai','barang','barang_masuk','stok_kuasi','transaksi_keluar','detail_barang_keluar','transaksi_kuasi_alokasi','riwayat_opname'];
}
async function createSipbBackup(){
  if(profile?.role!=='admin')return toast('Hanya admin yang dapat membuat backup.','error');
  try{
    toast('Membuat backup SIPB...');
    const payload={format:'SIPB_BACKUP',format_version:'1',application:'SIPB · UPTD PPD Malingping',created_at:new Date().toISOString(),scope:'data persediaan; akun Supabase Auth tidak termasuk',tables:{}};
    for(const table of sipbBackupTables())payload.tables[table]=await fetchAllSipbRows(table);
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    downloadTableBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),'SIPB-backup-'+stamp+'.json');
    toast('Backup berhasil dibuat.');
  }catch(e){fail(e)}
}
async function restoreSipbBackup(file){
  if(profile?.role!=='admin')return toast('Hanya admin yang dapat melakukan restore.','error');
  if(!file)return;
  try{
    const payload=JSON.parse(await file.text());
    const required=sipbBackupTables();
    if(payload?.format!=='SIPB_BACKUP'||payload?.format_version!=='1'||!payload?.tables)throw new Error('File backup SIPB tidak valid.');
    const missing=required.filter(t=>!Array.isArray(payload.tables[t]));
    if(missing.length)throw new Error('Backup tidak lengkap: '+missing.join(', '));
    const total=required.reduce((n,t)=>n+(payload.tables[t]?.length||0),0);
    if(!(await sipbConfirm('Restore akan mengganti seluruh data persediaan SIPB dengan isi backup. Data yang ada saat ini akan diganti. Akun login Supabase Auth tidak diubah. Lanjutkan dengan '+total.toLocaleString('id-ID')+' baris?')))return;
    const btn=$('restoreBackup');
    if(btn){btn.disabled=true;btn.textContent='Memulihkan...';}
    const result=await client.rpc('restore_sipb_backup',{p_backup:payload});
    if(result.error)throw result.error;
    toast('Restore berhasil.');
    renderApp('dashboard');
  }catch(e){fail(e)}
  finally{
    const btn=$('restoreBackup');
    if(btn){btn.disabled=false;btn.textContent='Restore dari File';}
  }
}
function reportTypeLabel(type){
  return type==='MASUK'?'Barang Masuk':type==='KELUAR'?'Barang Keluar':'Stock Opname';
}
async function laporanPage(){
  const [barang,masuk,keluar,opname,details]=await Promise.all([
    fetchAllSipbRows('barang','id,nama_barang,satuan,harga_terakhir,kategori:kategori_id(id,nama_kategori)'),
    fetchAllSipbRows('barang_masuk','id,barang_id,jumlah,harga_satuan,tanggal_masuk,nama_penyerah,nama_penerima,sumber_dana,keterangan,nomor_awal,nomor_akhir,nomor_dus'),
    fetchAllSipbRows('transaksi_keluar','id,tanggal_keluar,penerima_nama,tujuan_ruangan,jenis_dokumen,status'),
    fetchAllSipbRows('riwayat_opname','id,tanggal_opname,barang_id,stok_sistem,stok_fisik,selisih,keterangan,petugas'),
    fetchAllSipbRows('detail_barang_keluar','id,transaksi_keluar_id,barang_id,jumlah,nomor_awal,nomor_akhir,nomor_dus')
  ]);
  const bmap=Object.fromEntries((barang||[]).map(x=>[x.id,x]));
  const txmap=Object.fromEntries((keluar||[]).map(x=>[x.id,x]));
  const rows=[
    ...(masuk||[]).map(r=>{
      const b=bmap[r.barang_id]||{};
      return {id:'M'+r.id,type:'MASUK',date:r.tanggal_masuk,barang:b.nama_barang||'-',category:b.kategori?.nama_kategori||'Tanpa Kategori',unit:b.satuan||'-',qty:Number(r.jumlah)||0,value:(Number(r.jumlah)||0)*(Number(r.harga_satuan)||0),party:r.nama_penyerah||'-',target:r.nama_penerima||'-',note:(r.sumber_dana||'-')+(r.keterangan?' · '+r.keterangan:'')+(r.nomor_dus?' · Dus '+r.nomor_dus:'')+(r.nomor_awal?' · '+r.nomor_awal+' → '+(r.nomor_akhir||'-'):'')};
    }),
    ...(details||[]).filter(d=>(txmap[d.transaksi_keluar_id]?.status||'AKTIF')==='AKTIF').map(d=>{
      const b=bmap[d.barang_id]||{},t=txmap[d.transaksi_keluar_id]||{};
      return {id:'K'+d.id,type:'KELUAR',date:t.tanggal_keluar,barang:b.nama_barang||'-',category:b.kategori?.nama_kategori||'Tanpa Kategori',unit:b.satuan||'-',qty:Number(d.jumlah)||0,value:0,party:t.penerima_nama||'-',target:t.tujuan_ruangan||'-',note:(t.jenis_dokumen||'Nota Dinas')+(d.nomor_dus?' · Dus '+d.nomor_dus:'')+(d.nomor_awal?' · '+d.nomor_awal+' → '+(d.nomor_akhir||'-'):'')};
    }),
    ...(opname||[]).map(r=>{
      const b=bmap[r.barang_id]||{};
      return {id:'O'+r.id,type:'OPNAME',date:r.tanggal_opname,barang:b.nama_barang||'-',category:b.kategori?.nama_kategori||'Tanpa Kategori',unit:b.satuan||'-',qty:Number(r.selisih)||0,value:0,party:r.petugas||'-',target:'Stok Fisik',note:'Sistem '+(r.stok_sistem??0)+' → Fisik '+(r.stok_fisik??0)+(r.keterangan?' · '+r.keterangan:'')};
    })
  ].filter(r=>r.date).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.id).localeCompare(String(a.id)));
  window.__sipbReportRows=rows;
  const categories=[...new Set(rows.map(r=>r.category))].sort((a,b)=>a.localeCompare(b,'id'));
  const d=new Date(),first=new Date(d.getFullYear(),d.getMonth(),1),last=new Date(d.getFullYear(),d.getMonth()+1,0);
  const iso=x=>x.toISOString().slice(0,10);
  return '<section class="card page-card report-page"><div class="section-head"><div><span class="eyebrow">PELAPORAN</span><h2>Laporan Persediaan</h2><p>Rekap penerimaan, pengeluaran, dan penyesuaian stok berdasarkan periode.</p></div><span class="status-pill">'+rows.length+' mutasi</span></div>'+
    '<div class="report-filter-bar"><label>Tanggal Awal<input id="reportFrom" type="date" value="'+iso(first)+'"></label><label>Tanggal Akhir<input id="reportTo" type="date" value="'+iso(last)+'"></label><label>Jenis<select id="reportType"><option value="">Semua jenis</option><option value="MASUK">Barang Masuk</option><option value="KELUAR">Barang Keluar</option><option value="OPNAME">Stock Opname</option></select></label><label>Kategori<select id="reportCategory"><option value="">Semua kategori</option>'+categories.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('')+'</select></label></div>'+
    '<div class="report-summary-grid"><div class="kartu-summary"><small>Total Mutasi</small><strong id="reportTotal">0</strong></div><div class="kartu-summary"><small>Total Masuk</small><strong id="reportIn">0</strong></div><div class="kartu-summary"><small>Total Keluar</small><strong id="reportOut">0</strong></div><div class="kartu-summary"><small>Selisih Opname</small><strong id="reportAdj">0</strong></div><div class="kartu-summary"><small>Nilai Penerimaan</small><strong id="reportValue">Rp0</strong></div></div>'+
    '<div class="table-wrap"><table id="laporanTable"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Barang</th><th>Kategori</th><th>Jumlah</th><th>Satuan</th><th>Nilai Penerimaan</th><th>Pihak</th><th>Tujuan</th><th>Keterangan</th></tr></thead><tbody></tbody></table></div></section>';
}
function applyLaporanFilter(){
  const from=$('reportFrom')?.value||'',to=$('reportTo')?.value||'',type=$('reportType')?.value||'',category=$('reportCategory')?.value||'';
  const rows=(window.__sipbReportRows||[]).filter(r=>(!from||String(r.date)>=from)&&(!to||String(r.date)<=to)&&(!type||r.type===type)&&(!category||r.category===category));
  const body=$('laporanTable')?.tBodies?.[0];
  if(body)body.innerHTML=rows.length?rows.map(r=>'<tr><td>'+fmtDate(r.date)+'</td><td><span class="badge-soft '+(r.type==='MASUK'?'success':'')+'">'+reportTypeLabel(r.type)+'</span></td><td><strong>'+esc(r.barang)+'</strong></td><td>'+esc(r.category)+'</td><td class="'+(r.type==='OPNAME'&&r.qty<0?'stock low':'')+'">'+(r.type==='OPNAME'&&r.qty>0?'+':'')+r.qty+'</td><td>'+esc(r.unit)+'</td><td>'+(r.value?rupiah(r.value):'-')+'</td><td>'+esc(r.party)+'</td><td>'+esc(r.target)+'</td><td>'+esc(r.note)+'</td></tr>').join(''):emptyRow(10);
  const totalIn=rows.filter(r=>r.type==='MASUK').reduce((n,r)=>n+r.qty,0);
  const totalOut=rows.filter(r=>r.type==='KELUAR').reduce((n,r)=>n+r.qty,0);
  const adj=rows.filter(r=>r.type==='OPNAME').reduce((n,r)=>n+r.qty,0);
  const value=rows.reduce((n,r)=>n+r.value,0);
  $('reportTotal').textContent=rows.length.toLocaleString('id-ID');
  $('reportIn').textContent=totalIn.toLocaleString('id-ID');
  $('reportOut').textContent=totalOut.toLocaleString('id-ID');
  $('reportAdj').textContent=(adj>0?'+':'')+adj.toLocaleString('id-ID');
  $('reportValue').textContent=rupiah(value);
  $('content')?.querySelector('.report-page .status-pill')?.replaceChildren(document.createTextNode(rows.length+' mutasi'));
  const table=$('laporanTable');
  table?.refreshPagination?.();
}

async function backupPage(){
  if(profile?.role!=='admin')return '<section class="card error-card"><h2>Akses ditolak</h2><p>Halaman Backup & Restore hanya dapat diakses admin.</p></section>';
  const names=sipbBackupTables();
  const counts=await Promise.all(names.map(t=>count(t)));
  const total=counts.reduce((n,x)=>n+x,0);
  return '<section class="card page-card backup-page"><div class="section-head"><div><span class="eyebrow">ADMINISTRASI DATA</span><h2>Backup & Restore</h2><p>Simpan dan pulihkan data persediaan SIPB melalui file JSON.</p></div><span class="status-pill">'+total.toLocaleString('id-ID')+' baris data</span></div>'+
    '<div class="backup-summary"><div class="kartu-summary"><small>Total Baris Data</small><strong>'+total.toLocaleString('id-ID')+'</strong></div><div class="kartu-summary"><small>Tabel</small><strong>'+names.length+'</strong></div><div class="kartu-summary"><small>Akses</small><strong>Admin</strong></div></div>'+
    '<div class="backup-actions"><button class="primary" id="downloadBackup">↓ Buat Backup</button><button class="ghost" id="restoreBackup">Restore dari File</button><input id="restoreBackupFile" type="file" accept=".json,application/json" hidden></div>'+
    '<div class="alert-box"><strong>Penting:</strong> Restore mengganti data persediaan pada tabel SIPB berdasarkan file backup. Akun login Supabase Auth tidak termasuk dan tidak diubah.</div>'+
    '<div class="table-wrap"><table><thead><tr><th>Tabel</th><th>Data</th></tr></thead><tbody>'+names.map((n,i)=>'<tr><td><strong>'+n+'</strong></td><td>'+counts[i].toLocaleString('id-ID')+'</td></tr>').join('')+'</tbody></table></div></section>';
}

async function kategoriPage(){const {data,error}=await client.from('kategori').select('*').order('id');if(error)throw error;return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">DATA REFERENSI</span><h2>Kategori</h2><p>Kelola klasifikasi barang.</p></div>${profile?.role==='admin'?'<button class="primary" id="addKategori">＋ Tambah Kategori</button>':''}</div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Nama Kategori</th><th>Aksi</th></tr></thead><tbody>${data.map(r=>`<tr><td>#${r.id}</td><td><strong>${esc(r.nama_kategori)}</strong></td><td>${profile?.role==='admin'?'<div class="actions"><button class="btn-sm edit-kat" data-id="'+r.id+'">Edit</button><button class="btn-sm danger delete-kat" data-id="'+r.id+'">Hapus</button></div>':'<span class="badge-soft">Lihat</span>'}</td></tr>`).join('')||emptyRow(3)}</tbody></table></div></section>`}
async function penggunaPage(){
  if(profile?.role!=='admin')return '<section class="card error-card"><h2>Akses ditolak</h2><p>Halaman ini hanya dapat diakses admin.</p></section>';
  const {data,error}=await client.from('user_profiles').select('id,legacy_user_id,username,nama_lengkap,role,is_active,created_at').order('nama_lengkap');
  if(error)throw error;
  const rows=data||[];
  const active=rows.filter(u=>u.is_active).length;
  const admins=rows.filter(u=>u.is_active&&u.role==='admin').length;
  return '<section class="card page-card"><div class="section-head"><div><span class="eyebrow">ADMINISTRASI</span><h2>Kelola Pengguna</h2><p>Kelola akun SIPB, peran, dan status pengguna.</p></div><div class="kartu-head-actions"><span class="status-pill">'+rows.length+' pengguna</span><button class="primary" id="addUser">＋ Tambah Pengguna</button></div></div>'+
  '<div class="user-summary-grid"><div class="kartu-summary"><span class="kartu-summary-icon">'+navSvg('pengguna')+'</span><div><small>Total Pengguna</small><strong>'+rows.length+'</strong></div></div><div class="kartu-summary"><span class="kartu-summary-icon">'+navSvg('stock_opname')+'</span><div><small>Aktif</small><strong>'+active+'</strong></div></div><div class="kartu-summary"><span class="kartu-summary-icon">'+navSvg('dashboard')+'</span><div><small>Admin Aktif</small><strong>'+admins+'</strong></div></div></div>'+
  '<div class="alert-box"><strong>Keamanan:</strong> akun baru otomatis dibuat sebagai <b>User</b>. Pembuatan akun Auth dilakukan di server agar password tidak tersimpan atau diproses sebagai kredensial admin di browser.</div>'+
  '<div class="filter-bar"><div class="search-box">⌕<input id="userSearch" placeholder="Cari nama atau username..."></div><select id="userRoleFilter"><option value="">Semua role</option><option value="admin">Admin</option><option value="user">User</option></select><select id="userStatusFilter"><option value="">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select><span id="userCount" class="result-count">'+rows.length+' data</span></div>'+
  '<div class="table-wrap"><table id="userTable"><thead><tr><th>Pengguna</th><th>Username</th><th>Dibuat</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
  (rows.map(u=>'<tr data-search="'+esc([u.nama_lengkap,u.username,u.id].join(' ').toLowerCase())+'" data-role="'+esc(u.role||'user')+'" data-status="'+(u.is_active?'active':'inactive')+'"><td><strong>'+esc(u.nama_lengkap||'-')+'</strong><br><small>'+esc(u.id)+'</small></td><td>'+esc(u.username||'-')+'</td><td>'+fmtDate(u.created_at)+'</td><td><select class="user-role" data-id="'+u.id+'"><option value="admin" '+(u.role==='admin'?'selected':'')+'>Admin</option><option value="user" '+(u.role==='user'?'selected':'')+'>User</option></select></td><td><button type="button" class="status-toggle '+(u.is_active?'on':'')+'" data-id="'+u.id+'" data-active="'+(u.is_active?'1':'0')+'"><span></span>'+(u.is_active?'Aktif':'Nonaktif')+'</button></td><td><div class="actions"><button type="button" class="btn-sm edit-user" data-id="'+u.id+'">Edit Profil</button><button class="btn-sm user-save" data-id="'+u.id+'">Simpan</button></div></td></tr>').join('')||emptyRow(7))+
  '</tbody></table></div></section>';
}

async function showUserEditModal(id){
  const target=String(id||'');
  if(!target)return;
  const {data:user,error}=await client.from('user_profiles')
    .select('id,username,nama_lengkap,role,is_active')
    .eq('id',target)
    .maybeSingle();
  if(error)throw error;
  if(!user)return toast('Profil pengguna tidak ditemukan.','error');

  const old=document.getElementById('editUserModal');
  if(old)old.remove();
  const wrap=document.createElement('div');
  wrap.id='editUserModal';
  wrap.className='modal-backdrop';
  wrap.innerHTML='<div class="modal-card user-create-modal"><div class="modal-head"><div><span class="eyebrow">ADMINISTRASI</span><h2>Edit Profil User</h2><p>Perbarui identitas dan kredensial akun pengguna.</p></div><button type="button" class="modal-close" aria-label="Tutup">×</button></div>'+
    '<form id="editUserForm"><div class="form-grid">'+
    '<label>Nama Lengkap <input id="editUserName" required maxlength="120" value="'+esc(user.nama_lengkap||'')+'"></label>'+
    '<label>Username <input id="editUserUsername" required maxlength="50" value="'+esc(user.username||'')+'"></label>'+
    '<label>Email Baru <input id="editUserEmail" type="email" maxlength="160" placeholder="Biarkan kosong jika tidak diubah"></label>'+
    '<label>Password Baru <input id="editUserPassword" type="password" minlength="8" autocomplete="new-password" placeholder="Kosongkan jika tidak diubah"></label>'+
    '<label>Status <input value="'+(user.is_active?'Aktif':'Nonaktif')+'" readonly></label>'+
    '<label>Role <input value="'+(user.role==='admin'?'Admin':'User')+'" readonly></label>'+
    '</div><div class="alert-box"><strong>Catatan:</strong> password hanya perlu diisi apabila ingin menggantinya. Role dan status tetap dikelola melalui kontrol pada tabel.</div>'+
    '<div class="form-actions"><button type="submit" class="primary" id="saveEditUser">Simpan Perubahan</button><button type="button" class="ghost modal-cancel">Batal</button></div></form></div>';
  document.body.appendChild(wrap);

  const close=()=>wrap.remove();
  wrap.querySelector('.modal-close').onclick=close;
  wrap.querySelector('.modal-cancel').onclick=close;
  wrap.onclick=e=>{if(e.target===wrap)close()};

  wrap.querySelector('#editUserForm').addEventListener('submit',async e=>{
    e.preventDefault();e.stopPropagation();
    const name=$('editUserName').value.trim();
    const username=$('editUserUsername').value.trim();
    const email=$('editUserEmail').value.trim().toLowerCase();
    const password=$('editUserPassword').value;
    const save=$('saveEditUser');
    if(!name||!username)return toast('Nama dan username wajib diisi.','error');
    if(password && password.length<8)return toast('Password baru minimal 8 karakter.','error');
    save.disabled=true;save.textContent='Menyimpan...';
    try{
      const {data,error}=await client.functions.invoke('update-user',{body:{user_id:target,name,username,email,password}});
      if(error){
        let msg=error.message||'Gagal memperbarui profil.';
        try{const payload=await error.context?.json();msg=payload?.error||payload?.message||msg}catch(_){}
        throw new Error(msg);
      }
      toast(data?.message||'Profil pengguna berhasil diperbarui.');
      close();
      renderApp('pengguna');
    }catch(err){
      save.disabled=false;save.textContent='Simpan Perubahan';
      toast(err?.message||'Gagal memperbarui profil.','error');
    }
  });
  setTimeout(()=>wrap.querySelector('#editUserName')?.focus(),20);
}

function showUserCreateModal(){
  const old=document.getElementById('createUserModal');
  if(old)old.remove();
  const wrap=document.createElement('div');
  wrap.id='createUserModal';
  wrap.className='modal-backdrop';
  wrap.innerHTML='<div class="modal-card user-create-modal"><div class="modal-head"><div><span class="eyebrow">ADMINISTRASI</span><h2>Tambah Pengguna</h2><p>Buat akun partner Pengurus Barang baru.</p></div><button type="button" class="modal-close" aria-label="Tutup">×</button></div>'+
    '<form id="createUserForm"><div class="form-grid">'+
    '<label>Nama Lengkap <input id="newUserName" required maxlength="120" autocomplete="name" placeholder="Nama partner"></label>'+
    '<label>Username <input id="newUserUsername" required maxlength="50" autocomplete="username" placeholder="partner_barang"></label>'+
    '<label>Email <input id="newUserEmail" type="email" required maxlength="160" autocomplete="email" placeholder="partner@instansi.go.id"></label>'+
    '<label>Password <input id="newUserPassword" type="password" required minlength="8" autocomplete="new-password" placeholder="Minimal 8 karakter"></label>'+
    '<label>Konfirmasi Password <input id="newUserPassword2" type="password" required minlength="8" autocomplete="new-password" placeholder="Ulangi password"></label>'+
    '<label>Role <input value="User" readonly></label>'+
    '</div><div class="alert-box"><strong>Info:</strong> akun akan dibuat <b>Aktif</b> dan partner dapat langsung masuk menggunakan email serta password yang Anda tetapkan.</div>'+
    '<div class="form-actions"><button type="submit" class="primary" id="saveNewUser">Simpan Pengguna</button><button type="button" class="ghost modal-cancel">Batal</button></div></form></div>';
  document.body.appendChild(wrap);
  const close=()=>wrap.remove();
  wrap.querySelector('.modal-close').onclick=close;
  wrap.querySelector('.modal-cancel').onclick=close;
  wrap.onclick=e=>{if(e.target===wrap)close()};
  wrap.querySelector('#createUserForm').addEventListener('submit',async e=>{
    e.preventDefault();e.stopPropagation();
    const name=$('newUserName').value.trim();
    const username=$('newUserUsername').value.trim();
    const email=$('newUserEmail').value.trim().toLowerCase();
    const password=$('newUserPassword').value;
    const password2=$('newUserPassword2').value;
    const save=$('saveNewUser');
    if(password!==password2)return toast('Konfirmasi password tidak sama.','error');
    if(password.length<8)return toast('Password minimal 8 karakter.','error');
    save.disabled=true;save.textContent='Membuat akun...';
    try{
      const {data,error}=await client.functions.invoke('create-user',{body:{name,username,email,password}});
      if(error)throw error;
      toast(data?.message||'Pengguna baru berhasil dibuat.');
      close();
      renderApp('pengguna');
    }catch(err){
      save.disabled=false;save.textContent='Simpan Pengguna';
      let message=err?.message||'Gagal membuat pengguna.';
      try{
        if(err?.context){
          const payload=await err.context.json();
          message=payload?.error||payload?.message||message;
        }
      }catch(_){}
      toast(message,'error');
    }
  });
  setTimeout(()=>wrap.querySelector('#newUserName')?.focus(),20);
}

async function pegawaiPage(){
  const {data,error}=await client.from('pegawai').select('*').order('nama_pegawai');
  if(error)throw error;
  return '<section class="card page-card"><div class="section-head"><div><span class="eyebrow">DATA REFERENSI</span><h2>Pegawai</h2><p>Kelola data pegawai untuk kebutuhan penyerah dan penerima barang.</p></div>'+
    (profile?.role==='admin'?'<button class="primary" id="addPegawai">＋ Tambah Pegawai</button>':'')+
    '</div><div class="filter-bar"><div class="search-box">⌕<input id="pegawaiSearch" placeholder="Cari nama, NIP, status, jabatan, atau unit kerja..."></div><span id="pegawaiCount" class="result-count">'+(data?.length||0)+' data</span></div>'+
    '<div class="table-wrap"><table id="pegawaiTable"><thead><tr><th>ID</th><th>Nama</th><th>NIP</th><th>Status</th><th>Jabatan</th><th>Unit Kerja / Ruangan</th><th>Aksi</th></tr></thead><tbody>'+
    ((data||[]).map(r=>'<tr data-search="'+esc([r.nama_pegawai,r.nip,r.status_pegawai,r.jabatan,r.unit_kerja].join(' ').toLowerCase())+'"><td class="id-cell">#'+r.id+'</td><td><strong>'+esc(r.nama_pegawai)+'</strong></td><td>'+esc(r.nip||'-')+'</td><td>'+esc(r.status_pegawai||'-')+'</td><td>'+esc(r.jabatan||'-')+'</td><td>'+esc(r.unit_kerja||'-')+'</td><td>'+(profile?.role==='admin'?'<div class="actions"><button class="btn-sm edit-pegawai" data-id="'+r.id+'">Edit</button><button class="btn-sm danger delete-pegawai" data-id="'+r.id+'">Hapus</button></div>':'<span class="badge-soft">Lihat</span>')+'</td></tr>').join('')||emptyRow(7))+
    '</tbody></table></div></section>';
}
async function pegawaiForm(id=null){
  let row={nama_pegawai:'',nip:'',status_pegawai:'Non-ASN',jabatan:'',unit_kerja:''};
  if(id){
    const {data,error}=await client.from('pegawai').select('*').eq('id',id).single();
    if(error)throw error; row=data;
  }
  return '<section class="card page-card"><div class="section-head"><div><span class="eyebrow">DATA REFERENSI</span><h2>'+ (id?'Edit Pegawai':'Tambah Pegawai') +'</h2><p>Data ini digunakan pada transaksi barang masuk dan barang keluar.</p></div><button class="ghost" id="backPegawai">← Kembali</button></div>'+
    '<div class="form-grid"><label>Nama Pegawai <input id="p_nama" maxlength="100" value="'+esc(row.nama_pegawai||'')+'"></label>'+
    '<label>NIP <input id="p_nip" maxlength="50" value="'+esc(row.nip||'')+'"></label>'+
    '<label>Status Kepegawaian <select id="p_status"><option value="ASN" '+(row.status_pegawai==='ASN'?'selected':'')+'>ASN</option><option value="PPPK" '+(row.status_pegawai==='PPPK'?'selected':'')+'>PPPK</option><option value="PNS" '+(row.status_pegawai==='PNS'?'selected':'')+'>PNS</option><option value="Non-ASN" '+(row.status_pegawai==='Non-ASN'||!row.status_pegawai?'selected':'')+'>Non-ASN</option></select></label>'+
    '<label>Jabatan <input id="p_jabatan" maxlength="100" value="'+esc(row.jabatan||'')+'"></label><label>Unit Kerja / Ruangan <input id="p_unit" maxlength="150" value="'+esc(row.unit_kerja||'')+'" placeholder="Contoh: Subbag Tata Usaha"></label></div>'+
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
      items:[{name:r.barang?.nama_barang||'-',unit:r.barang?.satuan||'',qty:r.jumlah,keterangan:r.keterangan||'',serial:r.nomor_awal&&r.nomor_akhir?r.nomor_awal+' → '+r.nomor_akhir:''}]
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
    return '<tr data-type="'+r.type+'" data-search="'+esc([r.date,r.party,r.target,r.doc,r.status,r.items.map(i=>[i.name,i.keterangan].filter(Boolean).join(' ')).join(' ')].join(' ').toLowerCase())+'">'+
      '<td><span class="badge-soft '+(r.type==='MASUK'?'success':'')+'">'+r.type+'</span></td>'+
      '<td>'+fmtDate(r.date)+'</td><td>#'+r.id+'</td><td><strong>'+esc(r.party)+'</strong></td>'+
      '<td>'+esc(r.target)+'</td><td>'+esc(r.doc)+'</td><td>'+r.items.length+'</td>'+
      '<td><span class="badge-soft '+(r.status==='AKTIF'?'success':'')+'">'+r.status+'</span></td>'+
      '<td><div class="actions"><button class="btn-sm history-detail" data-key="'+key(r.type,r.id)+'">Detail</button>'+
      cancelAction+printAction+'</div></td></tr>';
  }).join('');
  return '<section class="card page-card"><div class="section-head"><div><span class="eyebrow">AUDIT PERSEDIAAN</span><h2>Riwayat Transaksi</h2><p>Gabungan penerimaan dan pengeluaran barang, termasuk keterangan item dan nomor seri Kuasi.</p></div><span class="status-pill">'+rows.length+' transaksi</span></div>'+
    '<div class="filter-bar"><div class="search-box">⌕<input id="historySearch" placeholder="Cari tanggal, penerima, barang, atau tujuan..."></div>'+
    '<select id="historyType"><option value="">Semua transaksi</option><option value="MASUK">Barang Masuk</option><option value="KELUAR">Barang Keluar</option><option value="OPNAME">Stock Opname</option></select></div>'+
    '<div class="table-wrap"><table id="historyTable"><thead><tr><th>Jenis</th><th>Tanggal</th><th>No.</th><th>Pihak</th><th>Tujuan/Penerima</th><th>Dokumen</th><th>Item</th><th>Status</th><th>Aksi</th></tr></thead>'+
    '<tbody>'+tableRows+(tableRows?'':emptyRow(9))+'</tbody></table></div></section>';
}
function showHistoryDetail(k){
  const r=window.__sipbHistory?.[k];if(!r)return;
  const box=document.createElement('div');box.className='modal-backdrop';
  box.innerHTML=`<div class="modal-card"><div class="modal-head"><div><span class="eyebrow">${r.type==='MASUK'?'PENERIMAAN':r.type==='OPNAME'?'STOCK OPNAME':'PENGELUARAN'}</span><h2>Detail Transaksi #${r.id}</h2></div><button class="modal-close" aria-label="Tutup">×</button></div><div class="detail-grid"><div><small>Tanggal</small><strong>${fmtDate(r.date)}</strong></div><div><small>Pihak</small><strong>${esc(r.party)}</strong></div><div><small>Tujuan/Penerima</small><strong>${esc(r.target)}</strong></div><div><small>Status</small><strong><span class="badge-soft ${r.status==='AKTIF'?'success':''}">${r.status}</span></strong></div></div><div class="table-wrap"><table><thead><tr><th>Barang</th><th>Keterangan</th><th>Satuan</th><th>Jumlah</th><th>Nomor Seri</th></tr></thead><tbody>${r.items.map(i=>'<tr><td><strong>'+esc(i.name)+'</strong></td><td>'+esc(i.keterangan||'-')+'</td><td>'+esc(i.unit||'-')+'</td><td>'+i.qty+'</td><td>'+esc(i.serial||'-')+'</td></tr>').join('')}</tbody></table></div></div>`;
  document.body.appendChild(box);enhanceTables(box);const close=()=>box.remove();box.querySelector('.modal-close').onclick=close;box.onclick=e=>{if(e.target===box)close()};
}
const menu=[['dashboard','Dashboard'],['barang_masuk','Barang Masuk'],['barang_keluar','Barang Keluar'],['stock_opname','Stock Opname'],['barang','Master Barang'],['kategori','Kategori'],['pegawai','Pegawai'],['kartu','Kartu Persediaan'],['kuasi','Stok Kuasi'],['riwayat','Riwayat Transaksi'],['laporan','Laporan Persediaan'],['backup','Backup & Restore'],['pengguna','Kelola Pengguna']];
const topNavItems=[
  ['dashboard','Dashboard','dashboard'],
  ['barang_masuk','Barang Masuk','barang_masuk'],
  ['barang_keluar','Barang Keluar','barang_keluar'],
  ['stock_opname','Stock Opname','stock_opname'],
  ['barang','Master Barang','barang'],
  ['kategori','Kategori','kategori'],
  ['pegawai','Pegawai','pegawai'],
  ['kartu','Kartu Persediaan','kartu'],
  ['kuasi','Stok Kuasi','kuasi'],
  ['riwayat','Riwayat Transaksi','riwayat'],
  ['laporan','Laporan Persediaan','laporan'],
  ['backup','Backup & Restore','backup'],
  ['pengguna','Kelola Pengguna','pengguna']
];
async function renderApp(page=currentPage, restoreScrollY=null){
  const renderToken=++renderVersion;
  currentPage=page||'dashboard';
  page=currentPage;
  const r=await client.auth.getSession();
  session=r.data.session;
  if(!session)return showLogin();
  await loadProfile();
  if(renderToken!==renderVersion)return;
  document.documentElement.dataset.theme=uiTheme;
  root.innerHTML=`<div class="dashboard top-nav-layout"><main class="main"><header class="top">
    <div class="top-brand"><div class="top-brand-mark"><img src="${BANTEN_LOGO}" alt="Lambang Provinsi Banten"></div><div class="top-brand-copy"><strong>SIPB</strong><span>UPTD PPD Malingping</span></div></div>
    <nav class="top-nav" aria-label="Navigasi utama">${topNavItems.filter(item=>!['pengguna','backup'].includes(item[0])||profile?.role==='admin').map(([key,label,icon])=>`<a href="#${key}" data-page="${key}" data-label="${label}" aria-label="${label}" class="top-nav-icon-link ${page===key?'active':''}"><span class="nav-icon">${navSvg(icon)}</span><span class="nav-label">${label}</span></a>`).join('')}</nav>
    <div class="top-title"><span>Administrasi Persediaan</span><h1>${menu.find(x=>x[0]===page)?.[1]||'Dashboard'}</h1></div>
    <div class="top-actions"><button class="theme-toggle top-action-icon" id="themeToggle" type="button" aria-label="${uiTheme==='dark'?'Mode terang':'Mode gelap'}"><span class="theme-icon">${uiTheme==='dark'?'☀':'☾'}</span><span class="top-action-label">${uiTheme==='dark'?'Mode terang':'Mode gelap'}</span></button><span class="top-separator" aria-hidden="true"></span><button class="top-logout top-action-icon" id="logout" type="button" aria-label="Keluar"><span class="logout-icon">↪</span><span class="top-action-label">Keluar</span></button></div>
  </header><div id="content">${loading('Memuat data...')}</div></main></div>`;
  document.documentElement.dataset.theme=uiTheme;
  $('themeToggle').onclick=()=>{changeSipbTheme(page)};
  $('logout').onclick=async()=>{await client.auth.signOut();sidebarOpen=false;showLogin()};
  try{
    let html=page==='dashboard'?await dashboard():page==='barang'?await barangPage():page==='kategori'?await kategoriPage():page==='pegawai'?await pegawaiPage():page==='barang_masuk'?await barangMasukForm():page==='barang_keluar'?await barangKeluarForm():page==='stock_opname'?await stockOpnamePage():page==='kartu'?await kartuPage():page==='kuasi'?await kuasiPage():page==='riwayat'?await riwayatPage():page==='laporan'?await laporanPage():page==='backup'?await backupPage():page==='pengguna'?await penggunaPage():await dashboard();
    if(renderToken!==renderVersion)return;
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
    if(renderToken!==renderVersion)return;
    $('content').innerHTML=`<section class="card error-card"><h2>Gagal memuat data</h2><p>${esc(e.message)}</p><button type="button" class="primary retry" data-page="${page}">Coba lagi</button></section>`;
    if(Number.isFinite(restoreScrollY)){
      requestAnimationFrame(()=>window.scrollTo(0,restoreScrollY));
    }
  }
}
function changeSipbTheme(page=null,loginMessage=''){
  const nextTheme=uiTheme==='dark'?'light':'dark';
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  document.querySelector('.theme-transition')?.remove();

  if(reduced){
    uiTheme=nextTheme;
    localStorage.setItem('sipb-theme',uiTheme);
    document.documentElement.dataset.theme=uiTheme;
    page===null?showLogin(loginMessage):renderApp(page);
    return;
  }

  const scene=document.createElement('div');
  scene.className='theme-transition '+(nextTheme==='dark'?'to-dark':'to-light');
  scene.setAttribute('aria-hidden','true');
  scene.innerHTML='<div class="theme-orb"></div><div class="theme-stars"></div><div class="theme-horizon"></div>';
  document.body.appendChild(scene);

  const button=$('themeToggle');
  if(button)button.disabled=true;

  window.setTimeout(()=>{
    uiTheme=nextTheme;
    localStorage.setItem('sipb-theme',uiTheme);
    document.documentElement.dataset.theme=uiTheme;
    page===null?showLogin(loginMessage):renderApp(page);
  },360);

  window.setTimeout(()=>scene.classList.add('is-leaving'),720);
  window.setTimeout(()=>scene.remove(),1080);
}
function navSvg(key){const p={dashboard:'<path d="m3 10 9-7 9 7"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/>',barang_masuk:'<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',barang_keluar:'<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>',stock_opname:'<path d="m5 12 4 4L19 6"/><rect x="3" y="3" width="18" height="18" rx="3"/>',barang:'<path d="M4 6h16v14H4z"/><path d="M8 6V4h8v2"/><path d="M8 11h8"/><path d="M8 15h5"/>',kategori:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>',pegawai:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21c.8-3.7 3-5.5 7-5.5s6.2 1.8 7 5.5"/><path d="M19 6v4M17 8h4"/>',kartu:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/><path d="M9 18h6"/>',kuasi:'<path d="M4 7.5 12 4l8 3.5-8 3.5z"/><path d="m4 12 8 3.5 8-3.5"/><path d="m4 16.5 8 3.5 8-3.5"/>',riwayat:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',laporan:'<path d="M4 19V9M10 19V5M16 19v-8M22 19V3"/>',backup:'<path d="M4 7V4h16v3"/><path d="M6 4v16h12V4"/><path d="M9 10h6M9 14h6"/>',pengguna:'<circle cx="9" cy="8" r="3"/><path d="M3.5 21c.8-3.3 2.7-5 5.5-5s4.7 1.7 5.5 5"/><path d="M16 5.5a3 3 0 0 1 0 5.8"/><path d="M18 15.5c1.8.7 2.9 2.1 3.5 4.5"/>'};return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(p[key]||p.dashboard)+'</svg>'}
function navItem(m,page){return '<a href="#'+m[0]+'" data-page="'+m[0]+'" class="'+(page===m[0]?'active':'')+'"><span class="nav-icon">'+navSvg(m[0])+'</span><span>'+m[1]+'</span></a>'}

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
  if(page==='laporan'){
    ['reportFrom','reportTo','reportType','reportCategory'].forEach(id=>$(id)?.addEventListener('change',applyLaporanFilter));
    applyLaporanFilter();
  }
  if(page==='backup'){
    $('downloadBackup')?.addEventListener('click',createSipbBackup);
    const input=$('restoreBackupFile'),button=$('restoreBackup');
    button?.addEventListener('click',()=>input?.click());
    input?.addEventListener('change',async e=>{
      const file=e.target.files?.[0];
      if(file)await restoreSipbBackup(file);
      e.target.value='';
    });
  }
  if(page==='pengguna'){
    $('addUser')?.addEventListener('click',evt=>{evt.preventDefault();evt.stopPropagation();showUserCreateModal()});

    const apply=()=>{
      const q=$('userSearch').value.toLowerCase().trim();
      const role=$('userRoleFilter').value;
      const status=$('userStatusFilter').value;
      let shown=0;
      document.querySelectorAll('#userTable tbody tr[data-search]').forEach(row=>{
        const ok=(!q||row.dataset.search.includes(q))&&(!role||row.dataset.role===role)&&(!status||row.dataset.status===status);
        row.style.display=ok?'':'none';
        if(ok)shown++;
      });
      $('userCount').textContent=shown+' data';
    };
    $('userSearch').oninput=apply;
    $('userRoleFilter').onchange=apply;
    $('userStatusFilter').onchange=apply;
    document.querySelectorAll('.status-toggle').forEach(toggle=>toggle.onclick=()=>{
      const active=toggle.dataset.active==='1';
      const row=toggle.closest('tr');
      if(toggle.dataset.id===session.user.id){
        toast('Akun yang sedang digunakan tidak boleh dinonaktifkan.','error');
        return;
      }
      toggle.dataset.active=active?'0':'1';
      toggle.classList.toggle('on',!active);
      toggle.innerHTML='<span></span>'+(!active?'Aktif':'Nonaktif');
      row.dataset.status=!active?'active':'inactive';
      apply();
    });
    document.querySelectorAll('.edit-user').forEach(btn=>btn.onclick=async evt=>{
      evt.preventDefault();evt.stopPropagation();
      btn.disabled=true;btn.textContent='Memuat...';
      try{await showUserEditModal(btn.dataset.id)}
      catch(e){toast(e?.message||'Gagal memuat profil pengguna.','error')}
      finally{btn.disabled=false;btn.textContent='Edit Profil'}
    });
    document.querySelectorAll('.user-save').forEach(btn=>btn.onclick=async evt=>{evt.preventDefault();evt.stopPropagation();
      const id=btn.dataset.id;
      const role=document.querySelector('.user-role[data-id="'+id+'"]')?.value;
      const active=document.querySelector('.status-toggle[data-id="'+id+'"]')?.dataset.active==='1';
      if(!id||!role)return toast('Data pengguna tidak lengkap.','error');
      if(id===session.user.id&&(role!=='admin'||!active))
        return toast('Akun admin yang sedang digunakan tidak boleh diturunkan atau dinonaktifkan.','error');
      btn.disabled=true;
      btn.textContent='Menyimpan...';
      try{
        const {error}=await client.from('user_profiles').update({role,is_active:active}).eq('id',id);
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
    const search=$('kartuSearch'),select=$('kartuBarang'),cat=$('kartuFilterKategori'),status=$('kartuFilterStatus');
    const apply=()=>{
      const q=search.value.toLowerCase().trim(),cv=cat.value,sv=status.value;
      document.querySelectorAll('#kartuTable tbody tr[data-search]').forEach(r=>{
        const ok=(!q||r.dataset.search.includes(q))&&(!cv||r.dataset.kategori===cv)&&(!sv||r.dataset.status===sv);
        r.style.display=ok?'':'none';
      });
    };
    search.oninput=apply;cat.onchange=apply;status.onchange=apply;
    document.querySelectorAll('.view-kartu').forEach(btn=>btn.onclick=async evt=>{evt.preventDefault();evt.stopPropagation();
      select.value=btn.dataset.id;$('kartuDetail').innerHTML=loading('Memuat kartu persediaan...');
      try{await loadKartuDetail(Number(btn.dataset.id));$('kartuDetail')?.scrollIntoView({behavior:'smooth',block:'start'})}
      catch(e){fail(e);$('kartuDetail').innerHTML=''}
    });
    select.onchange=async()=>{
      if(!select.value){$('kartuDetail').innerHTML='';return}
      $('kartuDetail').innerHTML=loading('Memuat kartu persediaan...');
      try{await loadKartuDetail(Number(select.value));$('kartuDetail')?.scrollIntoView({behavior:'smooth',block:'start'})}
      catch(e){fail(e);$('kartuDetail').innerHTML=''}
    };
  }
  if(page==='kuasi'){
    document.querySelectorAll('.view-kuasi').forEach(btn=>btn.onclick=async evt=>{evt.preventDefault();evt.stopPropagation();
      btn.disabled=true;btn.textContent='Memuat...';
      try{await showKuasiDetail(Number(btn.dataset.id))}
      catch(e){fail(e)}
      finally{btn.disabled=false;btn.textContent='Detail'}
    });
  }
  if(page==='riwayat'){
    const apply=()=>{const q=$('historySearch').value.toLowerCase().trim(),t=$('historyType').value;document.querySelectorAll('#historyTable tbody tr[data-search]').forEach(r=>{r.style.display=(!q||r.dataset.search.includes(q))&&(!t||r.dataset.type===t)?'':'none'})};
    $('historySearch').oninput=apply;$('historyType').onchange=apply;
    const historyTable=$('historyTable');
    if(historyTable){
      historyTable.onclick=e=>{
        const detail=e.target.closest('.history-detail');
        if(!detail)return;
        e.preventDefault();
        e.stopPropagation();
        showHistoryDetail(detail.dataset.key);
      };
    }
    document.querySelectorAll('.history-cancel').forEach(btn=>btn.onclick=async()=>{
      const id=Number(btn.dataset.id); if(!id)return;
      if(!(await sipbConfirm('Batalkan transaksi barang keluar #'+id+'? Stok akan dikembalikan dan transaksi tetap tercatat sebagai DIBATALKAN.')))return;
      btn.disabled=true;btn.textContent='Memproses...';
      try{
        await cancelAndDeleteOutgoing(id);
        toast('Transaksi #'+id+' dibatalkan. Stok telah dikembalikan.');
        renderApp('riwayat');
      }catch(e){btn.disabled=false;btn.textContent='Batalkan';fail(e)}
    });
  }
  if(page==='barang'){
    const importPersediaan=$('importPersediaan');
    if(importPersediaan) importPersediaan.onclick=async e=>{e.preventDefault();e.stopPropagation();await showImportPersediaanModal()};
    const addBarang=$('addBarang');
    if(addBarang) addBarang.onclick=async e=>{
      e.preventDefault();
      e.stopPropagation();
      try{
        $('content').innerHTML=await barangForm();
        bindForm();
      }catch(err){fail(err)}
    };
    const apply=()=>{
      const q=$('barangSearch').value.toLowerCase().trim(),cat=$('barangFilter').value;
      let shown=0;
      document.querySelectorAll('#barangTable tbody tr[data-search]').forEach(r=>{
        const ok=(!q||r.dataset.search.includes(q))&&(!cat||r.dataset.kategori===cat);
        r.style.display=ok?'':'none';
        if(ok)shown++;
      });
      $('barangCount').textContent=shown+' data';
    };
    $('barangSearch').oninput=apply;
    $('barangFilter').onchange=apply;
    document.querySelectorAll('.edit-barang').forEach(btn=>btn.onclick=async e=>{
      e.preventDefault();
      e.stopPropagation();
      const id=Number(btn.dataset.id);
      if(!id)return;
      btn.disabled=true;
      try{
        $('content').innerHTML=loading('Memuat data barang...');
        const html=await barangForm(id);
        $('content').innerHTML=html;
        bindForm(id);
        window.scrollTo({top:0,behavior:'smooth'});
      }catch(err){
        fail(err);
      }finally{
        btn.disabled=false;
      }
    });
    document.querySelectorAll('.delete-barang').forEach(btn=>btn.onclick=async evt=>{evt.preventDefault();evt.stopPropagation();
      const id=Number(btn.dataset.id);
      if(!id)return;
      if(!(await sipbConfirm('Hapus barang ini dari Master Barang? Penghapusan hanya diizinkan jika barang sudah tidak memiliki riwayat Barang Keluar. Data terkait barang yang memang masih tersimpan akan ikut mengikuti aturan database.')))return;
      btn.disabled=true;
      try{
        const {error}=await client.from('barang').delete().eq('id',id);
        if(error)throw error;
        toast('Barang berhasil dihapus.');
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
    document.querySelectorAll('.edit-pegawai').forEach(btn=>btn.onclick=async evt=>{evt.preventDefault();evt.stopPropagation();try{$('content').innerHTML=loading('Memuat pegawai...');$('content').innerHTML=await pegawaiForm(Number(btn.dataset.id));bindPegawaiForm(Number(btn.dataset.id))}catch(e){fail(e)}});
    document.querySelectorAll('.delete-pegawai').forEach(btn=>btn.onclick=async evt=>{evt.preventDefault();evt.stopPropagation();if(!(await sipbConfirm('Hapus data pegawai ini? Data historis transaksi tetap tersimpan.')))return;btn.disabled=true;const {error}=await client.from('pegawai').delete().eq('id',Number(btn.dataset.id));if(error){btn.disabled=false;return fail(error)}toast('Pegawai berhasil dihapus.');renderApp('pegawai')});
  }
  if(page==='kategori'){
    const addKategori=$('addKategori'); if(addKategori) addKategori.onclick=async e=>{e.preventDefault();e.stopPropagation();const n=await sipbPrompt('Nama kategori baru:');if(!n?.trim())return;const {error}=await client.from('kategori').insert({nama_kategori:n.trim()});if(error)return fail(error);toast('Kategori ditambahkan');renderApp('kategori')};
    document.querySelectorAll('.edit-kat').forEach(btn=>btn.onclick=async evt=>{evt.preventDefault();evt.stopPropagation();const {data,error}=await client.from('kategori').select('*').eq('id',+btn.dataset.id).single();if(error)return fail(error);const n=await sipbPrompt('Nama kategori:',data.nama_kategori);if(!n?.trim())return;const {error:e}=await client.from('kategori').update({nama_kategori:n.trim()}).eq('id',+btn.dataset.id);if(e)return fail(e);toast('Kategori diperbarui');renderApp('kategori')});
    document.querySelectorAll('.delete-kat').forEach(btn=>btn.onclick=async evt=>{evt.preventDefault();evt.stopPropagation();if(!(await sipbConfirm('Hapus kategori ini? Barang yang masih memakai kategori ini dapat mencegah penghapusan.')))return;const {error}=await client.from('kategori').delete().eq('id',+btn.dataset.id);if(error)return fail(error);toast('Kategori dihapus');renderApp('kategori')});
  }
  if(page==='barang_masuk'){
    bindMasukForm().catch(fail);
  }
  if(page==='barang_keluar'){
    bindKeluarForm().catch(fail);
  }  if(page==='stock_opname') $('addOpname').onclick=async()=>{$('content').innerHTML=await stockOpnameForm();bindOpnameForm()};
}

function bindForm(id){
  const back=$('backBarang'),cancel=$('cancelBarang'),save=$('saveBarang');
  if(back)back.onclick=e=>{e.preventDefault();e.stopPropagation();renderApp('barang')};
  if(cancel)cancel.onclick=e=>{e.preventDefault();e.stopPropagation();renderApp('barang')};
  if(save)save.onclick=async e=>{
    e.preventDefault();
    e.stopPropagation();
    const payload={
      kode_barang:$('b_kode').value.trim()||null,
      nama_barang:$('b_nama').value.trim(),
      kategori_id:$('b_kat').value?+$('b_kat').value:null,
      keterangan:$('b_keterangan').value.trim()||null,
      tipe:$('b_tipe').value.trim()||'-',
      merk:$('b_merk').value.trim()||'-',
      satuan:$('b_satuan').value.trim(),
      stok_minimum:parseAngka($('b_min').value)
    };
    if(!payload.nama_barang)return toast('Nama barang wajib diisi.','error');
    save.disabled=true;
    save.textContent='Menyimpan...';
    try{
      const q=id?client.from('barang').update(payload).eq('id',id):client.from('barang').insert(payload);
      const {error}=await q;
      if(error)throw error;
      toast(id?'Barang diperbarui':'Barang ditambahkan');
      renderApp('barang');
    }catch(err){
      save.disabled=false;
      save.textContent=id?'Simpan Perubahan':'Simpan Barang';
      fail(err);
    }
  };
}
document.addEventListener('click',e=>{
  const target=e.target.closest('[data-page]');
  if(!target)return;

  // Router hanya boleh menangani navigasi yang memang ditujukan untuk pindah halaman.
  // Input/select/filter/tabel dan tombol aksi halaman tidak boleh pernah diroute ke Dashboard.
  const isTopNav=!!target.closest('.top-nav');
  const isRetry=target.classList.contains('retry');
  const insidePageControls=!!target.closest('.table-tools,.filter-bar,.table-wrap,form,table');
  const isActionButton=!!target.closest('button:not(.retry)');
  const isExplicitPageButton=isActionButton&&!!target.dataset.page;

  // Tombol yang sengaja diberi data-page boleh bernavigasi.
  // Tombol aksi tabel/form dan seluruh filter tetap tidak boleh diroute.
  if(insidePageControls||(!isTopNav&&!isRetry&&!isExplicitPageButton))return;

  e.preventDefault();
  e.stopPropagation();
  const page=target.dataset.page;
  if(page){
    document.querySelectorAll('.top-nav-group .top-submenu').forEach(menu=>{
      menu.style.opacity='0';
      menu.style.visibility='hidden';
      menu.style.pointerEvents='none';
      menu.style.transform='translateY(-6px)';
    });
    document.querySelectorAll('.top-nav-group').forEach(group=>{
      group.style.zIndex='';
    });
    const currentScrollY=window.scrollY;
    renderApp(page,currentScrollY);
  }
});
async function init(){if(!cfg||!cfg.supabaseUrl||!cfg.supabaseAnonKey||cfg.supabaseUrl.includes('YOUR-PROJECT'))return showLogin('Konfigurasi Supabase belum tersedia.');client=window.SIPB_SUPABASE_CLIENT||window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.SIPB_SUPABASE_CLIENT=client;client.auth.onAuthStateChange(e=>{if(e==='SIGNED_OUT')showLogin()});const r=await client.auth.getSession();session=r.data.session;if(session)renderApp();else showLogin()}
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
    '</select></label><label>Stok Sistem <input id="o_sistem" type="text" inputmode="numeric" data-number-format="integer" value="0" readonly></label>'+
    '<label>Stok Fisik <input id="o_fisik" type="text" inputmode="numeric" data-number-format="integer" value="0"></label>'+
    '<label>Tanggal Opname <input id="o_tanggal" type="date" value="'+localDate()+'"></label>'+
    '<label>Petugas <input id="o_petugas" value="'+esc(profile?.nama_lengkap||session?.user?.email||'')+'" required></label>'+
    '<label style="grid-column:1/-1">Keterangan <textarea id="o_keterangan" rows="3" placeholder="Contoh: Hasil pemeriksaan fisik gudang"></textarea></label></div>'+
    '<div class="form-actions"><button class="primary" id="saveOpname">Simpan Stock Opname</button><button class="ghost" id="cancelOpname">Batal</button></div></section>';
}
async function bindOpnameForm(){
  $('backOpname').onclick=()=>renderApp('stock_opname');
  $('cancelOpname').onclick=()=>renderApp('stock_opname');
  $('o_barang').onchange=()=>{const o=$('o_barang').selectedOptions[0];$('o_sistem').value=o?formatAngka(o.dataset.stock||0):''};
  $('saveOpname').onclick=async()=>{
    const id=Number($('o_barang').value),fisik=parseAngka($('o_fisik').value);
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
  const pegawaiQ=await client.from('pegawai').select('id,nama_pegawai,nip,status_pegawai,jabatan,unit_kerja').order('nama_pegawai');
  if(pegawaiQ.error)throw pegawaiQ.error;
  const pegawai=pegawaiQ.data||[];
  $('backKeluar').onclick=()=>renderApp('dashboard');
  $('cancelKeluar').onclick=()=>renderApp('dashboard');

  const fillPegawai=(selectId,jabatanId,nipId,tujuanId=null)=>{
    const select=$(selectId), jabatan=$(jabatanId), nip=$(nipId), tujuan=tujuanId?$(tujuanId):null;
    if(!select)return;
    const opt=select.selectedOptions[0];
    const person=pegawai.find(p=>String(p.nama_pegawai||'')===String(select.value||''));
    jabatan.value=opt?.dataset.jabatan||person?.jabatan||'';
    nip.value=opt?.dataset.nip||person?.nip||'';
    if(tujuan){tujuan.value=person?.unit_kerja||'';tujuan.dataset.auto=person?.unit_kerja?'1':'0';}
  };
  $('k_penyerah').onchange=()=>fillPegawai('k_penyerah','k_penyerah_jabatan','k_penyerah_nip');
  $('k_penerima').onchange=()=>fillPegawai('k_penerima','k_jabatan','k_nip','k_tujuan');
  $('k_tujuan').oninput=()=>{$('k_tujuan').dataset.auto='0';};
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
    const rows=[...box.querySelectorAll('.transaction-row')].map(row=>({barang_id:Number(row.querySelector('.ki-barang').value),jumlah:parseAngka(row.querySelector('.ki-jumlah').value)})).filter(x=>x.barang_id);
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
    const isNew=!sel.value;
     const nama=$('m_nama'),kode=$('m_kode'),katSel=$('m_kat'),tipe=$('m_tipe'),merk=$('m_merk'),satuan=$('m_satuan');
    if(isNew){
      kode.disabled=false;
      kode.readOnly=false;
      nama.disabled=false;
      katSel.disabled=false;
      satuan.disabled=false;
      tipe.readOnly=false;
      merk.readOnly=false;
      if(kode.dataset.auto==='1')kode.value='';
      if(nama.dataset.auto==='1')nama.value='';
      if(katSel.dataset.auto==='1')katSel.value='';
      if(satuan.dataset.auto==='1')satuan.value='';
      if(tipe.dataset.auto==='1')tipe.value='-';
      if(merk.dataset.auto==='1')merk.value='-';
      [kode,nama,katSel,satuan,tipe,merk].forEach(el=>{el.dataset.auto='0'});
    }else{
      kode.value=opt?.dataset.kode||'';
      kode.disabled=false;
      kode.readOnly=true;
      nama.value='';
      nama.disabled=true;
      katSel.value=opt?.dataset.kategori||'';
      katSel.disabled=true;
      satuan.value=opt?.dataset.satuan||'';
      satuan.disabled=true;
      tipe.value=opt?.dataset.tipe||'-';
      tipe.readOnly=true;
      merk.value=opt?.dataset.merk||'-';
      merk.readOnly=true;
      [kode,katSel,satuan,tipe,merk].forEach(el=>{el.dataset.auto='1'});
    }
    const kat=katSel.selectedOptions[0];
    const kuasi=isNew?(kat?.dataset.kuasi==='1'):(opt?.dataset.kuasi==='1');
    $('masukKuasi').style.display=kuasi?'block':'none';
    if(!kuasi){$('m_dus').value='';$('m_awal').value='';$('m_akhir').value=''}
  };
  $('m_barang').onchange=toggle;$('m_kat').onchange=toggle;toggle();
  $('saveMasuk').onclick=async()=>{
    const existing=Number($('m_barang').value)||null,nama=$('m_nama').value.trim(),jumlah=parseAngka($('m_jumlah').value),harga=parseAngka($('m_harga').value);
    if(!jumlah||jumlah<1)return toast('Jumlah harus lebih dari 0.','error');
    if(harga<0||Number.isNaN(harga))return toast('Harga tidak valid.','error');
    if(!existing&&!nama)return toast('Pilih barang atau isi nama barang baru.','error');
    if(!existing&&!Number($('m_kat').value))return toast('Kategori barang baru wajib dipilih.','error');
    const btn=$('saveMasuk');btn.disabled=true;btn.textContent='Memproses transaksi...';
    try{
      const result=await client.rpc('record_barang_masuk',{
        p_barang_id:existing,p_kode_barang:$('m_kode').value.trim()||null,p_kategori_id:Number($('m_kat').value)||null,
        p_nama_barang:nama,p_tipe:$('m_tipe').value.trim()||'-',p_merk:$('m_merk').value.trim()||'-',
        p_satuan:$('m_satuan').value.trim()||'PCS',p_jumlah:jumlah,p_harga_satuan:harga,
        p_sumber_dana:$('m_sumber').value,p_tanggal:$('m_tanggal').value,
        p_nama_penyerah:$('m_penyerah').value.trim()||'Pihak ke Tiga',
        p_nama_penerima:$('m_penerima').value.trim()||profile?.nama_lengkap||session.user.email,
        p_keterangan:$('m_keterangan').value.trim()||null,
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
    const payload={nama_pegawai:$('p_nama').value.trim(),nip:$('p_nip').value.trim()||null,status_pegawai:$('p_status').value,jabatan:$('p_jabatan').value.trim()||null,unit_kerja:$('p_unit').value.trim()||null};
    if(!payload.nama_pegawai)return toast('Nama pegawai wajib diisi.','error');
    const btn=$('savePegawai');btn.disabled=true;btn.textContent='Menyimpan...';
    try{
      const q=id?client.from('pegawai').update(payload).eq('id',id):client.from('pegawai').insert(payload);
      const {error}=await q;if(error)throw error;
      toast(id?'Data pegawai diperbarui.':'Pegawai berhasil ditambahkan.');renderApp('pegawai');
    }catch(e){btn.disabled=false;btn.textContent=id?'Simpan Perubahan':'Simpan Pegawai';fail(e)}
  };
}
