<?php
require 'cek_login.php';
require 'koneksi.php';
require_once 'functions.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') { requireCsrf(); }
requireRole('admin');

$pesan = "";
$status = "";

// ==========================================
// 1. LOGIKA IMPORT CSV (4 KOLOM)
// ==========================================
if (isset($_POST['proses_import']) && isset($_FILES['file_csv'])) {
    $file = $_FILES['file_csv']['tmp_name'];
    if (!empty($file)) {
        $handle = fopen($file, "r");
        $first_line = fgets($handle);
        $delimiter = (strpos($first_line, ';') !== false) ? ';' : ',';
        rewind($handle);
        
        $sukses = 0; $diperbarui = 0;
        try {
            $pdo->beginTransaction();
            fgetcsv($handle, 10000, $delimiter); // Lewati Header
            while (($data = fgetcsv($handle, 10000, $delimiter)) !== FALSE) {
                $nama    = isset($data[0]) ? trim($data[0]) : '';
                $nip     = isset($data[1]) ? trim($data[1]) : '-';
                $st_peg  = isset($data[2]) ? trim($data[2]) : 'Non-ASN';
                $jabatan = isset($data[3]) ? trim($data[3]) : '';
                
                if (!empty($nama)) {
                    $stmt_cek = $pdo->prepare("SELECT id FROM pegawai WHERE nama_pegawai = ?");
                    $stmt_cek->execute([$nama]);
                    if ($stmt_cek->rowCount() > 0) {
                        $pdo->prepare("UPDATE pegawai SET nip = ?, status_pegawai = ?, jabatan = ? WHERE nama_pegawai = ?")
                            ->execute([$nip, $st_peg, $jabatan, $nama]);
                        $diperbarui++;
                    } else {
                        $pdo->prepare("INSERT INTO pegawai (nama_pegawai, nip, status_pegawai, jabatan) VALUES (?, ?, ?, ?)")
                            ->execute([$nama, $nip, $st_peg, $jabatan]);
                        $sukses++;
                    }
                }
            }
            $pdo->commit();
            $pesan = "Import Berhasil! $sukses Data Baru ditambahkan, $diperbarui Data diperbarui.";
            $status = "success";
        } catch (Exception $e) { $pdo->rollBack(); $pesan = "Proses gagal. Periksa data dan coba lagi.";
            error_log('manage_pegawai error: ' . $e->getMessage()); $status = "danger"; }
        fclose($handle);
    }
}

// ==========================================
// 2. LOGIKA CRUD MANUAL (TAMBAH, EDIT, HAPUS)
// ==========================================
if (isset($_POST['tambah_pegawai'])) {
    try {
        $pdo->prepare("INSERT INTO pegawai (nama_pegawai, nip, status_pegawai, jabatan) VALUES (?, ?, ?, ?)")
            ->execute([trim($_POST['nama_pegawai']), trim($_POST['nip']), $_POST['status_pegawai'], trim($_POST['jabatan'])]);
        $pesan = "Pegawai berhasil ditambahkan!"; $status = "success";
    } catch (Exception $e) { $pesan = "Proses gagal. Periksa data dan coba lagi.";
            error_log('manage_pegawai error: ' . $e->getMessage()); $status = "danger"; }
}

if (isset($_POST['edit_pegawai'])) {
    try {
        $pdo->prepare("UPDATE pegawai SET nama_pegawai = ?, nip = ?, status_pegawai = ?, jabatan = ? WHERE id = ?")
            ->execute([trim($_POST['nama_pegawai']), trim($_POST['nip']), $_POST['status_pegawai'], trim($_POST['jabatan']), $_POST['id_pegawai']]);
        $pesan = "Perubahan data berhasil disimpan!"; $status = "success";
    } catch (Exception $e) { $pesan = "Proses gagal. Periksa data dan coba lagi.";
            error_log('manage_pegawai error: ' . $e->getMessage()); $status = "danger"; }
}

if (isset($_POST['hapus_pegawai'])) {
    $pdo->prepare("DELETE FROM pegawai WHERE id = ?")->execute([$_POST['id_hapus']]);
    $pesan = "Data pegawai telah dihapus."; $status = "success";
}

require 'header.php';
?>

<div class="container-fluid px-4 mt-4 mb-5">
    <div class="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 class="h3 mb-0 text-gray-800 fw-bold" style="color: var(--gov-primary);">Master Data Pegawai</h1>
    </div>

    <?php if ($pesan != ""): ?>
        <div class="alert alert-<?= $status; ?> alert-dismissible fade show shadow-sm" role="alert">
            <i class="fas fa-info-circle me-2"></i> <?= $pesan; ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    <?php endif; ?>

    <div class="row">
        <div class="col-lg-4 mb-4">
            <div class="card shadow-sm border-0 border-top border-4 border-success h-100">
                <div class="card-header bg-white fw-bold"><i class="fas fa-file-csv me-2 text-success"></i>Import Data Massal</div>
                <div class="card-body">
                    <p class="small text-muted">Gunakan file CSV 4 kolom (Nama, NIP, Status, Jabatan) untuk memperbarui database sekaligus.</p>
                    <form action="" method="POST" enctype="multipart/form-data">
                        <?= csrf_field(); ?>
                        <div class="mb-3">
                            <input type="file" name="file_csv" class="form-control" accept=".csv" required>
                        </div>
                        <button type="submit" name="proses_import" class="btn btn-success w-100 fw-bold shadow-sm">
                            <i class="fas fa-upload me-1"></i> Mulai Import
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <div class="col-lg-8 mb-4">
            <div class="card shadow-sm border-0 border-top border-4 border-primary h-100">
                <div class="card-header bg-white d-flex justify-content-between align-items-center py-3">
                    <h6 class="fw-bold mb-0 text-gov-primary"><i class="fas fa-users me-2"></i>Kelola Daftar Pegawai</h6>
                    <button class="btn btn-sm btn-primary fw-bold" data-bs-toggle="modal" data-bs-target="#modalTambah">
                        <i class="fas fa-plus me-1"></i> Tambah Pegawai
                    </button>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle tabel-data" style="width:100%">
                            <thead class="bg-light small text-uppercase fw-bold">
                                <tr>
                                    <th>Nama Pegawai</th>
                                    <th>Status / NIP</th>
                                    <th>Jabatan</th>
                                    <th class="text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php
                                $rows = $pdo->query("SELECT * FROM pegawai ORDER BY nama_pegawai ASC")->fetchAll();
                                foreach ($rows as $r):
                                    $st = $r['status_pegawai'] ?: 'Non-ASN';
                                    $color = ($st == 'PNS') ? 'bg-primary' : (($st == 'PPPK') ? 'bg-info text-dark' : 'bg-secondary');
                                ?>
                                <tr>
                                    <td class="fw-bold"><?= htmlspecialchars($r['nama_pegawai']); ?></td>
                                    <td>
                                        <span class="badge <?= $color; ?> mb-1"><?= $st; ?></span><br>
                                        <small class="text-muted"><?= htmlspecialchars($r['nip'] ?: '-'); ?></small>
                                    </td>
                                    <td class="small"><?= htmlspecialchars($r['jabatan']); ?></td>
                                    <td class="text-center">
                                        <button class="btn btn-sm btn-warning btn-edit" 
                                            data-bs-toggle="modal" data-bs-target="#modalEdit"
                                            data-id="<?= $r['id']; ?>"
                                            data-nama="<?= htmlspecialchars($r['nama_pegawai']); ?>"
                                            data-nip="<?= htmlspecialchars($r['nip']); ?>"
                                            data-status="<?= $st; ?>"
                                            data-jabatan="<?= htmlspecialchars($r['jabatan']); ?>">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <form action="" method="POST" class="d-inline" onsubmit="return confirm('Hapus pegawai ini?')">
                                            <?= csrf_field(); ?>
                                            <input type="hidden" name="id_hapus" value="<?= $r['id']; ?>">
                                            <button type="submit" name="hapus_pegawai" class="btn btn-sm btn-danger"><i class="fas fa-trash"></i></button>
                                        </form>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="modal fade" id="modalTambah" tabindex="-1">
    <div class="modal-dialog">
        <form action="" method="POST" class="modal-content">
            <?= csrf_field(); ?>
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold">Tambah Pegawai</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <div class="mb-3">
                    <label class="form-label small fw-bold">Nama Lengkap</label>
                    <input type="text" name="nama_pegawai" class="form-control" required>
                </div>
                <div class="row">
                    <div class="col-6 mb-3">
                        <label class="form-label small fw-bold">Status</label>
                        <select name="status_pegawai" class="form-select">
                            <option value="PNS">PNS</option>
                            <option value="PPPK">PPPK</option>
                            <option value="Non-ASN">Non-ASN</option>
                        </select>
                    </div>
                    <div class="col-6 mb-3">
                        <label class="form-label small fw-bold">NIP / NIPPPK</label>
                        <input type="text" name="nip" class="form-control">
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label small fw-bold">Jabatan</label>
                    <input type="text" name="jabatan" class="form-control">
                </div>
            </div>
            <div class="modal-footer"><button type="submit" name="tambah_pegawai" class="btn btn-primary fw-bold">Simpan</button></div>
        </form>
    </div>
</div>

<div class="modal fade" id="modalEdit" tabindex="-1">
    <div class="modal-dialog">
        <form action="" method="POST" class="modal-content">
            <?= csrf_field(); ?>
            <div class="modal-header bg-warning">
                <h5 class="modal-title fw-bold">Edit Pegawai</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <input type="hidden" name="id_pegawai" id="edit_id">
                <div class="mb-3"><label class="form-label small fw-bold">Nama Lengkap</label><input type="text" name="nama_pegawai" id="edit_nama" class="form-control" required></div>
                <div class="row">
                    <div class="col-6 mb-3">
                        <label class="form-label small fw-bold">Status</label>
                        <select name="status_pegawai" id="edit_status" class="form-select">
                            <option value="PNS">PNS</option>
                            <option value="PPPK">PPPK</option>
                            <option value="Non-ASN">Non-ASN</option>
                        </select>
                    </div>
                    <div class="col-6 mb-3"><label class="form-label small fw-bold">NIP / NIPPPK</label><input type="text" name="nip" id="edit_nip" class="form-control"></div>
                </div>
                <div class="mb-3"><label class="form-label small fw-bold">Jabatan</label><input type="text" name="jabatan" id="edit_jabatan" class="form-control"></div>
            </div>
            <div class="modal-footer"><button type="submit" name="edit_pegawai" class="btn btn-warning fw-bold text-dark">Simpan Perubahan</button></div>
        </form>
    </div>
</div>

<script>
document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.onclick = function() {
        document.getElementById('edit_id').value = this.dataset.id;
        document.getElementById('edit_nama').value = this.dataset.nama;
        document.getElementById('edit_nip').value = this.dataset.nip;
        document.getElementById('edit_status').value = this.dataset.status;
        document.getElementById('edit_jabatan').value = this.dataset.jabatan;
    };
});
</script>

<?php require 'footer.php'; ?>
