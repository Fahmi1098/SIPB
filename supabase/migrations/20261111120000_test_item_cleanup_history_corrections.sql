-- SIPB: narrowly scoped removal of fake test items and audited Stock Opname correction.
-- Ordinary inventory remains archive-only; physical purge is restricted to obvious test names.

ALTER TABLE public.sipb_transaction_audit
  DROP CONSTRAINT IF EXISTS sipb_transaction_audit_entity_type_check;
ALTER TABLE public.sipb_transaction_audit
  ADD CONSTRAINT sipb_transaction_audit_entity_type_check
  CHECK (entity_type IN ('BARANG_MASUK','BARANG_KELUAR','MASTER_BARANG','STOCK_OPNAME'));

-- Never archive an item while a live outgoing transaction still references it.
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
  v_active_outgoing integer := 0;
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
      RAISE EXCEPTION 'Barang "%" belum dapat diarsipkan karena sisa stok masih %',
        v_name, COALESCE(v_sisa, 0);
    END IF;

    SELECT COUNT(*) INTO v_active_outgoing
    FROM public.detail_barang_keluar d
    JOIN public.transaksi_keluar t ON t.id = d.transaksi_keluar_id
    WHERE d.barang_id = p_barang_id
      AND COALESCE(t.status,'AKTIF') = 'AKTIF';

    IF v_active_outgoing > 0 THEN
      RAISE EXCEPTION 'Barang "%" masih tercatat pada % transaksi keluar aktif. Batalkan atau koreksi transaksi terlebih dahulu.',
        v_name, v_active_outgoing;
    END IF;

    IF public.sipb_fifo_is_kuasi(p_barang_id) THEN
      SELECT COALESCE(SUM(sisa_lembar), 0)
        INTO v_kuasi_remaining
      FROM public.stok_kuasi
      WHERE barang_id = p_barang_id;

      IF v_kuasi_remaining <> 0 THEN
        RAISE EXCEPTION 'Barang Kuasi "%" masih memiliki % lembar pada batch',
          v_name, v_kuasi_remaining;
      END IF;
    END IF;
  END IF;

  UPDATE public.barang SET is_archived = p_is_archived WHERE id = p_barang_id;

  RETURN jsonb_build_object(
    'id', p_barang_id,
    'is_archived', p_is_archived,
    'status', CASE WHEN p_is_archived THEN 'archived' ELSE 'active' END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_barang_archived(integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_barang_archived(integer,boolean) TO authenticated;

-- Only obvious test records can be physically purged. The exact item name must
-- be typed by an active admin. All operational references are removed atomically.
CREATE OR REPLACE FUNCTION public.purge_test_barang(
  p_barang_id integer,
  p_confirmation text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barang public.barang%ROWTYPE;
  v_category text;
  v_active_outgoing integer := 0;
  v_receipt_ids integer[];
  v_opname_ids integer[];
  v_detail_ids integer[];
  v_transaction_ids integer[];
  v_receipts_deleted integer := 0;
  v_opname_deleted integer := 0;
  v_details_deleted integer := 0;
  v_transactions_deleted integer := 0;
BEGIN
  IF NOT public.sipb_is_active_user() OR NOT public.sipb_is_admin() THEN
    RAISE EXCEPTION 'Hanya admin aktif yang dapat menghapus data barang uji';
  END IF;

  SELECT * INTO v_barang
  FROM public.barang
  WHERE id = p_barang_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Data Barang tidak ditemukan';
  END IF;

  IF p_confirmation IS DISTINCT FROM v_barang.nama_barang THEN
    RAISE EXCEPTION 'Konfirmasi tidak cocok. Ketik nama barang persis seperti yang ditampilkan.';
  END IF;

  IF lower(COALESCE(v_barang.nama_barang,'')) !~ '(^|[^[:alnum:]])(tes|test|dummy|percobaan)([^[:alnum:]]|$)' THEN
    RAISE EXCEPTION 'Penghapusan permanen hanya tersedia untuk nama barang uji seperti tes, test, dummy, atau percobaan.';
  END IF;

  SELECT k.nama_kategori INTO v_category
  FROM public.kategori k
  WHERE k.id = v_barang.kategori_id;

  IF lower(COALESCE(v_category,'')) LIKE '%kuasi%'
     OR EXISTS (SELECT 1 FROM public.stok_kuasi sk WHERE sk.barang_id = p_barang_id) THEN
    RAISE EXCEPTION 'Barang Kuasi tidak dapat dihapus melalui pembersihan data uji. Gunakan prosedur batch/serial khusus.';
  END IF;

  SELECT COUNT(*) INTO v_active_outgoing
  FROM public.detail_barang_keluar d
  JOIN public.transaksi_keluar t ON t.id = d.transaksi_keluar_id
  WHERE d.barang_id = p_barang_id
    AND COALESCE(t.status,'AKTIF') = 'AKTIF';

  IF v_active_outgoing > 0 THEN
    RAISE EXCEPTION 'Barang uji masih memiliki % pengeluaran aktif. Batalkan transaksi tersebut terlebih dahulu; transaksi campuran dengan barang lain tidak akan dihapus otomatis.',
      v_active_outgoing;
  END IF;

  SELECT array_agg(id) INTO v_receipt_ids
  FROM public.barang_masuk WHERE barang_id = p_barang_id;
  SELECT array_agg(id) INTO v_opname_ids
  FROM public.riwayat_opname WHERE barang_id = p_barang_id;
  SELECT array_agg(id) INTO v_detail_ids
  FROM public.detail_barang_keluar WHERE barang_id = p_barang_id;
  SELECT array_agg(DISTINCT transaksi_keluar_id) INTO v_transaction_ids
  FROM public.detail_barang_keluar WHERE barang_id = p_barang_id;

  -- Remove the dependent Kuasi allocation ledger defensively, then FIFO
  -- allocations before layers (the FIFO layer FK is ON DELETE RESTRICT).
  IF v_detail_ids IS NOT NULL THEN
    DELETE FROM public.transaksi_kuasi_alokasi
    WHERE detail_barang_keluar_id = ANY(v_detail_ids);
  END IF;

  DELETE FROM public.sipb_fifo_allocations a
  WHERE a.layer_id IN (
      SELECT l.id FROM public.sipb_fifo_layers l WHERE l.barang_id = p_barang_id
    )
     OR (v_detail_ids IS NOT NULL AND a.detail_barang_keluar_id = ANY(v_detail_ids))
     OR (v_opname_ids IS NOT NULL AND a.riwayat_opname_id = ANY(v_opname_ids));

  DELETE FROM public.sipb_fifo_layers WHERE barang_id = p_barang_id;

  -- Remove only this item's detail lines. A cancelled transaction containing
  -- other goods remains in the operational history.
  IF v_detail_ids IS NOT NULL THEN
    DELETE FROM public.detail_barang_keluar WHERE id = ANY(v_detail_ids);
    GET DIAGNOSTICS v_details_deleted = ROW_COUNT;
  END IF;

  IF v_transaction_ids IS NOT NULL THEN
    DELETE FROM public.transaksi_keluar t
    WHERE t.id = ANY(v_transaction_ids)
      AND COALESCE(t.status,'AKTIF') = 'DIBATALKAN'
      AND NOT EXISTS (
        SELECT 1 FROM public.detail_barang_keluar d
        WHERE d.transaksi_keluar_id = t.id
      );
    GET DIAGNOSTICS v_transactions_deleted = ROW_COUNT;
  END IF;

  IF v_opname_ids IS NOT NULL THEN
    DELETE FROM public.riwayat_opname WHERE id = ANY(v_opname_ids);
    GET DIAGNOSTICS v_opname_deleted = ROW_COUNT;
  END IF;

  IF v_receipt_ids IS NOT NULL THEN
    DELETE FROM public.barang_masuk WHERE id = ANY(v_receipt_ids);
    GET DIAGNOSTICS v_receipts_deleted = ROW_COUNT;
  END IF;

  DELETE FROM public.barang WHERE id = p_barang_id;

  RETURN jsonb_build_object(
    'id', p_barang_id,
    'nama_barang', v_barang.nama_barang,
    'status', 'purged',
    'barang_masuk_dihapus', v_receipts_deleted,
    'stock_opname_dihapus', v_opname_deleted,
    'detail_keluar_dihapus', v_details_deleted,
    'header_keluar_kosong_dihapus', v_transactions_deleted,
    'audit_dipertahankan', true,
    'message', 'Data barang uji beserta transaksi operasional terkait berhasil dibersihkan. Jejak audit koreksi/pembatalan tetap dipertahankan.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_test_barang(integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.purge_test_barang(integer,text) TO authenticated;

-- Correct a Stock Opname without rebuilding unrelated FIFO history. The date is
-- intentionally immutable: a correction is allowed only before any later or
-- same-day stock movement exists for the item.
CREATE OR REPLACE FUNCTION public.correct_stock_opname_audited(
  p_riwayat_opname_id integer,
  p_stok_fisik integer,
  p_keterangan text,
  p_petugas text,
  p_alasan text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old public.riwayat_opname%ROWTYPE;
  v_barang public.barang%ROWTYPE;
  v_category text;
  v_actor_name text;
  v_new_delta integer;
  v_price numeric(20,4);
  v_remaining integer;
  v_take integer;
  v_layer record;
  v_old_data jsonb;
  v_new_data jsonb;
  v_old_layer_id bigint;
BEGIN
  IF NOT public.sipb_is_active_user() OR NOT public.sipb_is_admin() THEN
    RAISE EXCEPTION 'Hanya admin aktif yang dapat mengoreksi Stock Opname';
  END IF;

  IF p_stok_fisik IS NULL OR p_stok_fisik < 0 THEN
    RAISE EXCEPTION 'Stok fisik tidak boleh negatif';
  END IF;
  IF length(COALESCE(p_keterangan,'')) > 500
     OR COALESCE(trim(p_petugas),'') = ''
     OR length(COALESCE(trim(p_alasan),'')) < 8
     OR length(COALESCE(trim(p_alasan),'')) > 500 THEN
    RAISE EXCEPTION 'Petugas wajib diisi, keterangan maksimal 500 karakter, dan alasan koreksi minimal 8 karakter';
  END IF;

  SELECT * INTO v_old
  FROM public.riwayat_opname
  WHERE id = p_riwayat_opname_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Riwayat Stock Opname #% tidak ditemukan', p_riwayat_opname_id;
  END IF;

  SELECT * INTO v_barang
  FROM public.barang
  WHERE id = v_old.barang_id
  FOR UPDATE;

  IF NOT FOUND OR COALESCE(v_barang.is_archived,false) THEN
    RAISE EXCEPTION 'Master Barang tidak ditemukan atau sudah diarsipkan';
  END IF;
  IF p_stok_fisik > COALESCE(v_barang.jumlah_total,0) THEN
    RAISE EXCEPTION 'Stok fisik melebihi jumlah total barang (%)', COALESCE(v_barang.jumlah_total,0);
  END IF;

  SELECT k.nama_kategori INTO v_category
  FROM public.kategori k WHERE k.id = v_barang.kategori_id;
  IF public.sipb_fifo_is_kuasi(v_barang.id)
     OR EXISTS (SELECT 1 FROM public.stok_kuasi WHERE barang_id = v_barang.id) THEN
    RAISE EXCEPTION 'Stock Opname Kuasi tidak dapat dikoreksi melalui formulir umum';
  END IF;

  IF COALESCE(v_barang.sisa,0) <> COALESCE(v_old.stok_fisik,0) THEN
    RAISE EXCEPTION 'Koreksi ditolak karena saldo barang sudah berubah setelah Stock Opname ini. Periksa transaksi berikutnya terlebih dahulu.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.barang_masuk
    WHERE barang_id = v_old.barang_id AND tanggal_masuk >= v_old.tanggal_opname
    UNION ALL
    SELECT 1 FROM public.detail_barang_keluar d
    JOIN public.transaksi_keluar t ON t.id=d.transaksi_keluar_id
    WHERE d.barang_id = v_old.barang_id AND COALESCE(t.status,'AKTIF')='AKTIF'
      AND t.tanggal_keluar >= v_old.tanggal_opname
    UNION ALL
    SELECT 1 FROM public.riwayat_opname
    WHERE barang_id = v_old.barang_id AND id <> v_old.id
      AND tanggal_opname >= v_old.tanggal_opname
  ) THEN
    RAISE EXCEPTION 'Koreksi Stock Opname dibatasi karena ada mutasi pada tanggal yang sama atau sesudahnya. Koreksi transaksi lanjutan terlebih dahulu.';
  END IF;

  v_old_data := jsonb_build_object('stock_opname',to_jsonb(v_old),'master_barang',to_jsonb(v_barang));

  IF v_old.selisih < 0 THEN
    FOR v_layer IN
      SELECT id,layer_id,jumlah
      FROM public.sipb_fifo_allocations
      WHERE riwayat_opname_id = v_old.id AND source_type='OPNAME'
      ORDER BY id FOR UPDATE
    LOOP
      UPDATE public.sipb_fifo_layers
      SET sisa = sisa + v_layer.jumlah
      WHERE id = v_layer.layer_id;
    END LOOP;
    DELETE FROM public.sipb_fifo_allocations
    WHERE riwayat_opname_id = v_old.id AND source_type='OPNAME';
  ELSIF v_old.selisih > 0 THEN
    SELECT id INTO v_old_layer_id
    FROM public.sipb_fifo_layers
    WHERE source_type='OPNAME' AND source_ref_id=v_old.id
    FOR UPDATE;
    IF v_old_layer_id IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.sipb_fifo_allocations WHERE layer_id=v_old_layer_id) THEN
        RAISE EXCEPTION 'Lapisan penambahan Stock Opname ini sudah dipakai transaksi FIFO; koreksi tidak dapat dilanjutkan.';
      END IF;
      DELETE FROM public.sipb_fifo_layers WHERE id=v_old_layer_id;
    END IF;
  END IF;

  UPDATE public.barang
  SET sisa = COALESCE(v_old.stok_sistem,0),
      terpakai = GREATEST(0,COALESCE(jumlah_total,0)-COALESCE(v_old.stok_sistem,0))
  WHERE id = v_old.barang_id;

  v_new_delta := p_stok_fisik - COALESCE(v_old.stok_sistem,0);

  UPDATE public.riwayat_opname
  SET stok_fisik=p_stok_fisik,
      selisih=v_new_delta,
      keterangan=NULLIF(trim(p_keterangan),''),
      petugas=trim(p_petugas)
  WHERE id=v_old.id
  RETURNING * INTO v_old;

  IF v_new_delta > 0 THEN
    SELECT COALESCE((
      SELECT bm.harga_satuan FROM public.barang_masuk bm
      WHERE bm.barang_id=v_old.barang_id AND bm.tanggal_masuk<=v_old.tanggal_opname
      ORDER BY bm.tanggal_masuk DESC,bm.id DESC LIMIT 1
    ),v_barang.harga_terakhir,0)::numeric(20,4)
    INTO v_price;

    INSERT INTO public.sipb_fifo_layers(
      barang_id,source_type,source_ref_id,tanggal_masuk,jumlah_masuk,sisa,
      harga_satuan,harga_estimasi,catatan
    ) VALUES(
      v_old.barang_id,'OPNAME',v_old.id,v_old.tanggal_opname,
      v_new_delta,v_new_delta,COALESCE(v_price,0),true,
      'Penambahan hasil koreksi Stock Opname; harga referensi bersifat estimasi'
    );
  ELSIF v_new_delta < 0 THEN
    v_remaining := abs(v_new_delta);
    FOR v_layer IN
      SELECT id,sisa,harga_satuan
      FROM public.sipb_fifo_layers
      WHERE barang_id=v_old.barang_id
        AND tanggal_masuk<=v_old.tanggal_opname AND sisa>0
      ORDER BY tanggal_masuk,id FOR UPDATE
    LOOP
      EXIT WHEN v_remaining<=0;
      v_take := LEAST(v_remaining,v_layer.sisa);
      INSERT INTO public.sipb_fifo_allocations(
        layer_id,source_type,riwayat_opname_id,jumlah,harga_satuan
      ) VALUES(v_layer.id,'OPNAME',v_old.id,v_take,v_layer.harga_satuan);
      UPDATE public.sipb_fifo_layers SET sisa=sisa-v_take WHERE id=v_layer.id;
      v_remaining := v_remaining-v_take;
    END LOOP;
    IF v_remaining>0 THEN
      RAISE EXCEPTION 'Lapisan FIFO tidak cukup untuk koreksi pengurangan Stock Opname (kurang %)',v_remaining;
    END IF;
  END IF;

  UPDATE public.barang
  SET sisa=p_stok_fisik,
      terpakai=GREATEST(0,COALESCE(jumlah_total,0)-p_stok_fisik)
  WHERE id=v_old.barang_id;

  SELECT nama_lengkap INTO v_actor_name
  FROM public.user_profiles WHERE id=auth.uid();

  SELECT jsonb_build_object('stock_opname',to_jsonb(o),'master_barang',to_jsonb(b))
  INTO v_new_data
  FROM public.riwayat_opname o
  JOIN public.barang b ON b.id=o.barang_id
  WHERE o.id=v_old.id;

  INSERT INTO public.sipb_transaction_audit(
    entity_type,entity_id,action,reason,actor_id,actor_name,old_data,new_data
  ) VALUES(
    'STOCK_OPNAME',v_old.id,'KOREKSI',trim(p_alasan),auth.uid(),v_actor_name,v_old_data,v_new_data
  );

  RETURN jsonb_build_object('status','corrected','id',v_old.id,'selisih_baru',v_new_delta);
END;
$$;

REVOKE ALL ON FUNCTION public.correct_stock_opname_audited(integer,integer,text,text,text)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.correct_stock_opname_audited(integer,integer,text,text,text)
  TO authenticated;
