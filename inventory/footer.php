<?php require_once __DIR__ . '/functions.php'; ?>
        </main>
        <footer class="footer d-flex flex-wrap justify-content-between gap-2"><span>© <?= date('Y'); ?> UPTD Pengelolaan Pendapatan Daerah Malingping</span><span>SIPB · v2.1 · Sistem Informasi Persediaan Barang</span></footer>
    </div>
</div>
<div class="modal fade" id="logoutModal" tabindex="-1" aria-labelledby="logoutModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered"><div class="modal-content border-0 shadow-lg" style="border-radius:18px;overflow:hidden"><div class="modal-header text-white" style="background:linear-gradient(135deg,#0b5cab,#083f77)"><h5 class="modal-title fw-bold" id="logoutModalLabel"><i class="fa-solid fa-right-from-bracket me-2"></i>Konfirmasi Keluar</h5><button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div><div class="modal-body text-center py-5"><div class="mb-3"><i class="fa-solid fa-circle-question text-warning" style="font-size:4rem"></i></div><h4 class="fw-bold">Akhiri sesi Anda?</h4><p class="text-muted mb-0">Pastikan semua transaksi sudah tersimpan sebelum keluar.</p></div><div class="modal-footer justify-content-center bg-light border-0"><button type="button" class="btn btn-light px-4" data-bs-dismiss="modal">Batal</button><form method="POST" action="logout.php" class="d-inline"><?= csrf_field(); ?><button type="submit" class="btn btn-danger px-4">Ya, Keluar</button></form></div></div></div>
</div>
<script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
<script src="https://cdn.datatables.net/responsive/2.5.0/js/dataTables.responsive.min.js"></script>
<script src="https://cdn.datatables.net/responsive/2.5.0/js/responsive.bootstrap5.min.js"></script>
<script>
(function(){
 const sidebar=document.getElementById('sidebar'), overlay=document.getElementById('mobileOverlay'), menu=document.getElementById('mobileMenu');
 function toggle(){sidebar.classList.toggle('show');overlay.classList.toggle('show');}
 if(menu) menu.addEventListener('click',toggle); if(overlay) overlay.addEventListener('click',toggle);
 if(window.jQuery && $('.tabel-data').length){$('.tabel-data').DataTable({language:{url:'//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json'},pageLength:10,lengthMenu:[[5,10,25,50,-1],[5,10,25,50,'Semua']],responsive:true,ordering:true,columnDefs:[{orderable:false,targets:0},{orderable:false,targets:-1}]});}
})();
</script>
</body></html>
