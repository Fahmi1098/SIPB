<?php 
require 'cek_login.php'; 
require 'koneksi.php'; 

// Panggil Header
require 'header.php';
?>

<div class="container-fluid px-4 mt-4 mb-5">
    
    <div class="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 class="h3 mb-0 text-gray-800 fw-bold" style="color: var(--gov-primary);">Informasi Stok Dokumen Kuasi</h1>
        <a href="barang_keluar.php" class="btn btn-danger fw-bold shadow-sm">
            <i class="fas fa-dolly me-1"></i> Distribusikan Kuasi
        </a>
    </div>

    <div class="alert alert-warning shadow-sm border-warning border-start border-4 py-3">
        <div class="d-flex align-items-center">
            <i class="fas fa-info-circle fa-2x text-warning me-3"></i>
            <div>
                <h6 class="fw-bold mb-1">Laporan Batch FIFO (First-In First-Out)</h6>
                <p class="mb-0 small text-dark">Tabel ini menampilkan sisa dokumen ber-seri (SKPD, Karcis, dll) yang <b>masih ada secara fisik di gudang</b>. Sistem akan otomatis mendistribusikan dari tumpukan (batch) yang tanggal masuknya paling lama.</p>
            </div>
        </div>
    </div>

    <div class="card shadow-sm border-0 h-100" style="border-top: 4px solid var(--gov-accent);">
        <div class="card-header bg-white py-3">
            <h6 class="mb-0 fw-bold text-dark"><i class="fas fa-barcode me-2 text-warning"></i> Detail Rentang Nomor Seri Tersedia</h6>
        </div>
        <div class="card-body p-4">
            <div class="table-responsive">
                <table class="table table-hover table-bordered align-middle mb-0 tabel-data" style="width:100%">
                    <thead class="text-center" style="background-color: var(--gov-primary); color: white;">
                        <tr>
                            <th width="5%">No</th>
                            <th width="20%">Spesifikasi Dokumen</th>
                            <th width="15%">Tgl Masuk (Batch)</th>
                            <th width="25%">Rentang Nomor Asli (Awal Masuk)</th>
                            <th width="20%">Nomor Tersedia Saat Ini<br><small class="fw-normal text-warning">(Yang akan keluar selanjutnya)</small></th>
                            <th width="15%">Sisa Lembar Fisik</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white">
                        <?php
                        $no = 1;
                        // Query hanya mengambil Kuasi yang sisa lembarnya > 0
                        $sql = "SELECT s.*, b.nama_barang, b.satuan 
                                FROM stok_kuasi s 
                                JOIN barang b ON s.barang_id = b.id 
                                WHERE s.sisa_lembar > 0 
                                ORDER BY b.nama_barang ASC, s.tanggal_masuk ASC, s.id ASC";
                        $stmt = $pdo->query($sql);
                        
                        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                            // Format Tanggal
                            $tgl_masuk = date('d/m/Y', strtotime($row['tanggal_masuk']));
                            $tgl_asli = $row['tanggal_masuk']; // Untuk sorting DataTables
                            
                            $prefix = $row['prefix_huruf'];
                            $pad = $row['panjang_digit'];

                            // 1. Rentang Asli (Saat barang pertama kali diinput)
                            $asli_awal = $prefix . str_pad($row['digit_awal'], $pad, '0', STR_PAD_LEFT);
                            $asli_akhir = $prefix . str_pad($row['digit_akhir'], $pad, '0', STR_PAD_LEFT);
                            $rentang_asli = "{$asli_awal} <i class='fas fa-arrow-right text-muted mx-1'></i> {$asli_akhir}";

                            // 2. Rentang Tersedia Saat Ini (Bisa jadi sudah berkurang/terpakai)
                            $tersedia_awal = $prefix . str_pad($row['digit_sekarang'], $pad, '0', STR_PAD_LEFT);
                            // digit_akhir tetap menggunakan digit_akhir asli dari tabel
                            $rentang_tersedia = "{$tersedia_awal} <i class='fas fa-arrow-right text-muted mx-1'></i> {$asli_akhir}";

                            // Menandai jika tumpukan ini adalah "Antrean Pertama" yang akan ditarik sistem
                            $antrean_badge = "";
                            if ($no == 1 || $prev_barang != $row['nama_barang']) {
                                $antrean_badge = "<br><span class='badge bg-success mt-1 shadow-sm'>Antrean Pertama</span>";
                            }
                            $prev_barang = $row['nama_barang'];

                            echo "<tr>
                                    <td class='text-center'>{$no}</td>
                                    <td class='fw-bold text-dark'>" . htmlspecialchars($row['nama_barang']) . "</td>
                                    <td class='text-center' data-order='{$tgl_asli}'>{$tgl_masuk}</td>
                                    <td class='text-center text-muted small'>{$rentang_asli}</td>
                                    <td class='text-center fw-bold text-primary fs-6' style='background-color: #f8fbff;'>
                                        {$rentang_tersedia}
                                        {$antrean_badge}
                                    </td>
                                    <td class='text-center' data-order='{$row['sisa_lembar']}'>
                                        <span class='fs-5 fw-bold text-success'>{$row['sisa_lembar']}</span> <span class='text-muted small'>{$row['satuan']}</span>
                                    </td>
                                  </tr>";
                            $no++;
                        }
                        ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<?php 
// Panggil Footer
require 'footer.php'; 
?>