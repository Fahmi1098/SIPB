-- Protect the special Kuasi classification from being changed after inventory history exists.
-- Prevents orphaned FIFO batches or ordinary stock being reclassified as Kuasi
-- without a corresponding batch ledger.

CREATE OR REPLACE FUNCTION public.guard_kuasi_category_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_kuasi boolean := lower(COALESCE(OLD.nama_kategori,'')) LIKE '%kuasi%';
  v_new_kuasi boolean := lower(COALESCE(NEW.nama_kategori,'')) LIKE '%kuasi%';
  v_used boolean;
BEGIN
  IF v_old_kuasi = v_new_kuasi THEN RETURN NEW; END IF;
  SELECT EXISTS (SELECT 1 FROM public.barang b WHERE b.kategori_id = OLD.id) INTO v_used;
  IF v_used THEN
    RAISE EXCEPTION 'Klasifikasi Kuasi tidak boleh diubah karena kategori masih digunakan oleh barang. Buat kategori baru untuk klasifikasi berbeda.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_kuasi_category_transition ON public.kategori;
CREATE TRIGGER trg_guard_kuasi_category_transition
BEFORE UPDATE OF nama_kategori ON public.kategori
FOR EACH ROW EXECUTE FUNCTION public.guard_kuasi_category_transition();

CREATE OR REPLACE FUNCTION public.guard_kuasi_barang_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_kuasi boolean;
  v_new_kuasi boolean;
  v_has_history boolean;
BEGIN
  IF NEW.kategori_id IS NOT DISTINCT FROM OLD.kategori_id THEN RETURN NEW; END IF;

  SELECT lower(COALESCE(k.nama_kategori,'')) LIKE '%kuasi%' INTO v_old_kuasi
  FROM public.kategori k WHERE k.id = OLD.kategori_id;
  SELECT lower(COALESCE(k.nama_kategori,'')) LIKE '%kuasi%' INTO v_new_kuasi
  FROM public.kategori k WHERE k.id = NEW.kategori_id;

  v_old_kuasi := COALESCE(v_old_kuasi,false);
  v_new_kuasi := COALESCE(v_new_kuasi,false);
  IF v_old_kuasi = v_new_kuasi THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.barang_masuk bm WHERE bm.barang_id = OLD.id
    UNION ALL SELECT 1 FROM public.detail_barang_keluar dk WHERE dk.barang_id = OLD.id
    UNION ALL SELECT 1 FROM public.riwayat_opname ro WHERE ro.barang_id = OLD.id
    UNION ALL SELECT 1 FROM public.stok_kuasi sk WHERE sk.barang_id = OLD.id
  ) OR COALESCE(OLD.jumlah_total,0) <> 0
    OR COALESCE(OLD.terpakai,0) <> 0
    OR COALESCE(OLD.sisa,0) <> 0
  INTO v_has_history;

  IF v_has_history THEN
    RAISE EXCEPTION 'Klasifikasi Kuasi barang tidak boleh diubah setelah barang memiliki stok atau riwayat transaksi. Buat master barang baru untuk klasifikasi berbeda.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_kuasi_barang_transition ON public.barang;
CREATE TRIGGER trg_guard_kuasi_barang_transition
BEFORE UPDATE OF kategori_id ON public.barang
FOR EACH ROW EXECUTE FUNCTION public.guard_kuasi_barang_transition();

REVOKE ALL ON FUNCTION public.guard_kuasi_category_transition() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guard_kuasi_category_transition() TO authenticated;
REVOKE ALL ON FUNCTION public.guard_kuasi_barang_transition() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guard_kuasi_barang_transition() TO authenticated;
