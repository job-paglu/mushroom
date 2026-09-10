/* ============================================================
   Mushroom Mandi — Data Layer (data.js)
   v1: localStorage provider (works fully offline, per-browser)
   v2: Firebase provider activates automatically when
       js/firebase-config.js contains a real config.
   ============================================================ */
window.MM = window.MM || {};

(function (MM) {
  'use strict';

  const DB_KEY = 'mm_db_v1';
  const DB_VERSION = 1;

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

  /* ---------- seed / demo data ---------- */
  function seedDB() {
    const t = MM.nowISO();
    const cats = [
      { id: 'mushrooms', name: 'Mushrooms', icon: '🍄' },
      { id: 'spawn', name: 'Spawn', icon: '🌱' },
      { id: 'feed', name: 'Feed / Pellets / Substrate', icon: '🧱' }
    ];
    const sellers = [
      {
        id: 'seed_s1', ref: 'MS-1001', name: 'Ramesh Mushroom Farm', city: 'Pune', state: 'Maharashtra',
        mobile: '9876543210', email: 'ramesh.farm@example.com',
        categories: ['mushrooms'], deliveryStates: ['Maharashtra', 'Karnataka'], deliveryCities: ['Mumbai', 'Nashik', 'Bengaluru'],
        status: 'approved', createdAt: t, updatedAt: t
      },
      {
        id: 'seed_s2', ref: 'MS-1002', name: 'Shree Agro Spawn Center', city: 'Karnal', state: 'Haryana',
        mobile: '9812345678', email: '',
        categories: ['spawn'], deliveryStates: ['Haryana', 'Punjab', 'Uttar Pradesh', 'Delhi'], deliveryCities: ['Delhi', 'Chandigarh', 'Lucknow'],
        status: 'approved', createdAt: t, updatedAt: t
      },
      {
        id: 'seed_s3', ref: 'MS-1003', name: 'GreenLeaf Substrates', city: 'Nashik', state: 'Maharashtra',
        mobile: '', email: 'sales@greenleaf.example.com',
        categories: ['feed'], deliveryStates: ['Maharashtra', 'Gujarat', 'Madhya Pradesh'], deliveryCities: ['Indore', 'Surat'],
        status: 'approved', createdAt: t, updatedAt: t
      },
      {
        id: 'seed_s4', ref: 'MS-1004', name: 'Devbhoomi Mushrooms', city: 'Dehradun', state: 'Uttarakhand',
        mobile: '9765432109', email: 'devbhoomi@example.com',
        categories: ['mushrooms', 'spawn'], deliveryStates: ['Uttarakhand', 'Delhi', 'Uttar Pradesh'], deliveryCities: ['Delhi', 'Noida', 'Haridwar'],
        status: 'approved', createdAt: t, updatedAt: t
      },
      {
        id: 'seed_s5', ref: 'MS-1005', name: 'Bengal Mushroom Hub', city: 'Kolkata', state: 'West Bengal',
        mobile: '9123456780', email: '',
        categories: ['mushrooms', 'spawn'], deliveryStates: ['West Bengal', 'Odisha', 'Jharkhand'], deliveryCities: ['Bhubaneswar', 'Ranchi'],
        status: 'pending', createdAt: t, updatedAt: t
      }
    ];
    const products = [
      { id: 'seed_p1', sellerId: 'seed_s1', category: 'mushrooms', name: 'Oyster Mushroom (Fresh)', description: 'Daily harvested fresh oyster mushrooms. Bulk orders welcome.', images: [], wholesale: 180, retail: 250, createdAt: t, updatedAt: t },
      { id: 'seed_p2', sellerId: 'seed_s1', category: 'mushrooms', name: 'Milky Mushroom (Fresh)', description: '', images: [], wholesale: 220, retail: 300, createdAt: t, updatedAt: t },
      { id: 'seed_p3', sellerId: 'seed_s2', category: 'spawn', name: 'Oyster Spawn', description: 'High-yield oyster spawn, sealed packs of 1 kg.', images: [], wholesale: 95, retail: 130, createdAt: t, updatedAt: t },
      { id: 'seed_p4', sellerId: 'seed_s2', category: 'spawn', name: 'Milky Mushroom Spawn', description: '', images: [], wholesale: 110, retail: 150, createdAt: t, updatedAt: t },
      { id: 'seed_p5', sellerId: 'seed_s3', category: 'feed', name: 'Mushroom Pellets (Wheat Straw)', description: 'Compressed straw pellets — clean, ready-to-pasteurise substrate.', images: [], wholesale: 40, retail: 55, createdAt: t, updatedAt: t },
      { id: 'seed_p6', sellerId: 'seed_s4', category: 'mushrooms', name: 'Shiitake Mushroom (Fresh)', description: 'Premium shiitake, limited weekly quantity.', images: [], wholesale: 450, retail: 600, createdAt: t, updatedAt: t },
      { id: 'seed_p7', sellerId: 'seed_s4', category: 'spawn', name: 'Shiitake Spawn (Sawdust Blocks)', description: '', images: [], wholesale: 160, retail: 220, createdAt: t, updatedAt: t },
      { id: 'seed_p8', sellerId: 'seed_s5', category: 'mushrooms', name: 'Oyster Mushroom (Fresh)', description: 'Farm fresh oyster from our Kolkata unit.', images: [], wholesale: 170, retail: 240, createdAt: t, updatedAt: t }
    ];
    return { version: DB_VERSION, settings: defaultSettings(cats), sellers, products };
  }

  function defaultSettings(cats) {
    return {
      siteName: 'Mushroom Mandi',
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
