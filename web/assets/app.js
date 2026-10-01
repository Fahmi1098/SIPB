const root=document.getElementById('app');
const cfg=window.SIPB_CONFIG;
let client=null,session=null,profile=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const rupiah=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v)||0);
const fmtDate=v=>v?new Intl.DateTimeFormat('id-ID',{dateStyle:'medium'}).format(new Date(v)):'-';
const localDate=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const $=id=>document.getElementById(id);
const toast=(message,type='success')=>{let box=$('toastBox');if(!box){box=document.createElement('div');box.id='toastBox';box.className='toast-box';document.body.appendChild(box)}const el=document.createElement('div');el.className='toast '+type;el.textContent=message;box.appendChild(el);setTimeout(()=>el.remove(),3500)};
const fail=e=>{console.error(e);toast(e?.message||'Terjadi kesalahan.','error')};
const loading=label=>'<div class="loading-state"><div class="spinner"></div><span>'+esc(label||'Memuat...')+'</span></div>';
function showLogin(message=''){
 root.innerHTML=`<main class="login"><section class="login-card"><div class="login-glow"></div><div class="brand"><div class="brand-mark">S</div><div><h1>SIPB UPTD PPD</h1><p>Malingping · Sistem Persediaan Barang</p></div></div><div class="login-title">Selamat datang 👋</div><p class="login-desc">Masuk untuk mengelola persediaan barang secara online.</p><form id="loginForm"><label>Email</label><input id="email" type="email" required autocomplete="username" placeholder="akun@instansi.go.id"><label>Password</label><div class="password-wrap"><input id="password" type="password" required autocomplete="current-password" placeholder="••••••••"><button type="button" class="password-toggle" id="togglePassword">Lihat</button></div><button class="primary login-btn" type="submit">Masuk ke SIPB <span>→</span></button>${message?`<div class="alert">${esc(message)}</div>`:''}</form></section></main>`;
 $('togglePassword').onclick=()=>{const p=$('password');p.type=p.type==='password'?'text':'password';$('togglePassword').textContent=p.type==='password'?'Lihat':'Sembunyikan'};
 $('loginForm').addEventListener('submit',async e=>{e.preventDefault();const email=$('email').value.trim(),password=$('password').value,btn=e.submitter;btn.disabled=true;btn.textContent='Memproses...';const {error}=await client.auth.signInWithPassword({email,password});if(error)return showLogin(error.message);renderApp('dashboard')});
}
async function loadProfile(){const {data,error}=await client.from('user_profiles').select('*').eq('id',session.user.id).maybeSingle();if(error)throw error;profile=data||{nama_lengkap:session.user.email,role:'user',is_active:true};if(profile.is_active===false){await client.auth.signOut();throw new Error('Akun tidak aktif.')}}
async function count(t){const {count,error}=await client.from(t).select('*',{count:'exact',head:true});if(error)throw error;return count||0}
async function dashboard(){const names=['barang','kategori','pegawai','barang_masuk','transaksi_keluar'];const vals=await Promise.all(names.map(count));const s=Object.fromEntries(names.map((n,i)=>[n,vals[i]]));const {data:recent,error}=await client.from('transaksi_keluar').select('*').order('id',{ascending:false}).limit(6);if(error)throw error;return `<section class="welcome card"><div><span class="eyebrow">RINGKASAN SIPB</span><h2>Selamat datang, ${esc(profile.nama_lengkap||session.user.email)} 👋</h2><p>Kelola persediaan UPTD PPD Malingping dari satu tempat.</p></div><div class="welcome-icon">📦</div></section><section class="stats-grid"><div class="stat-card blue"><span>📦</span><div><small>Total Barang</small><strong>${s.barang}</strong><em>Master barang</em></div></div><div class="stat-card orange"><span>🗂️</span><div><small>Kategori</small><strong>${s.kategori}</strong><em>Data referensi</em></div></div><div class="stat-card green"><span>👥</span><div><small>Pegawai</small><strong>${s.pegawai}</strong><em>Data referensi</em></div></div><div class="stat-card purple"><span>📥</span><div><small>Barang Masuk</small><strong>${s.barang_masuk}</strong><em>Total transaksi</em></div></div><div class="stat-card red"><span>📤</span><div><small>Barang Keluar</small><strong>${s.transaksi_keluar}</strong><em>Total transaksi</em></div></div><div class="stat-card teal"><span>☁️</span><div><small>Status Database</small><strong>ONLINE</strong><em>Supabase PostgreSQL</em></div></div></section><section class="card recent"><div class="section-head"><div><h3>Transaksi Terbaru</h3><p>Aktivitas barang keluar terakhir.</p></div><button class="ghost" data-page="barang_keluar">Lihat semua →</button></div><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Penerima</th><th>Tujuan</th></tr></thead><tbody>${(recent||[]).map(r=>`<tr><td>${fmtDate(r.tanggal_keluar)}</td><td><strong>${esc(r.penerima_nama||'-')}</strong></td><td>${esc(r.tujuan_ruangan||'-')}</td></tr>`).join('')||'<tr><td colspan="3" class="empty">Belum ada transaksi.</td></tr>'}</tbody></table></div></section>`}
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
  return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">TRANSAKSI PERSEDIAAN</span><h2>Barang Keluar</h2><p>Pengeluaran akan memvalidasi stok sebelum transaksi direkam.</p></div><button class="primary" id="addKeluar">＋ Rekam Barang Keluar</button></div><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Penyerah</th><th>Penerima</th><th>Tujuan</th><th>Item</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${(data||[]).map(r=>{const active=(r.status||'AKTIF')==='AKTIF';return '<tr><td>'+fmtDate(r.tanggal_keluar)+'</td><td>'+esc(r.penyerah_nama||'-')+'</td><td><strong>'+esc(r.penerima_nama||'-')+'</strong></td><td>'+esc(r.tujuan_ruangan||'-')+'</td><td>'+(r.detail_barang_keluar?.[0]?.count??0)+'</td><td><span class="badge-soft '+(active?'success':'')+'">'+(active?'AKTIF':'DIBATALKAN')+'</span></td><td>'+'<div class="row-actions"><button class="btn-sm sipb-inline-print" data-id="'+r.id+'">Cetak</button>'+(active&&profile?.role==='admin'?'<button class="btn-sm danger cancel-keluar" data-id="'+r.id+'">Batalkan</button>':'')+'</div>'+'</td></tr>'}).join('')||emptyRow(7)}</tbody></table></div></section>`;
}

async function barangKeluarForm(){const [{data:items,error},{data:pegawai,error:pe}]=await Promise.all([client.from('barang').select('id,nama_barang,satuan,sisa,kategori').order('nama_barang'),client.from('pegawai').select('id,nama_pegawai,nip,status_pegawai,jabatan').order('nama_pegawai')]);if(error||pe)throw(error||pe);return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">DISTRIBUSI</span><h2>Rekam Barang Keluar</h2><p>Stok akan dikurangi setelah seluruh item lolos validasi.</p></div><button class="ghost" id="backKeluar">← Kembali</button></div><div class="form-grid"><label>Tanggal Keluar <input id="k_tanggal" type="date" value="${localDate()}"></label><label>Penyerah (Gudang) <select id="k_penyerah"><option value="">- Pilih penyerah -</option>${pegawai.map(p=>`<option value="${esc(p.nama_pegawai)}" data-nip="${esc(p.nip||'')}" data-jabatan="${esc(p.jabatan||'')}" data-status="${esc(p.status_pegawai||'')}">${esc(p.nama_pegawai)}</option>`).join('')}</select></label><label>Jabatan Penyerah <input id="k_penyerah_jabatan" readonly></label><label>NIP Penyerah <input id="k_penyerah_nip" readonly></label><label>Penerima (Pemohon) <select id="k_penerima"><option value="">- Pilih pegawai -</option>${pegawai.map(p=>`<option value="${esc(p.nama_pegawai)}" data-nip="${esc(p.nip||'')}" data-jabatan="${esc(p.jabatan||'')}" data-status="${esc(p.status_pegawai||'')}">${esc(p.nama_pegawai)}</option>`).join('')}</select></label><label>Jabatan Penerima <input id="k_jabatan" readonly></label><label>NIP Penerima <input id="k_nip" readonly></label><label>Tujuan / Ruangan <input id="k_tujuan" placeholder="Contoh: Subag Tata Usaha" required></label></div><div class="section-head compact"><div><h3>Daftar Barang</h3><p>Tambahkan satu atau beberapa item.</p></div><button class="ghost" id="addItemKeluar">＋ Tambah Item</button></div><div id="keluarItems"></div><div class="form-actions"><button class="primary" id="saveKeluar">Rekam Transaksi & Kurangi Stok</button><button class="ghost" id="cancelKeluar">Batal</button></div></section>`}

function keluarItemRow(items){const id='ki_'+Math.random().toString(36).slice(2,9);return `<div class="transaction-row" data-row="${id}"><select class="ki-barang"><option value="">- Pilih barang -</option>${items.map(x=>`<option value="${x.id}" data-stock="${x.sisa}" data-unit="${esc(x.satuan||'')}" data-kuasi="${esc(x.kategori||'')}">${esc(x.nama_barang)} — stok ${x.sisa} ${esc(x.satuan||'')}${x.kategori==='kuasi'?' — FIFO Kuasi':''}</option>`).join('')}</select><input class="ki-jumlah" type="number" min="1" value="1" placeholder="Jumlah"><span class="kuasi-hint" aria-live="polite"></span><button type="button" class="btn-sm danger remove-item">×</button></div>`}

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
  ].filter(r=>r.date).sort((x,y)=>String(x.date).localeCompare(String(y.date))||Number(x.id)-Number(y.id));
  let saldo=0;
  rows.forEach(r=>{saldo+=r.qtyIn-r.qtyOut;r.saldo=saldo});
  const nilai=(Number(item.sisa)||0)*(Number(item.harga_terakhir)||0);
  $('kartuDetail').innerHTML=`<section class="card page-card kartu-detail-card"><div class="section-head"><div><span class="eyebrow">BUKU GUDANG</span><h3>${esc(item.nama_barang)}</h3><p>${esc(item.kategori?.nama_kategori||'-')} · ${esc(item.merk||'-')} / ${esc(item.tipe||'-')}</p></div><div class="detail-grid"><div><small>Saldo Fisik</small><strong>${item.sisa||0} ${esc(item.satuan||'')}</strong></div><div><small>Harga Terakhir</small><strong>${rupiah(item.harga_terakhir)}</strong></div><div><small>Nilai Sisa</small><strong>${rupiah(nilai)}</strong></div><div><small>Mutasi</small><strong>${rows.length} transaksi</strong></div></div></div><div class="table-wrap"><table><thead><tr><th>No</th><th>Tanggal</th><th>Jenis</th><th>Uraian / Kronologi</th><th>Harga Beli</th><th>Masuk</th><th>Keluar</th><th>Sisa Saldo</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td>${i+1}</td><td>${fmtDate(r.date)}</td><td><span class="badge-soft ${r.type==='MASUK'||r.type==='OPNAME IN'?'success':''}">${r.type}</span></td><td>${esc(r.desc)}</td><td>${r.price?rupiah(r.price):'-'}</td><td>${r.qtyIn||'-'}</td><td>${r.qtyOut||'-'}</td><td><strong>${r.saldo}</strong></td></tr>`).join('')||emptyRow(8)}</tbody></table></div><div class="form-actions"><button class="ghost" id="closeKartu">Tutup Detail</button></div></section>`;
  $('closeKartu').onclick=()=>$('kartuDetail').innerHTML='';
}
async function kuasiPage(){const {data,error}=await client.from('stok_kuasi').select('id,barang_id,prefix_huruf,panjang_digit,digit_awal,digit_akhir,digit_sekarang,sisa_lembar,tanggal_masuk,nomor_dus,barang:barang_id(nama_barang,satuan)').gt('sisa_lembar',0).order('tanggal_masuk',{ascending:true}).order('id',{ascending:true});if(error)throw error;const grouped={};data.forEach(r=>{const k=r.barang_id;if(!grouped[k])grouped[k]=[];grouped[k].push(r)});return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">PERSEDIAAN</span><h2>Stok Kuasi</h2><p>Informasi batch dokumen berseri yang masih tersedia. Urutan batch mengikuti FIFO.</p></div><span class="status-pill">${data.length} batch aktif</span></div><div class="alert-box"><strong>FIFO:</strong> batch dengan tanggal masuk paling lama akan menjadi antrean pertama untuk distribusi.</div><div class="table-wrap"><table><thead><tr><th>Barang</th><th>Tgl Masuk</th><th>Rentang Awal</th><th>Nomor Tersedia</th><th>Sisa</th><th>Dus</th><th>Status</th></tr></thead><tbody>${data.map(r=>{const pad=Number(r.panjang_digit)||0,p=r.prefix_huruf||'',awal=p+String(r.digit_awal).padStart(pad,'0'),akhir=p+String(r.digit_akhir).padStart(pad,'0'),sekarang=p+String(r.digit_sekarang).padStart(pad,'0');const first=grouped[r.barang_id][0].id===r.id;return `<tr><td><strong>${esc(r.barang?.nama_barang||'-')}</strong><br><small>${esc(r.barang?.satuan||'')}</small></td><td>${fmtDate(r.tanggal_masuk)}</td><td>${esc(awal)} → ${esc(akhir)}</td><td><strong>${esc(sekarang)} → ${esc(akhir)}</strong></td><td><span class="stock">${r.sisa_lembar}</span></td><td>${esc(r.nomor_dus||'-')}</td><td>${first?'<span class="badge-soft success">Antrean Pertama</span>':'<span class="badge-soft">Menunggu</span>'}</td></tr>`}).join('')||emptyRow(7)}</tbody></table></div></section>`}

async function kartuPage(){const {data,error}=await client.from('barang').select('id,nama_barang,satuan,jumlah_total,terpakai,sisa,stok_minimum,harga_terakhir').order('nama_barang');if(error)throw error;return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">PERSEDIAAN</span><h2>Kartu Persediaan</h2><p>Ringkasan saldo persediaan setiap barang.</p></div></div><div class="table-wrap"><table><thead><tr><th>Barang</th><th>Satuan</th><th>Masuk/Total</th><th>Terpakai</th><th>Sisa</th><th>Harga Terakhir</th><th>Nilai Sisa</th></tr></thead><tbody>${data.map(r=>`<tr><td><strong>${esc(r.nama_barang)}</strong></td><td>${esc(r.satuan||'-')}</td><td>${r.jumlah_total||0}</td><td>${r.terpakai||0}</td><td><span class="stock ${Number(r.sisa)<=Number(r.stok_minimum||0)?'low':''}">${r.sisa||0}</span></td><td>${rupiah(r.harga_terakhir)}</td><td>${rupiah((Number(r.sisa)||0)*(Number(r.harga_terakhir)||0))}</td></tr>`).join('')||emptyRow(7)}</tbody></table></div></section>`}

async function kategoriPage(){const {data,error}=await client.from('kategori').select('*').order('id');if(error)throw error;return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">DATA REFERENSI</span><h2>Kategori</h2><p>Kelola klasifikasi barang.</p></div>${profile?.role==='admin'?'<button class="primary" id="addKategori">＋ Tambah Kategori</button>':''}</div><div class="table-wrap"><table><thead><tr><th>ID</th><th>Nama Kategori</th><th>Aksi</th></tr></thead><tbody>${data.map(r=>`<tr><td>#${r.id}</td><td><strong>${esc(r.nama_kategori)}</strong></td><td>${profile?.role==='admin'?'<div class="actions"><button class="btn-sm edit-kat" data-id="'+r.id+'">Edit</button><button class="btn-sm danger delete-kat" data-id="'+r.id+'">Hapus</button></div>':'<span class="badge-soft">Lihat</span>'}</td></tr>`).join('')||emptyRow(3)}</tbody></table></div></section>`}
async function penggunaPage(){
  if(profile?.role!=='admin')return '<section class="card error-card"><h2>Akses ditolak</h2><p>Halaman ini hanya dapat diakses admin.</p></section>';
  const {data,error}=await client.from('user_profiles').select('id,legacy_user_id,username,nama_lengkap,role,is_active,created_at').order('nama_lengkap');
  if(error)throw error;
  return '<section class="card page-card"><div class="section-head"><div><span class="eyebrow">ADMINISTRASI</span><h2>Kelola Pengguna</h2><p>Atur peran dan status akun SIPB. Pembuatan akun Auth dilakukan melalui Supabase Auth.</p></div><span class="status-pill">'+(data?.length||0)+' pengguna</span></div><div class="alert-box"><strong>Catatan:</strong> perubahan di sini berlaku pada hak akses database. Jangan menonaktifkan akun admin terakhir.</div><div class="table-wrap"><table><thead><tr><th>Pengguna</th><th>Username</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+(data||[]).map(u=>'<tr data-user="'+esc(u.id)+'"><td><strong>'+esc(u.nama_lengkap||'-')+'</strong><br><small>'+esc(u.id)+'</small></td><td>'+esc(u.username||'-')+'</td><td><select class="user-role" data-id="'+u.id+'"><option value="admin" '+(u.role==='admin'?'selected':'')+'>Admin</option><option value="user" '+(u.role==='user'?'selected':'')+'>User</option></select></td><td><button type="button" class="status-toggle '+(u.is_active?'on':'')+'" data-id="'+u.id+'" data-active="'+(u.is_active?'1':'0')+'"><span></span>'+(u.is_active?'Aktif':'Nonaktif')+'</button></td><td><button class="btn-sm user-save" data-id="'+u.id+'">Simpan</button></td></tr>').join('')||emptyRow(5)+'</tbody></table></div></section>';
}
async function pegawaiPage(){return simple('Pegawai','pegawai',[['id','ID'],['nama_pegawai','Nama'],['nip','NIP'],['status_pegawai','Status'],['jabatan','Jabatan']])}
async function riwayatPage(){
  const [{data:keluar,error:ke},{data:masuk,error:me}]=await Promise.all([
    client.from('transaksi_keluar').select('*,detail_barang_keluar(id,jumlah,nomor_awal,nomor_akhir,nomor_dus,barang:barang_id(nama_barang,satuan))').order('tanggal_keluar',{ascending:false}).order('id',{ascending:false}).limit(200),
    client.from('barang_masuk').select('*,barang:barang_id(nama_barang,satuan)').order('tanggal_masuk',{ascending:false}).order('id',{ascending:false}).limit(200)
  ]);
  if(ke||me)throw(ke||me);
  const rows=[
    ...(masuk||[]).map(r=>({type:'MASUK',date:r.tanggal_masuk,id:r.id,party:r.nama_penyerah||'-',target:r.nama_penerima||'-',doc:'Penerimaan',status:'AKTIF',items:[{name:r.barang?.nama_barang||'-',unit:r.barang?.satuan||'',qty:r.jumlah,serial:r.nomor_awal&&r.nomor_akhir?r.nomor_awal+' → '+r.nomor_akhir:''}]})),
    ...(keluar||[]).map(r=>({type:'KELUAR',date:r.tanggal_keluar,id:r.id,party:r.penerima_nama||'-',target:r.tujuan_ruangan||'-',doc:r.jenis_dokumen||'Nota Dinas',status:r.status||'AKTIF',items:(r.detail_barang_keluar||[]).map(d=>({name:d.barang?.nama_barang||'-',unit:d.barang?.satuan||'',qty:d.jumlah,serial:d.nomor_awal&&d.nomor_akhir?d.nomor_awal+' → '+d.nomor_akhir:''}))}))
  ].sort((a,b)=>String(b.date).localeCompare(String(a.date))||Number(b.id)-Number(a.id));
  const key=(type,id)=>type+'_'+id;
  window.__sipbHistory=Object.fromEntries(rows.map(r=>[key(r.type,r.id),r]));
  return `<section class="card page-card"><div class="section-head"><div><span class="eyebrow">AUDIT PERSEDIAAN</span><h2>Riwayat Transaksi</h2><p>Gabungan penerimaan dan pengeluaran barang, termasuk rincian item dan nomor seri Kuasi.</p></div><span class="status-pill">${rows.length} transaksi</span></div><div class="filter-bar"><div class="search-box">⌕<input id="historySearch" placeholder="Cari tanggal, penerima, barang, atau tujuan..."></div><select id="historyType"><option value="">Semua transaksi</option><option value="MASUK">Barang Masuk</option><option value="KELUAR">Barang Keluar</option></select></div><div class="table-wrap"><table id="historyTable"><thead><tr><th>Jenis</th><th>Tanggal</th><th>No.</th><th>Pihak</th><th>Tujuan/Penerima</th><th>Dokumen</th><th>Item</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows.map(r=>'<tr data-type="'+r.type+'" data-search="'+esc([r.date,r.party,r.target,r.doc,r.status,r.items.map(i=>i.name).join(' ')].join(' ').toLowerCase())+'"><td><span class="badge-soft '+(r.type==='MASUK'?'success':'')+'">'+r.type+'</span></td><td>'+fmtDate(r.date)+'</td><td>#'+r.id+'</td><td><strong>'+esc(r.party)+'</strong></td><td>'+esc(r.target)+'</td><td>'+esc(r.doc)+'</td><td>'+r.items.length+'</td><td><span class="badge-soft '+(r.status==='AKTIF'?'success':'')+'">'+r.status+'</span></td><td><div class="actions"><button class="btn-sm history-detail" data-key="'+key(r.type,r.id)+'">Detail</button>${profile?.role==='admin'&&r.type==='KELUAR'&&r.status==='AKTIF'?'<button class="btn-sm danger history-cancel" data-id="'+r.id+'">Batalkan</button>':''}${r.type==='KELUAR'?'<button class="btn-sm sipb-inline-print" data-id="'+r.id+'">Cetak</button>':''}</div></td></tr>').join('')||emptyRow(9)}</tbody></table></div></section>`;
}
function showHistoryDetail(k){
  const r=window.__sipbHistory?.[k];if(!r)return;
  const box=document.createElement('div');box.className='modal-backdrop';
  box.innerHTML=`<div class="modal-card"><div class="modal-head"><div><span class="eyebrow">${r.type==='MASUK'?'PENERIMAAN':'PENGELUARAN'}</span><h2>Detail Transaksi #${r.id}</h2></div><button class="modal-close" aria-label="Tutup">×</button></div><div class="detail-grid"><div><small>Tanggal</small><strong>${fmtDate(r.date)}</strong></div><div><small>Pihak</small><strong>${esc(r.party)}</strong></div><div><small>Tujuan/Penerima</small><strong>${esc(r.target)}</strong></div><div><small>Status</small><strong><span class="badge-soft ${r.status==='AKTIF'?'success':''}">${r.status}</span></strong></div></div><div class="table-wrap"><table><thead><tr><th>Barang</th><th>Satuan</th><th>Jumlah</th><th>Nomor Seri</th></tr></thead><tbody>${r.items.map(i=>'<tr><td><strong>'+esc(i.name)+'</strong></td><td>'+esc(i.unit||'-')+'</td><td>'+i.qty+'</td><td>'+esc(i.serial||'-')+'</td></tr>').join('')}</tbody></table></div></div>`;
  document.body.appendChild(box);const close=()=>box.remove();box.querySelector('.modal-close').onclick=close;box.onclick=e=>{if(e.target===box)close()};
}
const menu=[['dashboard','Dashboard','⌂'],['barang_masuk','Barang Masuk','↓'],['barang_keluar','Barang Keluar','↑'],['stock_opname','Stock Opname','✓'],['barang','Master Barang','▣'],['kategori','Kategori','◇'],['pegawai','Pegawai','♙'],['kartu','Kartu Persediaan','▤'],['kuasi','Stok Kuasi','#'],['riwayat','Riwayat Transaksi','◷'],['pengguna','Kelola Pengguna','⚙']];
async function renderApp(page='dashboard'){const r=await client.auth.getSession();session=r.data.session;if(!session)return showLogin();await loadProfile();root.innerHTML=`<div class="dashboard"><aside class="sidebar"><div class="brand-side"><div class="brand-side-mark">S</div><div><strong>SIPB UPTD PPD</strong><span>Malingping</span></div></div><nav class="nav"><div class="nav-label">UTAMA</div>${menu.slice(0,1).map(m=>navItem(m,page)).join('')}<div class="nav-label">TRANSAKSI</div>${menu.slice(1,4).map(m=>navItem(m,page)).join('')}<div class="nav-label">DATA REFERENSI</div><div class="nav-group">${menu.slice(4,7).map(m=>navItem(m,page)).join('')}${profile?.role==='admin'?navItem(menu[10],page):''}</div><div class="nav-label">PERSEDIAAN</div>${menu.slice(7,10).map(m=>navItem(m,page)).join('')}</nav><div class="side-bottom"><div class="side-user"><div class="avatar">${esc((profile.nama_lengkap||'A').charAt(0).toUpperCase())}</div><div><strong>${esc(profile.nama_lengkap||session.user.email)}</strong><small>${esc(profile.role||'user')}</small></div></div><button class="logout" id="logout">↪ Keluar</button></div></aside><main class="main"><header class="top"><div class="mobile-brand">SIPB <span>Malingping</span></div><div class="top-title"><span>Sistem Informasi Persediaan Barang</span><h1>${menu.find(x=>x[0]===page)?.[1]||'SIPB'}</h1></div><div class="top-actions"><span class="status-pill"><i></i> Online</span></div></header><div id="content">${loading('Memuat data...')}</div></main></div>`;document.querySelectorAll('[data-page]').forEach(a=>a.onclick=e=>{e.preventDefault();renderApp(a.dataset.page)});$('logout').onclick=async()=>{await client.auth.signOut();showLogin()};try{let html=page==='dashboard'?await dashboard():page==='barang'?await barangPage():page==='kategori'?await kategoriPage():page==='pegawai'?await pegawaiPage():page==='barang_masuk'?await barangMasukPage():page==='barang_keluar'?await barangKeluarPage():page==='stock_opname'?await stockOpnamePage():page==='kartu'?await kartuPage():page==='kuasi'?await kuasiPage():page==='riwayat'?await riwayatPage():page==='pengguna'?await penggunaPage():await dashboard();$('content').innerHTML=html;bind(page)}catch(e){$('content').innerHTML=`<section class="card error-card"><h2>Gagal memuat data</h2><p>${esc(e.message)}</p><button class="primary retry" data-page="${page}">Coba lagi</button></section>`}}
function navItem(m,page){return `<a href="#${m[0]}" data-page="${m[0]}" class="${page===m[0]?'active':''}"><span class="nav-icon">${m[2]}</span><span>${m[1]}</span></a>`}
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
      if(!confirm('Batalkan transaksi barang keluar #'+id+'? Stok akan dikembalikan dan transaksi tetap tercatat sebagai DIBATALKAN.'))return;
      btn.disabled=true; btn.textContent='Memproses...';
      try{
        const result=await client.rpc('cancel_barang_keluar',{p_transaksi_id:id});
        if(result.error)throw result.error;
        toast('Transaksi #'+id+' dibatalkan. Stok telah dikembalikan.');
        renderApp('riwayat');
      }catch(e){btn.disabled=false;btn.textContent='Batalkan';fail(e)}
    });
  }
  if(page==='dashboard') document.querySelectorAll('[data-page="barang_keluar"]').forEach(b=>b.onclick=()=>renderApp('barang_keluar'));
  if(page==='barang'){
    const addBarang=$('addBarang'); if(addBarang) addBarang.onclick=async()=>{$('content').innerHTML=await barangForm();bindForm()};
    const apply=()=>{const q=$('barangSearch').value.toLowerCase().trim(),cat=$('barangFilter').value;let shown=0;document.querySelectorAll('#barangTable tbody tr[data-search]').forEach(r=>{const ok=(!q||r.dataset.search.includes(q))&&(!cat||r.dataset.kategori===cat);r.style.display=ok?'':'none';if(ok)shown++});$('barangCount').textContent=shown+' data'};
    $('barangSearch').oninput=apply;$('barangFilter').onchange=apply;
    document.querySelectorAll('.edit-barang').forEach(btn=>btn.onclick=async()=>{$('content').innerHTML=loading('Memuat barang...');$('content').innerHTML=await barangForm(+btn.dataset.id);bindForm(+btn.dataset.id)});
    document.querySelectorAll('.delete-barang').forEach(btn=>btn.onclick=async()=>{if(!confirm('Hapus barang ini?'))return;const {error}=await client.from('barang').delete().eq('id',+btn.dataset.id);if(error)return fail(error);toast('Barang berhasil dihapus');renderApp('barang')});
  }
  if(page==='kategori'){
    const addKategori=$('addKategori'); if(addKategori) addKategori.onclick=async()=>{const n=prompt('Nama kategori baru:');if(!n?.trim())return;const {error}=await client.from('kategori').insert({nama_kategori:n.trim()});if(error)return fail(error);toast('Kategori ditambahkan');renderApp('kategori')};
    document.querySelectorAll('.edit-kat').forEach(btn=>btn.onclick=async()=>{const {data,error}=await client.from('kategori').select('*').eq('id',+btn.dataset.id).single();if(error)return fail(error);const n=prompt('Nama kategori:',data.nama_kategori);if(!n?.trim())return;const {error:e}=await client.from('kategori').update({nama_kategori:n.trim()}).eq('id',+btn.dataset.id);if(e)return fail(e);toast('Kategori diperbarui');renderApp('kategori')});
    document.querySelectorAll('.delete-kat').forEach(btn=>btn.onclick=async()=>{if(!confirm('Hapus kategori ini? Barang yang masih memakai kategori ini dapat mencegah penghapusan.'))return;const {error}=await client.from('kategori').delete().eq('id',+btn.dataset.id);if(error)return fail(error);toast('Kategori dihapus');renderApp('kategori')});
  }
  if(page==='barang_masuk') $('addMasuk').onclick=async()=>{$('content').innerHTML=await barangMasukForm();bindMasukForm()};
  if(page==='barang_keluar') { const add=$('addKeluar'); if(add) add.onclick=async()=>{$('content').innerHTML=await barangKeluarForm();bindKeluarForm()}; document.querySelectorAll('.cancel-keluar').forEach(btn=>btn.onclick=async()=>{const id=Number(btn.dataset.id);if(!id)return;if(!confirm('Batalkan transaksi barang keluar #'+id+'? Stok akan dikembalikan dan transaksi tetap tercatat sebagai DIBATALKAN.'))return;btn.disabled=true;btn.textContent='Membatalkan...';try{const result=await client.rpc('cancel_barang_keluar',{p_transaksi_id:id});if(result.error)throw result.error;toast('Transaksi #'+id+' dibatalkan. Stok telah dikembalikan.');renderApp('barang_keluar')}catch(e){btn.disabled=false;btn.textContent='Batalkan';fail(e)}}); }  if(page==='stock_opname') $('addOpname').onclick=async()=>{$('content').innerHTML=await stockOpnameForm();bindOpnameForm()};
  document.querySelectorAll('.retry').forEach(btn=>btn.onclick=()=>renderApp(btn.dataset.page));
}
function bindForm(id){$('backBarang').onclick=()=>renderApp('barang');$('cancelBarang').onclick=()=>renderApp('barang');$('saveBarang').onclick=async()=>{const payload={nama_barang:$('b_nama').value.trim(),kategori_id:$('b_kat').value?+$('b_kat').value:null,tipe:$('b_tipe').value.trim()||'-',merk:$('b_merk').value.trim()||'-',satuan:$('b_satuan').value.trim(),stok_minimum:+$('b_min').value||0};if(!payload.nama_barang)return toast('Nama barang wajib diisi.','error');const btn=$('saveBarang');btn.disabled=true;btn.textContent='Menyimpan...';const q=id?client.from('barang').update(payload).eq('id',id):client.from('barang').insert(payload);const {error}=await q;if(error){btn.disabled=false;btn.textContent=id?'Simpan Perubahan':'Simpan Barang';return fail(error)}toast(id?'Barang diperbarui':'Barang ditambahkan');renderApp('barang')}}
async function init(){if(!cfg||!cfg.supabaseUrl||!cfg.supabaseAnonKey||cfg.supabaseUrl.includes('YOUR-PROJECT'))return showLogin('Konfigurasi Supabase belum tersedia.');client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});client.auth.onAuthStateChange(e=>{if(e==='SIGNED_OUT')showLogin()});const r=await client.auth.getSession();session=r.data.session;if(session)renderApp();else showLogin()}
init()
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
  const result=await client.from('barang').select('id,nama_barang,satuan,sisa,kategori').order('nama_barang');
  if(result.error)throw result.error;
  const items=result.data||[];
  const pegawaiQ=await client.from('pegawai').select('id,nama_pegawai,nip,status_pegawai,jabatan').order('nama_pegawai');
  if(pegawaiQ.error)throw pegawaiQ.error;
  const pegawai=pegawaiQ.data||[];
  $('backKeluar').onclick=()=>renderApp('barang_keluar');
  $('cancelKeluar').onclick=()=>renderApp('barang_keluar');

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
  const wireRows=()=>{
    box.querySelectorAll('.remove-item').forEach(btn=>btn.onclick=()=>btn.closest('.transaction-row').remove());
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
  $('backMasuk').onclick=()=>renderApp('barang_masuk');
  $('cancelMasuk').onclick=()=>renderApp('barang_masuk');
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

