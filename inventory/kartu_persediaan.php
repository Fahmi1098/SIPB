<?php
require 'cek_login.php';
require 'koneksi.php';

$barang_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$barang_info = null;
$riwayat = [];

// Jika ada barang yang dipilih, ambil datanya
if ($barang_id > 0) {
    $stmt_info = $pdo->prepare("
        SELECT b.*, k.nama_kategori 
        FROM barang b 
        LEFT JOIN kategori k ON b.kategori_id = k.id 
        WHERE b.id = ?
    ");
    $stmt_info->execute([$barang_id]);
    $barang_info = $stmt_info->fetch(PDO::FETCH_ASSOC);

    if ($barang_info) {
        // Query SUPER UNION: Menggabungkan Mutasi Masuk, Keluar, dan Opname
        $sql_riwayat = "
            SELECT 
                tanggal_masuk AS tgl, 
                'Masuk' AS tipe, 
                jumlah AS qty_masuk, 
                0 AS qty_keluar, 
                harga_satuan AS harga, 
                CONCAT('Penerimaan dari ', nama_penyerah, IF(nomor_awal IS NOT NULL, CONCAT(' [Seri: ', nomor_awal, ' - ', nomor_akhir, ']'), ''), IF(nomor_dus IS NOT NULL, CONCAT(' [Dus: ', nomor_dus, ']'), '')) AS keterangan 
            FROM barang_masuk 
            WHERE barang_id = ?
            
            UNION ALL
            
            SELECT 
                t.tanggal_keluar AS tgl, 
                'Keluar' AS tipe, 
                0 AS qty_masuk, 
                d.jumlah AS qty_keluar, 
                0 AS harga, 
                CONCAT('Distribusi ke ', t.penerima_nama, ' (', IFNULL(t.tujuan_ruangan, 'Umum'), ')', IF(d.nomor_awal IS NOT NULL, CONCAT(' [Seri Keluar: ', d.nomor_awal, ']'), ''), IF(d.nomor_dus IS NOT NULL, CONCAT(' [Dus: ', d.nomor_dus, ']'), '')) AS keterangan 
            FROM detail_barang_keluar d 
            JOIN transaksi_keluar t ON d.transaksi_keluar_id = t.id 
            WHERE d.barang_id = ?
            
            UNION ALL
            
            SELECT 
                tanggal_opname AS tgl, 
                IF(selisih > 0, 'Masuk', 'Keluar') AS tipe, 
                IF(selisih > 0, ABS(selisih), 0) AS qty_masuk, 
                IF(selisih < 0, ABS(selisih), 0) AS qty_keluar, 
                0 AS harga, 
                CONCAT('Penyesuaian Opname Fisik: ', keterangan) AS keterangan 
            FROM riwayat_opname 
            WHERE barang_id = ?
            
            ORDER BY tgl ASC
        ";
        $stmt_riwayat = $pdo->prepare($sql_riwayat);
        $stmt_riwayat->execute([$barang_id, $barang_id, $barang_id]);
        $riwayat = $stmt_riwayat->fetchAll(PDO::FETCH_ASSOC);
    }
}

// Panggil Header
require 'header.php';
?>

<style>
    @media print {
        @page {
            size: A4 portrait;
            margin: 1.5cm; /* Margin kertas diratakan semua sisi */
        }
        
        /* Sembunyikan elemen web yang tidak perlu */
        .no-print { display: none !important; }
        
        /* Reset padding & margin container */
        body { background-color: #fff !important; color: #000 !important; font-size: 10pt !important; }
        .container-fluid { padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
        
        /* FIX MARGIN TERPOTONG KIRI: Hapus margin negatif dari Bootstrap Row */
        .row { margin-left: 0 !important; margin-right: 0 !important; }
        
        /* Bersihkan Card UI */
        .card { border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
        .card-body { padding: 0 !important; }
        
        /* BERSAHKAN ARTIFAK DATATABLES */
        .dataTables_length, .dataTables_filter, .dataTables_info, .dataTables_paginate { display: none !important; }
        
        table.dataTable thead th::before, 
        table.dataTable thead th::after,
        table.dataTable thead td::before, 
        table.dataTable thead td::after {
            display: none !important;
            content: none !important;
        }
        
        /* Format Tabel Dokumen Resmi */
        .table-responsive { overflow-x: visible !important; width: 100% !important; margin: 0 !important; padding: 0 !important;}
        .table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #000 !important; margin-bottom: 0 !important; }
        .table-bordered th, .table-bordered td { border: 1px solid #000 !important; color: #000 !important; padding: 6px 4px !important; font-size: 9pt !important; }
        
        thead th { 
            background-color: #f2f2f2 !important; 
            color: #000 !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
        }
        
        /* PERBAIKAN INFO BOX AGAR TEKS KIRI TIDAK TERPOTONG */
        .info-box-print { 
            background-color: transparent !important; 
            border: none !important; 
            padding: 0 !important; 
            margin-top: 0 !important;
            margin-bottom: 15px !important; 
            display: flex !important; 
            flex-wrap: nowrap !important; 
            width: 100% !important; 
        }
        .info-col-left { width: 65% !important; padding: 0 !important; margin: 0 !important; } 
        .info-col-right { width: 35% !important; padding: 0 !important; margin: 0 !important; border: none !important; text-align: right !important; }
        
        /* Pastikan sel di info box bisa menyesuaikan diri dengan baik di kertas */
        .table-borderless { margin: 0 !important; padding: 0 !important; }
        .table-borderless td { padding: 2px 4px 2px 0 !important; font-size: 10pt !important; vertical-align: top !important; }
        .info-val { white-space: normal !important; word-wrap: break-word !important; }
        
        /* PERBAIKAN BADGE AGAR TEKS BISA TURUN KE BAWAH (WRAP) */
        .badge { 
            color: #000 !important; 
            background: transparent !important; 
            border: none !important; 
            padding: 0 !important; 
            font-size: 10pt !important; 
            font-weight: normal !important; 
            text-align: left !important;
            white-space: normal !important; 
            word-wrap: break-word !important;
        }
        .badge-nilai-aset { font-weight: bold !important; }
        .badge i { display: none !important; }
    }
</style>

<div class="container-fluid px-4 mt-4 mb-5">
    
    <div class="d-sm-flex align-items-center justify-content-between mb-4 no-print">
        <h1 class="h3 mb-0 text-gray-800 fw-bold" style="color: var(--gov-primary);">Buku Gudang (Kartu Persediaan Barang)</h1>
    </div>

    <div class="card shadow-sm border-0 border-top border-4 mb-4 no-print" style="border-top-color: var(--gov-primary);">
        <div class="card-body">
            <form action="" method="GET" class="row align-items-end">
                <div class="col-md-9">
                    <label class="form-label fw-bold text-gov-primary"><i class="fas fa-search me-1"></i> Pilih Barang untuk Dilihat Buku Gudangnya</label>
                    <select name="id" class="form-select border-primary fw-bold" required style="background-color: #f8fbff;">
                        <option value="">-- Ketik / Cari Nama Barang Terdaftar --</option>
                        <?php
                        $sql_brg = "SELECT b.id, b.nama_barang, b.satuan, k.nama_kategori 
                                    FROM barang b 
                                    LEFT JOIN kategori k ON b.kategori_id = k.id 
                                    ORDER BY b.nama_barang";
                        $stmt_brg = $pdo->query($sql_brg);
                        while ($b = $stmt_brg->fetch()) {
                            $selected = ($b['id'] == $barang_id) ? 'selected' : '';
                            $is_kuasi = (stripos($b['nama_kategori'], 'kuasi') !== false) ? ' [Dokumen Seri]' : '';
                            echo "<option value='{$b['id']}' {$selected}>" . htmlspecialchars($b['nama_barang']) . " (" . htmlspecialchars($b['nama_kategori']) . "){$is_kuasi}</option>";
                        }
                        ?>
                    </select>
                </div>
                <div class="col-md-3 mt-3 mt-md-0 d-grid">
                    <button type="submit" class="btn fw-bold text-white shadow-sm" style="background-color: var(--gov-primary);">
                        <i class="fas fa-eye me-1"></i> Tampilkan Mutasi
                    </button>
                </div>
            </form>
        </div>
    </div>

    <?php if ($barang_info): ?>
    
    <div class="card shadow-sm border-0" id="area-print" style="border-top: 4px solid var(--gov-accent);">
        <div class="card-body p-4 p-md-5">
            
            <div class="kop-surat d-none d-print-block text-center border-bottom border-dark border-3 pb-3 mb-4">
                <h4 style="margin:0; font-weight: bold;">PEMERINTAH PROVINSI BANTEN</h4>
                <h3 style="margin:0; font-weight: bold;">BADAN PENDAPATAN DAERAH</h3>
                <h2 style="margin:0; font-weight: bold;">UPTD PENGELOLAAN PENDAPATAN DAERAH MALINGPING</h2>
                <p style="margin:5px 0 0 0; font-size: 11pt;">Jl. Raya Malingping-Bayah, Kab. Lebak, Banten</p>
                <br>
                <h4 style="text-decoration: underline; font-weight: bold; margin-top:10px;">KARTU PERSEDIAAN BARANG (BUKU GUDANG)</h4>
            </div>

            <div class="row mb-4 p-3 rounded info-box-print" style="background-color: #f8f9fa; border: 1px solid #e3e6f0;">
                <div class="col-md-7 info-col-left">
                    <table class="table table-sm table-borderless mb-0">
                        <tr>
                            <td style="width: 130px; white-space: nowrap;" class="fw-bold text-muted">Nama Barang</td>
                            <td style="width: 10px;">:</td>
                            <td class="fw-bold fs-5 text-gov-primary text-dark info-val"><?= htmlspecialchars($barang_info['nama_barang']); ?></td>
                        </tr>
                        <tr>
                            <td style="width: 130px; white-space: nowrap;" class="fw-bold text-muted">Kategori Barang</td>
                            <td style="width: 10px;">:</td>
                            <td class="info-val"><span class="badge bg-secondary"><?= htmlspecialchars($barang_info['nama_kategori']); ?></span></td>
                        </tr>
                        <tr>
                            <td style="width: 130px; white-space: nowrap;" class="fw-bold text-muted">Merk / Tipe</td>
                            <td style="width: 10px;">:</td>
                            <td class="fw-bold info-val"><?= htmlspecialchars($barang_info['merk']) . " / " . htmlspecialchars($barang_info['tipe']); ?></td>
                        </tr>
                    </table>
                </div>
                <div class="col-md-5 text-md-end mt-3 mt-md-0 border-start ps-4 info-col-right">
                    <h6 class="text-secondary mb-1 fw-bold">Saldo Fisik Terakhir:</h6>
                    <h2 class="text-success fw-bold mb-0" style="color: #000 !important;">
                        <?= number_format($barang_info['sisa']); ?> <small class="fs-6 text-muted fw-normal"><?= htmlspecialchars($barang_info['satuan']); ?></small>
                    </h2>
                    <?php 
                    $harga_terakhir = isset($barang_info['harga_terakhir']) ? $barang_info['harga_terakhir'] : 0;
                    $nilai_aset = $barang_info['sisa'] * $harga_terakhir;
                    if ($harga_terakhir > 0) {
                        echo "<div class='mt-2'><span class='badge badge-nilai-aset bg-warning text-dark fs-6 shadow-sm border border-warning'><i class='fas fa-money-bill-wave me-1'></i> Nilai Aset: Rp " . number_format($nilai_aset, 0, ',', '.') . "</span></div>";
                    }
                    ?>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table table-bordered align-middle table-hover tabel-data" style="width: 100%;">
                    <thead class="text-center align-middle" style="background-color: var(--gov-primary); color: white;">
                        <tr>
                            <th rowspan="2" width="5%">No</th>
                            <th rowspan="2" width="12%">Tanggal</th>
                            <th rowspan="2" width="40%">Uraian / Kronologi Mutasi</th>
                            <th rowspan="2" width="13%">Harga Beli (Rp)</th>
                            <th colspan="3" class="border-bottom-0">Mutasi Fisik (Dalam <?= htmlspecialchars($barang_info['satuan']); ?>)</th>
                        </tr>
                        <tr>
                            <th width="10%">Masuk</th>
                            <th width="10%">Keluar</th>
                            <th width="10%" style="background-color: #002244;">Sisa Saldo</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white">
                        <?php if (empty($riwayat)): ?>
                        <?php else: ?>
                            <?php 
                            $no = 1;
                            $saldo = 0; // Saldo Berjalan (Running Balance)
                            foreach ($riwayat as $r): 
                                $tgl_asli = $r['tgl']; // Untuk Sort DataTables
                                $tgl_tampil = date('d-m-Y', strtotime($r['tgl']));
                                
                                // Kalkulasi saldo berjalan secara historis
                                $saldo = $saldo + $r['qty_masuk'] - $r['qty_keluar'];
                                
                                // Format angka agar rapi
                                $tampil_masuk = $r['qty_masuk'] > 0 ? number_format($r['qty_masuk']) : '-';
                                $tampil_keluar = $r['qty_keluar'] > 0 ? number_format($r['qty_keluar']) : '-';
                                $tampil_harga = $r['harga'] > 0 ? number_format($r['harga'], 0, ',', '.') : '-';
                                
                                // Pewarnaan Badge Keterangan
                                if ($r['tipe'] == 'Masuk' && strpos($r['keterangan'], 'Opname') !== false) {
                                    $badge = "<span class='badge bg-info text-dark me-1 no-print'><i class='fas fa-wrench'></i> Opname Masuk</span>";
                                    $print_badge = "[OPNAME IN]";
                                } elseif ($r['tipe'] == 'Keluar' && strpos($r['keterangan'], 'Opname') !== false) {
                                    $badge = "<span class='badge bg-warning text-dark me-1 no-print'><i class='fas fa-wrench'></i> Opname Keluar</span>";
                                    $print_badge = "[OPNAME OUT]";
                                } elseif ($r['tipe'] == 'Masuk') {
                                    $badge = "<span class='badge bg-success me-1 no-print'><i class='fas fa-arrow-down'></i> Masuk</span>";
                                    $print_badge = "[IN]";
                                } else {
                                    $badge = "<span class='badge bg-danger me-1 no-print'><i class='fas fa-arrow-up'></i> Keluar</span>";
                                    $print_badge = "[OUT]";
                                }
                            ?>
                            <tr>
                                <td class="text-center"><?= $no++; ?></td>
                                <td class="text-center fw-bold text-dark" data-order="<?= $tgl_asli; ?>"><?= $tgl_tampil; ?></td>
                                <td>
                                    <?= $badge; ?> 
                                    <span class="fw-bold d-none d-print-inline"><?= $print_badge; ?></span> 
                                    <?= $r['keterangan']; ?>
                                </td>
                                <td class="text-end text-muted" data-order="<?= $r['harga']; ?>"><?= $tampil_harga; ?></td>
                                <td class="text-center fw-bold text-success" style="color: #000 !important;"><?= $tampil_masuk; ?></td>
                                <td class="text-center fw-bold text-danger" style="color: #000 !important;"><?= $tampil_keluar; ?></td>
                                <td class="text-center fw-bold fs-6" style="background-color: #f8fbff; color: #000 !important;" data-order="<?= $saldo; ?>"><?= number_format($saldo); ?></td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>

            <div class="text-end mt-4 pt-3 border-top no-print">
                <button onclick="window.print()" class="btn btn-lg btn-outline-primary fw-bold shadow-sm px-5">
                    <i class="fas fa-print me-2"></i> Cetak Kartu Persediaan
                </button>
            </div>

        </div>
    </div>
    
    <?php elseif ($barang_id > 0): ?>
    <div class="alert alert-danger text-center"><i class="fas fa-exclamation-triangle me-2"></i> Barang tidak ditemukan!</div>
    <?php endif; ?>

</div>

<?php require 'footer.php'; ?>