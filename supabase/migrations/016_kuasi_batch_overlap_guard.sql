-- Prevent overlapping serial-number ranges inside the same Kuasi item.
-- This protects FIFO integrity even if a future RPC or maintenance script
-- attempts to insert an overlapping batch.

CREATE OR REPLACE FUNCTION public.guard_kuasi_batch_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.stok_kuasi sk
    WHERE sk.barang_id = NEW.barang_id
      AND COALESCE(sk.prefix_huruf, '') = COALESCE(NEW.prefix_huruf, '')
      AND sk.id IS DISTINCT FROM NEW.id
      AND NEW.digit_awal <= sk.digit_akhir
      AND NEW.digit_akhir >= sk.digit_awal
  ) THEN
    RAISE EXCEPTION
      'Rentang nomor seri Kuasi %-% bertabrakan dengan batch Kuasi yang sudah ada.',
      COALESCE(NEW.prefix_huruf,'' ) || NEW.digit_awal,
      COALESCE(NEW.prefix_huruf,'' ) || NEW.digit_akhir;
  END IF;

  IF NEW.digit_akhir < NEW.digit_awal THEN
    RAISE EXCEPTION 'Nomor akhir batch Kuasi harus lebih besar atau sama dengan nomor awal.';
  END IF;

  IF NEW.sisa_lembar < 0 THEN
    RAISE EXCEPTION 'Sisa lembar batch Kuasi tidak boleh negatif.';
  END IF;

  IF NEW.digit_sekarang < NEW.digit_awal
     OR NEW.digit_sekarang > NEW.digit_akhir + 1 THEN
    RAISE EXCEPTION 'Posisi digit batch Kuasi berada di luar rentang batch.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_kuasi_batch_overlap ON public.stok_kuasi;
CREATE TRIGGER trg_guard_kuasi_batch_overlap
BEFORE INSERT OR UPDATE ON public.stok_kuasi
FOR EACH ROW
EXECUTE FUNCTION public.guard_kuasi_batch_overlap();

REVOKE ALL ON FUNCTION public.guard_kuasi_batch_overlap() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guard_kuasi_batch_overlap() TO authenticated;
