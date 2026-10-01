-- Prevent direct API mutation of operational ledgers.
-- Transactions and stock adjustments must go through SECURITY DEFINER RPCs.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
ON public.barang_masuk,
   public.detail_barang_keluar,
   public.transaksi_keluar,
   public.riwayat_opname,
   public.stok_kuasi,
   public.transaksi_kuasi_alokasi
FROM authenticated;

GRANT SELECT
ON public.barang_masuk,
   public.detail_barang_keluar,
   public.transaksi_keluar,
   public.riwayat_opname,
   public.stok_kuasi,
   public.transaksi_kuasi_alokasi
TO authenticated;

-- Keep master-data CRUD available to admin; RLS remains the authorization layer.
GRANT SELECT, INSERT, UPDATE, DELETE
ON public.barang, public.kategori
TO authenticated;
