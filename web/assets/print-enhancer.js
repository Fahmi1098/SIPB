(() => {
  const enhance = () => {
    if (!window.SIPBPrint) return;
    document.querySelectorAll('.sipb-inline-print').forEach(btn => {
      if (btn.dataset.bound) return;
      const id = Number(btn.dataset.id);
      if (!id) return;
      btn.dataset.bound = '1';
      btn.onclick = () => window.SIPBPrint.transaction(id);
    });
  };
  const obs = new MutationObserver(enhance);
  obs.observe(document.body, {childList:true, subtree:true});
  setTimeout(enhance, 300);
})();