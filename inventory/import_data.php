<?php
require 'cek_login.php';
require 'koneksi.php';
require_once 'functions.php';
requireRole('admin');
if ($_SERVER['REQUEST_METHOD'] === 'POST') { requireCsrf(); }

$pesan = "";
$status = "";

if (isset($_POST['import'])) {
    $ekstensi_diperbolehkan = array('csv');
    $nama_file = $_FILES['file_csv']['name'];
    $x = explode('.', $nama_file);
    $ekstensi = strtolower(end($x));
    $ukuran = $_FILES['file_csv']['size'];
    $file_tmp = $_FILES['file_csv']['tmp_name'];

    if (in_array($ekstensi, $ekstensi_diperbolehkan) === true) {
        if ($ukuran < 5048000) { // Maks 5MB
            $file = fopen($file_tmp, "r");
            $baris = 0;
            $berhasil = 0;
            $gagal = 0;
            $error_detail = "";

            try {
                $pdo->beginTransaction();

                while (($data = fgetcsv($file, 1000, ";")) !== FALSE) {
                    $baris++;
                    if ($baris == 1) continue; // Lewati Header

                    if (count($data) < 11) {
                        $gagal++; continue;
                    }

                    $nama_kategori = trim($data[0]);
                    $nama_barang   = trim($data[1]);
                    $merk          = trim($data[2]);
                    $tipe          = trim($data[3]);
                    $satuan        = trim($data[4]);
                    $jumlah        = (int)$data[5];
                    $harga_satuan  = (float)str_replace(['Rp', '.', ',', ' '], '', $data[6]);
                    $sumber_dana   = trim($data[7]);
                    $tgl_masuk     = date('Y-m-d', strtotime(trim($data[8])));
                    $penyerah      = trim($data[9] ?? 'Saldo Awal');
                    $penerima      = trim($data[10] ?? $_SESSION['nama_lengkap']);
                    
                    // Kolom khusus Kuasi (Index 11, 12, 13)
                    $nomor_dus   = isset($data[11]) ? trim($data[11]) : '';
                    $nomor_awal  = isset($data[12]) ? trim($data[12]) : '';
                    $nomor_akhir = isset($data[13]) ? trim($data[13]) : '';

                    if (empty($nama_barang) || empty($nama_kategori) || $jumlah <= 0) {
                        $gagal++; continue;
                    }

                    // Cek apakah ini barang kuasi
                    $is_kuasi = (stripos($nama_kategori, 'kuasi') !== false);
                    
                    // Validasi khusus Kuasi
                    if ($is_kuasi) {
                        if (empty($nomor_awal) || empty($nomor_akhir)) {
                            $gagal++; 
                            $error_detail .= "Baris $baris: No Seri Awal/Akhir kosong untuk Kuasi.<br>";
                            continue;
                        }
                        
                        $prefix_awal = preg_replace('/[0-9]/', '', $nomor_awal);
                        $str_angka_awal = preg_replace('/[^0-9]/', '', $nomor_awal);
                        $str_angka_akhir = preg_replace('/[^0-9]/', '', $nomor_akhir);
                        
                        $pad_length = strlen($str_angka_awal);
                        $num_awal = (int)$str_angka_awal;
                        $num_akhir = (int)$str_angka_akhir;
                        $selisih = $num_akhir - $num_awal + 1;
                        
                        if ($selisih != $jumlah) {
                            $gagal++; 
                            $error_detail .= "Baris $baris: Jumlah ($jumlah) tidak sesuai rentang seri ($selisih).<br>";
                            continue;
                        }
                    }

                    // 1. Cek Kategori
                    $stmt_kat = $pdo->prepare("SELECT id FROM kategori WHERE nama_kategori = ?");
                    $stmt_kat->execute([$nama_kategori]);
                    $kat = $stmt_kat->fetch();
                    if ($kat) {
                        $kategori_id = $kat['id'];
                    } else {
                        $pdo->prepare("INSERT INTO kategori (nama_kategori) VALUES (?)")->execute([$nama_kategori]);
                        $kategori_id = $pdo->lastInsertId();
                    }

                    // 2. Cek Barang
                    $stmt_brg = $pdo->prepare("SELECT id FROM barang WHERE nama_barang = ?");
                    $stmt_brg->execute([$nama_barang]);
                    $brg = $stmt_brg->fetch();
                    
                    if ($brg) {
                        $barang_id = $brg['id'];
                    } else {
                        $pdo->prepare("INSERT INTO barang (kategori_id, nama_barang, tipe, merk, satuan, jumlah_total, terpakai, sisa, harga_terakhir) VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?)")
                            ->execute([$kategori_id, $nama_barang, $tipe, $merk, $satuan, $harga_satuan]);
                        $barang_id = $pdo->lastInsertId();
                    }

                    // 3. Insert Barang Masuk
                    $val_dus = $is_kuasi ? $nomor_dus : null;
                    $val_awal = $is_kuasi ? $nomor_awal : null;
                    $val_akhir = $is_kuasi ? $nomor_akhir : null;

                    $pdo->prepare("INSERT INTO barang_masuk (barang_id, jumlah, harga_satuan, sumber_dana, tanggal_masuk, nama_penyerah, nama_penerima, nomor_dus, nomor_awal, nomor_akhir) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
                        ->execute([$barang_id, $jumlah, $harga_satuan, $sumber_dana, $tgl_masuk, $penyerah, $penerima, $val_dus, $val_awal, $val_akhir]);

                    // 4. Insert Stok Kuasi (Jika Kuasi)
                    if ($is_kuasi) {
                        $pdo->prepare("INSERT INTO stok_kuasi (barang_id, nomor_dus, prefix_huruf, panjang_digit, digit_awal, digit_akhir, digit_sekarang, sisa_lembar, tanggal_masuk) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
                            ->execute([$barang_id, $nomor_dus, $prefix_awal, $pad_length, $num_awal, $num_akhir, $num_awal, $jumlah, $tgl_masuk]);
                    }

                    // 5. Update Master Barang
                    $pdo->prepare("UPDATE barang SET jumlah_total = jumlah_total + ?, sisa = sisa + ?, harga_terakhir = ? WHERE id = ?")
                        ->execute([$jumlah, $jumlah, $harga_satuan, $barang_id]);

                    $berhasil++;
                }
                
                fclose($file);
                $pdo->commit();

                $pesan = "<b>Proses Import Selesai!</b><br>Berhasil ditambahkan: $berhasil baris.<br>Gagal/Dilewati: $gagal baris.<br><small class='text-danger'>$error_detail</small>";
                $status = "success";

            } catch (Exception $e) {
                $pdo->rollBack();
                $pesan = "Import gagal diproses. Periksa format CSV dan data setiap baris.";
                error_log('import_data error: ' . $e->getMessage());
                $status = "danger";
            }
        } else {
            $pesan = "Ukuran file terlalu besar (Maksimal 5MB).";
            $status = "warning";
        }
    } else {
        $pesan = "Format file tidak diizinkan! Wajib .csv";
        $status = "danger";
    }
}
?>

require 'header.php';
?>

<div class="page-head"><div><h1>Import Data Barang</h1><p>Impor data persediaan secara massal menggunakan format CSV yang tersedia.</p></div><div class="head-actions"><a href="index.php" class="btn btn-soft-primary"><i class="fa-solid fa-arrow-left me-2"></i>Dashboard</a></div></div>

<div class="container mt-4 mb-5">
        <?php if ($pesan != ""): ?>
            <div class="alert alert-<?= $status; ?> alert-dismissible fade show shadow-sm" role="alert">
                <i class="fas <?= $status == 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'; ?> me-2 mt-1 float-start fs-4"></i>
                <div class="ms-4"><?= $pesan; ?></div>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        <?php endif; ?>

        <div class="card">
            <div class="card-header bg-white py-3">
                <h5 class="text-gov-primary fw-bold mb-0"><i class="fas fa-file-import me-2"></i> Modul Import Data Masal (V2 - Support Kuasi)</h5>
            </div>
            <div class="card-body p-4">
                
                <div class="alert alert-warning mb-4">
                    <h6 class="fw-bold text-dark"><i class="fas fa-exclamation-circle me-2"></i> Struktur Kolom Terbaru (Ada 14 Kolom)</h6>
                    <p class="mb-2 small text-dark">Gunakan pemisah <b>titik koma (;)</b>. Kolom 12, 13, dan 14 wajib diisi jika Kategori mengandung kata "Kuasi", jika tidak biarkan kosong (tanda strip).</p>
                    
                    <div class="table-responsive bg-white mt-2 p-2 rounded border">
                        <table class="table table-bordered table-sm mb-0 text-nowrap small">
                            <thead class="table-dark">
                                <tr>
                                    <th>Kategori</th>
                                    <th>Nama Brg</th>
                                    <th>Merk</th>
                                    <th>Tipe</th>
                                    <th>Satuan</th>
                                    <th>Jml</th>
                                    <th>Harga</th>
                                    <th>Sumber Dana</th>
                                    <th>Tgl Masuk</th>
                                    <th>Penyerah</th>
                                    <th>Penerima</th>
                                    <th class="bg-warning text-dark">No Dus</th>
                                    <th class="bg-warning text-dark">Seri Awal</th>
                                    <th class="bg-warning text-dark">Seri Akhir</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Barang Kuasi</td>
                                    <td>SKPD PKB</td>
                                    <td>-</td>
                                    <td>-</td>
                                    <td>Lembar</td>
                                    <td>1000</td>
                                    <td>500</td>
                                    <td>APBD</td>
                                    <td>2026-01-02</td>
                                    <td>Saldo Awal</td>
                                    <td>Sistem</td>
                                    <td class="bg-light">411</td>
                                    <td class="bg-light">A-0001</td>
                                    <td class="bg-light">A-1000</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <form method="POST" action="" enctype="multipart/form-data" class="border border-info p-4 rounded text-center" style="background-color: #f0f8ff;">
                    <?= csrf_field(); ?>
                    <i class="fas fa-cloud-upload-alt fa-4x text-info mb-3"></i>
                    <h5 class="fw-bold text-dark mb-4">Pilih File CSV Anda</h5>
                    
                    <div class="mb-4">
                        <input class="form-control form-control-lg w-75 mx-auto border-info shadow-sm" type="file" name="file_csv" accept=".csv" required>
                    </div>
                    
                    <button type="submit" name="import" class="btn btn-primary btn-lg fw-bold shadow px-5" style="background-color: var(--gov-primary);">
                        <i class="fas fa-file-import me-2"></i> Eksekusi Import Data
                    </button>
                </form>

            </div>
        </div>

<?php require 'footer.php'; ?>
