(function () {
  'use strict';

  const user = UI.initShell({ active: 'transactions', title: 'Giao dịch', onDataChange: refresh });
  if (!user) return;

  const root = document.getElementById('content');
  const U = Store.util;
  const esc = UI.esc;
  const PAGE_SIZE = 15;

  const state = { preset: 'month', from: '', to: '', type: '', categoryId: '', q: '', page: 1 };
  let cats = [];
  let current = []; // kết quả sau khi lọc

  function applyPreset(p) {
    state.preset = p;
    const today = U.today();
    if (p === 'month') {
      const r = U.monthRange(U.monthOf(today));
      state.from = r.from; state.to = r.to;
    } else if (p === 'lastMonth') {
      const r = U.monthRange(U.addMonths(U.monthOf(today), -1));
      state.from = r.from; state.to = r.to;
    } else if (p === 'all') {
      state.from = ''; state.to = '';
    }
  }

  function buildLayout() {
    const expenseOpts = cats.filter(function (c) { return c.type === 'expense'; })
      .map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.icon) + ' ' + esc(c.name) + '</option>'; }).join('');
    const incomeOpts = cats.filter(function (c) { return c.type === 'income'; })
      .map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.icon) + ' ' + esc(c.name) + '</option>'; }).join('');

    root.innerHTML =
      '<div class="page-head"><div><h1>Giao dịch</h1><p class="muted">Xem, tìm kiếm, sửa và xóa các khoản thu chi.</p></div>' +
      '<div class="row-actions"><button class="btn ghost" id="exportBtn">⬇ Xuất CSV</button>' +
      '<button class="btn primary" id="addBtn">＋ Thêm giao dịch</button></div></div>' +

      '<div class="card" style="margin-bottom:16px">' +
        '<div class="chips" id="presets">' +
          '<button class="chip" data-preset="month">Tháng này</button>' +
          '<button class="chip" data-preset="lastMonth">Tháng trước</button>' +
          '<button class="chip" data-preset="all">Tất cả</button>' +
        '</div>' +
        '<div class="filters">' +
          '<div><label for="fFrom">Từ ngày</label><input type="date" id="fFrom"></div>' +
          '<div><label for="fTo">Đến ngày</label><input type="date" id="fTo"></div>' +
          '<div><label for="fType">Loại</label><select id="fType"><option value="">Tất cả</option><option value="expense">Khoản chi</option><option value="income">Khoản thu</option></select></div>' +
          '<div><label for="fCat">Danh mục</label><select id="fCat"><option value="">Tất cả danh mục</option>' +
            '<optgroup label="Khoản chi">' + expenseOpts + '</optgroup><optgroup label="Khoản thu">' + incomeOpts + '</optgroup></select></div>' +
          '<div><label for="fQ">Tìm kiếm</label><input type="search" id="fQ" placeholder="Ghi chú hoặc danh mục..."></div>' +
        '</div>' +
      '</div>' +

      '<div class="grid three" id="totals"></div>' +
      '<div class="card"><div id="listBox"></div></div>';

    root.querySelector('#fFrom').value = state.from;
    root.querySelector('#fTo').value = state.to;

    root.querySelector('#addBtn').addEventListener('click', async function () { if (await UI.openTransactionForm()) refresh(); });
    root.querySelector('#exportBtn').addEventListener('click', exportCsv);

    root.querySelectorAll('#presets .chip').forEach(function (b) {
      b.addEventListener('click', function () {
        applyPreset(b.dataset.preset);
        root.querySelector('#fFrom').value = state.from;
        root.querySelector('#fTo').value = state.to;
        state.page = 1;
        refresh();
      });
    });

    const bind = function (id, key, evt) {
      root.querySelector(id).addEventListener(evt, function (e) {
        state[key] = e.target.value;
        state.page = 1;
        if (key === 'from' || key === 'to') state.preset = 'custom';
        refresh();
      });
    };
    bind('#fFrom', 'from', 'change');
    bind('#fTo', 'to', 'change');
    bind('#fType', 'type', 'change');
    bind('#fCat', 'categoryId', 'change');
    bind('#fQ', 'q', 'input');
  }

  async function refresh() {
    try {
      if (state.from && state.to && state.from > state.to) {
        root.querySelector('#listBox').innerHTML = '<div class="empty small"><div class="empty-icon">📅</div><p>"Từ ngày" đang lớn hơn "Đến ngày". Hãy chỉnh lại khoảng thời gian.</p></div>';
        root.querySelector('#totals').innerHTML = '';
        current = [];
        return;
      }
      cats = await Store.categories.list();
      current = await Store.transactions.list({
        type: state.type, categoryId: state.categoryId, from: state.from, to: state.to, q: state.q
      });
      renderList();
    } catch (e) {
      root.querySelector('#listBox').innerHTML = '<div class="empty"><div class="empty-icon">😿</div><p>' + esc(UI.errMsg(e)) + '</p></div>';
    }
  }

  function renderList() {
    root.querySelectorAll('#presets .chip').forEach(function (b) {
      b.classList.toggle('active', b.dataset.preset === state.preset);
    });

    let income = 0, expense = 0;
    current.forEach(function (t) { if (t.type === 'income') income += t.amount; else expense += t.amount; });
    root.querySelector('#totals').innerHTML =
      '<div class="card stat-card income"><span class="label">Tổng thu</span><span class="value" id="totIncome">' + UI.formatMoney(income) + '</span></div>' +
      '<div class="card stat-card expense"><span class="label">Tổng chi</span><span class="value" id="totExpense">' + UI.formatMoney(expense) + '</span></div>' +
      '<div class="card stat-card ' + (income - expense < 0 ? 'neg' : '') + '"><span class="label">Chênh lệch (' + current.length + ' giao dịch)</span><span class="value" id="totNet">' +
      (income - expense < 0 ? '−' : '') + UI.formatMoney(Math.abs(income - expense)) + '</span></div>';

    const box = root.querySelector('#listBox');
    if (!current.length) {
      const filtering = state.type || state.categoryId || state.q || state.from || state.to;
      box.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div><h3>Không có giao dịch nào</h3><p>' +
        (filtering ? 'Không có giao dịch khớp với bộ lọc hiện tại. Thử chọn "Tất cả" hoặc đổi từ khóa.' : 'Hãy thêm giao dịch đầu tiên của bạn.') + '</p></div>';
      return;
    }

    const pages = Math.max(1, Math.ceil(current.length / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    const slice = current.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

    box.innerHTML =
      '<div class="table-wrap"><table class="table"><thead><tr><th>Ngày</th><th>Danh mục</th><th>Ghi chú</th><th class="num">Số tiền</th><th></th></tr></thead><tbody id="txnBody">' +
      slice.map(function (t) {
        return '<tr data-id="' + esc(t.id) + '">' +
          '<td>' + UI.formatDate(t.date) + '</td>' +
          '<td><span class="cat-cell"><span class="cat-dot" style="background:' + esc(t.categoryColor) + '22">' + esc(t.categoryIcon) + '</span>' + esc(t.categoryName) + '</span></td>' +
          '<td class="note" title="' + esc(t.note) + '">' + esc(t.note) + '</td>' +
          '<td class="num">' + UI.amountHtml(t) + '</td>' +
          '<td class="actions"><button class="icon-btn" data-act="edit" title="Sửa" aria-label="Sửa">✏️</button>' +
          '<button class="icon-btn danger" data-act="delete" title="Xóa" aria-label="Xóa">🗑️</button></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="pager"><span class="muted">Trang ' + state.page + '/' + pages + '</span><div class="row-actions">' +
      '<button class="btn ghost sm" id="prevPage"' + (state.page <= 1 ? ' disabled' : '') + '>‹ Trước</button>' +
      '<button class="btn ghost sm" id="nextPage"' + (state.page >= pages ? ' disabled' : '') + '>Sau ›</button></div></div>';

    box.querySelector('#prevPage').addEventListener('click', function () { state.page--; renderList(); });
    box.querySelector('#nextPage').addEventListener('click', function () { state.page++; renderList(); });

    box.querySelector('#txnBody').addEventListener('click', async function (e) {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const id = btn.closest('tr').dataset.id;
      const txn = current.find(function (t) { return t.id === id; });
      if (!txn) return;
      if (btn.dataset.act === 'edit') {
        if (await UI.openTransactionForm(txn)) refresh();
      } else {
        const ok = await UI.confirm(
          'Xóa giao dịch "' + (txn.note || txn.categoryName) + '" (' + UI.formatMoney(txn.amount) + ' ngày ' + UI.formatDate(txn.date) + ')? Hành động này không thể hoàn tác.',
          { title: 'Xóa giao dịch', okText: 'Xóa', danger: true });
        if (!ok) return;
        try {
          await Store.transactions.remove(id);
          UI.toast('Đã xóa giao dịch.', 'success');
          refresh();
        } catch (err) { UI.toast(UI.errMsg(err), 'error'); }
      }
    });
  }

  function csvCell(v) {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function exportCsv() {
    if (!current.length) { UI.toast('Không có giao dịch nào để xuất.', 'info'); return; }
    const rows = [['Ngày', 'Loại', 'Danh mục', 'Số tiền', 'Ghi chú']].concat(current.map(function (t) {
      return [UI.formatDate(t.date), t.type === 'income' ? 'Thu' : 'Chi', t.categoryName, t.amount, t.note];
    }));
    const csv = '\uFEFF' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'giao-dich-' + U.today() + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    UI.toast('Đã xuất ' + current.length + ' giao dịch ra file CSV.', 'success');
  }

  (async function init() {
    try {
      cats = await Store.categories.list();
      const params = new URLSearchParams(location.search);
      const q = params.get('q');
      if (q) { applyPreset('all'); state.q = q; } else { applyPreset('month'); }
      buildLayout();
      if (q) root.querySelector('#fQ').value = q;
      refresh();
    } catch (e) {
      root.innerHTML = '<div class="card"><div class="empty"><p>' + esc(UI.errMsg(e)) + '</p></div></div>';
    }
  })();
})();