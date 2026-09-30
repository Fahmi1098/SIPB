<?php
// header.php — shell UI modern SIPB
require_once __DIR__ . '/functions.php';
$current_page = basename($_SERVER['PHP_SELF'] ?? 'index.php');
$role = $_SESSION['role'] ?? 'user';
$nama_user = $_SESSION['nama_lengkap'] ?? 'Pengguna';
$initial = strtoupper(substr($nama_user, 0, 1));
if (strpos($nama_user, ' ') !== false) {
    $parts = preg_split('/\s+/', trim($nama_user));
    $initial = strtoupper(substr($parts[0], 0, 1) . substr($parts[count($parts)-1], 0, 1));
}
$foto_nav = 'default.png';
if (isset($_SESSION['user_id']) && isset($pdo)) {
    try {
        $stmt_ava = $pdo->prepare("SELECT foto_profil FROM users WHERE id = ?");
        $stmt_ava->execute([$_SESSION['user_id']]);
        $ava_row = $stmt_ava->fetch(PDO::FETCH_ASSOC);
        if ($ava_row && !empty($ava_row['foto_profil'])) $foto_nav = $ava_row['foto_profil'];
    } catch (Exception $e) { error_log('avatar lookup: ' . $e->getMessage()); }
}
$path_nav = 'uploads/profil/' . $foto_nav;
if (!file_exists($path_nav) || $foto_nav === 'default.png') {
    $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="#0b5cab"/><text x="48" y="57" text-anchor="middle" font-family="Arial" font-size="30" font-weight="700" fill="#fff">' . htmlspecialchars($initial, ENT_QUOTES, 'UTF-8') . '</text></svg>';
    $path_nav = 'data:image/svg+xml;charset=UTF-8,' . rawurlencode($svg);
}
function nav_active(array $pages, string $current): string { return in_array($current, $pages, true) ? 'active' : ''; }
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta name="theme-color" content="#0b5cab">
    <title>SIPB · UPTD PPD Malingping</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css" rel="stylesheet">
    <link href="https://cdn.datatables.net/responsive/2.5.0/css/responsive.bootstrap5.min.css" rel="stylesheet">
    <style>
        :root{
            --primary:#0b5cab;--primary-dark:#083f77;--accent:#f4b400;--ink:#162335;--muted:#6b7785;
            --bg:#f5f7fb;--surface:#fff;--line:#e7ebf0;--success:#1f9d63;--danger:#dc4c64;--warning:#e5a900;
            --shadow:0 10px 30px rgba(21,46,77,.07);--sidebar:272px;
        }
        *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font-family:'Inter',sans-serif;font-size:14px}
        a{text-decoration:none}.app-shell{min-height:100vh}.sidebar{position:fixed;inset:0 auto 0 0;width:var(--sidebar);background:linear-gradient(180deg,#0b5cab 0%,#083f77 100%);color:#fff;z-index:1040;display:flex;flex-direction:column;box-shadow:8px 0 30px rgba(8,63,119,.12)}
        .brand{padding:22px 22px 18px;border-bottom:1px solid rgba(255,255,255,.14);display:flex;align-items:center;gap:12px}.brand img{width:42px;height:42px;object-fit:contain;background:#fff;border-radius:12px;padding:4px}.brand-title{line-height:1.1}.brand-title strong{display:block;font-size:1rem}.brand-title small{opacity:.75;font-size:.72rem;letter-spacing:.04em}
        .sidebar-nav{padding:18px 14px;overflow:auto}.nav-label{font-size:.68rem;text-transform:uppercase;letter-spacing:.11em;opacity:.58;margin:14px 10px 8px}.side-link{display:flex;align-items:center;gap:12px;padding:10px 12px;color:rgba(255,255,255,.84);border-radius:10px;margin:3px 0;font-weight:600;transition:.18s}.side-link i{width:20px;text-align:center;opacity:.85}.side-link:hover{background:rgba(255,255,255,.09);color:#fff}.side-link.active{background:#fff;color:var(--primary);box-shadow:0 8px 18px rgba(0,0,0,.12)}
        .sidebar-bottom{margin-top:auto;padding:14px;border-top:1px solid rgba(255,255,255,.12)}.mini-profile{display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;background:rgba(255,255,255,.08);color:#fff}.mini-profile img{width:38px;height:38px;border-radius:50%;object-fit:cover;background:#fff}.mini-profile small{opacity:.7}.logout-side{display:flex;align-items:center;gap:9px;margin-top:8px;padding:9px 10px;border-radius:9px;color:#ffd8df;font-weight:600}.logout-side:hover{background:rgba(255,255,255,.08);color:#fff}
        .main-wrap{margin-left:var(--sidebar);min-height:100vh}.topbar{height:76px;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:1030;display:flex;align-items:center;justify-content:space-between;padding:0 28px}.topbar-left{display:flex;align-items:center;gap:14px}.mobile-menu{display:none}.crumb{font-size:.82rem;color:var(--muted)}.page-title{font-weight:800;font-size:1.03rem;margin:0}.top-user{display:flex;align-items:center;gap:10px}.top-user img{width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid #e7eef7}.top-user-text strong{display:block;font-size:.82rem}.top-user-text small{display:block;color:var(--muted);text-transform:uppercase;font-size:.65rem;letter-spacing:.08em}
        .content{padding:28px}.page-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:22px}.page-head h1{font-size:1.45rem;font-weight:800;margin:0;color:var(--ink)}.page-head p{margin:5px 0 0;color:var(--muted)}.page-head .head-actions{display:flex;gap:8px;flex-wrap:wrap}
        .card{border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);background:var(--surface)}.card-header{background:#fff;border-bottom:1px solid var(--line);padding:16px 18px}.card-body{padding:18px}.soft-card{background:linear-gradient(180deg,#fff 0%,#fbfcfe 100%)}
        .btn{border-radius:10px;font-weight:700}.btn-primary{background:var(--primary);border-color:var(--primary)}.btn-primary:hover{background:var(--primary-dark);border-color:var(--primary-dark)}.btn-soft-primary{background:#edf5ff;color:var(--primary);border:1px solid #d9eaff}.btn-soft-success{background:#eefaf4;color:var(--success);border:1px solid #d9f0e4}.btn-soft-danger{background:#fff0f3;color:var(--danger);border:1px solid #ffd9e0}.btn-soft-warning{background:#fff8e5;color:#8b6500;border:1px solid #fbe5a8}
        .stat-card{padding:18px;position:relative;overflow:hidden}.stat-card .icon{position:absolute;right:18px;top:16px;width:46px;height:46px;border-radius:13px;display:grid;place-items:center;font-size:1.1rem}.stat-card .label{text-transform:uppercase;font-size:.68rem;font-weight:800;letter-spacing:.08em;color:var(--muted)}.stat-card .value{font-size:1.55rem;font-weight:800;margin-top:6px}.stat-card .hint{font-size:.76rem;color:var(--muted);margin-top:3px}.accent-blue{border-top:3px solid var(--primary)}.accent-blue .icon{background:#edf5ff;color:var(--primary)}.accent-green{border-top:3px solid var(--success)}.accent-green .icon{background:#eefaf4;color:var(--success)}.accent-red{border-top:3px solid var(--danger)}.accent-red .icon{background:#fff0f3;color:var(--danger)}.accent-yellow{border-top:3px solid var(--accent)}.accent-yellow .icon{background:#fff8e5;color:#8b6500}
        .quick-card{height:100%;padding:18px}.quick-card .quick-icon{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;margin-bottom:12px}.quick-card h6{font-weight:800;margin-bottom:6px}.quick-card p{color:var(--muted);font-size:.78rem;min-height:38px}.quick-link{display:flex;align-items:center;justify-content:space-between;padding:9px 10px;border:1px solid var(--line);border-radius:10px;color:var(--ink);font-weight:600;margin-top:7px;background:#fff}.quick-link:hover{border-color:#c9d9ea;background:#f9fbfe}
        .section-title{font-size:.95rem;font-weight:800;margin:0}.section-sub{color:var(--muted);font-size:.76rem}.table{margin-bottom:0}.table thead th{font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:#677586;background:#f7f9fc;border-bottom:1px solid var(--line);white-space:nowrap}.table tbody td{vertical-align:middle;border-color:#edf0f4;padding:11px}.table-hover tbody tr:hover{background:#fbfdff}.badge{border-radius:999px;padding:.45em .7em}.form-control,.form-select{border-radius:10px;border-color:#dfe5eb;padding:.68rem .78rem}.form-control:focus,.form-select:focus{border-color:#8eb7dc;box-shadow:0 0 0 .2rem rgba(11,92,171,.11)}.alert{border:0;border-radius:12px}.footer{padding:18px 28px;color:var(--muted);font-size:.75rem}.mobile-overlay{display:none}
        .dataTables_wrapper .dataTables_filter input{border:1px solid #dfe5eb;border-radius:9px;padding:.4rem .65rem}.dataTables_wrapper .dataTables_length select{border:1px solid #dfe5eb;border-radius:8px;padding:.35rem}.dataTables_wrapper .pagination .page-link{border-radius:8px!important;margin:0 2px;color:var(--primary)}
        @media(max-width:991px){:root{--sidebar:0px}.sidebar{transform:translateX(-100%);transition:.22s;width:280px}.sidebar.show{transform:translateX(0)}.main-wrap{margin-left:0}.mobile-menu{display:inline-grid;place-items:center;width:40px;height:40px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--primary)}.mobile-overlay.show{display:block;position:fixed;inset:0;background:rgba(12,28,48,.38);z-index:1039}.topbar{padding:0 18px}.content{padding:20px}}
        @media(max-width:576px){.top-user-text{display:none}.topbar{height:68px}.content{padding:16px}.page-head{align-items:flex-start;flex-direction:column}.page-head .head-actions{width:100%}.page-head .head-actions>*{flex:1}.stat-card .value{font-size:1.35rem}.card{border-radius:13px}.footer{padding:16px}}
        @media print{.sidebar,.topbar,.footer,.no-print,.btn,.dataTables_filter,.dataTables_length,.dataTables_info,.dataTables_paginate{display:none!important}.main-wrap{margin:0!important}.content{padding:0!important}.card{box-shadow:none!important;border:none!important}.card-header{display:none!important}.table{width:100%!important;color:#000!important}.table-bordered th,.table-bordered td{border:1px solid #000!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
    </style>
</head>
<body>
<div class="app-shell">
    <aside class="sidebar" id="sidebar">
        <a class="brand text-white" href="index.php">
            <img src="logo_banten.png?v=3" alt="Logo Banten">
            <div class="brand-title"><strong>SIPB UPTD PPD</strong><small>Malingping · Persediaan Barang</small></div>
        </a>
        <nav class="sidebar-nav">
            <div class="nav-label">Utama</div>
            <a class="side-link <?= nav_active(['index.php'], $current_page) ?>" href="index.php"><i class="fa-solid fa-table-cells-large"></i><span>Dashboard</span></a>
            <a class="side-link <?= nav_active(['dashboard.php'], $current_page) ?>" href="dashboard.php"><i class="fa-solid fa-chart-line"></i><span>Grafik & Analitik</span></a>
            <div class="nav-label">Transaksi</div>
            <a class="side-link <?= nav_active(['barang_masuk.php'], $current_page) ?>" href="barang_masuk.php"><i class="fa-solid fa-arrow-down"></i><span>Barang Masuk</span></a>
            <a class="side-link <?= nav_active(['barang_keluar.php'], $current_page) ?>" href="barang_keluar.php"><i class="fa-solid fa-arrow-up"></i><span>Barang Keluar</span></a>
            <a class="side-link <?= nav_active(['stock_opname.php'], $current_page) ?>" href="stock_opname.php"><i class="fa-solid fa-clipboard-check"></i><span>Stock Opname</span></a>
            <div class="nav-label">Data & Laporan</div>
            <?php if ($role === 'admin'): ?>
                <a class="side-link <?= nav_active(['manage_barang.php'], $current_page) ?>" href="manage_barang.php"><i class="fa-solid fa-boxes-stacked"></i><span>Master Barang</span></a>
                <a class="side-link <?= nav_active(['master_kategori.php'], $current_page) ?>" href="master_kategori.php"><i class="fa-solid fa-tags"></i><span>Kategori</span></a>
                <a class="side-link <?= nav_active(['manage_pegawai.php'], $current_page) ?>" href="manage_pegawai.php"><i class="fa-solid fa-users"></i><span>Pegawai</span></a>
            <?php endif; ?>
            <a class="side-link <?= nav_active(['kartu_persediaan.php'], $current_page) ?>" href="kartu_persediaan.php"><i class="fa-solid fa-book-open"></i><span>Kartu Persediaan</span></a>
            <a class="side-link <?= nav_active(['stok_kuasi.php'], $current_page) ?>" href="stok_kuasi.php"><i class="fa-solid fa-barcode"></i><span>Stok Dokumen Kuasi</span></a>
            <a class="side-link <?= nav_active(['riwayat_masuk.php','riwayat_keluar.php'], $current_page) ?>" href="riwayat_masuk.php"><i class="fa-solid fa-clock-rotate-left"></i><span>Riwayat Transaksi</span></a>
            <?php if ($role === 'admin'): ?>
                <div class="nav-label">Administrasi</div>
                <a class="side-link <?= nav_active(['manage_users.php'], $current_page) ?>" href="manage_users.php"><i class="fa-solid fa-user-shield"></i><span>Manajemen Pengguna</span></a>
            <?php endif; ?>
        </nav>
        <div class="sidebar-bottom">
            <div class="mini-profile"><img src="<?= htmlspecialchars($path_nav, ENT_QUOTES, 'UTF-8') ?>" alt="Profil"><div><strong class="d-block" style="font-size:.78rem"><?= htmlspecialchars($nama_user) ?></strong><small><?= htmlspecialchars(strtoupper($role)) ?></small></div></div>
            <a class="logout-side" href="#" data-bs-toggle="modal" data-bs-target="#logoutModal"><i class="fa-solid fa-right-from-bracket"></i> Keluar dari sistem</a>
        </div>
    </aside>
    <div class="mobile-overlay" id="mobileOverlay"></div>
    <div class="main-wrap">
        <header class="topbar">
            <div class="topbar-left"><button class="mobile-menu" id="mobileMenu" aria-label="Buka menu"><i class="fa-solid fa-bars"></i></button><div><div class="crumb">Sistem Informasi Persediaan Barang</div><h1 class="page-title">UPTD Pengelolaan Pendapatan Daerah Malingping</h1></div></div>
            <div class="top-user"><div class="top-user-text text-end"><strong><?= htmlspecialchars($nama_user) ?></strong><small><?= htmlspecialchars($role) ?></small></div><img src="<?= htmlspecialchars($path_nav, ENT_QUOTES, 'UTF-8') ?>" alt="Profil pengguna"></div>
        </header>
        <main class="content">
