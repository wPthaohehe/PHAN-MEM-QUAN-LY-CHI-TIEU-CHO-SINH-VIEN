(function () {
  'use strict';

  const user = UI.initShell({ active: 'categories', title: 'Danh mục', onDataChange: render });
  if (!user) return;

  const root = document.getElementById('content');
  const esc = UI.esc;

  const ICONS = ['🍜', '☕', '🍔', '🚌', '🛵', '📚', '✏️', '🏠', '💡', '📱', '🛍️', '👕', '🎮', '🎬', '🎁', '💊',
    '🏋️', '✈️', '🐱', '💼', '🎓', '👪', '💰', '🧾', '🏷️', '🎵', '💻', '🧴'];
  const COLORS = ['#f4a261', '#e5645b', '#e879a6', '#a066d3', '#7c6fe0', '#4dabf7', '#2bb3c0', '#3f9d6f', '#f2c94c', '#8d99ae'];

  function catCard(c, usage) {
    const n = usage[c.id] || 0;
    return '<div class="cat-card" data-id="' + esc(c.id) + '">' +
      '<span class="cat-dot" style="background:' + esc(c.color) + '33">' + esc(c.icon) + '</span>' +
      '<div class="cat-meta"><strong>' + esc(c.name) + '</strong><small>' + n + ' giao dịch</small></div>' +
      '<button class="icon-btn" data-act="edit" title="Sửa" aria-label="Sửa danh mục">✏️</button>' +
      '<button class="icon-btn danger" data-act="delete" title="Xóa" aria-label="Xóa danh mục">🗑️</button></div>';
  }

  async function render() {
    try {
      const results = await Promise.all([Store.categories.list(), Store.categories.usage()]);
      const cats = results[0];
      const usage = results[1];
      const expense = cats.filter(function (c) { return c.type === 'expense'; });
      const income = cats.filter(function (c) { return c.type === 'income'; });

      root.innerHTML =
        '<div class="page-head"><div><h1>Danh mục</h1><p class="muted">Phân loại các khoản thu chi theo cách của bạn.</p></div>' +
        '<button class="btn primary" id="addCatBtn">＋ Thêm danh mục</button></div>' +
        '<div class="card" style="margin-bottom:16px"><h3>Khoản chi (' + expense.length + ')</h3><div class="cat-grid" id="expenseGrid">' +
          (expense.length ? expense.map(function (c) { return catCard(c, usage); }).join('') : '<p class="muted">Chưa có danh mục chi nào.</p>') + '</div></div>' +
        '<div class="card"><h3>Khoản thu (' + income.length + ')</h3><div class="cat-grid" id="incomeGrid">' +
          (income.length ? income.map(function (c) { return catCard(c, usage); }).join('') : '<p class="muted">Chưa có danh mục thu nào.</p>') + '</div></div>';

      root.querySelector('#addCatBtn').addEventListener('click', function () { openForm(null); });
      root.querySelectorAll('.cat-grid').forEach(function (grid) {
        grid.addEventListener('click', async function (e) {
          const btn = e.target.closest('button[data-act]');
          if (!btn) return;
          const id = btn.closest('.cat-card').dataset.id;
          const cat = cats.find(function (c) { return c.id === id; });
          if (!cat) return;
          if (btn.dataset.act === 'edit') { openForm(cat); return; }
          const n = usage[id] || 0;
          if (n > 0) {
            UI.toast('Danh mục "' + cat.name + '" đang có ' + n + ' giao dịch nên chưa thể xóa.', 'warning');
            return;
          }
          const ok = await UI.confirm('Xóa danh mục "' + cat.name + '"? Các ngân sách gắn với danh mục này cũng sẽ bị xóa.', { title: 'Xóa danh mục', okText: 'Xóa', danger: true });
          if (!ok) return;
          try {
            await Store.categories.remove(id);
            UI.toast('Đã xóa danh mục.', 'success');
            render();
          } catch (err) { UI.toast(UI.errMsg(err), 'error'); }
        });
      });
    } catch (e) {
      root.innerHTML = '<div class="card"><div class="empty"><p>' + esc(UI.errMsg(e)) + '</p></div></div>';
    }
  }

  function openForm(cat) {
    const isEdit = !!cat;
    let type = cat ? cat.type : 'expense';
    let icon = cat ? cat.icon : ICONS[0];
    let color = cat ? cat.color : COLORS[0];

    const form = UI.el('form', 'form');
    form.noValidate = true;
    form.innerHTML =
      '<label>Loại</label>' +
      '<div class="segmented" id="cType"><button type="button" data-type="expense">Khoản chi</button><button type="button" data-type="income">Khoản thu</button></div>' +
      (isEdit ? '<small class="muted" style="margin-top:4px">Không thể đổi loại của danh mục đã tạo.</small>' : '') +
      '<label for="cName">Tên danh mục</label>' +
      '<input type="text" id="cName" maxlength="100" placeholder="VD: Cà phê, Sách vở...">' +
      '<span class="field-error" id="cNameErr"></span>' +
      '<label>Biểu tượng</label><div class="emoji-grid" id="cIcons"></div>' +
      '<label>Màu</label><div class="swatches" id="cColors"></div>' +
      '<span class="field-error form-error" id="cErr"></span>' +
      '<div class="modal-actions"><button type="button" class="btn ghost" id="cCancel">Hủy</button>' +
      '<button type="submit" class="btn primary">' + (isEdit ? 'Lưu thay đổi' : 'Thêm danh mục') + '</button></div>';

    const $ = function (sel) { return form.querySelector(sel); };
    $('#cName').value = cat ? cat.name : '';

    const iconsBox = $('#cIcons');
    const iconList = ICONS.indexOf(icon) === -1 ? [icon].concat(ICONS) : ICONS;
    iconsBox.innerHTML = iconList.map(function (i) { return '<button type="button" data-icon="' + esc(i) + '">' + esc(i) + '</button>'; }).join('');
    const colorsBox = $('#cColors');
    const colorList = COLORS.indexOf(color) === -1 ? [color].concat(COLORS) : COLORS;
    colorsBox.innerHTML = colorList.map(function (c) { return '<button type="button" data-color="' + esc(c) + '" style="background:' + esc(c) + '" aria-label="Màu ' + esc(c) + '"></button>'; }).join('');

    function paint() {
      form.querySelectorAll('#cType button').forEach(function (b) {
        b.classList.toggle('active', b.dataset.type === type);
        b.classList.toggle('income', b.dataset.type === 'income' && type === 'income');
        if (isEdit) b.disabled = b.dataset.type !== type;
      });
      iconsBox.querySelectorAll('button').forEach(function (b) { b.classList.toggle('active', b.dataset.icon === icon); });
      colorsBox.querySelectorAll('button').forEach(function (b) { b.classList.toggle('active', b.dataset.color === color); });
    }
    paint();

    form.querySelectorAll('#cType button').forEach(function (b) { b.addEventListener('click', function () { if (!isEdit) { type = b.dataset.type; paint(); } }); });
    iconsBox.addEventListener('click', function (e) { const b = e.target.closest('button[data-icon]'); if (b) { icon = b.dataset.icon; paint(); } });
    colorsBox.addEventListener('click', function (e) { const b = e.target.closest('button[data-color]'); if (b) { color = b.dataset.color; paint(); } });

    const modal = UI.openModal({ title: isEdit ? 'Sửa danh mục' : 'Thêm danh mục', body: form, width: '460px' });
    $('#cCancel').addEventListener('click', function () { modal.close(); });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const name = $('#cName').value.trim();
      $('#cErr').textContent = '';
      if (!name) { $('#cNameErr').textContent = 'Vui lòng nhập tên danh mục.'; return; }
      $('#cNameErr').textContent = '';
      try {
        if (isEdit) await Store.categories.update(cat.id, { name: name, icon: icon, color: color });
        else await Store.categories.add({ name: name, type: type, icon: icon, color: color });
        UI.toast(isEdit ? 'Đã cập nhật danh mục.' : 'Đã thêm danh mục.', 'success');
        modal.close();
        render();
      } catch (err) { $('#cErr').textContent = UI.errMsg(err); }
    });
  }

  render();
})();
