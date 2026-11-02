-- SIPB follow-up hardening: active-user RLS, stock-column grants,
-- safe Master Barang archive, lossless restore, and strict import validation.
-- Apply once in Supabase SQL Editor after migrations through 20261009090000.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. One authoritative active-account and admin predicate for API policies.
-- SECURITY DEFINER avoids recursive RLS evaluation on user_profiles.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sipb_is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.sipb_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND lower(role) = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.sipb_is_active_user() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sipb_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sipb_is_active_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sipb_is_admin() TO authenticated;

-- Rebuild the policies so the later broad "USING (true)" policies cannot
-- accidentally keep inactive accounts able to read operational data.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barang_masuk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi_keluar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detail_barang_keluar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riwayat_opname ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stok_kuasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi_kuasi_alokasi ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'user_profiles', 'kategori', 'barang', 'pegawai', 'barang_masuk',
        'transaksi_keluar', 'detail_barang_keluar', 'riwayat_opname',
        'stok_kuasi', 'transaksi_kuasi_alokasi'
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      p.policyname, p.schemaname, p.tablename
    );
  END LOOP;
END;
$$;

CREATE POLICY sipb_active_profile_read
ON public.user_profiles
FOR SELECT TO authenticated
USING (
  public.sipb_is_active_user()
  AND (id = auth.uid() OR public.sipb_is_admin())
);

CREATE POLICY sipb_active_kategori_read
ON public.kategori
FOR SELECT TO authenticated
USING (public.sipb_is_active_user());
CREATE POLICY sipb_admin_kategori_write
ON public.kategori
FOR ALL TO authenticated
USING (public.sipb_is_admin())
WITH CHECK (public.sipb_is_admin());

CREATE POLICY sipb_active_barang_read
ON public.barang
FOR SELECT TO authenticated
USING (public.sipb_is_active_user());
CREATE POLICY sipb_admin_barang_insert
ON public.barang
FOR INSERT TO authenticated
WITH CHECK (public.sipb_is_admin());
CREATE POLICY sipb_admin_barang_update
ON public.barang
FOR UPDATE TO authenticated
USING (public.sipb_is_admin())
WITH CHECK (public.sipb_is_admin());

CREATE POLICY sipb_active_pegawai_read
ON public.pegawai
FOR SELECT TO authenticated
USING (public.sipb_is_active_user());
CREATE POLICY sipb_admin_pegawai_write
ON public.pegawai
FOR ALL TO authenticated
USING (public.sipb_is_admin())
WITH CHECK (public.sipb_is_admin());

CREATE POLICY sipb_active_barang_masuk_read
ON public.barang_masuk
FOR SELECT TO authenticated
USING (public.sipb_is_active_user());
CREATE POLICY sipb_active_transaksi_keluar_read
ON public.transaksi_keluar
FOR SELECT TO authenticated
USING (public.sipb_is_active_user());
CREATE POLICY sipb_active_detail_keluar_read
ON public.detail_barang_keluar
FOR SELECT TO authenticated
USING (public.sipb_is_active_user());
CREATE POLICY sipb_active_opname_read
ON public.riwayat_opname
FOR SELECT TO authenticated
USING (public.sipb_is_active_user());
CREATE POLICY sipb_active_kuasi_read
ON public.stok_kuasi
FOR SELECT TO authenticated
USING (public.sipb_is_active_user());
CREATE POLICY sipb_active_kuasi_allocation_read
ON public.transaksi_kuasi_alokasi
FOR SELECT TO authenticated
USING (public.sipb_is_active_user());

-- Revoke broad grants reintroduced by the October RLS migration.
REVOKE ALL ON TABLE
  public.user_profiles, public.kategori, public.barang, public.pegawai,
  public.barang_masuk, public.transaksi_keluar, public.detail_barang_keluar,
  public.riwayat_opname, public.stok_kuasi, public.transaksi_kuasi_alokasi
FROM anon, PUBLIC;

GRANT SELECT ON TABLE
  public.user_profiles, public.kategori, public.barang, public.pegawai,
  public.barang_masuk, public.transaksi_keluar, public.detail_barang_keluar,
  public.riwayat_opname, public.stok_kuasi, public.transaksi_kuasi_alokasi
TO authenticated;

-- Operational ledgers are read-only through PostgREST. Writes go through the
-- SECURITY DEFINER transaction RPCs.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE
  public.barang_masuk, public.transaksi_keluar, public.detail_barang_keluar,
  public.riwayat_opname, public.stok_kuasi, public.transaksi_kuasi_alokasi
FROM authenticated;

-- Master Barang may be maintained by admin, but stock-derived columns remain
-- inaccessible to direct INSERT/UPDATE. Harga Terakhir is a reference field.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.barang FROM authenticated;
REVOKE INSERT (is_archived), UPDATE (is_archived) ON public.barang FROM authenticated;
REVOKE INSERT (
  jumlah_total, terpakai, sisa
) ON public.barang FROM authenticated;
REVOKE UPDATE (
  jumlah_total, terpakai, sisa
) ON public.barang FROM authenticated;
GRANT INSERT (
  kode_barang, kategori_id, nama_barang, keterangan, tipe, merk, satuan,
  harga_terakhir, stok_minimum
) ON public.barang TO authenticated;
GRANT UPDATE (
  kode_barang, kategori_id, nama_barang, keterangan, tipe, merk, satuan,
  harga_terakhir, stok_minimum
) ON public.barang TO authenticated;

-- Keep user role/status changes behind manage_user_profile().
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.user_profiles FROM authenticated;
GRANT SELECT ON TABLE public.user_profiles TO authenticated;

-- Category and employee master records remain admin-managed.
GRANT INSERT, UPDATE, DELETE ON TABLE public.kategori, public.pegawai TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Archive instead of physically deleting a Master Barang record.
-- Active stock and active Kuasi batches must be zero before archiving.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_barang_archived(
  p_barang_id integer,
  p_is_archived boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sisa integer;
  v_name text;
  v_category text;
  v_kuasi_remaining bigint := 0;
BEGIN
  IF NOT public.sipb_is_active_user() OR NOT public.sipb_is_admin() THEN
    RAISE EXCEPTION 'Hanya admin aktif yang dapat mengarsipkan Master Barang';
  END IF;

  SELECT b.sisa, b.nama_barang, k.nama_kategori
    INTO v_sisa, v_name, v_category
  FROM public.barang b
  LEFT JOIN public.kategori k ON k.id = b.kategori_id
  WHERE b.id = p_barang_id
  FOR UPDATE OF b;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barang ID % tidak ditemukan', p_barang_id;
  END IF;

  IF p_is_archived THEN
    IF COALESCE(v_sisa, 0) <> 0 THEN
      RAISE EXCEPTION
        'Barang "%" belum dapat diarsipkan karena sisa stok masih %',
        v_name, COALESCE(v_sisa, 0);
    END IF;

    IF lower(COALESCE(v_category, '')) LIKE '%kuasi%' THEN
      SELECT COALESCE(SUM(sisa_lembar), 0)
        INTO v_kuasi_remaining
      FROM public.stok_kuasi
      WHERE barang_id = p_barang_id;

      IF v_kuasi_remaining <> 0 THEN
        RAISE EXCEPTION
          'Barang Kuasi "%" belum dapat diarsipkan karena masih ada % lembar pada batch',
          v_name, v_kuasi_remaining;
      END IF;
    END IF;
  END IF;

  UPDATE public.barang
  SET is_archived = p_is_archived
  WHERE id = p_barang_id;

  RETURN jsonb_build_object(
    'id', p_barang_id,
    'is_archived', p_is_archived,
    'status', CASE WHEN p_is_archived THEN 'archived' ELSE 'active' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_barang_archived(integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_barang_archived(integer, boolean) TO authenticated;

-- Prevent future stock movements from changing an archived item even if an
-- authenticated caller invokes a transaction RPC manually.
CREATE OR REPLACE FUNCTION public.guard_archived_barang_stock_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(OLD.is_archived, false)
     AND COALESCE(NEW.is_archived, false)
     AND (
       NEW.jumlah_total IS DISTINCT FROM OLD.jumlah_total
       OR NEW.terpakai IS DISTINCT FROM OLD.terpakai
       OR NEW.sisa IS DISTINCT FROM OLD.sisa
     )
  THEN
    RAISE EXCEPTION 'Barang "%" sudah diarsipkan dan tidak dapat menerima mutasi stok', OLD.nama_barang;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_archived_barang_stock_change ON public.barang;
CREATE TRIGGER trg_guard_archived_barang_stock_change
BEFORE UPDATE OF jumlah_total, terpakai, sisa ON public.barang
FOR EACH ROW
EXECUTE FUNCTION public.guard_archived_barang_stock_change();

-- ---------------------------------------------------------------------------
-- 3. Restore all current Master Barang and Pegawai columns, including fields
-- introduced by later migrations. Restore remains a single atomic RPC.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_sipb_backup(p_backup jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_required text[] := ARRAY[
    'kategori', 'pegawai', 'barang', 'barang_masuk', 'stok_kuasi',
    'transaksi_keluar', 'detail_barang_keluar',
    'transaksi_kuasi_alokasi', 'riwayat_opname'
  ];
  v_name text;
  v_count bigint;
BEGIN
  IF NOT public.sipb_is_active_user() OR NOT public.sipb_is_admin() THEN
    RAISE EXCEPTION 'Hanya admin aktif yang dapat melakukan restore SIPB';
  END IF;

  IF COALESCE(p_backup->>'format', '') <> 'SIPB_BACKUP'
     OR COALESCE(p_backup->>'format_version', '') <> '1' THEN
    RAISE EXCEPTION 'Format backup SIPB tidak dikenali';
  END IF;

  IF jsonb_typeof(p_backup->'tables') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Bagian tables pada backup tidak valid';
  END IF;

  FOREACH v_name IN ARRAY v_required LOOP
    IF jsonb_typeof(p_backup->'tables'->v_name) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Data tabel % tidak tersedia atau bukan array', v_name;
    END IF;
  END LOOP;

  -- Delete in FK-safe order. Any later validation/insert failure rolls back all.
  DELETE FROM public.transaksi_kuasi_alokasi;
  DELETE FROM public.detail_barang_keluar;
  DELETE FROM public.transaksi_keluar;
  DELETE FROM public.barang_masuk;
  DELETE FROM public.riwayat_opname;
  DELETE FROM public.stok_kuasi;
  DELETE FROM public.barang;
  DELETE FROM public.kategori;
  DELETE FROM public.pegawai;

  INSERT INTO public.kategori(id, nama_kategori)
  SELECT x.id, x.nama_kategori
  FROM jsonb_to_recordset(p_backup->'tables'->'kategori')
    AS x(id integer, nama_kategori text);

  INSERT INTO public.pegawai(
    id, nama_pegawai, nip, status_pegawai, jabatan, unit_kerja
  )
  SELECT
    x.id, x.nama_pegawai, x.nip, x.status_pegawai, x.jabatan, x.unit_kerja
  FROM jsonb_to_recordset(p_backup->'tables'->'pegawai')
    AS x(
      id integer, nama_pegawai text, nip text, status_pegawai text,
      jabatan text, unit_kerja text
    );

  INSERT INTO public.barang(
    id, kode_barang, kategori_id, nama_barang, keterangan, tipe, merk, satuan,
    harga_terakhir, jumlah_total, terpakai, sisa, stok_minimum, kategori,
    is_archived
  )
  SELECT
    x.id, x.kode_barang, x.kategori_id, x.nama_barang, x.keterangan,
    x.tipe, x.merk, x.satuan,
    COALESCE(x.harga_terakhir, 0), COALESCE(x.jumlah_total, 0),
    COALESCE(x.terpakai, 0), COALESCE(x.sisa, 0),
    COALESCE(x.stok_minimum, 0), COALESCE(x.kategori, 'non-kuasi'),
    COALESCE(x.is_archived, false)
  FROM jsonb_to_recordset(p_backup->'tables'->'barang')
    AS x(
      id integer, kode_barang text, kategori_id integer, nama_barang text,
      keterangan text, tipe text, merk text, satuan text, harga_terakhir numeric,
      jumlah_total integer, terpakai integer, sisa integer, stok_minimum integer,
      kategori text, is_archived boolean
    );

  INSERT INTO public.barang_masuk(
    id, barang_id, jumlah, harga_satuan, sumber_dana, nomor_awal, nomor_akhir,
    tanggal_masuk, nama_penyerah, nama_penerima, nomor_dus, keterangan
  )
  SELECT
    x.id, x.barang_id, x.jumlah, COALESCE(x.harga_satuan, 0), x.sumber_dana,
    x.nomor_awal, x.nomor_akhir, x.tanggal_masuk, x.nama_penyerah,
    x.nama_penerima, x.nomor_dus, x.keterangan
  FROM jsonb_to_recordset(p_backup->'tables'->'barang_masuk')
    AS x(
      id integer, barang_id integer, jumlah integer, harga_satuan numeric,
      sumber_dana text, nomor_awal text, nomor_akhir text, tanggal_masuk date,
      nama_penyerah text, nama_penerima text, nomor_dus text, keterangan text
    );

  INSERT INTO public.stok_kuasi(
    id, barang_id, prefix_huruf, panjang_digit, digit_awal, digit_akhir,
    digit_sekarang, sisa_lembar, tanggal_masuk, nomor_dus
  )
  SELECT
    x.id, x.barang_id, COALESCE(x.prefix_huruf, ''), x.panjang_digit,
    x.digit_awal, x.digit_akhir, x.digit_sekarang, x.sisa_lembar,
    x.tanggal_masuk, x.nomor_dus
  FROM jsonb_to_recordset(p_backup->'tables'->'stok_kuasi')
    AS x(
      id integer, barang_id integer, prefix_huruf text, panjang_digit integer,
      digit_awal integer, digit_akhir integer, digit_sekarang integer,
      sisa_lembar integer, tanggal_masuk date, nomor_dus text
    );

  INSERT INTO public.riwayat_opname(
    id, tanggal_opname, barang_id, stok_sistem, stok_fisik,
    selisih, keterangan, petugas
  )
  SELECT
    x.id, x.tanggal_opname, x.barang_id, x.stok_sistem, x.stok_fisik,
    x.selisih, x.keterangan, x.petugas
  FROM jsonb_to_recordset(p_backup->'tables'->'riwayat_opname')
    AS x(
      id integer, tanggal_opname date, barang_id integer, stok_sistem integer,
      stok_fisik integer, selisih integer, keterangan text, petugas text
    );

  INSERT INTO public.transaksi_keluar(
    id, tanggal_keluar, penyerah_nama, penyerah_jabatan, penyerah_nip,
    penerima_nama, penerima_jabatan, penerima_nip, tujuan_ruangan,
    jenis_dokumen, status, dibatalkan_pada, dibatalkan_oleh
  )
  SELECT
    x.id, x.tanggal_keluar, x.penyerah_nama, x.penyerah_jabatan, x.penyerah_nip,
    x.penerima_nama, x.penerima_jabatan, x.penerima_nip, x.tujuan_ruangan,
    COALESCE(x.jenis_dokumen, 'Nota Dinas'), COALESCE(x.status, 'AKTIF'),
    x.dibatalkan_pada, x.dibatalkan_oleh
  FROM jsonb_to_recordset(p_backup->'tables'->'transaksi_keluar')
    AS x(
      id integer, tanggal_keluar date, penyerah_nama text, penyerah_jabatan text,
      penyerah_nip text, penerima_nama text, penerima_jabatan text,
      penerima_nip text, tujuan_ruangan text, jenis_dokumen text, status text,
      dibatalkan_pada timestamptz, dibatalkan_oleh uuid
    );

  INSERT INTO public.detail_barang_keluar(
    id, transaksi_keluar_id, barang_id, jumlah, nomor_awal, nomor_akhir, nomor_dus
  )
  SELECT
    x.id, x.transaksi_keluar_id, x.barang_id, x.jumlah,
    x.nomor_awal, x.nomor_akhir, x.nomor_dus
  FROM jsonb_to_recordset(p_backup->'tables'->'detail_barang_keluar')
    AS x(
      id integer, transaksi_keluar_id integer, barang_id integer, jumlah integer,
      nomor_awal text, nomor_akhir text, nomor_dus text
    );

  INSERT INTO public.transaksi_kuasi_alokasi(
    id, transaksi_keluar_id, detail_barang_keluar_id, stok_kuasi_id,
    jumlah, digit_awal, digit_akhir, created_at
  )
  SELECT
    x.id, x.transaksi_keluar_id, x.detail_barang_keluar_id, x.stok_kuasi_id,
    x.jumlah, x.digit_awal, x.digit_akhir, COALESCE(x.created_at, now())
  FROM jsonb_to_recordset(p_backup->'tables'->'transaksi_kuasi_alokasi')
    AS x(
      id bigint, transaksi_keluar_id integer, detail_barang_keluar_id integer,
      stok_kuasi_id integer, jumlah integer, digit_awal integer,
      digit_akhir integer, created_at timestamptz
    );

  PERFORM setval(pg_get_serial_sequence('public.kategori','id'),
    COALESCE((SELECT max(id) FROM public.kategori), 1),
    (SELECT count(*) > 0 FROM public.kategori));
  PERFORM setval(pg_get_serial_sequence('public.pegawai','id'),
    COALESCE((SELECT max(id) FROM public.pegawai), 1),
    (SELECT count(*) > 0 FROM public.pegawai));
  PERFORM setval(pg_get_serial_sequence('public.barang','id'),
    COALESCE((SELECT max(id) FROM public.barang), 1),
    (SELECT count(*) > 0 FROM public.barang));
  PERFORM setval(pg_get_serial_sequence('public.barang_masuk','id'),
    COALESCE((SELECT max(id) FROM public.barang_masuk), 1),
    (SELECT count(*) > 0 FROM public.barang_masuk));
  PERFORM setval(pg_get_serial_sequence('public.stok_kuasi','id'),
    COALESCE((SELECT max(id) FROM public.stok_kuasi), 1),
    (SELECT count(*) > 0 FROM public.stok_kuasi));
  PERFORM setval(pg_get_serial_sequence('public.transaksi_keluar','id'),
    COALESCE((SELECT max(id) FROM public.transaksi_keluar), 1),
    (SELECT count(*) > 0 FROM public.transaksi_keluar));
  PERFORM setval(pg_get_serial_sequence('public.detail_barang_keluar','id'),
    COALESCE((SELECT max(id) FROM public.detail_barang_keluar), 1),
    (SELECT count(*) > 0 FROM public.detail_barang_keluar));
  PERFORM setval(pg_get_serial_sequence('public.riwayat_opname','id'),
    COALESCE((SELECT max(id) FROM public.riwayat_opname), 1),
    (SELECT count(*) > 0 FROM public.riwayat_opname));
  PERFORM setval(pg_get_serial_sequence('public.transaksi_kuasi_alokasi','id'),
    COALESCE((SELECT max(id) FROM public.transaksi_kuasi_alokasi), 1),
    (SELECT count(*) > 0 FROM public.transaksi_kuasi_alokasi));

  SELECT count(*) INTO v_count FROM public.barang;
  RETURN jsonb_build_object(
    'status', 'success',
    'barang_dipulihkan', v_count,
    'message', 'Restore SIPB berhasil, termasuk kode, keterangan, arsip, dan unit kerja.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.restore_sipb_backup(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_sipb_backup(jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Strict import validation: quantities must be non-negative integers and
-- nominal values must be non-negative. Invalid data is rejected, not clamped.
-- ---------------------------------------------------------------------------
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
  v_keterangan text;
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

  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_rows) = 0 THEN
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

  FOR r IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    IF jsonb_typeof(r) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'Setiap baris import harus berupa objek data';
    END IF;

    v_code := trim(COALESCE(r->>'kode_barang', ''));
    v_name := trim(COALESCE(r->>'nama_barang', ''));
    v_cat_name := trim(COALESCE(r->>'kategori', ''));
    v_satuan := NULLIF(trim(COALESCE(r->>'satuan', '')), '');
    v_keterangan := NULLIF(trim(COALESCE(
      r->>'keterangan', r->>'Keterangan', r->>'keterangan_spesifikasi', ''
    )), '');

    IF length(v_code) > 80 OR length(v_name) > 255
       OR length(COALESCE(v_keterangan, '')) > 500
       OR length(COALESCE(v_satuan, '')) > 80 THEN
      RAISE EXCEPTION 'Kode, nama, satuan, atau keterangan terlalu panjang untuk %', v_name;
    END IF;

    IF v_code = '' OR v_name = '' THEN
      RAISE EXCEPTION 'Kode Barang dan Nama Barang wajib diisi';
    END IF;
    IF v_cat_name = '' THEN
      RAISE EXCEPTION 'Kategori wajib diisi untuk %', v_name;
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
      v_code, v_cat_id, v_name, v_keterangan, NULL, NULL, v_satuan,
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
