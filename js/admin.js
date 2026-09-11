/* ============================================================
   Mushroom Mandi — Admin panel (admin.js)
   Login, dashboard, review (approve/reject/edit/delete), settings
   ============================================================ */
window.MM = window.MM || {};

(function (MM) {
  'use strict';

  const SESSION_KEY = 'mm_admin_session';
  const DEFAULT_PASS = 'admin123'; // documented in README — change it in Admin → Settings

  MM.isAdminSession = function () {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; }
  };

  /* ================= entry ================= */
  MM.renderAdmin = function (parts) {
    const sub = (parts || [])[0] || '';
    if (!MM.isAdminSession()) return renderLogin();

    if (sub === 'settings') return renderSettings();
    if (sub === 'seller' && parts[1]) return sellerDetailPage(parts[1]);
    renderDashboard(sub); // sub = status tab
  };

  function logout() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    location.hash = '#/admin';
    MM.router();
  }

  /* ================= LOGIN ================= */
  function renderLogin(msg) {
    MM.$('#app').innerHTML =
      '<section class="container section center">' +
        '<div class="card login-card">' +
          '<div class="login-icon">🔐</div>' +
          '<h1>Admin Panel</h1>' +
          '<p class="muted">Enter the admin password to manage seller submissions.</p>' +
          (msg ? '<div class="alert ' + msg.type + '">' + msg.text + '</div>' : '') +
          '<form id="loginForm">' +
            '<div class="fgroup">' +
              '<label for="adminPass">Password</label>' +
              '<input type="password" id="adminPass" placeholder="••••••••" autocomplete="current-password">' +
            '</div>' +
            '<button type="submit" class="btn btn-primary btn-block">Login</button>' +
          '</form>' +
          '<a href="#/" class="back-link mt">← Back to website</a>' +
        '</div>' +
      '</section>';

    MM.$('#loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const pass = MM.$('#adminPass').value;
      const settings = MM.db.getSettings();
      const hash = await MM.sha256(pass);
      const valid = settings.adminPassHash ? hash === settings.adminPassHash : pass === DEFAULT_PASS;
      if (valid) {
        try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e2) {}
        MM.toast('Welcome, Admin ✓');
        location.hash = '#/admin';
        MM.router();
      } else {
        renderLogin({ type: 'error', text: '❌ Wrong password. Try again.' });
      }
    });
  }

  /* ================= DASHBOARD ================= */
  function renderDashboard(tab) {
    tab = ['pending', 'approved', 'rejected', 'all'].includes(tab) ? tab : 'pending';
    const st = MM.db.stats();

    MM.$('#app').innerHTML =
      '<section class="container section">' +
        '<div class="admin-head">' +
          '<div>' +
            '<h1>Admin Dashboard</h1>' +
            '<p class="muted">Review seller submissions and manage the marketplace.</p>' +
          '</div>' +
          '<div class="admin-head-btns">' +
            '<a href="#/admin/settings" class="btn btn-ghost">⚙️ Settings</a>' +
            '<button class="btn btn-ghost" id="btnExport">⬇️ Backup</button>' +
            '<button class="btn btn-danger-ghost" id="btnLogout">Logout</button>' +
          '</div>' +
        '</div>' +

        '<div class="stats-grid">' +
          statCard('Total Sellers', st.totalSellers, '👥', 'blue') +
          statCard('Pending Review', st.pending, '⏳', 'amber') +
          statCard('Approved', st.approved, '✅', 'green') +
          statCard('Rejected', st.rejected, '❌', 'red') +
          statCard('Total Products', st.totalProducts, '📦', 'purple') +
        '</div>' +

        '<div class="tabs">' +
          tabLink('pending', 'Pending (' + st.pending + ')', tab) +
          tabLink('approved', 'Approved (' + st.approved + ')', tab) +
          tabLink('rejected', 'Rejected (' + st.rejected + ')', tab) +
          tabLink('all', 'All sellers (' + st.totalSellers + ')', tab) +
        '</div>' +
        '<div class="fgroup admin-search">' +
          '<input type="search" id="adminSearch" placeholder="🔎 Search seller, city, state, ref…">' +
        '</div>' +
        '<div id="adminList"></div>' +
      '</section>';

    renderAdminList(tab);

    MM.$('#adminSearch').addEventListener('input', MM.debounce(() => renderAdminList(tab), 200));
    MM.$('#btnLogout').addEventListener('click', logout);
    MM.$('#btnExport').addEventListener('click', exportBackup);
  }

  function statCard(label, n, icon, color) {
    return '<div class="stat-card card ' + color + '">' +
      '<span class="stat-icon">' + icon + '</span>' +
      '<span class="stat-n">' + n + '</span>' +
      '<span class="stat-l">' + label + '</span>' +
    '</div>';
  }

  function tabLink(id, label, active) {
    return '<a class="tab ' + (active === id ? 'active' : '') + '" href="#/admin' + (id === 'pending' ? '' : '/' + id) + '">' + label + '</a>';
  }

  function renderAdminList(tab) {
    const wrap = MM.$('#adminList');
    let sellers = tab === 'all' ? MM.db.listSellers(null) : MM.db.listSellers(tab);
    const q = (MM.$('#adminSearch').value || '').trim().toLowerCase();
    if (q) {
      sellers = sellers.filter(s =>
        [s.name, s.city, s.state, s.ref, (s.mobile || ''), (s.email || '')]
          .join(' ').toLowerCase().includes(q));
    }

    if (!sellers.length) {
      wrap.innerHTML = '<div class="empty-state card"><div class="empty-icon">📭</div>' +
        '<h3>No sellers here</h3><p>' + (tab === 'pending'
        ? 'New submissions will appear in this tab for review.'
        : 'Nothing in this tab yet.') + '</p></div>';
      return;
    }

    wrap.innerHTML = '<div class="admin-rows">' + sellers.map(s => {
      const prods = MM.db.listProducts(s.id);
      return '' +
        '<div class="admin-row card">' +
          '<div class="ar-main">' +
            '<div class="seller-avatar">' + MM.esc(initials(s.name)) + '</div>' +
            '<div class="ar-info">' +
              '<h4>' + MM.esc(s.name) + ' ' + MM.statusBadge(s.status) + '</h4>' +
              '<p class="muted">📍 ' + MM.esc(s.city) + ', ' + MM.esc(s.state) +
                ' • 🧾 ' + MM.esc(s.ref || '—') +
                ' • 📦 ' + prods.length + ' product' + (prods.length === 1 ? '' : 's') +
                ' • ' + MM.fmtDate(s.updatedAt) + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="ar-actions">' +
            '<button class="btn btn-sm btn-primary js-view" data-id="' + s.id + '">View</button>' +
            '<a class="btn btn-sm btn-ghost" href="#/edit/' + s.id + '">✏️ Edit</a>' +
            (s.status !== 'approved' ? '<button class="btn btn-sm btn-ok js-approve" data-id="' + s.id + '">✅ Approve</button>' : '') +
            (s.status !== 'rejected' ? '<button class="btn btn-sm btn-danger-ghost js-reject" data-id="' + s.id + '">❌ Reject</button>' : '') +
            '<button class="btn btn-sm btn-danger-ghost js-delete" data-id="' + s.id + '">🗑</button>' +
          '</div>' +
        '</div>';
    }).join('') + '</div>';

    bindRowActions(wrap);
  }

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] ? w[0].toUpperCase() : '').join('');
  }

  function bindRowActions(wrap) {
    wrap.addEventListener('click', (e) => {
      const v = e.target.closest('.js-view');
      const ap = e.target.closest('.js-approve');
      const rj = e.target.closest('.js-reject');
      const dl = e.target.closest('.js-delete');
      if (v) sellerDetailModal(v.dataset.id);
      if (ap) doApprove(ap.dataset.id);
      if (rj) doReject(rj.dataset.id);
      if (dl) doDelete(dl.dataset.id);
    });
  }

  function doApprove(id, silent) {
    const s = MM.db.setSellerStatus(id, 'approved');
    if (!silent) { MM.toast('✅ "' + s.name + '" approved — now LIVE on the website'); refreshAfterAction(); }
  }
  function doReject(id) {
    const s = MM.db.setSellerStatus(id, 'rejected');
    MM.toast('❌ "' + s.name + '" rejected — hidden from the website');
    refreshAfterAction();
  }
  function doDelete(id) {
    const s = MM.db.getSeller(id);
    MM.confirmDialog('Delete "' + (s ? s.name : 'this seller') + '" and all their products? This cannot be undone.', () => {
      MM.db.deleteSeller(id);
      MM.toast('Seller deleted');
      refreshAfterAction();
    }, true);
  }
  function refreshAfterAction() {
    const hash = location.hash;
    MM.closeModal();
    if (hash.indexOf('#/admin') === 0) MM.router();
  }

  /* ================= SELLER DETAIL (modal) ================= */
  function sellerDetailModal(id) {
    const s = MM.db.getSeller(id);
    if (!s) return;
    const prods = MM.db.listProducts(id);

    let html =
      '<div class="admin-detail">' +
        '<h3>' + MM.esc(s.name) + ' ' + MM.statusBadge(s.status) + '</h3>' +
        '<div class="detail-grid">' +
          '<div class="detail-box"><h4>📍 Location</h4><p>' + MM.esc(s.city) + ', ' + MM.esc(s.state) + '</p></div>' +
          '<div class="detail-box"><h4>🧾 Reference</h4><p>' + MM.esc(s.ref || '—') + '</p></div>' +
          '<div class="detail-box"><h4>📞 Mobile</h4><p>' + (s.mobile ? MM.esc(s.mobile) : '<i class="muted">not provided</i>') + '</p></div>' +
          '<div class="detail-box"><h4>✉️ Email</h4><p>' + (s.email ? MM.esc(s.email) : '<i class="muted">not provided</i>') + '</p></div>' +
          '<div class="detail-box"><h4>🏷 Categories</h4><p>' +
            (s.categories || []).map(cid => MM.db.categoryIcon(cid) + ' ' + MM.esc(MM.db.categoryName(cid))).join('<br>') + '</p></div>' +
          '<div class="detail-box"><h4>🚚 Delivery</h4><p>' +
            MM.esc([].concat(s.deliveryStates || [], s.deliveryCities || []).join(', ') || '—') + '</p></div>' +
        '</div>' +
        '<h4 class="mt">Products (' + prods.length + ')</h4>' +
        (prods.length ? prods.map(p => productAdminHTML(p)).join('') : '<p class="muted">No products.</p>') +
        '<div class="btn-row mt">' +
          (s.status !== 'approved' ? '<button class="btn btn-ok js-approve" data-id="' + s.id + '">✅ Approve &amp; Publish</button>' : '') +
          (s.status !== 'rejected' ? '<button class="btn btn-danger-ghost js-reject" data-id="' + s.id + '">❌ Reject</button>' : '') +
          '<a class="btn btn-ghost" href="#/edit/' + s.id + '">✏️ Edit full listing</a>' +
        '</div>' +
      '</div>';

    const wrap = MM.openModal(html, { wide: true });
    wrap.addEventListener('click', (e) => {
      const ap = e.target.closest('.js-approve');
      const rj = e.target.closest('.js-reject');
      if (ap) doApprove(ap.dataset.id);
      if (rj) doReject(rj.dataset.id);
    });
  }

  function productAdminHTML(p) {
    const img = (p.images && p.images[0]) || MM.placeholderImage(p.name, MM.db.categoryIcon(p.category));
    return '' +
      '<div class="admin-prod card">' +
        '<img class="prod-thumb" src="' + img + '" alt="">' +
        '<div class="ap-info">' +
          '<p class="prod-name">' + MM.esc(p.name) + '</p>' +
          '<p class="muted small">' + MM.db.categoryIcon(p.category) + ' ' + MM.esc(MM.db.categoryName(p.category)) +
            (p.description ? ' — ' + MM.esc(p.description) : '') + '</p>' +
          '<p class="prod-prices">' +
            '<span class="price-chip">Whole: <b>' + MM.money(p.wholesale) + '</b>/kg</span>' +
            '<span class="price-chip">Retail: <b>' + MM.money(p.retail) + '</b>/kg</span>' +
          '</p>' +
        '</div>' +
        '<div class="ap-imgs">' + (p.images || []).map(src => '<img class="img-thumb-sm" src="' + src + '">').join('') + '</div>' +
      '</div>';
  }

  /* full page version */
  function sellerDetailPage(id) {
    renderDashboard('all');
    setTimeout(() => sellerDetailModal(id), 60);
  }

  /* ================= SETTINGS ================= */
  function renderSettings() {
    const settings = MM.db.getSettings();
    MM.$('#app').innerHTML =
      '<section class="container section form-page">' +
        '<a href="#/admin" class="back-link">← Back to Dashboard</a>' +
        '<h1>⚙️ Admin Settings</h1>' +

        '<div class="card form-card">' +
          '<h3>Categories</h3>' +
          '<p class="muted">Rename the public categories — changes appear instantly on the website.</p>' +
          '<div id="catRows">' +
            settings.categories.map((c, i) =>
              '<div class="frow two cat-edit" data-i="' + i + '">' +
                '<div class="fgroup"><label>Category ' + (i + 1) + ' name</label>' +
                '<input type="text" class="c-name" value="' + MM.esc(c.name) + '"></div>' +
                '<div class="fgroup"><label>Icon (emoji)</label>' +
                '<input type="text" class="c-icon" value="' + MM.esc(c.icon) + '" maxlength="4"></div>' +
              '</div>').join('') +
          '</div>' +
        '</div>' +

        '<div class="card form-card">' +
          '<h3>Marketplace Rules</h3>' +
          '<div class="frow two">' +
            '<div class="fgroup"><label>Max products per seller</label>' +
            '<input type="number" id="setMaxProd" min="1" max="10" value="' + (settings.maxProducts || 3) + '">' +
            '<p class="fhint">Seller form allows this many products (default 3).</p></div>' +
            '<div class="fgroup"><label>Site name</label>' +
            '<input type="text" id="setSiteName" value="' + MM.esc(settings.siteName || 'AK Mushrooms') + '"></div>' +
          '</div>' +
        '</div>' +

        '<div class="card form-card">' +
          '<h3>Change Admin Password</h3>' +
          '<div class="frow two">' +
            '<div class="fgroup"><label>New password</label><input type="password" id="setPass1" placeholder="min 6 characters"></div>' +
            '<div class="fgroup"><label>Confirm new password</label><input type="password" id="setPass2"></div>' +
          '</div>' +
          '<p class="fhint">Default password is <b>admin123</b> — please change it after first login.</p>' +
        '</div>' +

        '<div class="btn-row">' +
          '<button class="btn btn-primary" id="btnSaveSettings">💾 Save Settings</button>' +
          '<button class="btn btn-ghost" id="btnResetDemo">⚠️ Reset all data</button>' +
        '</div>' +
      '</section>';

    MM.$('#btnSaveSettings').addEventListener('click', async () => {
      const cats = MM.$$('#catRows .cat-edit').map(row => {
        const i = +row.dataset.i;
        return {
          id: settings.categories[i].id,
          name: row.querySelector('.c-name').value.trim() || settings.categories[i].name,
          icon: row.querySelector('.c-icon').value.trim() || settings.categories[i].icon
        };
      });
      const patch = {
        categories: cats,
        maxProducts: Math.max(1, Math.min(10, parseInt(MM.$('#setMaxProd').value, 10) || 3)),
        siteName: MM.$('#setSiteName').value.trim() || 'AK Mushrooms'
      };
      const p1 = MM.$('#setPass1').value, p2 = MM.$('#setPass2').value;
      if (p1 || p2) {
        if (p1.length < 6) { MM.toast('Password must be at least 6 characters.', 'error'); return; }
        if (p1 !== p2) { MM.toast('Passwords do not match.', 'error'); return; }
        patch.adminPassHash = await MM.sha256(p1);
      }
      MM.db.saveSettings(patch);
      MM.toast('Settings saved ✓');
      renderSettings();
    });

    MM.$('#btnResetDemo').addEventListener('click', () => {
      MM.confirmDialog('Delete ALL sellers and products? The marketplace goes back to empty. This cannot be undone.', () => {
        try { localStorage.removeItem('mm_db_v2'); localStorage.removeItem('mm_db_v1'); } catch (e) {}
        location.reload();
      }, true);
    });
  }

  /* ================= backup ================= */
  function exportBackup() {
    const blob = new Blob([MM.db.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mushroom-mandi-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    MM.toast('Backup downloaded ✓');
  }

})(window.MM);
