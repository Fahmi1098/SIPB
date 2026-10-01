-- Migration 017: deterministic lock order for multi-item outgoing transactions
-- Prevent concurrent Barang Keluar calls from acquiring barang locks in different orders.

CREATE OR REPLACE FUNCTION public.record_barang_keluar(
  p_tanggal date, p_penyerah_nama text, p_penyerah_jabatan text, p_penyerah_nip text,
  p_penerima_nama text, p_penerima_jabatan text, p_penerima_nip text,
  p_tujuan_ruangan text, p_jenis_dokumen text, p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  v_tx_id integer;
  v_detail_id integer;
  v_barang_id integer;
  v_total integer;
  v_stock integer;
  v_kategori text;
  v_batch record;
  v_take integer;
  v_start integer;
  v_end integer;
  v_prefix text;
  v_pad integer;
  v_awal text;
  v_akhir text;
  v_dus text;
BEGIN
  IF NOT public.sipb_is_active_user() THEN
    RAISE EXCEPTION 'Akun SIPB tidak aktif';
  END IF;

  IF p_tanggal IS NULL THEN
    RAISE EXCEPTION 'Tanggal transaksi wajib diisi';
  END IF;

  IF COALESCE(trim(p_penyerah_nama),'')='' THEN
    RAISE EXCEPTION 'Penyerah wajib diisi';
  END IF;

  IF COALESCE(trim(p_penerima_nama),'')='' THEN
    RAISE EXCEPTION 'Penerima wajib diisi';
  END IF;

  IF COALESCE(trim(p_tujuan_ruangan),'')='' THEN
    RAISE EXCEPTION 'Tujuan ruangan wajib diisi';
  END IF;

  IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 THEN
    RAISE EXCEPTION 'Minimal satu barang harus dipilih';
  END IF;

  -- Validate each raw item before aggregation.
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS x
    WHERE NULLIF(trim(x->>'barang_id'),'') IS NULL
       OR NULLIF(trim(x->>'jumlah'),'') IS NULL
       OR (x->>'barang_id') !~ '^[0-9]+  FOR v_barang_id,v_total IN
    SELECT (x->>'barang_id')::integer,SUM((x->>'jumlah')::integer)
    FROM jsonb_array_elements(p_items)x
    GROUP BY (x->>'barang_id')::integer
    ORDER BY 1
  LOOP
    IF v_barang_id IS NULL OR v_total<1 THEN
      RAISE EXCEPTION 'Barang dan jumlah harus valid';
    END IF;

    SELECT b.sisa,k.nama_kategori INTO v_stock,v_kategori
    FROM public.barang b
    LEFT JOIN public.kategori k ON k.id=b.kategori_id
    WHERE b.id=v_barang_id
    FOR UPDATE OF b;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Barang ID % tidak ditemukan',v_barang_id;
    END IF;

    IF v_total>COALESCE(v_stock,0) THEN
      RAISE EXCEPTION 'Stok barang ID % tidak mencukupi. Sisa %, diminta %',
        v_barang_id,COALESCE(v_stock,0),v_total;
    END IF;

    IF lower(COALESCE(v_kategori,'')) LIKE '%kuasi%' THEN
      IF (SELECT COALESCE(SUM(sisa_lembar),0) FROM public.stok_kuasi
          WHERE barang_id=v_barang_id AND sisa_lembar>0)<v_total THEN
        RAISE EXCEPTION 'Batch Kuasi untuk barang ID % tidak mencukupi',v_barang_id;
      END IF;
    END IF;
  END LOOP;

  INSERT INTO public.transaksi_keluar(
    tanggal_keluar,penyerah_nama,penyerah_jabatan,penyerah_nip,
    penerima_nama,penerima_jabatan,penerima_nip,tujuan_ruangan,jenis_dokumen,status
  )
  VALUES(
    p_tanggal,p_penyerah_nama,p_penyerah_jabatan,p_penyerah_nip,
    p_penerima_nama,p_penerima_jabatan,p_penerima_nip,p_tujuan_ruangan,
    COALESCE(NULLIF(trim(p_jenis_dokumen),''),'Nota Dinas'),'AKTIF'
  )
  RETURNING id INTO v_tx_id;

  FOR v_barang_id,v_total IN
    SELECT (x->>'barang_id')::integer,SUM((x->>'jumlah')::integer)
    FROM jsonb_array_elements(p_items)x
    GROUP BY (x->>'barang_id')::integer
    ORDER BY 1
  LOOP
    SELECT k.nama_kategori INTO v_kategori
    FROM public.barang b
    LEFT JOIN public.kategori k ON k.id=b.kategori_id
    WHERE b.id=v_barang_id
    FOR UPDATE OF b;

    IF lower(COALESCE(v_kategori,'')) LIKE '%kuasi%' THEN
      FOR v_batch IN
        SELECT * FROM public.stok_kuasi
        WHERE barang_id=v_barang_id AND sisa_lembar>0
        ORDER BY tanggal_masuk,id FOR UPDATE
      LOOP
        EXIT WHEN v_total<=0;
        v_take:=LEAST(v_total,v_batch.sisa_lembar);
        v_start:=v_batch.digit_sekarang;
        v_end:=v_start+v_take-1;
        v_prefix:=COALESCE(v_batch.prefix_huruf,'');
        v_pad:=COALESCE(v_batch.panjang_digit,0);
        v_awal:=v_prefix||lpad(v_start::text,v_pad,'0');
        v_akhir:=v_prefix||lpad(v_end::text,v_pad,'0');

        INSERT INTO public.detail_barang_keluar(
          transaksi_keluar_id,barang_id,jumlah,nomor_awal,nomor_akhir,nomor_dus
        )
        VALUES(v_tx_id,v_barang_id,v_take,v_awal,v_akhir,v_batch.nomor_dus)
        RETURNING id INTO v_detail_id;

        INSERT INTO public.transaksi_kuasi_alokasi(
          transaksi_keluar_id,detail_barang_keluar_id,stok_kuasi_id,
          jumlah,digit_awal,digit_akhir
        )
        VALUES(v_tx_id,v_detail_id,v_batch.id,v_take,v_start,v_end);

        UPDATE public.stok_kuasi
        SET digit_sekarang=v_end+1,sisa_lembar=sisa_lembar-v_take
        WHERE id=v_batch.id;

        v_total:=v_total-v_take;
      END LOOP;
    ELSE
      INSERT INTO public.detail_barang_keluar(transaksi_keluar_id,barang_id,jumlah)
      VALUES(v_tx_id,v_barang_id,v_total);
      v_total:=0;
    END IF;

    IF v_total>0 THEN
      RAISE EXCEPTION 'Stok Kuasi tidak mencukupi';
    END IF;
  END LOOP;

  UPDATE public.barang b
  SET terpakai=COALESCE(b.terpakai,0)+x.jumlah,
      sisa=COALESCE(b.sisa,0)-x.jumlah
  FROM (
    SELECT (j->>'barang_id')::integer id,SUM((j->>'jumlah')::integer) jumlah
    FROM jsonb_array_elements(p_items)j
    GROUP BY (j->>'barang_id')::integer
  )x
  WHERE b.id=x.id;

  RETURN jsonb_build_object('id',v_tx_id,'status','success');
END;
$$;

REVOKE ALL ON FUNCTION public.record_barang_keluar(date,text,text,text,text,text,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_barang_keluar(date,text,text,text,text,text,text,text,text,jsonb) TO authenticated
       OR (x->>'jumlah') !~ '^[0-9]+  FOR v_barang_id,v_total IN
    SELECT (x->>'barang_id')::integer,SUM((x->>'jumlah')::integer)
    FROM jsonb_array_elements(p_items)x
    GROUP BY (x->>'barang_id')::integer
    ORDER BY 1
  LOOP
    IF v_barang_id IS NULL OR v_total<1 THEN
      RAISE EXCEPTION 'Barang dan jumlah harus valid';
    END IF;

    SELECT b.sisa,k.nama_kategori INTO v_stock,v_kategori
    FROM public.barang b
    LEFT JOIN public.kategori k ON k.id=b.kategori_id
    WHERE b.id=v_barang_id
    FOR UPDATE OF b;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Barang ID % tidak ditemukan',v_barang_id;
    END IF;

    IF v_total>COALESCE(v_stock,0) THEN
      RAISE EXCEPTION 'Stok barang ID % tidak mencukupi. Sisa %, diminta %',
        v_barang_id,COALESCE(v_stock,0),v_total;
    END IF;

    IF lower(COALESCE(v_kategori,'')) LIKE '%kuasi%' THEN
      IF (SELECT COALESCE(SUM(sisa_lembar),0) FROM public.stok_kuasi
          WHERE barang_id=v_barang_id AND sisa_lembar>0)<v_total THEN
        RAISE EXCEPTION 'Batch Kuasi untuk barang ID % tidak mencukupi',v_barang_id;
      END IF;
    END IF;
  END LOOP;

  INSERT INTO public.transaksi_keluar(
    tanggal_keluar,penyerah_nama,penyerah_jabatan,penyerah_nip,
    penerima_nama,penerima_jabatan,penerima_nip,tujuan_ruangan,jenis_dokumen,status
  )
  VALUES(
    p_tanggal,p_penyerah_nama,p_penyerah_jabatan,p_penyerah_nip,
    p_penerima_nama,p_penerima_jabatan,p_penerima_nip,p_tujuan_ruangan,
    COALESCE(NULLIF(trim(p_jenis_dokumen),''),'Nota Dinas'),'AKTIF'
  )
  RETURNING id INTO v_tx_id;

  FOR v_barang_id,v_total IN
    SELECT (x->>'barang_id')::integer,SUM((x->>'jumlah')::integer)
    FROM jsonb_array_elements(p_items)x
    GROUP BY (x->>'barang_id')::integer
    ORDER BY 1
  LOOP
    SELECT k.nama_kategori INTO v_kategori
    FROM public.barang b
    LEFT JOIN public.kategori k ON k.id=b.kategori_id
    WHERE b.id=v_barang_id
    FOR UPDATE OF b;

    IF lower(COALESCE(v_kategori,'')) LIKE '%kuasi%' THEN
      FOR v_batch IN
        SELECT * FROM public.stok_kuasi
        WHERE barang_id=v_barang_id AND sisa_lembar>0
        ORDER BY tanggal_masuk,id FOR UPDATE
      LOOP
        EXIT WHEN v_total<=0;
        v_take:=LEAST(v_total,v_batch.sisa_lembar);
        v_start:=v_batch.digit_sekarang;
        v_end:=v_start+v_take-1;
        v_prefix:=COALESCE(v_batch.prefix_huruf,'');
        v_pad:=COALESCE(v_batch.panjang_digit,0);
        v_awal:=v_prefix||lpad(v_start::text,v_pad,'0');
        v_akhir:=v_prefix||lpad(v_end::text,v_pad,'0');

        INSERT INTO public.detail_barang_keluar(
          transaksi_keluar_id,barang_id,jumlah,nomor_awal,nomor_akhir,nomor_dus
        )
        VALUES(v_tx_id,v_barang_id,v_take,v_awal,v_akhir,v_batch.nomor_dus)
        RETURNING id INTO v_detail_id;

        INSERT INTO public.transaksi_kuasi_alokasi(
          transaksi_keluar_id,detail_barang_keluar_id,stok_kuasi_id,
          jumlah,digit_awal,digit_akhir
        )
        VALUES(v_tx_id,v_detail_id,v_batch.id,v_take,v_start,v_end);

        UPDATE public.stok_kuasi
        SET digit_sekarang=v_end+1,sisa_lembar=sisa_lembar-v_take
        WHERE id=v_batch.id;

        v_total:=v_total-v_take;
      END LOOP;
    ELSE
      INSERT INTO public.detail_barang_keluar(transaksi_keluar_id,barang_id,jumlah)
      VALUES(v_tx_id,v_barang_id,v_total);
      v_total:=0;
    END IF;

    IF v_total>0 THEN
      RAISE EXCEPTION 'Stok Kuasi tidak mencukupi';
    END IF;
  END LOOP;

  UPDATE public.barang b
  SET terpakai=COALESCE(b.terpakai,0)+x.jumlah,
      sisa=COALESCE(b.sisa,0)-x.jumlah
  FROM (
    SELECT (j->>'barang_id')::integer id,SUM((j->>'jumlah')::integer) jumlah
    FROM jsonb_array_elements(p_items)j
    GROUP BY (j->>'barang_id')::integer
  )x
  WHERE b.id=x.id;

  RETURN jsonb_build_object('id',v_tx_id,'status','success');
END;
$$;

REVOKE ALL ON FUNCTION public.record_barang_keluar(date,text,text,text,text,text,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_barang_keluar(date,text,text,text,text,text,text,text,text,jsonb) TO authenticated
       OR (x->>'barang_id')::bigint < 1
       OR (x->>'jumlah')::bigint < 1
       OR (x->>'jumlah')::bigint > 2147483647
  ) THEN
    RAISE EXCEPTION 'Setiap item harus memiliki barang_id dan jumlah bilangan bulat positif.';
  END IF;

  FOR v_barang_id,v_total IN
    SELECT (x->>'barang_id')::integer,SUM((x->>'jumlah')::integer)
    FROM jsonb_array_elements(p_items)x
    GROUP BY (x->>'barang_id')::integer
    ORDER BY 1
  LOOP
    IF v_barang_id IS NULL OR v_total<1 THEN
      RAISE EXCEPTION 'Barang dan jumlah harus valid';
    END IF;

    SELECT b.sisa,k.nama_kategori INTO v_stock,v_kategori
    FROM public.barang b
    LEFT JOIN public.kategori k ON k.id=b.kategori_id
    WHERE b.id=v_barang_id
    FOR UPDATE OF b;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Barang ID % tidak ditemukan',v_barang_id;
    END IF;

    IF v_total>COALESCE(v_stock,0) THEN
      RAISE EXCEPTION 'Stok barang ID % tidak mencukupi. Sisa %, diminta %',
        v_barang_id,COALESCE(v_stock,0),v_total;
    END IF;

    IF lower(COALESCE(v_kategori,'')) LIKE '%kuasi%' THEN
      IF (SELECT COALESCE(SUM(sisa_lembar),0) FROM public.stok_kuasi
          WHERE barang_id=v_barang_id AND sisa_lembar>0)<v_total THEN
        RAISE EXCEPTION 'Batch Kuasi untuk barang ID % tidak mencukupi',v_barang_id;
      END IF;
    END IF;
  END LOOP;

  INSERT INTO public.transaksi_keluar(
    tanggal_keluar,penyerah_nama,penyerah_jabatan,penyerah_nip,
    penerima_nama,penerima_jabatan,penerima_nip,tujuan_ruangan,jenis_dokumen,status
  )
  VALUES(
    p_tanggal,p_penyerah_nama,p_penyerah_jabatan,p_penyerah_nip,
    p_penerima_nama,p_penerima_jabatan,p_penerima_nip,p_tujuan_ruangan,
    COALESCE(NULLIF(trim(p_jenis_dokumen),''),'Nota Dinas'),'AKTIF'
  )
  RETURNING id INTO v_tx_id;

  FOR v_barang_id,v_total IN
    SELECT (x->>'barang_id')::integer,SUM((x->>'jumlah')::integer)
    FROM jsonb_array_elements(p_items)x
    GROUP BY (x->>'barang_id')::integer
    ORDER BY 1
  LOOP
    SELECT k.nama_kategori INTO v_kategori
    FROM public.barang b
    LEFT JOIN public.kategori k ON k.id=b.kategori_id
    WHERE b.id=v_barang_id
    FOR UPDATE OF b;

    IF lower(COALESCE(v_kategori,'')) LIKE '%kuasi%' THEN
      FOR v_batch IN
        SELECT * FROM public.stok_kuasi
        WHERE barang_id=v_barang_id AND sisa_lembar>0
        ORDER BY tanggal_masuk,id FOR UPDATE
      LOOP
        EXIT WHEN v_total<=0;
        v_take:=LEAST(v_total,v_batch.sisa_lembar);
        v_start:=v_batch.digit_sekarang;
        v_end:=v_start+v_take-1;
        v_prefix:=COALESCE(v_batch.prefix_huruf,'');
        v_pad:=COALESCE(v_batch.panjang_digit,0);
        v_awal:=v_prefix||lpad(v_start::text,v_pad,'0');
        v_akhir:=v_prefix||lpad(v_end::text,v_pad,'0');

        INSERT INTO public.detail_barang_keluar(
          transaksi_keluar_id,barang_id,jumlah,nomor_awal,nomor_akhir,nomor_dus
        )
        VALUES(v_tx_id,v_barang_id,v_take,v_awal,v_akhir,v_batch.nomor_dus)
        RETURNING id INTO v_detail_id;

        INSERT INTO public.transaksi_kuasi_alokasi(
          transaksi_keluar_id,detail_barang_keluar_id,stok_kuasi_id,
          jumlah,digit_awal,digit_akhir
        )
        VALUES(v_tx_id,v_detail_id,v_batch.id,v_take,v_start,v_end);

        UPDATE public.stok_kuasi
        SET digit_sekarang=v_end+1,sisa_lembar=sisa_lembar-v_take
        WHERE id=v_batch.id;

        v_total:=v_total-v_take;
      END LOOP;
    ELSE
      INSERT INTO public.detail_barang_keluar(transaksi_keluar_id,barang_id,jumlah)
      VALUES(v_tx_id,v_barang_id,v_total);
      v_total:=0;
    END IF;

    IF v_total>0 THEN
      RAISE EXCEPTION 'Stok Kuasi tidak mencukupi';
    END IF;
  END LOOP;

  UPDATE public.barang b
  SET terpakai=COALESCE(b.terpakai,0)+x.jumlah,
      sisa=COALESCE(b.sisa,0)-x.jumlah
  FROM (
    SELECT (j->>'barang_id')::integer id,SUM((j->>'jumlah')::integer) jumlah
    FROM jsonb_array_elements(p_items)j
    GROUP BY (j->>'barang_id')::integer
  )x
  WHERE b.id=x.id;

  RETURN jsonb_build_object('id',v_tx_id,'status','success');
END;
$$;

REVOKE ALL ON FUNCTION public.record_barang_keluar(date,text,text,text,text,text,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_barang_keluar(date,text,text,text,text,text,text,text,text,jsonb) TO authenticated