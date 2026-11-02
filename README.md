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
3. Terapkan hanya migrasi baru yang belum diterapkan, secara berurutan:
   - `supabase/migrations/20261102090000_security_integrity_followup.sql`
   - `supabase/migrations/20261102110000_transaction_corrections.sql`
   - `supabase/migrations/20261102120000_fix_cancel_definer_permissions.sql`
4. Deploy ulang Edge Function `login-user` setelah perubahan branch digabungkan.
   Jika migrasi koreksi transaksi sudah pernah diterapkan sebelum patch hak EXECUTE ini tersedia, jalankan migrasi `20261102120000_fix_cancel_definer_permissions.sql` satu kali; jangan ulangi migrasi pembersihan data.
5. Jalankan kueri read-only `supabase/audits/security_integrity_followup_check.sql` dan `supabase/audits/transaction_corrections_check.sql`.
6. Uji login, pembuatan penerimaan/pengeluaran, koreksi dan pembatalan, arsip Master Barang, import, serta backup/restore dengan data uji terlebih dahulu.

### Koreksi transaksi
- Admin dapat mengoreksi penerimaan non-Kuasi: Master Barang, jumlah, harga satuan, sumber dana, tanggal, penyerah/penerima, dan keterangan.
- Admin dapat mengoreksi pengeluaran aktif. Transaksi lama menjadi `DIBATALKAN`, transaksi pengganti dibuat atomik, dan keduanya dicatat dalam audit.
- Pembatalan pengeluaran mempertahankan riwayat transaksi; tidak ada penghapusan fisik otomatis.
- Perubahan identitas Master Barang dicatat dalam audit.
- Koreksi penerimaan Kuasi/nomor seri sengaja diblokir pada formulir umum sampai tersedia prosedur batch khusus yang mengikat batch dengan transaksi penerimaannya.
- Koreksi jumlah penerimaan ditolak bila pengurangan akan membuat stok minus. Perpindahan penerimaan ke Master Barang lain ditolak bila stok penuh transaksi lama tidak lagi tersedia.

**Peringatan:** jangan menjalankan ulang migrasi lama yang berisi operasi pembersihan data, termasuk `20261002020000_clear_barang_masuk_keluar.sql` dan `20261002030000_clear_master_barang.sql`, pada database yang sudah berisi data produksi. Jangan menjalankan prosedur Restore hanya untuk memasang migrasi.

## Deployment web

GitHub Actions memeriksa sintaks `web/assets/app.js` pada pull request dan menerbitkan folder `web/` ke GitHub Pages setelah perubahan masuk ke `main`.

File `web/config.js` hanya berisi URL proyek Supabase dan public/anon key. Jangan pernah menyimpan `service_role` key atau kredensial server di file web, repository, atau browser.
