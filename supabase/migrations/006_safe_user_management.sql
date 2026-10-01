-- SIPB: safe management of user role/status
CREATE OR REPLACE FUNCTION public.manage_user_profile(
  p_user_id uuid,
  p_role text,
  p_is_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current public.user_profiles%ROWTYPE;
  v_admin_count integer;
BEGIN
  IF NOT public.sipb_is_active_user() OR NOT public.sipb_is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  IF p_role NOT IN ('admin','user') THEN
    RAISE EXCEPTION 'Role tidak valid.';
  END IF;

  SELECT * INTO v_current
  FROM public.user_profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna tidak ditemukan.';
  END IF;

  IF p_user_id = auth.uid() AND (p_role <> 'admin' OR p_is_active = false) THEN
    RAISE EXCEPTION 'Akun admin yang sedang digunakan tidak boleh diturunkan atau dinonaktifkan.';
  END IF;

  IF v_current.role = 'admin' AND v_current.is_active = true
     AND (p_role <> 'admin' OR p_is_active = false) THEN
    SELECT count(*) INTO v_admin_count
    FROM public.user_profiles
    WHERE role = 'admin' AND is_active = true AND id <> p_user_id;

    IF v_admin_count = 0 THEN
      RAISE EXCEPTION 'Tidak dapat menonaktifkan atau menurunkan admin terakhir.';
    END IF;
  END IF;

  UPDATE public.user_profiles
  SET role = p_role,
      is_active = p_is_active,
      updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'id', p_user_id,
    'role', p_role,
    'is_active', p_is_active,
    'status', 'updated'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.manage_user_profile(uuid,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.manage_user_profile(uuid,text,boolean) TO authenticated;
