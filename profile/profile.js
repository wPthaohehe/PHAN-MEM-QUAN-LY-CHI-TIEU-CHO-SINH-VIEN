(function () {
  'use strict';

  const user = UI.initShell({ active: 'profile', title: 'Cài đặt', onDataChange: function () {} });
  if (!user) return;

  const root = document.getElementById('content');
  const esc = UI.esc;

  function isDark() {
    try { return localStorage.getItem('poketto_theme') === 'dark'; } catch (e) { return false; }
  }
  function setDark(on) {
    document.documentElement.setAttribute('data-theme', on ? 'dark' : 'light');
    try { localStorage.setItem('poketto_theme', on ? 'dark' : 'light'); } catch (e) { /* ignore */ }
  }
  function getPref(key, def) {
    try { const v = localStorage.getItem(key); return v === null ? def : v === '1'; } catch (e) { return def; }
  }
  function setPref(key, on) {
    try { localStorage.setItem(key, on ? '1' : '0'); } catch (e) { /* ignore */ }
  }

  function openInfoModal(p) {
    const form = UI.el('form', 'form');
    form.noValidate = true;
    form.innerHTML =
      '<label for="pName">Họ và tên</label><input type="text" id="pName" maxlength="50">' +
      '<span class="field-error" id="pNameErr"></span>' +
      '<label for="pEmail">Email <small class="muted">(dùng để đăng nhập, không đổi được)</small></label><input type="email" id="pEmail" readonly>' +
      '<label for="pPhone">Số điện thoại</label><input type="tel" id="pPhone" maxlength="12">' +
      '<span class="field-error" id="pPhoneErr"></span>' +
      '<span class="field-error form-error" id="infoErr"></span>' +
      '<div class="modal-actions"><button type="button" class="btn ghost" id="infoCancel">Hủy</button>' +
      '<button type="submit" class="btn primary">Lưu thay đổi</button></div>';
    const $ = function (s) { return form.querySelector(s); };
    $('#pName').value = p.fullName;
    $('#pEmail').value = p.email;
    $('#pPhone').value = p.phone;

    const modal = UI.openModal({ title: 'Chỉnh sửa hồ sơ', body: form, width: '440px' });
    $('#infoCancel').addEventListener('click', function () { modal.close(); });
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      $('#infoErr').textContent = ''; $('#pNameErr').textContent = ''; $('#pPhoneErr').textContent = '';
      try {
        await Store.profile.update({ fullName: $('#pName').value, phone: $('#pPhone').value });
        UI.toast('Đã lưu thông tin.', 'success');
        modal.close();
        setTimeout(function () { location.reload(); }, 400);
      } catch (err) {
        const m = UI.errMsg(err);
        if (/họ và tên/i.test(m)) $('#pNameErr').textContent = m;
        else if (/điện thoại/i.test(m)) $('#pPhoneErr').textContent = m;
        else $('#infoErr').textContent = m;
      }
    });
  }

  function openPasswordModal() {
    const form = UI.el('form', 'form');
    form.noValidate = true;
    form.innerHTML =
      '<label for="pwOld">Mật khẩu hiện tại</label><input type="password" id="pwOld" autocomplete="current-password">' +
      '<label for="pwNew">Mật khẩu mới</label><input type="password" id="pwNew" autocomplete="new-password" placeholder="Tối thiểu 6 ký tự, gồm chữ và số">' +
      '<label for="pwNew2">Nhập lại mật khẩu mới</label><input type="password" id="pwNew2" autocomplete="new-password">' +
      '<span class="field-error form-error" id="pwErr"></span>' +
      '<div class="modal-actions"><button type="button" class="btn ghost" id="pwCancel">Hủy</button>' +
      '<button type="submit" class="btn primary">Đổi mật khẩu</button></div>';
    const $ = function (s) { return form.querySelector(s); };
    const modal = UI.openModal({ title: 'Đổi mật khẩu', body: form, width: '420px' });
    $('#pwCancel').addEventListener('click', function () { modal.close(); });
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      $('#pwErr').textContent = '';
      try {
        await Store.profile.changePassword($('#pwOld').value, $('#pwNew').value, $('#pwNew2').value);
        UI.toast('Đã đổi mật khẩu.', 'success');
        modal.close();
      } catch (err) { $('#pwErr').textContent = UI.errMsg(err); }
    });
  }

  function csvCell(v) {
    let s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  async function exportData() {
    try {
      const all = await Store.transactions.list();
      if (!all.length) { UI.toast('Chưa có giao dịch nào để xuất.', 'info'); return; }
      const rows = [['Ngày', 'Loại', 'Danh mục', 'Số tiền', 'Ghi chú']].concat(all.map(function (t) {
        return [UI.formatDate(t.date), t.type === 'income' ? 'Thu' : 'Chi', t.categoryName, t.amount, t.note];
      }));
      const csv = '\uFEFF' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'poketto-chi-tieu.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      UI.toast('Đã xuất ' + all.length + ' giao dịch ra file CSV.', 'success');
    } catch (err) { UI.toast(UI.errMsg(err), 'error'); }
  }

  async function render() {
    try {
      const p = await Store.profile.get();
      const initial = String(p.fullName || '?').trim().charAt(0).toUpperCase() || '?';

      root.innerHTML =
        '<div class="page-head"><div><h1>Cài đặt</h1></div></div>' +

        '<div class="card" style="margin-bottom:16px">' +
          '<div class="settings-avatar-row">' +
            '<span class="avatar">' + esc(initial) + '</span>' +
            '<div style="flex:1;min-width:0"><h3>' + esc(p.fullName) + '</h3><small>' + esc(p.email) + '</small></div>' +
            '<button class="btn ghost" id="editProfileBtn">✏️ Chỉnh sửa hồ sơ</button>' +
          '</div>' +
        '</div>' +

        '<div class="card" style="margin-bottom:16px"><h3>Tùy chọn ứng dụng</h3>' +
          '<div class="settings-row"><span class="sr-left">🔔 Thông báo</span>' +
            '<label class="switch"><input type="checkbox" id="notifToggle"><span class="slider"></span></label></div>' +
          '<div class="settings-row"><span class="sr-left">🌙 Chế độ tối</span>' +
            '<label class="switch"><input type="checkbox" id="darkToggle"><span class="slider"></span></label></div>' +
          '<div class="settings-row"><span class="sr-left">💲 Đơn vị tiền tệ</span>' +
            '<select id="currencySel"><option>VNĐ</option></select></div>' +
          '<div class="settings-row"><span class="sr-left">🌐 Ngôn ngữ</span>' +
            '<select id="langSel"><option>Tiếng Việt</option></select></div>' +
        '</div>' +

        '<div class="card" style="margin-bottom:16px"><h3>Bảo mật</h3>' +
          '<button type="button" class="settings-row" id="changePwRow"><span class="sr-left">🔒 Đổi mật khẩu</span><span class="chevron">›</span></button>' +
          '<button type="button" class="settings-row" id="exportRow"><span class="sr-left">⬇ Xuất dữ liệu chi tiêu</span><span class="chevron">›</span></button>' +
        '</div>' +

        '<div class="card" style="margin-bottom:16px"><h3>Dữ liệu</h3>' +
          '<p class="muted" style="margin-bottom:12px">Nạp dữ liệu mẫu (khoảng 3 tháng thu chi, ngân sách, mục tiêu) để xem thử biểu đồ và báo cáo. Bạn có thể xóa sạch bất cứ lúc nào.</p>' +
          '<div class="row-actions"><button class="btn ghost" id="seedBtn">Nạp dữ liệu mẫu</button></div></div>' +

        '<div class="card danger-zone"><h3>Vùng nguy hiểm</h3>' +
          '<p class="muted" style="margin-bottom:12px">Xóa toàn bộ giao dịch, ngân sách và mục tiêu tiết kiệm của bạn. Danh mục và tài khoản được giữ nguyên. Không thể hoàn tác.</p>' +
          '<div class="row-actions"><button class="btn danger" id="clearBtn">Xóa toàn bộ dữ liệu</button></div></div>';

      root.querySelector('#notifToggle').checked = getPref('poketto_notif', true);
      root.querySelector('#darkToggle').checked = isDark();

      bind(p);
    } catch (e) {
      root.innerHTML = '<div class="card"><div class="empty"><p>' + esc(UI.errMsg(e)) + '</p></div></div>';
    }
  }

  function bind(p) {
    const $ = function (s) { return root.querySelector(s); };

    $('#editProfileBtn').addEventListener('click', function () { openInfoModal(p); });
    $('#changePwRow').addEventListener('click', openPasswordModal);
    $('#exportRow').addEventListener('click', exportData);

    $('#notifToggle').addEventListener('change', function (e) { setPref('poketto_notif', e.target.checked); });
    $('#darkToggle').addEventListener('change', function (e) { setDark(e.target.checked); });

    $('#seedBtn').addEventListener('click', async function () {
      const ok = await UI.confirm('Thêm khoảng 3 tháng giao dịch mẫu vào tài khoản của bạn? Dữ liệu mẫu sẽ được cộng thêm vào dữ liệu hiện có.', { title: 'Nạp dữ liệu mẫu', okText: 'Nạp dữ liệu' });
      if (!ok) return;
      try {
        const n = await Store.demo.seed();
        UI.toast('Đã tạo ' + n + ' giao dịch mẫu.', 'success');
      } catch (err) { UI.toast(UI.errMsg(err), 'error'); }
    });

    $('#clearBtn').addEventListener('click', async function () {
      const ok = await UI.confirm('Xóa TOÀN BỘ giao dịch, ngân sách và mục tiêu tiết kiệm của bạn? Hành động này không thể hoàn tác.', { title: 'Xóa toàn bộ dữ liệu', okText: 'Xóa hết', danger: true });
      if (!ok) return;
      try {
        await Store.demo.clearAll();
        UI.toast('Đã xóa toàn bộ dữ liệu.', 'success');
      } catch (err) { UI.toast(UI.errMsg(err), 'error'); }
    });
  }

  render();
})();
