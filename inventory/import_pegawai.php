<?php
require 'cek_login.php';
require 'koneksi.php';
require_once 'functions.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') { requireCsrf(); }
requireRole('admin');

$pesan = "";
$status = "";

if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_FILES['file_csv'])) {
    $file_mimes = array('text/x-comma-separated-values', 'text/comma-separated-values', 'application/octet-stream', 'application/vnd.ms-excel', 'application/x-csv', 'text/x-csv', 'text/csv', 'application/csv', 'application/excel', 'application/vnd.msexcel', 'text/plain');
    
    if (isset($_FILES['file_csv']['name']) && in_array($_FILES['file_csv']['type'], $file_mimes)) {
        
        $arr_file = explode('.', $_FILES['file_csv']['name']);
        $extension = end($arr_file);
        
        if ('csv' == strtolower($extension)) {
            $file = $_FILES['file_csv']['tmp_name'];
            
            // Coba deteksi pemisah (koma atau titik koma)
            $handle = fopen($file, "r");
            $first_line = fgets($handle);
            $delimiter = (strpos($first_line, ';') !== false) ? ';' : ',';
            rewind($handle); // Kembalikan ke baris pertama
            
            $sukses = 0;
            $diperbarui = 0;
            $baris = 0;
            
            try {
                $pdo->beginTransaction();
                
                // Lewati baris pertama (Header: nama_pegawai, nip, jabatan)
                fgetcsv($handle, 10000, $delimiter); 
                
                while (($data = fgetcsv($handle, 10000, $delimiter)) !== FALSE) {
                    $baris++;
                    
                    // PERBAIKAN URUTAN KOLOM UNTUK FILE 3 KOLOM:
                    // Index 0 = Nama, Index 1 = NIP, Index 2 = Jabatan
                    $nama_pegawai = isset($data[0]) ? trim($data[0]) : '';
                    $nip          = isset($data[1]) ? trim($data[1]) : '-';
                    $jabatan      = isset($data[2]) ? trim($data[2]) : '';
                    
                    if (!empty($nama_pegawai)) {
                        // Cek apakah pegawai sudah ada di database berdasarkan Nama
                        $stmt_cek = $pdo->prepare("SELECT id FROM pegawai WHERE nama_pegawai = ?");
                        $stmt_cek->execute([$nama_pegawai]);
                        
                        if ($stmt_cek->rowCount() > 0) {
                            $stmt_update = $pdo->prepare("UPDATE pegawai SET nip = ?, jabatan = ? WHERE nama_pegawai = ?");
                            $stmt_update->execute([$nip, $jabatan, $nama_pegawai]);
                            $diperbarui++;
                        } else {
                            $stmt_insert = $pdo->prepare("INSERT INTO pegawai (nama_pegawai, nip, jabatan) VALUES (?, ?, ?)");
                            $stmt_insert->execute([$nama_pegawai, $nip, $jabatan]);
                            $sukses++;
                        }
                    }
                }
                
                fclose($handle);
                $pdo->commit();
                
                $pesan = "<b>Proses Selesai!</b><br> Berhasil menambahkan <b>$sukses</b> pegawai baru dan memperbarui <b>$diperbarui</b> data.";
                $status = "success";
                
            } catch (Exception $e) {
                $pdo->rollBack();
                $pesan = "Terjadi kesalahan pada proses import. Periksa format dan isi CSV.";
                error_log('import_pegawai error line ' . $baris . ': ' . $e->getMessage());
                $status = "danger";
            }
        } else {
            $pesan = "Format file tidak valid. Pastikan Anda mengunggah file berekstensi .csv!";
            $status = "danger";
        }
    } else {
        $pesan = "Silakan pilih file CSV terlebih dahulu.";
        $status = "warning";
    }
}

require 'header.php';
?>

<div class="container-fluid px-4 mt-4 mb-5">
    <div class="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 class="h3 mb-0 text-gray-800 fw-bold" style="color: var(--gov-primary);">Import Data Pegawai (Format 3 Kolom)</h1>
    </div>

    <?php if ($pesan != ""): ?>
        <div class="alert alert-<?= $status; ?> alert-dismissible fade show shadow-sm" role="alert">
            <i class="fas <?= $status == 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'; ?> me-2 mt-1 float-start fs-4"></i>
            <div class="ms-4"><?= $pesan; ?></div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    <?php endif; ?>

    <div class="row">
        <div class="col-lg-12 mb-4">
            <div class="card shadow-sm border-0 h-100" style="border-top: 4px solid var(--gov-primary);">
                <div class="card-body p-5 text-center">
                    <i class="fas fa-file-csv text-success mb-3" style="font-size: 4rem;"></i>
                    <h4 class="fw-bold text-dark mb-3">Upload File CSV Pegawai</h4>
                    <p class="text-muted mb-4">Pastikan Anda mengunggah file <b>pegawai_siap_import.csv</b> yang hanya berisi 3 kolom (Nama, NIP, Jabatan).</p>
                    
                    <form action="" method="POST" enctype="multipart/form-data" class="w-50 mx-auto">
                        <?= csrf_field(); ?>
                        <div class="mb-4">
                            <input class="form-control form-control-lg border-primary" type="file" name="file_csv" id="file_csv" accept=".csv" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-lg w-100 fw-bold shadow-sm" style="background-color: var(--gov-primary);">
                            <i class="fas fa-cloud-upload-alt me-2"></i> Proses Import
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

<?php require 'footer.php'; ?>
