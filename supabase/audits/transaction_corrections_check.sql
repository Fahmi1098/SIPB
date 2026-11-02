-- Read-only checks for the transaction correction/audit migration.
-- Run after 20261102110000_transaction_corrections.sql.

SELECT
  to_regclass('public.sipb_transaction_audit') IS NOT NULL
    AS audit_table_exists,
  has_table_privilege('authenticated','public.sipb_transaction_audit','SELECT')
    AS authenticated_can_read_audit,
  has_table_privilege('authenticated','public.sipb_transaction_audit','INSERT')
    AS authenticated_can_insert_audit_directly,
  has_table_privilege('authenticated','public.sipb_transaction_audit','UPDATE')
    AS authenticated_can_update_audit_directly,
  has_table_privilege('authenticated','public.sipb_transaction_audit','DELETE')
    AS authenticated_can_delete_audit_directly;

-- Expected: table exists = true; SELECT = true; direct INSERT/UPDATE/DELETE = false.

SELECT
  has_function_privilege(
    'authenticated',
    'public.correct_barang_masuk(integer,integer,integer,numeric,text,date,text,text,text,text)',
    'EXECUTE'
  ) AS can_correct_barang_masuk,
  has_function_privilege(
    'authenticated',
    'public.correct_barang_keluar(integer,date,text,text,text,text,text,text,text,text,jsonb,text)',
    'EXECUTE'
  ) AS can_correct_barang_keluar,
  has_function_privilege(
    'authenticated',
    'public.cancel_barang_keluar_audited(integer,text)',
    'EXECUTE'
  ) AS can_cancel_with_audit,
  CASE
    WHEN to_regprocedure('public.cancel_barang_keluar(integer)') IS NULL THEN false
    ELSE has_function_privilege(
      'authenticated',
      to_regprocedure('public.cancel_barang_keluar(integer)'),
      'EXECUTE'
    )
  END AS can_call_legacy_cancel_without_audit,
  CASE
    WHEN to_regprocedure('public.cancel_and_delete_barang_keluar(integer)') IS NULL THEN false
    ELSE has_function_privilege(
      'authenticated',
      to_regprocedure('public.cancel_and_delete_barang_keluar(integer)'),
      'EXECUTE'
    )
  END AS can_call_legacy_cancel_and_delete,
  CASE
    WHEN to_regprocedure('public.cancel_barang_keluar_audited(integer,text)') IS NULL
      OR to_regprocedure('public.cancel_barang_keluar(integer)') IS NULL THEN false
    ELSE (
      SELECT has_function_privilege(
        pg_get_userbyid(p.proowner),
        to_regprocedure('public.cancel_barang_keluar(integer)'),
        'EXECUTE'
      )
      FROM pg_proc p
      WHERE p.oid = to_regprocedure('public.cancel_barang_keluar_audited(integer,text)')
    )
  END AS audited_cancel_owner_can_call_legacy,
  CASE
    WHEN to_regprocedure('public.correct_barang_keluar(integer,date,text,text,text,text,text,text,text,text,jsonb,text)') IS NULL
      OR to_regprocedure('public.cancel_barang_keluar(integer)') IS NULL THEN false
    ELSE (
      SELECT has_function_privilege(
        pg_get_userbyid(p.proowner),
        to_regprocedure('public.cancel_barang_keluar(integer)'),
        'EXECUTE'
      )
      FROM pg_proc p
      WHERE p.oid = to_regprocedure('public.correct_barang_keluar(integer,date,text,text,text,text,text,text,text,text,jsonb,text)')
    )
  END AS correct_owner_can_call_legacy,
  CASE
    WHEN to_regprocedure('public.correct_barang_keluar(integer,date,text,text,text,text,text,text,text,text,jsonb,text)') IS NULL
      OR to_regprocedure('public.record_barang_keluar(date,text,text,text,text,text,text,text,text,jsonb)') IS NULL THEN false
    ELSE (
      SELECT has_function_privilege(
        pg_get_userbyid(p.proowner),
        to_regprocedure('public.record_barang_keluar(date,text,text,text,text,text,text,text,text,jsonb)'),
        'EXECUTE'
      )
      FROM pg_proc p
      WHERE p.oid = to_regprocedure('public.correct_barang_keluar(integer,date,text,text,text,text,text,text,text,text,jsonb,text)')
    )
  END AS correct_owner_can_call_record_rpc;

-- Expected: first three = true; legacy cancel and cancel-and-delete = false.
-- The three SECURITY DEFINER owner checks above must also be true.

SELECT
  policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'sipb_transaction_audit'
ORDER BY policyname;

-- Expected: sipb_active_transaction_audit_read for SELECT only; qual must require both sipb_is_active_user() and sipb_is_admin().
