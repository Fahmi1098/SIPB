<?php
require 'cek_login.php';
require 'koneksi.php';
require_once 'functions.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') { requireCsrf(); }

$pesan = "";
$status = "";

$old_input = [
    'kategori_id' => '', 'nama_barang' => '', 'merk' => '', 'tipe' => '',
    'satuan' => '', 'jumlah' => '', 'harga_satuan' => '', 'sumber_dana' => '',
    'tanggal_masuk' => date('Y-m-d'), 'nama_penyerah' => '', 'nama_penerima' => '',
    'nomor_dus' => '', 'nomor_awal' => '', 'nomor_akhir' => ''
];

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $nama      = trim($_POST['nama_barang']);
    $kategori  = (int)$_POST['kategori_id'];
    $tipe      = trim($_POST['tipe']);
    $merk      = trim($_POST['merk']);
    $satuan    = trim($_POST['satuan']);
    $jumlah    = (int)$_POST['jumlah'];
    $harga     = (float)$_POST['harga_satuan']; 
    $sumber    = trim($_POST['sumber_dana']);   
    $tgl       = $_POST['tanggal_masuk'];
    $penyerah  = trim($_POST['nama_penyerah']);
    $penerima  = trim($_POST['nama_penerima']);
    
    $nomor_dus   = trim($_POST['nomor_dus'] ?? '');
    $nomor_awal  = trim($_POST['nomor_awal'] ?? '');
    $nomor_akhir = trim($_POST['nomor_akhir'] ?? '');

    $old_input = [
        'kategori_id' => $kategori, 'nama_barang' => $nama, 'merk' => $merk, 'tipe' => $tipe,
        'satuan' => $satuan, 'jumlah' => $jumlah, 'harga_satuan' => $harga, 'sumber_dana' => $sumber,
        'tanggal_masuk' => $tgl, 'nama_penyerah' => $penyerah, 'nama_penerima' => $penerima,
        'nomor_dus' => $nomor_dus, 'nomor_awal' => $nomor_awal, 'nomor_akhir' => $nomor_akhir
    ];

    $error = "";
    if (empty($nama)) $error .= "&bull; Nama barang tidak boleh kosong.<br>";
    if ($jumlah <= 0) $error .= "&bull; Jumlah harus lebih dari 0.<br>";

    $is_kuasi = false;
    if ($kategori > 0) {
        $stmt_kat = $pdo->prepare("SELECT nama_kategori FROM kategori WHERE id = ?");
        $stmt_kat->execute([$kategori]);
        $kat_row = $stmt_kat->fetch();
        if ($kat_row && stripos($kat_row['nama_kategori'], 'kuasi') !== false) {
            $is_kuasi = true;
        }
    }

    $num_awal = 0; $num_akhir = 0; $prefix = ""; $pad_length = 0;

    if ($is_kuasi) {
        if (empty($nomor_awal) || empty($nomor_akhir)) {
            $error .= "&bull; Nomor Awal dan Akhir wajib diisi untuk Kuasi/SKPD!<br>";
        } else {
            $prefix_awal = preg_replace('/[0-9]/', '', $nomor_awal);
            $prefix_akhir = preg_replace('/[0-9]/', '', $nomor_akhir);
            
            if ($prefix_awal !== $prefix_akhir) {
                $error .= "&bull; Kode huruf (Prefix) pada Nomor Awal dan Akhir harus sama!<br>";
            }

            $prefix = $prefix_awal;
            $str_angka_awal = preg_replace('/[^0-9]/', '', $nomor_awal);
            $str_angka_akhir = preg_replace('/[^0-9]/', '', $nomor_akhir);
            
            $pad_length = strlen($str_angka_awal);
            $num_awal = (int)$str_angka_awal;
            $num_akhir = (int)$str_angka_akhir;
            $selisih = $num_akhir - $num_awal + 1;

            if ($num_akhir < $num_awal) {
                $error .= "&bull; Nomor Akhir harus lebih besar/sama dengan Nomor Awal!<br>";
            } elseif ($selisih != $jumlah) {
                $error .= "&bull; Jumlah barang ($jumlah) tidak sesuai rentang nomor ($selisih item)!<br>";
            }
        }
    }

    if (!empty($error)) {
        $pesan = "<b>TRANSAKSI DITOLAK:</b><br>" . $error;
        $status = "danger";
    } else {
        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("SELECT id FROM barang WHERE nama_barang = ?");
            $stmt->execute([$nama]);
            $row = $stmt->fetch();

            if ($row) {
                $barang_id = $row['id'];
            } else {
                $sql_brg = "INSERT INTO barang (kategori_id, nama_barang, tipe, merk, satuan, jumlah_total, terpakai, sisa, harga_terakhir) VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?)";
                $pdo->prepare($sql_brg)->execute([$kategori, $nama, $tipe, $merk, $satuan, $harga]);
                $barang_id = $pdo->lastInsertId();
            }

            $sql_masuk = "INSERT INTO barang_masuk (barang_id, jumlah, harga_satuan, sumber_dana, tanggal_masuk, nama_penyerah, nama_penerima, nomor_dus, nomor_awal, nomor_akhir) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $val_dus = $is_kuasi ? $nomor_dus : null;
            $val_awal = $is_kuasi ? $nomor_awal : null;
            $val_akhir = $is_kuasi ? $nomor_akhir : null;
            $pdo->prepare($sql_masuk)->execute([$barang_id, $jumlah, $harga, $sumber, $tgl, $penyerah, $penerima, $val_dus, $val_awal, $val_akhir]);

            if ($is_kuasi) {
                $sql_kuasi = "INSERT INTO stok_kuasi (barang_id, nomor_dus, prefix_huruf, panjang_digit, digit_awal, digit_akhir, digit_sekarang, sisa_lembar, tanggal_masuk) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $pdo->prepare($sql_kuasi)->execute([
                    $barang_id, $nomor_dus, $prefix, $pad_length, $num_awal, $num_akhir, $num_awal, $jumlah, $tgl
                ]);
            }

            $sql_update = "UPDATE barang SET jumlah_total = jumlah_total + ?, sisa = sisa + ?, harga_terakhir = ? WHERE id = ?";
            $pdo->prepare($sql_update)->execute([$jumlah, $jumlah, $harga, $barang_id]);

            $pdo->commit();
            $pesan = "Data penerimaan barang berhasil disimpan! Stok dan Nilai Aset bertambah.";
            $status = "success";
            $old_input = array_fill_keys(array_keys($old_input), '');
            $old_input['tanggal_masuk'] = date('Y-m-d');

        } catch (PDOException $e) {
            $pdo->rollBack();
            $pesan  = "Gagal menyimpan data. Periksa data lalu coba lagi.";
            error_log('barang_masuk error: ' . $e->getMessage());
            $status = "danger";
        }
    }
}

require 'header.php';
?>

<div class="container-fluid px-4 mt-4 mb-5">
    <?php if ($pesan != ""): ?>
        <div class="alert alert-<?= $status; ?> alert-dismissible fade show shadow-sm" role="alert">
            <i class="fas <?= $status == 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'; ?> me-2 mt-1 float-start fs-5"></i>
            <div class="ms-4"><?= $pesan; ?></div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    <?php endif; ?>

    <div class="card shadow-sm border-0" style="border-top: 4px solid #198754;">
        <div class="card-header pt-3 pb-2 bg-white">
            <h5 class="text-success fw-bold mb-1"><i class="fas fa-cart-plus me-2"></i> Form Penerimaan Barang Masuk</h5>
        </div>
        <div class="card-body p-4">
            <form method="POST" action="">
                <?= csrf_field(); ?>
                <div class="row">
                    <div class="col-md-6 border-end pe-4">
                        <h6 class="text-gov-primary fw-bold mb-3 border-bottom pb-2"><i class="fas fa-box-open me-2"></i>Identifikasi Aset / Barang</h6>
                        
                        <div class="mb-3">
                            <label class="form-label fw-bold text-muted small">Kategori Pengadaan <span class="text-danger">*</span></label>
                            <select name="kategori_id" id="kategori_id" class="form-select border-primary" required onchange="toggleKuasiMasuk()" style="background-color: #f8fbff;">
                                <option value="">-- Pilih Kategori --</option>
                                <?php
                                $kat = $pdo->query("SELECT * FROM kategori ORDER BY nama_kategori");
                                while ($k = $kat->fetch()) {
                                    $selected = ($old_input['kategori_id'] == $k['id']) ? 'selected' : '';
                                    $is_kuasi_html = (stripos($k['nama_kategori'], 'kuasi') !== false) ? 'ya' : 'tidak';
                                    echo "<option value='{$k['id']}' data-kategori='{$is_kuasi_html}' $selected>" . htmlspecialchars($k['nama_kategori']) . "</option>";
                                }
                                ?>
                            </select>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-bold text-muted small">Spesifikasi Nama Barang <span class="text-danger">*</span></label>
                            <input type="text" name="nama_barang" class="form-control" required value="<?= htmlspecialchars($old_input['nama_barang']); ?>">
                        </div>

                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label fw-bold text-muted small">Merk Barang</label>
                                <input type="text" name="merk" class="form-control" value="<?= htmlspecialchars($old_input['merk']); ?>">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold text-muted small">Tipe / Ukuran</label>
                                <input type="text" name="tipe" class="form-control" value="<?= htmlspecialchars($old_input['tipe']); ?>">
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-bold text-muted small">Satuan Terkecil <span class="text-danger">*</span></label>
                            <input type="text" name="satuan" class="form-control border-primary" required value="<?= htmlspecialchars($old_input['satuan']); ?>">
                        </div>
                    </div>

                    <div class="col-md-6 ps-4">
                        <h6 class="text-gov-primary fw-bold mb-3 border-bottom pb-2"><i class="fas fa-file-invoice-dollar me-2"></i>Keuangan & Administrasi</h6>

                        <div class="row mb-3">
                            <div class="col-md-6">
                                <label class="form-label fw-bold text-muted small">Tanggal Diterima <span class="text-danger">*</span></label>
                                <input type="date" name="tanggal_masuk" class="form-control" required value="<?= htmlspecialchars($old_input['tanggal_masuk']); ?>">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold text-muted small">Volume Masuk (Jumlah) <span class="text-danger">*</span></label>
                                <div class="input-group">
                                    <input type="number" name="jumlah" class="form-control fw-bold text-center" required min="1" value="<?= htmlspecialchars($old_input['jumlah']); ?>">
                                    <span class="input-group-text bg-light"><i class="fas fa-cubes"></i></span>
                                </div>
                            </div>
                        </div>

                        <div class="row mb-3 p-3 rounded border mx-0" style="background-color: #f1f8e9; border-color: #c5e1a5 !important;">
                            <div class="col-md-6 mb-2 mb-md-0">
                                <label class="form-label fw-bold text-dark small">Harga Satuan (Rp) <span class="text-danger">*</span></label>
                                <div class="input-group">
                                    <span class="input-group-text bg-white fw-bold">Rp</span>
                                    <input type="number" name="harga_satuan" class="form-control text-end fw-bold" required min="0" step="0.01" value="<?= htmlspecialchars($old_input['harga_satuan']); ?>">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-bold text-dark small">Sumber Dana <span class="text-danger">*</span></label>
                                <select name="sumber_dana" class="form-select border-success" required>
                                    <option value="APBD">APBD Kab/Kota</option>
                                    <option value="APBN">APBN / Pusat</option>
                                    <option value="Lainnya">Lainnya</option>
                                </select>
                            </div>
                        </div>

                        <div id="form-kuasi" class="row mb-3 p-3 rounded border mx-0" style="display: none; background-color: #fff9e6; border-color: var(--gov-accent) !important;">
                            <div class="col-12 mb-2">
                                <span class="badge bg-warning text-dark px-2 py-1"><i class="fas fa-magic"></i> SISTEM PELACAKAN SERI OTOMATIS</span>
                            </div>
                            <div class="col-md-4 mb-2 mb-md-0">
                                <label class="form-label fw-bold text-dark small">No. Box/Dus <span class="text-danger">*</span></label>
                                <input type="text" name="nomor_dus" id="nomor_dus" class="form-control border-warning fw-bold" 
                                       placeholder="Cth: 411" value="<?= htmlspecialchars($old_input['nomor_dus'] ?? ''); ?>">
                            </div>
                            <div class="col-md-4 mb-2 mb-md-0">
                                <label class="form-label fw-bold text-dark small">No. Seri Awal <span class="text-danger">*</span></label>
                                <input type="text" name="nomor_awal" id="nomor_awal" class="form-control border-warning fw-bold" 
                                       placeholder="A-001" value="<?= htmlspecialchars($old_input['nomor_awal'] ?? ''); ?>">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label fw-bold text-dark small">No. Seri Akhir <span class="text-danger">*</span></label>
                                <input type="text" name="nomor_akhir" id="nomor_akhir" class="form-control border-warning fw-bold" 
                                       placeholder="A-100" value="<?= htmlspecialchars($old_input['nomor_akhir'] ?? ''); ?>">
                            </div>
                        </div>

                        <div class="row mb-4">
                            <div class="col-6">
                                <label class="form-label fw-bold text-muted small">Pihak Penyerah <span class="text-danger">*</span></label>
                                <input type="text" name="nama_penyerah" class="form-control" required value="<?= htmlspecialchars($old_input['nama_penyerah']); ?>">
                            </div>
                            <div class="col-6">
                                <label class="form-label fw-bold text-muted small">Penerima (Gudang) <span class="text-danger">*</span></label>
                                <input type="text" name="nama_penerima" class="form-control bg-light" required value="<?= htmlspecialchars($_SESSION['nama_lengkap']); ?>">
                            </div>
                        </div>

                        <div class="d-grid gap-2 border-top pt-3">
                            <button type="submit" class="btn btn-success btn-lg fw-bold shadow">
                                <i class="fas fa-save me-2"></i> Rekam Transaksi & Tambah Stok
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
    function toggleKuasiMasuk() {
        var selectEl = document.getElementById('kategori_id');
        var selectedOption = selectEl.options[selectEl.selectedIndex];
        if (!selectedOption) return;

        var statusKuasi = selectedOption.getAttribute('data-kategori');
        var formKuasi = document.getElementById('form-kuasi');
        var inputAwal = document.getElementById('nomor_awal');
        var inputAkhir = document.getElementById('nomor_akhir');
        var inputDus = document.getElementById('nomor_dus');

        if (statusKuasi === 'ya') {
            formKuasi.style.display = 'flex';
            inputAwal.disabled = false; inputAkhir.disabled = false; inputDus.disabled = false;
            inputAwal.required = true; inputAkhir.required = true; inputDus.required = true;
        } else {
            formKuasi.style.display = 'none';
            inputAwal.disabled = true; inputAkhir.disabled = true; inputDus.disabled = true;
            inputAwal.required = false; inputAkhir.required = false; inputDus.required = false;
            inputAwal.value = ''; inputAkhir.value = ''; inputDus.value = '';
        }
    }
    document.addEventListener("DOMContentLoaded", function() { toggleKuasiMasuk(); });
</script>

<?php require 'footer.php'; ?>
