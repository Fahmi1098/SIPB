-- Migration 018: protect user_profiles from direct client mutation.
-- Role/status changes must go through manage_user_profile(), which preserves
-- the last-active-admin and self-lock protections.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE
ON public.user_profiles
FROM authenticated;

GRANT SELECT
ON public.user_profiles
TO authenticated;

REVOKE ALL
ON FUNCTION public.manage_user_profile(uuid,text,boolean)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.manage_user_profile(uuid,text,boolean)
TO authenticated;
