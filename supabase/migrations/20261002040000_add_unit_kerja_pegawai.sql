-- Tambahkan sumber tujuan/ruangan pada master Pegawai.
-- Dipakai untuk mengisi otomatis Tujuan / Ruangan pada Barang Keluar.

ALTER TABLE public.pegawai
  ADD COLUMN IF NOT EXISTS unit_kerja varchar(150) NULL;

COMMENT ON COLUMN public.pegawai.unit_kerja
  IS 'Unit kerja atau ruangan tujuan default pegawai pada transaksi Barang Keluar';
