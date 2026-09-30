<?php
require 'cek_login.php';
require 'koneksi.php';
require_once 'functions.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') { requireCsrf(); }

$pesan = "";
$status = "";

$pegawai_list = [];
try {
    $stmt_pegawai = $pdo->query("SELECT * FROM pegawai ORDER BY nama_pegawai ASC");
    if ($stmt_pegawai) { $pegawai_list = $stmt_pegawai->fetchAll(PDO::FETCH_ASSOC); }
} catch (PDOException $e) {}

$penyerah_nama = $_SESSION['nama_lengkap'];
$penyerah_jabatan = '';
$penyerah_nip = '';

try {
    $stmt_penyerah = $pdo->prepare("SELECT jabatan, nip FROM pegawai WHERE nama_pegawai = ? LIMIT 1");
    $stmt_penyerah->execute([$penyerah_nama]);
    $data_penyerah = $stmt_penyerah->fetch(PDO::FETCH_ASSOC);
    if ($data_penyerah) {
        $penyerah_jabatan = $data_penyerah['jabatan'] ?? '';
        $penyerah_nip = $data_penyerah['nip'] ?? '';
    }
} catch (PDOException $e) {}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $tgl       = $_POST['tanggal_keluar'];
    $p_nama    = trim($_POST['penyerah_nama']);
    $p_jabatan = trim($_POST['penyerah_jabatan']);
    $p_nip     = trim($_POST['penyerah_nip']);
    $t_nama    = trim($_POST['penerima_nama']);
    $t_jabatan = trim($_POST['penerima_jabatan']);
    $t_nip     = trim($_POST['penerima_nip']);
    $tujuan    = trim($_POST['tujuan_ruangan']);

    $barang_ids = $_POST['barang_id'] ?? [];
    $jumlahs    = $_POST['jumlah'] ?? [];

    $validasi_lulus = true;
    $pesan_error    = "";
    $data_eksekusi  = [];

    for ($i = 0; $i < count($barang_ids); $i++) {
        if (!empty($barang_ids[$i]) && !empty($jumlahs[$i])) {
            $b_id        = $barang_ids[$i];
            $jml_diminta = (int)$jumlahs[$i];

            $stmt_cek = $pdo->prepare("SELECT b.id, b.nama_barang, b.sisa, b.satuan, LOWER(k.nama_kategori) AS kategori FROM barang b LEFT JOIN kategori k ON b.kategori_id = k.id WHERE b.id = ?");
            $stmt_cek->execute([$b_id]);
            $cek_stok = $stmt_cek->fetch();

            if (!$cek_stok) {
                $validasi_lulus = false; $pesan_error .= "&bull; Barang tidak valid!<br>"; continue;
            }

            if ($jml_diminta > $cek_stok['sisa']) {
                $validasi_lulus = false;
                $pesan_error .= "&bull; Stok fisik <b>" . htmlspecialchars($cek_stok['nama_barang']) . "</b> kurang! (Sisa: {$cek_stok['sisa']}, Diminta: {$jml_diminta})<br>";
                continue;
            }

            $string_rentang_kuasi = "";
            $string_nomor_dus = "";
            $array_update_stok_kuasi = [];

            if (strpos($cek_stok['kategori'], 'kuasi') !== false) {
                $sisa_diminta = $jml_diminta;
                $rentang_keluar = [];
                $dus_keluar = [];

                $stmt_sk = $pdo->prepare("SELECT * FROM stok_kuasi WHERE barang_id = ? AND sisa_lembar > 0 ORDER BY tanggal_masuk ASC, id ASC");
                $stmt_sk->execute([$b_id]);
                $batches = $stmt_sk->fetchAll();

                foreach ($batches as $batch) {
                    if ($sisa_diminta <= 0) break;

                    $ambil_dari_batch_ini = min($sisa_diminta, $batch['sisa_lembar']);
                    
                    $no_keluar_awal = $batch['digit_sekarang'];
                    $no_keluar_akhir = $no_keluar_awal + $ambil_dari_batch_ini - 1;

                    $format_awal = $batch['prefix_huruf'] . str_pad($no_keluar_awal, $batch['panjang_digit'], '0', STR_PAD_LEFT);
                    $format_akhir = $batch['prefix_huruf'] . str_pad($no_keluar_akhir, $batch['panjang_digit'], '0', STR_PAD_LEFT);
                    
                    $rentang_keluar[] = "{$format_awal} - {$format_akhir}";
                    if (!empty($batch['nomor_dus'])) {
                        $dus_keluar[] = $batch['nomor_dus'];
                    }

                    $array_update_stok_kuasi[] = [
                        'id_stok_kuasi' => $batch['id'],
                        'digit_sekarang_baru' => $no_keluar_akhir + 1,
                        'lembar_dipakai' => $ambil_dari_batch_ini
                    ];

                    $sisa_diminta -= $ambil_dari_batch_ini;
                }

                if ($sisa_diminta > 0) {
                    $validasi_lulus = false;
                    $pesan_error .= "&bull; Inkonsistensi Data: Stok global cukup, tetapi detail nomor seri Kuasi untuk <b>" . htmlspecialchars($cek_stok['nama_barang']) . "</b> kurang/rusak di database.<br>";
                    continue;
                }

                $string_rentang_kuasi = implode(", ", $rentang_keluar);
                $string_nomor_dus = implode(", ", array_unique($dus_keluar));
            }

            $data_eksekusi[] = [
                'barang_id' => $b_id,
                'jumlah' => $jml_diminta,
                'rentang_kuasi' => $string_rentang_kuasi,
                'nomor_dus' => $string_nomor_dus,
                'update_kuasi' => $array_update_stok_kuasi
            ];
        }
    }

    if (count($data_eksekusi) == 0) {
        $validasi_lulus = false;
        $pesan_error .= "&bull; Minimal harus memilih satu barang untuk dikeluarkan!<br>";
    }

    if ($validasi_lulus) {
        try {
            $pdo->beginTransaction();

            $sql_header = "INSERT INTO transaksi_keluar (tanggal_keluar, penyerah_nama, penyerah_jabatan, penyerah_nip, penerima_nama, penerima_jabatan, penerima_nip, tujuan_ruangan, jenis_dokumen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt_header = $pdo->prepare($sql_header);
            $stmt_header->execute([$tgl, $p_nama, $p_jabatan, $p_nip, $t_nama, $t_jabatan, $t_nip, $tujuan, 'Semua']);
            $transaksi_id = $pdo->lastInsertId();

            // Tambahan Insert Nomor Dus ke detail_barang_keluar
            $sql_detail = "INSERT INTO detail_barang_keluar (transaksi_keluar_id, barang_id, jumlah, nomor_awal, nomor_akhir, nomor_dus) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt_detail = $pdo->prepare($sql_detail);
            
            $sql_update_barang = "UPDATE barang SET terpakai = terpakai + ?, sisa = sisa - ? WHERE id = ?";
            $stmt_update_barang = $pdo->prepare($sql_update_barang);

            $sql_update_kuasi = "UPDATE stok_kuasi SET digit_sekarang = ?, sisa_lembar = sisa_lembar - ? WHERE id = ?";
            $stmt_update_kuasi = $pdo->prepare($sql_update_kuasi);

            foreach ($data_eksekusi as $item) {
                $rentang_simpan = empty($item['rentang_kuasi']) ? null : $item['rentang_kuasi'];
                $dus_simpan = empty($item['nomor_dus']) ? null : $item['nomor_dus'];
                
                $stmt_detail->execute([$transaksi_id, $item['barang_id'], $item['jumlah'], $rentang_simpan, null, $dus_simpan]);
                $stmt_update_barang->execute([$item['jumlah'], $item['jumlah'], $item['barang_id']]);

                foreach ($item['update_kuasi'] as $uk) {
                    $stmt_update_kuasi->execute([$uk['digit_sekarang_baru'], $uk['lembar_dipakai'], $uk['id_stok_kuasi']]);
                }
            }

            $pdo->commit();
            $pesan = "Distribusi Barang Berhasil! Sistem FIFO telah mencatat nomor seri & nomor dus keluaran otomatis.";
            $status = "success";
            $pesan .= "<br><br><a href='cetak_semua_dokumen.php?id={$transaksi_id}' target='_blank' class='btn btn-sm btn-light text-danger fw-bold shadow-sm'><i class='fas fa-print me-1'></i> Cetak BAST & Nota</a>";

        } catch (PDOException $e) {
            $pdo->rollBack();
            $pesan  = "Gagal menyimpan transaksi. Periksa data lalu coba lagi.";
            error_log('barang_keluar error: ' . $e->getMessage());
            $status = "danger";
        }
    } else {
        $pesan  = "<b>TRANSAKSI DITOLAK OLEH SISTEM:</b><br>" . $pesan_error;
        $status = "danger";
    }
}

require 'header.php';
?>

<div class="container-fluid px-4 mt-4 mb-5">
    <?php if ($pesan != ""): ?>
        <div class="alert alert-<?= $status; ?> alert-dismissible fade show shadow-sm" role="alert">
            <i class="fas <?= $status == 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'; ?> me-2 mt-1 float-start fs-4"></i>
            <div class="ms-4"><?= $pesan; ?></div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    <?php endif; ?>

    <div class="card shadow-sm border-0" style="border-top: 4px solid var(--gov-primary);">
        <div class="card-header pt-3 pb-2 bg-white">
            <h5 class="text-gov-primary fw-bold mb-1"><i class="fas fa-dolly me-2"></i> Form Distribusi Cerdas (FIFO)</h5>
        </div>
        
        <div class="card-body p-4">
            <form method="POST" action="">
                <?= csrf_field(); ?>
                <div class="row mb-4 bg-light p-3 rounded border mx-0">
                    <div class="col-md-6">
                        <label class="form-label fw-bold text-muted small">Tanggal Distribusi <span class="text-danger">*</span></label>
                        <input type="date" name="tanggal_keluar" class="form-control border-secondary" required value="<?= date('Y-m-d'); ?>">
                    </div>
                </div>

                <div class="row mb-4">
                    <div class="col-md-6 border-end pe-4">
                        <h6 class="text-gov-primary fw-bold mb-3 border-bottom pb-2"><i class="fas fa-user-shield me-2"></i>Pihak Penyerah (Gudang)</h6>
                        <div class="mb-2">
                            <label class="form-label small fw-bold text-muted">Nama Lengkap</label>
                            <input type="text" name="penyerah_nama" class="form-control bg-light" required value="<?= htmlspecialchars($penyerah_nama); ?>">
                        </div>
                        <div class="row">
                            <div class="col-6">
                                <label class="form-label small text-muted">Jabatan</label>
                                <input type="text" name="penyerah_jabatan" class="form-control form-control-sm" value="<?= htmlspecialchars($penyerah_jabatan); ?>">
                            </div>
                            <div class="col-6">
                                <label class="form-label small text-muted">NIP/NIPPPK</label>
                                <input type="text" name="penyerah_nip" class="form-control form-control-sm" value="<?= htmlspecialchars($penyerah_nip); ?>">
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6 ps-4">
                        <h6 class="text-gov-primary fw-bold mb-3 border-bottom pb-2"><i class="fas fa-user-check me-2"></i>Pihak Penerima (Pemohon)</h6>
                        <div class="mb-2">
                            <label class="form-label small fw-bold text-muted">Cari Nama Pegawai <span class="text-danger">*</span></label>
                            <select name="penerima_nama" id="penerima_nama" class="form-select border-primary" required onchange="isiDetailPegawai()" style="background-color: #f8fbff;">
                                <option value="">-- Pilih Nama Pegawai --</option>
                                <?php foreach ($pegawai_list as $pgw): ?>
                                    <option value="<?= htmlspecialchars($pgw['nama_pegawai']); ?>" data-nip="<?= htmlspecialchars($pgw['nip']); ?>" data-jabatan="<?= htmlspecialchars($pgw['jabatan']); ?>">
                                        <?= htmlspecialchars($pgw['nama_pegawai']); ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="row mb-2">
                            <div class="col-6">
                                <label class="form-label small text-muted">Jabatan</label>
                                <input type="text" name="penerima_jabatan" id="penerima_jabatan" class="form-control form-control-sm bg-light" readonly required>
                            </div>
                            <div class="col-6">
                                <label class="form-label small text-muted">NIP/NIPPPK</label>
                                <input type="text" name="penerima_nip" id="penerima_nip" class="form-control form-control-sm bg-light" readonly>
                            </div>
                        </div>
                        <div class="mb-2 mt-3 p-2 border rounded" style="background-color: #fff9e6;">
                            <label class="form-label small fw-bold text-dark">Tujuan / Ruangan Pengguna <span class="text-danger">*</span></label>
                            <input type="text" name="tujuan_ruangan" class="form-control border-warning" required placeholder="Cth: Subag Tata Usaha">
                        </div>
                    </div>
                </div>

                <h6 class="text-gov-primary fw-bold mb-3 border-bottom pb-2 mt-4 d-flex justify-content-between align-items-center">
                    <span><i class="fas fa-list-ul me-2"></i>Rincian Barang yang Didistribusikan</span>
                    <button type="button" onclick="tambahBaris()" class="btn btn-sm btn-outline-primary fw-bold shadow-sm">
                        <i class="fas fa-plus me-1"></i> Tambah Item
                    </button>
                </h6>

                <div class="table-responsive">
                    <table class="table table-bordered align-middle">
                        <thead class="text-center" style="background-color: var(--gov-primary); color: white;">
                            <tr>
                                <th width="45%">Pilih Barang (Sisa Stok Fisik)</th>
                                <th width="15%">Jumlah Diminta</th>
                                <th width="25%">Status Kuasi (Seri SKPD)</th>
                                <th width="15%">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="bodyBarang">
                            <tr class="baris-barang">
                                <td>
                                    <select name="barang_id[]" class="form-select select-barang border-secondary" required onchange="cekBadgeKuasi(this)">
                                        <option value="">-- Cari Barang --</option>
                                        <?php
                                        $sql_brg = "SELECT b.id, b.nama_barang, b.sisa, b.satuan, LOWER(k.nama_kategori) AS nama_kategori 
                                                    FROM barang b LEFT JOIN kategori k ON b.kategori_id = k.id 
                                                    WHERE b.sisa > 0 ORDER BY b.nama_barang";
                                        $stmt_brg = $pdo->query($sql_brg);
                                        while ($b = $stmt_brg->fetch()) {
                                            $is_kuasi = (strpos($b['nama_kategori'], 'kuasi') !== false) ? 'ya' : 'tidak';
                                            $label = htmlspecialchars($b['nama_barang']) . " (Sisa: {$b['sisa']} {$b['satuan']})";
                                            echo "<option value='{$b['id']}' data-kategori='{$is_kuasi}'>$label</option>";
                                        }
                                        ?>
                                    </select>
                                </td>
                                <td>
                                    <input type="number" name="jumlah[]" class="form-control jumlah text-center fw-bold" required min="1" placeholder="0">
                                </td>
                                <td class="text-center bg-light">
                                    <div class="badge-kuasi">
                                        <span class="text-muted small"><i class="fas fa-minus"></i> Non-Kuasi</span>
                                    </div>
                                </td>
                                <td class="text-center">
                                    <button type="button" class="btn btn-outline-danger btn-sm" onclick="hapusBaris(this)" title="Hapus">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="text-end mt-4 pt-3 border-top">
                    <button type="submit" class="btn btn-danger btn-lg px-5 shadow fw-bold" onclick="return confirm('Nomor Seri & Dus Kuasi akan digenerate otomatis berdasarkan antrean gudang. Lanjutkan?');">
                        <i class="fas fa-check-circle me-2"></i> Proses Distribusi (FIFO)
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
    function isiDetailPegawai() {
        var select = document.getElementById('penerima_nama');
        var selectedOption = select.options[select.selectedIndex];
        document.getElementById('penerima_nip').value = selectedOption.getAttribute('data-nip') || '';
        document.getElementById('penerima_jabatan').value = selectedOption.getAttribute('data-jabatan') || '';
    }

    function cekBadgeKuasi(selectEl) {
        var row = selectEl.closest('tr');
        var selectedOption = selectEl.options[selectEl.selectedIndex];
        var badgeContainer = row.querySelector('.badge-kuasi');
        
        if(!selectedOption) return;
        
        if (selectedOption.getAttribute('data-kategori') === 'ya') {
            badgeContainer.innerHTML = '<span class="badge bg-warning text-dark shadow-sm border border-dark"><i class="fas fa-cogs"></i> Generate FIFO Auto</span>';
            row.classList.add('table-warning');
        } else {
            badgeContainer.innerHTML = '<span class="text-muted small"><i class="fas fa-minus"></i> Non-Kuasi</span>';
            row.classList.remove('table-warning');
        }
    }

    function tambahBaris() {
        var barisPertama = document.querySelector('.baris-barang');
        var barisBaru = barisPertama.cloneNode(true);
        barisBaru.querySelector('select').selectedIndex = 0;
        barisBaru.querySelector('.jumlah').value = '';
        barisBaru.querySelector('.badge-kuasi').innerHTML = '<span class="text-muted small"><i class="fas fa-minus"></i> Non-Kuasi</span>';
        barisBaru.classList.remove('table-warning');
        
        var selectBaru = barisBaru.querySelector('.select-barang');
        selectBaru.addEventListener('change', function() { cekBadgeKuasi(this); });
        
        document.getElementById('bodyBarang').appendChild(barisBaru);
    }

    function hapusBaris(tombol) {
        if (document.querySelectorAll('.baris-barang').length > 1) {
            tombol.closest('tr').remove();
        } else {
            alert("Minimal 1 barang!");
        }
    }

    document.addEventListener("DOMContentLoaded", function() {
        document.querySelectorAll('.select-barang').forEach(function(select) {
            select.addEventListener('change', function() { cekBadgeKuasi(this); });
        });
    });
</script>

<?php require 'footer.php'; ?>
