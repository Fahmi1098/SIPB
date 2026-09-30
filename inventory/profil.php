<?php
require 'cek_login.php';
require 'koneksi.php';
require_once 'functions.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') { requireCsrf(); }

$pesan = "";
$status = "";
$user_id = $_SESSION['user_id'];

// Ambil data user terkini
$stmt_user = $pdo->prepare("SELECT * FROM users WHERE id = ?");
$stmt_user->execute([$user_id]);
$current_user = $stmt_user->fetch(PDO::FETCH_ASSOC);

// --- PROSES UPDATE PROFIL (Biodata & Foto) ---
if (isset($_POST['update_profil'])) {
    $nama_lengkap  = trim($_POST['nama_lengkap']);
    $username      = trim($_POST['username']);
    $nip           = trim($_POST['nip']);
    $jabatan       = trim($_POST['jabatan']);
    $email         = trim($_POST['email']);
    
    // Tambahan Data Baru
    $no_hp         = trim($_POST['no_hp']);
    $jenis_kelamin = trim($_POST['jenis_kelamin']);
    $tanggal_lahir = empty($_POST['tanggal_lahir']) ? null : $_POST['tanggal_lahir'];
    $alamat        = trim($_POST['alamat']);
    
    $foto_lama     = $current_user['foto_profil'];
    $foto_baru     = $foto_lama;

    if (!empty($nama_lengkap) && !empty($username)) {
        try {
            // Cek apakah username sudah dipakai orang lain
            $cek = $pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
            $cek->execute([$username, $user_id]);
            
            if ($cek->rowCount() > 0) {
                $pesan = "Username <b>{$username}</b> sudah digunakan oleh akun lain.";
                $status = "danger";
            } else {
                // Proses Upload Foto Jika Ada
                if (isset($_FILES['foto_profil']) && $_FILES['foto_profil']['error'] == 0) {
                    $ekstensi_diperbolehkan = array('png', 'jpg', 'jpeg');
                    $nama_file = $_FILES['foto_profil']['name'];
                    $x = explode('.', $nama_file);
                    $ekstensi = strtolower(end($x));
                    $ukuran = $_FILES['foto_profil']['size'];
                    $file_tmp = $_FILES['foto_profil']['tmp_name'];

                    if (in_array($ekstensi, $ekstensi_diperbolehkan) === true) {
                        if ($ukuran < 2048000) { // Maks 2MB
                            $nama_file_baru = "profil_" . $user_id . "_" . time() . "." . $ekstensi;
                            $path_upload = "uploads/profil/" . $nama_file_baru;

                            if (!is_dir('uploads/profil/')) { mkdir('uploads/profil/', 0777, true); }

                            if (move_uploaded_file($file_tmp, $path_upload)) {
                                $foto_baru = $nama_file_baru;
                                if ($foto_lama != 'default.png' && file_exists("uploads/profil/" . $foto_lama)) {
                                    unlink("uploads/profil/" . $foto_lama);
                                }
                            } else {
                                throw new Exception("Gagal memindahkan file foto ke folder uploads.");
                            }
                        } else { throw new Exception("Ukuran foto terlalu besar. Maksimal 2MB."); }
                    } else { throw new Exception("Ekstensi foto tidak diperbolehkan. Hanya JPG/PNG/JPEG."); }
                }

                // Update Database (Termasuk field baru)
                $stmt = $pdo->prepare("UPDATE users SET nama_lengkap = ?, username = ?, nip = ?, jabatan = ?, email = ?, no_hp = ?, jenis_kelamin = ?, tanggal_lahir = ?, alamat = ?, foto_profil = ? WHERE id = ?");
                $stmt->execute([$nama_lengkap, $username, $nip, $jabatan, $email, $no_hp, $jenis_kelamin, $tanggal_lahir, $alamat, $foto_baru, $user_id]);
                
                // Update session
                $_SESSION['nama_lengkap'] = $nama_lengkap;
                $_SESSION['username'] = $username;
                $_SESSION['foto_profil'] = $foto_baru;
                
                $pesan = "Data profil dan biodata berhasil diperbarui secara komprehensif!";
                $status = "success";
                
                // Refresh data
                $stmt_user->execute([$user_id]);
                $current_user = $stmt_user->fetch(PDO::FETCH_ASSOC);
            }
        } catch (Exception $e) {
            $pesan = "Profil gagal diperbarui. Silakan periksa data dan coba lagi.";
            error_log('profil update error: ' . $e->getMessage());
            $status = "danger";
        }
    }
}

// --- PROSES GANTI PASSWORD ---
if (isset($_POST['ganti_password'])) {
    $pass_lama = $_POST['password_lama'];
    $pass_baru = $_POST['password_baru'];
    $pass_konfirmasi = $_POST['konfirmasi_password'];

    try {
        if (password_verify($pass_lama, $current_user['password']) || md5($pass_lama) === $current_user['password']) {
            if ($pass_baru === $pass_konfirmasi) {
                if (strlen($pass_baru) >= 6) {
                    $hash_baru = password_hash($pass_baru, PASSWORD_DEFAULT);
                    $pdo->prepare("UPDATE users SET password = ? WHERE id = ?")->execute([$hash_baru, $user_id]);
                    $pesan = "Password berhasil diganti! Sistem keamanan telah diperbarui.";
                    $status = "success";
                } else {
                    $pesan = "Password baru minimal harus 6 karakter untuk standar keamanan.";
                    $status = "warning";
                }
            } else {
                $pesan = "Konfirmasi password tidak cocok dengan password baru!";
                $status = "warning";
            }
        } else {
            $pesan = "Password Lama yang Anda masukkan <b>Salah</b>!";
            $status = "danger";
        }
    } catch (PDOException $e) {
        $pesan = "Terjadi kesalahan sistem. Silakan coba lagi.";
        error_log('profil password error: ' . $e->getMessage());
        $status = "danger";
    }
}

// Persiapkan Path Foto
$foto_path = "uploads/profil/" . ($current_user['foto_profil'] ?? 'default.png');
if (!file_exists($foto_path) || empty($current_user['foto_profil']) || $current_user['foto_profil'] == 'default.png') {
    $foto_path = "https://ui-avatars.com/api/?name=" . urlencode($current_user['nama_lengkap']) . "&background=003366&color=fff&size=200&bold=true";
}

require 'header.php';
?>

<div class="container-fluid px-4 mt-4 mb-5">
    <div class="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 class="h3 mb-0 text-gray-800 fw-bold" style="color: var(--gov-primary);">Pengaturan Akun & Profil Lengkap</h1>
    </div>

    <?php if ($pesan != ""): ?>
        <div class="alert alert-<?= $status; ?> alert-dismissible fade show shadow-sm" role="alert">
            <i class="fas <?= $status == 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'; ?> me-2 mt-1 float-start fs-5"></i>
            <div class="ms-4"><?= $pesan; ?></div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    <?php endif; ?>

    <div class="row">
        <div class="col-xl-4 col-lg-4 mb-4">
            <div class="card shadow-sm border-0 h-100" style="border-top: 4px solid var(--gov-primary);">
                <div class="card-body text-center pt-5 pb-4">
                    <div class="position-relative d-inline-block mb-3">
                        <img src="<?= $foto_path; ?>" alt="Foto Profil" class="rounded-circle shadow" style="width: 150px; height: 150px; object-fit: cover; border: 5px solid #fff;">
                    </div>
                    <h4 class="fw-bold text-dark mb-1"><?= htmlspecialchars($current_user['nama_lengkap']); ?></h4>
                    <p class="text-muted mb-2"><?= htmlspecialchars($current_user['jabatan'] ?: 'Pegawai UPTD'); ?></p>
                    <span class="badge px-3 py-2 text-uppercase mb-4 shadow-sm" style="background-color: var(--gov-accent); color: var(--gov-primary); letter-spacing: 1px;">
                        <i class="fas fa-shield-alt me-1"></i> <?= htmlspecialchars($current_user['role']); ?>
                    </span>
                    
                    <ul class="list-group list-group-flush text-start mt-3 border-top pt-3">
                        <li class="list-group-item bg-transparent px-0 text-muted">
                            <i class="fas fa-id-badge text-primary me-2" style="width: 20px;"></i> 
                            <span class="fw-bold text-dark"><?= htmlspecialchars($current_user['nip'] ?: '-'); ?></span>
                        </li>
                        <li class="list-group-item bg-transparent px-0 text-muted">
                            <i class="fas fa-envelope text-danger me-2" style="width: 20px;"></i> 
                            <?= htmlspecialchars($current_user['email'] ?: 'Email belum diatur'); ?>
                        </li>
                        <li class="list-group-item bg-transparent px-0 text-muted">
                            <i class="fas fa-phone-alt text-success me-2" style="width: 20px;"></i> 
                            <?= htmlspecialchars($current_user['no_hp'] ?: 'Nomor HP belum diatur'); ?>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="col-xl-8 col-lg-8 mb-4">
            <div class="card shadow-sm border-0 h-100">
                
                <div class="card-header bg-white pt-3 pb-0 border-bottom-0">
                    <ul class="nav nav-tabs border-bottom" id="profilTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active fw-bold text-gov-primary border-0 border-bottom border-primary border-3 bg-transparent" id="biodata-tab" data-bs-toggle="tab" data-bs-target="#biodata" type="button" role="tab">
                                <i class="fas fa-user-edit me-2"></i>Informasi Biodata
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link fw-bold text-muted border-0 bg-transparent" id="keamanan-tab" data-bs-toggle="tab" data-bs-target="#keamanan" type="button" role="tab">
                                <i class="fas fa-lock me-2"></i>Keamanan Akun
                            </button>
                        </li>
                    </ul>
                </div>

                <div class="card-body p-4">
                    <div class="tab-content" id="profilTabsContent">
                        
                        <div class="tab-pane fade show active" id="biodata" role="tabpanel">
                            <form action="" method="POST" enctype="multipart/form-data">
                                <?= csrf_field(); ?>
                                
                                <div class="row mb-4 bg-light p-3 rounded border">
                                    <div class="col-md-9 mb-2 mb-md-0 d-flex align-items-center">
                                        <div>
                                            <h6 class="fw-bold mb-1 text-dark">Perbarui Foto Profil</h6>
                                            <small class="text-muted">Format: JPG, PNG. Maksimal ukuran 2MB.</small>
                                        </div>
                                    </div>
                                    <div class="col-md-3 text-md-end">
                                        <label for="foto_profil" class="btn btn-outline-primary btn-sm fw-bold w-100">
                                            <i class="fas fa-camera me-1"></i> Pilih Foto
                                        </label>
                                        <input type="file" name="foto_profil" id="foto_profil" class="d-none" accept="image/png, image/jpeg, image/jpg" onchange="previewFileName()">
                                    </div>
                                    <div class="col-12 mt-2">
                                        <div id="file-name-preview" class="small text-success fw-bold"></div>
                                    </div>
                                </div>

                                <h6 class="fw-bold text-gov-primary mb-3 border-bottom pb-2">Informasi Kedinasan</h6>
                                <div class="row mb-3">
                                    <div class="col-md-6 mb-3 mb-md-0">
                                        <label class="form-label small fw-bold text-muted">Nama Lengkap <span class="text-danger">*</span></label>
                                        <input type="text" name="nama_lengkap" class="form-control fw-bold" value="<?= htmlspecialchars($current_user['nama_lengkap']); ?>" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label small fw-bold text-muted">Username Login <span class="text-danger">*</span></label>
                                        <input type="text" name="username" class="form-control border-warning" value="<?= htmlspecialchars($current_user['username']); ?>" required>
                                    </div>
                                </div>
                                <div class="row mb-4">
                                    <div class="col-md-6 mb-3 mb-md-0">
                                        <label class="form-label small fw-bold text-muted">NIP (Nomor Induk Pegawai)</label>
                                        <input type="text" name="nip" class="form-control" placeholder="Kosongkan jika Non-ASN" value="<?= htmlspecialchars($current_user['nip'] ?? ''); ?>">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label small fw-bold text-muted">Jabatan / Seksi</label>
                                        <input type="text" name="jabatan" class="form-control" placeholder="Cth: Pengelola Gudang" value="<?= htmlspecialchars($current_user['jabatan'] ?? ''); ?>">
                                    </div>
                                </div>

                                <h6 class="fw-bold text-gov-primary mb-3 border-bottom pb-2">Informasi Kontak & Pribadi</h6>
                                <div class="row mb-3">
                                    <div class="col-md-6 mb-3 mb-md-0">
                                        <label class="form-label small fw-bold text-muted">Alamat E-mail</label>
                                        <input type="email" name="email" class="form-control" placeholder="Cth: pegawai@banten.go.id" value="<?= htmlspecialchars($current_user['email'] ?? ''); ?>">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label small fw-bold text-muted">Nomor Handphone / WA</label>
                                        <input type="text" name="no_hp" class="form-control" placeholder="Cth: 0812xxxxxx" value="<?= htmlspecialchars($current_user['no_hp'] ?? ''); ?>">
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6 mb-3 mb-md-0">
                                        <label class="form-label small fw-bold text-muted">Jenis Kelamin</label>
                                        <select name="jenis_kelamin" class="form-select">
                                            <option value="">-- Pilih --</option>
                                            <option value="Laki-laki" <?= ($current_user['jenis_kelamin'] ?? '') == 'Laki-laki' ? 'selected' : ''; ?>>Laki-laki</option>
                                            <option value="Perempuan" <?= ($current_user['jenis_kelamin'] ?? '') == 'Perempuan' ? 'selected' : ''; ?>>Perempuan</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label small fw-bold text-muted">Tanggal Lahir</label>
                                        <input type="date" name="tanggal_lahir" class="form-control" value="<?= htmlspecialchars($current_user['tanggal_lahir'] ?? ''); ?>">
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <label class="form-label small fw-bold text-muted">Alamat Tempat Tinggal</label>
                                    <textarea name="alamat" class="form-control" rows="3" placeholder="Masukkan alamat domisili lengkap..."><?= htmlspecialchars($current_user['alamat'] ?? ''); ?></textarea>
                                </div>
                                
                                <div class="text-end border-top pt-3">
                                    <button type="submit" name="update_profil" class="btn btn-primary px-5 fw-bold shadow-sm" style="background-color: var(--gov-primary);">
                                        <i class="fas fa-save me-2"></i> Simpan Pembaruan Biodata
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div class="tab-pane fade" id="keamanan" role="tabpanel">
                            <div class="alert alert-info small mb-4">
                                <i class="fas fa-shield-alt me-2 fs-5 float-start mt-1"></i>
                                <div><b>Pusat Keamanan Akun</b><br>Ganti password Anda secara berkala. Gunakan kombinasi huruf besar, huruf kecil, dan angka agar akun tidak mudah diretas.</div>
                            </div>

                            <form action="" method="POST">
                                <?= csrf_field(); ?>
                                <div class="mb-4 bg-light p-3 rounded border">
                                    <label class="form-label fw-bold text-dark small">Password Lama <span class="text-danger">*</span></label>
                                    <input type="password" name="password_lama" class="form-control" placeholder="Masukkan password saat ini untuk verifikasi" required>
                                </div>
                                
                                <div class="row mb-4">
                                    <div class="col-md-6 mb-3 mb-md-0">
                                        <label class="form-label fw-bold text-dark small">Password Baru <span class="text-danger">*</span></label>
                                        <input type="password" name="password_baru" class="form-control border-primary" placeholder="Minimal 6 karakter" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label fw-bold text-dark small">Konfirmasi Password Baru <span class="text-danger">*</span></label>
                                        <input type="password" name="konfirmasi_password" class="form-control border-primary" placeholder="Ulangi password baru" required>
                                    </div>
                                </div>

                                <div class="text-end border-top pt-3">
                                    <button type="submit" name="ganti_password" class="btn btn-warning fw-bold text-dark shadow-sm px-5">
                                        <i class="fas fa-key me-2"></i> Update Password Akun
                                    </button>
                                </div>
                            </form>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    // Script untuk memunculkan nama file foto yang dipilih
    function previewFileName() {
        var fileInput = document.getElementById('foto_profil');
        var preview = document.getElementById('file-name-preview');
        if (fileInput.files.length > 0) {
            preview.innerHTML = "<i class='fas fa-check-circle'></i> Siap diupload: " + fileInput.files[0].name;
        }
    }

    // Script untuk interaksi tampilan Tab
    document.addEventListener("DOMContentLoaded", function() {
        var triggerTabList = [].slice.call(document.querySelectorAll('#profilTabs button'))
        triggerTabList.forEach(function (triggerEl) {
            triggerEl.addEventListener('click', function (event) {
                // Hapus style active dari semua tab
                triggerTabList.forEach(function(el) {
                    el.classList.remove('active', 'text-gov-primary', 'border-bottom', 'border-primary', 'border-3');
                    el.classList.add('text-muted', 'border-0');
                });
                
                // Tambahkan style active ke tab yang di-klik
                this.classList.remove('text-muted', 'border-0');
                this.classList.add('active', 'text-gov-primary', 'border-bottom', 'border-primary', 'border-3');
            })
        })
    });
</script>

<?php require 'footer.php'; ?>
