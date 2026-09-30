<?php
require 'cek_login.php';
require 'koneksi.php';
require_once 'functions.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') { requireCsrf(); }
requireRole('admin');

// PROTEKSI: Hanya Admin yang boleh mengakses halaman ini
if ($_SESSION['role'] !== 'admin') {
    header("Location: index.php");
    exit;
}

$pesan = "";
$status = "";

// Ambil daftar pegawai yang belum punya akun ATAU yang sedang diedit saat ini
$pegawai_list = [];
$stmt_pegawai = $pdo->query("SELECT id, nama_pegawai, nip, jabatan FROM pegawai ORDER BY nama_pegawai ASC");
while ($row = $stmt_pegawai->fetch(PDO::FETCH_ASSOC)) {
    $pegawai_list[] = $row;
}

// --- 1. PROSES HAPUS USER ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['hapus'])) {
    $id_hapus = (int)$_POST['hapus'];
    
    // Proteksi: Tidak boleh menghapus akun sendiri
    if ($id_hapus == $_SESSION['user_id']) {
        $pesan = "<b>Akses Ditolak!</b> Anda tidak dapat menghapus akun Anda sendiri saat sedang login.";
        $status = "danger";
    } else {
        try {
            $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$id_hapus]);
            catat_log('hapus', 'users', $id_hapus, 'Akun pengguna dihapus oleh administrator.');
            $pesan = "Akses akun pengguna berhasil dicabut/dihapus.";
            $status = "success";
        } catch (PDOException $e) {
            $pesan = "Gagal menghapus pengguna. Silakan coba lagi.";
            error_log('manage_users delete error: ' . $e->getMessage());
            $status = "danger";
        }
    }
}

// --- 2. PROSES TAMBAH / UPDATE USER ---
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $id_user    = isset($_POST['id_user']) ? (int)$_POST['id_user'] : 0;
    $pegawai_id = (int)$_POST['pegawai_id'];
    $username   = trim($_POST['username']);
    $role       = trim($_POST['role']);
    $is_active  = isset($_POST['is_active']) ? 1 : 0;
    $password_raw = $_POST['password']; 

    // Ambil nama lengkap pegawai berdasarkan ID yang dipilih
    $nama_lengkap = "";
    if ($pegawai_id > 0) {
        $stmt_nama = $pdo->prepare("SELECT nama_pegawai FROM pegawai WHERE id = ?");
        $stmt_nama->execute([$pegawai_id]);
        $nama_lengkap = $stmt_nama->fetchColumn();
    }

    if (!empty($username) && $pegawai_id > 0 && !empty($nama_lengkap)) {
        try {
            if ($id_user > 0) {
                // UPDATE USER
                if (!empty($password_raw)) {
                    $pass_hash = password_hash($password_raw, PASSWORD_DEFAULT);
                    $stmt = $pdo->prepare("UPDATE users SET pegawai_id=?, username=?, nama_lengkap=?, role=?, is_active=?, password=? WHERE id=?");
                    $stmt->execute([$pegawai_id, $username, $nama_lengkap, $role, $is_active, $pass_hash, $id_user]);
                } else {
                    $stmt = $pdo->prepare("UPDATE users SET pegawai_id=?, username=?, nama_lengkap=?, role=?, is_active=? WHERE id=?");
                    $stmt->execute([$pegawai_id, $username, $nama_lengkap, $role, $is_active, $id_user]);
                }
                catat_log('edit', 'users', $id_user, 'Profil/hak akses pengguna diperbarui.');
                $pesan = "Profil dan hak akses pengguna berhasil diperbarui!";
                $status = "success";
            } else {
                // TAMBAH USER BARU
                if (empty($password_raw)) {
                    $pesan = "Kata sandi wajib diisi untuk pembuatan akun baru!";
                    $status = "warning";
                } else {
                    // Cek apakah username sudah dipakai
                    $cek_uname = $pdo->prepare("SELECT id FROM users WHERE username = ?");
                    $cek_uname->execute([$username]);
                    
                    // Cek apakah pegawai ini sudah punya akun
                    $cek_pegawai = $pdo->prepare("SELECT id FROM users WHERE pegawai_id = ?");
                    $cek_pegawai->execute([$pegawai_id]);

                    if ($cek_uname->rowCount() > 0) {
                        $pesan = "Username <b>{$username}</b> sudah digunakan. Silakan pilih username lain.";
                        $status = "warning";
                    } elseif ($cek_pegawai->rowCount() > 0) {
                        $pesan = "Pegawai <b>{$nama_lengkap}</b> sudah memiliki akun akses. Silakan gunakan fitur Edit pada tabel di bawah.";
                        $status = "warning";
                    } else {
                        $pass_hash = password_hash($password_raw, PASSWORD_DEFAULT);
                        $stmt = $pdo->prepare("INSERT INTO users (pegawai_id, username, password, nama_lengkap, role, is_active) VALUES (?, ?, ?, ?, ?, ?)");
                        $stmt->execute([$pegawai_id, $username, $pass_hash, $nama_lengkap, $role, $is_active]);
                        $pesan = "Akun sistem untuk <b>{$nama_lengkap}</b> berhasil didaftarkan.";
                        $status = "success";
                    }
                }
            }
        } catch (PDOException $e) {
            $pesan = "Terjadi kesalahan sistem. Silakan coba lagi.";
            error_log('manage_users save error: ' . $e->getMessage());
            $status = "danger";
        }
    } else {
        $pesan = "Pilih Identitas Pegawai dan pastikan Username sudah diisi!";
        $status = "warning";
    }
}

// --- 3. AMBIL DATA UNTUK FORM EDIT ---
$edit_data = null;
if (isset($_GET['edit'])) {
    $id_edit = (int)$_GET['edit'];
    $stmt_edit = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt_edit->execute([$id_edit]);
    $edit_data = $stmt_edit->fetch(PDO::FETCH_ASSOC);
}

require 'header.php';
?>

<div class="page-head"><div><h1>Manajemen Pengguna</h1><p>Kelola akun, peran, dan status akses pengguna SIPB.</p></div><div class="head-actions"><a href="index.php" class="btn btn-soft-primary"><i class="fa-solid fa-arrow-left me-2"></i>Dashboard</a></div></div>

<div class="container-fluid px-4 mt-4 mb-5">
        
        <?php if ($pesan != ""): ?>
            <div class="alert alert-<?= $status; ?> alert-dismissible fade show shadow-sm" role="alert">
                <i class="fas <?= $status == 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'; ?> me-2 mt-1 float-start fs-5"></i>
                <div class="ms-4"><?= $pesan; ?></div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>

        <div class="row">
            <div class="col-md-4 mb-4">
                <div class="card <?= $edit_data ? 'border-warning' : 'border-primary'; ?> border-4 h-100">
                    <div class="card-header bg-white pt-3 pb-2">
                        <h6 class="fw-bold mb-0 <?= $edit_data ? 'text-warning text-dark' : 'text-gov-primary'; ?>">
                            <i class="fas <?= $edit_data ? 'fa-user-edit' : 'fa-user-plus'; ?> me-2"></i>
                            <?= $edit_data ? 'Edit Akses & Identitas Pengguna' : 'Buat Akun Akses Sistem'; ?>
                        </h6>
                    </div>
                    <div class="card-body">
                        <form method="POST" action="manage_users.php">
                            <?= csrf_field(); ?>
                            
                            <?php if ($edit_data): ?>
                                <input type="hidden" name="id_user" value="<?= $edit_data['id']; ?>">
                                <div class="alert alert-warning py-2 small fw-bold">
                                    <i class="fas fa-info-circle me-1"></i> Kosongkan kolom Kata Sandi jika tidak ingin mengubah sandi login pengguna ini.
                                </div>
                            <?php endif; ?>

                            <div class="mb-3 mt-2">
                                <label class="form-label small fw-bold text-muted">Pilih Identitas Pegawai <span class="text-danger">*</span></label>
                                <select name="pegawai_id" id="pegawai_id" class="form-select border-primary" required onchange="tampilkanInfoPegawai()" style="background-color: #f8fbff;">
                                    <option value="">-- Daftar Master Pegawai UPTD --</option>
                                    <?php foreach($pegawai_list as $p): ?>
                                        <?php 
                                            // Tentukan apakah option ini dipilih saat mode edit
                                            $selected = ($edit_data && $edit_data['pegawai_id'] == $p['id']) ? 'selected' : ''; 
                                        ?>
                                        <option value="<?= $p['id'] ?>" data-nip="<?= htmlspecialchars($p['nip']) ?>" data-jabatan="<?= htmlspecialchars($p['jabatan']) ?>" <?= $selected ?>>
                                            <?= htmlspecialchars($p['nama_pegawai']) ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <div class="form-text small text-info"><i class="fas fa-lightbulb"></i> Nama belum ada? Tambahkan dulu di menu <a href="manage_pegawai.php" class="fw-bold text-info">Master Pegawai</a>.</div>
                            </div>
                            
                            <div class="row mb-3" id="info_pegawai_box" style="display: <?= $edit_data ? 'flex' : 'none'; ?>;">
                                <div class="col-6">
                                    <label class="form-label small fw-bold text-muted">NIP</label>
                                    <input type="text" id="info_nip" class="form-control form-control-sm bg-light text-muted" readonly>
                                </div>
                                <div class="col-6">
                                    <label class="form-label small fw-bold text-muted">Jabatan</label>
                                    <input type="text" id="info_jabatan" class="form-control form-control-sm bg-light text-muted" readonly>
                                </div>
                            </div>

                            <hr>

                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">Username Login <span class="text-danger">*</span></label>
                                <div class="input-group">
                                    <span class="input-group-text bg-light"><i class="fas fa-at"></i></span>
                                    <input type="text" name="username" class="form-control" required 
                                           placeholder="Contoh: admin_gudang"
                                           value="<?= $edit_data ? htmlspecialchars($edit_data['username']) : ''; ?>">
                                </div>
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label small fw-bold text-muted">Kata Sandi (Password) <?= $edit_data ? '' : '<span class="text-danger">*</span>'; ?></label>
                                <div class="input-group">
                                    <span class="input-group-text bg-light"><i class="fas fa-key"></i></span>
                                    <input type="password" name="password" class="form-control" 
                                           placeholder="<?= $edit_data ? 'Ketik password baru untuk mereset' : 'Buat password login kuat'; ?>"
                                           <?= $edit_data ? '' : 'required'; ?>>
                                </div>
                            </div>

                            <div class="row mb-4">
                                <div class="col-6">
                                    <label class="form-label small fw-bold text-muted">Level Hak Akses</label>
                                    <select name="role" class="form-select border-primary" required>
                                        <option value="petugas" <?= ($edit_data && $edit_data['role'] == 'petugas') ? 'selected' : ''; ?>>Petugas Gudang</option>
                                        <option value="admin" <?= ($edit_data && $edit_data['role'] == 'admin') ? 'selected' : ''; ?>>Administrator</option>
                                    </select>
                                </div>
                                <div class="col-6 pt-4 text-center">
                                    <div class="form-check form-switch d-inline-block">
                                        <input class="form-check-input" type="checkbox" id="is_active" name="is_active" <?= ($edit_data && $edit_data['is_active'] == 0) ? '' : 'checked'; ?> style="transform: scale(1.3);">
                                        <label class="form-check-label ms-2 fw-bold" for="is_active">Akun Aktif</label>
                                    </div>
                                </div>
                            </div>

                            <div class="d-grid gap-2 border-top pt-3">
                                <?php if ($edit_data): ?>
                                    <button type="submit" class="btn btn-warning fw-bold text-dark shadow-sm">
                                        <i class="fas fa-save me-2"></i> Simpan Perubahan Akses
                                    </button>
                                    <a href="manage_users.php" class="btn btn-light border text-secondary btn-sm fw-bold">Batal Edit</a>
                                <?php else: ?>
                                    <button type="submit" class="btn btn-primary fw-bold shadow-sm" style="background-color: var(--gov-primary);">
                                        <i class="fas fa-user-check me-2"></i> Berikan Akses Sistem
                                    </button>
                                <?php endif; ?>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <div class="col-md-8">
                <div class="card h-100" style="border-top: 4px solid var(--gov-primary);">
                    <div class="card-header bg-white py-3">
                        <h6 class="mb-0 fw-bold text-gov-primary"><i class="fas fa-users-cog me-2"></i> Daftar Otoritas Pengguna Sistem SIPB</h6>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive" style="max-height: 600px; overflow-y: auto;">
                            <table class="table table-hover table-bordered align-middle mb-0">
                                <thead class="text-center sticky-top" style="background-color: var(--gov-primary); color: white; z-index: 1;">
                                    <tr>
                                        <th width="5%">No</th>
                                        <th width="30%">Identitas Pegawai</th>
                                        <th width="15%">Username</th>
                                        <th width="15%">Hak Akses</th>
                                        <th width="15%">Status</th>
                                        <th width="20%">Aksi Sistem</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white">
                                    <?php
                                    $no = 1;
                                    // Query JOIN untuk mengambil data akun sekaligus NIP dan Jabatan dari master pegawai
                                    $sql = "SELECT u.*, p.nip, p.jabatan 
                                            FROM users u 
                                            LEFT JOIN pegawai p ON u.pegawai_id = p.id 
                                            ORDER BY u.role ASC, u.nama_lengkap ASC";
                                    $stmt_list = $pdo->query($sql);
                                    
                                    if ($stmt_list->rowCount() > 0) {
                                        while ($row = $stmt_list->fetch(PDO::FETCH_ASSOC)) {
                                            $role_badge = $row['role'] == 'admin' ? "<span class='badge bg-danger'>Administrator</span>" : "<span class='badge bg-primary'>Petugas Gudang</span>";
                                            $status_badge = $row['is_active'] == 1 ? "<span class='badge bg-success'><i class='fas fa-check-circle'></i> Aktif</span>" : "<span class='badge bg-secondary'><i class='fas fa-ban'></i> Nonaktif</span>";
                                            
                                            // Format Identitas
                                            $tampil_nip = !empty($row['nip']) ? htmlspecialchars($row['nip']) : '-';
                                            $tampil_jabatan = !empty($row['jabatan']) ? htmlspecialchars($row['jabatan']) : 'Belum Terhubung Database Pegawai';
                                            
                                            // Highlight baris jika akunnya adalah akun yang sedang login
                                            $is_me = ($row['id'] == $_SESSION['user_id']) ? "class='table-warning'" : "";

                                            echo "<tr {$is_me}>
                                                    <td class='text-center'>{$no}</td>
                                                    <td>
                                                        <div class='fw-bold text-dark'><i class='fas fa-user-shield text-secondary me-1'></i> " . htmlspecialchars($row['nama_lengkap']) . "</div>
                                                        <div class='small text-muted'><i class='fas fa-id-badge fa-fw'></i> NIP: {$tampil_nip}</div>
                                                        <div class='small text-muted'><i class='fas fa-briefcase fa-fw'></i> {$tampil_jabatan}</div>
                                                    </td>
                                                    <td class='text-center fw-bold text-primary'>" . htmlspecialchars($row['username']) . "</td>
                                                    <td class='text-center'>{$role_badge}</td>
                                                    <td class='text-center'>{$status_badge}</td>
                                                    <td class='text-center'>
                                                        <a href='manage_users.php?edit={$row['id']}' class='btn btn-sm btn-outline-warning text-dark fw-bold mb-1 w-100' title='Edit Hak Akses'>
                                                            <i class='fas fa-edit'></i> Edit Konfigurasi
                                                        </a>
                                                        " . (!$is_me ? "
                                                        <form method='POST' class='d-inline d-block' onsubmit=\"return confirm('Yakin ingin mencabut dan menghapus akun ini secara permanen?');\">" . csrf_field() . "<input type='hidden' name='hapus' value='{$row['id']}'><button type='submit' class='btn btn-sm btn-outline-danger fw-bold w-100'><i class='fas fa-user-times'></i> Hapus Akun</button></form>" : "<div class='badge bg-warning text-dark w-100 py-2 border border-warning shadow-sm'><i class='fas fa-lock me-1'></i> Sedang Login</div>") . "
                                                    </td>
                                                  </tr>";
                                            $no++;
                                        }
                                    } else {
                                        echo "<tr><td colspan='6' class='text-center py-5 text-muted'>Data pengguna sistem tidak ditemukan.</td></tr>";
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

<script>
    // Fungsi untuk menampilkan NIP & Jabatan di bawah kotak dropdown secara real-time
    function tampilkanInfoPegawai() {
        var select = document.getElementById('pegawai_id');
        var option = select.options[select.selectedIndex];
        var infoBox = document.getElementById('info_pegawai_box');
        var nipInput = document.getElementById('info_nip');
        var jabatanInput = document.getElementById('info_jabatan');

        if (select.value === "") {
            infoBox.style.display = 'none';
            nipInput.value = '';
            jabatanInput.value = '';
        } else {
            infoBox.style.display = 'flex';
            var nip = option.getAttribute('data-nip');
            var jabatan = option.getAttribute('data-jabatan');
            
            nipInput.value = nip ? nip : 'Tidak ada NIP';
            jabatanInput.value = jabatan ? jabatan : 'Tidak ada jabatan';
        }
    }

    // Jalankan fungsi saat halaman dimuat (berguna untuk mode Edit)
    window.onload = function() {
        tampilkanInfoPegawai();
    };
</script>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<?php require 'footer.php'; ?>
