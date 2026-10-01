-- Migration 022: restore missing foreign key and harden pegawai master access.
-- The imported schema contains riwayat_opname.barang_id but its FK was not
-- created in the PostgreSQL compatibility layer. PostgREST therefore cannot
-- resolve barang:barang_id(...) relationships.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'riwayat_opname_barang_id_fkey'
      AND conrelid = 'public.riwayat_opname'::regclass
  ) THEN
    ALTER TABLE public.riwayat_opname
      ADD CONSTRAINT riwayat_opname_barang_id_fkey
      FOREIGN KEY (barang_id)
      REFERENCES public.barang(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure the authenticated client can use the existing admin RLS policy
-- for Pegawai CRUD. Non-admin users remain read-only through RLS.
GRANT SELECT, INSERT, UPDATE, DELETE
ON public.pegawai
TO authenticated;
