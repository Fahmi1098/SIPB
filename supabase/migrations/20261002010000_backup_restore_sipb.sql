-- SIPB backup and restore
-- 2026-10-02
--
-- Restore intentionally covers inventory/master data only.
-- Supabase Auth accounts and passwords are never modified.

create or replace function public.restore_sipb_backup(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_required text[] := array[
    'kategori',
    'pegawai',
    'barang',
    'barang_masuk',
    'stok_kuasi',
    'transaksi_keluar',
    'detail_barang_keluar',
    'transaksi_kuasi_alokasi',
    'riwayat_opname'
  ];
  v_name text;
  v_count bigint;
begin
  if not public.sipb_is_admin() then
    raise exception 'Hanya admin yang dapat melakukan restore SIPB';
  end if;

  if coalesce(p_backup->>'format','') <> 'SIPB_BACKUP'
     or coalesce(p_backup->>'format_version','') <> '1' then
    raise exception 'Format backup SIPB tidak dikenali';
  end if;

  if jsonb_typeof(p_backup->'tables') <> 'object' then
    raise exception 'Bagian tables pada backup tidak valid';
  end if;

  foreach v_name in array v_required loop
    if jsonb_typeof(p_backup->'tables'->v_name) <> 'array' then
      raise exception 'Data tabel % tidak tersedia atau bukan array', v_name;
    end if;
  end loop;

  -- Delete in FK-safe order.
  delete from public.transaksi_kuasi_alokasi;
  delete from public.detail_barang_keluar;
  delete from public.transaksi_keluar;
  delete from public.barang_masuk;
  delete from public.riwayat_opname;
  delete from public.stok_kuasi;
  delete from public.barang;
  delete from public.kategori;
  delete from public.pegawai;

  -- Master references first.
  insert into public.kategori(id,nama_kategori)
  select x.id,x.nama_kategori
  from jsonb_to_recordset(p_backup->'tables'->'kategori')
    as x(id integer,nama_kategori text);

  insert into public.pegawai(id,nama_pegawai,nip,status_pegawai,jabatan)
  select x.id,x.nama_pegawai,x.nip,x.status_pegawai,x.jabatan
  from jsonb_to_recordset(p_backup->'tables'->'pegawai')
    as x(id integer,nama_pegawai text,nip text,status_pegawai text,jabatan text);

  insert into public.barang(
    id,kategori_id,nama_barang,tipe,merk,satuan,harga_terakhir,
    jumlah_total,terpakai,sisa,stok_minimum,kategori
  )
  select
    x.id,x.kategori_id,x.nama_barang,x.tipe,x.merk,x.satuan,
    coalesce(x.harga_terakhir,0),coalesce(x.jumlah_total,0),
    coalesce(x.terpakai,0),coalesce(x.sisa,0),coalesce(x.stok_minimum,0),
    coalesce(x.kategori,'non-kuasi')
  from jsonb_to_recordset(p_backup->'tables'->'barang')
    as x(
      id integer,
      kategori_id integer,
      nama_barang text,
      tipe text,
      merk text,
      satuan text,
      harga_terakhir numeric,
      jumlah_total integer,
      terpakai integer,
      sisa integer,
      stok_minimum integer,
      kategori text
    );

  insert into public.barang_masuk(
    id,barang_id,jumlah,harga_satuan,sumber_dana,nomor_awal,nomor_akhir,
    tanggal_masuk,nama_penyerah,nama_penerima,nomor_dus
  )
  select
    x.id,x.barang_id,x.jumlah,coalesce(x.harga_satuan,0),x.sumber_dana,
    x.nomor_awal,x.nomor_akhir,x.tanggal_masuk,x.nama_penyerah,
    x.nama_penerima,x.nomor_dus
  from jsonb_to_recordset(p_backup->'tables'->'barang_masuk')
    as x(
      id integer,
      barang_id integer,
      jumlah integer,
      harga_satuan numeric,
      sumber_dana text,
      nomor_awal text,
      nomor_akhir text,
      tanggal_masuk date,
      nama_penyerah text,
      nama_penerima text,
      nomor_dus text
    );

  insert into public.stok_kuasi(
    id,barang_id,prefix_huruf,panjang_digit,digit_awal,digit_akhir,
    digit_sekarang,sisa_lembar,tanggal_masuk,nomor_dus
  )
  select
    x.id,x.barang_id,coalesce(x.prefix_huruf,''),x.panjang_digit,
    x.digit_awal,x.digit_akhir,x.digit_sekarang,x.sisa_lembar,
    x.tanggal_masuk,x.nomor_dus
  from jsonb_to_recordset(p_backup->'tables'->'stok_kuasi')
    as x(
      id integer,
      barang_id integer,
      prefix_huruf text,
      panjang_digit integer,
      digit_awal integer,
      digit_akhir integer,
      digit_sekarang integer,
      sisa_lembar integer,
      tanggal_masuk date,
      nomor_dus text
    );

  insert into public.riwayat_opname(
    id,tanggal_opname,barang_id,stok_sistem,stok_fisik,selisih,keterangan,petugas
  )
  select
    x.id,x.tanggal_opname,x.barang_id,x.stok_sistem,x.stok_fisik,x.selisih,
    x.keterangan,x.petugas
  from jsonb_to_recordset(p_backup->'tables'->'riwayat_opname')
    as x(
      id integer,
      tanggal_opname date,
      barang_id integer,
      stok_sistem integer,
      stok_fisik integer,
      selisih integer,
      keterangan text,
      petugas text
    );

  insert into public.transaksi_keluar(
    id,tanggal_keluar,penyerah_nama,penyerah_jabatan,penyerah_nip,
    penerima_nama,penerima_jabatan,penerima_nip,tujuan_ruangan,jenis_dokumen,
    status,dibatalkan_pada,dibatalkan_oleh
  )
  select
    x.id,x.tanggal_keluar,x.penyerah_nama,x.penyerah_jabatan,x.penyerah_nip,
    x.penerima_nama,x.penerima_jabatan,x.penerima_nip,x.tujuan_ruangan,
    coalesce(x.jenis_dokumen,'Nota Dinas'),coalesce(x.status,'AKTIF'),
    x.dibatalkan_pada,x.dibatalkan_oleh
  from jsonb_to_recordset(p_backup->'tables'->'transaksi_keluar')
    as x(
      id integer,
      tanggal_keluar date,
      penyerah_nama text,
      penyerah_jabatan text,
      penyerah_nip text,
      penerima_nama text,
      penerima_jabatan text,
      penerima_nip text,
      tujuan_ruangan text,
      jenis_dokumen text,
      status text,
      dibatalkan_pada timestamptz,
      dibatalkan_oleh uuid
    );

  insert into public.detail_barang_keluar(
    id,transaksi_keluar_id,barang_id,jumlah,nomor_awal,nomor_akhir,nomor_dus
  )
  select
    x.id,x.transaksi_keluar_id,x.barang_id,x.jumlah,x.nomor_awal,
    x.nomor_akhir,x.nomor_dus
  from jsonb_to_recordset(p_backup->'tables'->'detail_barang_keluar')
    as x(
      id integer,
      transaksi_keluar_id integer,
      barang_id integer,
      jumlah integer,
      nomor_awal text,
      nomor_akhir text,
      nomor_dus text
    );

  insert into public.transaksi_kuasi_alokasi(
    id,transaksi_keluar_id,detail_barang_keluar_id,stok_kuasi_id,
    jumlah,digit_awal,digit_akhir,created_at
  )
  select
    x.id,x.transaksi_keluar_id,x.detail_barang_keluar_id,x.stok_kuasi_id,
    x.jumlah,x.digit_awal,x.digit_akhir,coalesce(x.created_at,now())
  from jsonb_to_recordset(p_backup->'tables'->'transaksi_kuasi_alokasi')
    as x(
      id bigint,
      transaksi_keluar_id integer,
      detail_barang_keluar_id integer,
      stok_kuasi_id integer,
      jumlah integer,
      digit_awal integer,
      digit_akhir integer,
      created_at timestamptz
    );

  -- Synchronize all identity sequences after explicit-ID restore.
  perform setval(pg_get_serial_sequence('public.kategori','id'),coalesce((select max(id) from public.kategori),1),(select count(*)>0 from public.kategori));
  perform setval(pg_get_serial_sequence('public.pegawai','id'),coalesce((select max(id) from public.pegawai),1),(select count(*)>0 from public.pegawai));
  perform setval(pg_get_serial_sequence('public.barang','id'),coalesce((select max(id) from public.barang),1),(select count(*)>0 from public.barang));
  perform setval(pg_get_serial_sequence('public.barang_masuk','id'),coalesce((select max(id) from public.barang_masuk),1),(select count(*)>0 from public.barang_masuk));
  perform setval(pg_get_serial_sequence('public.stok_kuasi','id'),coalesce((select max(id) from public.stok_kuasi),1),(select count(*)>0 from public.stok_kuasi));
  perform setval(pg_get_serial_sequence('public.transaksi_keluar','id'),coalesce((select max(id) from public.transaksi_keluar),1),(select count(*)>0 from public.transaksi_keluar));
  perform setval(pg_get_serial_sequence('public.detail_barang_keluar','id'),coalesce((select max(id) from public.detail_barang_keluar),1),(select count(*)>0 from public.detail_barang_keluar));
  perform setval(pg_get_serial_sequence('public.riwayat_opname','id'),coalesce((select max(id) from public.riwayat_opname),1),(select count(*)>0 from public.riwayat_opname));
  perform setval(pg_get_serial_sequence('public.transaksi_kuasi_alokasi','id'),coalesce((select max(id) from public.transaksi_kuasi_alokasi),1),(select count(*)>0 from public.transaksi_kuasi_alokasi));

  select count(*) into v_count from public.barang;

  return jsonb_build_object(
    'status','success',
    'barang_dipulihkan',v_count,
    'message','Restore SIPB berhasil.'
  );
end;
$$;

revoke all on function public.restore_sipb_backup(jsonb) from public,anon;
grant execute on function public.restore_sipb_backup(jsonb) to authenticated;
