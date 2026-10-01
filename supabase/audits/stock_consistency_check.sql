-- READ-ONLY audit for SIPB stock synchronization.
-- Run in Supabase SQL Editor. This script does not modify data.

-- 1) Mathematical integrity of the current stock summary.
SELECT
  id,
  nama_barang,
  jumlah_total,
  terpakai,
  sisa,
  (jumlah_total - terpakai) AS expected_sisa,
  CASE
    WHEN COALESCE(sisa,0) = COALESCE(jumlah_total,0) - COALESCE(terpakai,0)
    THEN 'OK' ELSE 'MISMATCH'
  END AS status
FROM public.barang
ORDER BY id;

-- 2) Ledger totals versus the current master summary.
-- If stock opname has never been used, inbound - active outbound should
-- equal the current sisa and inbound should equal jumlah_total.
WITH masuk AS (
  SELECT barang_id, SUM(jumlah) AS total_masuk
  FROM public.barang_masuk
  GROUP BY barang_id
),
keluar AS (
  SELECT d.barang_id, SUM(d.jumlah) AS total_keluar
  FROM public.detail_barang_keluar d
  JOIN public.transaksi_keluar t ON t.id=d.transaksi_keluar_id
  WHERE COALESCE(t.status,'AKTIF') <> 'DIBATALKAN'
  GROUP BY d.barang_id
),
opname AS (
  SELECT barang_id, COUNT(*) AS jumlah_opname,
         MAX(tanggal_opname) AS opname_terakhir
  FROM public.riwayat_opname
  GROUP BY barang_id
)
SELECT
  b.id,
  b.nama_barang,
  b.jumlah_total,
  COALESCE(m.total_masuk,0) AS total_masuk,
  b.terpakai,
  COALESCE(k.total_keluar,0) AS total_keluar,
  b.sisa,
  COALESCE(o.jumlah_opname,0) AS jumlah_opname,
  o.opname_terakhir,
  CASE
    WHEN COALESCE(o.jumlah_opname,0) > 0 THEN 'CHECK_OPNAME'
    WHEN b.jumlah_total = COALESCE(m.total_masuk,0)
     AND b.terpakai = COALESCE(k.total_keluar,0)
     AND b.sisa = COALESCE(m.total_masuk,0)-COALESCE(k.total_keluar,0)
    THEN 'OK'
    ELSE 'MISMATCH'
  END AS status
FROM public.barang b
LEFT JOIN masuk m ON m.barang_id=b.id
LEFT JOIN keluar k ON k.barang_id=b.id
LEFT JOIN opname o ON o.barang_id=b.id
ORDER BY b.id;

-- 3) Active Kuasi stock must agree with the master balance.
SELECT
  b.id,
  b.nama_barang,
  b.sisa AS master_sisa,
  COALESCE(SUM(sk.sisa_lembar),0) AS batch_sisa,
  CASE
    WHEN COALESCE(SUM(sk.sisa_lembar),0)=COALESCE(b.sisa,0)
    THEN 'OK' ELSE 'MISMATCH'
  END AS status
FROM public.barang b
LEFT JOIN public.stok_kuasi sk ON sk.barang_id=b.id
WHERE lower(COALESCE(b.kategori,'')) LIKE '%kuasi%'
GROUP BY b.id,b.nama_barang,b.sisa
ORDER BY b.id;
