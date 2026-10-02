-- Bersihkan seluruh transaksi Barang Masuk / Barang Keluar SIPB.
-- Yang dipertahankan: Pegawai, Master Barang, Kategori, User/Profile, dan Riwayat Stock Opname.
-- Stok master barang direset ke 0 karena seluruh sumber mutasi masuk/keluar dihapus.
--
-- Jalankan migration ini SEKALI pada database SIPB yang sedang dipakai.

BEGIN;

-- Hapus relasi alokasi terlebih dahulu agar foreign key tidak menghalangi penghapusan.
DELETE FROM public.transaksi_kuasi_alokasi;

-- Trigger keamanan transaksi keluar memblokir DELETE langsung untuk sesi SQL Editor.
-- Nonaktifkan sementara selama pembersihan, lalu aktifkan kembali dalam transaksi yang sama.
ALTER TABLE public.transaksi_keluar DISABLE TRIGGER trg_sipb_guard_outgoing_mutation;

-- Hapus detail dan header Barang Keluar.
DELETE FROM public.detail_barang_keluar;
DELETE FROM public.transaksi_keluar;

ALTER TABLE public.transaksi_keluar ENABLE TRIGGER trg_sipb_guard_outgoing_mutation;

-- Hapus batch Stok Kuasi yang berasal dari Barang Masuk.
DELETE FROM public.stok_kuasi;

-- Hapus seluruh riwayat/data Barang Masuk.
DELETE FROM public.barang_masuk;

-- Semua transaksi mutasi sudah kosong, sehingga saldo master dikembalikan
-- ke kondisi awal yang konsisten untuk transaksi baru.
UPDATE public.barang
SET jumlah_total = 0,
    terpakai = 0,
    sisa = 0;

-- Mulai kembali ID transaksi dari 1 tanpa menyentuh ID Pegawai/Master Barang.
SELECT setval(pg_get_serial_sequence('public.barang_masuk','id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.transaksi_keluar','id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.detail_barang_keluar','id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.transaksi_kuasi_alokasi','id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.stok_kuasi','id'), 1, false);

COMMIT;
