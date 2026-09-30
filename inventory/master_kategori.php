<?php
require 'cek_login.php';
require 'koneksi.php';
require_once 'functions.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') { requireCsrf(); }
requireRole('admin');

$pesan = "";
$status = "";

// --- 1. PROSES HAPUS KATEGORI ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['hapus'])) {
    $id_hapus = (int)$_POST['hapus'];
    
    // Proteksi: Cek apakah kategori sedang dipakai oleh tabel barang
    $cek_pakai = $pdo->prepare("SELECT COUNT(*) FROM barang WHERE kategori_id = ?");
    $cek_pakai->execute([$id_hapus]);
    $ada_barang = $cek_pakai->fetchColumn();

    if ($ada_barang > 0) {
        $pesan = "<b>Penghapusan Ditolak!</b> Kategori ini sedang digunakan oleh {$ada_barang} master barang. Silakan pindahkan atau hapus barang tersebut terlebih dahulu.";
        $status = "danger";
    } else {
        try {
            $pdo->prepare("DELETE FROM kategori WHERE id = ?")->execute([$id_hapus]);
            catat_log('hapus', 'kategori', $id_hapus, 'Kategori dihapus.');
            $pesan = "Kategori berhasil dihapus permanen.";
            $status = "success";
        } catch (PDOException $e) {
            $pesan = "Gagal menghapus kategori. Silakan coba lagi.";
            error_log('master_kategori delete error: ' . $e->getMessage());
            $status = "danger";
        }
    }
}

// --- 2. PROSES TAMBAH / UPDATE KATEGORI ---
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $nama_kategori = trim($_POST['nama_kategori']);
    $id_kategori = isset($_POST['id_kategori']) ? (int)$_POST['id_kategori'] : 0;

    if (!empty($nama_kategori)) {
        try {
            if ($id_kategori > 0) {
                // Mode Update
                $stmt = $pdo->prepare("UPDATE kategori SET nama_kategori = ? WHERE id = ?");
                $stmt->execute([$nama_kategori, $id_kategori]);
                $pesan = "Nama kategori berhasil diperbarui!";
                $status = "success";
            } else {
                // Mode Tambah
                $stmt = $pdo->prepare("INSERT INTO kategori (nama_kategori) VALUES (?)");
                $stmt->execute([$nama_kategori]);
                $pesan = "Kategori baru berhasil ditambahkan!";
                $status = "success";
            }
        } catch (PDOException $e) {
            $pesan = "Terjadi kesalahan sistem. Silakan coba lagi.";
            error_log('master_kategori save error: ' . $e->getMessage());
            $status = "danger";
        }
    } else {
        $pesan = "Nama kategori tidak boleh kosong!";
        $status = "warning";
    }
}

// --- 3. AMBIL DATA UNTUK FORM EDIT ---
$edit_data = null;
if (isset($_GET['edit'])) {
    $id_edit = (int)$_GET['edit'];
    $stmt_edit = $pdo->prepare("SELECT * FROM kategori WHERE id = ?");
    $stmt_edit->execute([$id_edit]);
    $edit_data = $stmt_edit->fetch(PDO::FETCH_ASSOC);
}

// Panggil Header
require 'header.php';
?>

<div class="container-fluid px-4 mt-4 mb-5">
    
    <div class="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 class="h3 mb-0 text-gray-800 fw-bold" style="color: var(--gov-primary);">Data Kategori</h1>
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
                <div class="card-header bg-white pt-3 pb-2">
                    <h6 class="fw-bold mb-0 <?= $edit_data ? 'text-warning text-dark' : 'text-gov-primary'; ?>">
                        <i class="fas <?= $edit_data ? 'fa-edit' : 'fa-tags'; ?> me-2"></i>
                        <?= $edit_data ? 'Edit Nama Kategori' : 'Tambah Kategori Baru'; ?>
                    </h6>
                </div>
                <div class="card-body">
                    <form method="POST" action="master_kategori.php">
                        <?= csrf_field(); ?>
                        
                        <?php if ($edit_data): ?>
                            <input type="hidden" name="id_kategori" value="<?= $edit_data['id']; ?>">
                            <div class="alert alert-warning py-2 small fw-bold">
                                <i class="fas fa-info-circle me-1"></i> Mengedit nama kategori akan mengubah tampilan di seluruh data barang terkait.
                            </div>
                        <?php endif; ?>

                        <div class="mb-4 mt-2">
                            <label class="form-label small fw-bold text-muted">Nama Kategori Pengadaan <span class="text-danger">*</span></label>
                            <input type="text" name="nama_kategori" class="form-control <?= $edit_data ? 'border-warning fw-bold' : ''; ?>" required 
                                   placeholder="Cth: Alat Tulis Kantor (ATK)"
                                   value="<?= $edit_data ? htmlspecialchars($edit_data['nama_kategori']) : ''; ?>">
                            <div class="form-text small text-info mt-2">
                                <i class="fas fa-lightbulb"></i> <b>Tips Kuasi:</b> Jika kategori ini memuat barang bernomor seri seperti SKPD atau Karcis, pastikan ada kata <b>"Kuasi"</b> di dalam penamaannya (Contoh: "Dokumen Kuasi").
                            </div>
                        </div>

                        <div class="d-grid gap-2 border-top pt-3">
                            <?php if ($edit_data): ?>
                                <button type="submit" class="btn btn-warning fw-bold text-dark shadow-sm">
                                    <i class="fas fa-save me-2"></i> Update Kategori
                                </button>
                                <a href="master_kategori.php" class="btn btn-light border text-secondary btn-sm fw-bold">Batal Edit</a>
                            <?php else: ?>
                                <button type="submit" class="btn btn-primary fw-bold shadow-sm" style="background-color: var(--gov-primary);">
                                    <i class="fas fa-plus-circle me-2"></i> Simpan Kategori Baru
                                </button>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <div class="col-md-8">
            <div class="card shadow-sm border-0 h-100" style="border-top: 4px solid var(--gov-primary);">
                <div class="card-header bg-white py-3">
                    <h6 class="mb-0 fw-bold text-gov-primary"><i class="fas fa-list me-2"></i> Daftar Kategori Barang UPTD</h6>
                </div>
                <div class="card-body p-4">
                    <div class="table-responsive">
                        <table class="table table-hover table-bordered align-middle mb-0 tabel-data" style="width:100%">
                            <thead class="text-center">
                                <tr>
                                    <th width="10%">No</th>
                                    <th width="60%">Nama Kategori</th>
                                    <th width="30%">Aksi Sistem</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white">
                                <?php
                                $no = 1;
                                $stmt_list = $pdo->query("SELECT * FROM kategori ORDER BY nama_kategori ASC");
                                
                                while ($row = $stmt_list->fetch(PDO::FETCH_ASSOC)) {
                                    $is_kuasi = (stripos($row['nama_kategori'], 'kuasi') !== false);
                                    $badge_kuasi = $is_kuasi ? " <span class='badge bg-warning text-dark ms-2'><i class='fas fa-barcode'></i> Terdeteksi Kuasi</span>" : "";
                                    
                                    echo "<tr>
                                            <td class='text-center'>{$no}</td>
                                            <td class='fw-bold text-dark fs-6'>" . htmlspecialchars($row['nama_kategori']) . $badge_kuasi . "</td>
                                            <td class='text-center'>
                                                <a href='master_kategori.php?edit={$row['id']}' class='btn btn-sm btn-outline-warning text-dark fw-bold' title='Edit Kategori'>
                                                    <i class='fas fa-edit'></i> Edit
                                                </a>
                                                <form method='POST' class='d-inline' onsubmit=\"return confirm('Yakin ingin menghapus kategori ini?');\">" . csrf_field() . "<input type='hidden' name='hapus' value='{$row['id']}'><button type='submit' class='btn btn-sm btn-outline-danger fw-bold'><i class='fas fa-trash'></i> Hapus</button></form>
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
