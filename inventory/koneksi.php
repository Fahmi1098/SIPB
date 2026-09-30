<?php
$host = getenv('SIPB_DB_HOST') ?: 'localhost';
$dbname = getenv('SIPB_DB_NAME') ?: 'db_inventory';
$username = getenv('SIPB_DB_USER') ?: 'root';
$password = getenv('SIPB_DB_PASS') ?: '';

try {
    $pdo = new PDO(
        "mysql:host={$host};dbname={$dbname};charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    error_log('SIPB database error: ' . $e->getMessage());
    http_response_code(500);
    die('Koneksi database gagal. Hubungi administrator sistem.');
}
?>
