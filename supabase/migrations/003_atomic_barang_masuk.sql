-- Atomic Barang Masuk / Penerimaan SIPB
-- Run once in Supabase SQL Editor after 002_atomic_inventory_transactions.sql.

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
  v_barang_id integer := p_barang_id;
  v_is_kuasi boolean := false;
  v_kategori_nama text;
  v_prefix_awal text;
  v_prefix_akhir text;
  v_prefix text;
  v_digits_awal text;
  v_digits_akhir text;
  v_pad integer;
  v_num_awal integer;
  v_num_akhir integer;
  v_range integer;
  v_id integer;
BEGIN
  IF NOT public.sipb_is_active_user() THEN
    RAISE EXCEPTION 'Akun SIPB tidak aktif';
  END IF;

  IF COALESCE(p_jumlah,0) < 1 THEN
    RAISE EXCEPTION 'Jumlah barang harus lebih dari 0';
  END IF;

  IF COALESCE(p_harga_satuan,0) < 0 THEN
    RAISE EXCEPTION 'Harga satuan tidak boleh negatif';
  END IF;

  IF p_tanggal IS NULL THEN
    RAISE EXCEPTION 'Tanggal masuk wajib diisi';
  END IF;

  IF COALESCE(trim(p_nama_penyerah),'') = '' THEN
    RAISE EXCEPTION 'Nama penyerah wajib diisi';
  END IF;

  IF COALESCE(trim(p_nama_penerima),'') = '' THEN
    RAISE EXCEPTION 'Nama penerima wajib diisi';
  END IF;

  -- Existing item: lock it so two simultaneous receipts cannot corrupt stock.
  IF v_barang_id IS NOT NULL THEN
    SELECT b.id,k.nama_kategori
      INTO v_barang_id,v_kategori_nama
    FROM public.barang b
    LEFT JOIN public.kategori k ON k.id=b.kategori_id
    WHERE b.id=v_barang_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Barang ID % tidak ditemukan',p_barang_id;
    END IF;
  ELSE
    IF COALESCE(trim(p_nama_barang),'') = '' THEN
      RAISE EXCEPTION 'Nama barang baru wajib diisi';
    END IF;

    IF p_kategori_id IS NULL THEN
      RAISE EXCEPTION 'Kategori barang baru wajib dipilih';
    END IF;

    SELECT nama_kategori INTO v_kategori_nama
    FROM public.kategori
    WHERE id=p_kategori_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Kategori tidak ditemukan';
    END IF;

    INSERT INTO public.barang(
      kategori_id,nama_barang,tipe,merk,satuan,harga_terakhir,
      jumlah_total,terpakai,sisa,stok_minimum
    )
    VALUES(
      p_kategori_id,trim(p_nama_barang),COALESCE(NULLIF(trim(p_tipe),''),'-'),
      COALESCE(NULLIF(trim(p_merk),''),'-'),COALESCE(NULLIF(trim(p_satuan),''),'PCS'),
      p_harga_satuan,0,0,0,0
    )
    RETURNING id INTO v_barang_id;
  END IF;

  v_is_kuasi := lower(COALESCE(v_kategori_nama,'')) LIKE '%kuasi%';

  IF v_is_kuasi THEN
    IF COALESCE(trim(p_nomor_dus),'')='' OR COALESCE(trim(p_nomor_awal),'')='' OR COALESCE(trim(p_nomor_akhir),'')='' THEN
      RAISE EXCEPTION 'Nomor Dus, Nomor Awal, dan Nomor Akhir wajib diisi untuk barang Kuasi';
    END IF;

    v_prefix_awal := regexp_replace(trim(p_nomor_awal),'[0-9]','','g');
    v_prefix_akhir := regexp_replace(trim(p_nomor_akhir),'[0-9]','','g');

    IF v_prefix_awal <> v_prefix_akhir THEN
      RAISE EXCEPTION 'Prefix Nomor Awal dan Nomor Akhir harus sama';
    END IF;

    v_digits_awal := regexp_replace(trim(p_nomor_awal),'[^0-9]','','g');
    v_digits_akhir := regexp_replace(trim(p_nomor_akhir),'[^0-9]','','g');

    IF v_digits_awal='' OR v_digits_akhir='' THEN
      RAISE EXCEPTION 'Nomor Awal dan Nomor Akhir harus memiliki angka';
    END IF;

    IF length(v_digits_awal) <> length(v_digits_akhir) THEN
      RAISE EXCEPTION 'Panjang digit Nomor Awal dan Nomor Akhir harus sama';
    END IF;

    v_pad := length(v_digits_awal);
    v_num_awal := v_digits_awal::integer;
    v_num_akhir := v_digits_akhir::integer;
    v_range := v_num_akhir-v_num_awal+1;

    IF v_num_akhir < v_num_awal THEN
      RAISE EXCEPTION 'Nomor Akhir harus lebih besar atau sama dengan Nomor Awal';
    END IF;

    IF v_range <> p_jumlah THEN
      RAISE EXCEPTION 'Jumlah % tidak sesuai rentang nomor seri %',p_jumlah,v_range;
    END IF;

    v_prefix := v_prefix_awal;
  END IF;

  INSERT INTO public.barang_masuk(
    barang_id,jumlah,harga_satuan,sumber_dana,
    nomor_awal,nomor_akhir,tanggal_masuk,
    nama_penyerah,nama_penerima,nomor_dus
  )
  VALUES(
    v_barang_id,p_jumlah,p_harga_satuan,p_sumber_dana,
    CASE WHEN v_is_kuasi THEN trim(p_nomor_awal) ELSE NULL END,
    CASE WHEN v_is_kuasi THEN trim(p_nomor_akhir) ELSE NULL END,
    p_tanggal,trim(p_nama_penyerah),trim(p_nama_penerima),
    CASE WHEN v_is_kuasi THEN trim(p_nomor_dus) ELSE NULL END
  )
  RETURNING id INTO v_id;

  IF v_is_kuasi THEN
    INSERT INTO public.stok_kuasi(
      barang_id,prefix_huruf,panjang_digit,digit_awal,digit_akhir,
      digit_sekarang,sisa_lembar,tanggal_masuk,nomor_dus
    )
    VALUES(
      v_barang_id,v_prefix,v_pad,v_num_awal,v_num_akhir,
      v_num_awal,p_jumlah,p_tanggal,trim(p_nomor_dus)
    );
  END IF;

  UPDATE public.barang
  SET jumlah_total=COALESCE(jumlah_total,0)+p_jumlah,
      sisa=COALESCE(sisa,0)+p_jumlah,
      harga_terakhir=p_harga_satuan
  WHERE id=v_barang_id;

  RETURN jsonb_build_object(
    'id',v_id,
    'barang_id',v_barang_id,
    'is_kuasi',v_is_kuasi,
    'status','success'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_barang_masuk(integer,integer,text,text,text,text,integer,numeric,text,date,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_barang_masuk(integer,integer,text,text,text,text,integer,numeric,text,date,text,text,text,text,text) TO authenticated;

-- Keep the existing atomic RPCs private to authenticated users as well.
REVOKE ALL ON FUNCTION public.sipb_is_active_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sipb_is_active_user() TO authenticated;

REVOKE ALL ON FUNCTION public.record_barang_keluar(date,text,text,text,text,text,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_barang_keluar(date,text,text,text,text,text,text,text,text,jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.record_stock_opname(date,integer,integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_stock_opname(date,integer,integer,text,text) TO authenticated;
