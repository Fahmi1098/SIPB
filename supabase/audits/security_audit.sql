-- READ-ONLY security audit for SIPB.
-- Run in Supabase SQL Editor. This file does not modify data.

-- 1) Direct write privileges on operational ledger tables.
SELECT
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'authenticated'
  AND table_schema = 'public'
  AND table_name IN (
    'barang_masuk',
    'detail_barang_keluar',
    'transaksi_keluar',
    'riwayat_opname',
    'stok_kuasi',
    'transaksi_kuasi_alokasi'
  )
ORDER BY table_name, privilege_type;

-- 2) Direct write privileges on stock-derived columns of barang.
SELECT
  grantee,
  privilege_type,
  column_name
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'barang'
  AND grantee = 'authenticated'
  AND column_name IN (
    'harga_terakhir',
    'jumlah_total',
    'terpakai',
    'sisa'
  )
ORDER BY column_name, privilege_type;

-- 3) RPCs exposed to authenticated users.
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'record_barang_masuk',
    'record_barang_keluar',
    'record_stock_opname',
    'cancel_barang_keluar',
    'manage_user_profile'
  )
ORDER BY routine_name;

-- 4) Stock constraints protecting mathematical balance.
SELECT
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.barang'::regclass
  AND conname IN (
    'barang_stock_values_nonnegative',
    'barang_stock_balance_check'
  )
ORDER BY conname;

-- 5) Detect any stock inconsistency after all hardening.
SELECT
  id,
  nama_barang,
  jumlah_total,
  terpakai,
  sisa
FROM public.barang
WHERE COALESCE(sisa,0) + COALESCE(terpakai,0)
   <> COALESCE(jumlah_total,0)
ORDER BY id;
