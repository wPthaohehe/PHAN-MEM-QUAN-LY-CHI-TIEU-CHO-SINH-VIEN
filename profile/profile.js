(function () {
  'use strict';

  const user = UI.initShell({ active: 'profile', title: 'Hồ sơ', onDataChange: function () {} });
  if (!user) return;

  const root = document.getElementById('content');
  const esc = UI.esc;

  async function render() {
    try {
      const p = await Store.profile.get();
      root.innerHTML =
        '<div class="page-head"><div><h1>Hồ sơ cá nhân</h1><p class="muted">Quản lý thông tin tài khoản và dữ liệu của bạn.</p></div></div>' +
        '<div class="grid two">' +
          '<div class="card"><h3>Thông tin tài khoản</h3>' +
            '<form class="form" id="infoForm" novalidate>' +
              '<label for="pName">Họ và tên</label><input type="text" id="pName" maxlength="50"><span class="field-error" id="pNameErr"></span>' +
              '<label for="pEmail">Email <small class="muted">(dùng để đăng nhập, không đổi được)</small></label><input type="email" id="pEmail" readonly>' +
              '<label for="pPhone" style="margin-top:12px">Số điện thoại</label><input type="tel" id="pPhone" maxlength="12"><span class="field-error" id="pPhoneErr"></span>' +
              '<span class="field-error form-error" id="infoErr"></span><div class="form-success" id="infoOk"></div>' +
              '<button type="submit" class="btn primary">Lưu thông tin</button>' +
            '</form></div>' +

          '<div class="card"><h3>Đổi mật khẩu</h3>' +
            '<form class="form" id="pwForm" novalidate>' +
              '<label for="pwOld">Mật khẩu hiện tại</label><input type="password" id="pwOld" autocomplete="current-password">' +
              '<label for="pwNew">Mật khẩu mới</label><input type="password" id="pwNew" autocomplete="new-password" placeholder="Tối thiểu 6 ký tự, gồm chữ và số">' +
              '<label for="pwNew2">Nhập lại mật khẩu mới</label><input type="password" id="pwNew2" autocomplete="new-password">' +
              '<span class="field-error form-error" id="pwErr"></span><div class="form-success" id="pwOk"></div>' +
              '<button type="submit" class="btn primary">Đổi mật khẩu</button>' +
            '</form></div>' +
        '</div>' +

        '<div class="card" style="margin-bottom:16px"><h3>Dữ liệu</h3>' +
          '<p class="muted" style="margin-bottom:12px">Nạp dữ liệu mẫu (khoảng 3 tháng thu chi, ngân sách, mục tiêu) để xem thử biểu đồ và báo cáo. Bạn có thể xóa sạch bất cứ lúc nào.</p>' +
          '<div class="row-actions"><button class="btn ghost" id="seedBtn">Nạp dữ liệu mẫu</button></div></div>' +

        '<div class="card danger-zone"><h3>Vùng nguy hiểm</h3>' +
          '<p class="muted" style="margin-bottom:12px">Xóa toàn bộ giao dịch, ngân sách và mục tiêu tiết kiệm của bạn. Danh mục và tài khoản được giữ nguyên. Không thể hoàn tác.</p>' +
          '<div class="row-actions"><button class="btn danger" id="clearBtn">Xóa toàn bộ dữ liệu</button></div></div>';

      root.querySelector('#pName').value = p.fullName;
      root.querySelector('#pEmail').value = p.email;
      root.querySelector('#pPhone').value = p.phone;
      bind();
    } catch (e) {
      root.innerHTML = '<div class="card"><div class="empty"><p>' + esc(UI.errMsg(e)) + '</p></div></div>';
    }
  }

  function bind() {
    const $ = function (s) { return root.querySelector(s); };

    $('#infoForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      $('#infoErr').textContent = ''; $('#infoOk').textContent = '';
      $('#pNameErr').textContent = ''; $('#pPhoneErr').textContent = '';
      try {
        await Store.profile.update({ fullName: $('#pName').value, phone: $('#pPhone').value });
        UI.toast('Đã lưu thông tin.', 'success');
        // Tải lại để tên mới hiển thị trên sidebar
        setTimeout(function () { location.reload(); }, 600);
        $('#infoOk').textContent = 'Đã lưu thông tin.';
      } catch (err) {
        const m = UI.errMsg(err);
        if (/họ và tên/i.test(m)) $('#pNameErr').textContent = m;
        else if (/điện thoại/i.test(m)) $('#pPhoneErr').textContent = m;
        else $('#infoErr').textContent = m;
      }
    });

    $('#pwForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      $('#pwErr').textContent = ''; $('#pwOk').textContent = '';
      try {
        await Store.profile.changePassword($('#pwOld').value, $('#pwNew').value, $('#pwNew2').value);
        $('#pwForm').reset();
        $('#pwOk').textContent = 'Đổi mật khẩu thành công.';
        UI.toast('Đã đổi mật khẩu.', 'success');
      } catch (err) { $('#pwErr').textContent = UI.errMsg(err); }
    });

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