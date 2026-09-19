(function () {
  'use strict';

  const user = UI.initShell({ active: 'reports', title: 'Báo cáo', onDataChange: render });
  if (!user) return;

  const root = document.getElementById('content');
  const U = Store.util;
  const esc = UI.esc;

  const state = { month: U.monthOf(U.today()), type: 'expense', catId: null };

  function monthOptionsHtml() {
    let opts = '';
    let m = U.monthOf(U.today());
    for (let i = 0; i < 12; i++) {
      opts += '<option value="' + esc(m) + '"' + (m === state.month ? ' selected' : '') + '>' + esc(UI.formatMonth(m)) + '</option>';
      m = U.addMonths(m, -1);
    }
    return opts;
  }

  async function render() {
    try {
      const cats = await Store.categories.list();
      if (state.catId) { await renderDetail(cats); return; }
      await renderList(cats);
    } catch (e) {
      root.innerHTML = '<div class="card"><div class="empty"><div class="empty-icon">😿</div><p>' + esc(UI.errMsg(e)) + '</p></div></div>';
    }
  }

  async function renderList(cats) {
    const r = U.monthRange(state.month);
    // Lấy song song: cơ cấu theo danh mục (biểu đồ tròn) + xu hướng 6 tháng (biểu đồ cột)
    const data = await Promise.all([
      Store.stats.byCategory(r.from, r.to, state.type),
      Store.stats.lastMonths(state.month, 6)
    ]);
    const byCat = data[0];
    const trend = data[1];
    const total = byCat.reduce(function (s, c) { return s + c.total; }, 0);

    root.innerHTML =
      '<div class="page-head"><div><h1>Báo cáo</h1><p class="muted">Phân tích thu chi theo danh mục.</p></div>' +
      '<select id="monthSel" class="date-chip" style="border:1px solid var(--border)">' + monthOptionsHtml() + '</select></div>' +

      '<div class="segmented" id="typeSeg" style="max-width:280px;margin-bottom:16px">' +
        '<button type="button" data-type="expense">Chi tiêu</button><button type="button" data-type="income">Thu nhập</button></div>' +

      '<div class="grid two">' +
        '<div class="card"><h3>' + (state.type === 'expense' ? 'Cơ cấu chi tiêu' : 'Cơ cấu thu nhập') + ' · ' + esc(UI.formatMonth(state.month)) + '</h3>' +
          '<div id="donutBox" class="chart-box"></div></div>' +
        '<div class="card"><h3>Thu &amp; chi 6 tháng gần nhất</h3>' +
          '<div id="barsBox" class="chart-box"></div></div>' +
      '</div>' +

      '<div class="card"><h3>Chi tiết theo danh mục</h3><div id="catList"></div></div>';

    root.querySelector('#monthSel').addEventListener('change', function (e) { state.month = e.target.value; render(); });
    root.querySelectorAll('#typeSeg button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.type === state.type);
      b.classList.toggle('income', b.dataset.type === 'income' && state.type === 'income');
      b.addEventListener('click', function () { state.type = b.dataset.type; render(); });
    });

    Charts.doughnut(root.querySelector('#donutBox'),
      byCat.map(function (c) { return { label: c.name, icon: c.icon, value: c.total, color: c.color }; }),
      { centerTop: state.type === 'expense' ? 'Tổng chi' : 'Tổng thu', centerBottom: UI.formatShort(total),
        emptyText: 'Chưa có dữ liệu trong tháng này' });

    Charts.bars(root.querySelector('#barsBox'),
      trend.map(function (t) { return { label: 'T' + Number(t.key.slice(5)), values: { income: t.income, expense: t.expense } }; }),
      { emptyText: 'Chưa có dữ liệu thu/chi' });

    const listBox = root.querySelector('#catList');
    listBox.innerHTML = byCat.length
      ? byCat.map(function (c) {
          return '<button type="button" class="cat-list-row" data-id="' + esc(c.categoryId) + '">' +
            '<span class="icon-avatar" style="background:' + esc(c.color) + '22">' + esc(c.icon) + '</span>' +
            '<span class="cl-name">' + esc(c.name) + '</span>' +
            '<span class="cl-amount">' + (state.type === 'expense' ? '−' : '+') + UI.formatMoney(c.total) + '</span>' +
            '<span class="chevron">›</span></button>';
        }).join('')
      : '<div class="empty small"><div class="empty-icon">📭</div><p>Chưa có giao dịch nào trong tháng này.</p></div>';

    listBox.querySelectorAll('.cat-list-row').forEach(function (b) {
      b.addEventListener('click', function () { state.catId = b.dataset.id; render(); });
    });
  }

  async function renderDetail(cats) {
    const cat = cats.find(function (c) { return c.id === state.catId; });
    if (!cat) { state.catId = null; return renderList(cats); }

    const r = U.monthRange(state.month);
    const txns = await Store.transactions.list({ categoryId: cat.id, from: r.from, to: r.to });
    const total = txns.reduce(function (s, t) { return s + t.amount; }, 0);

    root.innerHTML =
      '<div class="report-crumb"><a href="#" id="backLink">‹ Báo cáo</a><span class="muted">/</span><strong>' + esc(cat.name) + '</strong></div>' +
      '<div class="card">' +
        '<div class="card-head">' +
          '<span class="cat-cell"><span class="icon-avatar" style="background:' + esc(cat.color) + '22">' + esc(cat.icon) + '</span>' +
          '<div><strong style="font-size:18px;display:block">' + esc(cat.name) + '</strong>' +
          '<small class="muted">' + esc(UI.formatMonth(state.month)) + ' · ' + txns.length + ' giao dịch</small></div></span>' +
          '<div style="text-align:right"><span class="muted" style="display:block;font-size:12.5px">Tổng ' + (cat.type === 'expense' ? 'chi' : 'thu') + '</span>' +
          '<strong class="amount ' + esc(cat.type) + '" style="font-size:19px">' + (cat.type === 'expense' ? '−' : '+') + UI.formatMoney(total) + '</strong></div>' +
        '</div>' +
        (txns.length
          ? txns.map(function (t) {
              return '<div class="txn-row"><span class="icon-avatar" style="background:' + esc(t.categoryColor) + '22">' + esc(t.categoryIcon) + '</span>' +
                '<div class="txn-main"><strong>' + esc(t.note || t.categoryName) + '</strong><small>' + esc(UI.formatDate(t.date)) + '</small></div>' +
                UI.amountHtml(t) + '</div>';
            }).join('')
          : '<div class="empty small"><div class="empty-icon">📭</div><p>Không có giao dịch nào trong danh mục này.</p></div>') +
      '</div>';

    root.querySelector('#backLink').addEventListener('click', function (e) { e.preventDefault(); state.catId = null; render(); });
  }

  render();
})();
