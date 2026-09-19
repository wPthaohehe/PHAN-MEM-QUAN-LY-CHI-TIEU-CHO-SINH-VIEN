(function () {
  'use strict';

  const user = UI.initShell({ active: 'dashboard', title: 'Tổng quan', onDataChange: render });
  if (!user) return;

  const root = document.getElementById('content');
  const U = Store.util;
  const esc = UI.esc;
  let month = U.monthOf(U.today());

  function firstName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/);
    return parts[parts.length - 1] || 'bạn';
  }

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

  function txnRow(t) {
    return '<tr>' +
      '<td>' + UI.formatDate(t.date) + '</td>' +
      '<td><span class="cat-cell"><span class="cat-dot" style="background:' + esc(t.categoryColor) + '22">' + esc(t.categoryIcon) + '</span>' + esc(t.categoryName) + '</span></td>' +
      '<td class="note">' + esc(t.note) + '</td>' +
      '<td class="num">' + UI.amountHtml(t) + '</td></tr>';
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
        Store.goals.list()
      ]);
      draw(results[0], results[1], results[2], results[3], results[4], results[5], results[6]);
    } catch (e) {
      root.innerHTML = '<div class="card"><div class="empty"><div class="empty-icon">😿</div><h3>Không tải được dữ liệu</h3><p>' + esc(UI.errMsg(e)) + '</p></div></div>';
    }
  }

  function draw(summary, balance, expCats, trend, all, budgets, goals) {
    const r = U.monthRange(month);
    const netClass = summary.net < 0 ? 'neg' : '';

    let html =
      '<div class="page-head"><div><h1>Xin chào, ' + esc(firstName(user.fullName)) + ' 👋</h1>' +
      '<p class="muted">Tình hình thu chi của bạn trong ' + esc(UI.formatMonth(month).toLowerCase()) + '.</p></div>' +
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
      '<div class="grid stats">' +
        '<div class="card stat-card ' + (balance < 0 ? 'neg' : '') + '"><span class="label">Số dư hiện tại</span><span class="value" id="statBalance">' + UI.formatMoney(balance) + '</span><span class="sub">Tổng thu − tổng chi (mọi thời gian)</span></div>' +
        '<div class="card stat-card income"><span class="label">Thu trong tháng</span><span class="value" id="statIncome">' + UI.formatMoney(summary.income) + '</span><span class="sub">' + esc(UI.formatMonth(month)) + '</span></div>' +
        '<div class="card stat-card expense"><span class="label">Chi trong tháng</span><span class="value" id="statExpense">' + UI.formatMoney(summary.expense) + '</span><span class="sub">' + esc(UI.formatMonth(month)) + '</span></div>' +
        '<div class="card stat-card ' + netClass + '"><span class="label">Còn lại trong tháng</span><span class="value" id="statNet">' + (summary.net > 0 ? '+' : summary.net < 0 ? '−' : '') + UI.formatMoney(Math.abs(summary.net)) + '</span><span class="sub">Thu − Chi</span></div>' +
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
      '</div>' +

      '<div class="card"><div class="card-head"><h3>Giao dịch gần đây</h3><a class="btn ghost sm" href="../transactions/transactions.html">Xem tất cả</a></div>' +
        (all.length
          ? '<div class="table-wrap"><table class="table"><thead><tr><th>Ngày</th><th>Danh mục</th><th>Ghi chú</th><th class="num">Số tiền</th></tr></thead><tbody id="recentBody">' + all.slice(0, 6).map(txnRow).join('') + '</tbody></table></div>'
          : '<div class="empty small"><div class="empty-icon">🧾</div><p>Chưa có giao dịch nào.</p></div>') +
      '</div>';

    root.innerHTML = html;

    // Biểu đồ (vẽ sau khi phần tử đã nằm trong DOM để đo được chiều rộng)
    Charts.doughnut(document.getElementById('donutBox'),
      expCats.map(function (c) { return { label: c.name, icon: c.icon, value: c.total, color: c.color }; }),
      { centerTop: 'Tổng chi', centerBottom: UI.formatShort(summary.expense), emptyText: 'Chưa có khoản chi nào trong tháng này' });

    Charts.bars(document.getElementById('barsBox'),
      trend.map(function (t) { return { label: 'T' + Number(t.key.slice(5)), values: { income: t.income, expense: t.expense } }; }),
      { emptyText: 'Chưa có dữ liệu thu/chi' });

    document.getElementById('prevMonth').addEventListener('click', function () { month = U.addMonths(month, -1); render(); });
    document.getElementById('nextMonth').addEventListener('click', function () { month = U.addMonths(month, 1); render(); });

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
