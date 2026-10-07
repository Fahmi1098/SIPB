-- Tambahkan keterangan pada Master Barang agar barang dengan nama sama dapat dibedakan.
ALTER TABLE public.barang
  ADD COLUMN IF NOT EXISTS keterangan text;

COMMENT ON COLUMN public.barang.keterangan IS
  'Keterangan/spesifikasi/pembeda barang pada Master Barang.';

-- Tidak mengubah histori Barang Masuk/Keluar.
