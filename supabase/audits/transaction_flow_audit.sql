-- SIPB transaction-flow audit
-- Run in Supabase SQL Editor after applying the latest migrations.
-- These queries are read-only.

-- 1) Master balance invariant.
SELECT id,nama_barang,jumlah_total,terpakai,sisa,
       CASE WHEN COALESCE(jumlah_total,0)=COALESCE(terpakai,0)+COALESCE(sisa,0)
            THEN 'OK' ELSE 'MISMATCH' END AS status
FROM public.barang
WHERE COALESCE(jumlah_total,0)<>COALESCE(terpakai,0)+COALESCE(sisa,0)
ORDER BY id;

-- 2) Reconstruct current ordinary stock from receipts, active issues and opname adjustments.
WITH incoming AS (
  SELECT barang_id,SUM(jumlah)::integer AS qty
  FROM public.barang_masuk GROUP BY barang_id
),
outgoing AS (
  SELECT d.barang_id,SUM(d.jumlah)::integer AS qty
  FROM public.detail_barang_keluar d
  JOIN public.transaksi_keluar t ON t.id=d.transaksi_keluar_id
  WHERE COALESCE(t.status,'AKTIF')='AKTIF'
  GROUP BY d.barang_id
),
opname AS (
  SELECT barang_id,SUM(selisih)::integer AS qty
  FROM public.riwayat_opname GROUP BY barang_id
)
SELECT b.id,b.nama_barang,b.sisa,
       COALESCE(i.qty,0)-COALESCE(o.qty,0)+COALESCE(n.qty,0) AS reconstructed_sisa,
       CASE WHEN b.sisa=COALESCE(i.qty,0)-COALESCE(o.qty,0)+COALESCE(n.qty,0)
            THEN 'OK' ELSE 'MISMATCH' END AS status
FROM public.barang b
LEFT JOIN incoming i ON i.barang_id=b.id
LEFT JOIN outgoing o ON o.barang_id=b.id
LEFT JOIN opname n ON n.barang_id=b.id
WHERE b.sisa<>COALESCE(i.qty,0)-COALESCE(o.qty,0)+COALESCE(n.qty,0)
ORDER BY b.id;

-- 3) Kuasi: master balance must equal active batch balance.
SELECT b.id,b.nama_barang,b.sisa,
       COALESCE(SUM(sk.sisa_lembar),0)::integer AS batch_sisa,
       CASE WHEN b.sisa=COALESCE(SUM(sk.sisa_lembar),0)::integer
            THEN 'OK' ELSE 'MISMATCH' END AS status
FROM public.barang b
JOIN public.kategori k ON k.id=b.kategori_id
LEFT JOIN public.stok_kuasi sk ON sk.barang_id=b.id
WHERE lower(COALESCE(k.nama_kategori,'')) LIKE '%kuasi%'
GROUP BY b.id,b.nama_barang,b.sisa
HAVING b.sisa<>COALESCE(SUM(sk.sisa_lembar),0)::integer
ORDER BY b.id;

-- 4) No active outgoing detail may exceed current master stock.
SELECT d.barang_id,b.nama_barang,
       SUM(d.jumlah)::integer AS active_outgoing,
       b.jumlah_total,b.sisa
FROM public.detail_barang_keluar d
JOIN public.transaksi_keluar t ON t.id=d.transaksi_keluar_id
JOIN public.barang b ON b.id=d.barang_id
WHERE COALESCE(t.status,'AKTIF')='AKTIF'
GROUP BY d.barang_id,b.nama_barang,b.jumlah_total,b.sisa
HAVING SUM(d.jumlah) > b.jumlah_total
ORDER BY d.barang_id;

-- 5) Every Kuasi allocation must belong to an active/cancelled transaction
-- and its detail must point to the same transaction and batch quantity.
SELECT a.id,a.transaksi_keluar_id,a.detail_barang_keluar_id,a.stok_kuasi_id,
       a.jumlah,d.jumlah AS detail_jumlah
FROM public.transaksi_kuasi_alokasi a
JOIN public.detail_barang_keluar d ON d.id=a.detail_barang_keluar_id
WHERE a.transaksi_keluar_id<>d.transaksi_keluar_id
   OR a.jumlah<1
   OR a.jumlah>d.jumlah
ORDER BY a.id;

-- 6) Kuasi batch range constraints and overlap check.
SELECT id,barang_id,prefix_huruf,digit_awal,digit_akhir,digit_sekarang,sisa_lembar
FROM public.stok_kuasi
WHERE digit_akhir<digit_awal
   OR digit_sekarang<digit_awal
   OR digit_sekarang>digit_akhir+1
   OR sisa_lembar<0
ORDER BY barang_id,id;
