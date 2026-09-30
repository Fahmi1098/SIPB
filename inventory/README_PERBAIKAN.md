# SIPB UPTD PPD Malingping — Perbaikan

Versi ini mempertahankan modul inventaris yang ada dan memperkuat keamanan serta pengalaman penggunaan.

## Perbaikan utama
- Session cookie `HttpOnly` + `SameSite=Lax` dan regenerasi session ID.
- CSRF token untuk login dan seluruh formulir POST.
- Penghapusan master/kategori/akun diubah dari GET menjadi POST.
- Hak akses admin diperketat pada modul administrasi.
- Error database tidak lagi ditampilkan mentah kepada pengguna.
- Koneksi MySQL menggunakan `utf8mb4`, native prepared statements, dan default fetch mode.
- Upload foto profil memeriksa file gambar asli, ukuran maksimal 2 MB, dan nama file acak.
- Avatar default tidak lagi memakai layanan pihak ketiga.
- Beberapa operasi penting mencatat audit log bila tabel `log_aktivitas` tersedia.

## Konfigurasi
Gunakan variabel pada `.env.example` sebagai acuan konfigurasi server. Nilai default tetap kompatibel dengan instalasi lokal lama (`root` tanpa password) agar aplikasi tidak langsung rusak, tetapi pada server produksi sebaiknya gunakan akun database khusus dan password yang kuat.

## Catatan
File pemeliharaan web `migrasi_password.php` dan `reset_password.php` telah dibuat non-destruktif: keduanya tidak lagi melakukan reset/migrasi otomatis melalui URL. Gunakan modul Kelola Pengguna.

## Rombak UI/UX v2.1
- Shell aplikasi baru: sidebar navigasi, topbar profil, breadcrumb konteks, dan mobile drawer.
- Dashboard dirombak menjadi kartu KPI, quick actions, dan tabel inventaris yang lebih lega.
- Halaman Grafik & Analitik menggunakan kartu visual yang konsisten.
- Halaman Manajemen Pengguna dan Import Data memakai shell UI yang sama.
- Halaman login dibuat ulang dengan layout split modern, aksesibilitas dasar, dan pengalaman password toggle yang lebih jelas.
- Skema warna dipusatkan pada biru Banten, aksen emas, dan neutral surface agar konsisten.
- Responsif untuk desktop, tablet, dan mobile; mode cetak tetap dipertahankan.
