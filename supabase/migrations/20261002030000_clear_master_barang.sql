-- Final cleanup SIPB: hapus seluruh data transaksi dan Master Barang.
-- DIPERTAHANKAN: Pegawai, Kategori, User/Profile.
-- Karena riwayat_opname.barang_id memiliki FK ON DELETE CASCADE,
-- riwayat Stock Opname yang terkait Master Barang juga akan terhapus.
--
-- Jalankan SEKALI di Supabase SQL Editor.

BEGIN;

-- Trigger keamanan transaksi keluar memblokir DELETE langsung.
ALTER TABLE public.transaksi_keluar DISABLE TRIGGER trg_sipb_guard_outgoing_mutation;

DELETE FROM public.transaksi_kuasi_alokasi;
DELETE FROM public.detail_barang_keluar;
DELETE FROM public.transaksi_keluar;
DELETE FROM public.stok_kuasi;
DELETE FROM public.barang_masuk;

ALTER TABLE public.transaksi_keluar ENABLE TRIGGER trg_sipb_guard_outgoing_mutation;

-- Hapus riwayat opname sebelum master barang untuk tetap aman bila FK tersedia.
DELETE FROM public.riwayat_opname;

-- Hapus seluruh Master Barang. Trigger penghapusan barang sekarang aman
-- karena seluruh detail transaksi sudah dikosongkan di atas.
DELETE FROM public.barang;

-- Reset sequence hanya untuk data yang dibersihkan.
SELECT setval(pg_get_serial_sequence('public.barang','id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.barang_masuk','id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.transaksi_keluar','id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.detail_barang_keluar','id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.transaksi_kuasi_alokasi','id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.stok_kuasi','id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.riwayat_opname','id'), 1, false);

COMMIT;
