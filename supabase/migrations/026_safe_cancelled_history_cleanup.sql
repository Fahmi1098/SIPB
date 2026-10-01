-- Migration 026: make the existing cancelled-history cleanup safe.
-- Frontend uses cancel_barang_keluar() followed by this function. This avoids
-- requiring the not-yet-installed cancel_and_delete_barang_keluar() RPC.

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

  -- Kuasi allocation has ON DELETE RESTRICT, so clean its audit rows first.
  DELETE FROM public.transaksi_kuasi_alokasi
  WHERE transaksi_keluar_id = p_transaksi_id;

  -- Existing FK from detail_barang_keluar to transaksi_keluar is ON DELETE
  -- CASCADE, so all transaction details are removed automatically.
  DELETE FROM public.transaksi_keluar
  WHERE id = p_transaksi_id;

  RETURN jsonb_build_object(
    'id', p_transaksi_id,
    'status', 'deleted',
    'message', 'Riwayat barang keluar berhasil dihapus.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_cancelled_barang_keluar(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_cancelled_barang_keluar(integer) TO authenticated;
