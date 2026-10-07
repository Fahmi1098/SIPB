-- SIPB: konsistensi Kode Barang pada transaksi Barang Masuk.
-- Barang yang sudah ada tidak boleh mengganti identitas/kode Master Barang
-- melalui form Barang Masuk. Perubahan kode dilakukan dari Master Barang.
-- Barang baru boleh menetapkan kode, dengan validasi unik case-insensitive.

DO $$
DECLARE
  v_dup text;
BEGIN
  SELECT lower(trim(kode_barang))
  INTO v_dup
  FROM public.barang
  WHERE NULLIF(trim(kode_barang),'') IS NOT NULL
  GROUP BY lower(trim(kode_barang))
  HAVING count(*) > 1
  LIMIT 1;

  IF v_dup IS NOT NULL THEN
    RAISE EXCEPTION 'Tidak dapat memasang pengamanan Kode Barang karena terdapat kode duplikat: %', v_dup;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_barang_kode_barang_normalized
ON public.barang (lower(trim(kode_barang)))
WHERE NULLIF(trim(kode_barang),'') IS NOT NULL;

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
  v_barang_id integer;
  v_transaksi_id integer;
  v_code text;
  v_master_code text;
BEGIN
  v_code := NULLIF(trim(p_kode_barang), '');

  IF p_jumlah IS NULL OR p_jumlah <= 0 THEN
    RAISE EXCEPTION 'Jumlah Barang Masuk harus lebih dari 0';
  END IF;

  IF p_harga_satuan IS NULL OR p_harga_satuan < 0 THEN
    RAISE EXCEPTION 'Harga Satuan tidak valid';
  END IF;

  IF p_barang_id IS NOT NULL THEN
    SELECT kode_barang
    INTO v_master_code
    FROM public.barang
    WHERE id = p_barang_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Master Barang dengan ID % tidak ditemukan', p_barang_id;
    END IF;

    -- Barang lama tidak boleh mengganti kode melalui Barang Masuk.
    IF v_code IS DISTINCT FROM NULLIF(trim(v_master_code), '') THEN
      IF v_code IS NOT NULL OR NULLIF(trim(v_master_code), '') IS NOT NULL THEN
        RAISE EXCEPTION 'Kode Barang untuk barang yang sudah ada harus mengikuti Master Barang. Ubah kode melalui Master Barang.';
      END IF;
    END IF;
  ELSE
    IF v_code IS NULL THEN
      RAISE EXCEPTION 'Kode Barang wajib diisi untuk barang baru';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.barang b
      WHERE lower(trim(b.kode_barang)) = lower(v_code)
    ) THEN
      RAISE EXCEPTION 'Kode Barang "%" sudah digunakan oleh barang lain', v_code;
    END IF;
  END IF;

  -- Panggil fungsi dasar 15-parameter secara eksplisit.
  v_result := public.record_barang_masuk(
    p_barang_id,
    p_kategori_id,
    p_nama_barang,
    p_tipe,
    p_merk,
    p_satuan,
    p_jumlah,
    p_harga_satuan,
    p_sumber_dana,
    p_tanggal,
    p_nama_penyerah,
    p_nama_penerima,
    p_nomor_dus,
    p_nomor_awal,
    p_nomor_akhir
  );

  v_transaksi_id := (v_result->>'id')::integer;
  v_barang_id := (v_result->>'barang_id')::integer;

  IF v_transaksi_id IS NULL OR v_barang_id IS NULL THEN
    RAISE EXCEPTION 'Transaksi Barang Masuk tidak menghasilkan ID yang valid';
  END IF;

  UPDATE public.barang_masuk
  SET keterangan = NULLIF(trim(p_keterangan), '')
  WHERE id = v_transaksi_id;

  -- Hanya barang baru yang menetapkan kode dari transaksi.
  IF p_barang_id IS NULL AND v_code IS NOT NULL THEN
    UPDATE public.barang
    SET kode_barang = v_code
    WHERE id = v_barang_id;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.record_barang_masuk(integer,text,integer,text,text,text,text,integer,numeric,text,date,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_barang_masuk(integer,text,integer,text,text,text,text,integer,numeric,text,date,text,text,text,text,text,text) TO authenticated;
