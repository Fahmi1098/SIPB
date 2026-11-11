-- SIPB: enforce consistent item identity during rekap-persediaan import.
-- Name + unit + specification identify the item. Purchase price does not.
BEGIN;

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
  v_saldo_qty_num numeric;
  v_saldo_value numeric;
  v_add_qty_num numeric;
  v_add_value numeric;
  v_saldo_qty integer;
  v_add_qty integer;
  v_satuan text;
  v_tipe text;
  v_merk text;
  v_keterangan text;
  v_duplicate_id integer;
  v_saldo_date date;
  v_add_date date;
  v_harga numeric;
  v_barang_id integer;
  v_existing integer;
  v_count integer := 0;
  v_receipts integer := 0;
BEGIN
  IF NOT public.sipb_is_active_user() OR NOT public.sipb_is_admin() THEN
    RAISE EXCEPTION 'Hanya admin aktif yang dapat mengimpor data persediaan';
  END IF;

  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Data import kosong atau tidak valid';
  END IF;
  IF jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'Data import kosong atau tidak valid';
  END IF;

  IF jsonb_array_length(p_rows) > 500 THEN
    RAISE EXCEPTION 'Maksimal 500 barang per import';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) x
    GROUP BY lower(trim(COALESCE(x->>'kode_barang', '')))
    HAVING lower(trim(COALESCE(x->>'kode_barang', ''))) <> ''
       AND count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Terdapat Kode Barang yang duplikat di file import';
  END IF;

  SELECT count(*) INTO v_existing
  FROM public.barang b
  WHERE NULLIF(trim(b.kode_barang), '') IS NOT NULL
    AND lower(trim(b.kode_barang)) IN (
      SELECT lower(trim(x->>'kode_barang'))
      FROM jsonb_array_elements(p_rows) x
      WHERE NULLIF(trim(x->>'kode_barang'), '') IS NOT NULL
    );

  IF v_existing > 0 THEN
    RAISE EXCEPTION
      'Sebagian Kode Barang sudah ada di Master Barang. Import dibatalkan agar stok tidak terduplikasi.';
  END IF;


  -- An item's identity is its normalized name, unit and specification.
  -- Purchase price is intentionally excluded: different purchase prices belong
  -- to separate receipt/FIFO layers for the same item.
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_rows) x
    WHERE NULLIF(btrim(COALESCE(x->>'nama_barang', '')), '') IS NOT NULL
      AND NULLIF(btrim(COALESCE(x->>'satuan', '')), '') IS NOT NULL
    GROUP BY
      lower(regexp_replace(btrim(COALESCE(x->>'nama_barang', '')), '[[:space:]]+', ' ', 'g')),
      lower(regexp_replace(btrim(COALESCE(x->>'satuan', '')), '[[:space:]]+', ' ', 'g')),
      lower(regexp_replace(btrim(COALESCE(x->>'keterangan', x->>'Keterangan', x->>'keterangan_spesifikasi', '')), '[[:space:]]+', ' ', 'g')),
      lower(regexp_replace(btrim(COALESCE(NULLIF(btrim(x->>'tipe'), '-'), '')), '[[:space:]]+', ' ', 'g')),
      lower(regexp_replace(btrim(COALESCE(NULLIF(btrim(x->>'merk'), '-'), '')), '[[:space:]]+', ' ', 'g'))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'File import memuat identitas barang yang sama lebih dari sekali. Satukan menjadi satu barang; harga berbeda dicatat sebagai transaksi Barang Masuk.';
  END IF;

  SELECT b.id INTO v_duplicate_id
  FROM public.barang b
  JOIN jsonb_array_elements(p_rows) x ON
    lower(regexp_replace(btrim(COALESCE(b.nama_barang, '')), '[[:space:]]+', ' ', 'g')) =
    lower(regexp_replace(btrim(COALESCE(x->>'nama_barang', '')), '[[:space:]]+', ' ', 'g'))
    AND lower(regexp_replace(btrim(COALESCE(b.satuan, '')), '[[:space:]]+', ' ', 'g')) =
    lower(regexp_replace(btrim(COALESCE(x->>'satuan', '')), '[[:space:]]+', ' ', 'g'))
    AND lower(regexp_replace(btrim(COALESCE(b.keterangan, '')), '[[:space:]]+', ' ', 'g')) =
    lower(regexp_replace(btrim(COALESCE(x->>'keterangan', x->>'Keterangan', x->>'keterangan_spesifikasi', '')), '[[:space:]]+', ' ', 'g'))
    AND lower(regexp_replace(btrim(COALESCE(NULLIF(btrim(b.tipe), '-'), '')), '[[:space:]]+', ' ', 'g')) =
    lower(regexp_replace(btrim(COALESCE(NULLIF(btrim(x->>'tipe'), '-'), '')), '[[:space:]]+', ' ', 'g'))
    AND lower(regexp_replace(btrim(COALESCE(NULLIF(btrim(b.merk), '-'), '')), '[[:space:]]+', ' ', 'g')) =
    lower(regexp_replace(btrim(COALESCE(NULLIF(btrim(x->>'merk'), '-'), '')), '[[:space:]]+', ' ', 'g'))
  WHERE NULLIF(btrim(COALESCE(x->>'nama_barang', '')), '') IS NOT NULL
    AND NULLIF(btrim(COALESCE(x->>'satuan', '')), '') IS NOT NULL
  LIMIT 1;

  IF v_duplicate_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Identitas barang pada file import sudah ada di Data Barang (ID %). Gunakan data yang sudah ada; harga baru dicatat melalui Barang Masuk.',
      v_duplicate_id;
  END IF;

  FOR r IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    IF jsonb_typeof(r) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Setiap baris import harus berupa objek data';
    END IF;

    v_code := trim(COALESCE(r->>'kode_barang', ''));
    v_name := trim(COALESCE(r->>'nama_barang', ''));
    v_cat_name := trim(COALESCE(r->>'kategori', ''));
    v_satuan := NULLIF(trim(COALESCE(r->>'satuan', '')), '');
    v_tipe := NULLIF(trim(COALESCE(r->>'tipe', '')), '');
    v_merk := NULLIF(trim(COALESCE(r->>'merk', '')), '');
    v_keterangan := NULLIF(trim(COALESCE(
      r->>'keterangan', r->>'Keterangan', r->>'keterangan_spesifikasi', ''
    )), '');

    IF length(v_code) > 80 OR length(v_name) > 255
       OR length(COALESCE(v_keterangan, '')) > 500
       OR length(COALESCE(v_satuan, '')) > 80
       OR length(COALESCE(v_tipe, '')) > 100
       OR length(COALESCE(v_merk, '')) > 100 THEN
      RAISE EXCEPTION 'Kode, nama, satuan, atau keterangan terlalu panjang untuk %', v_name;
    END IF;

    IF v_code = '' OR v_name = '' THEN
      RAISE EXCEPTION 'Kode Barang dan Nama Barang wajib diisi';
    END IF;
    IF v_cat_name = '' THEN
      RAISE EXCEPTION 'Kategori wajib diisi untuk %', v_name;
    END IF;
    IF v_satuan IS NULL THEN
      RAISE EXCEPTION 'Satuan wajib diisi untuk %', v_name;
    END IF;

    v_saldo_date := NULLIF(trim(COALESCE(r->>'tanggal_saldo_awal', '')), '')::date;
    v_add_date := NULLIF(trim(COALESCE(r->>'tanggal_bertambah', '')), '')::date;
    IF v_saldo_date IS NULL OR v_add_date IS NULL THEN
      RAISE EXCEPTION 'Tanggal Saldo Awal dan Tanggal Bertambah wajib diisi untuk %', v_name;
    END IF;

    v_saldo_qty_num := NULLIF(trim(COALESCE(r->>'saldo_qty', '')), '')::numeric;
    v_saldo_value := NULLIF(trim(COALESCE(r->>'saldo_value', '')), '')::numeric;
    v_add_qty_num := NULLIF(trim(COALESCE(r->>'bertambah_qty', '')), '')::numeric;
    v_add_value := NULLIF(trim(COALESCE(r->>'bertambah_value', '')), '')::numeric;

    IF v_saldo_qty_num IS NULL OR v_saldo_value IS NULL
       OR v_add_qty_num IS NULL OR v_add_value IS NULL THEN
      RAISE EXCEPTION 'Jumlah dan nominal saldo/bertambah wajib berupa angka untuk %', v_name;
    END IF;

    IF v_saldo_qty_num::text IN ('NaN', 'Infinity', '-Infinity')
       OR v_saldo_value::text IN ('NaN', 'Infinity', '-Infinity')
       OR v_add_qty_num::text IN ('NaN', 'Infinity', '-Infinity')
       OR v_add_value::text IN ('NaN', 'Infinity', '-Infinity') THEN
      RAISE EXCEPTION 'Jumlah dan nominal untuk % harus berupa angka yang terbatas', v_name;
    END IF;

    IF v_saldo_qty_num < 0 OR v_add_qty_num < 0
       OR v_saldo_qty_num <> trunc(v_saldo_qty_num)
       OR v_add_qty_num <> trunc(v_add_qty_num)
       OR v_saldo_qty_num > 2147483647
       OR v_add_qty_num > 2147483647 THEN
      RAISE EXCEPTION 'Jumlah barang untuk % harus bilangan bulat nol atau lebih', v_name;
    END IF;

    IF v_saldo_value < 0 OR v_add_value < 0 THEN
      RAISE EXCEPTION 'Nominal saldo dan bertambah untuk % tidak boleh negatif', v_name;
    END IF;

    IF (v_saldo_qty_num = 0 AND v_saldo_value <> 0)
       OR (v_add_qty_num = 0 AND v_add_value <> 0) THEN
      RAISE EXCEPTION 'Nominal untuk % tidak boleh diisi jika jumlahnya nol', v_name;
    END IF;

    IF v_saldo_qty_num + v_add_qty_num > 2147483647 THEN
      RAISE EXCEPTION 'Total jumlah barang untuk % melebihi batas integer', v_name;
    END IF;

    v_saldo_qty := v_saldo_qty_num::integer;
    v_add_qty := v_add_qty_num::integer;

    IF v_add_qty > 0 AND v_add_date < v_saldo_date THEN
      RAISE EXCEPTION
        'Tanggal Bertambah untuk % tidak boleh lebih awal dari Tanggal Saldo Awal',
        v_name;
    END IF;

    SELECT id INTO v_cat_id
    FROM public.kategori
    WHERE lower(trim(nama_kategori)) = lower(trim(v_cat_name))
    LIMIT 1;

    IF v_cat_id IS NULL THEN
      INSERT INTO public.kategori(nama_kategori)
      VALUES (v_cat_name)
      RETURNING id INTO v_cat_id;
    END IF;

    v_harga := CASE
      WHEN v_add_qty > 0 THEN round(v_add_value / v_add_qty, 2)
      WHEN v_saldo_qty > 0 THEN round(v_saldo_value / v_saldo_qty, 2)
      ELSE 0
    END;

    INSERT INTO public.barang(
      kode_barang, kategori_id, nama_barang, keterangan, tipe, merk, satuan,
      harga_terakhir, jumlah_total, terpakai, sisa, stok_minimum, is_archived
    )
    VALUES(
      v_code, v_cat_id, v_name, v_keterangan, v_tipe, v_merk, v_satuan,
      v_harga, v_saldo_qty + v_add_qty, 0, v_saldo_qty + v_add_qty, 0, false
    )
    RETURNING id INTO v_barang_id;

    IF v_saldo_qty > 0 THEN
      INSERT INTO public.barang_masuk(
        barang_id, jumlah, harga_satuan, sumber_dana,
        nomor_awal, nomor_akhir, tanggal_masuk,
        nama_penyerah, nama_penerima, nomor_dus, keterangan
      )
      VALUES(
        v_barang_id, v_saldo_qty, round(v_saldo_value / v_saldo_qty, 2),
        'Saldo Awal', NULL, NULL, v_saldo_date,
        'Saldo Awal ' || to_char(v_saldo_date, 'DD Mon YYYY'),
        'Pengurus Barang', NULL, v_keterangan
      );
      v_receipts := v_receipts + 1;
    END IF;

    IF v_add_qty > 0 THEN
      INSERT INTO public.barang_masuk(
        barang_id, jumlah, harga_satuan, sumber_dana,
        nomor_awal, nomor_akhir, tanggal_masuk,
        nama_penyerah, nama_penerima, nomor_dus, keterangan
      )
      VALUES(
        v_barang_id, v_add_qty, round(v_add_value / v_add_qty, 2),
        'Bertambah', NULL, NULL, v_add_date,
        'Rekapitulasi Persediaan ' || to_char(v_add_date, 'YYYY'),
        'Pengurus Barang', NULL, v_keterangan
      );
      v_receipts := v_receipts + 1;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'success',
    'barang', v_count,
    'penerimaan', v_receipts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_rekap_persediaan(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_rekap_persediaan(jsonb) TO authenticated;

COMMIT;
