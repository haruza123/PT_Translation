(function () {
  // === KONFIGURASI KEAMANAN ===
  const CONFIG = {
    preventScreenshot: false, // Ubah ke false untuk mematikan fitur anti-screenshot
    preventRightClick: true  // Fitur matikan klik kanan pada gambar
  };

  const dialogs = [
    "Hei, gambarnya jangan didownload ya! - {name}",
    "Dilarang save as manis~ - {name}",
    "Udah gratis baca, masa minta dibawa pulang juga? - {name}",
    "Dilihat boleh, didownload jangan! - {name}",
    "Ups, klik kanan dilarang ya di sini! - {name}",
    "Support translatornya dengan baca aja ya. - {name}"
  ];

  let translators = [];

  fetch('data/manga.json')
    .then(res => res.json())
    .then(data => {
      if (data && data.translators) {
        translators = data.translators;
      }
    })
    .catch(err => console.error('Gagal memuat translator', err));

  document.addEventListener('contextmenu', function (e) {
    if (!CONFIG.preventRightClick) return;
    if (e.target.tagName.toLowerCase() === 'img') {
      e.preventDefault();

      let tlName = "Prajurit Translation";
      if (translators.length > 0) {
        const randTl = translators[Math.floor(Math.random() * translators.length)];
        tlName = randTl.name;
      }

      const randomDialog = dialogs[Math.floor(Math.random() * dialogs.length)].replace("{name}", tlName);
      alert(randomDialog);
    }
  });

  // Prevent drag default for images to avoid downloading by drag-and-drop
  document.addEventListener('dragstart', function (e) {
    if (!CONFIG.preventRightClick) return;
    if (e.target.tagName.toLowerCase() === 'img') {
      e.preventDefault();
    }
  });

  // ======================================
  // FITUR ANTI SCREENSHOT (Aggressive)
  // ======================================
  if (CONFIG.preventScreenshot) {
    let overlay = null;

    function createOverlay() {
      if (overlay) return;
      overlay = document.createElement('div');
      // Menghilangkan 'transition:opacity' agar perubahan 100% instan (0 milidetik jeda)
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background-color:black;z-index:9999999;display:flex;flex-direction:column;justify-content:center;align-items:center;color:red;opacity:0;pointer-events:none;box-sizing:border-box;padding:20px;text-align:center;font-family:sans-serif;';
      overlay.innerHTML = `
        <h1 style="font-size: clamp(2rem, 5vw, 4rem); font-weight: 900; text-transform: uppercase; margin-bottom: 20px; text-shadow: 2px 2px 4px rgba(255,0,0,0.5);">PERINGATAN KERAS!</h1>
        <p style="font-size: clamp(1rem, 3vw, 1.5rem); color: white; margin-bottom: 10px;">Sistem mendeteksi percobaan screenshot atau perekaman layar.</p>
        <p style="font-size: clamp(0.9rem, 2vw, 1.2rem); color: #ccc;">Aktivitas ini dilarang keras untuk melindungi hak cipta translator!</p>
      `;
      document.body.appendChild(overlay);
    }

    function showAggressiveOverlay() {
      if (!overlay && document.body) createOverlay();
      if (overlay) {
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'all';
      }
    }

    function stealthHide() {
      // Hanya menghitamkan/menyembunyikan konten web tanpa memunculkan error mencolok
      document.documentElement.style.opacity = '0';
    }

    function recoverScreen() {
      if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
      }
      document.documentElement.style.opacity = '1';
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createOverlay);
    } else {
      createOverlay();
    }

    // Menggunakan opsi { capture: true } agar event ditangkap paling awal sebelum event lain
    document.addEventListener('keydown', (e) => {
      if (e.key === 'PrintScreen' || e.key === 'Meta' || e.metaKey || e.key === 'OS') {
        showAggressiveOverlay(); // Munculkan peringatan keras untuk tombol screenshot
      }
      
      if (e.ctrlKey && (e.key === 's' || e.key === 'p' || e.key === 'S' || e.key === 'P')) {
        e.preventDefault();
        showAggressiveOverlay();
        alert("Fungsi simpan dan print dinonaktifkan.");
      }
    }, { capture: true });

    document.addEventListener('keyup', (e) => {
      if (e.key === 'PrintScreen' || e.key === 'Meta' || e.metaKey || e.key === 'OS' || e.ctrlKey) {
        setTimeout(recoverScreen, 1500);
      }
    }, { capture: true });

    // Hanya gunakan stealth blur untuk perpindahan layar/tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        stealthHide();
      } else {
        setTimeout(recoverScreen, 150); // Waktu pemulihan dipercepat agar tidak nunggu lama saat pindah tab
      }
    }, { capture: true });

    window.addEventListener('blur', stealthHide, { capture: true });

    window.addEventListener('focus', () => {
      setTimeout(recoverScreen, 150);
    }, { capture: true });

    // Hindari text-select dan long touch save mobile
    const css = `
      @media print {
        body { display: none !important; }
      }
      html, body {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      img {
        pointer-events: auto; /* Memungkinkan validasi klik kanan */
      }
    `;
    const styleEl = document.createElement('style');
    styleEl.appendChild(document.createTextNode(css));
    if (document.head) {
      document.head.appendChild(styleEl);
    } else {
      document.addEventListener('DOMContentLoaded', () => document.head.appendChild(styleEl));
    }
  }

})();
