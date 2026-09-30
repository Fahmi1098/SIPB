<?php
session_set_cookie_params([
    'lifetime' => 0, 'path' => '/', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true, 'samesite' => 'Lax'
]);
session_start();
require 'koneksi.php';
require_once 'functions.php';

// Jika sudah login, langsung arahkan ke dashboard
if (isset($_SESSION['user_id'])) {
    header("Location: index.php");
    exit;
}

$error = "";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    requireCsrf();
    $username = trim($_POST['username']);
    $password = $_POST['password'];

    if (!empty($username) && !empty($password)) {
        try {
            // Cari user berdasarkan username dan pastikan akunnya aktif
            $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND is_active = 1");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            // Verifikasi password (menggunakan password_hash)
            if ($user && password_verify($password, $user['password'])) {
                // Set Session
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['nama_lengkap'] = $user['nama_lengkap'];
                $_SESSION['role'] = $user['role'];

                session_regenerate_id(true);
                $_SESSION['last_activity'] = time();
                $_SESSION['last_regeneration'] = time();
                header("Location: index.php");
                exit;
            } else {
                $error = "Username atau Password salah, atau Akun sedang dinonaktifkan.";
            }
        } catch (PDOException $e) {
            $error = "Terjadi kesalahan sistem. Silakan coba lagi.";
            error_log("Login error: " . $e->getMessage());
        }
    } else {
        $error = "Silakan isi Username dan Password terlebih dahulu!";
    }
}
?>

<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="theme-color" content="#0b5cab">
<title>Masuk · SIPB UPTD PPD Malingping</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<style>
:root{--p:#0b5cab;--pd:#083f77;--a:#f4b400;--ink:#162335;--muted:#6b7785;--line:#e4e9ef;--bg:#f5f7fb}
*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:'Inter',sans-serif;background:var(--bg);color:var(--ink)}
.login-shell{min-height:100vh;display:grid;grid-template-columns:1.05fr .95fr}.brand-pane{position:relative;overflow:hidden;background:linear-gradient(145deg,#0b5cab 0%,#083f77 100%);color:#fff;padding:56px;display:flex;flex-direction:column;justify-content:space-between}.brand-pane:before,.brand-pane:after{content:"";position:absolute;border-radius:50%;border:1px solid rgba(255,255,255,.08)}.brand-pane:before{width:460px;height:460px;right:-190px;top:-170px}.brand-pane:after{width:300px;height:300px;left:-140px;bottom:-120px}.brand-content{position:relative;z-index:2;max-width:620px}.logo-wrap{width:70px;height:70px;border-radius:20px;background:#fff;display:grid;place-items:center;padding:8px;box-shadow:0 16px 36px rgba(0,0,0,.16);margin-bottom:28px}.logo-wrap img{max-width:100%;max-height:100%;object-fit:contain}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.72rem;opacity:.72;font-weight:700}.brand-title{font-size:clamp(2rem,4vw,3.6rem);line-height:1.04;font-weight:800;margin:10px 0 18px}.brand-desc{font-size:1rem;line-height:1.75;color:rgba(255,255,255,.78);max-width:520px}.feature-list{display:flex;gap:12px;flex-wrap:wrap;margin-top:32px}.feature{padding:10px 13px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.1);border-radius:999px;font-size:.76rem;font-weight:600}.brand-foot{font-size:.76rem;color:rgba(255,255,255,.62);position:relative;z-index:2}.form-pane{display:flex;align-items:center;justify-content:center;padding:34px}.login-card{width:min(100%,460px);background:#fff;border:1px solid var(--line);border-radius:22px;padding:34px;box-shadow:0 18px 50px rgba(19,42,70,.09)}.login-card h1{font-size:1.7rem;font-weight:800;margin:0 0 7px}.login-card .sub{color:var(--muted);font-size:.85rem;margin-bottom:26px}.label{font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;font-weight:800;color:#566474;margin-bottom:7px}.input-wrap{display:flex;align-items:center;border:1px solid var(--line);border-radius:12px;background:#f9fbfd;overflow:hidden}.input-wrap:focus-within{border-color:#8eb7dc;box-shadow:0 0 0 .2rem rgba(11,92,171,.1);background:#fff}.input-wrap .lead{width:46px;text-align:center;color:#8190a0}.input-wrap input{border:0;outline:0;box-shadow:none;background:transparent;padding:13px 0;flex:1;font-weight:600}.input-wrap button{border:0;background:transparent;color:#8190a0;width:46px}.btn-login{border:0;border-radius:12px;background:var(--p);color:#fff;padding:13px;font-weight:800;box-shadow:0 10px 22px rgba(11,92,171,.2)}.btn-login:hover{background:var(--pd);color:#fff;transform:translateY(-1px)}.security{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:11px;background:#f7fafc;color:var(--muted);font-size:.74rem}.security i{color:var(--p)}.copyright{padding-top:18px;margin-top:24px;border-top:1px solid var(--line);font-size:.7rem;color:var(--muted)}
@media(max-width:900px){.login-shell{grid-template-columns:1fr}.brand-pane{padding:34px 28px;min-height:330px}.brand-title{font-size:2.2rem}.brand-desc{max-width:680px}.form-pane{padding:22px}.brand-foot{margin-top:35px}.login-card{padding:28px}}
</style>
</head><body>
<div class="login-shell">
<section class="brand-pane"><div class="brand-content"><div class="logo-wrap"><img src="logo_banten.png" alt="Logo Provinsi Banten"></div><div class="eyebrow">Portal Internal · UPTD PPD Malingping</div><div class="brand-title">Sistem Informasi Persediaan Barang</div><div class="brand-desc">Kelola persediaan, transaksi barang, pegawai, dan laporan dengan alur kerja yang lebih cepat dan terstruktur.</div><div class="feature-list"><span class="feature"><i class="fa-solid fa-shield-halved me-2"></i>Akses terproteksi</span><span class="feature"><i class="fa-solid fa-chart-line me-2"></i>Monitoring stok</span><span class="feature"><i class="fa-solid fa-file-lines me-2"></i>Laporan terintegrasi</span></div></div><div class="brand-foot">Badan Pendapatan Daerah Provinsi Banten · UPTD PPD Malingping</div></section>
<section class="form-pane"><div class="login-card"><div class="eyebrow text-primary mb-2">Secure sign in</div><h1>Selamat datang kembali</h1><div class="sub">Masuk untuk melanjutkan ke sistem persediaan barang.</div>
<?php if ($error != ""): ?><div class="alert alert-danger small fw-semibold d-flex gap-2 align-items-start"><i class="fa-solid fa-circle-exclamation mt-1"></i><div><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></div></div><?php endif; ?>
<form method="POST" action="login.php"><?= csrf_field(); ?><div class="mb-3"><div class="label">Username</div><div class="input-wrap"><div class="lead"><i class="fa-solid fa-user"></i></div><input type="text" name="username" required autocomplete="username" autofocus placeholder="Masukkan username"></div></div>
<div class="mb-3"><div class="label">Kata sandi</div><div class="input-wrap"><div class="lead"><i class="fa-solid fa-lock"></i></div><input type="password" name="password" id="password" required autocomplete="current-password" placeholder="Masukkan kata sandi"><button type="button" id="togglePassword" aria-label="Tampilkan kata sandi"><i class="fa-solid fa-eye" id="eyeIcon"></i></button></div></div>
<div class="d-grid mt-4"><button type="submit" class="btn btn-login">Masuk ke Sistem <i class="fa-solid fa-arrow-right ms-2"></i></button></div></form>
<div class="security mt-4"><i class="fa-solid fa-shield-check"></i><span>Sesi dilindungi dan hanya dapat digunakan oleh akun yang aktif.</span></div><div class="copyright">© <?= date('Y'); ?> UPTD Pengelolaan Pendapatan Daerah Malingping</div>
</div></section></div>
<script>const p=document.getElementById('password'),b=document.getElementById('togglePassword'),i=document.getElementById('eyeIcon');b.addEventListener('click',()=>{const is=p.type==='password';p.type=is?'text':'password';i.classList.toggle('fa-eye',!is);i.classList.toggle('fa-eye-slash',is);b.setAttribute('aria-label',is?'Sembunyikan kata sandi':'Tampilkan kata sandi');});</script>
</body></html>
