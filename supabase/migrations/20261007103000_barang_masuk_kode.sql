-- Tambahkan kode barang pada transaksi Barang Masuk.
-- Kode akan tersimpan pada Master Barang saat membuat barang baru.
-- Untuk barang lama, kode tetap berasal dari Master Barang.

CREATE OR REPLACE FUNCTION public.record_barang_masuk(
  p_barang_id integer,
  p_kode_barang text,
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
  v_code text;
BEGIN
  v_code := NULLIF(trim(p_kode_barang),'');
  
  IF v_code IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.barang b
    WHERE lower(trim(b.kode_barang)) = lower(v_code)
      AND (p_barang_id IS NULL OR b.id <> p_barang_id)
  ) THEN
    RAISE EXCEPTION 'Kode Barang "%" sudah digunakan oleh barang lain', v_code;
  END IF;

  v_result := public.record_barang_masuk(
    p_barang_id,p_kategori_id,p_nama_barang,p_tipe,p_merk,p_satuan,
    p_jumlah,p_harga_satuan,p_sumber_dana,p_tanggal,p_nama_penyerah,
    p_nama_penerima,p_keterangan,p_nomor_dus,p_nomor_awal,p_nomor_akhir
  );

  v_id := (v_result->>'id')::integer;

  IF v_code IS NOT NULL THEN
    UPDATE public.barang
    SET kode_barang = v_code
    WHERE id = v_id;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.record_barang_masuk(integer,text,integer,text,text,text,text,integer,numeric,text,date,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_barang_masuk(integer,text,integer,text,text,text,text,integer,numeric,text,date,text,text,text,text,text,text) TO authenticated;
