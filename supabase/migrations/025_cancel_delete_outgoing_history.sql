-- Migration 025: atomic cancellation with permanent cleanup.
-- A cancelled Barang Keluar transaction is removed immediately after stock
-- restoration. The operation is atomic so a failure rolls the whole action back.

CREATE OR REPLACE FUNCTION public.delete_cancelled_barang_keluar(p_transaksi_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_status text;
BEGIN
  SELECT role
    INTO v_role
  FROM public.user_profiles
  WHERE id = auth.uid() AND is_active = true;

  IF COALESCE(lower(v_role), '') <> 'admin' THEN
    RAISE EXCEPTION 'Hanya admin yang dapat menghapus riwayat barang keluar';
  END IF;

  SELECT COALESCE(status, 'AKTIF')
    INTO v_status
  FROM public.transaksi_keluar
  WHERE id = p_transaksi_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi barang keluar #% tidak ditemukan', p_transaksi_id;
  END IF;

  IF v_status <> 'DIBATALKAN' THEN
    RAISE EXCEPTION
      'Transaksi #% masih aktif. Batalkan transaksi terlebih dahulu sebelum menghapus riwayat permanen.',
      p_transaksi_id;
  END IF;

  -- The Kuasi allocation ledger references transaksi_keluar with RESTRICT.
  -- Remove the allocation rows first, then the transaction header. Detail rows
  -- are removed automatically by the existing ON DELETE CASCADE relation.
  DELETE FROM public.transaksi_kuasi_alokasi
  WHERE transaksi_keluar_id = p_transaksi_id;

  DELETE FROM public.transaksi_keluar
  WHERE id = p_transaksi_id;

  RETURN jsonb_build_object(
    'id', p_transaksi_id,
    'status', 'deleted',
    'message', 'Riwayat barang keluar berhasil dihapus permanen.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_cancelled_barang_keluar(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_cancelled_barang_keluar(integer) TO authenticated;


CREATE OR REPLACE FUNCTION public.cancel_and_delete_barang_keluar(p_transaksi_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_result jsonb;
BEGIN
  SELECT role
    INTO v_role
  FROM public.user_profiles
  WHERE id = auth.uid() AND is_active = true;

  IF COALESCE(lower(v_role), '') <> 'admin' THEN
    RAISE EXCEPTION 'Hanya admin yang dapat membatalkan transaksi barang keluar';
  END IF;

  -- cancel_barang_keluar performs all stock/Kuasi safety checks and restores
  -- stock. Any error here aborts the entire transaction.
  v_result := public.cancel_barang_keluar(p_transaksi_id);

  -- Remove the Kuasi audit rows first because their FK uses ON DELETE RESTRICT.
  DELETE FROM public.transaksi_kuasi_alokasi
  WHERE transaksi_keluar_id = p_transaksi_id;

  -- detail_barang_keluar is ON DELETE CASCADE from the transaction header.
  DELETE FROM public.transaksi_keluar
  WHERE id = p_transaksi_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi barang keluar #% gagal dihapus', p_transaksi_id;
  END IF;

  RETURN jsonb_build_object(
    'id', p_transaksi_id,
    'status', 'cancelled_deleted',
    'message', 'Transaksi dibatalkan, stok dikembalikan, dan riwayat dihapus.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_and_delete_barang_keluar(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_and_delete_barang_keluar(integer) TO authenticated;
