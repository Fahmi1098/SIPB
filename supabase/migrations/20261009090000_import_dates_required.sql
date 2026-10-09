-- Hapus tanggal default pada Import Persediaan.
-- Semua baris wajib mengirim tanggal_saldo_awal dan tanggal_bertambah dalam format ISO YYYY-MM-DD.
-- Import Persediaan: gunakan tanggal dari Excel per baris.
-- Input JSON mendukung tanggal_saldo_awal / tanggal_bertambah.
-- Jika tidak tersedia, tetap menggunakan default historis SIPB.

CREATE OR REPLACE FUNCTION public.import_rekap_persediaan(p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r jsonb;
  v_code text;
  v_name text;
  v_cat_name text;
  v_cat_id integer;
  v_saldo_qty integer;
  v_saldo_value numeric;
  v_add_qty integer;
  v_add_value numeric;
  v_satuan text;
  v_keterangan text;
  v_saldo_date date;
  v_add_date date;
  v_harga numeric;
  v_barang_id integer;
  v_existing integer;
  v_count integer := 0;
  v_receipts integer := 0;
BEGIN
  IF NOT public.sipb_is_admin() THEN
    RAISE EXCEPTION 'Hanya admin aktif yang dapat mengimpor data persediaan';
  END IF;

  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows)=0 THEN
    RAISE EXCEPTION 'Data import kosong atau tidak valid';
  END IF;

  IF jsonb_array_length(p_rows) > 500 THEN
    RAISE EXCEPTION 'Maksimal 500 barang per import';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) x
    GROUP BY lower(trim(x->>'kode_barang'))
    HAVING lower(trim(x->>'kode_barang')) <> '' AND count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Terdapat Kode Barang yang duplikat di file import';
  END IF;

  SELECT count(*) INTO v_existing
  FROM public.barang b
  WHERE b.kode_barang IS NOT NULL
    AND lower(b.kode_barang) IN (
      SELECT lower(trim(x->>'kode_barang'))
      FROM jsonb_array_elements(p_rows) x
      WHERE trim(coalesce(x->>'kode_barang','')) <> ''
    );

  IF v_existing > 0 THEN
    RAISE EXCEPTION 'Sebagian Kode Barang sudah ada di Master Barang. Import dibatalkan agar stok tidak terduplikasi.';
  END IF;

  FOR r IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    v_code := trim(coalesce(r->>'kode_barang',''));
    v_name := trim(coalesce(r->>'nama_barang',''));
    v_cat_name := trim(coalesce(r->>'kategori',''));
    v_satuan := nullif(trim(coalesce(r->>'satuan','')), '');
    v_keterangan := nullif(trim(coalesce(
      r->>'keterangan',
      r->>'Keterangan',
      r->>'keterangan_spesifikasi',
      ''
    )),'');
    
    v_saldo_date := NULLIF(trim(coalesce(r->>'tanggal_saldo_awal','')),'')::date;
    v_add_date := NULLIF(trim(coalesce(r->>'tanggal_bertambah','')),'')::date;

    v_saldo_qty := greatest(0, coalesce((r->>'saldo_qty')::numeric,0)::integer);
    v_saldo_value := greatest(0, coalesce((r->>'saldo_value')::numeric,0));
    v_add_qty := greatest(0, coalesce((r->>'bertambah_qty')::numeric,0)::integer);
    v_add_value := greatest(0, coalesce((r->>'bertambah_value')::numeric,0));

    IF v_code='' OR v_name='' THEN
      RAISE EXCEPTION 'Kode Barang dan Nama Barang wajib diisi';
    END IF;

    IF v_cat_name='' THEN
      RAISE EXCEPTION 'Kategori wajib diisi untuk %',v_name;
    END IF;

    IF v_saldo_date IS NULL OR v_add_date IS NULL THEN
      RAISE EXCEPTION 'Tanggal Saldo Awal dan Tanggal Bertambah wajib diisi untuk %', v_name;
    END IF;

    IF v_add_qty > 0 AND v_add_date < v_saldo_date THEN
      RAISE EXCEPTION 'Tanggal Bertambah untuk % tidak boleh lebih awal dari Tanggal Saldo Awal',v_name;
    END IF;

    SELECT id INTO v_cat_id
    FROM public.kategori
    WHERE lower(trim(nama_kategori))=lower(v_cat_name)
    LIMIT 1;

    IF v_cat_id IS NULL THEN
      INSERT INTO public.kategori(nama_kategori)
      VALUES(v_cat_name)
      RETURNING id INTO v_cat_id;
    END IF;

    v_harga := CASE
      WHEN v_add_qty > 0 THEN round(v_add_value / v_add_qty, 2)
      WHEN v_saldo_qty > 0 THEN round(v_saldo_value / v_saldo_qty, 2)
      ELSE 0
    END;

    INSERT INTO public.barang(
      kode_barang,kategori_id,nama_barang,keterangan,tipe,merk,satuan,
      harga_terakhir,jumlah_total,terpakai,sisa,stok_minimum
    )
    VALUES(
      v_code,v_cat_id,v_name,v_keterangan,NULL,NULL,v_satuan,
      v_harga,v_saldo_qty+v_add_qty,0,v_saldo_qty+v_add_qty,0
    )
    RETURNING id INTO v_barang_id;

    IF v_saldo_qty > 0 THEN
      INSERT INTO public.barang_masuk(
        barang_id,jumlah,harga_satuan,sumber_dana,
        nomor_awal,nomor_akhir,tanggal_masuk,
        nama_penyerah,nama_penerima,nomor_dus,keterangan
      )
      VALUES(
        v_barang_id,
        v_saldo_qty,
        CASE WHEN v_saldo_qty>0 THEN round(v_saldo_value/v_saldo_qty,2) ELSE 0 END,
        'Saldo Awal',
        NULL,NULL,v_saldo_date,
        'Saldo Awal '+to_char(v_saldo_date,'DD Mon YYYY'),'Pengurus Barang',NULL,v_keterangan
      );
      v_receipts := v_receipts + 1;
    END IF;

    IF v_add_qty > 0 THEN
      INSERT INTO public.barang_masuk(
        barang_id,jumlah,harga_satuan,sumber_dana,
        nomor_awal,nomor_akhir,tanggal_masuk,
        nama_penyerah,nama_penerima,nomor_dus,keterangan
      )
      VALUES(
        v_barang_id,
        v_add_qty,
        round(v_add_value/v_add_qty,2),
        'Bertambah',
        NULL,NULL,v_add_date,
        'Rekapitulasi Persediaan '+to_char(v_add_date,'YYYY'),'Pengurus Barang',NULL,v_keterangan
      );
      v_receipts := v_receipts + 1;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'status','success',
    'barang',v_count,
    'penerimaan',v_receipts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_rekap_persediaan(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_rekap_persediaan(jsonb) TO authenticated;
