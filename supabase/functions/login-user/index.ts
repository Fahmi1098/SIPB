import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: "Konfigurasi Supabase server belum lengkap." }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Data login tidak valid." }, 400);
  }

  const identifier = String(body.identifier ?? "").trim();
  const password = String(body.password ?? "");

  if (!identifier || !password) {
    return json({ error: "Username/email dan password wajib diisi." }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  let email = identifier.toLowerCase();

  // Username SIPB dipetakan ke auth.users.id, lalu email Auth diambil
  // dari sisi server menggunakan service-role client.
  if (!identifier.includes("@")) {
    const { data: profile, error: profileError } = await adminClient
      .from("user_profiles")
      .select("id,is_active")
      .ilike("username", identifier)
      .limit(1)
      .maybeSingle();

    if (profileError) return json({ error: profileError.message }, 500);
    if (!profile || profile.is_active === false) {
      return json({ error: "Username tidak ditemukan atau akun tidak aktif." }, 401);
    }

    const { data: authUser, error: authUserError } =
      await adminClient.auth.admin.getUserById(profile.id);

    if (authUserError || !authUser.user?.email) {
      return json({ error: "Email akun tidak ditemukan." }, 401);
    }

    email = authUser.user.email.toLowerCase();
  }

  // Gunakan endpoint password grant Supabase Auth sehingga hasilnya
  // tetap berupa access_token + refresh_token yang dapat dipasang
  // ke client SIPB melalui auth.setSession().
  const tokenResponse = await fetch(
    supabaseUrl + "/auth/v1/token?grant_type=password",
    {
      method: "POST",
      headers: {
        "apikey": anonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    }
  );

  let tokenBody: Record<string, unknown> = {};
  try {
    tokenBody = await tokenResponse.json();
  } catch (_) {}

  if (!tokenResponse.ok) {
    return json({
      error: String(tokenBody.error_description || tokenBody.msg || tokenBody.error || "Email/username atau password salah.")
    }, 401);
  }

  return json({
    access_token: tokenBody.access_token,
    refresh_token: tokenBody.refresh_token,
    expires_in: tokenBody.expires_in,
    expires_at: tokenBody.expires_at,
    token_type: tokenBody.token_type,
    user: tokenBody.user
  });
});
