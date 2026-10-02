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
  if (authError || !authData.user) return json({ error: "Sesi login tidak valid." }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Data profil tidak valid." }, 400);
  }

  const userId = String(body.user_id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const username = String(body.username ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!userId || !name || !username) {
    return json({ error: "User ID, nama, dan username wajib diisi." }, 400);
  }
  if (name.length > 120) return json({ error: "Nama terlalu panjang." }, 400);
  if (!/^[A-Za-z0-9._-]{3,50}$/.test(username)) {
    return json({ error: "Username hanya boleh 3-50 karakter: huruf, angka, titik, garis bawah, atau tanda minus." }, 400);
  }
  if (email && (!/^\S+@\S+\.\S+$/.test(email) || email.length > 160)) {
    return json({ error: "Format email tidak valid." }, 400);
  }
  if (password && (password.length < 8 || password.length > 72)) {
    return json({ error: "Password baru harus 8-72 karakter." }, 400);
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
    return json({ error: "Hanya admin aktif yang dapat mengedit profil pengguna." }, 403);
  }

  const { data: target, error: targetError } = await adminClient
    .from("user_profiles")
    .select("id,username,nama_lengkap")
    .eq("id", userId)
    .maybeSingle();

  if (targetError) return json({ error: targetError.message }, 500);
  if (!target) return json({ error: "Profil pengguna tidak ditemukan." }, 404);

  const { data: duplicate, error: duplicateError } = await adminClient
    .from("user_profiles")
    .select("id")
    .ilike("username", username)
    .neq("id", userId)
    .limit(1);

  if (duplicateError) return json({ error: duplicateError.message }, 500);
  if (duplicate?.length) return json({ error: "Username sudah digunakan pengguna lain." }, 409);

  const authUpdate: Record<string, unknown> = {
    user_metadata: {
      username,
      full_name: name,
      nama_lengkap: name
    }
  };
  if (email) {
    authUpdate.email = email;
    authUpdate.email_confirm = true;
  }
  if (password) authUpdate.password = password;

  const { error: authUpdateError } =
    await adminClient.auth.admin.updateUserById(userId, authUpdate);

  if (authUpdateError) {
    return json({ error: authUpdateError.message }, 400);
  }

  const { error: profileError } = await adminClient
    .from("user_profiles")
    .update({ username, nama_lengkap: name })
    .eq("id", userId);

  if (profileError) return json({ error: profileError.message }, 500);

  return json({
    success: true,
    message: password
      ? "Profil dan password pengguna berhasil diperbarui."
      : email
        ? "Profil dan email pengguna berhasil diperbarui."
        : "Profil pengguna berhasil diperbarui.",
    user: { id: userId, username, nama_lengkap: name, email: email || null }
  });
});
