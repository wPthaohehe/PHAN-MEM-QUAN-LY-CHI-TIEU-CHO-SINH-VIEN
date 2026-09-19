(function () {
  'use strict';

  const user = UI.initShell({ active: 'budgets', title: 'Ngân sách & tiết kiệm', onDataChange: render });
  if (!user) return;

  const root = document.getElementById('content');
  const U = Store.util;
  const esc = UI.esc;

  let tab = location.hash === '#goals' ? 'goals' : 'budgets';
  let month = U.monthOf(U.today());

  function moneyField(id, label, placeholder, value) {
    return '<label for="' + id + '">' + label + '</label>' +
      '<input type="text" id="' + id + '" inputmode="numeric" autocomplete="off" placeholder="' + placeholder + '"' + (value != null ? ' value="' + esc(value) + '"' : '') + '>' +
      '<span class="field-error" id="' + id + 'Err"></span>';
  }

  /* ============================================================
     NGÂN SÁCH
     ============================================================ */
  async function renderBudgets(box) {
    const list = await Store.budgets.list(month);
    let totalLimit = 0, totalSpent = 0;
    list.forEach(function (b) { totalLimit += b.limit; totalSpent += b.spent; });
    const totalPct = totalLimit ? Math.round(totalSpent / totalLimit * 100) : 0;
    const totalStatus = totalPct > 100 ? 'over' : totalPct >= 80 ? 'warn' : 'ok';

    box.innerHTML =
      '<div class="page-head"><div><h1>Ngân sách</h1><p class="muted">Đặt hạn mức chi cho từng danh mục và theo dõi mức đã dùng.</p></div>' +
      '<div class="row-actions">' +
        '<div class="month-switch"><button class="icon-btn" id="prevMonth" aria-label="Tháng trước">‹</button><span class="label" id="monthLabel">' + esc(UI.formatMonth(month)) + '</span><button class="icon-btn" id="nextMonth" aria-label="Tháng sau">›</button></div>' +
        '<button class="btn ghost" id="copyBtn" title="Sao chép ngân sách từ tháng trước sang tháng này">Sao chép từ tháng trước</button>' +
        '<button class="btn primary" id="addBudgetBtn">＋ Đặt ngân sách</button></div></div>' +

      (list.length
        ? '<div class="card" style="margin-bottom:16px"><div class="card-head"><h3>Tổng quan tháng</h3><span class="badge ' + (totalStatus === 'ok' ? '' : totalStatus) + '">' + totalPct + '%</span></div>' +
          '<div class="progress ' + totalStatus + '"><span style="width:' + Math.min(100, totalPct) + '%"></span></div>' +
          '<div class="row-sub"><span>Đã chi ' + UI.formatMoney(totalSpent) + ' trên tổng hạn mức ' + UI.formatMoney(totalLimit) + '</span>' +
          '<span>' + (totalLimit - totalSpent >= 0 ? 'Còn ' + UI.formatMoney(totalLimit - totalSpent) : 'Vượt ' + UI.formatMoney(totalSpent - totalLimit)) + '</span></div></div>'
        : '') +

      '<div class="card">' +
      (list.length
        ? '<ul class="item-list" id="budgetList">' + list.map(function (b) {
            return '<li class="item-row" data-id="' + esc(b.id) + '">' +
              '<div class="row-top"><span class="cat-cell"><span class="cat-dot" style="background:' + esc(b.categoryColor) + '33">' + esc(b.categoryIcon) + '</span><strong>' + esc(b.categoryName) + '</strong>' +
              '<span class="badge ' + (b.status === 'ok' ? '' : b.status) + '">' + (b.status === 'over' ? 'Vượt ngân sách' : b.status === 'warn' ? 'Sắp hết' : 'Trong hạn mức') + ' · ' + b.percent + '%</span></span>' +
              '<span><button class="icon-btn" data-act="edit" title="Sửa" aria-label="Sửa ngân sách">✏️</button><button class="icon-btn danger" data-act="delete" title="Xóa" aria-label="Xóa ngân sách">🗑️</button></span></div>' +
              '<div class="progress ' + b.status + '"><span style="width:' + Math.min(100, b.percent) + '%"></span></div>' +
              '<div class="row-sub"><span>Đã chi ' + UI.formatMoney(b.spent) + ' / ' + UI.formatMoney(b.limit) + '</span>' +
              '<span>' + (b.remaining >= 0 ? 'Còn ' + UI.formatMoney(b.remaining) : 'Vượt ' + UI.formatMoney(-b.remaining)) + '</span></div></li>';
          }).join('') + '</ul>'
        : '<div class="empty"><div class="empty-icon">🎯</div><h3>Chưa có ngân sách cho ' + esc(UI.formatMonth(month).toLowerCase()) + '</h3><p>Đặt hạn mức cho các khoản hay tiêu quá tay như ăn uống, giải trí... Poketto sẽ cảnh báo khi bạn sắp vượt.</p></div>') +
      '</div>';

    box.querySelector('#prevMonth').addEventListener('click', function () { month = U.addMonths(month, -1); render(); });
    box.querySelector('#nextMonth').addEventListener('click', function () { month = U.addMonths(month, 1); render(); });
    box.querySelector('#addBudgetBtn').addEventListener('click', function () { openBudgetForm(null, list); });
    box.querySelector('#copyBtn').addEventListener('click', async function () {
      try {
        const prev = U.addMonths(month, -1);
        const n = await Store.budgets.copyMonth(prev, month);
        UI.toast(n > 0 ? 'Đã sao chép ' + n + ' ngân sách từ ' + UI.formatMonth(prev).toLowerCase() + '.' : 'Không có ngân sách nào để sao chép (tháng trước chưa đặt hoặc tháng này đã có đủ).', n > 0 ? 'success' : 'info');
        render();
      } catch (e) { UI.toast(UI.errMsg(e), 'error'); }
    });

    const listEl = box.querySelector('#budgetList');
    if (listEl) listEl.addEventListener('click', async function (e) {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const id = btn.closest('li').dataset.id;
      const b = list.find(function (x) { return x.id === id; });
      if (!b) return;
      if (btn.dataset.act === 'edit') { openBudgetForm(b, list); return; }
      const ok = await UI.confirm('Xóa ngân sách "' + b.categoryName + '" của ' + UI.formatMonth(month).toLowerCase() + '?', { title: 'Xóa ngân sách', okText: 'Xóa', danger: true });
      if (!ok) return;
      try { await Store.budgets.remove(id); UI.toast('Đã xóa ngân sách.', 'success'); render(); }
      catch (err) { UI.toast(UI.errMsg(err), 'error'); }
    });
  }

  async function openBudgetForm(budget, existing) {
    const isEdit = !!budget;
    const cats = (await Store.categories.list('expense')).filter(function (c) {
      return isEdit || !existing.some(function (b) { return b.categoryId === c.id; });
    });
    if (!isEdit && !cats.length) {
      UI.toast('Tất cả danh mục chi đã có ngân sách trong tháng này.', 'info');
      return;
    }
    const form = UI.el('form', 'form');
    form.noValidate = true;
    form.innerHTML =
      '<label for="bCat">Danh mục chi</label>' +
      (isEdit
        ? '<input type="text" id="bCat" readonly value="' + esc(budget.categoryIcon + ' ' + budget.categoryName) + '">'
        : '<select id="bCat"><option value="">-- Chọn danh mục --</option>' + cats.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.icon) + ' ' + esc(c.name) + '</option>'; }).join('') + '</select>') +
      '<span class="field-error" id="bCatErr"></span>' +
      moneyField('bLimit', 'Hạn mức trong ' + esc(UI.formatMonth(month).toLowerCase()) + ' (₫)', 'VD: 1.500.000', isEdit ? new Intl.NumberFormat('vi-VN').format(budget.limit) : null) +
      '<span class="field-error form-error" id="bErr"></span>' +
      '<div class="modal-actions"><button type="button" class="btn ghost" id="bCancel">Hủy</button><button type="submit" class="btn primary">' + (isEdit ? 'Lưu thay đổi' : 'Đặt ngân sách') + '</button></div>';
    const $ = function (s) { return form.querySelector(s); };
    UI.bindMoneyInput($('#bLimit'));
    const modal = UI.openModal({ title: isEdit ? 'Sửa ngân sách' : 'Đặt ngân sách', body: form, width: '440px' });
    $('#bCancel').addEventListener('click', function () { modal.close(); });
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      $('#bErr').textContent = '';
      const limit = UI.parseMoney($('#bLimit').value);
      let bad = false;
      if (!isEdit && !$('#bCat').value) { $('#bCatErr').textContent = 'Vui lòng chọn danh mục.'; bad = true; } else $('#bCatErr').textContent = '';
      if (limit <= 0) { $('#bLimitErr').textContent = 'Hạn mức phải lớn hơn 0.'; bad = true; } else $('#bLimitErr').textContent = '';
      if (bad) return;
      try {
        if (isEdit) await Store.budgets.update(budget.id, { limit: limit });
        else await Store.budgets.add({ categoryId: $('#bCat').value, month: month, limit: limit });
        UI.toast(isEdit ? 'Đã cập nhật ngân sách.' : 'Đã đặt ngân sách.', 'success');
        modal.close();
        render();
      } catch (err) { $('#bErr').textContent = UI.errMsg(err); }
    });
  }

  /* ============================================================
     MỤC TIÊU TIẾT KIỆM
     ============================================================ */
  async function renderGoals(box) {
    const list = await Store.goals.list();
    box.innerHTML =
      '<div class="page-head"><div><h1>Mục tiêu tiết kiệm</h1><p class="muted">Đặt mục tiêu (mua laptop, du lịch...) và theo dõi tiến độ tiết kiệm.</p></div>' +
      '<button class="btn primary" id="addGoalBtn">＋ Thêm mục tiêu</button></div>' +
      (list.length
        ? '<div class="goal-grid" id="goalGrid">' + list.map(function (g) {
            let deadlineText = '';
            if (g.deadline) {
              deadlineText = g.done ? '' : (g.daysLeft < 0 ? 'Đã quá hạn ' + (-g.daysLeft) + ' ngày' : g.daysLeft === 0 ? 'Hạn là hôm nay' : 'Còn ' + g.daysLeft + ' ngày');
            }
            return '<div class="card goal-card" data-id="' + esc(g.id) + '">' +
              '<div class="row-top" style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><h4>🎯 ' + esc(g.name) + '</h4>' +
              '<small class="muted">' + (g.deadline ? 'Hạn: ' + UI.formatDate(g.deadline) + (deadlineText ? ' · ' + deadlineText : '') : 'Không đặt hạn') + '</small></div>' +
              '<span class="badge ' + (g.done ? 'done' : '') + '">' + (g.done ? 'Hoàn thành 🎉' : g.percent + '%') + '</span></div>' +
              '<div class="goal-nums"><span>Đã có <strong>' + UI.formatMoney(g.saved) + '</strong></span><span class="muted">Mục tiêu ' + UI.formatMoney(g.target) + '</span></div>' +
              '<div class="progress"><span style="width:' + g.percent + '%"></span></div>' +
              '<div class="row-sub"><span>' + (g.done ? 'Bạn đã đạt mục tiêu!' : 'Còn thiếu ' + UI.formatMoney(g.remaining)) + '</span></div>' +
              '<div class="goal-actions"><button class="btn primary sm" data-act="deposit">＋ Nạp thêm</button>' +
              '<button class="btn ghost sm" data-act="edit">Sửa</button><button class="btn ghost sm" data-act="delete">Xóa</button></div></div>';
          }).join('') + '</div>'
        : '<div class="card"><div class="empty"><div class="empty-icon">🐷</div><h3>Chưa có mục tiêu nào</h3><p>Hãy tạo mục tiêu đầu tiên, ví dụ "Mua laptop" hay "Du lịch hè".</p></div></div>');

    box.querySelector('#addGoalBtn').addEventListener('click', function () { openGoalForm(null); });
    const grid = box.querySelector('#goalGrid');
    if (grid) grid.addEventListener('click', async function (e) {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const id = btn.closest('.goal-card').dataset.id;
      const g = list.find(function (x) { return x.id === id; });
      if (!g) return;
      if (btn.dataset.act === 'edit') openGoalForm(g);
      else if (btn.dataset.act === 'deposit') openDeposit(g);
      else {
        const ok = await UI.confirm('Xóa mục tiêu "' + g.name + '"? Số tiền đã tiết kiệm trong mục tiêu này sẽ không còn được theo dõi.', { title: 'Xóa mục tiêu', okText: 'Xóa', danger: true });
        if (!ok) return;
        try { await Store.goals.remove(id); UI.toast('Đã xóa mục tiêu.', 'success'); render(); }
        catch (err) { UI.toast(UI.errMsg(err), 'error'); }
      }
    });
  }

  function openGoalForm(goal) {
    const isEdit = !!goal;
    const fmt = new Intl.NumberFormat('vi-VN');
    const form = UI.el('form', 'form');
    form.noValidate = true;
    form.innerHTML =
      '<label for="gName">Tên mục tiêu</label><input type="text" id="gName" maxlength="100" placeholder="VD: Mua laptop">' +
      '<span class="field-error" id="gNameErr"></span>' +
      moneyField('gTarget', 'Số tiền cần đạt (₫)', 'VD: 15.000.000', isEdit ? fmt.format(goal.target) : null) +
      moneyField('gSaved', 'Số tiền đã tiết kiệm (₫)', 'VD: 0', isEdit ? fmt.format(goal.saved) : null) +
      '<label for="gDeadline">Hạn hoàn thành <small class="muted">(không bắt buộc)</small></label><input type="date" id="gDeadline">' +
      '<span class="field-error" id="gDeadlineErr"></span>' +
      '<span class="field-error form-error" id="gErr"></span>' +
      '<div class="modal-actions"><button type="button" class="btn ghost" id="gCancel">Hủy</button><button type="submit" class="btn primary">' + (isEdit ? 'Lưu thay đổi' : 'Tạo mục tiêu') + '</button></div>';
    const $ = function (s) { return form.querySelector(s); };
    $('#gName').value = goal ? goal.name : '';
    $('#gDeadline').value = goal && goal.deadline ? goal.deadline : '';
    UI.bindMoneyInput($('#gTarget'));
    UI.bindMoneyInput($('#gSaved'));
    const modal = UI.openModal({ title: isEdit ? 'Sửa mục tiêu' : 'Thêm mục tiêu tiết kiệm', body: form, width: '460px' });
    $('#gCancel').addEventListener('click', function () { modal.close(); });
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      $('#gErr').textContent = '';
      const name = $('#gName').value.trim();
      const target = UI.parseMoney($('#gTarget').value);
      const saved = UI.parseMoney($('#gSaved').value);
      const deadline = $('#gDeadline').value;
      let bad = false;
      $('#gNameErr').textContent = name ? '' : 'Vui lòng nhập tên mục tiêu.'; if (!name) bad = true;
      $('#gTargetErr').textContent = target > 0 ? '' : 'Số tiền cần đạt phải lớn hơn 0.'; if (target <= 0) bad = true;
      $('#gDeadlineErr').textContent = ''; $('#gSavedErr').textContent = '';
      if (bad) return;
      try {
        const data = { name: name, target: target, saved: saved, deadline: deadline || null };
        if (isEdit) await Store.goals.update(goal.id, data); else await Store.goals.add(data);
        UI.toast(isEdit ? 'Đã cập nhật mục tiêu.' : 'Đã tạo mục tiêu.', 'success');
        modal.close();
        render();
      } catch (err) { $('#gErr').textContent = UI.errMsg(err); }
    });
  }

  function openDeposit(goal) {
    const form = UI.el('form', 'form');
    form.noValidate = true;
    form.innerHTML =
      '<p class="muted" style="margin-bottom:8px">Mục tiêu <strong>' + esc(goal.name) + '</strong> — còn thiếu ' + UI.formatMoney(goal.remaining) + '.</p>' +
      moneyField('dAmount', 'Số tiền nạp thêm (₫)', 'VD: 200.000', null) +
      '<span class="field-error form-error" id="dErr"></span>' +
      '<div class="modal-actions"><button type="button" class="btn ghost" id="dCancel">Hủy</button><button type="submit" class="btn primary">Nạp tiền</button></div>';
    const $ = function (s) { return form.querySelector(s); };
    UI.bindMoneyInput($('#dAmount'));
    const modal = UI.openModal({ title: 'Nạp thêm vào mục tiêu', body: form, width: '420px' });
    $('#dCancel').addEventListener('click', function () { modal.close(); });
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const amount = UI.parseMoney($('#dAmount').value);
      $('#dErr').textContent = '';
      if (amount <= 0) { $('#dAmountErr').textContent = 'Số tiền phải lớn hơn 0.'; return; }
      $('#dAmountErr').textContent = '';
      try {
        const updated = await Store.goals.deposit(goal.id, amount);
        UI.toast(updated.done && !goal.done ? '🎉 Chúc mừng! Bạn đã đạt mục tiêu "' + goal.name + '".' : 'Đã nạp ' + UI.formatMoney(amount) + ' vào mục tiêu.', 'success');
        modal.close();
        render();
      } catch (err) { $('#dErr').textContent = UI.errMsg(err); }
    });
  }

  /* ============================================================
     Khung trang + tab
     ============================================================ */
  async function render() {
    try {
      root.innerHTML =
        '<div class="tabs" role="tablist">' +
          '<button class="tab' + (tab === 'budgets' ? ' active' : '') + '" data-tab="budgets" role="tab">Ngân sách</button>' +
          '<button class="tab' + (tab === 'goals' ? ' active' : '') + '" data-tab="goals" role="tab">Mục tiêu tiết kiệm</button>' +
        '</div><div id="tabBody"></div>';
      root.querySelectorAll('.tab').forEach(function (b) {
        b.addEventListener('click', function () {
          tab = b.dataset.tab;
          history.replaceState(null, '', tab === 'goals' ? '#goals' : location.pathname);
          render();
        });
      });
      const body = root.querySelector('#tabBody');
      if (tab === 'goals') await renderGoals(body); else await renderBudgets(body);
    } catch (e) {
      root.innerHTML = '<div class="card"><div class="empty"><p>' + esc(UI.errMsg(e)) + '</p></div></div>';
    }
  }

  render();
})();
