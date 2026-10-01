-- SIPB data-integrity constraints.
-- Keep the stock summary mathematically consistent even if an admin
-- performs a direct table update through the API.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='barang_stock_values_nonnegative'
      AND conrelid='public.barang'::regclass
  ) THEN
    ALTER TABLE public.barang
      ADD CONSTRAINT barang_stock_values_nonnegative
      CHECK (
        COALESCE(jumlah_total,0) >= 0
        AND COALESCE(terpakai,0) >= 0
        AND COALESCE(sisa,0) >= 0
        AND COALESCE(stok_minimum,0) >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='barang_stock_balance_check'
      AND conrelid='public.barang'::regclass
  ) THEN
    ALTER TABLE public.barang
      ADD CONSTRAINT barang_stock_balance_check
      CHECK (
        COALESCE(sisa,0) + COALESCE(terpakai,0) = COALESCE(jumlah_total,0)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='stok_kuasi_values_nonnegative'
      AND conrelid='public.stok_kuasi'::regclass
  ) THEN
    ALTER TABLE public.stok_kuasi
      ADD CONSTRAINT stok_kuasi_values_nonnegative
      CHECK (
        COALESCE(digit_awal,0) >= 0
        AND COALESCE(digit_akhir,0) >= COALESCE(digit_awal,0)
        AND COALESCE(digit_sekarang,0) >= COALESCE(digit_awal,0)
        AND COALESCE(digit_sekarang,0) <= COALESCE(digit_akhir,0) + 1
        AND COALESCE(sisa_lembar,0) >= 0
        AND COALESCE(sisa_lembar,0) <= (COALESCE(digit_akhir,0) - COALESCE(digit_awal,0) + 1)
      );
  END IF;
END $$;
