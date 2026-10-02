window.SIPB_CONFIG = {
  supabaseUrl: 'https://ksaxogmwzcfzicjlqsqb.supabase.co',
  supabaseAnonKey: 'sb_publishable_aMO22myOQcvXIW60pSfEIg_ZzbIM571'
};

// Gunakan satu GoTrue/Supabase client untuk seluruh aplikasi agar auth
// tidak membuat beberapa instance dengan storage key yang sama.
if (window.supabase && !window.SIPB_SUPABASE_CLIENT) {
  window.SIPB_SUPABASE_CLIENT = window.supabase.createClient(
    window.SIPB_CONFIG.supabaseUrl,
    window.SIPB_CONFIG.supabaseAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
}
