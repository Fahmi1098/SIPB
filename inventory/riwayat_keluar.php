<?php 
require 'cek_login.php';
require 'koneksi.php';
require_once 'functions.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') { requireCsrf(); }

$pesan = "";
$status = "";

// --- HAPUS TRANSAKSI KELUAR (Pengembalian Stok & MERGE Nomor Seri Kuasi) ---
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['hapus_id'])) {
    $id_hapus = (int)$_POST['hapus_id'];
    try {
        $pdo->beginTransaction();
        
        $stmt_cek = $pdo->prepare("SELECT id FROM transaksi_keluar WHERE id = ?");
        $stmt_cek->execute([$id_hapus]);
        if ($stmt_cek->rowCount() == 0) {
            throw new Exception("Transaksi tidak ditemukan.");
        }

        // Ambil detail barang keluar beserta informasi kategorinya
        $sql_detail = "SELECT d.barang_id, d.jumlah, d.nomor_awal, d.nomor_dus, k.nama_kategori 
                       FROM detail_barang_keluar d 
                       JOIN barang b ON d.barang_id = b.id 
                       LEFT JOIN kategori k ON b.kategori_id = k.id 
                       WHERE d.transaksi_keluar_id = ?";
        $stmt_detail = $pdo->prepare($sql_detail);
        $stmt_detail->execute([$id_hapus]);
        $details = $stmt_detail->fetchAll(PDO::FETCH_ASSOC);

        $stmt_revert = $pdo->prepare("UPDATE barang SET terpakai = terpakai - ?, sisa = sisa + ? WHERE id = ?");

        foreach ($details as $det) {
            // 1. Kembalikan stok di tabel master barang
            $stmt_revert->execute([$det['jumlah'], $det['jumlah'], $det['barang_id']]);

            // 2. LOGIKA BARU: Restorasi Kuasi (Merge kembali ke tumpukan aslinya)
            if (stripos($det['nama_kategori'], 'kuasi') !== false && !empty($det['nomor_awal'])) {
                $rentang_array = explode(", ", $det['nomor_awal']); 
                $rentang_array = array_reverse($rentang_array);
                
                foreach ($rentang_array as $rentang) {
                    $parts = explode(" - ", $rentang);
                    if (count($parts) == 2) {
                        $awal_str = trim($parts[0]);
                        $akhir_str = trim($parts[1]);

                        $prefix = preg_replace('/[0-9]/', '', $awal_str);
                        $angka_awal_str = preg_replace('/[^0-9]/', '', $awal_str);
                        $angka_akhir_str = preg_replace('/[^0-9]/', '', $akhir_str);

                        $digit_awal = (int)$angka_awal_str;
                        $digit_akhir = (int)$angka_akhir_str;
                        $sisa_lembar = $digit_akhir - $digit_awal + 1;

                        $stmt_cari_batch = $pdo->prepare("SELECT id, digit_sekarang FROM stok_kuasi WHERE barang_id = ? AND prefix_huruf = ? AND digit_awal <= ? AND digit_akhir >= ? LIMIT 1");
                        $stmt_cari_batch->execute([$det['barang_id'], $prefix, $digit_awal, $digit_akhir]);
                        $batch_asli = $stmt_cari_batch->fetch(PDO::FETCH_ASSOC);

                        if ($batch_asli) {
                            if ($digit_akhir + 1 == $batch_asli['digit_sekarang']) {
                                $stmt_merge = $pdo->prepare("UPDATE stok_kuasi SET digit_sekarang = ?, sisa_lembar = sisa_lembar + ? WHERE id = ?");
                                $stmt_merge->execute([$digit_awal, $sisa_lembar, $batch_asli['id']]);
                            } else {
                                throw new Exception("<b>Gagal Membatalkan:</b> Nomor seri <b>{$rentang}</b> tidak dapat disatukan karena urutan FIFO bolong. Harap batalkan transaksi yang lebih baru terlebih dahulu.");
                            }
                        } else {
                            $panjang_digit = strlen($angka_awal_str);
                            $stmt_restore_kuasi = $pdo->prepare("INSERT INTO stok_kuasi (barang_id, nomor_dus, prefix_huruf, panjang_digit, digit_awal, digit_akhir, digit_sekarang, sisa_lembar, tanggal_masuk) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                            $stmt_restore_kuasi->execute([
                                $det['barang_id'], $det['nomor_dus'], $prefix, $panjang_digit, $digit_awal, $digit_akhir, $digit_awal, $sisa_lembar, date('Y-m-d')
                            ]);
                        }
                    }
                }
            }
        }

        // 3. Hapus data detail dan headernya
        $pdo->prepare("DELETE FROM detail_barang_keluar WHERE transaksi_keluar_id = ?")->execute([$id_hapus]);
        $pdo->prepare("DELETE FROM transaksi_keluar WHERE id = ?")->execute([$id_hapus]);

        $pdo->commit();
        $pesan = "Data distribusi berhasil dibatalkan. Stok fisik dan Nomor Seri Kuasi telah menyatu kembali ke gudang.";
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

// Panggil Header UI
require 'header.php';
?>

<div class="container-fluid px-4 mt-4 mb-5">
    
    <div class="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 class="h3 mb-0 text-gray-800 fw-bold" style="color: var(--gov-primary);">Riwayat Distribusi Barang Keluar</h1>
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
                    <a href="riwayat_keluar.php" class="btn btn-light border fw-bold text-secondary ms-1">
                        <i class="fas fa-sync-alt me-1"></i> Reset
                    </a>
                </div>
            </form>
        </div>
    </div>

    <div class="card shadow-sm border-0" style="border-top: 4px solid #dc3545;">
        <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <div>
                <h5 class="text-danger fw-bold mb-0"><i class="fas fa-dolly me-2"></i> Daftar Distribusi</h5>
                <small class="text-muted">Periode: <b><?= date('d/m/Y', strtotime($tgl_awal)); ?></b> s/d <b><?= date('d/m/Y', strtotime($tgl_akhir)); ?></b>.</small>
            </div>
            <a href="barang_keluar.php" class="btn btn-sm btn-danger fw-bold shadow-sm"><i class="fas fa-arrow-up me-1"></i> Form Distribusi Baru</a>
        </div>
        <div class="card-body p-4"> 
            <div class="table-responsive">
                <table class="table table-hover table-bordered align-middle mb-0 text-nowrap tabel-data" style="width:100%">
                    <thead class="text-center" style="background-color: var(--gov-primary); color: white;">
                        <tr>
                            <th width="5%">No</th>
                            <th width="12%">Tgl Distribusi</th>
                            <th width="20%">Pihak Penerima / Pemohon</th>
                            <th width="12%">Tujuan Ruangan</th>
                            <th width="23%">Rincian Barang & Seri Kuasi</th>
                            <th width="15%">Cetak Dokumen</th>
                            <th width="13%">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white">
                        <?php
                        $sql = "SELECT * FROM transaksi_keluar 
                                WHERE tanggal_keluar BETWEEN :tgl_awal AND :tgl_akhir 
                                ORDER BY tanggal_keluar DESC, id DESC";
                        $stmt = $pdo->prepare($sql);
                        $stmt->execute(['tgl_awal' => $tgl_awal, 'tgl_akhir' => $tgl_akhir]);
                        
                        $no = 1;
                        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                            $sql_det = "SELECT d.jumlah, d.nomor_awal, d.nomor_dus, b.nama_barang, b.satuan 
                                        FROM detail_barang_keluar d 
                                        JOIN barang b ON d.barang_id = b.id 
                                        WHERE d.transaksi_keluar_id = ?";
                            $stmt_det = $pdo->prepare($sql_det);
                            $stmt_det->execute([$row['id']]);
                            $details = $stmt_det->fetchAll(PDO::FETCH_ASSOC);

                            $tgl_asli = $row['tanggal_keluar'];
                            $tgl_tampil = date('d-m-Y', strtotime($tgl_asli));

                            echo "<tr>
                                    <td class='text-center'>{$no}</td>
                                    <td class='text-center fw-bold text-danger' data-order='{$tgl_asli}'>{$tgl_tampil}</td>
                                    <td>
                                        <span class='fw-bold text-dark'>" . htmlspecialchars($row['penerima_nama']) . "</span><br>
                                        <small class='text-muted'><i class='fas fa-id-badge'></i> " . htmlspecialchars($row['penerima_nip'] ?: 'NIP -') . "</small>
                                    </td>
                                    <td class='text-center'><span class='badge bg-warning text-dark px-2 py-1 fs-6 shadow-sm'>" . htmlspecialchars($row['tujuan_ruangan'] ?? 'Umum') . "</span></td>
                                    <td>
                                        <ul class='mb-0 ps-3 small text-muted'>";
                            
                            foreach($details as $d) {
                                $info_seri = "";
                                if (!empty($d['nomor_awal'])) {
                                    $info_dus = !empty($d['nomor_dus']) ? " (Dus: {$d['nomor_dus']})" : "";
                                    $info_seri = "<br><span class='badge bg-warning text-dark mt-1 mb-1 shadow-sm'><i class='fas fa-barcode'></i> Keluar: {$d['nomor_awal']} {$info_dus}</span>";
                                }
                                echo "<li><span class='text-dark fw-bold'>{$d['jumlah']} {$d['satuan']}</span> - " . htmlspecialchars($d['nama_barang']) . " {$info_seri}</li>";
                            }
                            
                            echo "      </ul>
                                    </td>
                                    <td class='text-center'>
                                        <div class='dropdown'>
                                            <button class='btn btn-sm btn-outline-primary dropdown-toggle fw-bold w-100' type='button' data-bs-toggle='dropdown' aria-expanded='false'>
                                                <i class='fas fa-print me-1'></i> Cetak
                                            </button>
                                            <ul class='dropdown-menu shadow-sm'>
                                                <li><a class='dropdown-item fw-bold text-danger' href='cetak_semua_dokumen.php?id={$row['id']}' target='_blank'><i class='fas fa-file-pdf me-2'></i>Cetak Semua</a></li>
                                                <li><hr class='dropdown-divider'></li>
                                                <li><a class='dropdown-item' href='cetak_dokumen.php?id={$row['id']}&jenis=nota' target='_blank'><i class='fas fa-file-alt me-2'></i>Cetak Nota Dinas</a></li>
                                                <li><a class='dropdown-item' href='cetak_dokumen.php?id={$row['id']}&jenis=bast' target='_blank'><i class='fas fa-file-signature me-2'></i>Cetak BAST</a></li>
                                                <li><a class='dropdown-item' href='cetak_dokumen.php?id={$row['id']}&jenis=bend29' target='_blank'><i class='fas fa-file-invoice me-2'></i>Cetak BEND 29</a></li>
                                            </ul>
                                        </div>
                                    </td>
                                    <td class='text-center align-middle'>
                                        <form action='' method='POST' class='d-inline' onsubmit=\"return confirm('YAKIN INGIN MEMBATALKAN DISTRIBUSI INI?\\n\\nSemua barang dan nomor seri (jika ada) dalam transaksi ini akan digabungkan kembali ke tumpukan aslinya di gudang.');\">
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
