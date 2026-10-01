(() => {
  const cfg = window.SIPB_CONFIG;
  if (!cfg || !window.supabase) return;

  const printClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));

  const dateText = v => v ? new Intl.DateTimeFormat('id-ID', {
    day:'2-digit', month:'long', year:'numeric'
  }).format(new Date(v)) : '-';

  const shortDate = v => v ? new Intl.DateTimeFormat('id-ID', {
    day:'2-digit', month:'2-digit', year:'numeric'
  }).format(new Date(v)) : '-';

  const rupiah = v => new Intl.NumberFormat('id-ID', {
    style:'currency', currency:'IDR', maximumFractionDigits:0
  }).format(Number(v) || 0);

  function openPrint(title, body, orientation='portrait', existingWindow=null) {
    const w = existingWindow || window.open('', '_blank', 'noopener,noreferrer');
    if (!w) {
      window.alert('Popup diblokir browser. Izinkan popup untuk mencetak dokumen SIPB.');
      return;
    }
    w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8">
      <title>${esc(title)}</title>
      <style>
        @page{size:A4 ${orientation};margin:0}\n        @page landscape{size:A4 landscape;margin:0}
        *{box-sizing:border-box}
        body{margin:0;background:#eee;font-family:"Times New Roman",serif;color:#111}
        .sheet{width:21cm;min-height:29.7cm;margin:12px auto;background:#fff;padding:1.35cm 1.6cm}
        .sheet.landscape{width:29.7cm;min-height:21cm;page:landscape}\n        .sheet + .sheet{break-before:page}
        .toolbar{position:fixed;right:18px;bottom:18px;z-index:10}
        .toolbar button{border:0;border-radius:8px;padding:10px 16px;background:#0b5cab;color:#fff;font-weight:700;cursor:pointer}
        .kop{width:100%;border-collapse:collapse;margin-bottom:5px}
        .kop td{vertical-align:middle}
        .logo{width:78px;height:auto}
        .kop-text{text-align:center}
        .kop-text h4,.kop-text h3,.kop-text h2{margin:0;line-height:1.15}
        .kop-text h4{font-size:13pt}.kop-text h3{font-size:15pt}.kop-text h2{font-size:13pt;margin-top:4px}
        .alamat{font-size:9.5pt;margin:5px 0 0;line-height:1.25}
        .line{border-bottom:3px solid #111;margin:7px 0 18px}
        .title{text-align:center;font-size:14pt;font-weight:700;text-decoration:underline;margin:0 0 18px}
        .title.no-underline{text-decoration:none}
        .meta{width:100%;border-collapse:collapse;font-size:11pt;margin-bottom:10px}
        .meta td{padding:2px 0;vertical-align:top}
        .meta td:first-child{width:18%}.meta td:nth-child(2){width:2%}
        p{font-size:11pt;line-height:1.5;text-align:justify}
        table.data{width:100%;border-collapse:collapse;margin:12px 0 18px}
        .data th,.data td{border:1px solid #111;padding:5px 6px;font-size:9.5pt}
        .data th{text-align:center;background:#f2f2f2}.data td.center{text-align:center}.data td.right{text-align:right}
        .sign{width:100%;border-collapse:collapse;margin-top:42px;text-align:center}
        .sign td{border:0;width:50%;vertical-align:top;font-size:11pt}
        .space{height:78px}.name{font-weight:700;text-decoration:underline}
        .note{font-size:9pt;color:#555;margin-top:8px}
        .status{display:inline-block;padding:3px 8px;border:1px solid #888;border-radius:4px;font-size:9pt;font-weight:700}
        @media print{body{background:#fff}.sheet{margin:0;box-shadow:none;width:100%;min-height:auto}.toolbar{display:none}}
      </style></head><body>
      <div class="toolbar"><button onclick="window.print()">Cetak Dokumen</button></div>
      ${body}
      <script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script>
    </body></html>`);
    w.document.close();
  }

  async function getTransaction(id) {
    const [head, details, allocations] = await Promise.all([
      printClient.from('transaksi_keluar').select('*').eq('id', id).single(),
      printClient.from('detail_barang_keluar').select('id,barang_id,jumlah,nomor_awal,nomor_akhir,nomor_dus').eq('transaksi_keluar_id', id).order('id'),
      printClient.from('transaksi_kuasi_alokasi').select('detail_barang_keluar_id,stok_kuasi_id,jumlah,digit_awal,digit_akhir').eq('transaksi_keluar_id', id).order('id')
    ]);
    if (head.error) throw head.error;
    if (details.error) throw details.error;
    if (allocations.error) throw allocations.error;

    const ids = [...new Set((details.data||[]).map(x=>x.barang_id).filter(Boolean))];
    let barang = [];
    if (ids.length) {
      const q = await printClient.from('barang').select('id,nama_barang,merk,tipe,satuan,harga_terakhir,kategori:kategori_id(nama_kategori)').in('id', ids);
      if (q.error) throw q.error;
      barang = q.data || [];
    }
    const byId = Object.fromEntries(barang.map(x=>[x.id,x]));
    return { head:head.data, details:(details.data||[]).map(d=>({...d,barang:byId[d.barang_id]||{}})), allocations:allocations.data||[] };
  }

  async function getKepala() {
    const q=await printClient.from('pegawai').select('nama_pegawai,nip,jabatan,status_pegawai')
      .ilike('jabatan','%Kepala UPTD%').limit(1);
    if(q.error) return null;
    return q.data?.[0] || null;
  }

  function kop() {
    const logo = new URL('assets/logo_banten.png', location.href).href;
    return `<table class="kop"><tr>
      <td style="width:15%;text-align:center"><img class="logo" src="${logo}" alt="Logo Banten"></td>
      <td style="width:70%" class="kop-text">
        <h4>PEMERINTAH PROVINSI BANTEN</h4>
        <h3>BADAN PENDAPATAN DAERAH</h3>
        <h2>UPTD PENGELOLAAN PENDAPATAN DAERAH MALINGPING</h2>
        <p class="alamat">Jl. Baru Simpang - Beyeh Kec. Malingping<br>
        Email samsat.malingping.official@gmail.com Kode Pos. 42391</p>
      </td><td style="width:15%"></td>
    </tr></table><div class="line"></div>`;
  }

  function serial(d) {
    if (d.nomor_awal && d.nomor_akhir) return esc(d.nomor_awal)+' → '+esc(d.nomor_akhir);
    return d.nomor_dus ? 'Dus '+esc(d.nomor_dus) : '-';
  }

  async function printTransaction(id) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.alert('Popup diblokir browser. Izinkan popup untuk mencetak dokumen SIPB.');
      return;
    }
    printWindow.document.write('<!doctype html><html><body style="font-family:Arial;padding:30px">Menyiapkan dokumen SIPB...</body></html>');
    try {
      const {head,details,allocations}=await getTransaction(id);
      const kepala=await getKepala();
      const active=(head.status||'AKTIF')==='AKTIF';
      const regular=details.filter(d=>!String(d.barang?.kategori?.nama_kategori||'').toLowerCase().includes('kuasi'));
      const kuasi=details.filter(d=>String(d.barang?.kategori?.nama_kategori||'').toLowerCase().includes('kuasi'));
      const no=String(id).padStart(3,'0');
      const from=head.penyerah_nama||'-', receiver=head.penerima_nama||'-';
      const fromJob=head.penyerah_jabatan||'Pengurus Barang';
      const receiverJob=head.penerima_jabatan||'Penerima Barang';
      const statusMark=active?'':'<p><span class="status">DIBATALKAN</span></p>';

      const rows=(list,withPrice=false)=>list.map((d,i)=>`<tr>
        <td class="center">${i+1}</td><td>${esc(d.barang?.nama_barang||'-')}</td>
        <td>${esc([d.barang?.merk,d.barang?.tipe].filter(Boolean).join(' ')||'-')}</td>
        <td class="center">${d.jumlah}</td><td class="center">${esc(d.barang?.satuan||'-')}</td>
        ${withPrice?'<td class="right">'+rupiah(d.barang?.harga_terakhir)+'</td>':''}
        <td>${serial(d)}</td></tr>`).join('');

      const nota=`<section class="sheet">${kop()}
        <div class="title no-underline">NOTA DINAS</div>
        <table class="meta">
          <tr><td>Kepada</td><td>:</td><td>Yth. ${esc(kepala?.jabatan||'Kepala UPTD PPD Malingping')}</td></tr>
          <tr><td>Dari</td><td>:</td><td>${esc(fromJob)}</td></tr>
          <tr><td>Nomor</td><td>:</td><td>000.2.3.1/${no}/UPTD.PPD.MLP/${new Date(head.tanggal_keluar).getFullYear()}</td></tr>
          <tr><td>Tanggal</td><td>:</td><td>${dateText(head.tanggal_keluar)}</td></tr>
          <tr><td>Lampiran</td><td>:</td><td>1 (satu) Lembar</td></tr>
          <tr><td>Hal</td><td>:</td><td>Permintaan Barang Habis Pakai</td></tr>
        </table><div class="line" style="border-width:1.5px;margin-bottom:15px"></div>
        ${statusMark}
        <p>Sehubungan dengan kebutuhan barang habis pakai pada <b>${esc(head.tujuan_ruangan||'Umum')}</b>, disampaikan rincian kebutuhan sebagai berikut:</p>
        <table class="data"><thead><tr><th>NO</th><th>NAMA BARANG</th><th>JUMLAH</th><th>SATUAN</th><th>KETERANGAN</th></tr></thead>
        <tbody>${details.map((d,i)=>`<tr><td class="center">${i+1}</td><td>${esc(d.barang?.nama_barang||'-')}</td><td class="center">${d.jumlah}</td><td class="center">${esc(d.barang?.satuan||'-')}</td><td>${serial(d)}</td></tr>`).join('')}</tbody></table>
        <p>Demikian disampaikan, atas perhatian dan kebijaksanaannya diucapkan terima kasih.</p>
        <table class="sign"><tr><td></td><td>${esc(receiverJob)}</td></tr><tr><td></td><td class="space"></td></tr>
        <tr><td></td><td><span class="name">${esc(receiver.toUpperCase())}</span><br>NIP. ${esc(head.penerima_nip||'-')}</td></tr></table>
      </section>`;

      const bastRegular=regular.length?`<section class="sheet">${kop()}
        <div class="title">BERITA ACARA SERAH TERIMA BARANG</div>${statusMark}
        <p>Pada tanggal <b>${dateText(head.tanggal_keluar)}</b>, telah dilakukan serah terima barang habis pakai dari Pengurus Barang kepada <b>${esc(head.tujuan_ruangan||'Umum')}</b> berupa barang-barang sebagai berikut:</p>
        <table class="data"><thead><tr><th>NO</th><th>NAMA BARANG</th><th>MEREK / TIPE</th><th>JUMLAH</th><th>SATUAN</th><th>KETERANGAN</th></tr></thead>
        <tbody>${rows(regular)}</tbody></table>
        <p>Barang-barang tersebut diserahkan dalam kondisi baik dan siap digunakan sesuai kebutuhan operasional. Demikian Berita Acara Serah Terima Barang ini dibuat untuk digunakan sebagaimana mestinya.</p>
        <table class="sign"><tr><td>Yang Menyerahkan,</td><td>Yang Menerima,</td></tr><tr><td class="space"></td><td class="space"></td></tr>
        <tr><td><span class="name">${esc(from.toUpperCase())}</span><br>NIP. ${esc(head.penyerah_nip||'-')}</td><td><span class="name">${esc(receiver.toUpperCase())}</span><br>NIP. ${esc(head.penerima_nip||'-')}</td></tr></table>
      </section>`:''; 

      const bastKuasi=kuasi.length?`<section class="sheet">${kop()}
        <div class="title">BERITA ACARA SERAH TERIMA BARANG<br>BARANG BERSERI / KUASI</div>${statusMark}
        <p>Pada tanggal <b>${dateText(head.tanggal_keluar)}</b>, telah dilakukan serah terima barang berseri kepada <b>${esc(head.tujuan_ruangan||'Umum')}</b> dengan rincian sebagai berikut:</p>
        <table class="data"><thead><tr><th>NO</th><th>NAMA BARANG</th><th>JUMLAH</th><th>SATUAN</th><th>NOMOR / DUS</th></tr></thead>
        <tbody>${kuasi.map((d,i)=>`<tr><td class="center">${i+1}</td><td>${esc(d.barang?.nama_barang||'-')}</td><td class="center">${d.jumlah}</td><td class="center">${esc(d.barang?.satuan||'-')}</td><td>${serial(d)}</td></tr>`).join('')}</tbody></table>
        <p>Dokumen ini mencatat rincian barang berseri yang diserahkan dan menjadi bagian dari administrasi persediaan SIPB.</p>
        <table class="sign"><tr><td>Yang Menyerahkan,</td><td>Yang Menerima,</td></tr><tr><td class="space"></td><td class="space"></td></tr>
        <tr><td><span class="name">${esc(from.toUpperCase())}</span><br>NIP. ${esc(head.penyerah_nip||'-')}</td><td><span class="name">${esc(receiver.toUpperCase())}</span><br>NIP. ${esc(head.penerima_nip||'-')}</td></tr></table>
      </section>`:''; 

      const total=details.reduce((sum,d)=>sum+Number(d.jumlah||0)*Number(d.barang?.harga_terakhir||0),0);
      const bendRows=details.map((d,i)=>{const price=Number(d.barang?.harga_terakhir||0);const qty=Number(d.jumlah||0);return '<tr><td class="center">'+(i+1)+'</td><td>'+esc(d.barang?.nama_barang||'-')+'</td><td>'+esc(d.nomor_awal||'-')+'</td><td class="center">'+qty+'</td><td class="center">'+esc(d.barang?.satuan||'-')+'</td><td class="right">'+(price?rupiah(price):'-')+'</td><td class="right">'+(price?rupiah(price*qty):'-')+'</td></tr>'}).join('');
      const bend29='<section class="sheet landscape">'+kop()+'<table class="meta"><tr><td style="width:65%">BUKTI BARANG DARI DAERAH/UNIT<br><b>UPTD PPD Malingping</b><br>KEPADA DAERAH/UNIT/SAMSAT/GERAI/UPT<br><b>'+esc(head.tujuan_ruangan||'-')+'</b></td><td><table class="data" style="margin:0"><tr><th>MODEL</th><th>BEND 29</th></tr><tr><td>NOMOR</td><td>'+no+'/UPTD.PPD.MLP/'+String(new Date(head.tanggal_keluar).getMonth()+1).padStart(2,'0')+'/'+new Date(head.tanggal_keluar).getFullYear()+'</td></tr><tr><td>BULAN</td><td>'+dateText(head.tanggal_keluar)+'</td></tr></table></td></tr></table><table class="data"><thead><tr><th>NO</th><th>BARANG DITERIMA DARI GUDANG</th><th>NOMOR RATOR</th><th>JUMLAH</th><th>SATUAN</th><th>HARGA SATUAN</th><th>JUMLAH HARGA</th></tr></thead><tbody>'+bendRows+'</tbody><tfoot><tr><th colspan="6" class="right">TOTAL KESELURUHAN (Rp)</th><th class="right">'+rupiah(total)+'</th></tr></tfoot></table><table class="sign"><tr><td></td><td></td><td>Malingping, '+dateText(head.tanggal_keluar)+'</td></tr><tr><td>Yang Menerima<br>'+esc(receiverJob)+'</td><td>Mengetahui,<br>'+esc(kepala?.jabatan||'Kepala UPTD PPD Malingping')+'</td><td>Yang Menyerahkan<br>Pengurus Barang</td></tr><tr><td class="space"></td><td class="space"></td><td class="space"></td></tr><tr><td><span class="name">'+esc(receiver.toUpperCase())+'</span><br>NIP. '+esc(head.penerima_nip||'-')+'</td><td><span class="name">'+esc((kepala?.nama_pegawai||'-').toUpperCase())+'</span><br>NIP. '+esc(kepala?.nip||'-')+'</td><td><span class="name">'+esc(from.toUpperCase())+'</span><br>NIP. '+esc(head.penyerah_nip||'-')+'</td></tr></table></section>';
      openPrint('Dokumen Barang Keluar #'+id,nota+bastRegular+bastKuasi+bend29,'portrait',printWindow);
    } catch(e) {
      try { printWindow.close(); } catch (_) {}
      window.alert('Gagal menyiapkan dokumen: '+(e?.message||e));
    }
  }

  async function printKartu(id) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.alert('Popup diblokir browser. Izinkan popup untuk mencetak dokumen SIPB.');
      return;
    }
    printWindow.document.write('<!doctype html><html><body style="font-family:Arial;padding:30px">Menyiapkan kartu persediaan...</body></html>');
    try {
      const [itemQ,masukQ,keluarQ,opnameQ]=await Promise.all([
        printClient.from('barang').select('id,nama_barang,satuan,merk,tipe,sisa,harga_terakhir,kategori:kategori_id(nama_kategori)').eq('id',id).single(),
        printClient.from('barang_masuk').select('id,tanggal_masuk,jumlah,harga_satuan,nama_penyerah,nama_penerima,nomor_awal,nomor_akhir,nomor_dus').eq('barang_id',id).order('tanggal_masuk').order('id'),
        printClient.from('detail_barang_keluar').select('id,jumlah,nomor_awal,nomor_akhir,nomor_dus,transaksi:transaksi_keluar_id(tanggal_keluar,penerima_nama,tujuan_ruangan,status)').eq('barang_id',id).order('id'),
        printClient.from('riwayat_opname').select('id,tanggal_opname,stok_sistem,stok_fisik,selisih,keterangan,petugas').eq('barang_id',id).order('tanggal_opname').order('id')
      ]);
      if(itemQ.error||masukQ.error||keluarQ.error||opnameQ.error) throw itemQ.error||masukQ.error||keluarQ.error||opnameQ.error;
      const item=itemQ.data;
      const rows=[
        ...(masukQ.data||[]).map(x=>({date:x.tanggal_masuk,id:x.id,type:'MASUK',in:x.jumlah,out:0,price:x.harga_satuan,desc:'Penerimaan dari '+(x.nama_penyerah||'-')+(x.nomor_awal?' · '+x.nomor_awal+' → '+x.nomor_akhir:'')})),
        ...(keluarQ.data||[]).filter(x=>(x.transaksi?.status||'AKTIF')!=='DIBATALKAN').map(x=>({date:x.transaksi?.tanggal_keluar,id:x.id,type:'KELUAR',in:0,out:x.jumlah,price:0,desc:'Kepada '+(x.transaksi?.penerima_nama||'-')+' · '+(x.transaksi?.tujuan_ruangan||'-')+(x.nomor_awal?' · '+x.nomor_awal+' → '+x.nomor_akhir:'')})),
        ...(opnameQ.data||[]).map(x=>({date:x.tanggal_opname,id:x.id,type:x.selisih>=0?'OPNAME +':'OPNAME -',in:x.selisih>0?x.selisih:0,out:x.selisih<0?Math.abs(x.selisih):0,price:0,desc:'Stok sistem '+x.stok_sistem+' → fisik '+x.stok_fisik+(x.keterangan?' · '+x.keterangan:'')}))
      ].sort((a,b)=>String(a.date).localeCompare(String(b.date))||Number(a.id)-Number(b.id));
      let saldo=0;
      const body=rows.map((r,i)=>{saldo+=Number(r.in||0)-Number(r.out||0);return `<tr><td class="center">${i+1}</td><td class="center">${shortDate(r.date)}</td><td class="center">${esc(r.type)}</td><td class="right">${r.in?r.in:'-'}</td><td class="right">${r.out?r.out:'-'}</td><td class="right">${saldo}</td><td class="right">${r.price?rupiah(r.price):'-'}</td><td>${esc(r.desc)}</td></tr>`}).join('');
      const html=`<section class="sheet landscape page-landscape">${kop()}
        <div class="title">KARTU PERSEDIAAN BARANG</div>
        <table class="meta"><tr><td>Nama Barang</td><td>:</td><td><b>${esc(item.nama_barang)}</b></td><td style="width:13%">Satuan</td><td>:</td><td>${esc(item.satuan||'-')}</td></tr>
        <tr><td>Merk / Tipe</td><td>:</td><td>${esc([item.merk,item.tipe].filter(Boolean).join(' ')||'-')}</td><td>Saldo Saat Ini</td><td>:</td><td><b>${item.sisa??0}</b></td></tr></table>
        <table class="data"><thead><tr><th>NO</th><th>TANGGAL</th><th>JENIS</th><th>MASUK</th><th>KELUAR</th><th>SALDO</th><th>HARGA</th><th>KETERANGAN</th></tr></thead><tbody>${body||'<tr><td colspan="8" class="center">Belum ada mutasi.</td></tr>'}</tbody></table>
        <p class="note">Saldo akhir kartu: ${saldo}. Saldo master barang saat ini: ${item.sisa??0}.</p>
      </section>`;
      openPrint('Kartu Persediaan - '+item.nama_barang,html,'landscape',printWindow);
    }catch(e){try { printWindow.close(); } catch (_) {} window.alert('Gagal menyiapkan kartu persediaan: '+(e?.message||e))}
  }

  function addButton(target, text, handler, cls='ghost') {
    if (!target || target.querySelector('.sipb-print-btn')) return;
    const b=document.createElement('button');
    b.className=cls+' sipb-print-btn';
    b.type='button';
    b.textContent=text;
    b.onclick=handler;
    target.appendChild(b);
  }

  function enhance() {
    document.querySelectorAll('.sipb-inline-print').forEach(btn=>{
      if(btn.dataset.bound) return;
      btn.dataset.bound='1';
      btn.onclick=()=>printTransaction(Number(btn.dataset.id));
    });
    document.querySelectorAll('.cancel-keluar').forEach(btn=>{
      const cell=btn.parentElement;
      if(!cell || cell.querySelector('.sipb-inline-print') || cell.querySelector('.sipb-print-btn')) return;
      const id=Number(btn.dataset.id);
      const p=document.createElement('button');
      p.className='btn-sm sipb-print-btn';
      p.type='button';p.textContent='Cetak';
      p.onclick=()=>printTransaction(id);
      cell.insertBefore(p,btn);
    });
    document.querySelectorAll('#kartuDetail .kartu-detail-card').forEach(card=>{
      const id=Number(card.dataset.id||card.querySelector('[data-barang-id]')?.dataset.barangId);
      if(!id) {
        const title=card.querySelector('h2')?.textContent||'';
        const row=document.querySelector('#kartuTable .view-kartu');
        if(row && document.querySelector('#kartuBarang')?.value) addButton(card.querySelector('.section-head'), 'Cetak Kartu', ()=>printKartu(Number(document.querySelector('#kartuBarang').value)));
      } else addButton(card.querySelector('.section-head'), 'Cetak Kartu', ()=>printKartu(id));
    });
  }

  const observer=new MutationObserver(enhance);
  observer.observe(document.body,{childList:true,subtree:true});
  window.SIPBPrint={transaction:printTransaction,kartu:printKartu};
  setTimeout(enhance,500);
})();