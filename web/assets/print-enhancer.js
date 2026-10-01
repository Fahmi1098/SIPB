(() => {
  const wait = () => {
    if (!window.SIPBPrint) return;
    const table = document.querySelector('h2')?.textContent === 'Barang Keluar'
      ? document.querySelector('.page-card table')
      : null;
    if (!table || table.dataset.printEnhanced) return;
    table.dataset.printEnhanced = '1';

    (async () => {
      const cfg = window.SIPB_CONFIG;
      if (!cfg || !window.supabase) return;
      const c = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {auth:{persistSession:true}});
      const q = await c.from('transaksi_keluar').select('id').order('id',{ascending:false}).limit(200);
      if (q.error) return;
      [...table.querySelectorAll('tbody tr')].forEach((tr,i) => {
        const id = q.data?.[i]?.id;
        if (!id || tr.querySelector('.sipb-print-btn')) return;
        const td = tr.lastElementChild;
        if (!td) return;
        const b = document.createElement('button');
        b.type='button';
        b.className='btn-sm sipb-print-btn';
        b.textContent='Cetak';
        b.onclick=()=>window.SIPBPrint.transaction(Number(id));
        td.insertBefore(b,td.firstChild);
      });
    })();
  };
  const obs = new MutationObserver(wait);
  obs.observe(document.body,{childList:true,subtree:true});
  setTimeout(wait,1000);
})();