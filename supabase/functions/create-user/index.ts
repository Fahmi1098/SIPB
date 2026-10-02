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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Sesi login tidak ditemukan." }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: "Sesi login tidak valid atau sudah berakhir." }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: actor, error: actorError } = await adminClient
    .from("user_profiles")
    .select("id,role,is_active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (actorError) return json({ error: actorError.message }, 500);
  if (actor?.role !== "admin" || actor?.is_active === false) {
    return json({ error: "Hanya admin aktif yang dapat membuat pengguna baru." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Data formulir tidak valid." }, 400);
  }

  const name = String(body.name ?? "").trim();
  const username = String(body.username ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!name || !username || !email || !password) {
    return json({ error: "Nama, username, email, dan password wajib diisi." }, 400);
  }
  if (name.length > 120) return json({ error: "Nama terlalu panjang." }, 400);
  if (!/^[A-Za-z0-9._-]{3,50}$/.test(username)) {
    return json({ error: "Username hanya boleh 3-50 karakter: huruf, angka, titik, garis bawah, atau tanda minus." }, 400);
  }
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 160) {
    return json({ error: "Format email tidak valid." }, 400);
  }
  if (password.length < 8 || password.length > 72) {
    return json({ error: "Password harus 8-72 karakter." }, 400);
  }

  const { data: usernameTaken, error: usernameError } = await adminClient
    .from("user_profiles")
    .select("id")
    .ilike("username", username)
    .limit(1);

  if (usernameError) return json({ error: usernameError.message }, 500);
  if (usernameTaken?.length) {
    return json({ error: "Username sudah digunakan." }, 409);
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username,
      full_name: name,
      nama_lengkap: name
    }
  });

  if (createError || !created.user) {
    return json({ error: createError?.message || "Gagal membuat akun Auth." }, 400);
  }

  const { error: profileError } = await adminClient.from("user_profiles").insert({
    id: created.user.id,
    username,
    nama_lengkap: name,
    role: "user",
    is_active: true
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return json({ error: "Profil pengguna gagal dibuat: " + profileError.message }, 500);
  }

  return json({
    success: true,
    message: "Pengguna baru berhasil dibuat sebagai User aktif.",
    user: {
      id: created.user.id,
      email: created.user.email,
      username,
      nama_lengkap: name,
      role: "user"
    }
  });
});
