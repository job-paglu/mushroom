/* ============================================================
   Mushroom Mandi — UI helpers (ui.js)
   ============================================================ */
window.MM = window.MM || {};

(function (MM) {
  'use strict';

  /* ---------- DOM helpers ---------- */
  MM.$ = function (sel, root) { return (root || document).querySelector(sel); };
  MM.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- formatting ---------- */
  MM.money = function (n) {
    if (n === '' || n == null || isNaN(n)) return '—';
    return '₹' + Number(n).toLocaleString('en-IN');
  };

  /* ---------- phone / contact utils ---------- */
  MM.digitsOnly = function (s) { return String(s || '').replace(/\D/g, ''); };
  // Indian numbers: 10-digit -> prefix 91 for tel/wa links
  MM.fullPhone = function (mobile) {
    const d = MM.digitsOnly(mobile);
    if (!d) return '';
    if (d.length === 10) return '91' + d;
    return d;
  };
  MM.telLink = function (mobile) { return 'tel:+' + MM.fullPhone(mobile); };
  MM.waLink = function (mobile, text) {
    return 'https://wa.me/' + MM.fullPhone(mobile) + (text ? '?text=' + encodeURIComponent(text) : '');
  };

  /* ---------- toast ---------- */
  MM.toast = function (msg, type) {
    const root = MM.$('#toastRoot');
    if (!root) return;
    const t = document.createElement('div');
    t.className = 'toast ' + (type || 'ok');
    t.textContent = msg;
    root.appendChild(t);
    setTimeout(() => t.classList.add('show'), 20);
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 350);
    }, 3200);
  };

  /* ---------- modal ---------- */
  function closeModal() {
    const root = MM.$('#modalRoot');
    if (root) root.innerHTML = '';
    document.body.classList.remove('modal-open');
  }
  MM.closeModal = closeModal;

  MM.openModal = function (html, opts) {
    opts = opts || {};
    closeModal();
    const root = MM.$('#modalRoot');
    const wrap = document.createElement('div');
    wrap.className = 'modal-overlay' + (opts.wide ? ' wide' : '');
    wrap.innerHTML =
      '<div class="modal-box" role="dialog" aria-modal="true">' +
      '<button class="modal-close" aria-label="Close">✕</button>' +
      '<div class="modal-content">' + html + '</div></div>';
    root.appendChild(wrap);
    document.body.classList.add('modal-open');
    wrap.addEventListener('click', (e) => { if (e.target === wrap) closeModal(); });
    MM.$('.modal-close', wrap).addEventListener('click', closeModal);
    return wrap;
  };

  MM.confirmDialog = function (message, onYes, danger) {
    const wrap = MM.openModal(
      '<div class="confirm-box">' +
      '<h3>' + MM.esc(message) + '</h3>' +
      '<div class="confirm-actions">' +
      '<button class="btn btn-ghost" data-act="no">Cancel</button>' +
      '<button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-act="yes">Yes, continue</button>' +
      '</div></div>'
    );
    wrap.querySelector('[data-act="no"]').addEventListener('click', MM.closeModal);
    wrap.querySelector('[data-act="yes"]').addEventListener('click', () => { MM.closeModal(); onYes(); });
  };

  /* ---------- Indian states list ---------- */
  MM.INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand',
    'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan',
    'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
    'West Bengal', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu',
    'Andaman & Nicobar Islands', 'Lakshadweep'
  ];

  /* ---------- status badge ---------- */
  MM.statusBadge = function (status) {
    const map = {
      pending: ['Pending Review', 'badge-amber'],
      approved: ['Approved', 'badge-green'],
      rejected: ['Rejected', 'badge-red']
    };
    const m = map[status] || [status, 'badge-gray'];
    return '<span class="badge ' + m[1] + '">' + m[0] + '</span>';
  };

  /* ---------- debounce ---------- */
  MM.debounce = function (fn, ms) {
    let t;
    return function () {
      const args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(ctx, args), ms || 250);
    };
  };

})(window.MM);
