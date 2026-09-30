<?php
require 'cek_login.php';
require 'koneksi.php';
require_once 'functions.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') { requireCsrf(); }
requireRole('admin');

$pesan = "";
$status = "";

// --- 1. PROSES HAPUS BARANG MASTER ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['hapus'])) {
    $id_hapus = (int)$_POST['hapus'];
    
    // Proteksi: Cek apakah barang sudah pernah ditransaksikan
    $cek_trx = $pdo->prepare("SELECT COUNT(*) FROM barang_masuk WHERE barang_id = ?");
    $cek_trx->execute([$id_hapus]);
    $ada_masuk = $cek_trx->fetchColumn();
    
    $cek_trx2 = $pdo->prepare("SELECT COUNT(*) FROM detail_barang_keluar WHERE barang_id = ?");
    $cek_trx2->execute([$id_hapus]);
    $ada_keluar = $cek_trx2->fetchColumn();

    if ($ada_masuk > 0 || $ada_keluar > 0) {
        $pesan = "<b>Penghapusan Ditolak Sistem!</b> Barang tidak bisa dihapus karena sudah memiliki riwayat mutasi. Gunakan fitur <b>Edit</b> jika hanya ingin memperbaiki salah ketik nama barang.";
        $status = "danger";
    } else {
        try {
            $pdo->prepare("DELETE FROM barang WHERE id = ?")->execute([$id_hapus]);
            catat_log('hapus', 'barang', $id_hapus, 'Master barang dihapus.');
            $pesan = "Data master barang berhasil dihapus permanen!";
            $status = "success";
        } catch (PDOException $e) {
            $pesan = "Gagal menghapus data. Silakan coba lagi.";
            error_log('manage_barang delete error: ' . $e->getMessage());
            $status = "danger";
        }
    }
}

// --- 2. PROSES UPDATE BARANG MASTER ---
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['id_barang'])) {
    $id_barang = (int)$_POST['id_barang'];
    $nama      = trim($_POST['nama_barang']);
    $kategori  = (int)$_POST['kategori_id'];
    $merk      = trim($_POST['merk']);
    $tipe      = trim($_POST['tipe']);
    $satuan    = trim($_POST['satuan']);

    if (!empty($nama) && $kategori > 0) {
        try {
            $stmt = $pdo->prepare("UPDATE barang SET nama_barang = ?, kategori_id = ?, merk = ?, tipe = ?, satuan = ? WHERE id = ?");
            $stmt->execute([$nama, $kategori, $merk, $tipe, $satuan, $id_barang]);
            $pesan = "Spesifikasi data barang berhasil diperbarui!";
            $status = "success";
        } catch (PDOException $e) {
            $pesan = "Terjadi kesalahan sistem. Silakan coba lagi.";
            error_log('manage_barang update error: ' . $e->getMessage());
            $status = "danger";
        }
    } else {
        $pesan = "Nama barang dan Kategori wajib diisi!";
        $status = "warning";
    }
}

// --- 3. AMBIL DATA UNTUK FORM EDIT ---
$edit_data = null;
if (isset($_GET['edit'])) {
    $id_edit = (int)$_GET['edit'];
    $stmt_edit = $pdo->prepare("SELECT * FROM barang WHERE id = ?");
    $stmt_edit->execute([$id_edit]);
    $edit_data = $stmt_edit->fetch(PDO::FETCH_ASSOC);
}

// Panggil Header
require 'header.php';
?>

<div class="container-fluid px-4 mt-4 mb-5">
    
    <div class="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 class="h3 mb-0 text-gray-800 fw-bold" style="color: var(--gov-primary);">Master Data Barang</h1>
    </div>

    <?php if ($pesan != ""): ?>
        <div class="alert alert-<?= $status; ?> alert-dismissible fade show shadow-sm" role="alert">
            <i class="fas <?= $status == 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'; ?> me-2 mt-1 float-start fs-5"></i>
            <div class="ms-4"><?= $pesan; ?></div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    <?php endif; ?>

    <div class="row">
        <div class="col-md-4 mb-4">
            <div class="card shadow-sm border-0 border-top <?= $edit_data ? 'border-warning' : 'border-primary'; ?> border-4 h-100">
                <div class="card-header pt-3 pb-2">
                    <h6 class="fw-bold mb-0 <?= $edit_data ? 'text-warning text-dark' : 'text-gov-primary'; ?>">
                        <i class="fas <?= $edit_data ? 'fa-edit' : 'fa-box-open'; ?> me-2"></i>
                        <?= $edit_data ? 'Mode Edit Spesifikasi Barang' : 'Informasi Master Barang'; ?>
                    </h6>
                </div>
                <div class="card-body">
                    <?php if ($edit_data): ?>
                    <form method="POST" action="manage_barang.php">
                        <?= csrf_field(); ?>
                        <input type="hidden" name="id_barang" value="<?= $edit_data['id']; ?>">

                        <div class="alert alert-warning py-2 small fw-bold">
                            <i class="fas fa-info-circle me-1"></i> Perubahan nama disini akan mempengaruhi laporan historis.
                        </div>

                        <div class="mb-3 mt-3">
                            <label class="form-label small fw-bold text-muted">Kategori <span class="text-danger">*</span></label>
                            <select name="kategori_id" class="form-select border-warning" required>
                                <?php
                                $kat = $pdo->query("SELECT * FROM kategori ORDER BY nama_kategori");
                                while ($k = $kat->fetch()) {
                                    $selected = ($edit_data['kategori_id'] == $k['id']) ? 'selected' : '';
                                    echo "<option value='{$k['id']}' $selected>" . htmlspecialchars($k['nama_kategori']) . "</option>";
                                }
                                ?>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold text-muted">Nama Spesifikasi Barang <span class="text-danger">*</span></label>
                            <input type="text" name="nama_barang" class="form-control border-warning fw-bold" required 
                                   value="<?= htmlspecialchars($edit_data['nama_barang']); ?>">
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Merk</label>
                                <input type="text" name="merk" class="form-control form-control-sm" 
                                       value="<?= htmlspecialchars($edit_data['merk']); ?>">
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Tipe/Ukuran</label>
                                <input type="text" name="tipe" class="form-control form-control-sm" 
                                       value="<?= htmlspecialchars($edit_data['tipe']); ?>">
                            </div>
                        </div>

                        <div class="mb-4">
                            <label class="form-label small fw-bold text-muted">Satuan <span class="text-danger">*</span></label>
                            <input type="text" name="satuan" class="form-control form-control-sm" required 
                                   value="<?= htmlspecialchars($edit_data['satuan']); ?>">
                        </div>

                        <div class="d-grid gap-2 border-top pt-3">
                            <button type="submit" class="btn btn-warning fw-bold text-dark shadow-sm">
                                <i class="fas fa-save me-2"></i> Update Spesifikasi
                            </button>
                            <a href="manage_barang.php" class="btn btn-light border text-secondary btn-sm fw-bold">Batal Edit</a>
                        </div>
                    </form>
                    <?php else: ?>
                        <div class="text-center py-5 mt-4 text-muted">
                            <i class="fas fa-hand-pointer fa-4x mb-3 d-block" style="color: #cbd5e1;"></i>
                            <h6 class="fw-bold">Pilih Barang dari Tabel</h6>
                            <p class="small">Klik tombol <b>Edit</b> pada tabel di samping kanan untuk memperbaiki salah ketik nama atau spesifikasi barang.</p>
                            <p class="small text-info mt-3"><i class="fas fa-info-circle"></i> Untuk menambah barang baru, gunakan menu <b>Transaksi -> Penerimaan Barang Masuk</b>.</p>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <div class="col-md-8">
            <div class="card shadow-sm border-0 h-100" style="border-top: 4px solid var(--gov-primary);">
                <div class="card-header bg-white py-3">
                    <h6 class="mb-0 fw-bold text-gov-primary"><i class="fas fa-database me-2"></i> Database Master Barang UPTD</h6>
                </div>
                <div class="card-body p-4">
                    <div class="table-responsive">
                        <table class="table table-hover table-bordered align-middle mb-0 tabel-data" style="width:100%">
                            <thead class="text-center">
                                <tr>
                                    <th width="5%">No</th>
                                    <th width="35%">Nama Barang & Kategori</th>
                                    <th width="20%">Merk/Tipe</th>
                                    <th width="10%">Satuan</th>
                                    <th width="15%">Aksi</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white">
                                <?php
                                $no = 1;
                                $sql_list = "SELECT b.*, k.nama_kategori 
                                             FROM barang b 
                                             LEFT JOIN kategori k ON b.kategori_id = k.id 
                                             ORDER BY b.nama_barang ASC";
                                $stmt_list = $pdo->query($sql_list);
                                
                                while ($row = $stmt_list->fetch(PDO::FETCH_ASSOC)) {
                                    echo "<tr>
                                            <td class='text-center'>{$no}</td>
                                            <td>
                                                <div class='fw-bold text-dark'>" . htmlspecialchars($row['nama_barang']) . "</div>
                                                <small class='badge bg-secondary'>" . htmlspecialchars($row['nama_kategori'] ?? '-') . "</small>
                                            </td>
                                            <td><small class='text-muted'>" . htmlspecialchars($row['merk']) . " / " . htmlspecialchars($row['tipe']) . "</small></td>
                                            <td class='text-center fw-bold'>" . htmlspecialchars($row['satuan']) . "</td>
                                            <td class='text-center'>
                                                <div class='d-flex flex-column gap-1'>
                                                    <a href='manage_barang.php?edit={$row['id']}' class='btn btn-sm btn-outline-warning text-dark fw-bold' title='Edit Spesifikasi'>
                                                        <i class='fas fa-edit'></i> Edit
                                                    </a>
                                                    <form method='POST' class='d-inline' onsubmit=\"return confirm('Yakin ingin menghapus master barang ini?');\">" . csrf_field() . "<input type='hidden' name='hapus' value='{$row['id']}'><button type='submit' class='btn btn-sm btn-outline-danger fw-bold'><i class='fas fa-trash'></i> Hapus</button></form>
                                                </div>
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
    </div>
</div>

<?php 
// Panggil Footer
require 'footer.php'; 
?>
