(function () {
  'use strict';

  const U = Store.util;
  const esc = UI.esc;
  let month = U.monthOf(U.today());

  function lastWords(fullName, n) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    return parts.slice(-n).join(' ') || 'bạn';
  }

  const preUser = window.Auth.requireLogin();
  const user = UI.initShell({
    active: 'dashboard',
    title: 'Tổng quan',
    greeting: preUser ? ('Xin chào, ' + lastWords(preUser.fullName, 2) + '!') : '',
    onDataChange: render
  });
  if (!user) return;

  const root = document.getElementById('content');

  function budgetRow(b) {
    return '<li class="item-row">' +
      '<div class="row-top"><span class="cat-cell"><span class="cat-dot" style="background:' + esc(b.categoryColor) + '22">' + esc(b.categoryIcon) + '</span><strong>' + esc(b.categoryName) + '</strong></span>' +
      '<span class="badge ' + (b.status === 'ok' ? '' : b.status) + '">' + b.percent + '%</span></div>' +
      '<div class="progress ' + b.status + '"><span style="width:' + Math.min(100, b.percent) + '%"></span></div>' +
      '<div class="row-sub"><span>Đã chi ' + UI.formatMoney(b.spent) + ' / ' + UI.formatMoney(b.limit) + '</span>' +
      '<span>' + (b.remaining >= 0 ? 'Còn ' + UI.formatMoney(b.remaining) : 'Vượt ' + UI.formatMoney(-b.remaining)) + '</span></div></li>';
  }

  function goalRow(g) {
    return '<li class="item-row">' +
      '<div class="row-top"><strong>🎯 ' + esc(g.name) + '</strong><span class="badge ' + (g.done ? 'done' : '') + '">' + (g.done ? 'Hoàn thành' : g.percent + '%') + '</span></div>' +
      '<div class="progress"><span style="width:' + g.percent + '%"></span></div>' +
      '<div class="row-sub"><span>' + UI.formatMoney(g.saved) + ' / ' + UI.formatMoney(g.target) + '</span>' +
      '<span>' + (g.done ? 'Đã đạt mục tiêu 🎉' : 'Còn thiếu ' + UI.formatMoney(g.remaining)) + '</span></div></li>';
  }

  function groupByDate(list) {
    const order = [];
    const map = {};
    list.forEach(function (t) {
      if (!map[t.date]) { map[t.date] = []; order.push(t.date); }
      map[t.date].push(t);
    });
    return order.map(function (d) { return { date: d, items: map[d] }; });
  }

  function txnRowHtml(t) {
    return '<div class="txn-row">' +
      '<span class="icon-avatar" style="background:' + esc(t.categoryColor) + '22">' + esc(t.categoryIcon) + '</span>' +
      '<div class="txn-main"><strong>' + esc(t.note || t.categoryName) + '</strong><small>' + esc(t.categoryName) + '</small></div>' +
      UI.amountHtml(t) +
      '</div>';
  }

  function recentHtml(all) {
    if (!all.length) return '<div class="empty small"><div class="empty-icon">🧾</div><p>Chưa có giao dịch nào.</p></div>';
    const groups = groupByDate(all.slice(0, 8));
    return groups.map(function (g) {
      return '<div class="txn-group"><div class="txn-group-label">' + esc(UI.formatDateLong(g.date)) + '</div>' +
        g.items.map(txnRowHtml).join('') + '</div>';
    }).join('');
  }

  async function render() {
    try {
      const r = U.monthRange(month);
      const results = await Promise.all([
        Store.stats.summary(r.from, r.to),
        Store.stats.balance(),
        Store.stats.byCategory(r.from, r.to, 'expense'),
        Store.stats.lastMonths(month, 6),
        Store.transactions.list(),
        Store.budgets.list(month),
        Store.goals.list(),
        Store.categories.list()
      ]);
      draw(results[0], results[1], results[2], results[3], results[4], results[5], results[6], results[7]);
    } catch (e) {
      root.innerHTML = '<div class="card"><div class="empty"><div class="empty-icon">😿</div><h3>Không tải được dữ liệu</h3><p>' + esc(UI.errMsg(e)) + '</p></div></div>';
    }
  }

  function quickAddHtml(cats) {
    return '<div class="card quickadd"><h3>Thêm giao dịch nhanh</h3>' +
      '<p class="muted" style="margin-top:-8px;margin-bottom:12px;font-size:12.5px">Cập nhật theo thời gian thực</p>' +
      '<form class="form" id="qaForm" novalidate>' +
        '<div class="segmented" id="qaType"><button type="button" data-type="expense">Chi tiêu</button><button type="button" data-type="income">Thu nhập</button></div>' +
        '<select id="qaCat" style="margin-top:12px"></select>' +
        '<span class="field-error" id="qaCatErr"></span>' +
        '<input type="text" id="qaAmount" inputmode="numeric" autocomplete="off" placeholder="Hãy nhập số tiền" style="margin-top:10px">' +
        '<span class="field-error" id="qaAmountErr"></span>' +
        '<input type="text" id="qaNote" maxlength="200" placeholder="Ghi chú" style="margin-top:10px">' +
        '<span class="field-error form-error" id="qaErr"></span>' +
        '<button type="submit" class="btn dark lg block" style="margin-top:14px">＋ THÊM</button>' +
      '</form></div>';
  }

  function bindQuickAdd(cats) {
    const form = document.getElementById('qaForm');
    if (!form) return;
    let type = 'expense';
    const catSelect = form.querySelector('#qaCat');
    const $ = function (s) { return form.querySelector(s); };

    function fillCats() {
      const opts = cats.filter(function (c) { return c.type === type; });
      catSelect.innerHTML = opts.length
        ? opts.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.icon) + ' ' + esc(c.name) + '</option>'; }).join('')
        : '<option value="">-- Chưa có danh mục loại này --</option>';
    }
    function paintType() {
      form.querySelectorAll('#qaType button').forEach(function (b) {
        b.classList.toggle('active', b.dataset.type === type);
        b.classList.toggle('income', b.dataset.type === 'income' && type === 'income');
      });
    }
    fillCats();
    paintType();
    UI.bindMoneyInput($('#qaAmount'));

    form.querySelectorAll('#qaType button').forEach(function (b) {
      b.addEventListener('click', function () { type = b.dataset.type; paintType(); fillCats(); });
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      $('#qaErr').textContent = ''; $('#qaCatErr').textContent = ''; $('#qaAmountErr').textContent = '';
      const categoryId = catSelect.value;
      const amount = UI.parseMoney($('#qaAmount').value);
      let bad = false;
      if (!categoryId) { $('#qaCatErr').textContent = 'Vui lòng chọn danh mục.'; bad = true; }
      if (amount <= 0) { $('#qaAmountErr').textContent = 'Số tiền phải lớn hơn 0.'; bad = true; }
      if (bad) return;
      try {
        await Store.transactions.add({ categoryId: categoryId, amount: amount, date: U.today(), note: $('#qaNote').value.trim() });
        UI.toast('Đã thêm giao dịch.', 'success');
        render();
      } catch (err) { $('#qaErr').textContent = UI.errMsg(err); }
    });
  }

  function draw(summary, balance, expCats, trend, all, budgets, goals, cats) {
    let html =
      '<div class="page-head"><p class="muted">Tình hình thu chi của bạn trong ' + esc(UI.formatMonth(month).toLowerCase()) + '.</p>' +
      '<div class="month-switch"><button class="icon-btn" id="prevMonth" aria-label="Tháng trước">‹</button>' +
      '<span class="label" id="monthLabel">' + esc(UI.formatMonth(month)) + '</span>' +
      '<button class="icon-btn" id="nextMonth" aria-label="Tháng sau">›</button></div></div>';

    if (all.length === 0) {
      html += '<div class="card welcome" style="margin-bottom:16px"><div class="empty">' +
        '<div class="empty-icon">🐱</div><h3>Chào mừng bạn đến với Poketto!</h3>' +
        '<p>Bạn chưa có giao dịch nào. Hãy ghi lại khoản thu/chi đầu tiên, hoặc nạp dữ liệu mẫu để xem thử biểu đồ.</p>' +
        '<button class="btn primary" id="firstTxnBtn">＋ Thêm giao dịch đầu tiên</button>' +
        '<button class="btn ghost" id="seedBtn">Nạp dữ liệu mẫu</button></div></div>';
    }

    html +=
      '<div class="grid pills">' +
        '<div class="card stat-pill income"><span class="label">Thu nhập</span><span class="value">+' + UI.formatMoney(summary.income) + '</span></div>' +
        '<div class="card stat-pill expense"><span class="label">Chi tiêu</span><span class="value">−' + UI.formatMoney(summary.expense) + '</span></div>' +
        '<div class="card stat-pill balance"><span class="label">Số dư</span><span class="value">' + UI.formatMoney(balance) + '</span></div>' +
      '</div>' +

      '<div class="grid two">' +
        '<div class="card"><div class="card-head"><h3>Giao dịch gần đây</h3><a class="btn ghost sm" href="../transactions/transactions.html">Xem tất cả</a></div>' +
          recentHtml(all) +
        '</div>' +
        quickAddHtml(cats) +
      '</div>' +

      '<div class="grid two">' +
        '<div class="card"><h3>Chi tiêu theo danh mục</h3><div id="donutBox" class="chart-box"></div></div>' +
        '<div class="card"><h3>Thu &amp; chi 6 tháng gần nhất</h3><div id="barsBox" class="chart-box"></div></div>' +
      '</div>' +

      '<div class="grid two">' +
        '<div class="card"><div class="card-head"><h3>Ngân sách ' + esc(UI.formatMonth(month).toLowerCase()) + '</h3><a class="btn ghost sm" href="../budgets/budgets.html">Quản lý</a></div>' +
          (budgets.length
            ? '<ul class="item-list">' + budgets.slice(0, 5).map(budgetRow).join('') + '</ul>'
            : '<div class="empty small"><div class="empty-icon">🎯</div><p>Chưa đặt ngân sách cho tháng này.</p><a class="btn ghost sm" href="../budgets/budgets.html">Đặt ngân sách</a></div>') +
        '</div>' +
        '<div class="card"><div class="card-head"><h3>Mục tiêu tiết kiệm</h3><a class="btn ghost sm" href="../budgets/budgets.html#goals">Quản lý</a></div>' +
          (goals.length
            ? '<ul class="item-list">' + goals.slice(0, 3).map(goalRow).join('') + '</ul>'
            : '<div class="empty small"><div class="empty-icon">🐷</div><p>Chưa có mục tiêu tiết kiệm nào.</p><a class="btn ghost sm" href="../budgets/budgets.html#goals">Tạo mục tiêu</a></div>') +
        '</div>' +
      '</div>';

    root.innerHTML = html;

    Charts.doughnut(document.getElementById('donutBox'),
      expCats.map(function (c) { return { label: c.name, icon: c.icon, value: c.total, color: c.color }; }),
      { centerTop: 'Tổng chi', centerBottom: UI.formatShort(summary.expense), emptyText: 'Chưa có khoản chi nào trong tháng này' });

    Charts.bars(document.getElementById('barsBox'),
      trend.map(function (t) { return { label: 'T' + Number(t.key.slice(5)), values: { income: t.income, expense: t.expense } }; }),
      { emptyText: 'Chưa có dữ liệu thu/chi' });

    document.getElementById('prevMonth').addEventListener('click', function () { month = U.addMonths(month, -1); render(); });
    document.getElementById('nextMonth').addEventListener('click', function () { month = U.addMonths(month, 1); render(); });

    bindQuickAdd(cats);

    const firstBtn = document.getElementById('firstTxnBtn');
    if (firstBtn) firstBtn.addEventListener('click', async function () {
      if (await UI.openTransactionForm()) render();
    });
    const seedBtn = document.getElementById('seedBtn');
    if (seedBtn) seedBtn.addEventListener('click', async function () {
      try {
        const n = await Store.demo.seed();
        UI.toast('Đã tạo ' + n + ' giao dịch mẫu.', 'success');
        render();
      } catch (e) { UI.toast(UI.errMsg(e), 'error'); }
    });
  }

  render();
})();
