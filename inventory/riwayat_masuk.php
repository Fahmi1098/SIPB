<?php 
require 'cek_login.php';
require 'koneksi.php';
require_once 'functions.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') { requireCsrf(); }

$pesan = "";
$status = "";

// --- HAPUS TRANSAKSI MASUK (Aman dari CSRF, Stok Minus & Bug Restorasi) ---
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['hapus_id'])) {
    $id_hapus = (int)$_POST['hapus_id'];
    try {
        $pdo->beginTransaction();
        
        // 1. Ambil data transaksi
        $stmt_cek = $pdo->prepare("SELECT barang_id, jumlah, nomor_awal, nomor_akhir, tanggal_masuk FROM barang_masuk WHERE id = ?");
        $stmt_cek->execute([$id_hapus]);
        $transaksi = $stmt_cek->fetch(PDO::FETCH_ASSOC);

        if (!$transaksi) {
            throw new Exception("Transaksi tidak ditemukan di database.");
        }

        // 2. Cek apakah sisa stok global saat ini masih mencukupi
        $stmt_stok = $pdo->prepare("SELECT sisa, nama_barang FROM barang WHERE id = ?");
        $stmt_stok->execute([$transaksi['barang_id']]);
        $barang = $stmt_stok->fetch(PDO::FETCH_ASSOC);

        if ($barang['sisa'] < $transaksi['jumlah']) {
            throw new Exception("<b>Ditolak Sistem!</b> Transaksi tidak dapat dibatalkan karena sebagian stok <b>{$barang['nama_barang']}</b> sudah didistribusikan/keluar. Membatalkan transaksi ini akan membuat stok menjadi minus.");
        }

        // 3. LOGIKA KUASI: Hitung seluruh lembar seri yang ada di gudang
        if (!empty($transaksi['nomor_awal']) && !empty($transaksi['nomor_akhir'])) {
            $prefix_awal = preg_replace('/[0-9]/', '', $transaksi['nomor_awal']);
            $num_awal = (int)preg_replace('/[^0-9]/', '', $transaksi['nomor_awal']);
            $num_akhir = (int)preg_replace('/[^0-9]/', '', $transaksi['nomor_akhir']);

            $stmt_kuasi_cek = $pdo->prepare("SELECT SUM(sisa_lembar) FROM stok_kuasi WHERE barang_id = ? AND prefix_huruf = ? AND digit_awal >= ? AND digit_akhir <= ?");
            $stmt_kuasi_cek->execute([$transaksi['barang_id'], $prefix_awal, $num_awal, $num_akhir]);
            $total_di_gudang = (int)$stmt_kuasi_cek->fetchColumn();

            if ($total_di_gudang < $transaksi['jumlah']) {
                throw new Exception("<b>Ditolak Sistem!</b> Sebagian lembar dari rentang nomor seri ini masih berstatus didistribusikan. Hapus riwayat distribusi (keluar) terlebih dahulu.");
            }

            $stmt_hapus_kuasi = $pdo->prepare("DELETE FROM stok_kuasi WHERE barang_id = ? AND prefix_huruf = ? AND digit_awal >= ? AND digit_akhir <= ?");
            $stmt_hapus_kuasi->execute([$transaksi['barang_id'], $prefix_awal, $num_awal, $num_akhir]);
        }

        // 4. Kembalikan stok (kurangi jumlah_total dan sisa)
        $stmt_revert = $pdo->prepare("UPDATE barang SET jumlah_total = jumlah_total - ?, sisa = sisa - ? WHERE id = ?");
        $stmt_revert->execute([$transaksi['jumlah'], $transaksi['jumlah'], $transaksi['barang_id']]);

        // 5. Hapus transaksi
        $stmt_del = $pdo->prepare("DELETE FROM barang_masuk WHERE id = ?");
        $stmt_del->execute([$id_hapus]);

        $pdo->commit();
        $pesan = "Data penerimaan barang berhasil dibatalkan dan stok berseri telah ditarik kembali secara utuh.";
        $status = "success";
    } catch (Exception $e) {
        $pdo->rollBack();
        $pesan = $e->getMessage();
        $status = "danger";
    }
}

// --- LOGIKA FILTER TANGGAL DIPERBARUI ---
// Default: Menampilkan data dari AWAL TAHUN hingga AKHIR TAHUN agar data langsung terlihat
$tgl_awal = isset($_GET['tgl_awal']) ? $_GET['tgl_awal'] : date('Y-01-01');
$tgl_akhir = isset($_GET['tgl_akhir']) ? $_GET['tgl_akhir'] : date('Y-12-31');

// Panggil Header UI (Untuk DataTables & Navigasi Seragam)
require 'header.php';
?>

<div class="container-fluid px-4 mt-4 mb-5">
    
    <div class="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 class="h3 mb-0 text-gray-800 fw-bold" style="color: var(--gov-primary);">Riwayat Penerimaan Barang Masuk</h1>
    </div>

    <?php if ($pesan != ""): ?>
        <div class="alert alert-<?= $status; ?> alert-dismissible fade show shadow-sm" role="alert">
            <i class="fas <?= $status == 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'; ?> me-2 mt-1 float-start fs-5"></i>
            <div class="ms-4"><?= $pesan; ?></div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    <?php endif; ?>

    <div class="card shadow-sm border-0 mb-4" style="border-top: 4px solid var(--gov-accent);">
        <div class="card-body">
            <form method="GET" action="" class="row g-3 align-items-end">
                <div class="col-md-3">
                    <label class="form-label fw-bold text-muted small"><i class="fas fa-calendar-alt me-1"></i> Dari Tanggal</label>
                    <input type="date" name="tgl_awal" class="form-control fw-bold text-dark" value="<?= htmlspecialchars($tgl_awal); ?>" required>
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold text-muted small"><i class="fas fa-calendar-alt me-1"></i> Sampai Tanggal</label>
                    <input type="date" name="tgl_akhir" class="form-control fw-bold text-dark" value="<?= htmlspecialchars($tgl_akhir); ?>" required>
                </div>
                <div class="col-md-6">
                    <button type="submit" class="btn fw-bold text-white shadow-sm" style="background-color: var(--gov-primary);">
                        <i class="fas fa-search me-2"></i> Terapkan Filter
                    </button>
                    <a href="riwayat_masuk.php" class="btn btn-light border fw-bold text-secondary ms-1">
                        <i class="fas fa-sync-alt me-1"></i> Reset
                    </a>
                </div>
            </form>
        </div>
    </div>

    <div class="card shadow-sm border-0" style="border-top: 4px solid #198754;">
        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <div>
                <h5 class="text-success fw-bold mb-0"><i class="fas fa-list me-2"></i> Daftar Penerimaan</h5>
                <small class="text-muted">Periode: <b><?= date('d/m/Y', strtotime($tgl_awal)); ?></b> s/d <b><?= date('d/m/Y', strtotime($tgl_akhir)); ?></b>.</small>
            </div>
            <a href="barang_masuk.php" class="btn btn-sm btn-success fw-bold shadow-sm"><i class="fas fa-plus me-1"></i> Input Penerimaan Baru</a>
        </div>
        <div class="card-body p-4"> 
            <div class="table-responsive">
                <table class="table table-hover table-bordered align-middle mb-0 text-nowrap tabel-data" style="width:100%">
                    <thead class="text-center" style="background-color: var(--gov-primary); color: white;">
                        <tr>
                            <th width="5%">No</th>
                            <th width="10%">Tgl Diterima</th>
                            <th width="20%">Nama Barang / Spesifikasi</th>
                            <th width="10%">Volume Masuk</th>
                            <th width="12%">Harga Satuan</th>
                            <th width="10%">Sumber Dana</th>
                            <th width="15%">Pihak Penyerah</th>
                            <th width="10%">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white">
                        <?php
                        $sql = "SELECT m.*, b.nama_barang, b.satuan, b.merk, b.tipe 
                                FROM barang_masuk m 
                                JOIN barang b ON m.barang_id = b.id 
                                WHERE m.tanggal_masuk BETWEEN :tgl_awal AND :tgl_akhir
                                ORDER BY m.tanggal_masuk DESC, m.id DESC";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute(['tgl_awal' => $tgl_awal, 'tgl_akhir' => $tgl_akhir]);
                        
                        $no = 1;
                        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                            $harga = $row['harga_satuan'] ?? 0;
                            $tgl_asli = $row['tanggal_masuk'];
                            $tgl_tampil = date('d-m-Y', strtotime($tgl_asli));

                            echo "<tr>
                                    <td class='text-center'>{$no}</td>
                                    <td class='text-center fw-bold' data-order='{$tgl_asli}'>{$tgl_tampil}</td>
                                    <td>
                                        <div class='fw-bold text-dark'>" . htmlspecialchars($row['nama_barang']) . "</div>
                                        <small class='text-muted'>" . htmlspecialchars($row['merk'] . ' / ' . $row['tipe']) . "</small>";
                                        
                            if(!empty($row['nomor_dus'])) {
                                echo "<br><span class='badge bg-secondary mt-1 shadow-sm'><i class='fas fa-box'></i> Dus: {$row['nomor_dus']}</span>";
                            }
                            if(!empty($row['nomor_awal'])) {
                                echo "<br><span class='badge bg-warning text-dark mt-1 shadow-sm'><i class='fas fa-barcode'></i> Seri: {$row['nomor_awal']} - {$row['nomor_akhir']}</span>";
                            }
                            
                            echo "  </td>
                                    <td class='text-center fw-bold text-success fs-5' data-order='{$row['jumlah']}'>
                                        +" . number_format($row['jumlah']) . " <span class='fs-6 text-muted fw-normal'>" . htmlspecialchars($row['satuan']) . "</span>
                                    </td>
                                    <td class='text-end' data-order='{$harga}'>Rp " . number_format($harga, 0, ',', '.') . "</td>
                                    <td class='text-center'><span class='badge border border-success text-success px-2 py-1'>" . htmlspecialchars($row['sumber_dana'] ?? 'Lainnya') . "</span></td>
                                    <td>" . htmlspecialchars($row['nama_penyerah']) . "</td>
                                    <td class='text-center align-middle'>
                                        <form action='' method='POST' class='d-inline' onsubmit=\"return confirm('YAKIN INGIN MEMBATALKAN TRANSAKSI INI?\\n\\nStok fisik beserta antrean nomor seri Kuasi akan dikurangi secara otomatis.');\">
                                            <?= csrf_field(); ?>
                                            <input type='hidden' name='hapus_id' value='{$row['id']}'>
                                            <button type='submit' class='btn btn-danger btn-sm fw-bold shadow-sm w-100'>
                                                <i class='fas fa-times-circle'></i> Batal / Hapus
                                            </button>
                                        </form>
                                    </td>
                                  </tr>";
                            $no++;
                        }
                        ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<?php require 'footer.php'; ?>
