/* ============================================================
   Mushroom Mandi — Public app: router, home, listings, seller
   ============================================================ */
window.MM = window.MM || {};

(function (MM) {
  'use strict';

  const app = () => MM.$('#app');

  /* ================= ROUTER ================= */
  MM.router = function () {
    const hash = location.hash || '#/';
    window.scrollTo(0, 0);
    MM.closeModal();

    // #/                      -> home
    // #/c/{categoryId}        -> category listing
    // #/seller/{id}           -> seller detail
    // #/sell                  -> seller submission form
    // #/edit/{sellerId}       -> admin edit (admin session required)
    // #/admin                 -> admin panel
    const parts = hash.replace(/^#\//, '').split('/').filter(Boolean);

    setActiveNav(parts);

    if (parts.length === 0) return renderHome();
    if (parts[0] === 'c' && parts[1]) return renderCategory(parts[1]);
    if (parts[0] === 'seller' && parts[1]) return renderSeller(parts[1]);
    if (parts[0] === 'sell') return MM.renderSellerForm(null);
    if (parts[0] === 'edit' && parts[1]) return MM.renderSellerForm(parts[1], true);
    if (parts[0] === 'admin') return MM.renderAdmin(parts.slice(1));
    return renderNotFound();
  };

  function setActiveNav(parts) {
    MM.$$('.main-nav a').forEach(a => a.classList.remove('active'));
    if (parts.length === 0) {
      const a = MM.$('[data-nav="home"]'); if (a) a.classList.add('active');
    } else if (parts[0] === 'c' && parts[1]) {
      const a = MM.$('[data-nav="' + parts[1] + '"]'); if (a) a.classList.add('active');
    }
  }

  /* ================= HOME ================= */
  const listState = { q: '', cat: '', state: '', city: '' };

  function renderHome() {
    const cats = MM.db.categories();
    listState.cat = '';

    app().innerHTML =
      heroHTML() +
      '<section class="container section">' +
        '<div class="cat-grid">' + cats.map(catCardHTML).join('') + '</div>' +
      '</section>' +
      '<section class="container section" id="listingsSection">' +
        filterBarHTML() +
        '<div id="listingsWrap"></div>' +
      '</section>' +
      sellerCTAHTML();

    bindFilterBar();
    renderListings();
    bindHeroSearch();
  }

  function heroHTML() {
    return '' +
      '<section class="hero">' +
        '<div class="container hero-inner">' +
          '<div class="hero-copy">' +
            '<span class="hero-kicker">🇮🇳 India&apos;s Mushroom Marketplace</span>' +
            '<h1>Buy mushrooms, spawn &amp; substrate <span class="hl">directly from growers</span></h1>' +
            '<p class="hero-sub">No middlemen. Find verified sellers, compare wholesale &amp; retail rates, check delivery to your city, and contact them directly.</p>' +
            '<div class="hero-search">' +
              '<input id="heroSearch" type="search" placeholder="Search product or seller… e.g. Oyster, Spawn" aria-label="Search">' +
              '<button class="btn btn-primary" id="heroSearchBtn">Search</button>' +
            '</div>' +
            '<div class="hero-tags">' +
              '<span>Popular:</span>' +
              '<a href="#/c/mushrooms" class="tag">Oyster Mushroom</a>' +
              '<a href="#/c/spawn" class="tag">Spawn</a>' +
              '<a href="#/c/feed" class="tag">Pellets</a>' +
            '</div>' +
          '</div>' +
          '<div class="hero-art" aria-hidden="true">' +
            '<div class="blob b1 blob-brand"><img class="blob-logo" src="assets/logo.jpg" alt=""></div>' +
            '<div class="blob b2">🌱</div>' +
            '<div class="blob b3">🧱</div>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  function bindHeroSearch() {
    const go = () => {
      listState.q = (MM.$('#heroSearch').value || '').trim();
      const sec = MM.$('#listingsSection');
      if (sec) sec.scrollIntoView({ behavior: 'smooth' });
      renderListings();
    };
    const btn = MM.$('#heroSearchBtn');
    const inp = MM.$('#heroSearch');
    if (btn) btn.addEventListener('click', go);
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }

  function catCardHTML(c) {
    const n = MM.db.listSellers('approved').filter(s => (s.categories || []).includes(c.id)).length;
    return '' +
      '<a class="cat-card" href="#/c/' + c.id + '">' +
        '<span class="cat-icon">' + c.icon + '</span>' +
        '<span class="cat-name">' + MM.esc(c.name) + '</span>' +
        '<span class="cat-count">' + n + ' seller' + (n === 1 ? '' : 's') + '</span>' +
        '<span class="cat-arrow">→</span>' +
      '</a>';
  }

  /* ================= CATEGORY PAGE ================= */
  function renderCategory(catId) {
    const cat = MM.db.categories().find(c => c.id === catId);
    if (!cat) return renderNotFound();
    listState.cat = catId;
    listState.q = '';
    listState.state = '';
    listState.city = '';

    app().innerHTML =
      '<section class="page-head">' +
        '<div class="container">' +
          '<a href="#/" class="back-link">← Home</a>' +
          '<h1>' + cat.icon + ' ' + MM.esc(cat.name) + '</h1>' +
          '<p>Sellers offering ' + MM.esc(cat.name.toLowerCase()) + ' across India.</p>' +
        '</div>' +
      '</section>' +
      '<section class="container section">' +
        filterBarHTML() +
        '<div id="listingsWrap"></div>' +
      '</section>';

    bindFilterBar();
    renderListings();
  }

  /* ================= FILTER BAR + LISTINGS ================= */
  function filterBarHTML() {
    const states = deliveryStatesUnion();
    return '' +
      '<div class="filter-bar card">' +
        '<div class="filter-item grow">' +
          '<label>Search</label>' +
          '<input id="fQ" type="search" placeholder="Product, seller name…" value="' + MM.esc(listState.q) + '">' +
        '</div>' +
        '<div class="filter-item">' +
          '<label>State</label>' +
          '<select id="fState"><option value="">All India</option>' +
          states.map(s => '<option ' + (listState.state === s ? 'selected' : '') + '>' + MM.esc(s) + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div class="filter-item">' +
          '<label>Your City</label>' +
          '<input id="fCity" type="text" placeholder="e.g. Mumbai" value="' + MM.esc(listState.city) + '">' +
        '</div>' +
        '<div class="filter-item filter-btns">' +
          '<button class="btn btn-primary" id="fApply">Find Sellers</button>' +
          '<button class="btn btn-ghost" id="fReset">Reset</button>' +
        '</div>' +
      '</div>' +
      '<p class="hint-line">💡 If the seller delivers to your city, you can contact them directly.</p>';
  }

  function deliveryStatesUnion() {
    const set = new Set();
    MM.db.listSellers('approved').forEach(s => {
      if (s.state) set.add(s.state);
      (s.deliveryStates || []).forEach(x => set.add(x));
    });
    return MM.INDIAN_STATES.filter(s => set.has(s));
  }

  function bindFilterBar() {
    const apply = () => {
      listState.q = (MM.$('#fQ') ? MM.$('#fQ').value : '').trim();
      listState.state = MM.$('#fState') ? MM.$('#fState').value : '';
      listState.city = (MM.$('#fCity') ? MM.$('#fCity').value : '').trim();
      renderListings();
    };
    const a = MM.$('#fApply'); if (a) a.addEventListener('click', apply);
    const q = MM.$('#fQ'); if (q) q.addEventListener('keydown', e => { if (e.key === 'Enter') apply(); });
    const c = MM.$('#fCity'); if (c) c.addEventListener('keydown', e => { if (e.key === 'Enter') apply(); });
    const r = MM.$('#fReset');
    if (r) r.addEventListener('click', () => {
      listState.q = ''; listState.state = ''; listState.city = '';
      renderListings();
    });
  }

  function matchesFilters(seller, products) {
    const st = listState;
    if (st.cat && !(seller.categories || []).includes(st.cat)) return false;

    if (st.state) {
      const inState = seller.state === st.state ||
        (seller.deliveryStates || []).includes(st.state);
      if (!inState) return false;
    }
    if (st.city) {
      const city = st.city.toLowerCase();
      const inCity = (seller.city || '').toLowerCase() === city ||
        (seller.deliveryCities || []).some(x => x.toLowerCase() === city);
      if (!inCity) return false;
    }
    if (st.q) {
      const q = st.q.toLowerCase();
      const hay = [seller.name, seller.city, seller.state]
        .concat(products.map(p => p.name + ' ' + (p.description || '')))
        .concat((seller.categories || []).map(id => MM.db.categoryName(id)))
        .join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function renderListings() {
    const wrap = MM.$('#listingsWrap');
    if (!wrap) return;
    const approved = MM.db.listSellers('approved');
    const anyFilter = listState.q || listState.state || listState.city || listState.cat;

    const rows = [];
    approved.forEach(s => {
      const products = MM.db.listProducts(s.id);
      if (matchesFilters(s, products)) rows.push({ s, products });
    });

    if (!rows.length) {
      wrap.innerHTML =
        '<div class="empty-state card">' +
        '<div class="empty-icon">🔍</div>' +
        '<h3>No sellers found' + (anyFilter ? ' for these filters' : ' yet') + '</h3>' +
        '<p>' + (anyFilter
          ? 'Try clearing the search or selecting a different state/city.'
          : 'Be the first — share this site with mushroom sellers you know!') + '</p>' +
        (anyFilter ? '<button class="btn btn-ghost" onclick="location.reload()">Clear filters</button>' : '') +
        '</div>';
      return;
    }

    wrap.innerHTML =
      '<p class="results-count">' + rows.length + ' seller' + (rows.length === 1 ? '' : 's') + ' found</p>' +
      '<div class="seller-grid">' + rows.map(r => sellerCardHTML(r.s, r.products)).join('') + '</div>';

    MM.$$('.js-contact', wrap).forEach(btn =>
      btn.addEventListener('click', () => contactModal(btn.dataset.id)));
  }

  function sellerCardHTML(s, products) {
    const catBadges = (s.categories || [])
      .map(id => '<span class="badge badge-cat">' + MM.db.categoryIcon(id) + ' ' + MM.esc(MM.db.categoryName(id)) + '</span>').join('');
    const del = deliveryText(s);
    return '' +
      '<article class="seller-card card">' +
        '<div class="seller-head">' +
          '<div class="seller-avatar">' + MM.esc(initials(s.name)) + '</div>' +
          '<div class="seller-title">' +
            '<h3><a href="#/seller/' + s.id + '">' + MM.esc(s.name) + '</a></h3>' +
            '<p class="seller-loc">📍 ' + MM.esc(s.city) + ', ' + MM.esc(s.state) + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="cat-badges">' + catBadges + '</div>' +
        '<div class="seller-products">' +
          products.slice(0, 3).map(productRowHTML).join('') +
        '</div>' +
        '<p class="delivery-line">🚚 Delivery: ' + del + '</p>' +
        priceNoteHTML() +
        '<div class="card-actions">' +
          '<button class="btn btn-primary js-contact" data-id="' + s.id + '">📞 Contact Seller</button>' +
          '<a class="btn btn-ghost" href="#/seller/' + s.id + '">View Details</a>' +
        '</div>' +
      '</article>';
  }

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] ? w[0].toUpperCase() : '').join('');
  }

  function productRowHTML(p) {
    const img = (p.images && p.images[0]) || MM.placeholderImage(p.name, MM.db.categoryIcon(p.category));
    return '' +
      '<div class="product-row">' +
        '<img class="prod-thumb" src="' + img + '" alt="' + MM.esc(p.name) + '" loading="lazy">' +
        '<div class="prod-info">' +
          '<p class="prod-name">' + MM.esc(p.name) + '</p>' +
          '<p class="prod-prices">' +
            '<span class="price-chip">Whole: <b>' + MM.money(p.wholesale) + '</b>/kg</span>' +
            '<span class="price-chip">Retail: <b>' + MM.money(p.retail) + '</b>/kg</span>' +
          '</p>' +
        '</div>' +
      '</div>';
  }

  function deliveryText(s) {
    const states = s.deliveryStates || [];
    const cities = s.deliveryCities || [];
    const bits = [];
    if (states.length) bits.push(states.join(', '));
    if (cities.length) bits.push(cities.join(', '));
    const txt = bits.join(' • ');
    return txt ? MM.esc(txt) : 'Ask seller directly';
  }

  function priceNoteHTML() {
    return '<p class="price-note">Wholesale: orders of 10 KG or more • Retail: below 10 KG</p>';
  }

  function sellerCTAHTML() {
    return '' +
      '<section class="cta-band">' +
        '<div class="container cta-inner">' +
          '<div>' +
            '<h2>Grow mushrooms? 🍄</h2>' +
            '<p>List your products free. Buyers contact you directly — no commission, ever.</p>' +
          '</div>' +
          '<a href="#/sell" class="btn btn-light btn-lg">+ Add Your Listing</a>' +
        '</div>' +
      '</section>';
  }

  /* ================= SELLER DETAIL ================= */
  function renderSeller(id) {
    const s = MM.db.getSeller(id);
    if (!s || s.status !== 'approved') return renderNotFound();
    const products = MM.db.listProducts(id);

    app().innerHTML =
      '<section class="container section">' +
        '<a href="#/" class="back-link">← Back to listings</a>' +
        '<div class="seller-detail card">' +
          '<div class="seller-head big">' +
            '<div class="seller-avatar xl">' + MM.esc(initials(s.name)) + '</div>' +
            '<div class="seller-title">' +
              '<h1>' + MM.esc(s.name) + '</h1>' +
              '<p class="seller-loc">📍 ' + MM.esc(s.city) + ', ' + MM.esc(s.state) + '</p>' +
              '<div class="cat-badges">' +
                (s.categories || []).map(cid =>
                  '<span class="badge badge-cat">' + MM.db.categoryIcon(cid) + ' ' + MM.esc(MM.db.categoryName(cid)) + '</span>').join('') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="detail-grid">' +
            '<div class="detail-box"><h4>🚚 Delivery Available In</h4><p>' + deliveryText(s) + '</p></div>' +
            '<div class="detail-box"><h4>🧾 Ref / Listed</h4><p>' + MM.esc(s.ref || '—') + ' • ' + MM.fmtDate(s.createdAt) + '</p></div>' +
          '</div>' +
          contactButtonsHTML(s, 'btn-row') +
        '</div>' +

        '<h2 class="mt">Products (' + products.length + ')</h2>' +
        '<p class="hint-line">' + 'Wholesale Rate: for orders of 10 KG or more • Retail Rate: for orders below 10 KG' + '</p>' +
        (products.length
          ? '<div class="prod-grid">' + products.map(bigProductCardHTML).join('') + '</div>'
          : '<div class="empty-state card"><p>This seller has not added products yet.</p></div>') +
      '</section>';

    const b = MM.$('.js-contact'); if (b) b.addEventListener('click', () => contactModal(s.id));
  }

  function bigProductCardHTML(p) {
    const img = (p.images && p.images[0]) || MM.placeholderImage(p.name, MM.db.categoryIcon(p.category));
    return '' +
      '<article class="prod-card card">' +
        '<img class="prod-img" src="' + img + '" alt="' + MM.esc(p.name) + '" loading="lazy">' +
        '<div class="prod-body">' +
          '<span class="badge badge-cat">' + MM.db.categoryIcon(p.category) + ' ' + MM.esc(MM.db.categoryName(p.category)) + '</span>' +
          '<h3>' + MM.esc(p.name) + '</h3>' +
          (p.description ? '<p class="prod-desc">' + MM.esc(p.description) + '</p>' : '') +
          '<div class="price-rows">' +
            '<div class="price-row"><span>Wholesale</span><b>' + MM.money(p.wholesale) + ' / kg</b></div>' +
            '<div class="price-row"><span>Retail</span><b>' + MM.money(p.retail) + ' / kg</b></div>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* ================= CONTACT ================= */
  function contactButtonsHTML(s) {
    const btns = [];
    if (MM.digitsOnly(s.mobile)) {
      btns.push('<a class="btn btn-primary" href="' + MM.telLink(s.mobile) + '">📞 Call ' + MM.esc(s.mobile) + '</a>');
      btns.push('<a class="btn btn-wa" target="_blank" rel="noopener" href="' + MM.waLink(s.mobile, 'Hi, I found your listing on AK Mushrooms. I want to enquire about your products.') + '">💬 WhatsApp</a>');
    }
    if (s.email) {
      btns.push('<a class="btn btn-ghost" href="mailto:' + MM.esc(s.email) + '">✉️ Email</a>');
    }
    if (!btns.length) return '<p class="muted">This seller has not shared public contact details. (Admin may have their details.)</p>';
    return '<div class="contact-btns">' + btns.join('') + '</div>';
  }

  function contactModal(sellerId) {
    const s = MM.db.getSeller(sellerId);
    if (!s) return;
    const rows = [];
    if (MM.digitsOnly(s.mobile)) {
      rows.push('<div class="contact-row"><span class="contact-label">📞 Mobile</span>' +
        '<div class="contact-btns"><a class="btn btn-sm btn-primary" href="' + MM.telLink(s.mobile) + '">Call now</a>' +
        '<a class="btn btn-sm btn-wa" target="_blank" rel="noopener" href="' + MM.waLink(s.mobile, 'Hi, I found your listing on AK Mushrooms. I want to enquire about your products.') + '">WhatsApp</a></div></div>');
    }
    if (s.email) {
      rows.push('<div class="contact-row"><span class="contact-label">✉️ Email</span>' +
        '<div class="contact-btns"><a class="btn btn-sm btn-ghost" href="mailto:' + MM.esc(s.email) + '">' + MM.esc(s.email) + '</a></div></div>');
    }
    MM.openModal(
      '<div class="contact-modal">' +
        '<h3>Contact Seller</h3>' +
        '<p class="muted">' + MM.esc(s.name) + ' — ' + MM.esc(s.city) + ', ' + MM.esc(s.state) + '</p>' +
        (rows.length
          ? rows.join('')
          : '<p class="muted">No public contact details shared for this seller.</p>') +
        '<p class="hint-line mt">💡 Mention <b>' + MM.esc(s.ref || '') + '</b> when you call, and tell them you found them on AK Mushrooms.</p>' +
      '</div>'
    );
  }

  /* ================= 404 ================= */
  function renderNotFound() {
    app().innerHTML =
      '<section class="container section center">' +
        '<div class="empty-state card">' +
          '<div class="empty-icon">🍄</div>' +
          '<h2>Page not found</h2>' +
          '<p>The page you are looking for does not exist or the listing is no longer available.</p>' +
          '<a href="#/" class="btn btn-primary">Go to Homepage</a>' +
        '</div>' +
      '</section>';
  }

  /* ================= BOOT ================= */
  MM.boot = MM.boot || function () {};
  const _origBoot = MM.boot;
  MM.boot = function () {
    _origBoot();
    MM.$('#footerYear').textContent = new Date().getFullYear();
    MM.$('#footerCats').innerHTML = MM.db.categories()
      .map(c => '<p><a href="#/c/' + c.id + '">' + c.icon + ' ' + MM.esc(c.name) + '</a></p>').join('');
    window.addEventListener('hashchange', MM.router);
    const t = MM.$('#navToggle');
    t.addEventListener('click', () => document.body.classList.toggle('nav-open'));
    MM.router();
  };

})(window.MM);
