-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 30 Jul 2026 pada 07.05
-- Versi server: 10.4.32-MariaDB
-- Versi PHP: 8.2.12

;
;
;
;

--
-- Database: db_inventory
--

-- --------------------------------------------------------

--
-- Struktur dari tabel barang
--

CREATE TABLE barang (
  id integer NOT NULL,
  kategori_id integer DEFAULT NULL,
  nama_barang varchar(150) NOT NULL,
  tipe varchar(100) DEFAULT NULL,
  merk varchar(100) DEFAULT NULL,
  satuan varchar(50) DEFAULT NULL,
  harga_terakhir decimal(15,2) DEFAULT 0.00,
  jumlah_total integer DEFAULT 0,
  terpakai integer DEFAULT 0,
  sisa integer DEFAULT 0,
  stok_minimum integer DEFAULT 0,
  kategori text DEFAULT 'non-kuasi'
);

--
-- Dumping data untuk tabel barang
--

INSERT INTO barang (id, kategori_id, nama_barang, tipe, merk, satuan, harga_terakhir, jumlah_total, terpakai, sisa, stok_minimum, kategori) VALUES
(1, 9, 'Isi Hekter Kecil No 10', '-', '-', 'KOTAK', 116800.00, 20, 8, 12, 0, 'non-kuasi'),
(2, 9, 'Penggaris Besi Ukuran 60 Cm', '-', '-', 'BUAH', 21000.00, 6, 0, 6, 0, 'non-kuasi'),
(3, 9, 'Stabillo kualitas Baik', '-', '-', 'BUAH', 25000.00, 11, 2, 9, 0, 'non-kuasi'),
(4, 9, 'Binder Clip No 200', '-', '-', 'KOTAK', 21500.00, 26, 6, 20, 0, 'non-kuasi'),
(5, 9, 'Trigonal Klip Kecil No3', '-', '-', 'KOTAK', 25000.00, 30, 10, 20, 0, 'non-kuasi'),
(6, 9, 'Gunting Standar', '-', '-', 'BUAH', 27500.00, 19, 1, 18, 0, 'non-kuasi'),
(7, 9, 'Buku agenda surat keluar sinar dunia 80 gram co...', '-', '-', 'BUAH', 750000.00, 1, 0, 1, 0, 'non-kuasi'),
(8, 9, 'Binder Clip No 260', '-', '-', 'KOTAK', 19800.00, 31, 2, 29, 0, 'non-kuasi'),
(9, 9, 'Bak Stempel Standar', '-', '-', 'BUAH', 14500.00, 5, 2, 3, 0, 'non-kuasi'),
(10, 9, 'Lakban Hitam 48mm', '-', '-', 'ROLL', 33500.00, 10, 2, 8, 0, 'non-kuasi'),
(11, 9, 'Pensil 28', '-', '-', 'LUSIN', 78500.00, 2, 0, 2, 0, 'non-kuasi'),
(12, 9, 'Spidol White Board Kecil', '-', '-', 'LUSIN', 145000.00, 2, 0, 2, 0, 'non-kuasi'),
(13, 9, 'Lakban Bening', '-', '-', 'ROLL', 141000.00, 9, 4, 5, 0, 'non-kuasi'),
(14, 9, 'Isi Cutter L-500', '-', '-', 'KOTAK', 28500.00, 5, 0, 5, 0, 'non-kuasi'),
(15, 9, 'Tinta Stempel Warna Biru', '-', '-', 'BUAH', 15000.00, 15, 2, 13, 0, 'non-kuasi'),
(16, 9, 'Map kertas Bufako', '-', '-', 'PCS', 132000.00, 30, 17, 13, 0, 'non-kuasi'),
(17, 9, 'Buku Ekspedisi 100 Lembar Hard cover 70 Gram', '-', '-', 'BUAH', 24000.00, 10, 0, 10, 0, 'non-kuasi'),
(18, 9, 'Ballpoint Standar AE7', '-', '-', 'LUSIN', 42500.00, 10, 10, 0, 0, 'non-kuasi'),
(19, 9, 'Binder Clip No 111', '-', '-', 'KOTAK', 8000.00, 20, 0, 20, 0, 'non-kuasi'),
(20, 9, 'Post it MMS-1 3M Uk, 76 mm x76mm, 400 lbr', '-', '-', 'LUSIN', 251000.00, 9, 3, 6, 0, 'non-kuasi'),
(21, 9, 'Map Pelastik / Snalhekter Plastik Folder One', '-', '-', 'LUSIN', 155900.00, 30, 14, 16, 0, 'non-kuasi'),
(22, 9, 'Cutter L-500', '-', '-', 'BUAH', 50000.00, 5, 0, 5, 0, 'non-kuasi'),
(23, 9, 'Stapler ukuran Besar', '-', '-', 'BUAH', 73500.00, 10, 0, 10, 0, 'non-kuasi'),
(24, 9, 'Isi Hekter Besar No 3', '-', '-', 'KOTAK', 195000.00, 5, 0, 5, 0, 'non-kuasi'),
(25, 9, 'Ordner Dan Map Ordner F4', '-', '-', 'BUAH', 77500.00, 50, 10, 40, 0, 'non-kuasi'),
(26, 9, 'Box File Bantex', '-', '-', 'BUAH', 63500.00, 45, 4, 41, 0, 'non-kuasi'),
(27, 9, 'Stapler Ukuran Kecil', '-', '-', 'BUAH', 47500.00, 21, 1, 20, 0, 'non-kuasi'),
(28, 9, 'Ballpoint Tinta', '-', '-', 'LUSIN', 245000.00, 8, 7, 1, 0, 'non-kuasi'),
(29, 9, 'Lem Glue Stick 25 gram Joyko', '-', '-', 'BUAH', 9900.00, 24, 3, 21, 0, 'non-kuasi'),
(30, 9, 'Pembolong Kertas No 85 2 Hols', '-', '-', 'BUAH', 98000.00, 5, 1, 4, 0, 'non-kuasi'),
(31, 9, 'Spidol Permanen', '-', '-', 'LUSIN', 104000.00, 3, 0, 3, 0, 'non-kuasi'),
(32, 9, 'Buku agenda surat masuk sinar dunia 80 gram cov...', '-', '-', 'BUAH', 750000.00, 1, 0, 1, 0, 'non-kuasi'),
(33, 9, 'Binder Clip No 155', '-', '-', 'KOTAK', 11000.00, 20, 1, 19, 0, 'non-kuasi'),
(34, 4, 'Continuous Form Kertas Uk. 9 1/2 x 13, 4 Ply', '-', '-', 'DUS', 1642800.00, 13, 7, 6, 0, 'non-kuasi'),
(35, 4, 'Continuous Form Ukuran 9 1/2 x 11,5 cm', '-', '-', 'DUS', 543900.00, 20, 4, 16, 0, 'non-kuasi'),
(36, 4, 'Continuous Form Ukuran 14 7/8 cm X 11 cm', '-', '-', 'DUS', 660450.00, 20, 3, 17, 0, 'non-kuasi'),
(37, 4, 'Toner HP 30A (CF230A)', '-', '-', 'BUAH', 1351980.00, 6, 0, 6, 0, 'non-kuasi'),
(38, 4, 'Toner HP Laser Jet Pro M454dn 6 416A CYM', '-', '-', 'BUAH', 1740480.00, 6, 0, 6, 0, 'non-kuasi'),
(39, 4, 'Toner HP Laser Jet Pro M454dn 6 416A Black', '-', '-', 'BUAH', 1462980.00, 6, 1, 5, 0, 'non-kuasi'),
(40, 4, 'Toner Laserkjet 32A', '-', '-', 'BUAH', 1986900.00, 6, 0, 6, 0, 'non-kuasi'),
(41, 4, 'Pita printer Epson LQ-2190 (Ribbon Cartridge SO...', '-', '-', 'DUS', 270840.00, 141, 1, 140, 0, 'non-kuasi'),
(42, 4, 'Tinta Printer EPSON 003 Black L-series', '-', '-', 'BUAH', 159840.00, 15, 3, 12, 0, 'non-kuasi'),
(43, 4, 'Refil Tinta Laser Jet Hitam - Isi Ulang', '-', '-', 'BUAH', 147630.00, 40, 0, 40, 0, 'non-kuasi'),
(44, 4, 'Tinta Printer EPSON 003 Color L-series', '-', '-', 'BUAH', 152070.00, 15, 6, 9, 0, 'non-kuasi'),
(45, 4, 'Continous Form Ukuran 9 1/2 x 11 1/2 3 Ply', '-', '-', 'DUS', 780330.00, 29, 5, 24, 0, 'non-kuasi'),
(46, 4, 'Toner HP 26A (CF226A)', '-', '-', 'BUAH', 2800530.00, 5, 0, 5, 0, 'non-kuasi'),
(47, 5, 'Lampu LED 3 Mata Downlight 7 Watt (per buah)', '-', '-', 'BUAH', 55500.00, 15, 0, 15, 0, 'non-kuasi'),
(48, 5, 'Box Kabel Roll 4 Lubang Cs 10+ Lamp', '-', '-', 'BUAH', 125430.00, 10, 0, 10, 0, 'non-kuasi'),
(49, 5, 'Lampu LED Downlight Bulat 16 Watt In Lite', '-', '-', 'PCS', 382950.00, 8, 0, 8, 0, 'non-kuasi'),
(50, 5, 'Lampu Bolham LED 12 Watt Putih In Lite', '-', '-', 'BUAH', 63825.00, 15, 0, 15, 0, 'non-kuasi'),
(51, 5, 'Lampu TL Panjang 15 watt (per buah)', '-', '-', 'PCS', 40001.00, 15, 0, 15, 0, 'non-kuasi'),
(52, 5, 'Senter Led, waterproof, USB rechargeable', '-', '-', 'PCS', 416250.00, 3, 0, 3, 0, 'non-kuasi'),
(53, 5, 'Baterai AA isi 2', '-', '-', 'PCS', 26085.00, 10, 2, 8, 0, 'non-kuasi'),
(54, 5, 'Lampu LED Downlight Bulat 12 Watt In Lite', '-', '-', 'PCS', 219780.00, 20, 0, 20, 0, 'non-kuasi'),
(55, 5, 'Kabel Roll Krisbow 3 x 1.5 Uk 50 M', '-', '-', 'BUAH', 1850000.00, 3, 0, 3, 0, 'non-kuasi'),
(56, 5, 'Lampu Sorot LED 20 Watt flood light', '-', '-', 'UNIT', 116550.00, 10, 0, 10, 0, 'non-kuasi'),
(57, 5, 'Baterai AAA isi 4 + 2 (per pack)', '-', '-', 'PCS', 52170.00, 10, 2, 8, 0, 'non-kuasi'),
(58, 5, 'Baterai AAA LR03 1.5V (per buah) ABC', '-', '-', 'BUAH', 6660.00, 16, 0, 16, 0, 'non-kuasi'),
(59, 5, 'Lampu LED Classic 7 Watt - 7.5 W (per buah)', '-', '-', 'PCS', 199800.00, 10, 0, 10, 0, 'non-kuasi'),
(60, 5, 'Lampu TL Panjang 18 watt (Per buah)', '-', '-', 'BUAH', 38999.00, 17, 0, 17, 0, 'non-kuasi'),
(61, 8, 'Sendok/Garpu set', '-', '-', 'LUSIN', 466200.00, 5, 0, 5, 0, 'non-kuasi'),
(62, 8, 'Pembersih Cair Pembersih kamar mandi', '-', '-', 'BOTOL', 32190.00, 5, 0, 5, 0, 'non-kuasi'),
(63, 8, 'Keset Bihun Model Custom', '-', '-', 'METER', 965145.00, 2, 0, 2, 0, 'non-kuasi'),
(64, 8, 'Bingkai Foto Uk. 10R 25x30 cm', '-', '-', 'UNIT', 187590.00, 12, 0, 12, 0, 'non-kuasi'),
(65, 8, 'Sapu Lidi Kualitas Baik', '-', '-', 'UNIT', 28305.00, 4, 0, 4, 0, 'non-kuasi'),
(66, 8, 'Pembersih Cair Pembersih Kloset Harpic', '-', '-', 'BOTOL', 64380.00, 5, 0, 5, 0, 'non-kuasi'),
(67, 8, 'Lap piring', '-', '-', 'UNIT', 28305.00, 4, 0, 4, 0, 'non-kuasi'),
(68, 8, 'Hand Wash Botol', '-', '-', 'BOTOL', 44400.00, 10, 0, 10, 0, 'non-kuasi'),
(69, 8, 'Keset Kain', '-', '-', 'METER', 79365.00, 10, 0, 10, 0, 'non-kuasi'),
(70, 8, 'Pisau buah', '-', '-', 'UNIT', 169830.00, 2, 0, 2, 0, 'non-kuasi'),
(71, 8, 'Keset Plastik', '-', '-', 'METER', 141525.00, 10, 0, 10, 0, 'non-kuasi'),
(72, 8, 'Gelas Melamin', '-', '-', 'LUSIN', 26640.00, 36, 0, 36, 0, 'non-kuasi'),
(73, 8, 'Piring Keramik', '-', '-', 'LUSIN', 338550.00, 5, 0, 5, 0, 'non-kuasi'),
(74, 8, 'Tempat Sampah Besar Non Medis', '-', '-', 'UNIT', 402930.00, 9, 0, 9, 0, 'non-kuasi'),
(75, 8, 'Pembersih Cair Pembersih Kaca 425ml', '-', '-', 'BOTOL', 22755.00, 5, 0, 5, 0, 'non-kuasi'),
(76, 8, 'Sapu Ijuk Kualitas Baik', '-', '-', 'UNIT', 92685.00, 3, 0, 3, 0, 'non-kuasi'),
(77, 8, 'Pengharum Ruangan', '-', '-', 'BOTOL', 56610.00, 20, 0, 20, 0, 'non-kuasi'),
(78, 8, 'Tisu 250s', '-', '-', 'PAKET', 27750.00, 104, 17, 87, 0, 'non-kuasi'),
(79, 8, 'Alat Pel Lobby Duster 60 cm SET', '-', '-', 'UNIT', 324675.00, 8, 0, 8, 0, 'non-kuasi'),
(80, 8, 'Pembersih Cair cairan Pencuci Piring 800 ml', '-', '-', 'LITER', 36408.00, 10, 0, 10, 0, 'non-kuasi'),
(81, 8, 'Cairan Pembersih Lantai', '-', '-', 'BOTOL', 39405.00, 10, 0, 10, 0, 'non-kuasi'),
(82, 8, 'Sikat Pegang WC Kamar Mandi', '-', '-', 'UNIT', 27750.00, 3, 0, 3, 0, 'non-kuasi'),
(83, 8, 'Kamper Gantung', '-', '-', 'BUTIR', 58830.00, 10, 0, 10, 0, 'non-kuasi'),
(84, 8, 'Gelas Keramik', '-', '-', 'LUSIN', 678210.00, 5, 0, 5, 0, 'non-kuasi'),
(85, 8, 'Wiper Kain Kaca 35 cm + Gagang Plastik', '-', '-', 'UNIT', 76590.00, 5, 0, 5, 0, 'non-kuasi');

-- --------------------------------------------------------

--
-- Struktur dari tabel barang_masuk
--

CREATE TABLE barang_masuk (
  id integer NOT NULL,
  barang_id integer DEFAULT NULL,
  jumlah integer NOT NULL,
  harga_satuan decimal(15,2) DEFAULT 0.00,
  sumber_dana varchar(100) DEFAULT NULL,
  nomor_awal varchar(50) DEFAULT NULL,
  nomor_akhir varchar(50) DEFAULT NULL,
  tanggal_masuk date NOT NULL,
  nama_penyerah varchar(150) NOT NULL,
  nama_penerima varchar(150) NOT NULL,
  nomor_dus varchar(100) DEFAULT NULL
);

--
-- Dumping data untuk tabel barang_masuk
--

INSERT INTO barang_masuk (id, barang_id, jumlah, harga_satuan, sumber_dana, nomor_awal, nomor_akhir, tanggal_masuk, nama_penyerah, nama_penerima, nomor_dus) VALUES
(1, 1, 20, 116800.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(2, 2, 6, 21000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(3, 3, 11, 25000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(4, 4, 26, 21500.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(5, 5, 30, 25000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(6, 6, 19, 27500.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(7, 7, 1, 750000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(8, 8, 31, 19800.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(9, 9, 5, 14500.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(10, 10, 10, 33500.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(11, 11, 2, 78500.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(12, 12, 2, 145000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(13, 13, 9, 141000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(14, 14, 5, 28500.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(15, 15, 15, 15000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(16, 16, 30, 132000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(17, 17, 10, 24000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(18, 18, 10, 42500.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(19, 19, 20, 8000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(20, 20, 9, 251000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(21, 21, 30, 155900.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(22, 22, 5, 50000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(23, 23, 10, 73500.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(24, 24, 5, 195000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(25, 25, 50, 77500.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(26, 26, 45, 63500.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(27, 27, 21, 47500.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(28, 28, 8, 245000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(29, 29, 24, 9900.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(30, 30, 5, 98000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(31, 31, 3, 104000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(32, 32, 1, 750000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(33, 33, 20, 11000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(34, 34, 13, 1642800.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(35, 35, 20, 543900.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(36, 36, 20, 660450.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(37, 37, 6, 1351980.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(38, 38, 6, 1740480.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(39, 39, 6, 1462980.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(40, 40, 6, 1986900.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(41, 41, 141, 270840.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(42, 42, 15, 159840.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(43, 43, 40, 147630.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(44, 44, 15, 152070.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(45, 45, 29, 780330.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(46, 46, 5, 2800530.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(47, 47, 15, 55500.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(48, 48, 10, 125430.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(49, 49, 8, 382950.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(50, 50, 15, 63825.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(51, 51, 15, 40001.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(52, 52, 3, 416250.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(53, 53, 10, 26085.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(54, 54, 20, 219780.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(55, 55, 3, 1850000.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(56, 56, 10, 116550.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(57, 57, 10, 52170.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(58, 58, 16, 6660.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(59, 59, 10, 199800.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(60, 60, 17, 38999.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(61, 61, 5, 466200.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(62, 62, 5, 32190.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(63, 63, 2, 965145.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(64, 64, 12, 187590.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(65, 65, 4, 28305.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(66, 66, 5, 64380.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(67, 67, 4, 28305.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(68, 68, 10, 44400.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(69, 69, 10, 79365.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(70, 70, 2, 169830.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(71, 71, 10, 141525.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(72, 72, 36, 26640.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(73, 73, 5, 338550.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(74, 74, 9, 402930.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(75, 75, 5, 22755.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(76, 76, 3, 92685.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(77, 77, 20, 56610.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(78, 78, 104, 27750.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(79, 79, 8, 324675.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(80, 80, 10, 36408.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(81, 81, 10, 39405.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(82, 82, 3, 27750.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(83, 83, 10, 58830.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(84, 84, 5, 678210.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL),
(85, 85, 5, 76590.00, 'APBD', NULL, NULL, '2026-01-02', 'Pihak ke Tiga', 'Muhamad Fahmi', NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel detail_barang_keluar
--

CREATE TABLE detail_barang_keluar (
  id integer NOT NULL,
  transaksi_keluar_id integer DEFAULT NULL,
  barang_id integer DEFAULT NULL,
  jumlah integer NOT NULL,
  nomor_awal varchar(50) DEFAULT NULL,
  nomor_akhir varchar(50) DEFAULT NULL,
  nomor_dus varchar(255) DEFAULT NULL
);

--
-- Dumping data untuk tabel detail_barang_keluar
--

INSERT INTO detail_barang_keluar (id, transaksi_keluar_id, barang_id, jumlah, nomor_awal, nomor_akhir, nomor_dus) VALUES
(1, 1, 78, 1, NULL, NULL, NULL),
(2, 1, 13, 1, NULL, NULL, NULL),
(3, 1, 10, 1, NULL, NULL, NULL),
(8, 5, 34, 1, NULL, NULL, NULL),
(9, 5, 36, 1, NULL, NULL, NULL),
(10, 6, 35, 1, NULL, NULL, NULL),
(14, 8, 78, 2, NULL, NULL, NULL),
(16, 10, 36, 1, NULL, NULL, NULL),
(17, 10, 35, 1, NULL, NULL, NULL),
(18, 11, 16, 1, NULL, NULL, NULL),
(19, 12, 78, 2, NULL, NULL, NULL),
(20, 12, 16, 1, NULL, NULL, NULL),
(21, 12, 29, 1, NULL, NULL, NULL),
(22, 13, 18, 1, NULL, NULL, NULL),
(23, 13, 16, 1, NULL, NULL, NULL),
(24, 14, 45, 1, NULL, NULL, NULL),
(25, 15, 35, 1, NULL, NULL, NULL),
(26, 15, 34, 1, NULL, NULL, NULL),
(27, 16, 28, 1, NULL, NULL, NULL),
(28, 17, 16, 1, NULL, NULL, NULL),
(29, 17, 26, 1, NULL, NULL, NULL),
(30, 18, 26, 1, NULL, NULL, NULL),
(31, 18, 28, 2, NULL, NULL, NULL),
(32, 18, 78, 2, NULL, NULL, NULL),
(33, 19, 13, 1, NULL, NULL, NULL),
(34, 19, 10, 1, NULL, NULL, NULL),
(35, 19, 78, 2, NULL, NULL, NULL),
(38, 22, 34, 1, NULL, NULL, NULL),
(39, 22, 36, 1, NULL, NULL, NULL),
(40, 23, 5, 2, NULL, NULL, NULL),
(41, 24, 18, 1, NULL, NULL, NULL),
(42, 25, 9, 1, NULL, NULL, NULL),
(43, 26, 34, 1, NULL, NULL, NULL),
(44, 27, 8, 1, NULL, NULL, NULL),
(45, 27, 26, 2, NULL, NULL, NULL),
(46, 28, 20, 2, NULL, NULL, NULL),
(47, 28, 18, 2, NULL, NULL, NULL),
(48, 29, 25, 10, NULL, NULL, NULL),
(49, 29, 21, 10, NULL, NULL, NULL),
(50, 30, 8, 1, NULL, NULL, NULL),
(51, 30, 4, 1, NULL, NULL, NULL),
(52, 30, 33, 1, NULL, NULL, NULL),
(53, 31, 16, 3, NULL, NULL, NULL),
(54, 32, 18, 1, NULL, NULL, NULL),
(55, 33, 30, 1, NULL, NULL, NULL),
(56, 34, 1, 5, NULL, NULL, NULL),
(57, 34, 4, 2, NULL, NULL, NULL),
(58, 35, 28, 1, NULL, NULL, NULL),
(59, 36, 5, 2, NULL, NULL, NULL),
(60, 37, 13, 2, NULL, NULL, NULL),
(61, 38, 78, 2, NULL, NULL, NULL),
(62, 39, 78, 2, NULL, NULL, NULL),
(63, 39, 20, 1, NULL, NULL, NULL),
(64, 39, 5, 2, NULL, NULL, NULL),
(65, 39, 4, 1, NULL, NULL, NULL),
(66, 39, 4, 1, NULL, NULL, NULL),
(67, 39, 21, 2, NULL, NULL, NULL),
(68, 40, 45, 1, NULL, NULL, NULL),
(69, 41, 34, 1, NULL, NULL, NULL),
(70, 42, 45, 1, NULL, NULL, NULL),
(71, 42, 34, 1, NULL, NULL, NULL),
(72, 43, 18, 1, NULL, NULL, NULL),
(73, 43, 28, 1, NULL, NULL, NULL),
(74, 44, 78, 2, NULL, NULL, NULL),
(75, 45, 29, 1, NULL, NULL, NULL),
(76, 46, 15, 1, NULL, NULL, NULL),
(77, 47, 34, 1, NULL, NULL, NULL),
(78, 48, 21, 1, NULL, NULL, NULL),
(79, 49, 16, 10, NULL, NULL, NULL),
(80, 50, 18, 1, NULL, NULL, NULL),
(81, 51, 4, 1, NULL, NULL, NULL),
(82, 51, 18, 1, NULL, NULL, NULL),
(83, 51, 5, 1, NULL, NULL, NULL),
(84, 52, 57, 2, NULL, NULL, NULL),
(85, 53, 9, 1, NULL, NULL, NULL),
(86, 53, 15, 1, NULL, NULL, NULL),
(87, 54, 78, 1, NULL, NULL, NULL),
(88, 55, 42, 1, NULL, NULL, NULL),
(89, 55, 44, 3, NULL, NULL, NULL),
(90, 56, 1, 1, NULL, NULL, NULL),
(91, 56, 18, 1, NULL, NULL, NULL),
(92, 56, 27, 1, NULL, NULL, NULL),
(93, 56, 78, 1, NULL, NULL, NULL),
(94, 56, 29, 1, NULL, NULL, NULL),
(95, 57, 3, 2, NULL, NULL, NULL),
(96, 57, 28, 1, NULL, NULL, NULL),
(97, 58, 6, 1, NULL, NULL, NULL),
(98, 59, 21, 1, NULL, NULL, NULL),
(99, 59, 1, 2, NULL, NULL, NULL),
(100, 60, 42, 1, NULL, NULL, NULL),
(101, 61, 53, 2, NULL, NULL, NULL),
(102, 61, 45, 1, NULL, NULL, NULL),
(103, 62, 42, 1, NULL, NULL, NULL),
(104, 62, 44, 3, NULL, NULL, NULL),
(105, 63, 41, 1, NULL, NULL, NULL),
(106, 63, 39, 1, NULL, NULL, NULL),
(107, 64, 45, 1, NULL, NULL, NULL),
(108, 64, 18, 1, NULL, NULL, NULL),
(109, 65, 35, 1, NULL, NULL, NULL),
(110, 66, 5, 3, NULL, NULL, NULL),
(111, 66, 28, 1, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel kategori
--

CREATE TABLE kategori (
  id integer NOT NULL,
  nama_kategori varchar(100) NOT NULL
);

--
-- Dumping data untuk tabel kategori
--

INSERT INTO kategori (id, nama_kategori) VALUES
(1, 'Kertas dan Cover'),
(2, 'ATK'),
(3, 'Alat Kebersihan'),
(4, 'Bahan Komputer'),
(5, 'Alat Listrik'),
(6, 'Barang Kuasi'),
(8, 'Perabot Kantor'),
(9, 'Alat Tulis Kantor'),
(10, 'Bahan Bakar Minyak');

-- --------------------------------------------------------

--
-- Struktur dari tabel pegawai
--

CREATE TABLE pegawai (
  id integer NOT NULL,
  nama_pegawai varchar(100) NOT NULL,
  nip varchar(50) DEFAULT NULL,
  status_pegawai varchar(20) DEFAULT 'Non-ASN',
  jabatan varchar(100) DEFAULT NULL
);

--
-- Dumping data untuk tabel pegawai
--

INSERT INTO pegawai (id, nama_pegawai, nip, status_pegawai, jabatan) VALUES
(50, 'TITI PATIMAH', '20000720 202521 2 060', 'PPPK', 'Operator Layanan Operasional'),
(51, 'ASEP SAEPUDIN, S.IP.', '19830805 202521 1 075', 'Non-ASN', 'Penata Layanan Operasional'),
(52, 'LIA NOPIANA, S.IP.', '19921124 202521 2 112', 'Non-ASN', 'Penata Layanan Operasional'),
(53, 'DEDI HERYANTO', '19910903 202521 1 088', 'Non-ASN', 'Operator Layanan Operasional'),
(54, 'GANI PRAMUDYA', '19990225 202521 1 050', 'Non-ASN', 'Operator Layanan Operasional'),
(55, 'ANGGA DWI ALDIANTO', '19920315 202521 1 094', 'Non-ASN', 'Operator Layanan Operasional'),
(56, 'BAYU SAGARA, S.Pd.', '19921116 202521 1 083', 'Non-ASN', 'Penata Layanan Operasional'),
(57, 'FIKRI AHMADI, S.IP.', '19880813 202521 1 098', 'Non-ASN', 'Penata Layanan Operasional'),
(58, 'ENCE MOCH ALI, S.IP.', '19790220 202521 1 064', 'Non-ASN', 'Penata Layanan Operasional'),
(59, 'RIDWAN FIRDAUS, S.IP.', '19900424 202521 1 170', 'Non-ASN', 'Penata Layanan Operasional'),
(60, 'HERMAWATI AGUSTIN, S.A.P.', '19960826 202521 2 105', 'Non-ASN', 'Penata Layanan Operasional'),
(61, 'LILI, S.IP.', '19920407 202521 1 123', 'Non-ASN', 'Penata Layanan Operasional'),
(62, 'SITI FATIMAH, S.Sos.', '19951005 202521 2 169', 'Non-ASN', 'Penata Layanan Operasional'),
(63, 'FITRIA WAHYUNI', '20010531 202521 2 032', 'Non-ASN', 'Operator Layanan Operasional'),
(64, 'MUHAMAD FAHMI', '19981010 202521 1 099', 'PPPK', 'Operator Layanan Operasional'),
(65, 'WARDANI', '19890304 202521 1 134', 'Non-ASN', 'Operator Layanan Operasional'),
(66, 'BENNY DULAISI', '19820421 202521 1 083', 'Non-ASN', 'Operator Layanan Operasional'),
(67, 'DEDE SUHERLAN', '20000410 202521 1 068', 'Non-ASN', 'Operator Layanan Operasional'),
(68, 'EROS MASRUROH, S.IP.', '19930614 202521 2 130', 'Non-ASN', 'Penata Layanan Operasional'),
(69, 'INDRI MONICA, S.E.', '19981005 202521 2 088', 'Non-ASN', 'Penata Layanan Operasional'),
(70, 'ALDO DHAMMA WIRALELANA', '19981212 202521 1 046', 'PPPK', 'Operator Layanan Operasional'),
(71, 'SITI MELISA', '19980324 202521 2 065', 'Non-ASN', 'Operator Layanan Operasional'),
(72, 'ANGGUN PURWADINDA, S.E.', '19921021 20252 1 168', 'Non-ASN', 'Penata Layanan Operasional'),
(73, 'EPEN MUAJAT', '19890710 202521 1 179', 'Non-ASN', 'Operator Layanan Operasional'),
(74, 'PIKRI RAMDANI', '20001210 202521 1 055', 'Non-ASN', 'Operator Layanan Operasional'),
(75, 'NURWANDI', '19931301 202521 1 108', 'Non-ASN', 'Operator Layanan Operasional'),
(76, 'HASANUDIN', '19840706 202521 1 159', 'Non-ASN', 'Operator Layanan Operasional'),
(77, 'SUMIN RAPENDI', '19880612 202521 1 168', 'Non-ASN', 'Operator Layanan Operasional'),
(78, 'SURYANA', '19910628 202521 1 126', 'Non-ASN', 'Operator Layanan Operasional'),
(79, 'LINGGA DWI PRASETYO, S.Pd.', '19951120 202521 1 093', 'Non-ASN', 'Penata Layanan Operasional'),
(80, 'TOPAN GHIFARI, S.H.', '19951120 202521 1 097', 'Non-ASN', 'Penata Layanan Operasional'),
(81, 'SUHENDI', '19941212 202521 1 176', 'Non-ASN', 'Operator Layanan Operasional'),
(82, 'GINANJAR, S.Sos.', '19931002 202521 1 096', 'Non-ASN', 'Penata Layanan Operasional'),
(83, 'ELAN HERLANA', '19730325 202521 1 048', 'Non-ASN', 'Operator Layanan Operasional'),
(84, 'MOHAMMAD AGIS NUGRAHA', '20000510 202521 1 070', 'Non-ASN', 'Operator Layanan Operasional'),
(85, 'OPAY JUMHADI', '19791112 202521 1 072', 'Non-ASN', 'Operator Layanan Operasional'),
(86, 'PENDI SAMPURNA, S.IP.', '19890612 202521 1 202', 'Non-ASN', 'Penata Layanan Operasional'),
(87, 'SARIPUDIN', '19830620 202521 1 116', 'Non-ASN', 'Operator Layanan Operasional'),
(88, 'HASANI', '19941230 202521 1 117', 'Non-ASN', 'Operator Layanan Operasional'),
(89, 'SUEB SARBINI', '19850427 202521 1 107', 'Non-ASN', 'Operator Layanan Operasional'),
(90, 'FAIZ FAZLURROHMAN, S.IP', '19880621 202521 1 113', 'Non-ASN', 'Penata Layanan Operasional'),
(91, 'DARMIDI, S.Sos., M.Si', '19730604 199303 1 004', 'Non-ASN', 'Kepala Sub Bagian Tata Usaha'),
(92, 'LIA JULIANA, S.Pd.I M.A', '1980071 200212 2 004', 'Non-ASN', 'Penelaah Teknis Kebijakan'),
(93, 'MAMAN FATUROHMAN, SE', '19780327 200701 1 004', 'Non-ASN', 'Pengolah Data dan Informasi'),
(94, 'LILIS SURYANI, A.Md', '19770604 200112 2 005', 'Non-ASN', 'Pengadministrasi Perkantoran'),
(95, 'NANANG NUGRAHA, S.Sos', '19680428 200212 1 006', 'Non-ASN', 'Pengadministrasi Perkantoran'),
(96, 'ATEP RAHMAN, S.E.', '19740208 201409 1 003', 'PNS', 'Koordinator Gerai Banjarsari'),
(97, 'YOLANDA HIRRA DIRGANTARA, S.STP., M.Si', '19910904 201206 1 001', 'Non-ASN', 'Pengolah Data dan Informasi'),
(98, 'JAYA, SH', '19680603 200212 1 002', 'PNS', 'Plt. Kasi Penerimaan dan Penagihan'),
(99, 'DEDE SUTIAWAN, SE', '19900812 202521 1 076', 'Non-ASN', 'Penata Layanan Operasional'),
(100, 'AYIP RIZA ARAFAT, SE', '19830520 200112 1 005', 'Non-ASN', 'Pengolah Data dan Informasi'),
(101, 'NANDI YUSWARDI', '19710521 199503 1 003', 'Non-ASN', 'Pengadministrasi Perkantoran'),
(102, 'ANIS FAISAL REZA, SE', '19750320 199803 1 004', 'PNS', 'Koordinator Gerai Bayah'),
(103, 'TEDDI SAEPUDIN, SH., M.Si', '19791210 200212 1 004', 'PNS', 'Pengolah Data dan Informasi'),
(104, 'ETIN KURNIA, S.Sos.', '19940701 202521 2 051', 'Non-ASN', 'Penata Layanan Operasional'),
(105, 'FISKHA RACHMAHAYATI, SE.', '19900604 202521 2 053', 'Non-ASN', 'Penata Layanan Operasional'),
(106, 'DENI WIJAYA, SE', '19880712 202521 1 055', 'Non-ASN', 'Penata Layanan Operasional'),
(107, 'SOFYAN ANSHORY, S.IP.', '19890506 202521 1 041', 'Non-ASN', 'Penata Layanan Operasional'),
(108, 'ASRY SYFA FITRIYANI, S.Pd.', '19940406 202521 2 045', 'Non-ASN', 'Penata Layanan Operasional'),
(109, 'LOMRI, S.IP', '19810703 202521 1 025', 'Non-ASN', 'Penata Layanan Operasional'),
(110, 'WINDI RAHAYU, S.Pd', '19950829 202521 2 032', 'Non-ASN', 'Penata Layanan Operasional'),
(111, 'ASEP DAMANHURI', '19920206 202521 1 043', 'Non-ASN', 'Pengadministrasi Perkantoran'),
(112, 'NURJAYA', '19920703 202521 1 031', 'Non-ASN', 'Penata Layanan Operasional'),
(113, 'HEAGY VIRLY MUDIYANTO', '19871102 202521 1 022', 'Non-ASN', 'Pengadministrasi Perkantoran'),
(114, 'Agus Suryadi, S.Pd', '19741109 200212 1 004', 'PNS', 'Plt. Kepala UPTD PPD Malingping'),
(115, 'Amirudin, S.Sos.I', '198001092025211011', 'PPPK', 'Penata Layanan Operasional'),
(116, 'Puji Angganis', '199504092025212030', 'PPPK', 'Pengadministrasi Perkantoran'),
(117, 'Rika Anggraini, S.Pd', '199109252025212034', 'PPPK', 'Penata Layanan Operasional'),
(118, 'Selly Apriliani, S,IP', '198504102025212027', 'PPPK', 'Penata Layanan Operasional');

-- --------------------------------------------------------

--
-- Struktur dari tabel riwayat_opname
--

CREATE TABLE riwayat_opname (
  id integer NOT NULL,
  tanggal_opname date NOT NULL,
  barang_id integer NOT NULL,
  stok_sistem integer NOT NULL,
  stok_fisik integer NOT NULL,
  selisih integer NOT NULL,
  keterangan text DEFAULT NULL,
  petugas varchar(100) DEFAULT NULL
);

-- --------------------------------------------------------

--
-- Struktur dari tabel stok_kuasi
--

CREATE TABLE stok_kuasi (
  id integer NOT NULL,
  barang_id integer NOT NULL,
  prefix_huruf varchar(50) DEFAULT '',
  panjang_digit integer NOT NULL,
  digit_awal integer NOT NULL,
  digit_akhir integer NOT NULL,
  digit_sekarang integer NOT NULL,
  sisa_lembar integer NOT NULL,
  tanggal_masuk date NOT NULL,
  nomor_dus varchar(100) DEFAULT NULL
);

-- --------------------------------------------------------

--
-- Struktur dari tabel transaksi_keluar
--

CREATE TABLE transaksi_keluar (
  id integer NOT NULL,
  tanggal_keluar date NOT NULL,
  penyerah_nama varchar(150) DEFAULT NULL,
  penyerah_jabatan varchar(100) DEFAULT NULL,
  penyerah_nip varchar(50) DEFAULT NULL,
  penerima_nama varchar(150) DEFAULT NULL,
  penerima_jabatan varchar(100) DEFAULT NULL,
  penerima_nip varchar(50) DEFAULT NULL,
  tujuan_ruangan varchar(100) DEFAULT NULL,
  jenis_dokumen text DEFAULT 'Nota Dinas'
);

--
-- Dumping data untuk tabel transaksi_keluar
--

INSERT INTO transaksi_keluar (id, tanggal_keluar, penyerah_nama, penyerah_jabatan, penyerah_nip, penerima_nama, penerima_jabatan, penerima_nip, tujuan_ruangan, jenis_dokumen) VALUES
(1, '2026-05-21', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'TITI PATIMAH', 'Operator Layanan Operasional', '20000720 202521 2 060', 'Staff Penerimaan dan Penagihan', ''),
(5, '2026-03-25', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'ATEP RAHMAN, S.E.', 'Koordinator Gerai Banjarsari', '19740208 201409 1 003', 'Gerai Banjarsari', ''),
(6, '2026-03-25', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'HASANUDIN', 'Operator Layanan Operasional', '19840706 202521 1 159', 'Samling', ''),
(8, '2026-03-26', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'Staf Barang', ''),
(10, '2026-03-26', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'FIKRI AHMADI, S.IP.', 'Penata Layanan Operasional', '19880813 202521 1 098', 'Gerai Bayah', ''),
(11, '2026-03-26', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'GANI PRAMUDYA', 'Operator Layanan Operasional', '19990225 202521 1 050', 'Staf Kepegawaian', ''),
(12, '2026-03-17', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'TITI PATIMAH', 'Operator Layanan Operasional', '20000720 202521 2 060', 'Staff Penerimaan dan Penagihan', ''),
(13, '2026-03-30', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'SITI FATIMAH, S.Sos.', 'Penata Layanan Operasional', '19951005 202521 2 169', 'Staf Pendataan dan Penetapan', ''),
(14, '2026-03-30', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'MAMAN FATUROHMAN, SE', 'Pengolah Data dan Informasi', '19780327 200701 1 004', 'Bendahara Penerimaan', ''),
(15, '2026-05-26', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'SUEB SARBINI', 'Operator Layanan Operasional', '19850427 202521 1 107', 'Samling', ''),
(16, '2026-05-26', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'Agus Suryadi, S.Pd', 'Plt. Kepala UPTD PPD Malingping', '19741109 200212 1 004', 'Kepala UPT', ''),
(17, '2026-05-25', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'MUHAMAD FAHMI', 'Operator Layanan Operasional', '19981010 202521 1 099', 'Barang', ''),
(18, '2026-05-21', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'DARMIDI, S.Sos., M.Si', 'Kepala Sub Bagian Tata Usaha', '19730604 199303 1 004', 'Tata Usaha', ''),
(19, '2026-05-21', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'TITI PATIMAH', 'Operator Layanan Operasional', '20000720 202521 2 060', 'Staff Penerimaan dan Penagihan', ''),
(22, '2026-05-13', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'FIKRI AHMADI, S.IP.', 'Penata Layanan Operasional', '19880813 202521 1 098', 'Gerai Bayah', ''),
(23, '2026-05-13', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'SITI FATIMAH, S.Sos.', 'Penata Layanan Operasional', '19951005 202521 2 169', 'pendataan', ''),
(24, '2026-05-19', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'Puji Angganis', 'Pengadministrasi Perkantoran', '199504092025212030', 'Staf Kepegawaian', ''),
(25, '2026-05-19', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'INDRI MONICA, S.E.', 'Penata Layanan Operasional', '19981005 202521 2 088', 'Tata Usaha', ''),
(26, '2026-05-30', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'MAMAN FATUROHMAN, SE', 'Pengolah Data dan Informasi', '19780327 200701 1 004', 'Bendahara Penerimaan', ''),
(27, '2026-03-10', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'MAMAN FATUROHMAN, SE', 'Pengolah Data dan Informasi', '19780327 200701 1 004', 'Bendahara Penerimaan', ''),
(28, '2026-03-10', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'INDRI MONICA, S.E.', 'Penata Layanan Operasional', '19981005 202521 2 088', 'Subbag Tata Usaha', ''),
(29, '2026-03-11', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'ETIN KURNIA, S.Sos.', 'Penata Layanan Operasional', '19940701 202521 2 051', 'Bendahara Penerimaan', ''),
(30, '2026-03-11', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'WARDANI', 'Operator Layanan Operasional', '19890304 202521 1 134', 'PEP', ''),
(31, '2026-03-12', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'HERMAWATI AGUSTIN, S.A.P.', 'Penata Layanan Operasional', '19960826 202521 2 105', 'Bendahara Penerimaan', ''),
(32, '2026-03-13', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'HASANI', 'Operator Layanan Operasional', '19941230 202521 1 117', 'Pelayanan', ''),
(33, '2026-03-28', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'TITI PATIMAH', 'Operator Layanan Operasional', '20000720 202521 2 060', 'Staff Penerimaan dan Penagihan', ''),
(34, '2026-03-31', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'MAMAN FATUROHMAN, SE', 'Pengolah Data dan Informasi', '19780327 200701 1 004', 'Bendahara Penerimaan', ''),
(35, '2026-03-31', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'Selly Apriliani, S,IP', 'Penata Layanan Operasional', '198504102025212027', 'Subbag Tata Usaha', ''),
(36, '2026-03-31', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'GANI PRAMUDYA', 'Operator Layanan Operasional', '19990225 202521 1 050', 'Kepegawaian', ''),
(37, '2026-04-01', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'GANI PRAMUDYA', 'Operator Layanan Operasional', '19990225 202521 1 050', 'Kepegawaian', ''),
(38, '2026-04-01', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'EROS MASRUROH, S.IP.', 'Penata Layanan Operasional', '19930614 202521 2 130', 'Staff Pendataan dan Penetapan', ''),
(39, '2026-04-01', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'TITI PATIMAH', 'Operator Layanan Operasional', '20000720 202521 2 060', 'Staff Penerimaan dan Penagihan', ''),
(40, '2026-04-29', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'HASANUDIN', 'Operator Layanan Operasional', '19840706 202521 1 159', 'Samling', ''),
(41, '2026-04-29', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'SUEB SARBINI', 'Operator Layanan Operasional', '19850427 202521 1 107', 'Samling', ''),
(42, '2026-04-29', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'MAMAN FATUROHMAN, SE', 'Pengolah Data dan Informasi', '19780327 200701 1 004', 'Bendahara Penerimaan', ''),
(43, '2026-05-06', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'SITI FATIMAH, S.Sos.', 'Penata Layanan Operasional', '19951005 202521 2 169', 'Staff Penerimaan dan Penagihan', ''),
(44, '2026-05-06', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'TITI PATIMAH', 'Operator Layanan Operasional', '20000720 202521 2 060', 'Staff Penerimaan dan Penagihan', ''),
(45, '2026-05-06', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'MOHAMMAD AGIS NUGRAHA', 'Operator Layanan Operasional', '20000510 202521 1 070', 'Bendahara Penerimaan', ''),
(46, '2026-04-07', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'ELAN HERLANA', 'Operator Layanan Operasional', '19730325 202521 1 048', 'Staff Penerimaan dan Penagihan', ''),
(47, '2026-04-07', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'HASANUDIN', 'Operator Layanan Operasional', '19840706 202521 1 159', 'Samling', ''),
(48, '2026-04-08', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'SITI MELISA', 'Operator Layanan Operasional', '19980324 202521 2 065', 'Staff Penerimaan dan Penagihan', ''),
(49, '2026-04-23', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'INDRI MONICA, S.E.', 'Penata Layanan Operasional', '19981005 202521 2 088', 'Tata Usaha', ''),
(50, '2026-04-23', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'ALDO DHAMMA WIRALELANA', 'Operator Layanan Operasional', '19981212 202521 1 046', 'Staff Penerimaan dan Penagihan', ''),
(51, '2026-04-24', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'Selly Apriliani, S,IP', 'Penata Layanan Operasional', '198504102025212027', 'Tata Usaha', ''),
(52, '2026-04-24', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'AYIP RIZA ARAFAT, SE', 'Pengolah Data dan Informasi', '19830520 200112 1 005', 'Pelayanan', ''),
(53, '2026-04-25', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'TITI PATIMAH', 'Operator Layanan Operasional', '20000720 202521 2 060', 'Staff Penerimaan dan Penagihan', ''),
(54, '2026-05-05', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'ALDO DHAMMA WIRALELANA', 'Operator Layanan Operasional', '19981212 202521 1 046', 'Staff Penerimaan dan Penagihan', ''),
(55, '2026-05-05', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'AYIP RIZA ARAFAT, SE', 'Pengolah Data dan Informasi', '19830520 200112 1 005', 'Pelayanan', ''),
(56, '2026-05-05', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'WINDI RAHAYU, S.Pd', 'Penata Layanan Operasional', '19950829 202521 2 032', 'arsip', ''),
(57, '2026-05-05', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'DARMIDI, S.Sos., M.Si', 'Kepala Sub Bagian Tata Usaha', '19730604 199303 1 004', 'Kasubag TU', ''),
(58, '2026-05-05', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'Puji Angganis', 'Pengadministrasi Perkantoran', '199504092025212030', 'Staf Kepegawaian', ''),
(59, '2026-05-05', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'Selly Apriliani, S,IP', 'Penata Layanan Operasional', '198504102025212027', 'Tata Usaha', ''),
(60, '2026-05-07', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'SITI MELISA', 'Operator Layanan Operasional', '19980324 202521 2 065', 'Staff Penerimaan dan Penagihan', ''),
(61, '2026-05-07', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'SUEB SARBINI', 'Operator Layanan Operasional', '19850427 202521 1 107', 'Samling', ''),
(62, '2026-05-08', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'INDRI MONICA, S.E.', 'Penata Layanan Operasional', '19981005 202521 2 088', 'Tata Usaha', ''),
(63, '2026-06-02', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'MAMAN FATUROHMAN, SE', 'Pengolah Data dan Informasi', '19780327 200701 1 004', 'Bendahara Penerimaan', ''),
(64, '2026-06-03', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'AYIP RIZA ARAFAT, SE', 'Pengolah Data dan Informasi', '19830520 200112 1 005', 'Pelayanan', ''),
(65, '2026-03-31', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'MAMAN FATUROHMAN, SE', 'Pengolah Data dan Informasi', '19780327 200701 1 004', 'Bendahara Penerimaan', ''),
(66, '2026-05-09', 'Amirudin, S.Sos.I', 'Penata Layanan Operasional', '198001092025211011', 'GANI PRAMUDYA', 'Operator Layanan Operasional', '19990225 202521 1 050', 'Staf Kepegawaian', '');

-- --------------------------------------------------------

--
-- Struktur dari tabel users
--

CREATE TABLE users (
  id integer NOT NULL,
  pegawai_id integer DEFAULT NULL,
  username varchar(50) NOT NULL,
  password varchar(255) NOT NULL,
  nama_lengkap varchar(100) NOT NULL,
  role text DEFAULT 'user',
  is_active smallint DEFAULT 1,
  nip varchar(50) DEFAULT NULL,
  jabatan varchar(100) DEFAULT NULL,
  email varchar(100) DEFAULT NULL,
  foto_profil varchar(255) DEFAULT 'default.png',
  no_hp varchar(20) DEFAULT NULL,
  jenis_kelamin text DEFAULT NULL,
  tanggal_lahir date DEFAULT NULL,
  alamat text DEFAULT NULL
);

--
-- Dumping data untuk tabel users
--

INSERT INTO users (id, pegawai_id, username, password, nama_lengkap, role, is_active, nip, jabatan, email, foto_profil, no_hp, jenis_kelamin, tanggal_lahir, alamat) VALUES
(7, 96, 'Fahmi98', '$2y$10$emWYmBk6y5iZZY/26MeD8u.NpL4ltL96NqRG3N8S3U3dlpnlqPGQ.', 'ATEP RAHMAN, S.E.', 'admin', 1, '19740208 201409 1 003', 'Operator Layanan Operasional', 'mfahmi0410@gmail.com', 'profil_7_1775818329.jpg', '08950506152', 'Laki-laki', '1998-10-10', 'Pabuaran RT05/RW04 Kel Unyur Kec Serang Kota Serang Provinsi Banten'),
(12, 115, 'Amirudin', '$2y$10$.vib1MhYET52T94Btm5obe23w04uwOTJT9yIp9AsuSbgG37gqOhaC', 'Amirudin, S.Sos.I', '', 1, NULL, NULL, NULL, 'default.png', NULL, NULL, NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel barang
--
ALTER TABLE barang
  ADD PRIMARY KEY (id);

--
-- Indeks untuk tabel barang_masuk
--
ALTER TABLE barang_masuk
  ADD PRIMARY KEY (id);

--
-- Indeks untuk tabel detail_barang_keluar
--
ALTER TABLE detail_barang_keluar
  ADD PRIMARY KEY (id);

--
-- Indeks untuk tabel kategori
--
ALTER TABLE kategori
  ADD PRIMARY KEY (id);

--
-- Indeks untuk tabel pegawai
--
ALTER TABLE pegawai
  ADD PRIMARY KEY (id);

--
-- Indeks untuk tabel riwayat_opname
--
ALTER TABLE riwayat_opname
  ADD PRIMARY KEY (id);

--
-- Indeks untuk tabel stok_kuasi
--
ALTER TABLE stok_kuasi
  ADD PRIMARY KEY (id);

--
-- Indeks untuk tabel transaksi_keluar
--
ALTER TABLE transaksi_keluar
  ADD PRIMARY KEY (id);

--
-- Indeks untuk tabel users
--
ALTER TABLE users
  ADD PRIMARY KEY (id),
  ADD CONSTRAINT users_username_key UNIQUE (username);
--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel barang
--


--
-- AUTO_INCREMENT untuk tabel barang_masuk
--


--
-- AUTO_INCREMENT untuk tabel detail_barang_keluar
--


--
-- AUTO_INCREMENT untuk tabel kategori
--


--
-- AUTO_INCREMENT untuk tabel pegawai
--


--
-- AUTO_INCREMENT untuk tabel riwayat_opname
--


--
-- AUTO_INCREMENT untuk tabel stok_kuasi
--


--
-- AUTO_INCREMENT untuk tabel transaksi_keluar
--


--
-- AUTO_INCREMENT untuk tabel users
--


--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel barang
--
ALTER TABLE barang
  ADD CONSTRAINT barang_ibfk_1 FOREIGN KEY (kategori_id) REFERENCES kategori (id) ON DELETE SET NULL;

--
-- Ketidakleluasaan untuk tabel barang_masuk
--
ALTER TABLE barang_masuk
  ADD CONSTRAINT barang_masuk_ibfk_1 FOREIGN KEY (barang_id) REFERENCES barang (id) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel detail_barang_keluar
--
ALTER TABLE detail_barang_keluar
  ADD CONSTRAINT detail_barang_keluar_ibfk_1 FOREIGN KEY (transaksi_keluar_id) REFERENCES transaksi_keluar (id) ON DELETE CASCADE,
  ADD CONSTRAINT detail_barang_keluar_ibfk_2 FOREIGN KEY (barang_id) REFERENCES barang (id) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel stok_kuasi
--
ALTER TABLE stok_kuasi
  ADD CONSTRAINT stok_kuasi_ibfk_1 FOREIGN KEY (barang_id) REFERENCES barang (id) ON DELETE CASCADE;

;
;
;

-- ============================================================
-- SIPB PostgreSQL / Supabase compatibility layer
-- Generated from inventory/db_inventory.sql
-- ============================================================

-- Preserve AUTO_INCREMENT behavior using PostgreSQL identity columns.
ALTER TABLE public.barang ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.barang_masuk ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.detail_barang_keluar ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.kategori ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.pegawai ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.riwayat_opname ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.stok_kuasi ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.transaksi_keluar ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
ALTER TABLE public.users ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;

-- Restore useful indexes from the original MariaDB dump.
CREATE INDEX IF NOT EXISTS idx_barang_kategori_id ON public.barang (kategori_id);
CREATE INDEX IF NOT EXISTS idx_barang_masuk_barang_id ON public.barang_masuk (barang_id);
CREATE INDEX IF NOT EXISTS idx_detail_barang_keluar_transaksi_id ON public.detail_barang_keluar (transaksi_keluar_id);
CREATE INDEX IF NOT EXISTS idx_detail_barang_keluar_barang_id ON public.detail_barang_keluar (barang_id);
CREATE INDEX IF NOT EXISTS idx_stok_kuasi_barang_id ON public.stok_kuasi (barang_id);

-- Synchronize identity sequences with imported historical IDs.
SELECT setval(pg_get_serial_sequence('public.barang','id'), COALESCE((SELECT MAX(id) FROM public.barang), 1), true);
SELECT setval(pg_get_serial_sequence('public.barang_masuk','id'), COALESCE((SELECT MAX(id) FROM public.barang_masuk), 1), true);
SELECT setval(pg_get_serial_sequence('public.detail_barang_keluar','id'), COALESCE((SELECT MAX(id) FROM public.detail_barang_keluar), 1), true);
SELECT setval(pg_get_serial_sequence('public.kategori','id'), COALESCE((SELECT MAX(id) FROM public.kategori), 1), true);
SELECT setval(pg_get_serial_sequence('public.pegawai','id'), COALESCE((SELECT MAX(id) FROM public.pegawai), 1), true);
SELECT setval(pg_get_serial_sequence('public.riwayat_opname','id'), COALESCE((SELECT MAX(id) FROM public.riwayat_opname), 1), true);
SELECT setval(pg_get_serial_sequence('public.stok_kuasi','id'), COALESCE((SELECT MAX(id) FROM public.stok_kuasi), 1), true);
SELECT setval(pg_get_serial_sequence('public.transaksi_keluar','id'), COALESCE((SELECT MAX(id) FROM public.transaksi_keluar), 1), true);
SELECT setval(pg_get_serial_sequence('public.users','id'), COALESCE((SELECT MAX(id) FROM public.users), 1), true);

-- Frontend authorization/profile mapping.
-- Password hashes from the legacy users table remain server-side data;
-- Supabase Auth will handle browser authentication.
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  legacy_user_id integer UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
  username text,
  nama_lengkap text,
  role text NOT NULL DEFAULT 'user',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_profiles FROM anon;
GRANT SELECT ON public.user_profiles TO authenticated;

DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
CREATE POLICY "user_profiles_select_own"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

-- Legacy password hashes must never be exposed through the browser API.
REVOKE ALL ON public.users FROM anon, authenticated;

-- Expose application tables only to signed-in users. More granular
-- role-based policies will be added with the application modules.
ALTER TABLE public.barang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barang_masuk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detail_barang_keluar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pegawai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riwayat_opname ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stok_kuasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi_keluar ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.barang,
  public.barang_masuk,
  public.detail_barang_keluar,
  public.kategori,
  public.pegawai,
  public.riwayat_opname,
  public.stok_kuasi,
  public.transaksi_keluar
TO authenticated;

DROP POLICY IF EXISTS "authenticated_full_access_barang" ON public.barang;
CREATE POLICY "authenticated_full_access_barang" ON public.barang FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_full_access_barang_masuk" ON public.barang_masuk;
CREATE POLICY "authenticated_full_access_barang_masuk" ON public.barang_masuk FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_full_access_detail_barang_keluar" ON public.detail_barang_keluar;
CREATE POLICY "authenticated_full_access_detail_barang_keluar" ON public.detail_barang_keluar FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_full_access_kategori" ON public.kategori;
CREATE POLICY "authenticated_full_access_kategori" ON public.kategori FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_full_access_pegawai" ON public.pegawai;
CREATE POLICY "authenticated_full_access_pegawai" ON public.pegawai FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_full_access_riwayat_opname" ON public.riwayat_opname;
CREATE POLICY "authenticated_full_access_riwayat_opname" ON public.riwayat_opname FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_full_access_stok_kuasi" ON public.stok_kuasi;
CREATE POLICY "authenticated_full_access_stok_kuasi" ON public.stok_kuasi FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_full_access_transaksi_keluar" ON public.transaksi_keluar;
CREATE POLICY "authenticated_full_access_transaksi_keluar" ON public.transaksi_keluar FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- NOTE:
-- The full-access authenticated policies are a migration-stage baseline.
-- The frontend must enforce role restrictions, and the next migration will
-- tighten these policies by role using user_profiles.
