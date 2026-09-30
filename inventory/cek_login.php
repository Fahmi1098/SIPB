<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'lifetime' => 0, 'path' => '/', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true, 'samesite' => 'Lax'
    ]);
    session_start();
}
require_once __DIR__ . '/functions.php';

// Cek apakah user sudah login
if (!isset($_SESSION['user_id'])) {
    // Jika tidak ada session user_id, redirect ke halaman login
    header("Location: login.php");
    exit;
}

// Koneksi ke database untuk cek status user
require_once 'koneksi.php';

try {
    // Cek apakah user masih aktif di database
    $stmt = $pdo->prepare("SELECT id, username, nama_lengkap, role, is_active FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Jika user tidak ditemukan di database
    if (!$user) {
        session_destroy();
        header("Location: login.php?error=Akun tidak ditemukan");
        exit;
    }
    
    // Jika user tidak aktif (dinonaktifkan oleh admin)
    if ($user['is_active'] != 1) {
        session_destroy();
        header("Location: login.php?error=Akun Anda telah dinonaktifkan. Silakan hubungi administrator.");
        exit;
    }
    
    // Sinkronisasi session dengan data terbaru dari database
    $_SESSION['username'] = $user['username'];
    $_SESSION['nama_lengkap'] = $user['nama_lengkap'];
    $_SESSION['role'] = $user['role'];
    
} catch (PDOException $e) {
    // Jika terjadi error koneksi database, redirect ke login
    error_log("Database error in cek_login.php: " . $e->getMessage());
    session_destroy();
    header("Location: login.php?error=Terjadi kesalahan sistem");
    exit;
}

// Optional: Cek session timeout (30 menit tidak aktif)
if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > 1800)) {
    // 1800 detik = 30 menit
    session_destroy();
    header("Location: login.php?error=Sesi Anda telah habis. Silakan login kembali.");
    exit;
}

// Update last activity time
$_SESSION['last_activity'] = time();

// Optional: Regenerate session ID untuk keamanan (setiap 30 menit)
if (!isset($_SESSION['last_regeneration'])) {
    session_regenerate_id(true);
    $_SESSION['last_regeneration'] = time();
} else if (time() - $_SESSION['last_regeneration'] > 1800) {
    session_regenerate_id(true);
    $_SESSION['last_regeneration'] = time();
}
