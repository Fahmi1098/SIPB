-- Restore trusted nested-RPC execution after legacy cancel RPC lockdown.
-- Only SECURITY DEFINER owners of the audited wrappers receive EXECUTE.
-- authenticated/anon/PUBLIC remain unable to call the legacy endpoint directly.

DO $sipb$
DECLARE
  v_cancel_rpc regprocedure := to_regprocedure('public.cancel_barang_keluar(integer)');
  v_record_rpc regprocedure := to_regprocedure(
    'public.record_barang_keluar(date,text,text,text,text,text,text,text,text,jsonb)'
  );
  v_audit_owner name;
  v_correct_owner name;
BEGIN
  IF v_cancel_rpc IS NULL THEN
    RAISE EXCEPTION 'RPC dasar public.cancel_barang_keluar(integer) tidak ditemukan. Pastikan migrasi 004_safe_cancel_barang_keluar.sql sudah diterapkan.';
  END IF;

  IF v_record_rpc IS NULL THEN
    RAISE EXCEPTION 'RPC dasar public.record_barang_keluar(...) tidak ditemukan. Pastikan migrasi transaksi atomik sudah diterapkan.';
  END IF;

  SELECT pg_get_userbyid(proowner)
  INTO v_audit_owner
  FROM pg_proc
  WHERE oid = to_regprocedure('public.cancel_barang_keluar_audited(integer,text)');

  SELECT pg_get_userbyid(proowner)
  INTO v_correct_owner
  FROM pg_proc
  WHERE oid = to_regprocedure(
    'public.correct_barang_keluar(integer,date,text,text,text,text,text,text,text,text,jsonb,text)'
  );

  IF v_audit_owner IS NULL OR v_correct_owner IS NULL THEN
    RAISE EXCEPTION 'Fungsi SECURITY DEFINER untuk audit/koreksi belum tersedia. Jalankan migrasi 20261102110000_transaction_corrections.sql terlebih dahulu.';
  END IF;

  IF lower(v_audit_owner) IN ('anon','authenticated')
     OR lower(v_correct_owner) IN ('anon','authenticated') THEN
    RAISE EXCEPTION 'Pemilik fungsi koreksi/pembatalan tidak boleh anon atau authenticated.';
  END IF;

  -- Reassert the public API lockdown, then grant only to the wrapper owners.
  REVOKE ALL ON FUNCTION public.cancel_barang_keluar(integer)
    FROM PUBLIC, anon, authenticated;

  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION public.cancel_barang_keluar(integer) TO %I',
    v_audit_owner
  );
  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION public.cancel_barang_keluar(integer) TO %I',
    v_correct_owner
  );

  -- The correction wrapper also creates a replacement transaction.
  EXECUTE format(
    'GRANT EXECUTE ON FUNCTION public.record_barang_keluar(date,text,text,text,text,text,text,text,text,jsonb) TO %I',
    v_correct_owner
  );
END;
$sipb$;

COMMENT ON FUNCTION public.cancel_barang_keluar_audited(integer,text) IS
  'Admin-only audited cancellation. The legacy RPC is executable only by the trusted SECURITY DEFINER owner.';
COMMENT ON FUNCTION public.correct_barang_keluar(integer,date,text,text,text,text,text,text,text,text,jsonb,text) IS
  'Admin-only atomic outgoing correction. Nested legacy cancellation and transaction creation are executable only by this SECURITY DEFINER owner.';
