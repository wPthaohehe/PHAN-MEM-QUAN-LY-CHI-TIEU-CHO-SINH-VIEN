/* ============================================================
   Poketto - Thư viện giao diện dùng chung cho mọi trang bên trong
   (sidebar/topbar, modal, toast, định dạng tiền/ngày, form giao dịch)
   Phụ thuộc: auth.js (window.Auth), storage.js (window.Store)
   Phải nạp SAU auth.js + storage.js, và TRƯỚC script riêng của từng trang.
   ============================================================ */
(function (global) {
  'use strict';

  // Áp dụng chế độ tối ngay khi tệp này được nạp, tránh nháy sáng khi tải trang.
  try {
    if (localStorage.getItem('poketto_theme') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) { /* bỏ qua nếu trình duyệt chặn localStorage */ }

  const NAV_ITEMS = [
    { key: 'dashboard', label: 'Trang chủ', icon: '🏠', url: '../dashboard/dashboard.html' },
    { key: 'reports', label: 'Báo cáo', icon: '📊', url: '../reports/reports.html' },
    { key: 'transactions', label: 'Giao dịch', icon: '🧾', url: '../transactions/transactions.html' },
    { key: 'budgets', label: 'Ngân sách', icon: '🎯', url: '../budgets/budgets.html' },
    { key: 'categories', label: 'Danh mục', icon: '🏷️', url: '../categories/categories.html' },
    { key: 'profile', label: 'Cài đặt', icon: '⚙️', url: '../profile/profile.html' }
  ];

  const WEEKDAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  function dateChip(dateStr) {
    const p = String(dateStr || '').split('-');
    if (p.length !== 3) return '';
    return Number(p[2]) + ' th ' + Number(p[1]) + ', ' + p[0];
  }
  function formatDateLong(dateStr) {
    const p = String(dateStr || '').split('-');
    if (p.length !== 3) return '';
    const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return WEEKDAYS[d.getDay()] + ', ' + p[2] + '/' + p[1] + '/' + p[0];
  }

  /* ---------- Tiện ích cơ bản ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  const moneyFmt = new Intl.NumberFormat('vi-VN');

  function formatMoney(n) {
    n = Number(n) || 0;
    return moneyFmt.format(n) + ' ₫';
  }

  function formatShort(n) {
    const v = Number(n) || 0;
    const a = Math.abs(v);
    const f = function (x) { return String(Math.round(x * 10) / 10).replace('.', ','); };
    if (a >= 1e9) return f(a / 1e9) + ' tỷ';
    if (a >= 1e6) return f(a / 1e6) + 'tr';
    if (a >= 1e3) return f(a / 1e3) + 'k';
    return String(a);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const p = String(dateStr).split('-');
    if (p.length !== 3) return dateStr;
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  const MONTH_NAMES_PREFIX = 'Tháng ';
  function formatMonth(monthStr) {
    if (!monthStr) return '';
    const p = String(monthStr).split('-');
    if (p.length !== 2) return monthStr;
    return MONTH_NAMES_PREFIX + Number(p[1]) + '/' + p[0];
  }

  function amountHtml(t) {
    const sign = t.type === 'income' ? '+' : '−';
    return '<span class="amount ' + esc(t.type) + '">' + sign + formatMoney(t.amount) + '</span>';
  }

  function errMsg(e) {
    if (e && e.message) return e.message;
    return 'Đã có lỗi xảy ra, vui lòng thử lại.';
  }

  function parseMoney(str) {
    const digits = String(str == null ? '' : str).replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }

  function bindMoneyInput(input) {
    if (!input) return;
    input.addEventListener('input', function () {
      const n = parseMoney(input.value);
      input.value = n ? moneyFmt.format(n) : '';
    });
  }

  /* ---------- Toast ---------- */
  function toastRoot() {
    let r = document.getElementById('toastRoot');
    if (!r) {
      r = el('div', 'toast-root');
      r.id = 'toastRoot';
      document.body.appendChild(r);
    }
    return r;
  }

  function toast(message, type) {
    const root = toastRoot();
    const node = el('div', 'toast ' + (type || 'info'));
    node.textContent = message;
    root.appendChild(node);
    setTimeout(function () {
      node.classList.add('hide');
      setTimeout(function () { node.remove(); }, 320);
    }, 3200);
  }

  /* ---------- Modal ---------- */
  let openModalCount = 0;

  function openModal(opts) {
    opts = opts || {};
    const overlay = el('div', 'modal-overlay');
    const modal = el('div', 'modal');
    if (opts.width) modal.style.maxWidth = opts.width;

    const head = el('div', 'modal-head');
    const h3 = document.createElement('h3');
    h3.textContent = opts.title || '';
    const closeBtn = el('button', 'icon-btn');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Đóng');
    closeBtn.innerHTML = '✕';
    head.appendChild(h3);
    head.appendChild(closeBtn);

    const body = el('div', 'modal-body');
    if (opts.body instanceof Node) body.appendChild(opts.body);
    else if (typeof opts.body === 'string') body.innerHTML = opts.body;

    modal.appendChild(head);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');
    openModalCount++;

    let closed = false;
    function onKeydown(e) {
      if (e.key === 'Escape') closeModal();
    }
    document.addEventListener('keydown', onKeydown);

    function closeModal() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKeydown);
      overlay.remove();
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) document.body.classList.remove('modal-open');
      if (typeof opts.onClose === 'function') opts.onClose();
    }

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    return { close: closeModal, el: modal };
  }

  function confirmDialog(message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      const body = el('div', 'confirm-text');
      body.textContent = message;

      const actions = el('div', 'modal-actions');
      const cancelBtn = el('button', 'btn ghost');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Hủy';
      const okBtn = el('button', 'btn ' + (opts.danger ? 'danger' : 'primary'));
      okBtn.type = 'button';
      okBtn.textContent = opts.okText || 'Đồng ý';
      actions.appendChild(cancelBtn);
      actions.appendChild(okBtn);
      body.appendChild(actions);

      const modal = openModal({
        title: opts.title || 'Xác nhận',
        body: body,
        width: '420px',
        onClose: function () { resolve(false); }
      });

      cancelBtn.addEventListener('click', function () { modal.close(); });
      okBtn.addEventListener('click', function () { resolve(true); modal.close(); });
    });
  }

  /* ---------- Khung trang (sidebar + topbar) ---------- */
  function shellTemplate(user, active, title, greeting) {
    const initial = String(user.fullName || '?').trim().charAt(0).toUpperCase() || '?';
    const nav = NAV_ITEMS.map(function (item) {
      return '<a class="nav-link' + (item.key === active ? ' active' : '') + '" href="' + item.url + '">' +
        '<span class="nav-icon">' + item.icon + '</span><span>' + esc(item.label) + '</span></a>';
    }).join('');

    const titleHtml = greeting
      ? '<span class="topbar-title greeting">' + esc(greeting) + '</span>'
      : '<span class="topbar-title">' + esc(title || '') + '</span>';

    return (
      '<div class="app-shell">' +
        '<div class="sidebar-backdrop" id="sidebarBackdrop"></div>' +
        '<aside class="sidebar" id="sidebar">' +
          '<div class="sidebar-brand"><img src="../assets/poketto-logo.png" alt="Poketto"><span>Poketto</span></div>' +
          '<nav class="sidebar-nav">' + nav + '</nav>' +
          '<div class="sidebar-foot">' +
            '<div class="user-chip"><span class="avatar">' + esc(initial) + '</span>' +
              '<div class="user-info"><strong>' + esc(user.fullName || '') + '</strong><small>' + esc(user.email || '') + '</small></div></div>' +
            '<button class="btn ghost sm block" id="logoutBtn">Đăng xuất</button>' +
          '</div>' +
        '</aside>' +
        '<div class="app-main">' +
          '<header class="topbar">' +
            '<button class="icon-btn menu-btn" id="menuBtn" aria-label="Mở menu">☰</button>' +
            titleHtml +
            '<span class="spacer"></span>' +
            '<span class="date-chip hide-sm">📅 ' + esc(dateChip(global.Store.util.today())) + '</span>' +
            '<form class="search-box hide-sm" id="topSearchForm"><input type="search" id="topSearch" placeholder="Tìm kiếm"></form>' +
            '<div style="position:relative">' +
              '<button type="button" class="icon-btn bell-btn" id="bellBtn" aria-label="Thông báo">🔔</button>' +
            '</div>' +
            '<a class="topbar-user" href="../profile/profile.html"><span class="status-dot"></span><span class="hide-sm">' + esc(user.fullName || '') + '</span></a>' +
          '</header>' +
          '<main class="content" id="content"></main>' +
        '</div>' +
      '</div>'
    );
  }

  function initShell(opts) {
    opts = opts || {};
    const user = global.Auth.requireLogin();
    if (!user) return null;

    document.title = (opts.title ? opts.title + ' · ' : '') + 'Poketto';
    document.body.innerHTML = shellTemplate(user, opts.active, opts.title, opts.greeting);

    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    function closeSidebar() { sidebar.classList.remove('open'); backdrop.classList.remove('show'); }
    document.getElementById('menuBtn').addEventListener('click', function () {
      sidebar.classList.toggle('open');
      backdrop.classList.toggle('show');
    });
    backdrop.addEventListener('click', closeSidebar);
    sidebar.querySelectorAll('.nav-link').forEach(function (a) { a.addEventListener('click', closeSidebar); });

    document.getElementById('logoutBtn').addEventListener('click', function () {
      global.Auth.logout();
    });

    document.getElementById('topSearchForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const q = document.getElementById('topSearch').value.trim();
      location.href = '../transactions/transactions.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });

    const bellBtn = document.getElementById('bellBtn');
    bellBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      const existing = document.querySelector('.bell-pop');
      if (existing) { existing.remove(); return; }
      const pop = el('div', 'bell-pop');
      pop.textContent = 'Bạn chưa có thông báo mới.';
      bellBtn.parentElement.appendChild(pop);
      setTimeout(function () {
        document.addEventListener('click', function onDoc() {
          pop.remove();
          document.removeEventListener('click', onDoc);
        });
      }, 0);
    });

    if (typeof opts.onDataChange === 'function') {
      window.addEventListener('storage', function (e) {
        if (e.key && e.key.indexOf('poketto_') === 0) opts.onDataChange();
      });
    }

    return user;
  }

  /* ---------- Form thêm/sửa giao dịch (dùng chung cho dashboard/transactions) ---------- */
  function openTransactionForm(txn) {
    return new Promise(function (resolve) {
      (async function () {
        const isEdit = !!txn;
        let cats;
        try {
          cats = await global.Store.categories.list();
        } catch (e) {
          toast(errMsg(e), 'error');
          resolve(false);
          return;
        }

        let type = isEdit
          ? ((cats.find(function (c) { return c.id === txn.categoryId; }) || {}).type || 'expense')
          : 'expense';

        const form = el('form', 'form');
        form.noValidate = true;
        form.innerHTML =
          '<label>Loại</label>' +
          '<div class="segmented" id="tType"><button type="button" data-type="expense">Khoản chi</button><button type="button" data-type="income">Khoản thu</button></div>' +
          '<label for="tCat">Danh mục</label><select id="tCat"></select>' +
          '<span class="field-error" id="tCatErr"></span>' +
          '<label for="tAmount">Số tiền (₫)</label>' +
          '<input type="text" id="tAmount" inputmode="numeric" autocomplete="off" placeholder="VD: 50.000">' +
          '<span class="field-error" id="tAmountErr"></span>' +
          '<label for="tDate">Ngày</label><input type="date" id="tDate">' +
          '<span class="field-error" id="tDateErr"></span>' +
          '<label for="tNote">Ghi chú <small class="muted">(không bắt buộc)</small></label>' +
          '<input type="text" id="tNote" maxlength="200" placeholder="VD: Ăn trưa">' +
          '<span class="field-error form-error" id="tErr"></span>' +
          '<div class="modal-actions"><button type="button" class="btn ghost" id="tCancel">Hủy</button>' +
          '<button type="submit" class="btn primary">' + (isEdit ? 'Lưu thay đổi' : 'Thêm giao dịch') + '</button></div>';

        const $ = function (sel) { return form.querySelector(sel); };
        const catSelect = $('#tCat');

        function fillCategories() {
          const opts = cats.filter(function (c) { return c.type === type; });
          catSelect.innerHTML = opts.length
            ? opts.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.icon) + ' ' + esc(c.name) + '</option>'; }).join('')
            : '<option value="">-- Chưa có danh mục loại này --</option>';
          if (isEdit && txn.categoryId && opts.some(function (c) { return c.id === txn.categoryId; })) {
            catSelect.value = txn.categoryId;
          }
        }

        function paintType() {
          form.querySelectorAll('#tType button').forEach(function (b) {
            b.classList.toggle('active', b.dataset.type === type);
            b.classList.toggle('income', b.dataset.type === 'income' && type === 'income');
          });
        }

        fillCategories();
        paintType();
        $('#tDate').value = isEdit ? txn.date : global.Store.util.today();
        $('#tNote').value = isEdit ? (txn.note || '') : '';
        if (isEdit) $('#tAmount').value = moneyFmt.format(txn.amount);
        bindMoneyInput($('#tAmount'));

        form.querySelectorAll('#tType button').forEach(function (b) {
          b.addEventListener('click', function () {
            type = b.dataset.type;
            paintType();
            fillCategories();
          });
        });

        const modal = openModal({
          title: isEdit ? 'Sửa giao dịch' : 'Thêm giao dịch',
          body: form,
          width: '460px',
          onClose: function () { resolve(false); }
        });
        $('#tCancel').addEventListener('click', function () { modal.close(); });

        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          $('#tErr').textContent = ''; $('#tCatErr').textContent = ''; $('#tAmountErr').textContent = ''; $('#tDateErr').textContent = '';

          const categoryId = catSelect.value;
          const amount = parseMoney($('#tAmount').value);
          const date = $('#tDate').value;
          const note = $('#tNote').value.trim();
          let bad = false;
          if (!categoryId) { $('#tCatErr').textContent = 'Vui lòng chọn danh mục.'; bad = true; }
          if (amount <= 0) { $('#tAmountErr').textContent = 'Số tiền phải lớn hơn 0.'; bad = true; }
          if (!date) { $('#tDateErr').textContent = 'Vui lòng chọn ngày.'; bad = true; }
          if (bad) return;

          const data = { categoryId: categoryId, amount: amount, date: date, note: note };
          try {
            if (!isEdit) {
              const dup = await global.Store.transactions.findDuplicate(data);
              if (dup) {
                const ok = await confirmDialog('Có vẻ bạn đã ghi giao dịch giống hệt thế này rồi. Vẫn thêm thêm một lần nữa?', { title: 'Giao dịch trùng lặp', okText: 'Vẫn thêm' });
                if (!ok) return;
              }
            }
            if (isEdit) await global.Store.transactions.update(txn.id, data);
            else await global.Store.transactions.add(data);
            toast(isEdit ? 'Đã cập nhật giao dịch.' : 'Đã thêm giao dịch.', 'success');
            resolve(true);
            modal.close();
          } catch (err) {
            $('#tErr').textContent = errMsg(err);
          }
        });
      })();
    });
  }

  global.UI = {
    esc: esc,
    el: el,
    formatMoney: formatMoney,
    formatShort: formatShort,
    formatDate: formatDate,
    formatDateLong: formatDateLong,
    formatMonth: formatMonth,
    amountHtml: amountHtml,
    errMsg: errMsg,
    parseMoney: parseMoney,
    bindMoneyInput: bindMoneyInput,
    toast: toast,
    confirm: confirmDialog,
    openModal: openModal,
    initShell: initShell,
    openTransactionForm: openTransactionForm
  };
})(window);