-- Tambahkan keterangan khusus pada setiap transaksi Barang Masuk.
-- Keterangan bersifat per-transaksi agar nama Master Barang yang sama
-- tetap dapat dibedakan menurut spesifikasi/deskripsi penerimaannya.

ALTER TABLE public.barang_masuk
  ADD COLUMN IF NOT EXISTS keterangan text;

-- Wrapper 16-parameter untuk mempertahankan RPC lama dan menambahkan keterangan.
CREATE OR REPLACE FUNCTION public.record_barang_masuk(
  p_barang_id integer,
  p_kategori_id integer,
  p_nama_barang text,
  p_tipe text,
  p_merk text,
  p_satuan text,
  p_jumlah integer,
  p_harga_satuan numeric,
  p_sumber_dana text,
  p_tanggal date,
  p_nama_penyerah text,
  p_nama_penerima text,
  p_keterangan text,
  p_nomor_dus text,
  p_nomor_awal text,
  p_nomor_akhir text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_result jsonb;
  v_id integer;
BEGIN
  v_result := public.record_barang_masuk(
    p_barang_id,p_kategori_id,p_nama_barang,p_tipe,p_merk,p_satuan,
    p_jumlah,p_harga_satuan,p_sumber_dana,p_tanggal,p_nama_penyerah,
    p_nama_penerima,p_nomor_dus,p_nomor_awal,p_nomor_akhir
  );
  v_id := (v_result->>'id')::integer;
  UPDATE public.barang_masuk
  SET keterangan = NULLIF(trim(p_keterangan),'')
  WHERE id = v_id;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.record_barang_masuk(integer,integer,text,text,text,text,integer,numeric,text,date,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_barang_masuk(integer,integer,text,text,text,text,integer,numeric,text,date,text,text,text,text,text,text) TO authenticated;
