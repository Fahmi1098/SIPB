# SIPB — Sistem Informasi Pengurus Barang

Aplikasi pengelolaan persediaan barang UPTD PPD Malingping, Pemerintah Provinsi Banten.

## Struktur proyek

- `web/` — aplikasi web statis yang diterbitkan melalui GitHub Pages dan menggunakan Supabase.
- `supabase/functions/` — Edge Functions untuk autentikasi dan pengelolaan akun.
- `supabase/migrations/` — perubahan skema, RPC, kebijakan RLS, dan integritas persediaan.
- `supabase/audits/` — kueri pemeriksaan read-only untuk keamanan, saldo, dan alur transaksi.
- `inventory/` — aplikasi PHP lama dan aset pendukung; tidak diterbitkan oleh workflow GitHub Pages.

## Penerapan database

1. Buat backup data SIPB dan pastikan file backup dapat dibaca sebelum menerapkan perubahan.
2. Pastikan migrasi lama yang menjadi prasyarat sudah tercatat/diterapkan pada proyek Supabase.
3. Terapkan hanya migrasi baru yang belum diterapkan. Untuk perbaikan keamanan November 2026, jalankan:
   `supabase/migrations/20261102090000_security_integrity_followup.sql`
4. Deploy ulang Edge Function `login-user` setelah perubahan branch digabungkan.
5. Setelah SQL dan Edge Function diterapkan, uji login akun aktif/nonaktif, pembuatan transaksi, arsip Master Barang, import, dan backup/restore menggunakan data uji terlebih dahulu.

**Peringatan:** jangan menjalankan ulang migrasi lama yang berisi operasi pembersihan data, termasuk `20261002020000_clear_barang_masuk_keluar.sql` dan `20261002030000_clear_master_barang.sql`, pada database yang sudah berisi data produksi. Jangan menjalankan prosedur Restore hanya untuk memasang migrasi.

## Deployment web

GitHub Actions memeriksa sintaks `web/assets/app.js` pada pull request dan menerbitkan folder `web/` ke GitHub Pages setelah perubahan masuk ke `main`.

File `web/config.js` hanya berisi URL proyek Supabase dan public/anon key. Jangan pernah menyimpan `service_role` key atau kredensial server di file web, repository, atau browser.
