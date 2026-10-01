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

  const dayName = v => v ? new Intl.DateTimeFormat('id-ID', {
    weekday:'long'
  }).format(new Date(v)) : '-';

  const dateWithDay = v => v ? `${dayName(v)}, ${dateText(v)}` : '-';

  const dateFormalBAST = v => {
    if (!v) return '-';
    const d = new Date(v);
    const dayWords = terbilang(d.getDate());
    const month = new Intl.DateTimeFormat('id-ID', {month:'long'}).format(d);
    const yearWords = terbilang(d.getFullYear());
    const titleWords = s => String(s).split(' ').map(x => x ? x.charAt(0).toUpperCase() + x.slice(1) : x).join(' ');
    return 'Pada hari ini ' + titleWords(dayName(v)) + ' tanggal ' + titleWords(dayWords) + ' ' + titleWords(month) + ' ' + titleWords(yearWords);
  };

  const rupiah = v => new Intl.NumberFormat('id-ID', {
    style:'currency', currency:'IDR', maximumFractionDigits:0
  }).format(Number(v) || 0);

  function openPrint(title, body, orientation='portrait', existingWindow=null) {
    const w = existingWindow || window.open('about:blank', '_blank');
    if (!w || w.closed) {
      window.alert('Popup diblokir browser. Izinkan popup untuk mencetak dokumen SIPB.');
      return;
    }

    const html = `<!doctype html><html lang="id"><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${esc(title)}</title>
      <style>
        @page{size:A4 ${orientation};margin:0}
        @page landscape{size:A4 landscape;margin:0}
        @page folio{size:21.5cm 33cm;margin:0}
        *{box-sizing:border-box}
        html,body{margin:0;padding:0}
        body{background:#eee;font-family:Arial,Helvetica,sans-serif;color:#111;font-size:12pt;line-height:1.45}
        .sheet{width:21cm;min-height:29.7cm;margin:0 auto;background:#fff;padding:1.2cm 2cm 2.5cm 3cm}
        .sheet.landscape{width:29.7cm;min-height:21cm;padding:1.2cm 2cm 2.5cm 2cm;page:landscape}
        .sheet.folio{width:21.5cm;min-height:33cm;padding:1.35cm 1.5cm 2.5cm 2cm;page:folio}
        .sheet + .sheet{break-before:page}
        .toolbar{position:fixed;right:18px;bottom:18px;z-index:10}
        .toolbar button{border:0;border-radius:8px;padding:10px 16px;background:#0b5cab;color:#fff;font-weight:700;cursor:pointer}
        .kop{width:100%;border-collapse:collapse;margin:0 0 8px}
        .kop td{vertical-align:middle}
        .kop-logo-cell{width:15%;text-align:center;padding-right:4px}
        .kop-text{width:85%;text-align:center;padding:0}
        .logo{width:2.15cm;height:auto;display:block;margin:0 auto}
        .kop-text h4,.kop-text h3,.kop-text h2{margin:0;text-align:center;line-height:1.1;font-family:Arial,Helvetica,sans-serif}
        .kop-text h4{font-size:11.5pt;font-weight:400}
        .kop-text h3{font-size:15.3pt;font-weight:700}
        .kop-text h2{font-size:12.5pt;font-weight:700;margin-top:2px}
        .kop .alamat{display:block;width:100%;font-size:9.5pt;font-weight:400;line-height:1.2;margin:4px 0 0;text-align:center !important}
        .line{border-bottom:3px solid #111;margin:6px 0 18px}
        .line.thin{border-bottom-width:1.5px;margin:4px 0 14px}
        .title{text-align:center;font-size:13pt;font-weight:700;text-decoration:underline;margin:0 0 15px}
        .title.no-underline{text-decoration:none}
        .doc-number{text-align:center;font-size:12pt;font-weight:400;margin:-7px 0 16px}
        .meta{width:100%;border-collapse:collapse;font-size:12pt;margin-bottom:10px}
        .meta td{padding:1px 0;vertical-align:top;text-align:left}
        .meta td:first-child{width:17%}.meta td:nth-child(2){width:2%}
        .meta td:nth-child(3){width:81%}
        .meta-tight td:first-child{width:16%}.meta-tight td:nth-child(2){width:2%}.meta-tight td:nth-child(3){width:82%}
        p{font-size:12pt;line-height:1.5;text-align:justify;margin:0 0 10px}
        .intro{text-align:justify;text-indent:0}
        table.data{width:100%;border-collapse:collapse;margin:10px 0 15px;page-break-inside:auto}
        .data th,.data td{border:1px solid #111;padding:5px 6px;font-size:10.5pt;vertical-align:middle}
        .data th{text-align:center;background:#fff;font-weight:700}
        .data td.center{text-align:center}.data td.right{text-align:right}.data td.left{text-align:left}
        .data thead{display:table-header-group}
        .data tfoot{display:table-row-group}
        .sign{width:100%;border-collapse:collapse;margin-top:32px;text-align:center}
        .sign td{border:0;width:50%;vertical-align:top;font-size:12pt}
        .sign-3 td{width:33.333%}
        .sign-left td{text-align:left}
        .space{height:82px}
        .space-sm{height:56px}
        .name{font-weight:700;text-decoration:underline}
        .note{font-size:9.5pt;color:#444;margin-top:8px;text-align:left}
        .status{display:inline-block;padding:2px 7px;border:1px solid #777;border-radius:3px;font-size:10pt;font-weight:700;margin-bottom:6px}
        .form-label{font-weight:700}
        .bend-head{width:100%;border-collapse:collapse;margin-bottom:8px}
        .bend-head td{vertical-align:top;font-size:11pt}
        .bend-title{font-size:13pt;font-weight:700;line-height:1.2}
        .bend-subtitle{font-size:12pt;font-weight:700;text-transform:uppercase}
        .bend-model{width:30%;border-collapse:collapse;margin-left:auto}
        .bend-model td,.bend-model th{border:1px solid #111;padding:5px 6px;font-size:10.5pt}
        .bend-model th{text-align:center}
        .bend-model td:first-child{width:38%}
        .bend-meta{width:100%;border-collapse:collapse;margin-top:7px}
        .bend-meta td{padding:1px 0;font-size:11pt}
        .bend-meta td:first-child{width:20%}.bend-meta td:nth-child(2){width:2%}.bend-meta td:nth-child(3){width:78%}
        .made{font-size:11pt;text-align:right;margin:18px 0 0}
        .small{font-size:10pt}
        .terbilang{text-transform:capitalize}
        @media print{
          body{background:#fff}
          .sheet,.sheet.landscape,.sheet.folio{margin:0;box-shadow:none;width:100%;min-height:auto}
          .toolbar{display:none}
        }
      </style></head><body>
      <div class="toolbar"><button onclick="window.print()">Cetak Dokumen</button></div>
      ${body}
      <script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script>
    </body></html>`;

    const blob = new Blob([html], { type:'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    w.location.replace(url);
    w.addEventListener('load', () => setTimeout(() => URL.revokeObjectURL(url), 1000), { once:true });
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
      <td class="kop-logo-cell"><img class="logo" src="${logo}" alt="Lambang Daerah Provinsi Banten"></td>
      <td class="kop-text">
        <h4>PEMERINTAH PROVINSI BANTEN</h4>
        <h3>BADAN PENDAPATAN DAERAH</h3>
        <h2>UPTD PENGELOLAAN PENDAPATAN DAERAH MALINGPING</h2>
        <div class="alamat">Jl. Baru Simpang - Beyeh KM.03 Kec. Malingping, Kabupaten Lebak, Banten 42391<br>
        Telp. (0252) 5605213 &nbsp;|&nbsp; Email: samsat.malingping.official@gmail.com &nbsp;|&nbsp; Kode Pos 42391</div>
      </td>
    </tr></table><div class="line"></div>`;
  }


  function terbilang(n) {
    n = Math.floor(Math.abs(Number(n)||0));
    const angka=['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];
    if(n<12)return angka[n];
    if(n<20)return terbilang(n-10)+' belas';
    if(n<100)return terbilang(Math.floor(n/10))+' puluh'+(n%10?' '+terbilang(n%10):'');
    if(n<200)return 'seratus'+(n%100?' '+terbilang(n-100):'');
    if(n<1000)return terbilang(Math.floor(n/100))+' ratus'+(n%100?' '+terbilang(n%100):'');
    if(n<2000)return 'seribu'+(n%1000?' '+terbilang(n-1000):'');
    if(n<1000000)return terbilang(Math.floor(n/1000))+' ribu'+(n%1000?' '+terbilang(n%1000):'');
    if(n<1000000000)return terbilang(Math.floor(n/1000000))+' juta'+(n%1000000?' '+terbilang(n%1000000):'');
    if(n<1000000000000)return terbilang(Math.floor(n/1000000000))+' miliar'+(n%1000000000?' '+terbilang(n%1000000000):'');
    return terbilang(Math.floor(n/1000000000000))+' triliun'+(n%1000000000000?' '+terbilang(n%1000000000000):'');
  }

  function terbilangRupiah(n) {
    const v=Math.floor(Math.abs(Number(n)||0));
    return (v===0?'nol':terbilang(v))+' rupiah';
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
        <table class="meta meta-tight">
          <tr><td>Yth.</td><td>:</td><td>${esc(kepala?.jabatan||'Kepala UPTD PPD Malingping')}</td></tr>
          <tr><td>Dari</td><td>:</td><td>${esc(fromJob)}</td></tr>
          <tr><td>Tembusan</td><td>:</td><td>Pengurus Barang Pembantu</td></tr>
          <tr><td>Tanggal</td><td>:</td><td>${dateWithDay(head.tanggal_keluar)}</td></tr>
          <tr><td>Nomor</td><td>:</td><td>000.2.3.1/${no}/UPTD.PPD.MLP/${new Date(head.tanggal_keluar).getFullYear()}</td></tr>
          <tr><td>Sifat</td><td>:</td><td>Biasa</td></tr>
          <tr><td>Lampiran</td><td>:</td><td>1 (satu) lembar</td></tr>
          <tr><td>Hal</td><td>:</td><td>Permintaan Barang Habis Pakai</td></tr>
        </table>
        <div class="line thin"></div>
        ${statusMark}
        <p class="intro">Sehubungan dengan kebutuhan barang habis pakai untuk mendukung kelancaran pelaksanaan tugas pada <b>${esc(head.tujuan_ruangan||'Umum')}</b>, dengan ini disampaikan permintaan barang sebagai berikut:</p>
        <table class="data"><thead><tr><th style="width:7%">NO</th><th>NAMA BARANG</th><th style="width:15%">JUMLAH</th><th style="width:15%">SATUAN</th><th>KETERANGAN</th></tr></thead>
        <tbody>${details.map((d,i)=>`<tr><td class="center">${i+1}</td><td>${esc(d.barang?.nama_barang||'-')}</td><td class="center">${d.jumlah}</td><td class="center">${esc(d.barang?.satuan||'-')}</td><td>${serial(d)}</td></tr>`).join('')}</tbody></table>
        <p>Demikian Nota Dinas ini disampaikan untuk dapat dipergunakan sebagaimana mestinya. Atas perhatian dan tindak lanjutnya, diucapkan terima kasih.</p>
        <table class="sign"><tr><td></td><td>${esc(fromJob)}</td></tr><tr><td></td><td class="space"></td></tr>
        <tr><td></td><td><span class="name">${esc(from.toUpperCase())}</span><br>NIP. ${esc(head.penyerah_nip||'-')}</td></tr></table>
      </section>`;


      const bastRegular=regular.length?`<section class="sheet">${kop()}
        <div class="title">BERITA ACARA</div>
        <div class="title no-underline" style="font-size:12pt;margin-top:-8px;margin-bottom:4px">SERAH TERIMA BARANG</div>
        <div class="doc-number">NOMOR : ${no}/BAST/UPTD.PPD.MLP/${new Date(head.tanggal_keluar).getFullYear()}</div>
        ${statusMark}
        <p><b>${dateFormalBAST(head.tanggal_keluar)}</b>, telah dilaksanakan serah terima barang habis pakai untuk <b>${esc(head.tujuan_ruangan||'Umum')}</b>. Para pihak yang melaksanakan serah terima adalah sebagai berikut:</p>
        <ol style="font-size:12pt;line-height:1.5;margin:0 0 12px 22px;padding:0">
          <li style="padding-left:5px;margin-bottom:6px"><b>${esc(from)}</b>, selaku Pengurus Barang, selanjutnya disebut <b>Yang Menyerahkan</b>.</li>
          <li style="padding-left:5px;margin-bottom:6px"><b>${esc(receiver)}</b>, selaku penerima barang, selanjutnya disebut <b>Yang Menerima</b>.</li>
        </ol>
        <p>Adapun barang yang diserahterimakan adalah sebagai berikut:</p>
        <table class="data"><thead><tr><th style="width:7%">NO</th><th>NAMA BARANG</th><th>MEREK / TIPE</th><th style="width:13%">JUMLAH</th><th style="width:13%">SATUAN</th><th>KETERANGAN</th></tr></thead>
        <tbody>${rows(regular)}</tbody></table>
        <p>Barang tersebut telah diterima dalam keadaan baik dan selanjutnya menjadi tanggung jawab penerima sesuai peruntukannya. Berita Acara Serah Terima Barang ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.</p>
        <p class="made">Dibuat di Malingping<br>Tanggal ${dateWithDay(head.tanggal_keluar)}</p>
        <table class="sign"><tr><td>Yang Menerima,</td><td>Yang Menyerahkan,</td></tr>
        <tr><td class="space"></td><td class="space"></td></tr>
        <tr><td><span class="name">${esc(receiver.toUpperCase())}</span><br>NIP. ${esc(head.penerima_nip||'-')}</td>
        <td><span class="name">${esc(from.toUpperCase())}</span><br>NIP. ${esc(head.penyerah_nip||'-')}</td></tr></table>
        <table class="sign" style="width:50%;margin:16px auto 0"><tr><td>Mengetahui/Mengesahkan,<br>${esc(kepala?.jabatan||'Kepala UPTD PPD Malingping')}</td></tr>
        <tr><td class="space-sm"></td></tr>
        <tr><td><span class="name">${esc((kepala?.nama_pegawai||'-').toUpperCase())}</span><br>NIP. ${esc(kepala?.nip||'-')}</td></tr></table>
      </section>`:'';


      const bastKuasi=kuasi.length?`<section class="sheet">${kop()}
        <div class="title">BERITA ACARA</div>
        <div class="title no-underline" style="font-size:12pt;margin-top:-8px;margin-bottom:3px">SERAH TERIMA BARANG</div>
        <div class="title no-underline" style="font-size:11pt;margin-top:-4px;margin-bottom:4px">BARANG BERSERI / KUASI</div>
        <div class="title no-underline" style="font-size:12pt;margin-top:-8px;margin-bottom:6px">BARANG BERSERI / KUASI</div>
        <div class="doc-number">NOMOR : ${no}/BAST-K/UPTD.PPD.MLP/${new Date(head.tanggal_keluar).getFullYear()}</div>
        ${statusMark}
        <p><b>${dateFormalBAST(head.tanggal_keluar)}</b>, telah dilaksanakan serah terima barang berseri/kuasi untuk <b>${esc(head.tujuan_ruangan||'Umum')}</b>. Para pihak yang melaksanakan serah terima adalah sebagai berikut:</p>
        <ol style="font-size:12pt;line-height:1.5;margin:0 0 12px 22px;padding:0">
          <li style="padding-left:5px;margin-bottom:6px"><b>${esc(from)}</b>, selaku Pengurus Barang, selanjutnya disebut <b>Yang Menyerahkan</b>.</li>
          <li style="padding-left:5px;margin-bottom:6px"><b>${esc(receiver)}</b>, selaku penerima barang, selanjutnya disebut <b>Yang Menerima</b>.</li>
        </ol>
        <p>Rincian barang berseri/kuasi yang diserahterimakan:</p>
        <table class="data"><thead><tr><th style="width:7%">NO</th><th>NAMA BARANG</th><th style="width:14%">JUMLAH</th><th style="width:14%">SATUAN</th><th>NOMOR SERI / DUS</th></tr></thead>
        <tbody>${kuasi.map((d,i)=>`<tr><td class="center">${i+1}</td><td>${esc(d.barang?.nama_barang||'-')}</td><td class="center">${d.jumlah}</td><td class="center">${esc(d.barang?.satuan||'-')}</td><td>${serial(d)}</td></tr>`).join('')}</tbody></table>
        <p>Barang berseri/kuasi tersebut telah diterima dalam keadaan baik dan dicatat sebagai bagian dari administrasi persediaan SIPB. Berita Acara ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.</p>
        <p class="made">Dibuat di Malingping<br>Tanggal ${dateWithDay(head.tanggal_keluar)}</p>
        <table class="sign"><tr><td>Yang Menerima,</td><td>Yang Menyerahkan,</td></tr>
        <tr><td class="space"></td><td class="space"></td></tr>
        <tr><td><span class="name">${esc(receiver.toUpperCase())}</span><br>NIP. ${esc(head.penerima_nip||'-')}</td>
        <td><span class="name">${esc(from.toUpperCase())}</span><br>NIP. ${esc(head.penyerah_nip||'-')}</td></tr></table>
        <table class="sign" style="width:50%;margin:16px auto 0"><tr><td>Mengetahui/Mengesahkan,<br>${esc(kepala?.jabatan||'Kepala UPTD PPD Malingping')}</td></tr>
        <tr><td class="space-sm"></td></tr>
        <tr><td><span class="name">${esc((kepala?.nama_pegawai||'-').toUpperCase())}</span><br>NIP. ${esc(kepala?.nip||'-')}</td></tr></table>
      </section>`:'';


      const total=details.reduce((sum,d)=>sum+Number(d.jumlah||0)*Number(d.barang?.harga_terakhir||0),0);
      const bendRows=details.map((d,i)=>{
        const price=Number(d.barang?.harga_terakhir||0);
        const qty=Number(d.jumlah||0);
        const totalRow=price*qty;
        return '<tr><td class="center">'+(i+1)+'</td><td>'+esc(d.barang?.nama_barang||'-')+'</td><td class="center">'+esc(d.barang?.satuan||'-')+'</td><td class="right">'+qty+'</td><td class="center terbilang">'+esc(terbilang(qty))+'</td><td class="right">'+(price?rupiah(price):'-')+'</td><td class="right">'+(totalRow?rupiah(totalRow):'-')+'</td></tr>'
      }).join('');
      const bend29=`<section class='sheet folio'>${kop()}
        <table class='bend-head'>
          <tr>
            <td style='width:67%'>
              <div class='bend-title'>BUKTI BARANG DARI PEMERINTAH PROVINSI BANTEN</div>
              <div class='bend-subtitle'>UPTD PENGELOLAAN PENDAPATAN DAERAH MALINGPING</div>
              <table class='bend-meta'>
                <tr><td>GUDANG</td><td>:</td><td>UPTD PPD Malingping</td></tr>
                <tr><td>BUKTI BARANG DARI</td><td>:</td><td>PENGURUS BARANG</td></tr>
                <tr><td>KEPADA</td><td>:</td><td><b>${esc(head.tujuan_ruangan||'-')}</b></td></tr>
              </table>
            </td>
            <td style='width:33%'>
              <table class='bend-model'><tr><th colspan='2'>MODEL : 29</th></tr>
                <tr><td>Nomor</td><td>${no}/BEND29/UPTD.PPD.MLP/${String(new Date(head.tanggal_keluar).getFullYear())}</td></tr>
                <tr><td>Tanggal</td><td>${dateWithDay(head.tanggal_keluar)}</td></tr>
              </table>
            </td>
          </tr>
        </table>
        <table class='data'>
          <thead><tr>
            <th style='width:6%'>NO</th>
            <th>NAMA BARANG</th>
            <th style='width:13%'>SATUAN</th>
            <th style='width:11%'>JUMLAH<br>ANGKA</th>
            <th style='width:18%'>JUMLAH<br>HURUF</th>
            <th style='width:15%'>HARGA SATUAN</th>
            <th style='width:17%'>JUMLAH HARGA</th>
          </tr></thead>
          <tbody>${bendRows}</tbody>
          <tfoot><tr><th colspan='6' class='right'>TOTAL</th><th class='right'>${rupiah(total)}</th></tr></tfoot>
        </table>
        <p class='small'>Terbilang nilai barang: <b class='terbilang'>${esc(terbilangRupiah(total))}</b>.</p>
        <table style='width:100%;border-collapse:collapse;margin-top:12px'><tr>
          <td style='width:50%;font-size:11pt;vertical-align:top'>Daerah/Unit : <b>${esc(head.tujuan_ruangan||'-')}</b><br>Tanggal : ${dateWithDay(head.tanggal_keluar)}</td>
          <td style='width:50%;font-size:11pt;text-align:right;vertical-align:top'>Dibuat di Malingping<br>Tanggal : ${dateWithDay(head.tanggal_keluar)}</td>
        </tr></table>
        <table class='sign'><tr><td>Yang Menerima,</td><td>PENGURUS BARANG</td></tr>
          <tr><td class='space-sm'></td><td class='space-sm'></td></tr>
          <tr><td><span class='name'>${esc(receiver.toUpperCase())}</span><br>NIP. ${esc(head.penerima_nip||'-')}</td>
          <td><span class='name'>${esc(from.toUpperCase())}</span><br>NIP. ${esc(head.penyerah_nip||'-')}</td></tr></table>
        <table class='sign' style='width:50%;margin:16px auto 0'><tr><td>Mengetahui/Mengesahkan,<br>Kepala UPTD PPD Malingping</td></tr>
          <tr><td class='space-sm'></td></tr>
          <tr><td><span class='name'>${esc((kepala?.nama_pegawai||'-').toUpperCase())}</span><br>NIP. ${esc(kepala?.nip||'-')}</td></tr></table>
        <p class='small' style='margin-top:8px'>Rangkap 3 (tiga).</p>
      </section>`;
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