<?php
require 'cek_login.php';
require 'koneksi.php';
require_once 'functions.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') { requireCsrf(); }
requireRole('admin');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = trim($_POST['username']);
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
    $nama_lengkap = trim($_POST['nama_lengkap']);
    $role = $_POST['role'];

    try {
        $stmt = $pdo->prepare("INSERT INTO users (username, password, nama_lengkap, role) VALUES (?, ?, ?, ?)");
        $stmt->execute([$username, $password, $nama_lengkap, $role]);
        echo "<script>alert('User berhasil ditambahkan!'); window.location.href='login.php';</script>";
    } catch (PDOException $e) {
        error_log('tambah_user error: ' . $e->getMessage());
        echo "Gagal membuat akun. Silakan periksa data dan coba lagi.";
    }
}
?>

require 'header.php';
?>

<div class="page-head"><div><h1>Tambah User Baru</h1><p>Buat akun akses sistem untuk kebutuhan administrasi.</p></div></div>
<div class="row justify-content-center"><div class="col-xl-7">
<div class="card">
        <div class="card-header">
            <h6 class="section-title"><i class="fa-solid fa-user-plus me-2 text-primary"></i>Tambah User Baru</h6>
        </div>
        <div class="card-body p-4">
            <form method="POST">
                <?= csrf_field(); ?>
                <div class="mb-3">
                    <label>Username</label>
                    <input type="text" name="username" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label>Password</label>
                    <input type="password" name="password" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label>Nama Lengkap</label>
                    <input type="text" name="nama_lengkap" class="form-control" required>
                </div>
                <div class="mb-3">
                    <label>Role</label>
                    <select name="role" class="form-select">
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">Simpan User</button>
                <a href="manage_users.php" class="btn btn-light border">Kembali ke Login</a>
            </form>
        </div>
    </div>
</div></div>
<?php require 'footer.php'; ?>
