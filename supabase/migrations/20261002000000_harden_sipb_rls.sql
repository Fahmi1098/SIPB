-- SIPB database hardening
-- 2026-10-02

create or replace function public.sipb_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid()
      and role = 'admin'
      and coalesce(is_active,true) = true
  );
$$;

revoke all on function public.sipb_is_admin() from public, anon;
grant execute on function public.sipb_is_admin() to authenticated;

do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename in ('user_profiles','kategori','barang','pegawai','barang_masuk','transaksi_keluar','detail_barang_keluar','riwayat_opname','stok_kuasi')
  loop
    execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename);
  end loop;
end $$;

alter table public.user_profiles enable row level security;
alter table public.kategori enable row level security;
alter table public.barang enable row level security;
alter table public.pegawai enable row level security;
alter table public.barang_masuk enable row level security;
alter table public.transaksi_keluar enable row level security;
alter table public.detail_barang_keluar enable row level security;
alter table public.riwayat_opname enable row level security;
alter table public.stok_kuasi enable row level security;

revoke all on table public.user_profiles,public.kategori,public.barang,public.pegawai,public.barang_masuk,public.transaksi_keluar,public.detail_barang_keluar,public.riwayat_opname,public.stok_kuasi from anon,public;

grant select on table public.user_profiles,public.kategori,public.barang,public.pegawai,public.barang_masuk,public.transaksi_keluar,public.detail_barang_keluar,public.riwayat_opname,public.stok_kuasi to authenticated;
grant insert,update,delete on table public.kategori,public.barang,public.pegawai to authenticated;
grant update on table public.user_profiles to authenticated;

create policy sipb_user_profiles_select on public.user_profiles for select to authenticated
using (auth.uid()=id or public.sipb_is_admin());

create policy sipb_user_profiles_admin_update on public.user_profiles for update to authenticated
using (public.sipb_is_admin()) with check (public.sipb_is_admin());

create policy sipb_kategori_select on public.kategori for select to authenticated using (true);
create policy sipb_kategori_admin_insert on public.kategori for insert to authenticated with check (public.sipb_is_admin());
create policy sipb_kategori_admin_update on public.kategori for update to authenticated using (public.sipb_is_admin()) with check (public.sipb_is_admin());
create policy sipb_kategori_admin_delete on public.kategori for delete to authenticated using (public.sipb_is_admin());

create policy sipb_barang_select on public.barang for select to authenticated using (true);
create policy sipb_barang_admin_insert on public.barang for insert to authenticated with check (public.sipb_is_admin());
create policy sipb_barang_admin_update on public.barang for update to authenticated using (public.sipb_is_admin()) with check (public.sipb_is_admin());
create policy sipb_barang_admin_delete on public.barang for delete to authenticated using (public.sipb_is_admin());

create policy sipb_pegawai_select on public.pegawai for select to authenticated using (true);
create policy sipb_pegawai_admin_insert on public.pegawai for insert to authenticated with check (public.sipb_is_admin());
create policy sipb_pegawai_admin_update on public.pegawai for update to authenticated using (public.sipb_is_admin()) with check (public.sipb_is_admin());
create policy sipb_pegawai_admin_delete on public.pegawai for delete to authenticated using (public.sipb_is_admin());

create policy sipb_barang_masuk_select on public.barang_masuk for select to authenticated using (true);
create policy sipb_transaksi_keluar_select on public.transaksi_keluar for select to authenticated using (true);
create policy sipb_detail_barang_keluar_select on public.detail_barang_keluar for select to authenticated using (true);
create policy sipb_riwayat_opname_select on public.riwayat_opname for select to authenticated using (true);
create policy sipb_stok_kuasi_select on public.stok_kuasi for select to authenticated using (true);

create or replace function public.sipb_guard_admin_profile()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if old.role='admin' and coalesce(old.is_active,true)=true
     and (new.role is distinct from 'admin' or coalesce(new.is_active,true)=false)
  then
    if not exists (
      select 1 from public.user_profiles u
      where u.id<>old.id and u.role='admin' and coalesce(u.is_active,true)=true
    ) then
      raise exception 'SIPB: minimal satu admin aktif harus tetap tersedia';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sipb_guard_admin_profile on public.user_profiles;
create trigger trg_sipb_guard_admin_profile
before update on public.user_profiles
for each row execute function public.sipb_guard_admin_profile();

create or replace function public.sipb_guard_barang_delete()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if exists (select 1 from public.detail_barang_keluar d where d.barang_id=old.id) then
    raise exception 'SIPB: barang tidak dapat dihapus karena sudah memiliki riwayat barang keluar';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_sipb_guard_barang_delete on public.barang;
create trigger trg_sipb_guard_barang_delete
before delete on public.barang
for each row execute function public.sipb_guard_barang_delete();

create or replace function public.sipb_guard_outgoing_mutation()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.sipb_is_admin() then
    if tg_op='DELETE' then
      raise exception 'SIPB: hanya admin yang dapat menghapus transaksi barang keluar';
    elsif tg_op='UPDATE' and old.status is distinct from new.status and new.status='DIBATALKAN' then
      raise exception 'SIPB: hanya admin yang dapat membatalkan transaksi barang keluar';
    end if;
  end if;
  return coalesce(new,old);
end;
$$;

drop trigger if exists trg_sipb_guard_outgoing_mutation on public.transaksi_keluar;
create trigger trg_sipb_guard_outgoing_mutation
before update or delete on public.transaksi_keluar
for each row execute function public.sipb_guard_outgoing_mutation();

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in ('record_barang_masuk','record_barang_keluar','record_stock_opname','cancel_barang_keluar','delete_cancelled_barang_keluar','manage_user_profile','delete_barang_if_no_outgoing')
  loop
    execute format('revoke execute on function %s from public,anon',r.sig);
    execute format('grant execute on function %s to authenticated',r.sig);
  end loop;
end $$;
