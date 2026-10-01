-- Migration 024: controlled permanent deletion for master barang and outgoing history.
-- Master barang may be physically deleted only when it has no outgoing history.
-- Outgoing history must be cancelled first, then an admin may permanently remove
-- the cancelled transaction so the item no longer appears in Riwayat Transaksi.

CREATE OR REPLACE FUNCTION public.delete_barang_if_no_outgoing(p_barang_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_name text;
  v_outgoing_count integer;
BEGIN
  SELECT role INTO v_role
  FROM public.user_profiles
  WHERE id = auth.uid() AND is_active = true;

  IF COALESCE(lower(v_role), '') <> 'admin' THEN
    RAISE EXCEPTION 'Hanya admin yang dapat menghapus master barang';
  END IF;

  SELECT nama_barang
    INTO v_name
  FROM public.barang
  WHERE id = p_barang_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barang ID % tidak ditemukan', p_barang_id;
  END IF;

  SELECT COUNT(*)
    INTO v_outgoing_count
  FROM public.detail_barang_keluar
  WHERE barang_id = p_barang_id;

  IF v_outgoing_count > 0 THEN
    RAISE EXCEPTION
      'Barang "%s" masih memiliki %s riwayat pengeluaran. Hapus riwayat Barang Keluar terlebih dahulu.',
      v_name, v_outgoing_count;
  END IF;

  DELETE FROM public.barang
  WHERE id = p_barang_id;

  RETURN jsonb_build_object(
    'id', p_barang_id,
    'status', 'deleted',
    'message', 'Barang "' || v_name || '" berhasil dihapus.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_barang_if_no_outgoing(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_barang_if_no_outgoing(integer) TO authenticated;

-- Permanent deletion of outgoing history is deliberately limited to transactions
-- already marked DIBATALKAN. Cancellation restores stock and performs the Kuasi
-- safety checks; this function only removes the now-inactive audit record.
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
  SELECT role INTO v_role
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

-- Prevent direct client-side DELETE. All permanent deletion must pass the
-- guarded SECURITY DEFINER functions above.
REVOKE DELETE ON public.barang FROM authenticated;
REVOKE DELETE ON public.transaksi_keluar FROM authenticated;
