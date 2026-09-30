<?php
require 'cek_login.php';
requireRole('admin');
require_once 'functions.php';
?>
<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Reset Password - SIPB</title><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet"></head><body class="bg-light"><div class="container py-5"><div class="alert alert-danger shadow-sm"><h4 class="alert-heading">Fitur pemeliharaan dinonaktifkan</h4><p class="mb-2">File ini tidak lagi menjalankan migrasi/reset password otomatis melalui URL web.</p><p class="mb-0">Gunakan menu <strong>Kelola Pengguna</strong> untuk mengubah kata sandi secara aman.</p></div><a href="index.php" class="btn btn-primary">Kembali ke Dashboard</a></div></body></html>
