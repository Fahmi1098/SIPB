(() => {
  const enhance = () => {
    if (!window.SIPBPrint) return;
    document.querySelectorAll('.cancel-keluar').forEach(cancel => {
      const id = Number(cancel.dataset.id);
      const cell = cancel.parentElement;
      if (!id || !cell || cell.querySelector('.sipb-row-print')) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn-sm sipb-row-print';
      b.textContent = 'Cetak';
      b.onclick = () => window.SIPBPrint.transaction(id);
      cell.insertBefore(b, cancel);
    });
  };
  const obs = new MutationObserver(enhance);
  obs.observe(document.body, {childList:true, subtree:true});
  setTimeout(enhance, 800);
})();