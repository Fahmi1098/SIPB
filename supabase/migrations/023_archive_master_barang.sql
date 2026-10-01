-- Migration 023: archive master goods instead of physically deleting them.
-- Historical transactions must retain their item identity. A physical DELETE
-- on barang can cascade-delete barang_masuk/detail_barang_keluar and leave
-- transaction headers without item details.
ALTER TABLE public.barang
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_barang_is_archived
  ON public.barang (is_archived);

REVOKE INSERT, UPDATE ON public.barang FROM authenticated;
GRANT SELECT ON public.barang TO authenticated;
GRANT INSERT (
  kategori_id, nama_barang, tipe, merk, satuan, stok_minimum, is_archived
) ON public.barang TO authenticated;
GRANT UPDATE (
  kategori_id, nama_barang, tipe, merk, satuan, stok_minimum, is_archived
) ON public.barang TO authenticated;
