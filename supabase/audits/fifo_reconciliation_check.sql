-- Read-only checks for SIPB FIFO layer balances and allocations.
-- Run after 20261102140000_fifo_cost_layers.sql.

WITH fifo AS (
  SELECT barang_id,
         COALESCE(SUM(sisa),0)::bigint AS fifo_sisa,
         COALESCE(SUM(sisa * harga_satuan),0)::numeric AS nilai_fifo,
         COUNT(*)::integer AS jumlah_lapisan,
         COUNT(*) FILTER (WHERE harga_estimasi)::integer AS lapisan_estimasi
  FROM public.sipb_fifo_layers
  GROUP BY barang_id
)
SELECT b.id AS barang_id, b.nama_barang, b.sisa AS saldo_master,
       COALESCE(f.fifo_sisa,0) AS saldo_fifo,
       COALESCE(f.fifo_sisa,0)-COALESCE(b.sisa,0) AS selisih,
       COALESCE(f.nilai_fifo,0) AS nilai_fifo,
       COALESCE(f.jumlah_lapisan,0) AS jumlah_lapisan,
       COALESCE(f.lapisan_estimasi,0) AS lapisan_estimasi
FROM public.barang b
LEFT JOIN public.kategori k ON k.id=b.kategori_id
LEFT JOIN fifo f ON f.barang_id=b.id
WHERE lower(COALESCE(k.nama_kategori,b.kategori,'')) NOT LIKE '%kuasi%'
  AND COALESCE(f.fifo_sisa,0) <> COALESCE(b.sisa,0)
ORDER BY b.nama_barang,b.id;

SELECT d.id AS detail_id, d.transaksi_keluar_id, d.barang_id, d.jumlah,
       COALESCE(SUM(a.jumlah) FILTER (WHERE a.reversed_at IS NULL),0)::integer AS jumlah_teralokasi
FROM public.detail_barang_keluar d
JOIN public.transaksi_keluar t ON t.id=d.transaksi_keluar_id
JOIN public.barang b ON b.id=d.barang_id
LEFT JOIN public.kategori k ON k.id=b.kategori_id
LEFT JOIN public.sipb_fifo_allocations a
  ON a.detail_barang_keluar_id=d.id AND a.source_type='BARANG_KELUAR'
WHERE COALESCE(t.status,'AKTIF')='AKTIF'
  AND lower(COALESCE(k.nama_kategori,b.kategori,'')) NOT LIKE '%kuasi%'
GROUP BY d.id,d.transaksi_keluar_id,d.barang_id,d.jumlah
HAVING COALESCE(SUM(a.jumlah) FILTER (WHERE a.reversed_at IS NULL),0) <> d.jumlah
ORDER BY d.transaksi_keluar_id,d.id;

SELECT source_type,
       COUNT(*)::integer AS jumlah_lapisan,
       SUM(jumlah_masuk)::bigint AS jumlah_total_masuk,
       SUM(sisa)::bigint AS jumlah_sisa,
       SUM(sisa*harga_satuan)::numeric AS nilai_sisa,
       COUNT(*) FILTER (WHERE harga_estimasi)::integer AS lapisan_estimasi
FROM public.sipb_fifo_layers
GROUP BY source_type
ORDER BY source_type;

SELECT COUNT(*) FILTER (WHERE sisa < 0)::integer AS lapisan_stok_negatif,
       COUNT(*) FILTER (WHERE sisa > jumlah_masuk)::integer AS lapisan_sisa_melebihi_masuk,
       COUNT(*) FILTER (WHERE harga_satuan < 0)::integer AS lapisan_harga_negatif
FROM public.sipb_fifo_layers;
