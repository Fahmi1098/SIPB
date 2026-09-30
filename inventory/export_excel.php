<?php
require 'cek_login.php';
require 'koneksi.php';

// ========================================================
// AMBIL DATA KEPALA UPTD SECARA DINAMIS DARI TABEL PEGAWAI
// ========================================================
$stmt_kepala = $pdo->query("SELECT nama_pegawai, nip, jabatan FROM pegawai WHERE jabatan LIKE '%Kepala UPTD%' LIMIT 1");
$kepala = $stmt_kepala->fetch(PDO::FETCH_ASSOC);

$nama_kepala = $kepala ? strtoupper($kepala['nama_pegawai']) : '...................................';
$nip_kepala = ($kepala && !empty($kepala['nip'])) ? $kepala['nip'] : '...................................';
$jabatan_kepala = ($kepala && !empty($kepala['jabatan'])) ? $kepala['jabatan'] : 'Kepala UPTD PPD Malingping';

// Pengaturan Tanggal Indonesia
$bulan_indo = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
$tgl_sekarang = date('d') . ' ' . $bulan_indo[date('n')] . ' ' . date('Y');

// Header untuk memaksa browser mengunduh file sebagai Excel (.xls)
$nama_file = "Laporan_Rekap_Aset_UPTD_" . date('Y-m-d') . ".xls";
header("Content-type: application/vnd-ms-excel");
header("Content-Disposition: attachment; filename={$nama_file}");
header("Pragma: no-cache");
header("Expires: 0");
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <style>
        /* CSS Khusus agar Excel mengenali tipe data */
        .str { mso-number-format:\@; } /* Format teks murni (untuk NIP atau Kode) */
        .num { mso-number-format:0; }  /* Format angka bulat */
    </style>
</head>
<body>

    <table border="0" style="width: 100%;">
        <tr>
            <td colspan="8" style="text-align: center; font-weight: bold; font-size: 14pt;">PEMERINTAH PROVINSI BANTEN</td>
        </tr>
        <tr>
            <td colspan="8" style="text-align: center; font-weight: bold; font-size: 14pt;">BADAN PENDAPATAN DAERAH</td>
        </tr>
        <tr>
            <td colspan="8" style="text-align: center; font-weight: bold; font-size: 16pt;">UNIT PELAKSANA TEKNIS DAERAH (UPTD) PENGELOLAAN PENDAPATAN DAERAH MALINGPING</td>
        </tr>
        <tr>
            <td colspan="8" style="text-align: center; font-size: 11pt;">Jl. Raya Malingping-Bayah, Kab. Lebak, Banten</td>
        </tr>
        <tr><td colspan="8"></td></tr> <tr>
            <td colspan="8" style="text-align: center; font-weight: bold; font-size: 12pt; text-decoration: underline;">
                LAPORAN REKAPITULASI PERSEDIAAN BARANG HABIS PAKAI (ASET)
            </td>
        </tr>
        <tr>
            <td colspan="8" style="text-align: center; font-style: italic;">
                Kondisi Stok per Tanggal: <?= $tgl_sekarang; ?>
            </td>
        </tr>
        <tr><td colspan="8"></td></tr>
    </table>

    <table border="1" style="width: 100%; border-collapse: collapse;">
        <thead style="background-color: #003366; color: #ffffff;">
            <tr>
                <th style="padding: 10px; width: 50px;">NO</th>
                <th style="padding: 10px; width: 200px;">KATEGORI</th>
                <th style="padding: 10px; width: 350px;">NAMA BARANG</th>
                <th style="padding: 10px; width: 200px;">MERK / TIPE</th>
                <th style="padding: 10px; width: 100px;">SATUAN</th>
                <th style="padding: 10px; width: 150px;">SISA FISIK (STOK)</th>
                <th style="padding: 10px; width: 150px;">HARGA SATUAN (Rp)</th>
                <th style="padding: 10px; width: 200px;">TOTAL NILAI ASET (Rp)</th>
            </tr>
        </thead>
        <tbody>
            <?php
            $sql = "SELECT b.*, k.nama_kategori 
                    FROM barang b 
                    LEFT JOIN kategori k ON b.kategori_id = k.id 
                    ORDER BY k.nama_kategori, b.nama_barang";
            $stmt = $pdo->query($sql);
            $no = 1;
            $grand_total = 0;
            $total_item = 0;

            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $sisa = (int)$row['sisa'];
                $harga = isset($row['harga_terakhir']) ? (float)$row['harga_terakhir'] : 0;
                $nilai_aset = $sisa * $harga;
                
                $grand_total += $nilai_aset;
                $total_item += $sisa;

                echo "<tr>";
                echo "<td style='text-align: center; vertical-align: middle;'>{$no}</td>";
                echo "<td style='vertical-align: middle;'>" . htmlspecialchars($row['nama_kategori'] ?? '-') . "</td>";
                echo "<td style='vertical-align: middle; font-weight: bold;'>" . htmlspecialchars($row['nama_barang']) . "</td>";
                echo "<td style='vertical-align: middle;'>" . htmlspecialchars($row['merk'] . ' ' . $row['tipe']) . "</td>";
                echo "<td style='text-align: center; vertical-align: middle;'>" . htmlspecialchars($row['satuan']) . "</td>";
                echo "<td style='text-align: center; vertical-align: middle; font-weight: bold; font-size: 11pt; color: " . ($sisa <= 0 ? 'red' : 'black') . ";'>" . $sisa . "</td>";
                // Angka dikirim dengan class 'num' agar terbaca sebagai Number di Excel, bukan Text.
                echo "<td class='num' style='text-align: right; vertical-align: middle;'>" . $harga . "</td>";
                echo "<td class='num' style='text-align: right; vertical-align: middle; font-weight: bold;'>" . $nilai_aset . "</td>";
                echo "</tr>";
                $no++;
            }

            if ($no == 1) {
                echo "<tr><td colspan='8' style='text-align: center; padding: 20px;'>Belum ada data persediaan barang.</td></tr>";
            }
            ?>
        </tbody>
        <tfoot>
            <tr style="background-color: #f2f2f2; font-weight: bold; font-size: 11pt;">
                <td colspan="5" style="text-align: right; padding: 10px;">TOTAL KESELURUHAN ASET:</td>
                <td style="text-align: center; padding: 10px;"><?= $total_item; ?></td>
                <td></td>
                <td class='num' style="text-align: right; padding: 10px; color: #003366;"><?= $grand_total; ?></td>
            </tr>
        </tfoot>
    </table>
    
    <br><br>
    
    <table border="0" style="width: 100%;">
        <tr>
            <td colspan="5"></td>
            <td colspan="3" style="text-align: center; font-size: 11pt;">
                Malingping, <?= $tgl_sekarang; ?><br>
                Mengetahui,<br>
                <?= htmlspecialchars($jabatan_kepala); ?><br>
                <br><br><br><br><br>
                <b><u><?= $nama_kepala; ?></u></b><br>
                <span class="str">NIP. <?= $nip_kepala; ?></span>
            </td>
        </tr>
    </table>

</body>
</html>