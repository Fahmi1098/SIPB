-- SIPB pre-import integrity guard.
-- Normalize Kode Barang for uniqueness across every input path (manual, import and RPC).
-- This migration stops without changing the index if existing normalized duplicates are found.
BEGIN;

DO $$
DECLARE
  v_duplicates text;
BEGIN
  SELECT string_agg(
           format('kode "%s" pada ID %s', duplicate_code, ids),
           '; ' ORDER BY duplicate_code
         )
    INTO v_duplicates
  FROM (
    SELECT lower(btrim(kode_barang)) AS duplicate_code,
           string_agg(id::text, ', ' ORDER BY id) AS ids
    FROM public.barang
    WHERE NULLIF(btrim(kode_barang), '') IS NOT NULL
    GROUP BY lower(btrim(kode_barang))
    HAVING count(*) > 1
  ) d;

  IF v_duplicates IS NOT NULL THEN
    RAISE EXCEPTION
      'Indeks unik Kode Barang belum dapat diterapkan. Perbaiki kode duplikat terlebih dahulu: %',
      v_duplicates;
  END IF;
END;
$$;

DROP INDEX IF EXISTS public.uq_barang_kode_barang;

CREATE UNIQUE INDEX uq_barang_kode_barang
  ON public.barang (lower(btrim(kode_barang)))
  WHERE NULLIF(btrim(kode_barang), '') IS NOT NULL;

COMMENT ON INDEX public.uq_barang_kode_barang IS
  'Menjamin Kode Barang unik tanpa membedakan huruf besar/kecil dan mengabaikan spasi di awal/akhir.';

COMMIT;
