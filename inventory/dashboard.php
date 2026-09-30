<?php
require 'cek_login.php';
require 'koneksi.php';

$sql_kategori = "SELECT k.nama_kategori, SUM(b.sisa) AS total_stok
                 FROM barang b LEFT JOIN kategori k ON b.kategori_id = k.id
                 GROUP BY k.id ORDER BY total_stok DESC LIMIT 6";
$stmt_kategori = $pdo->query($sql_kategori);
$kategori_labels = []; $kategori_data = [];
while ($row = $stmt_kategori->fetch(PDO::FETCH_ASSOC)) {
    $kategori_labels[] = $row['nama_kategori'] ?? 'Lainnya';
    $kategori_data[] = (int)$row['total_stok'];
}

$sql_nilai = "SELECT k.nama_kategori, SUM(b.sisa * IFNULL(b.harga_terakhir, 0)) AS total_nilai
              FROM barang b LEFT JOIN kategori k ON b.kategori_id = k.id
              GROUP BY k.id ORDER BY total_nilai DESC LIMIT 6";
$stmt_nilai = $pdo->query($sql_nilai);
$nilai_labels = []; $nilai_data = [];
while ($row = $stmt_nilai->fetch(PDO::FETCH_ASSOC)) {
    $nilai_labels[] = $row['nama_kategori'] ?? 'Lainnya';
    $nilai_data[] = (float)$row['total_nilai'];
}

$sql_tren_masuk = "SELECT DATE_FORMAT(tanggal_masuk, '%M %Y') AS bulan, SUM(jumlah) AS total
                   FROM barang_masuk
                   WHERE tanggal_masuk >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                   GROUP BY DATE_FORMAT(tanggal_masuk, '%Y-%m')
                   ORDER BY MIN(tanggal_masuk) ASC";
$stmt_tren = $pdo->query($sql_tren_masuk);
$tren_labels = []; $tren_masuk_data = [];
while ($row = $stmt_tren->fetch(PDO::FETCH_ASSOC)) {
    $tren_labels[] = $row['bulan'];
    $tren_masuk_data[] = (int)$row['total'];
}

require 'header.php';
?>

<div class="page-head">
    <div><h1>Grafik & Analitik</h1><p>Visualisasi komposisi stok, estimasi nilai aset, dan tren penerimaan barang.</p></div>
    <div class="head-actions"><a href="export_excel.php" class="btn btn-soft-success"><i class="fa-solid fa-file-excel me-2"></i>Unduh Excel</a></div>
</div>

<div class="row g-3 mb-3">
    <div class="col-xl-4 col-lg-5">
        <div class="card h-100">
            <div class="card-header"><h6 class="section-title">Komposisi Stok Fisik</h6><div class="section-sub">6 kategori dengan volume stok terbesar.</div></div>
            <div class="card-body"><div style="position:relative;height:310px;width:100%"><canvas id="stokKategoriChart"></canvas></div></div>
        </div>
    </div>
    <div class="col-xl-8 col-lg-7">
        <div class="card h-100">
            <div class="card-header"><h6 class="section-title">Estimasi Nilai Aset</h6><div class="section-sub">Sisa stok fisik × harga satuan terakhir.</div></div>
            <div class="card-body"><div style="position:relative;height:310px;width:100%"><canvas id="nilaiAsetChart"></canvas></div></div>
        </div>
    </div>
</div>

<div class="card mb-3">
    <div class="card-header"><h6 class="section-title">Tren Penerimaan Barang</h6><div class="section-sub">Volume penerimaan selama 6 bulan terakhir.</div></div>
    <div class="card-body"><div style="position:relative;height:360px;width:100%"><canvas id="trenMasukChart"></canvas></div></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
const colors=['#0b5cab','#f4b400','#1f9d63','#dc4c64','#36a3d8','#6b7785'];
const chartBase={responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{usePointStyle:true,boxWidth:10}}},scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:{color:'#eef1f5'}}}};
new Chart(document.getElementById('stokKategoriChart'),{type:'doughnut',data:{labels:<?= json_encode($kategori_labels, JSON_UNESCAPED_UNICODE); ?>,datasets:[{data:<?= json_encode($kategori_data); ?>,backgroundColor:colors,borderWidth:3,borderColor:'#fff'}]},options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:10,padding:14}}}}});
new Chart(document.getElementById('nilaiAsetChart'),{type:'bar',data:{labels:<?= json_encode($nilai_labels, JSON_UNESCAPED_UNICODE); ?>,datasets:[{label:'Nilai Aset (Rp)',data:<?= json_encode($nilai_data); ?>,backgroundColor:'#0b5cab',borderRadius:8,maxBarThickness:42}]},options:{...chartBase,plugins:{legend:{display:false}},scales:{...chartBase.scales,y:{beginAtZero:true,grid:{color:'#eef1f5'},ticks:{callback:v=>'Rp '+Number(v).toLocaleString('id-ID')}}}}});
new Chart(document.getElementById('trenMasukChart'),{type:'line',data:{labels:<?= json_encode($tren_labels, JSON_UNESCAPED_UNICODE); ?>,datasets:[{label:'Barang Masuk',data:<?= json_encode($tren_masuk_data); ?>,borderColor:'#0b5cab',backgroundColor:'rgba(11,92,171,.08)',pointBackgroundColor:'#0b5cab',pointRadius:4,pointHoverRadius:6,fill:true,tension:.35}]},options:{...chartBase}});
</script>

<?php require 'footer.php'; ?>
