<?php
require 'cek_login.php';
require 'koneksi.php';
require_once 'functions.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') { requireCsrf(); }

$pesan = "";
$status = "";

if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['simpan_opname'])) {
    $barang_id = (int)$_POST['barang_id'];
    $stok_sistem = (int)$_POST['stok_sistem'];
    $stok_fisik = (int)$_POST['stok_fisik'];
    $keterangan = trim($_POST['keterangan']);
    $tgl_opname = date('Y-m-d');
    $petugas = $_SESSION['nama_lengkap'];
    
    $selisih = $stok_fisik - $stok_sistem;

    // Proteksi Keamanan Backend: Tolak jika ini adalah Barang Kuasi
    $stmt_kat = $pdo->prepare("SELECT LOWER(k.nama_kategori) FROM barang b JOIN kategori k ON b.kategori_id = k.id WHERE b.id = ?");
    $stmt_kat->execute([$barang_id]);
    $nama_kat = $stmt_kat->fetchColumn();

    if (strpos($nama_kat, 'kuasi') !== false) {
        $pesan = "<b>Sistem Menolak:</b> Penyesuaian stok untuk dokumen ber-seri (Kuasi) tidak diizinkan melalui form ini karena berisiko merusak antrean nomor seri (FIFO). Gunakan menu 'Distribusi Keluar' untuk mencatat Kuasi yang rusak/hilang.";
        $status = "danger";
    } elseif ($selisih == 0) {
        $pesan = "Stok fisik sudah sesuai dengan sistem. Tidak ada mutasi penyesuaian yang disimpan.";
        $status = "info";
    } else {
        try {
            $pdo->beginTransaction();

            // 1. Simpan ke riwayat mutasi opname
            $sql_riwayat = "INSERT INTO riwayat_opname (tanggal_opname, barang_id, stok_sistem, stok_fisik, selisih, keterangan, petugas) 
                            VALUES (?, ?, ?, ?, ?, ?, ?)";
            $pdo->prepare($sql_riwayat)->execute([$tgl_opname, $barang_id, $stok_sistem, $stok_fisik, $selisih, $keterangan, $petugas]);

            // Ambil harga referensi terakhir untuk menjaga nilai aset
            $stmt_harga = $pdo->prepare("SELECT harga_terakhir FROM barang WHERE id = ?");
            $stmt_harga->execute([$barang_id]);
            $harga_ref = $stmt_harga->fetchColumn() ?: 0;

            // 2. Sesuaikan Stok agar Buku Gudang (Kartu Persediaan) tetap Balance
            if ($selisih > 0) {
                // Fisik LEBIH BANYAK dari sistem -> Buat Barang Masuk (Barang Temuan)
                $sql_masuk = "INSERT INTO barang_masuk (barang_id, jumlah, harga_satuan, sumber_dana, tanggal_masuk, nama_penyerah, nama_penerima) 
                              VALUES (?, ?, ?, 'Lainnya', ?, 'Sistem Opname', ?)";
                $pdo->prepare($sql_masuk)->execute([$barang_id, $selisih, $harga_ref, $tgl_opname, "Penyesuaian: $keterangan"]);
                
                // Update tabel barang
                $pdo->prepare("UPDATE barang SET jumlah_total = jumlah_total + ?, sisa = ? WHERE id = ?")->execute([$selisih, $stok_fisik, $barang_id]);

            } else {
                // Fisik LEBIH SEDIKIT dari sistem -> Buat Barang Keluar (Barang Hilang/Rusak)
                $jml_hilang = abs($selisih);
                
                // Buat Header Keluar
                $sql_keluar = "INSERT INTO transaksi_keluar (tanggal_keluar, penyerah_nama, penerima_nama, tujuan_ruangan, jenis_dokumen) 
                               VALUES (?, ?, 'Sistem Opname', ?, 'Penyesuaian')";
                $pdo->prepare($sql_keluar)->execute([$tgl_opname, $petugas, "Penyesuaian: $keterangan"]);
                $id_trx_keluar = $pdo->lastInsertId();

                // Buat Detail Keluar
                $pdo->prepare("INSERT INTO detail_barang_keluar (transaksi_keluar_id, barang_id, jumlah) VALUES (?, ?, ?)")
                    ->execute([$id_trx_keluar, $barang_id, $jml_hilang]);
                
                // Update tabel barang
                $pdo->prepare("UPDATE barang SET terpakai = terpakai + ?, sisa = ? WHERE id = ?")->execute([$jml_hilang, $stok_fisik, $barang_id]);
            }

            $pdo->commit();
            $pesan = "Berhasil! Penyesuaian stok opname telah disimpan dan otomatis disinkronisasi dengan Buku Gudang.";
            $status = "success";

        } catch (PDOException $e) {
            $pdo->rollBack();
            $pesan = "Gagal melakukan penyesuaian stok. Periksa data lalu coba lagi.";
            error_log('stock_opname error: ' . $e->getMessage());
            $status = "danger";
        }
    }
}

// Panggil Header UI
require 'header.php';
?>

<div class="container-fluid px-4 mt-4 mb-5">
    
    <div class="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 class="h3 mb-0 text-gray-800 fw-bold" style="color: var(--gov-primary);">Modul Rekonsiliasi (Stock Opname)</h1>
    </div>

    <?php if ($pesan != ""): ?>
        <div class="alert alert-<?= $status; ?> alert-dismissible fade show shadow-sm" role="alert">
            <i class="fas <?= $status == 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'; ?> me-2 mt-1 float-start fs-4"></i>
            <div class="ms-4"><?= $pesan; ?></div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    <?php endif; ?>

    <div class="card shadow-sm border-0" style="border-top: 4px solid var(--gov-primary);">
        <div class="card-header pt-3 pb-2 bg-white">
            <h5 class="text-gov-primary fw-bold mb-1"><i class="fas fa-clipboard-check me-2"></i> Form Penyesuaian Fisik</h5>
            <small class="text-muted">Gunakan form ini HANYA JIKA jumlah fisik di gudang berbeda dengan data di sistem aplikasi.</small>
        </div>
        <div class="card-body p-4">
            <form action="" method="POST" id="formOpname">
                <?= csrf_field(); ?>
                <div class="row">
                    <div class="col-md-6 border-end pe-4">
                        <h6 class="text-gov-primary fw-bold mb-3 border-bottom pb-2"><i class="fas fa-search me-2"></i>Pencarian Barang</h6>
                        
                        <div class="mb-3">
                            <label class="form-label fw-bold text-muted small">Pilih Barang yang Dihitung <span class="text-danger">*</span></label>
                            <select name="barang_id" id="barang_id" class="form-select border-primary" required onchange="cekStokSistem()" style="background-color: #f8fbff;">
                                <option value="" data-stok="0" data-satuan="" data-kuasi="tidak">-- Pilih Nama Barang --</option>
                                <?php
                                $sql_brg = "SELECT b.id, b.nama_barang, b.sisa, b.satuan, k.nama_kategori 
                                            FROM barang b 
                                            LEFT JOIN kategori k ON b.kategori_id = k.id 
                                            ORDER BY b.nama_barang";
                                $stmt_brg = $pdo->query($sql_brg);
                                while ($b = $stmt_brg->fetch()) {
                                    $is_kuasi = (stripos($b['nama_kategori'], 'kuasi') !== false) ? 'ya' : 'tidak';
                                    $tanda_kuasi = ($is_kuasi == 'ya') ? ' ⚠️ [KUASI - DIBLOKIR]' : '';
                                    
                                    echo "<option value='{$b['id']}' data-stok='{$b['sisa']}' data-satuan='{$b['satuan']}' data-kuasi='{$is_kuasi}'>" 
                                         . htmlspecialchars($b['nama_barang']) . $tanda_kuasi . "</option>";
                                }
                                ?>
                            </select>
                        </div>
                        
                        <div class="alert mt-4 py-3" style="background-color: #e3f2fd; border: 1px solid #90caf9;">
                            <span class="small fw-bold text-primary text-uppercase">Saldo Stok Tercatat di Sistem:</span><br>
                            <h2 class="text-primary fw-bold mb-0 mt-2" id="tampil_stok_sistem">0 <span class="fs-5 text-muted fw-normal" id="label_satuan_sys">Satuan</span></h2>
                            <input type="hidden" name="stok_sistem" id="stok_sistem" value="0">
                        </div>
                    </div>
                    
                    <div class="col-md-6 ps-4">
                        <h6 class="text-gov-primary fw-bold mb-3 border-bottom pb-2"><i class="fas fa-boxes me-2"></i>Hasil Hitung Fisik Gudang</h6>

                        <div class="mb-3">
                            <label class="form-label fw-bold text-muted small">Jumlah Fisik Sebenarnya (Di Gudang) <span class="text-danger">*</span></label>
                            <div class="input-group">
                                <input type="number" name="stok_fisik" id="stok_fisik" class="form-control form-control-lg text-center fw-bold border-warning" required min="0" onkeyup="hitungSelisih()">
                                <span class="input-group-text bg-light fw-bold" id="label_satuan">Satuan</span>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-bold text-muted small">Alasan / Keterangan Penyesuaian <span class="text-danger">*</span></label>
                            <textarea name="keterangan" id="keterangan" class="form-control border-secondary" rows="2" required placeholder="Cth: Barang rusak dimakan rayap, Salah catat, atau Ditemukan stok lebih di gudang"></textarea>
                        </div>

                        <div id="info_selisih" class="mb-4 small fw-bold p-2 rounded"></div>

                        <button type="submit" name="simpan_opname" id="btn_simpan" class="btn btn-primary btn-lg w-100 fw-bold shadow" style="background-color: var(--gov-primary);" onclick="return confirm('PENTING: Data penyesuaian ini akan diaudit. Apakah Anda yakin jumlah fisik sudah dihitung dengan benar?');">
                            <i class="fas fa-check-double me-2"></i> Eksekusi Penyesuaian Saldo
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
    
    <div class="text-center mt-4 text-muted small fw-bold">
        <i class="fas fa-shield-alt me-1"></i> Data Opname Tercatat Permanen Dalam Log Sistem Akuntabilitas UPTD.
    </div>
</div>

<script>
    function cekStokSistem() {
        var select = document.getElementById('barang_id');
        var option = select.options[select.selectedIndex];
        
        var stok = option.getAttribute('data-stok') || 0;
        var satuan = option.getAttribute('data-satuan') || "Satuan";
        var isKuasi = option.getAttribute('data-kuasi') || "tidak";

        document.getElementById('stok_sistem').value = stok;
        document.getElementById('tampil_stok_sistem').innerHTML = stok + " <span class='fs-5 text-muted fw-normal'>" + satuan + "</span>";
        document.getElementById('label_satuan').innerText = satuan;
        
        var inputFisik = document.getElementById('stok_fisik');
        var inputKet = document.getElementById('keterangan');
        var btnSimpan = document.getElementById('btn_simpan');
        var divInfo = document.getElementById('info_selisih');

        // LOGIKA PROTEKSI KUASI
        if (isKuasi === 'ya') {
            inputFisik.disabled = true;
            inputFisik.value = '';
            inputKet.disabled = true;
            btnSimpan.disabled = true;
            
            divInfo.innerHTML = "<i class='fas fa-lock fs-5 align-middle me-2'></i> <b>DIBLOKIR:</b> Barang Kuasi/Dokumen Seri tidak bisa di-opname sembarangan karena akan merusak susunan FIFO. Jika ada Kuasi yang rusak/hilang, silakan input melalui menu <b>Distribusi Keluar</b> dengan penerima 'Gudang' dan tujuan 'Dimusnahkan'.";
            divInfo.className = "mb-4 small p-3 rounded bg-danger text-white shadow-sm";
        } else {
            inputFisik.disabled = false;
            inputKet.disabled = false;
            btnSimpan.disabled = false;
            hitungSelisih(); // Update selisih
        }
    }

    function hitungSelisih() {
        var stok_sistem = parseInt(document.getElementById('stok_sistem').value) || 0;
        var stok_fisik = parseInt(document.getElementById('stok_fisik').value);
        var divInfo = document.getElementById('info_selisih');

        if (isNaN(stok_fisik) || document.getElementById('stok_fisik').value === "") {
            divInfo.innerHTML = "";
            divInfo.className = "mb-4 small fw-bold p-2 rounded";
            return;
        }

        var selisih = stok_fisik - stok_sistem;

        if (selisih === 0) {
            divInfo.innerHTML = "<i class='fas fa-check-circle fs-5 align-middle me-2'></i> Stok Sinkron (Tidak ada selisih)";
            divInfo.className = "mb-4 small fw-bold p-2 rounded bg-success text-white shadow-sm";
        } else if (selisih > 0) {
            divInfo.innerHTML = "<i class='fas fa-arrow-up fs-5 align-middle me-2'></i> Selisih Plus (+" + selisih + "). Sistem akan mencatat Mutasi Masuk penyesuaian otomatis.";
            divInfo.className = "mb-4 small fw-bold p-2 rounded bg-primary text-white shadow-sm";
        } else {
            divInfo.innerHTML = "<i class='fas fa-arrow-down fs-5 align-middle me-2'></i> Selisih Minus (" + selisih + "). Sistem akan mencatat Mutasi Keluar penyesuaian otomatis.";
            divInfo.className = "mb-4 small fw-bold p-2 rounded bg-warning text-dark shadow-sm border border-warning";
        }
    }
</script>

<?php require 'footer.php'; ?>
