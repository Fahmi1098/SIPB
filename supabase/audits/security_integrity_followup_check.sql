-- Read-only post-deployment checks for migration
-- 20261102090000_security_integrity_followup.sql.
-- Run in Supabase SQL Editor after applying the migration.

-- 1) Authenticated users must not be able to physically delete a Master Barang
--    row or directly edit the derived stock balance / archive flag.
SELECT
  has_table_privilege('authenticated', 'public.barang', 'DELETE')
    AS can_delete_master_barang,
  has_column_privilege('authenticated', 'public.barang', 'sisa', 'UPDATE')
    AS can_update_sisa_directly,
  has_column_privilege('authenticated', 'public.barang', 'jumlah_total', 'UPDATE')
    AS can_update_jumlah_total_directly,
  has_column_privilege('authenticated', 'public.barang', 'is_archived', 'UPDATE')
    AS can_update_archive_flag_directly;

-- Expected: all four values above are false.

-- 2) Only the archive RPC should be executable; the legacy physical-delete
--    RPC must no longer be callable by authenticated clients.
SELECT
  has_function_privilege(
    'authenticated',
    'public.set_barang_archived(integer,boolean)',
    'EXECUTE'
  ) AS can_archive_master_barang,
  has_function_privilege(
    'authenticated',
    'public.delete_barang_if_no_outgoing(integer)',
    'EXECUTE'
  ) AS can_call_legacy_physical_delete;

-- Expected: can_archive_master_barang = true;
--           can_call_legacy_physical_delete = false.

-- 3) Confirm that active-account helpers are used by all operational read
--    policies. Inspect any row that does not mention sipb_is_active_user.
SELECT
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'user_profiles', 'kategori', 'barang', 'pegawai', 'barang_masuk',
    'transaksi_keluar', 'detail_barang_keluar', 'riwayat_opname',
    'stok_kuasi', 'transaksi_kuasi_alokasi'
  )
ORDER BY tablename, policyname;

-- 4) An archived item should never have positive current stock.
SELECT id, kode_barang, nama_barang, jumlah_total, terpakai, sisa
FROM public.barang
WHERE is_archived = true
  AND COALESCE(sisa, 0) <> 0
ORDER BY id;

-- Expected: no rows.
