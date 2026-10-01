-- Protect stock ledger columns from direct authenticated API edits.
-- Stock quantities and last price must only change through trusted RPCs.
-- Admins may still maintain descriptive master-data fields.

REVOKE INSERT, UPDATE ON public.barang FROM authenticated;

GRANT SELECT ON public.barang TO authenticated;

GRANT INSERT (
  kategori_id, nama_barang, tipe, merk, satuan, stok_minimum
) ON public.barang TO authenticated;

GRANT UPDATE (
  kategori_id, nama_barang, tipe, merk, satuan, stok_minimum
) ON public.barang TO authenticated;

-- Explicitly keep ledger-derived fields outside the authenticated column grants:
-- harga_terakhir, jumlah_total, terpakai, sisa, and legacy kategori.
