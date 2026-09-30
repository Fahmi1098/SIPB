<?php 
require 'cek_login.php'; 
require 'koneksi.php'; 

// Memanggil header UI
require 'header.php';
?>

<div class="page-head"><div><h1>Dashboard Rekapitulasi Aset</h1><p>Pantau persediaan, transaksi, dan nilai aset dalam satu tampilan.</p></div><div class="head-actions"><a href="export_excel.php" class="btn btn-soft-success"><i class="fa-solid fa-file-excel me-2"></i>Export</a><a href="barang_masuk.php" class="btn btn-primary"><i class="fa-solid fa-plus me-2"></i>Transaksi Baru</a></div></div>
    
    <div class="row g-3 mb-4">
        <div class="col-xl-3 col-md-6"><div class="card stat-card accent-blue h-100"><div class="label">Total Master Barang</div><div class="value"><?php $total_barang=$pdo->query("SELECT COUNT(*) FROM barang")->fetchColumn(); echo number_format($total_barang); ?> <small class="fw-semibold text-muted fs-6">item</small></div><div class="hint">Jumlah item pada master persediaan</div><div class="icon"><i class="fa-solid fa-boxes-stacked"></i></div></div></div>
        <div class="col-xl-3 col-md-6"><div class="card stat-card accent-green h-100"><div class="label">Estimasi Nilai Aset</div><div class="value"><small class="fs-6">Rp</small> <?php $total_uang=$pdo->query("SELECT SUM(sisa * IFNULL(harga_terakhir,0)) FROM barang")->fetchColumn(); echo number_format($total_uang,0,',','.'); ?></div><div class="hint">Nilai berdasarkan sisa × harga terakhir</div><div class="icon"><i class="fa-solid fa-wallet"></i></div></div></div>
        <div class="col-xl-3 col-md-6"><div class="card stat-card accent-red h-100"><div class="label">Distribusi Bulan Ini</div><div class="value"><?php $keluar_bulan=$pdo->query("SELECT COALESCE(SUM(d.jumlah),0) FROM transaksi_keluar t JOIN detail_barang_keluar d ON t.id=d.transaksi_keluar_id WHERE MONTH(t.tanggal_keluar)=MONTH(NOW()) AND YEAR(t.tanggal_keluar)=YEAR(NOW())")->fetchColumn(); echo number_format($keluar_bulan); ?> <small class="fw-semibold text-muted fs-6">unit</small></div><div class="hint">Barang keluar pada bulan berjalan</div><div class="icon"><i class="fa-solid fa-arrow-up-right-dots"></i></div></div></div>
        <div class="col-xl-3 col-md-6"><div class="card stat-card accent-yellow h-100"><div class="label">Stok Menipis</div><div class="value"><?php $stok_menipis=$pdo->query("SELECT COUNT(*) FROM barang WHERE sisa<10")->fetchColumn(); echo number_format($stok_menipis); ?> <small class="fw-semibold text-muted fs-6">item</small></div><div class="hint">Perlu perhatian dan pengadaan ulang</div><div class="icon"><i class="fa-solid fa-triangle-exclamation"></i></div></div></div>
    </div>

    <div class="row g-3 mb-4">
        <div class="col-lg-4">
            <div class="card quick-card h-100">
                <div class="quick-icon bg-light text-danger"><i class="fa-solid fa-right-left"></i></div><h6>Transaksi</h6><p>Catat pergerakan barang masuk, keluar, dan hasil stock opname.</p>
                <div class="d-grid gap-2">
                    <a href="barang_masuk.php" class="quick-link"><i class="fas fa-arrow-down me-2"></i> Penerimaan Barang Masuk</a>
                    <a href="barang_keluar.php" class="quick-link"><i class="fas fa-arrow-up me-2"></i> Distribusi Barang Keluar</a>
                    <a href="stock_opname.php" class="quick-link"><i class="fas fa-clipboard-check me-2"></i> Rekonsiliasi Fisik (Opname)</a>
                </div>
            </div>
        </div>
        <div class="col-lg-4">
            <div class="card quick-card h-100">
                <div class="quick-icon bg-light text-primary"><i class="fa-solid fa-file-lines"></i></div><h6>Laporan & Dokumen</h6><p>Akses kartu persediaan, riwayat, impor, dan ekspor data.</p>
                <div class="d-grid gap-2">
                    <a href="kartu_persediaan.php" class="quick-link"><i class="fas fa-book me-2"></i> Buku Gudang / Persediaan</a>
                    
                    <a href="stok_kuasi.php" class="quick-link"><i class="fas fa-barcode me-2"></i> Laporan Sisa Dokumen Kuasi</a>
                    
                    <div class="d-grid gap-2">
                        <a href="riwayat_masuk.php" class="quick-link"><i class="fas fa-history me-1"></i> Riw. Masuk</a>
                        <a href="riwayat_keluar.php" class="quick-link"><i class="fas fa-history me-1"></i> Riw. Keluar</a>
                    </div>
                    <div class="d-grid gap-2">
                        <a href="export_excel.php" class="quick-link"><i class="fas fa-file-excel me-1"></i> Export</a>
                        <a href="import_data.php" class="quick-link"><i class="fas fa-file-upload me-1"></i> Import</a>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-lg-4">
            <div class="card quick-card h-100">
                <div class="quick-icon bg-light text-success"><i class="fa-solid fa-sliders"></i></div><h6>Master & Pengaturan</h6><p>Kelola master barang, kategori, pegawai, dan akses pengguna.</p>
                <div class="d-grid gap-2">
                    <a href="dashboard.php" class="quick-link"><i class="fas fa-chart-pie me-2"></i> Grafik & Analitik</a>
                    <a href="manage_barang.php" class="quick-link"><i class="fas fa-box me-2"></i> Master Barang</a>
                    <div class="d-grid gap-2">
                        <a href="master_kategori.php" class="quick-link"><i class="fas fa-tags me-1"></i> Kategori</a>
                        <a href="manage_pegawai.php" class="quick-link"><i class="fas fa-users me-1"></i> Pegawai</a>
                    </div>
                    <?php if ($_SESSION['role'] == 'admin'): ?>
                    <a href="manage_users.php" class="quick-link"><i class="fas fa-user-shield me-2"></i> Manajemen Akses Sistem</a>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

    <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
            <div><h6 class="section-title"><i class="fa-solid fa-table-list me-2 text-primary"></i>Buku Inventaris Barang Habis Pakai</h6><div class="section-sub">Ringkasan stok dan estimasi nilai aset saat ini.</div></div>
            <a href="kartu_persediaan.php" class="btn btn-soft-primary btn-sm"><i class="fas fa-search me-1"></i> Telusuri Mutasi</a>
        </div>
        <div class="card-body p-4"> 
            <div class="table-responsive">
                <table class="table table-hover table-bordered align-middle mb-0 tabel-data" style="width:100%">
                    <thead class="text-center" style="background-color: var(--gov-primary); color: white;">
                        <tr>
                            <th width="5%">No</th>
                            <th width="15%">Kategori</th>
                            <th width="20%">Spesifikasi Nama Barang</th>
                            <th width="8%">Satuan</th>
                            <th width="12%">Harga Satuan (Rp)</th>
                            <th width="10%">Keluar / Pakai</th>
                            <th width="12%">Sisa Fisik</th>
                            <th width="18%">Total Nilai Aset (Rp)</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white">
                        <?php
                        $sql = "SELECT b.*, k.nama_kategori 
                                FROM barang b 
                                LEFT JOIN kategori k ON b.kategori_id = k.id 
                                ORDER BY k.nama_kategori, b.nama_barang";
                        $stmt = $pdo->query($sql);
                        $no = 1;
                        $grand_total = 0;

                        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                            $sisa = (int)$row['sisa'];
                            $harga = isset($row['harga_terakhir']) ? (float)$row['harga_terakhir'] : 0;
                            $nilai_aset = $sisa * $harga;
                            $grand_total += $nilai_aset;

                            if ($sisa <= 0) {
                                $stok_class = 'bg-danger text-white border-danger shadow-sm';
                            } elseif ($sisa < 10) {
                                $stok_class = 'bg-warning text-dark border-warning shadow-sm';
                            } else {
                                $stok_class = 'bg-light text-dark border';
                            }

                            // Tambahkan indikator Kuasi
                            $is_kuasi = (stripos($row['nama_kategori'], 'kuasi') !== false);
                            $badge_kuasi = $is_kuasi ? "<br><span class='badge bg-warning text-dark mt-1'><i class='fas fa-barcode'></i> Dokumen Seri</span>" : "";

                            echo "<tr>
                                    <td class='text-center'>{$no}</td>
                                    <td><span class='badge bg-secondary'>" . htmlspecialchars($row['nama_kategori'] ?? '-') . "</span></td>
                                    <td>
                                        <span class='fw-bold text-dark'>" . htmlspecialchars($row['nama_barang']) . "</span>
                                        {$badge_kuasi}
                                    </td>
                                    <td class='text-center'>" . htmlspecialchars($row['satuan']) . "</td>
                                    <td class='text-end' data-order='{$harga}'>" . number_format($harga, 0, ',', '.') . "</td>
                                    <td class='text-center text-danger fw-bold'>" . number_format($row['terpakai']) . "</td>
                                    <td class='text-center' data-order='{$sisa}'>
                                        <span class='badge {$stok_class} fs-6 px-3 py-2 w-100'>{$sisa}</span>
                                    </td>
                                    <td class='text-end fw-bold text-success' data-order='{$nilai_aset}'>" . number_format($nilai_aset, 0, ',', '.') . "</td>
                                  </tr>";
                            $no++;
                        }
                        ?>
                    </tbody>
                    <tfoot style="background-color: #f8fbff;">
                        <tr>
                            <th colspan="7" class="text-end fw-bold text-dark fs-6 py-3">TOTAL NILAI ASET PERSEDIAAN:</th>
                            <th class="text-end fw-bold text-gov-primary fs-5 py-3">
                                Rp <?= number_format($grand_total, 0, ',', '.'); ?>
                            </th>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    </div>
    

<?php 
// Memanggil footer UI
require 'footer.php'; 
?>