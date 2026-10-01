-- Category-aware cancellation guard.
-- Supersedes cancel_barang_keluar from migration 004.
-- Kuasi detection must use kategori.nama_kategori, not legacy barang.kategori.

CREATE OR REPLACE FUNCTION public.cancel_barang_keluar(p_transaksi_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx record;
  v_role text;
  v_detail record;
  v_batch_id integer;
  v_consumed integer;
  v_batch_total integer;
  v_has_untracked_kuasi boolean;
BEGIN
  IF NOT public.sipb_is_active_user() THEN
    RAISE EXCEPTION 'Akun SIPB tidak aktif';
  END IF;

  SELECT role
    INTO v_role
  FROM public.user_profiles
  WHERE id = auth.uid() AND is_active = true;

  IF COALESCE(lower(v_role), '') <> 'admin' THEN
    RAISE EXCEPTION 'Hanya admin yang dapat membatalkan transaksi barang keluar';
  END IF;

  SELECT *
    INTO v_tx
  FROM public.transaksi_keluar
  WHERE id = p_transaksi_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi barang keluar #% tidak ditemukan', p_transaksi_id;
  END IF;

  IF COALESCE(v_tx.status, 'AKTIF') <> 'AKTIF' THEN
    RAISE EXCEPTION 'Transaksi #% sudah dibatalkan', p_transaksi_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.detail_barang_keluar d
    JOIN public.barang b ON b.id = d.barang_id
    LEFT JOIN public.kategori k ON k.id = b.kategori_id
    WHERE d.transaksi_keluar_id = p_transaksi_id
      AND lower(COALESCE(k.nama_kategori, '')) LIKE '%kuasi%'
      AND NOT EXISTS (
        SELECT 1
        FROM public.transaksi_kuasi_alokasi a
        WHERE a.detail_barang_keluar_id = d.id
      )
  )
  INTO v_has_untracked_kuasi;

  IF v_has_untracked_kuasi THEN
    RAISE EXCEPTION
      'Transaksi #% memakai barang Kuasi dari transaksi lama yang belum memiliki audit batch. Transaksi ini tidak dapat dibatalkan otomatis.',
      p_transaksi_id;
  END IF;

  -- Lock affected barang first, matching the lock order used by record_barang_keluar.
  -- This keeps concurrent outgoing/cancellation operations from taking locks in opposite order.
  FOR v_detail IN
    SELECT DISTINCT barang_id
    FROM public.detail_barang_keluar
    WHERE transaksi_keluar_id = p_transaksi_id
    ORDER BY barang_id
  LOOP
    PERFORM 1
    FROM public.barang
    WHERE id = v_detail.barang_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Barang ID % tidak ditemukan saat pembatalan', v_detail.barang_id;
    END IF;
  END LOOP;

  -- Lock all affected Kuasi batch rows before changing the transaction status.
  FOR v_batch_id IN
    SELECT DISTINCT a.stok_kuasi_id
    FROM public.transaksi_kuasi_alokasi a
    WHERE a.transaksi_keluar_id = p_transaksi_id
    ORDER BY a.stok_kuasi_id
  LOOP
    PERFORM 1
    FROM public.stok_kuasi
    WHERE id = v_batch_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Batch Kuasi #% tidak ditemukan', v_batch_id;
    END IF;
  END LOOP;

  UPDATE public.transaksi_keluar
  SET status = 'DIBATALKAN',
      dibatalkan_pada = now(),
      dibatalkan_oleh = auth.uid()
  WHERE id = p_transaksi_id;

  -- Restore ordinary inventory quantities.
  FOR v_detail IN
    SELECT barang_id, SUM(jumlah)::integer AS jumlah
    FROM public.detail_barang_keluar
    WHERE transaksi_keluar_id = p_transaksi_id
    GROUP BY barang_id
  LOOP
    UPDATE public.barang
    SET sisa = COALESCE(sisa, 0) + v_detail.jumlah,
        terpakai = GREATEST(0, COALESCE(terpakai, 0) - v_detail.jumlah)
    WHERE id = v_detail.barang_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Barang ID % tidak ditemukan saat pembatalan', v_detail.barang_id;
    END IF;
  END LOOP;

  -- Rebuild each affected Kuasi batch from the allocation ledger.
  -- This is safer than simply subtracting the canceled quantity because
  -- later transactions may already have consumed the same batch.
  FOR v_batch_id IN
    SELECT DISTINCT a.stok_kuasi_id
    FROM public.transaksi_kuasi_alokasi a
    WHERE a.transaksi_keluar_id = p_transaksi_id
    ORDER BY a.stok_kuasi_id
  LOOP
    SELECT (digit_akhir - digit_awal + 1)
      INTO v_batch_total
    FROM public.stok_kuasi
    WHERE id = v_batch_id
    FOR UPDATE;

    SELECT COALESCE(SUM(a.jumlah), 0)::integer
      INTO v_consumed
    FROM public.transaksi_kuasi_alokasi a
    JOIN public.transaksi_keluar t ON t.id = a.transaksi_keluar_id
    WHERE a.stok_kuasi_id = v_batch_id
      AND COALESCE(t.status, 'AKTIF') = 'AKTIF';

    UPDATE public.stok_kuasi
    SET digit_sekarang = digit_awal + v_consumed,
        sisa_lembar = v_batch_total - v_consumed
    WHERE id = v_batch_id;
  END LOOP;

  RETURN jsonb_build_object(
    'id', p_transaksi_id,
    'status', 'cancelled'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_barang_keluar(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_barang_keluar(integer) TO authenticated;

REVOKE ALL ON FUNCTION public.sipb_is_active_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sipb_is_active_user() TO authenticated;
