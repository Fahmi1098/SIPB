<?php
require 'cek_login.php'; 
require 'koneksi.php';

if (!isset($_GET['id'])) {
    die("ID transaksi tidak ditemukan!");
}

$id_transaksi = (int)$_GET['id'];

// Fungsi Terbilang (Mengubah Angka menjadi Huruf)
function penyebut($nilai) {
    $nilai = abs($nilai);
    $huruf = array("", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas");
    $temp = "";
    if ($nilai < 12) {
        $temp = " ". $huruf[$nilai];
    } else if ($nilai <20) {
        $temp = penyebut($nilai - 10). " Belas";
    } else if ($nilai < 100) {
        $temp = penyebut($nilai/10)." Puluh". penyebut($nilai % 10);
    } else if ($nilai < 200) {
        $temp = " Seratus" . penyebut($nilai - 100);
    } else if ($nilai < 1000) {
        $temp = penyebut($nilai/100) . " Ratus" . penyebut($nilai % 100);
    } else if ($nilai < 2000) {
        $temp = " Seribu" . penyebut($nilai - 1000);
    } else if ($nilai < 1000000) {
        $temp = penyebut($nilai/1000) . " Ribu" . penyebut($nilai % 1000);
    }
    return $temp;
}
function terbilang($nilai) {
    return ucwords(trim(penyebut($nilai)));
}

// Ambil data Header
$stmt_header = $pdo->prepare("SELECT * FROM transaksi_keluar WHERE id = ?");
$stmt_header->execute([$id_transaksi]);
$header = $stmt_header->fetch(PDO::FETCH_ASSOC);

if (!$header) {
    die("Transaksi tidak ditemukan!");
}

// ========================================================
// LOGIKA PENENTU LABEL NIP / NIPPPK (Penerima & Penyerah)
// ========================================================
$stmt_penerima = $pdo->prepare("SELECT status_pegawai FROM pegawai WHERE nama_pegawai = ? LIMIT 1");
$stmt_penerima->execute([$header['penerima_nama']]);
$status_penerima = $stmt_penerima->fetchColumn();
$label_nip_penerima = ($status_penerima == 'PPPK') ? 'NIPPPK.' : 'NIP.';

$stmt_penyerah = $pdo->prepare("SELECT status_pegawai FROM pegawai WHERE nama_pegawai = ? LIMIT 1");
$stmt_penyerah->execute([$header['penyerah_nama']]);
$status_penyerah = $stmt_penyerah->fetchColumn();
$label_nip_penyerah = ($status_penyerah == 'PPPK') ? 'NIPPPK.' : 'NIP.';

// Ambil data Detail Barang beserta Nomorator dan Kategori
$stmt_detail = $pdo->prepare("
    SELECT d.jumlah, d.nomor_awal, d.nomor_dus, b.id as barang_id, b.nama_barang, b.merk, b.tipe, b.satuan, b.harga_terakhir, LOWER(k.nama_kategori) as kategori 
    FROM detail_barang_keluar d 
    JOIN barang b ON d.barang_id = b.id 
    LEFT JOIN kategori k ON b.kategori_id = k.id
    WHERE d.transaksi_keluar_id = ?
");
$stmt_detail->execute([$id_transaksi]);
$details = $stmt_detail->fetchAll(PDO::FETCH_ASSOC);

// Pisahkan barang biasa dan barang Kuasi untuk keperluan BAST
$details_regular = [];
$details_kuasi = [];
foreach ($details as $d) {
    if (strpos($d['kategori'], 'kuasi') !== false) {
        $details_kuasi[] = $d;
    } else {
        $details_regular[] = $d;
    }
}

// ========================================================
// AMBIL DATA KEPALA UPTD SECARA DINAMIS DARI TABEL PEGAWAI
// ========================================================
$stmt_kepala = $pdo->query("SELECT nama_pegawai, nip, jabatan, status_pegawai FROM pegawai WHERE jabatan LIKE '%Kepala UPTD%' LIMIT 1");
$kepala = $stmt_kepala->fetch(PDO::FETCH_ASSOC);
$nama_kepala = $kepala ? strtoupper($kepala['nama_pegawai']) : '...................................';
$nip_kepala = ($kepala && !empty($kepala['nip'])) ? $kepala['nip'] : '...................................';
$jabatan_kepala = ($kepala && !empty($kepala['jabatan'])) ? $kepala['jabatan'] : 'Kepala UPTD PPD Malingping';
$status_kepala = $kepala ? $kepala['status_pegawai'] : 'PNS';
$label_nip_kepala = ($status_kepala == 'PPPK') ? 'NIPPPK.' : 'NIP.';


// Helper Tanggal & Bulan
$timestamp = strtotime($header['tanggal_keluar']);
$tanggal_indo = date('d-m-Y', $timestamp);
$bulan_angka = date('n', $timestamp);
$tahun = date('Y', $timestamp);
$tgl_full = date('d', $timestamp) . ' ';

$nama_bulan = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
$bulan_romawi = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
$tgl_full .= $nama_bulan[$bulan_angka] . ' ' . $tahun;

// Data Khusus BAST (Format Terbilang)
$hari_array = array('Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu');
$nama_hari = $hari_array[date('w', $timestamp)];
$tgl_huruf = terbilang(date('j', $timestamp));
$tahun_huruf = terbilang($tahun);

$tujuan_ruangan = htmlspecialchars($header['tujuan_ruangan'] ?? 'Umum');
$id_str = str_pad($id_transaksi, 3, '0', STR_PAD_LEFT);
$nomor_dokumen_lama = $id_str . "/UPTD.PPD.MLP/" . $bulan_romawi[$bulan_angka] . "/" . $tahun;
$nomor_nota = "000.2.3.1/" . $id_str . "/UPTD.PPD.MLP/" . $tahun;

?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cetak Semua Dokumen - Transaksi #<?= $id_transaksi ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { background-color: #f4f6f9; padding: 20px; font-family: 'Times New Roman', Times, serif; }
        .btn-cetak { position: fixed; bottom: 20px; right: 20px; z-index: 1000; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
        
        .dokumen-card { margin-bottom: 30px; page-break-after: always; }
        .kertas-potrait { background: white; padding: 1.5cm 2cm; box-shadow: 0 0 10px rgba(0,0,0,0.1); width: 21cm; min-height: 29.7cm; margin: 0 auto; box-sizing: border-box; }
        .kertas-landscape { background: white; padding: 1.5cm 2cm; box-shadow: 0 0 10px rgba(0,0,0,0.1); width: 29.7cm; min-height: 21cm; margin: 0 auto; box-sizing: border-box; }
        
        @media print {
            .btn-cetak, .no-print { display: none; }
            body { background: white; padding: 0; margin: 0; }
            @page { size: A4 portrait; margin: 0; }
            @page landscape_page { size: A4 landscape; margin: 0; }
            .kertas-landscape { page: landscape_page; width: 100%; height: auto; box-shadow: none; padding: 1cm 1.5cm; }
            .kertas-potrait { width: 100%; height: auto; box-shadow: none; padding: 1cm 1.5cm; }
            .dokumen-card { page-break-after: always; margin: 0; padding: 0; border: none; }
            .garis-kop { border-bottom: 3px solid black !important; }
            .garis-nota { border-bottom: 1.5px solid black !important; }
        }
        
        .kop-surat { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
        .kop-teks { text-align: center; }
        .kop-teks h4, .kop-teks h3, .kop-teks h2 { margin: 0; font-weight: bold; line-height: 1.2; }
        .kop-teks h4 { font-size: 14pt; }
        .kop-teks h3 { font-size: 16pt; }
        .kop-teks h2 { font-size: 14pt; margin-top: 5px;}
        .kop-alamat { margin: 5px 0 0 0; font-size: 11pt; }
        
        .garis-kop { border-bottom: 3px solid black; width: 100%; margin-bottom: 20px; }
        .garis-nota { border-bottom: 1.5px solid black; width: 100%; margin-bottom: 20px; margin-top: 10px; }
        
        .judul-dokumen { text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 20px; text-decoration: underline; }
        
        table.tabel-barang { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.tabel-barang th, .tabel-barang td { border: 1px solid black; padding: 6px; text-align: center; font-size: 10pt;}
        table.tabel-barang td.kiri { text-align: left; padding-left: 8px;}
        table.tabel-barang td.kanan { text-align: right; padding-right: 8px;}
        
        table.ttd-table { width: 100%; text-align: center; margin-top: 30px; border-collapse: collapse; border: none;}
        table.ttd-table td { border: none; padding: 2px 5px; vertical-align: top; font-size: 11pt;}
        .ttd-nama { font-weight: bold; text-decoration: underline; }
    </style>
</head>
<body>

<div class="container-fluid">
    <div class="no-print mb-4 text-center">
        <div class="alert alert-info d-inline-block shadow-sm">
            <i class="fas fa-print me-2"></i>
            <strong>Cetak 3 Dokumen Sekaligus</strong> (Nota Dinas, BAST, dan BEND-29)<br>
            <small>Sistem akan mencetak BAST terpisah jika terdapat barang Kuasi.</small>
        </div>
    </div>

    <div class="dokumen-card">
        <div class="kertas-potrait">
            <table class="kop-surat">
                <tr>
                    <td style="width: 15%; text-align: center; vertical-align: middle;">
                        <img src="logo_banten.png" style="width: 90px; height: auto;" alt="Logo Banten">
                    </td>
                    <td style="width: 70%;" class="kop-teks">
                        <h4>PEMERINTAH PROVINSI BANTEN</h4>
                        <h3>BADAN PENDAPATAN DAERAH</h3>
                        <h2>UPTD PENGELOLAAN PENDAPATAN DAERAH MALINGPING</h2>
                        <p class="kop-alamat">
                            Jl. Baru Simpang - Beyeh Kec. Malingping<br>
                            Email samsat.malingping.official@gmail.com Kode Pos. 42391
                        </p>
                    </td>
                    <td style="width: 15%;"></td>
                </tr>
            </table>
            <div class="garis-kop"></div>

            <div class="judul-dokumen" style="margin-bottom: 20px; text-decoration: none;">NOTA DINAS</div>
            
            <table style="width: 100%; border: none; margin-bottom: 5px; font-size: 11pt;">
                <tr>
                    <td style="width: 15%; vertical-align: top;">Kepada</td>
                    <td style="width: 2%; vertical-align: top;">:</td>
                    <td style="width: 83%; vertical-align: top;">Yth. <?= htmlspecialchars($jabatan_kepala); ?></td>
                </tr>
                <tr>
                    <td style="vertical-align: top;">Dari</td>
                    <td style="vertical-align: top;">:</td>
                    <td style="vertical-align: top;"><?= htmlspecialchars($header['penerima_jabatan']); ?></td>
                </tr>
                <tr>
                    <td style="vertical-align: top;">Nomor</td>
                    <td style="vertical-align: top;">:</td>
                    <td style="vertical-align: top;"><?= $nomor_nota; ?></td>
                </tr>
                <tr>
                    <td style="vertical-align: top;">Tanggal</td>
                    <td style="vertical-align: top;">:</td>
                    <td style="vertical-align: top;"><?= $tgl_full; ?></td>
                </tr>
                <tr>
                    <td style="vertical-align: top;">Lampiran</td>
                    <td style="vertical-align: top;">:</td>
                    <td style="vertical-align: top;">1 (satu) Lembar</td>
                </tr>
                <tr>
                    <td style="vertical-align: top;">Hal</td>
                    <td style="vertical-align: top;">:</td>
                    <td style="vertical-align: top;">Permintaan Barang Habis Pakai</td>
                </tr>
            </table>

            <div class="garis-nota"></div>

            <p style="text-align: justify; line-height: 1.5; margin-bottom: 10px;">
                Sehubungan Dengan Kebutuhan Barang Habis Pakai Pada <strong><?= $tujuan_ruangan ?></strong> Disampaikan Rincian Kebutuhan Sebagai Berikut:
            </p>

            <table class="tabel-barang">
                <thead style="background-color: #f2f2f2;">
                    <tr>
                        <th style="width: 5%;">NO</th>
                        <th style="width: 45%;">NAMA BARANG</th>
                        <th style="width: 15%;">JUMLAH</th>
                        <th style="width: 15%;">SATUAN</th>
                        <th style="width: 20%;">KETERANGAN</th>
                    </tr>
                </thead>
                <tbody>
                    <?php $no = 1; foreach($details as $d): ?>
                    <tr>
                        <td class="text-center"><?= $no++; ?></td>
                        <td class="kiri"><?= htmlspecialchars($d['nama_barang']); ?></td>
                        <td class="text-center"><?= number_format($d['jumlah']); ?></td>
                        <td class="text-center"><?= htmlspecialchars($d['satuan']); ?></td>
                        <td></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>

            <p style="text-align: justify; line-height: 1.5; margin-top: 20px;">
                Demikian disampaikan, atas perhatian dan kebijaksanaannya diucapkan terima kasih.
            </p>

            <table class="ttd-table" style="margin-top: 40px;">
                <tr>
                    <td style="width: 60%;"></td>
                    <td style="width: 40%;">
                        <?= htmlspecialchars($header['penerima_jabatan']); ?>
                    </td>
                </tr>
                <tr>
                    <td style="height: 80px;"></td>
                    <td style="height: 80px;"></td>
                </tr>
                <tr>
                    <td style="vertical-align: bottom;"></td>
                    <td style="vertical-align: bottom;">
                        <span class="ttd-nama"><?= strtoupper(htmlspecialchars($header['penerima_nama'])); ?></span><br>
                        <?= $label_nip_penerima ?> <?= htmlspecialchars($header['penerima_nip'] ?: '-'); ?>
                    </td>
                </tr>
            </table>
        </div>
    </div>

    <?php if (count($details_regular) > 0): ?>
    <div class="dokumen-card">
        <div class="kertas-potrait">
            <table class="kop-surat">
                <tr>
                    <td style="width: 15%; text-align: center; vertical-align: middle;">
                        <img src="logo_banten.png" style="width: 90px; height: auto;" alt="Logo Banten">
                    </td>
                    <td style="width: 70%;" class="kop-teks">
                        <h4>PEMERINTAH PROVINSI BANTEN</h4>
                        <h3>BADAN PENDAPATAN DAERAH</h3>
                        <h2>UPTD PENGELOLAAN PENDAPATAN DAERAH MALINGPING</h2>
                        <p class="kop-alamat">
                            Jl. Baru Simpang - Beyeh Kec. Malingping<br>
                            Email samsat.malingping.official@gmail.com Kode Pos. 42391
                        </p>
                    </td>
                    <td style="width: 15%;"></td>
                </tr>
            </table>
            <div class="garis-kop"></div>

            <div class="judul-dokumen">BERITA ACARA SERAH TERIMA BARANG</div>
            
            <p style="text-align: justify; line-height: 1.5;">
                Pada Hari <strong><?= $nama_hari ?></strong> Tanggal <strong><?= $tgl_huruf ?></strong> Bulan <strong><?= $nama_bulan[$bulan_angka] ?></strong> Tahun <strong><?= $tahun_huruf ?></strong>, telah dilakukan serah terima barang habis pakai dari Pengurus Barang ke <strong><?= $tujuan_ruangan ?></strong> berupa barang-barang sebagai berikut:
            </p>

            <table class="tabel-barang">
                <thead style="background-color: #f2f2f2;">
                    <tr>
                        <th style="width: 5%;">NO</th>
                        <th style="width: 35%;">NAMA BARANG</th>
                        <th style="width: 20%;">MEREK/ TIPE</th>
                        <th style="width: 10%;">JUMLAH</th>
                        <th style="width: 10%;">SATUAN</th>
                        <th style="width: 20%;">KETERANGAN</th>
                    </tr>
                </thead>
                <tbody>
                    <?php $no = 1; foreach($details_regular as $d): ?>
                    <tr>
                        <td class="text-center"><?= $no++; ?></td>
                        <td class="kiri"><?= htmlspecialchars($d['nama_barang']); ?></td>
                        <td class="text-center"><?= htmlspecialchars($d['merk'] . ' ' . $d['tipe']); ?></td>
                        <td class="text-center"><?= htmlspecialchars($d['jumlah']); ?></td>
                        <td class="text-center"><?= htmlspecialchars($d['satuan']); ?></td>
                        <td></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            
            <p style="text-align: justify; line-height: 1.5;">
                Barang-barang tersebut diserahkan dalam kondisi baik dan siap digunakan sesuai dengan kebutuhan operasional.<br>
                Demikian Berita Acara Serah Terima Barang ini dibuat untuk digunakan sebagaimana mestinya.
            </p>

            <table class="ttd-table" style="margin-top: 50px;">
                <tr>
                    <td style="width: 50%;">Yang Menyerahkan,</td>
                    <td style="width: 50%;">Yang Menerima,</td>
                </tr>
                <tr>
                    <td style="height: 80px;"></td>
                    <td style="height: 80px;"></td>
                </tr>
                <tr>
                    <td style="vertical-align: bottom;">
                        <span class="ttd-nama"><?= strtoupper(htmlspecialchars($header['penyerah_nama'])); ?></span><br>
                        <?= $label_nip_penyerah ?> <?= htmlspecialchars($header['penyerah_nip'] ?: '-'); ?>
                    </td>
                    <td style="vertical-align: bottom;">
                        <span class="ttd-nama"><?= strtoupper(htmlspecialchars($header['penerima_nama'])); ?></span><br>
                        <?= $label_nip_penerima ?> <?= htmlspecialchars($header['penerima_nip'] ?: '-'); ?>
                    </td>
                </tr>
            </table>
        </div>
    </div>
    <?php endif; ?>

    <?php if (count($details_kuasi) > 0): ?>
    <div class="dokumen-card">
        <div class="kertas-potrait">
            <table class="kop-surat">
                <tr>
                    <td style="width: 15%; text-align: center; vertical-align: middle;">
                        <img src="logo_banten.png" style="width: 90px; height: auto;" alt="Logo Banten">
                    </td>
                    <td style="width: 70%;" class="kop-teks">
                        <h4>PEMERINTAH PROVINSI BANTEN</h4>
                        <h3>BADAN PENDAPATAN DAERAH</h3>
                        <h2>UPTD PENGELOLAAN PENDAPATAN DAERAH MALINGPING</h2>
                        <p class="kop-alamat">
                            Jl. Baru Simpang - Beyeh Kec. Malingping<br>
                            Email samsat.malingping.official@gmail.com Kode Pos. 42391
                        </p>
                    </td>
                    <td style="width: 15%;"></td>
                </tr>
            </table>
            <div class="garis-kop"></div>

            <div class="judul-dokumen" style="margin-bottom: 10px;">BERITA ACARA SERAH TERIMA BARANG<br>UPTD PPD MALINGPING</div>
            
            <p style="text-align: justify; line-height: 1.5;">
                Pada Hari <strong><?= $nama_hari ?></strong> Tanggal <strong><?= $tgl_huruf ?></strong> Bulan <strong><?= $nama_bulan[$bulan_angka] ?></strong> Tahun <strong><?= $tahun_huruf ?></strong>,<br>
                Menyerahkan Barang dari Gudang UPTD PPD Malingping ke <strong><?= $tujuan_ruangan ?></strong>:
            </p>

            <table class="tabel-barang">
                <thead style="background-color: #f2f2f2;">
                    <tr>
                        <th style="width: 5%;">No</th>
                        <th style="width: 20%;">Jenis Barang</th>
                        <th style="width: 8%;">No Dus</th>
                        <th style="width: 25%;">No Rator</th>
                        <th style="width: 12%;">Merk</th>
                        <th style="width: 8%;">Jumlah</th>
                        <th style="width: 10%;">Satuan</th>
                        <th style="width: 12%;">Keterangan</th>
                    </tr>
                </thead>
                <tbody>
                    <?php $no = 1; foreach($details_kuasi as $d): ?>
                    <tr>
                        <td class="text-center"><?= $no++; ?></td>
                        <td class="kiri"><?= htmlspecialchars($d['nama_barang']); ?></td>
                        <td class="text-center"><?= !empty($d['nomor_dus']) ? htmlspecialchars($d['nomor_dus']) : '-'; ?></td>
                        <td class="text-center"><?= htmlspecialchars($d['nomor_awal']); ?></td>
                        <td class="text-center"><?= htmlspecialchars($d['merk']); ?></td>
                        <td class="text-center"><?= htmlspecialchars($d['jumlah']); ?></td>
                        <td class="text-center"><?= htmlspecialchars($d['satuan']); ?></td>
                        <td class="text-center">Barang Kuasi</td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            
            <div style="text-align: justify; line-height: 1.5; margin-top: 15px;">
                Dengan ketentuan sebagai berikut:<br>
                1. Berita Acara Serah Terima SKPD Ini Sesuai Dengan Nomor Rator yang Tertera di Dalam Dus Atas Dasar Dokumentasi Penyerahan SKPD.;<br>
                2. Tidak diperkenankan mengalihkan Atau dimanfaatkan yang Bukan Semestinya;<br>
                3. Kasir Pelayanan yang Sudah Menerima SKPD Sesuai Poin 1 (Satu), bertanggung jawab atas segala kerusakan dan Kehilangan.
            </div>

            <table class="ttd-table" style="margin-top: 40px;">
                <tr>
                    <td style="width: 50%;">Yang Menyerahkan<br>Pengurus Barang Pembantu</td>
                    <td style="width: 50%;">Yang Menerima<br>Kordinator Pelayanan</td>
                </tr>
                <tr>
                    <td style="height: 80px;"></td>
                    <td style="height: 80px;"></td>
                </tr>
                <tr>
                    <td style="vertical-align: bottom;">
                        <span class="ttd-nama"><?= strtoupper(htmlspecialchars($header['penyerah_nama'])); ?></span><br>
                        <?= $label_nip_penyerah ?> <?= htmlspecialchars($header['penyerah_nip'] ?: '-'); ?>
                    </td>
                    <td style="vertical-align: bottom;">
                        <span class="ttd-nama"><?= strtoupper(htmlspecialchars($header['penerima_nama'])); ?></span><br>
                        <?= $label_nip_penerima ?> <?= htmlspecialchars($header['penerima_nip'] ?: '-'); ?>
                    </td>
                </tr>
            </table>
        </div>
    </div>
    <?php endif; ?>

    <div class="dokumen-card">
        <div class="kertas-landscape">
            <table class="kop-surat">
                <tr>
                    <td style="width: 15%; text-align: center; vertical-align: middle;">
                        <img src="logo_banten.png" style="width: 90px; height: auto;" alt="Logo Banten">
                    </td>
                    <td style="width: 70%;" class="kop-teks">
                        <h4>PEMERINTAH PROVINSI BANTEN</h4>
                        <h3>BADAN PENDAPATAN DAERAH</h3>
                        <h2>UPTD PENGELOLAAN PENDAPATAN DAERAH MALINGPING</h2>
                        <p class="kop-alamat">
                            Jl. Baru Simpang - Beyeh Kec. Malingping<br>
                            Email samsat.malingping.official@gmail.com Kode Pos. 42391
                        </p>
                    </td>
                    <td style="width: 15%;"></td>
                </tr>
            </table>
            <div class="garis-kop"></div>

            <table style="width: 100%; margin-bottom: 15px; font-size: 10pt; border:none;">
                <tr>
                    <td style="width: 65%; vertical-align: top; padding-right: 20px; border:none; text-align:left;">
                        <table style="width: 100%; border:none;">
                            <tr><td style="width: 250px; border:none; text-align:left;">BUKTI BARANG DARI DAERAH/UNIT</td><td style="border:none; text-align:left;">: <b>UPTD PPD Malingping</b></td></tr>
                            <tr><td style="border:none; text-align:left;">KEPADA DAERAH/UNIT/SAMSAT/GERAI/UPT</td><td style="border:none; text-align:left;">: <b><?= $tujuan_ruangan ?></b></td></tr>
                        </table>
                    </td>
                    <td style="width: 35%; vertical-align: top; border:none;">
                        <table border="1" style="width: 100%; border-collapse: collapse; text-align: left;">
                            <tr><td style="padding: 3px 8px; font-weight: bold; width: 30%;">MODEL</td><td style="padding: 3px 8px; font-weight: bold;">BEND 29</td></tr>
                            <tr><td style="padding: 3px 8px;">NOMOR</td><td style="padding: 3px 8px;"><?= $nomor_dokumen_lama ?></td></tr>
                            <tr><td style="padding: 3px 8px;">BULAN</td><td style="padding: 3px 8px;"><?= $nama_bulan[$bulan_angka] . ' ' . $tahun ?></td></tr>
                        </table>
                    </td>
                </tr>
            </table>

            <table class="tabel-barang">
                <thead style="background-color: #f2f2f2;">
                    <tr>
                        <th width="5%">NO</th>
                        <th width="40%">BARANG DITERIMA DARI GUDANG</th>
                        <th width="10%">NOMOR<br>RATOR</th>
                        <th width="10%">JUMLAH</th>
                        <th width="10%">SATUAN</th>
                        <th width="10%">HARGA SATUAN</th>
                        <th width="15%">JUMLAH HARGA</th>
                    </tr>
                </thead>
                <tbody>
                    <?php 
                    $no = 1;
                    $total_seluruh_harga = 0;
                    foreach($details as $d): 
                        $harga_satuan = (float)$d['harga_terakhir'];
                        $jumlah_harga = $d['jumlah'] * $harga_satuan;
                        $total_seluruh_harga += $jumlah_harga;
                    ?>
                    <tr>
                        <td><?= $no++; ?></td>
                        <td class="kiri"><?= htmlspecialchars($d['nama_barang']); ?></td>
                        <td><?= !empty($d['nomor_awal']) ? htmlspecialchars($d['nomor_awal']) : '-'; ?></td>
                        <td><?= number_format($d['jumlah']); ?></td>
                        <td><?= htmlspecialchars($d['satuan']); ?></td>
                        <td class="kanan"><?= $harga_satuan > 0 ? number_format($harga_satuan, 0, ',', '.') : '-'; ?></td>
                        <td class="kanan"><?= $jumlah_harga > 0 ? number_format($jumlah_harga, 0, ',', '.') : '-'; ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
                <tfoot>
                    <tr>
                        <th colspan="6" class="kanan">TOTAL KESELURUHAN (Rp)</th>
                        <th class="kanan"><?= $total_seluruh_harga > 0 ? number_format($total_seluruh_harga, 0, ',', '.') : '-'; ?></th>
                    </tr>
                </tfoot>
            </table>

            <table class="ttd-table">
                <tr>
                    <td style="width: 33.33%;"></td>
                    <td style="width: 33.33%;"></td>
                    <td style="width: 33.33%;">Malingping, <?= $tgl_full ?></td>
                </tr>
                <tr><td colspan="3" style="height: 10px;"></td></tr>
                <tr>
                    <td>
                        Yang Menerima<br>
                        <?= htmlspecialchars($header['penerima_jabatan']); ?>
                    </td>
                    <td>
                        Mengetahui,<br>
                        <?= htmlspecialchars($jabatan_kepala); ?>
                    </td>
                    <td>
                        Yang Menyerahkan<br>
                        Pengurus Barang
                    </td>
                </tr>
                <tr>
                    <td style="height: 70px;"></td>
                    <td style="height: 70px;"></td>
                    <td style="height: 70px;"></td>
                </tr>
                <tr>
                    <td style="vertical-align: bottom;">
                        <span class="ttd-nama"><?= strtoupper(htmlspecialchars($header['penerima_nama'])); ?></span><br>
                        <?= $label_nip_penerima ?> <?= htmlspecialchars($header['penerima_nip'] ?: '-'); ?>
                    </td>
                    <td style="vertical-align: bottom;">
                        <span class="ttd-nama"><?= $nama_kepala; ?></span><br>
                        <?= $label_nip_kepala ?> <?= $nip_kepala; ?>
                    </td>
                    <td style="vertical-align: bottom;">
                        <span class="ttd-nama"><?= strtoupper(htmlspecialchars($header['penyerah_nama'])); ?></span><br>
                        <?= $label_nip_penyerah ?> <?= htmlspecialchars($header['penyerah_nip'] ?: '-'); ?>
                    </td>
                </tr>
            </table>
        </div>
    </div>
    
    <div class="no-print btn-cetak">
        <button onclick="window.print()" class="btn btn-primary btn-lg fw-bold shadow rounded-pill px-4">
            <i class="fas fa-print me-2"></i> Print Semua Dokumen
        </button>
        <button onclick="window.close()" class="btn btn-secondary btn-lg fw-bold shadow rounded-pill px-4 ms-2">
            <i class="fas fa-times me-2"></i> Tutup
        </button>
    </div>
</div>

<script>
    // Browser Trick: Memaksa update style sebelum print dialog muncul
    window.onload = function() { 
        setTimeout(function() { window.print(); }, 500); 
    }
</script>
</body>
</html>