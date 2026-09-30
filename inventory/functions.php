<?php
// functions.php - fungsi umum SIPB
require_once __DIR__ . '/koneksi.php';

function e($value): string {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function getCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_field(): string {
    return '<input type="hidden" name="csrf_token" value="' . e(getCsrfToken()) . '">';
}

function verifyCsrfToken($token): bool {
    return is_string($token)
        && isset($_SESSION['csrf_token'])
        && hash_equals($_SESSION['csrf_token'], $token);
}

function requireCsrf(): void {
    if (!verifyCsrfToken($_POST['csrf_token'] ?? null)) {
        http_response_code(419);
        exit('Permintaan tidak valid atau sesi formulir telah kedaluwarsa. Silakan kembali dan coba lagi.');
    }
}

function isAdmin(): bool {
    return isset($_SESSION['role']) && $_SESSION['role'] === 'admin';
}

function isManager(): bool {
    return isset($_SESSION['role']) && in_array($_SESSION['role'], ['admin', 'manager'], true);
}

function hasAccess(string $required_role): bool {
    $role_level = ['user' => 1, 'manager' => 2, 'admin' => 3];
    $current_level = $role_level[$_SESSION['role'] ?? ''] ?? 0;
    $required_level = $role_level[$required_role] ?? PHP_INT_MAX;
    return $current_level >= $required_level;
}

function requireRole(string $required_role): void {
    if (!hasAccess($required_role)) {
        http_response_code(403);
        exit('403 - Anda tidak memiliki hak akses untuk halaman ini.');
    }
}

function cek_overlap_nomor($barang_id, $nomor_awal, $nomor_akhir, $tabel, $exclude_id = null) {
    global $pdo;
    $allowedTables = ['barang_masuk', 'detail_barang_keluar'];
    if (!in_array($tabel, $allowedTables, true) || empty($nomor_awal) || empty($nomor_akhir)) {
        return false;
    }
    $sql = "SELECT id FROM {$tabel}
            WHERE barang_id = :barang_id
              AND nomor_awal <= :nomor_akhir
              AND nomor_akhir >= :nomor_awal";
    if ($exclude_id !== null) {
        $sql .= " AND id != :exclude_id";
    }
    $stmt = $pdo->prepare($sql);
    $params = [':barang_id' => $barang_id, ':nomor_awal' => $nomor_awal, ':nomor_akhir' => $nomor_akhir];
    if ($exclude_id !== null) $params[':exclude_id'] = $exclude_id;
    $stmt->execute($params);
    return (bool)$stmt->fetchColumn();
}

function cek_overlap_nomor_semua($barang_id, $nomor_awal, $nomor_akhir, $exclude_id_masuk = null, $exclude_id_keluar = null) {
    return cek_overlap_nomor($barang_id, $nomor_awal, $nomor_akhir, 'barang_masuk', $exclude_id_masuk)
        || cek_overlap_nomor($barang_id, $nomor_awal, $nomor_akhir, 'detail_barang_keluar', $exclude_id_keluar);
}

function catat_log($aksi, $tabel, $data_id = null, $keterangan = null) {
    global $pdo;
    try {
        $stmt = $pdo->prepare("INSERT INTO log_aktivitas
            (user_id, username, aksi, tabel, data_id, keterangan, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $_SESSION['user_id'] ?? 0,
            $_SESSION['username'] ?? 'unknown',
            $aksi,
            $tabel,
            $data_id,
            $keterangan,
            $_SERVER['REMOTE_ADDR'] ?? '',
            substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500)
        ]);
    } catch (Throwable $e) {
        error_log('Audit log gagal: ' . $e->getMessage());
    }
}

function secure_upload_image(array $file, string $targetDir, string $prefix): ?string {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return null;
    }
    if (($file['size'] ?? 0) < 1 || $file['size'] > 2 * 1024 * 1024) {
        throw new RuntimeException('Ukuran foto maksimal 2 MB.');
    }
    $tmp = $file['tmp_name'] ?? '';
    if (!is_uploaded_file($tmp)) throw new RuntimeException('File upload tidak valid.');
    $info = @getimagesize($tmp);
    if ($info === false) throw new RuntimeException('File harus berupa gambar JPG/PNG yang valid.');
    $mime = $info['mime'] ?? '';
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png'];
    if (!isset($allowed[$mime])) throw new RuntimeException('Format foto hanya JPG atau PNG.');
    if (!is_dir($targetDir) && !mkdir($targetDir, 0755, true)) {
        throw new RuntimeException('Folder upload tidak dapat dibuat.');
    }
    $name = $prefix . '_' . bin2hex(random_bytes(10)) . '.' . $allowed[$mime];
    $dest = rtrim($targetDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . $name;
    if (!move_uploaded_file($tmp, $dest)) throw new RuntimeException('Foto gagal disimpan.');
    @chmod($dest, 0644);
    return $name;
}
?>
