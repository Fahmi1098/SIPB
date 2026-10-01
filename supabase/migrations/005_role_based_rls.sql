-- Role-based RLS for SIPB.
-- Admin: full CRUD on master/audit data.
-- User: read-only master/history plus transaction entry through SECURITY DEFINER RPCs.
-- Run once after migrations 001-004.

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

REVOKE ALL ON FUNCTION public.sipb_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sipb_is_admin() TO authenticated;

-- Remove the migration-stage permissive policies.
DROP POLICY IF EXISTS "authenticated_full_access_barang" ON public.barang;
DROP POLICY IF EXISTS "authenticated_full_access_barang_masuk" ON public.barang_masuk;
DROP POLICY IF EXISTS "authenticated_full_access_detail_barang_keluar" ON public.detail_barang_keluar;
DROP POLICY IF EXISTS "authenticated_full_access_kategori" ON public.kategori;
DROP POLICY IF EXISTS "authenticated_full_access_pegawai" ON public.pegawai;
DROP POLICY IF EXISTS "authenticated_full_access_riwayat_opname" ON public.riwayat_opname;
DROP POLICY IF EXISTS "authenticated_full_access_stok_kuasi" ON public.stok_kuasi;
DROP POLICY IF EXISTS "authenticated_full_access_transaksi_keluar" ON public.transaksi_keluar;

-- Everyone active in SIPB may read operational data.
CREATE POLICY "sipb_read_barang" ON public.barang
  FOR SELECT TO authenticated
  USING (public.sipb_is_active_user());

CREATE POLICY "sipb_read_barang_masuk" ON public.barang_masuk
  FOR SELECT TO authenticated
  USING (public.sipb_is_active_user());

CREATE POLICY "sipb_read_detail_barang_keluar" ON public.detail_barang_keluar
  FOR SELECT TO authenticated
  USING (public.sipb_is_active_user());

CREATE POLICY "sipb_read_kategori" ON public.kategori
  FOR SELECT TO authenticated
  USING (public.sipb_is_active_user());

CREATE POLICY "sipb_read_pegawai" ON public.pegawai
  FOR SELECT TO authenticated
  USING (public.sipb_is_active_user());

CREATE POLICY "sipb_read_riwayat_opname" ON public.riwayat_opname
  FOR SELECT TO authenticated
  USING (public.sipb_is_active_user());

CREATE POLICY "sipb_read_stok_kuasi" ON public.stok_kuasi
  FOR SELECT TO authenticated
  USING (public.sipb_is_active_user());

CREATE POLICY "sipb_read_transaksi_keluar" ON public.transaksi_keluar
  FOR SELECT TO authenticated
  USING (public.sipb_is_active_user());

-- Only admin may directly mutate master and audit tables.
CREATE POLICY "sipb_admin_barang" ON public.barang
  FOR ALL TO authenticated
  USING (public.sipb_is_admin())
  WITH CHECK (public.sipb_is_admin());

CREATE POLICY "sipb_admin_barang_masuk" ON public.barang_masuk
  FOR ALL TO authenticated
  USING (public.sipb_is_admin())
  WITH CHECK (public.sipb_is_admin());

CREATE POLICY "sipb_admin_detail_barang_keluar" ON public.detail_barang_keluar
  FOR ALL TO authenticated
  USING (public.sipb_is_admin())
  WITH CHECK (public.sipb_is_admin());

CREATE POLICY "sipb_admin_kategori" ON public.kategori
  FOR ALL TO authenticated
  USING (public.sipb_is_admin())
  WITH CHECK (public.sipb_is_admin());

CREATE POLICY "sipb_admin_pegawai" ON public.pegawai
  FOR ALL TO authenticated
  USING (public.sipb_is_admin())
  WITH CHECK (public.sipb_is_admin());

CREATE POLICY "sipb_admin_riwayat_opname" ON public.riwayat_opname
  FOR ALL TO authenticated
  USING (public.sipb_is_admin())
  WITH CHECK (public.sipb_is_admin());

CREATE POLICY "sipb_admin_stok_kuasi" ON public.stok_kuasi
  FOR ALL TO authenticated
  USING (public.sipb_is_admin())
  WITH CHECK (public.sipb_is_admin());

CREATE POLICY "sipb_admin_transaksi_keluar" ON public.transaksi_keluar
  FOR ALL TO authenticated
  USING (public.sipb_is_admin())
  WITH CHECK (public.sipb_is_admin());

-- Allocation ledger is internal audit data: no direct client writes.
ALTER TABLE public.transaksi_kuasi_alokasi ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.transaksi_kuasi_alokasi FROM anon, authenticated;

DROP POLICY IF EXISTS "sipb_read_kuasi_allocation" ON public.transaksi_kuasi_alokasi;
DROP POLICY IF EXISTS "sipb_admin_kuasi_allocation" ON public.transaksi_kuasi_alokasi;

CREATE POLICY "sipb_read_kuasi_allocation" ON public.transaksi_kuasi_alokasi
  FOR SELECT TO authenticated
  USING (public.sipb_is_active_user());

CREATE POLICY "sipb_admin_kuasi_allocation" ON public.transaksi_kuasi_alokasi
  FOR ALL TO authenticated
  USING (public.sipb_is_admin())
  WITH CHECK (public.sipb_is_admin());

GRANT SELECT ON
  public.barang,
  public.barang_masuk,
  public.detail_barang_keluar,
  public.kategori,
  public.pegawai,
  public.riwayat_opname,
  public.stok_kuasi,
  public.transaksi_keluar,
  public.transaksi_kuasi_alokasi
TO authenticated;

GRANT INSERT, UPDATE, DELETE ON
  public.barang,
  public.barang_masuk,
  public.detail_barang_keluar,
  public.kategori,
  public.pegawai,
  public.riwayat_opname,
  public.stok_kuasi,
  public.transaksi_keluar,
  public.transaksi_kuasi_alokasi
TO authenticated;

-- User profiles: each authenticated user can read their own profile;
-- admin can read/manage all profiles.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_self_read" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_all" ON public.user_profiles;

CREATE POLICY "user_profiles_self_read" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() AND is_active = true);

CREATE POLICY "user_profiles_admin_all" ON public.user_profiles
  FOR ALL TO authenticated
  USING (public.sipb_is_admin())
  WITH CHECK (public.sipb_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
