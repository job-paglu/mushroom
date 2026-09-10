/* ============================================================
   Mushroom Mandi — Seller submission form (seller-form.js)
   Multi-step wizard. Also reused (prefilled) for admin editing.
   ============================================================ */
window.MM = window.MM || {};

(function (MM) {
  'use strict';

  /* state for the form currently being rendered */
  let F = null; // { sellerId, isAdminEdit, seller, products:[{category,name,description,images:[],wholesale,retail}], deliveryStates:[], deliveryCities:[], step }

  function freshState(seller) {
    const settings = MM.db.getSettings();
    const products = seller
      ? MM.db.listProducts(seller.id).map(p => ({
          id: p.id, category: p.category, name: p.name, description: p.description || '',
          images: (p.images || []).slice(), wholesale: p.wholesale, retail: p.retail
        }))
      : [];
    return {
      sellerId: seller ? seller.id : null,
      isAdminEdit: !!seller,
      seller: seller ? {
        name: seller.name, city: seller.city, state: seller.state,
        mobile: seller.mobile || '', email: seller.email || '',
        categories: (seller.categories || []).slice(),
        status: seller.status, ref: seller.ref
      } : { name: '', city: '', state: '', mobile: '', email: '', categories: [] },
      products: products.length ? products : [emptyProduct()],
      deliveryStates: seller ? (seller.deliveryStates || []).slice() : [],
      deliveryCities: seller ? (seller.deliveryCities || []).slice() : [],
      maxProducts: settings.maxProducts || 3,
      step: 1
    };
  }

  function emptyProduct() {
    return { category: MM.db.categories()[0].id, name: '', description: '', images: [], wholesale: '', retail: '' };
  }

  /* ================= entry point ================= */
  MM.renderSellerForm = function (sellerId, isAdminEdit) {
    const seller = sellerId ? MM.db.getSeller(sellerId) : null;
    if (isAdminEdit) {
      if (!seller) { location.hash = '#/admin'; return; }
      if (!MM.isAdminSession()) { location.hash = '#/admin'; return; }
    }
    F = freshState(isAdminEdit ? seller : null);
    render();
  };

  /* ================= render shell ================= */
  function render() {
    const app = MM.$('#app');
    window.scrollTo(0, 0);

    app.innerHTML =
      '<section class="container section form-page">' +
        (F.isAdminEdit
          ? '<a href="#/admin" class="back-link">← Back to Admin</a>' +
            '<div class="edit-banner">✏️ Admin edit mode — changes save immediately, status stays <b>' + MM.esc(F.seller.status) + '</b></div>'
          : '') +
        '<div class="form-head">' +
          '<h1>' + (F.isAdminEdit ? 'Edit Seller Listing' : 'Add Your Products 🍄') + '</h1>' +
          '<p>' + (F.isAdminEdit
            ? 'Update seller details, products, prices and delivery locations below.'
            : 'Fill this short form. Our team will review your submission before it goes live on the website.') + '</p>' +
        '</div>' +
        stepsHTML() +
        '<form id="sellerForm" novalidate>' +
          '<div id="stepBody"></div>' +
          '<div class="form-nav">' +
            (F.step > 1 ? '<button type="button" class="btn btn-ghost" id="btnPrev">← Back</button>' : '<span></span>') +
            (F.step < 4
              ? '<button type="button" class="btn btn-primary" id="btnNext">Next →</button>'
              : '<button type="submit" class="btn btn-primary btn-lg" id="btnSubmit">' +
                (F.isAdminEdit ? '💾 Save Changes' : '✅ Submit for Review') + '</button>') +
          '</div>' +
        '</form>' +
      '</section>';

    renderStep();
    bindNav();
  }

  function stepsHTML() {
    const labels = ['Seller Details', 'What You Sell', 'Products & Prices', 'Delivery & Submit'];
    return '<div class="steps">' + labels.map((l, i) => {
      const n = i + 1;
      const cls = n === F.step ? 'active' : (n < F.step ? 'done' : '');
      return '<div class="step ' + cls + '"><span class="step-n">' + (n < F.step ? '✓' : n) + '</span><span class="step-l">' + l + '</span></div>';
    }).join('') + '</div>';
  }

  function bindNav() {
    const prev = MM.$('#btnPrev');
    if (prev) prev.addEventListener('click', () => { if (collectStep()) { F.step--; render(); } });
    const next = MM.$('#btnNext');
    if (next) next.addEventListener('click', () => {
      if (collectStep()) {
        if (F.step === 3 && activeProducts().length === 0) {
          MM.toast('Please add at least 1 product (Step 3).', 'error');
          return;
        }
        F.step++; render();
      }
    });
    MM.$('#sellerForm').addEventListener('submit', onSubmit);
  }

  /* ================= step bodies ================= */
  function renderStep() {
    const body = MM.$('#stepBody');
    if (F.step === 1) body.innerHTML = step1HTML();
    if (F.step === 2) body.innerHTML = step2HTML();
    if (F.step === 3) body.innerHTML = step3HTML();
    if (F.step === 4) body.innerHTML = step4HTML();

    if (F.step === 1) bindStep1();
    if (F.step === 2) bindStep2();
    if (F.step === 3) bindStep3();
    if (F.step === 4) bindStep4();
  }

  /* ----- step 1: seller details ----- */
  function step1HTML() {
    const s = F.seller;
    return '' +
      '<div class="card form-card">' +
        '<h3>Seller Details</h3>' +
        '<div class="frow two">' +
          field('text', 'fName', 'Seller Name / Farm Name *', s.name, 'e.g. Ramesh Mushroom Farm') +
          field('text', 'fCity', 'City *', s.city, 'e.g. Pune') +
        '</div>' +
        '<div class="frow">' +
          '<div class="fgroup">' +
            '<label for="fState">State *</label>' +
            '<select id="fState"><option value="">Select state…</option>' +
            MM.INDIAN_STATES.map(x => '<option ' + (s.state === x ? 'selected' : '') + '>' + MM.esc(x) + '</option>').join('') +
            '</select>' +
            '<p class="ferr" id="errState"></p>' +
          '</div>' +
        '</div>' +
        '<div class="frow two">' +
          field('tel', 'fMobile', 'Mobile Number (optional)', s.mobile, '10-digit mobile number') +
          field('email', 'fEmail', 'Email ID (optional)', s.email, 'you@example.com') +
        '</div>' +
        '<p class="hint-line">💡 Mobile number &amp; email are optional — but adding them lets buyers contact you directly.</p>' +
      '</div>';
  }

  function field(type, id, label, val, ph) {
    return '' +
      '<div class="fgroup">' +
        '<label for="' + id + '">' + label + '</label>' +
        '<input type="' + type + '" id="' + id + '" value="' + MM.esc(val || '') + '" placeholder="' + MM.esc(ph || '') + '">' +
        '<p class="ferr" id="err' + id.slice(1) + '"></p>' +
      '</div>';
  }

  function bindStep1() {
    /* nothing dynamic; validation happens in collectStep */
  }

  /* ----- step 2: categories ----- */
  function step2HTML() {
    const cats = MM.db.categories();
    return '' +
      '<div class="card form-card">' +
        '<h3>What do you sell?</h3>' +
        '<p class="muted">Select one, two — or all three. You can offer multiple types of products.</p>' +
        '<div class="cat-checks">' +
          cats.map(c => {
            const on = F.seller.categories.includes(c.id);
            return '<label class="cat-check ' + (on ? 'on' : '') + '">' +
              '<input type="checkbox" value="' + c.id + '" ' + (on ? 'checked' : '') + '> ' +
              '<span class="cat-check-icon">' + c.icon + '</span>' +
              '<span class="cat-check-name">' + MM.esc(c.name) + '</span>' +
            '</label>';
          }).join('') +
        '</div>' +
        '<p class="ferr" id="errCats"></p>' +
      '</div>';
  }

  function bindStep2() {
    MM.$$('#stepBody .cat-check input').forEach(cb => {
      cb.addEventListener('change', () => cb.closest('.cat-check').classList.toggle('on', cb.checked));
    });
  }

  /* ----- step 3: products ----- */
  function activeProducts() {
    return F.products.filter(p => !p._deleted);
  }

  function step3HTML() {
    const cats = MM.db.categories();
    let html = '' +
      '<div class="card form-card">' +
        '<h3>Your Products</h3>' +
        '<p class="muted">You can add up to <b>' + F.maxProducts + ' products</b>. Add at least one.</p>' +
        '<div id="prodList">';

    F.products.forEach((p, i) => {
      html += productEditorHTML(p, i, cats);
    });

    html += '</div>';

    if (activeProducts().length < F.maxProducts) {
      html += '<button type="button" class="btn btn-outline add-prod" id="btnAddProd">+ Add Product ' + (activeProducts().length + 1) + '</button>';
    } else {
      html += '<p class="hint-line">Maximum ' + F.maxProducts + ' products reached.</p>';
    }

    html += '</div>';
    return html;
  }

  function productEditorHTML(p, i, cats) {
    const del = !!p._deleted;
    const num = F.products.slice(0, i + 1).filter(x => !x._deleted).length;
    return '' +
      '<div class="prod-editor ' + (del ? 'deleted' : '') + '" data-idx="' + i + '">' +
        '<div class="prod-ed-head">' +
          '<h4>' + (del ? '🚫 Product (removed — will be deleted on save)' : 'Product ' + num) + '</h4>' +
          (del
            ? '<button type="button" class="btn btn-sm btn-ghost js-restore" data-idx="' + i + '">↺ Restore</button>'
            : '<button type="button" class="btn btn-sm btn-danger-ghost js-del" data-idx="' + i + '">✕ Remove</button>') +
        '</div>' +
        '<div class="frow two">' +
          '<div class="fgroup">' +
            '<label>Product Category *</label>' +
            '<select class="p-cat" ' + (del ? 'disabled' : '') + '>' +
            cats.map(c => '<option value="' + c.id + '" ' + (p.category === c.id ? 'selected' : '') + '>' + c.icon + ' ' + MM.esc(c.name) + '</option>').join('') +
            '</select>' +
          '</div>' +
          '<div class="fgroup">' +
            '<label>Product Name *</label>' +
            '<input type="text" class="p-name" value="' + MM.esc(p.name) + '" placeholder="e.g. Oyster Mushroom" ' + (del ? 'disabled' : '') + '>' +
          '</div>' +
        '</div>' +
        '<div class="frow">' +
          '<div class="fgroup">' +
            '<label>Product Description (optional)</label>' +
            '<textarea class="p-desc" rows="2" placeholder="variety, packing, quality details…" ' + (del ? 'disabled' : '') + '>' + MM.esc(p.description) + '</textarea>' +
          '</div>' +
        '</div>' +
        '<div class="frow two">' +
          '<div class="fgroup">' +
            '<label>Wholesale Rate (₹ / KG) *</label>' +
            '<input type="number" min="0" step="0.5" class="p-ws" value="' + MM.esc(p.wholesale) + '" placeholder="e.g. 180" ' + (del ? 'disabled' : '') + '>' +
            '<p class="fhint">For orders of 10 KG or more</p>' +
          '</div>' +
          '<div class="fgroup">' +
            '<label>Retail Rate (₹ / KG) *</label>' +
            '<input type="number" min="0" step="0.5" class="p-rt" value="' + MM.esc(p.retail) + '" placeholder="e.g. 250" ' + (del ? 'disabled' : '') + '>' +
            '<p class="fhint">For orders below 10 KG</p>' +
          '</div>' +
        '</div>' +
        imageAreaHTML(p, i) +
      '</div>';
  }

  function imageAreaHTML(p, i) {
    const maxImgs = 2;
    const thumbs = (p.images || []).map((src, k) =>
      '<div class="img-thumb"><img src="' + src + '" alt="photo ' + (k + 1) + '">' +
      '<button type="button" class="img-x js-img-del" data-idx="' + i + '" data-k="' + k + '">✕</button></div>'
    ).join('');
    const canAdd = (p.images || []).length < maxImgs && !p._deleted;
    return '' +
      '<div class="fgroup">' +
        '<label>Product Photos <span class="muted">(up to ' + maxImgs + ')</span></label>' +
        '<p class="fhint">📸 Upload 1–2 clear photos of your product.</p>' +
        '<div class="img-row">' + thumbs +
        (canAdd
          ? '<label class="img-add">＋<input type="file" accept="image/*" class="js-img-input" data-idx="' + i + '" hidden></label>'
          : '') +
        '</div>' +
      '</div>';
  }

  function bindStep3() {
    const list = MM.$('#prodList');

    const addBtn = MM.$('#btnAddProd');
    if (addBtn) addBtn.addEventListener('click', () => {
      collectProducts(); // keep current edits
      F.products.push({ category: MM.db.categories()[0].id, name: '', description: '', images: [], wholesale: '', retail: '' });
      render();
    });

    list.addEventListener('click', (e) => {
      const t = e.target;
      const delBtn = t.closest('.js-del');
      const resBtn = t.closest('.js-restore');
      const imgDel = t.closest('.js-img-del');
      if (delBtn) {
        const i = +delBtn.dataset.idx;
        if (F.products[i].id) { F.products[i]._deleted = true; }
        else { F.products.splice(i, 1); }
        collectProducts();
        render();
      }
      if (resBtn) {
        F.products[+resBtn.dataset.idx]._deleted = false;
        render();
      }
      if (imgDel) {
        const i = +imgDel.dataset.idx, k = +imgDel.dataset.k;
        F.products[i].images.splice(k, 1);
        render();
      }
    });

    list.addEventListener('change', (e) => {
      const inp = e.target.closest('.js-img-input');
      if (!inp) return;
      const i = +inp.dataset.idx;
      const file = inp.files && inp.files[0];
      if (!file) return;
      MM.compressImage(file).then(dataURL => {
        F.products[i].images.push(dataURL);
        collectProducts();
        render();
        MM.toast('Photo added ✓');
      }).catch(() => MM.toast('Could not read that image file.', 'error'));
    });
  }

  function collectProducts() {
    MM.$$('#prodList .prod-editor').forEach(ed => {
      const i = +ed.dataset.idx;
      const p = F.products[i];
      if (!p) return;
      p.category = ed.querySelector('.p-cat') ? ed.querySelector('.p-cat').value : p.category;
      p.name = ed.querySelector('.p-name') ? ed.querySelector('.p-name').value.trim() : p.name;
      p.description = ed.querySelector('.p-desc') ? ed.querySelector('.p-desc').value.trim() : p.description;
      p.wholesale = ed.querySelector('.p-ws') ? ed.querySelector('.p-ws').value : p.wholesale;
      p.retail = ed.querySelector('.p-rt') ? ed.querySelector('.p-rt').value : p.retail;
    });
  }

  /* ----- step 4: delivery + review + submit ----- */
  function step4HTML() {
    collectProducts();
    return '' +
      '<div class="card form-card">' +
        '<h3>Where can you deliver? 🚚</h3>' +
        '<p class="muted">Select the states you deliver to, and optionally add specific cities. Buyers use this to find you.</p>' +
        '<div class="fgroup">' +
          '<label>States</label>' +
          '<div class="state-select" id="stateSelect">' +
          MM.INDIAN_STATES.map(st =>
            '<label class="chip-check ' + (F.deliveryStates.includes(st) ? 'on' : '') + '">' +
            '<input type="checkbox" value="' + MM.esc(st) + '" ' + (F.deliveryStates.includes(st) ? 'checked' : '') + '> ' + MM.esc(st) +
            '</label>').join('') +
          '</div>' +
        '</div>' +
        '<div class="fgroup">' +
          '<label>Specific Cities (optional)</label>' +
          '<div class="city-chips" id="cityChips">' +
            F.deliveryCities.map(c =>
              '<span class="city-chip">' + MM.esc(c) + ' <button type="button" class="chip-x" data-city="' + MM.esc(c) + '">✕</button></span>').join('') +
            '<input type="text" id="cityInput" placeholder="Type a city &amp; press Enter…">' +
          '</div>' +
          '<p class="fhint">e.g. Mumbai, Pune, Thane, Bengaluru — press Enter after each city.</p>' +
        '</div>' +
        '<p class="hint-line">💡 Buyers in these locations will see your listing first. If the seller delivers to the buyer&apos;s city, the buyer can contact directly.</p>' +
      '</div>' +
      reviewHTML();
  }

  function reviewHTML() {
    const s = F.seller;
    const prods = activeProducts();
    return '' +
      '<div class="card form-card review">' +
        '<h3>Review your submission 📋</h3>' +
        '<div class="review-grid">' +
          '<div><span class="rl">Seller</span><b>' + MM.esc(s.name) + '</b></div>' +
          '<div><span class="rl">Location</span><b>' + MM.esc(s.city) + ', ' + MM.esc(s.state) + '</b></div>' +
          '<div><span class="rl">Contact</span><b>' + (s.mobile ? '📞 ' + MM.esc(s.mobile) : '') + (s.mobile && s.email ? ' • ' : '') + (s.email ? '✉️ ' + MM.esc(s.email) : '') + (!s.mobile && !s.email ? '— not provided' : '') + '</b></div>' +
          '<div><span class="rl">Categories</span><b>' + s.categories.map(id => MM.esc(MM.db.categoryName(id))).join(', ') + '</b></div>' +
          '<div><span class="rl">Products</span><b>' + prods.length + '</b></div>' +
          '<div><span class="rl">Delivery</span><b>' + MM.esc([F.deliveryStates.join(', '), F.deliveryCities.join(', ')].filter(Boolean).join(' • ') || '—') + '</b></div>' +
        '</div>' +
        '<p class="muted small">After submit: <b>Submitted → Admin Review → Approved → Live</b> on the website. You will get a reference ID.</p>' +
      '</div>';
  }

  function bindStep4() {
    MM.$$('#stateSelect .chip-check input').forEach(cb => {
      cb.addEventListener('change', () => {
        const st = cb.value;
        if (cb.checked) { if (!F.deliveryStates.includes(st)) F.deliveryStates.push(st); }
        else F.deliveryStates = F.deliveryStates.filter(x => x !== st);
        cb.closest('.chip-check').classList.toggle('on', cb.checked);
      });
    });
    const inp = MM.$('#cityInput');
    inp.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const city = inp.value.trim();
      if (!city) return;
      const exists = F.deliveryCities.some(c => c.toLowerCase() === city.toLowerCase());
      if (!exists) { F.deliveryCities.push(city); render(); }
    });
    MM.$$('#cityChips .chip-x').forEach(b =>
      b.addEventListener('click', () => {
        F.deliveryCities = F.deliveryCities.filter(c => c !== b.dataset.city);
        render();
      }));
  }

  /* ================= collect + validate per step ================= */
  function collectStep() {
    clearErrors();
    if (F.step === 1) {
      const name = MM.$('#fName').value.trim();
      const city = MM.$('#fCity').value.trim();
      const state = MM.$('#fState').value;
      const mobile = MM.digitsOnly(MM.$('#fMobile').value);
      const email = MM.$('#fEmail').value.trim();
      let ok = true;
      if (name.length < 2) { showErr('#errName', 'Please enter your name / farm name.'); ok = false; }
      if (city.length < 2) { showErr('#errCity', 'Please enter your city.'); ok = false; }
      if (!state) { showErr('#errState', 'Please select your state.'); ok = false; }
      if (mobile && (mobile.length < 10 || mobile.length > 12)) { showErr('#errMobile', 'Enter a valid mobile number (or leave it blank).'); ok = false; }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showErr('#errEmail', 'Enter a valid email (or leave it blank).'); ok = false; }
      if (!ok) return false;
      F.seller.name = name; F.seller.city = city; F.seller.state = state;
      F.seller.mobile = mobile; F.seller.email = email;
      return true;
    }
    if (F.step === 2) {
      const sel = MM.$$('#stepBody .cat-check input:checked').map(cb => cb.value);
      if (!sel.length) { showErr('#errCats', 'Select at least one category.'); return false; }
      F.seller.categories = sel;
      return true;
    }
    if (F.step === 3) {
      collectProducts();
      const act = activeProducts();
      let ok = true;
      act.forEach((p, i) => {
        if (!p.name) { MM.toast('Product ' + (i + 1) + ': name is required.', 'error'); ok = false; }
        else if (p.wholesale === '' || p.retail === '' || isNaN(+p.wholesale) || isNaN(+p.retail)) {
          MM.toast('Product "' + p.name + '": enter both wholesale & retail rates (₹/KG).', 'error'); ok = false;
        }
      });
      return ok;
    }
    return true;
  }

  function showErr(sel, msg) { const el = MM.$(sel); if (el) el.textContent = msg; }
  function clearErrors() { MM.$$('.ferr').forEach(e => e.textContent = ''); }

  /* ================= submit ================= */
  function onSubmit(e) {
    e.preventDefault();
    if (!collectStep()) return;
    collectProducts();

    const btn = MM.$('#btnSubmit');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
      const prods = activeProducts();

      if (F.isAdminEdit) {
        /* --- admin edit: update seller + products --- */
        MM.db.saveSeller({
          id: F.sellerId,
          name: F.seller.name, city: F.seller.city, state: F.seller.state,
          mobile: F.seller.mobile, email: F.seller.email,
          categories: F.seller.categories,
          deliveryStates: F.deliveryStates, deliveryCities: F.deliveryCities
        });
        const keepIds = [];
        prods.forEach(p => {
          MM.db.saveProduct({
            id: p.id || undefined, sellerId: F.sellerId, category: p.category,
            name: p.name, description: p.description, images: p.images,
            wholesale: +p.wholesale, retail: +p.retail
          });
          if (p.id) keepIds.push(p.id);
        });
        MM.db.listProducts(F.sellerId).forEach(p => {
          if (!keepIds.includes(p.id)) MM.db.deleteProduct(p.id);
        });
        MM.toast('Changes saved ✓');
        location.hash = '#/admin';
        return;
      }

      /* --- new submission --- */
      const seller = MM.db.saveSeller({
        name: F.seller.name, city: F.seller.city, state: F.seller.state,
        mobile: F.seller.mobile, email: F.seller.email,
        categories: F.seller.categories,
        deliveryStates: F.deliveryStates, deliveryCities: F.deliveryCities,
        status: 'pending'
      });
      prods.forEach(p => {
        MM.db.saveProduct({
          sellerId: seller.id, category: p.category, name: p.name,
          description: p.description, images: p.images,
          wholesale: +p.wholesale, retail: +p.retail
        });
      });
      renderSuccess(seller);
    } catch (err) {
      console.error(err);
      MM.toast('Could not save: ' + err.message, 'error');
      btn.disabled = false;
      btn.textContent = '✅ Submit for Review';
    }
  }

  function renderSuccess(seller) {
    window.scrollTo(0, 0);
    MM.$('#app').innerHTML =
      '<section class="container section center">' +
        '<div class="success-box card">' +
          '<div class="success-icon">🎉</div>' +
          '<h1>Submission received!</h1>' +
          '<p>Thank you, <b>' + MM.esc(seller.name) + '</b>. Your listing is now <b>pending admin review</b>.</p>' +
          '<div class="flow-line">Submitted → Admin Review → Approved → Live ✨</div>' +
          '<div class="ref-box">Your reference ID: <b>' + MM.esc(seller.ref) + '</b></div>' +
          '<p class="muted">Once approved, your products will appear on the public website automatically.</p>' +
          '<div class="btn-row center">' +
            '<a href="#/" class="btn btn-primary">← Back to Home</a>' +
            '<a href="#/sell" class="btn btn-ghost">Submit another seller</a>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

})(window.MM);
