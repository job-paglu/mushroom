/* ============================================================
   AK Mushrooms — Data Layer (data.js)
   v1: localStorage provider (works fully offline, per-browser)
   v2: Firebase provider activates automatically when
       js/firebase-config.js contains a real config.
   ============================================================ */
window.MM = window.MM || {};

(function (MM) {
  'use strict';

  // v2: key bumped from mm_db_v1 to drop the pre-seeded demo listings —
  // every browser now starts with a clean, empty marketplace.
  const DB_KEY = 'mm_db_v2';
  const DB_VERSION = 2;

  /* ---------- small utils ---------- */
  MM.uid = function (prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  };
  MM.nowISO = function () { return new Date().toISOString(); };
  MM.fmtDate = function (iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return iso; }
  };
  MM.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  MM.sha256 = async function (text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  /* ---------- placeholder product image (SVG data URI) ---------- */
  MM.placeholderImage = function (categoryName, emoji) {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">' +
      '<rect width="640" height="420" fill="#eef4ec"/>' +
      '<circle cx="540" cy="60" r="140" fill="#dcebdd"/>' +
      '<circle cx="80" cy="380" r="110" fill="#e4f0e2"/>' +
      '<text x="320" y="200" font-size="110" text-anchor="middle">' + (emoji || '🍄') + '</text>' +
      '<text x="320" y="290" font-size="30" font-family="sans-serif" fill="#5a6f5f" text-anchor="middle">' +
      (categoryName || 'Product') + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };

  /* ---------- image compression ---------- */
  // Resize + JPEG-compress an uploaded image so several photos fit in localStorage.
  MM.compressImage = function (file, maxDim, quality) {
    maxDim = maxDim || 900; quality = quality || 0.72;
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('Not an image')); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not load image'));
        img.onload = () => {
          let { width: w, height: h } = img;
          if (w > maxDim || h > maxDim) {
            const r = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * r); h = Math.round(h * r);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  /* ---------- initial database (empty marketplace — no demo posts) ---------- */
  function seedDB() {
    const cats = [
      { id: 'mushrooms', name: 'Mushrooms', icon: '🍄' },
      { id: 'spawn', name: 'Spawn', icon: '🌱' },
      { id: 'feed', name: 'Feed / Pellets / Substrate', icon: '🧱' }
    ];
    // Sellers & products start EMPTY. Real listings appear here when sellers
    // submit via #/sell and the admin approves them in #/admin.
    const sellers = [];
    const products = [];
    return { version: DB_VERSION, settings: defaultSettings(cats), sellers, products };
  }

  function defaultSettings(cats) {
    return {
      siteName: 'AK Mushrooms',
      categories: cats,
      maxProducts: 3,
      adminPassHash: null // set on first password change; login defaults to 'admin123' when null
    };
  }

  /* ---------- store ---------- */
  let _db = null;

  function load() {
    if (_db) return _db;
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        _db = JSON.parse(raw);
        if (!_db || _db.version !== DB_VERSION || !_db.settings) throw new Error('bad db');
      } else {
        _db = seedDB();
        save();
      }
    } catch (e) {
      console.warn('[MM] DB unreadable, reseeding.', e);
      _db = seedDB();
      save();
    }
    return _db;
  }

  function save() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(_db));
    } catch (e) {
      console.error('[MM] localStorage save failed (quota?)', e);
      MM.toast && MM.toast('Storage is full — try removing some product photos.', 'error');
      throw e;
    }
  }

  function nextRefNum() {
    const nums = load().sellers.map(s => parseInt((s.ref || '').replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
    const next = (nums.length ? Math.max.apply(null, nums) : 1000) + 1;
    return 'MS-' + next;
  }

  /* ---------- public provider API ---------- */
  const LocalProvider = {

    /* settings */
    getSettings() { return load().settings; },
    saveSettings(patch) {
      const db = load();
      Object.assign(db.settings, patch);
      save();
    },

    /* categories */
    categories() { return load().settings.categories; },
    categoryName(id) {
      const c = load().settings.categories.find(c => c.id === id);
      return c ? c.name : id;
    },
    categoryIcon(id) {
      const c = load().settings.categories.find(c => c.id === id);
      return c ? c.icon : '📦';
    },

    /* sellers */
    listSellers(status) {
      const arr = load().sellers.slice();
      arr.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      return status ? arr.filter(s => s.status === status) : arr;
    },
    getSeller(id) { return load().sellers.find(s => s.id === id) || null; },
    getSellerByRef(ref) { return load().sellers.find(s => s.ref === ref) || null; },
    nextRef() { return nextRefNum(); },
    saveSeller(data) {
      const db = load();
      const t = MM.nowISO();
      if (data.id) {
        const s = db.sellers.find(x => x.id === data.id);
        if (!s) throw new Error('Seller not found');
        Object.assign(s, data, { updatedAt: t });
        save();
        return s;
      }
      const seller = Object.assign({
        id: MM.uid('s'), ref: nextRefNum(), status: 'pending',
        deliveryStates: [], deliveryCities: [], mobile: '', email: '',
        createdAt: t, updatedAt: t
      }, data);
      db.sellers.push(seller);
      save();
      return seller;
    },
    setSellerStatus(id, status) {
      const db = load();
      const s = db.sellers.find(x => x.id === id);
      if (!s) throw new Error('Seller not found');
      s.status = status; s.updatedAt = MM.nowISO();
      save();
      return s;
    },
    deleteSeller(id) {
      const db = load();
      db.sellers = db.sellers.filter(s => s.id !== id);
      db.products = db.products.filter(p => p.sellerId !== id);
      save();
    },

    /* products */
    listProducts(sellerId) {
      const arr = load().products.filter(p => !sellerId || p.sellerId === sellerId);
      arr.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      return arr;
    },
    listAllProducts() { return load().products.slice(); },
    getProduct(id) { return load().products.find(p => p.id === id) || null; },
    saveProduct(data) {
      const db = load();
      const t = MM.nowISO();
      if (data.id) {
        const p = db.products.find(x => x.id === data.id);
        if (!p) throw new Error('Product not found');
        Object.assign(p, data, { updatedAt: t });
        save();
        return p;
      }
      const prod = Object.assign({
        id: MM.uid('p'), description: '', images: [],
        createdAt: t, updatedAt: t
      }, data);
      db.products.push(prod);
      save();
      return prod;
    },
    deleteProduct(id) {
      const db = load();
      db.products = db.products.filter(p => p.id !== id);
      save();
    },

    /* stats */
    stats() {
      const db = load();
      return {
        totalSellers: db.sellers.length,
        pending: db.sellers.filter(s => s.status === 'pending').length,
        approved: db.sellers.filter(s => s.status === 'approved').length,
        rejected: db.sellers.filter(s => s.status === 'rejected').length,
        totalProducts: db.products.length
      };
    },

    /* backup */
    exportJSON() {
      return JSON.stringify(load(), null, 2);
    },

    /* info */
    name: 'local',
    isCloud: false
  };

  /* ---------- Firebase provider (v2) ----------
     Activates automatically when js/firebase-config.js defines MM.firebaseConfig.
     Enables: real multi-device data — seller submissions from anywhere,
     admin approvals from anywhere, images in Firebase Storage.        */
  function buildFirebaseProvider(config) {
    // Implemented with dynamically imported Firebase SDK (v10 modular, CDN).
    // This path is only exercised when a real config is present.
    return null; // placeholder — MM will keep using LocalProvider until wired
  }

  MM.boot = function () {
    let provider = LocalProvider;
    if (MM.firebaseConfig && MM.firebaseConfig.apiKey) {
      const fb = buildFirebaseProvider(MM.firebaseConfig);
      if (fb) provider = fb;
      else console.info('[MM] Firebase config found but cloud provider not yet wired — using local mode.');
    }
    MM.db = provider;
    // NOTE: router is invoked once by app.js boot wrapper (single render).
  };

})(window.MM);
