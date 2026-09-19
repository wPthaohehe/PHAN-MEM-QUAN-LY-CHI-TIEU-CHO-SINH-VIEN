/* ============================================================
   Poketto - Xác thực & phiên đăng nhập (dùng chung cho mọi trang)
   ------------------------------------------------------------
   - Danh sách tài khoản: localStorage['poketto_users']  (đã có sẵn từ trang đăng ký)
   - Phiên đăng nhập:    key 'poketto_current_user'
        + Tick "Ghi nhớ đăng nhập"  -> lưu trong localStorage (đóng trình duyệt vẫn còn)
        + Không tick                -> lưu trong sessionStorage (đóng tab là hết)
   - Phiên chỉ chứa {id, fullName, email}, KHÔNG chứa mật khẩu.

   LƯU Ý: kiểm tra đăng nhập ở phía trình duyệt chỉ để điều hướng/giao diện,
   chưa phải bảo mật thật. Bảo mật thật cần backend (xem ghi chú cuối file).
   ============================================================ */
(function (global) {
  'use strict';

  const SESSION_KEY = 'poketto_current_user';
  const USERS_KEY = 'poketto_users';
  const LOGIN_URL = '../login/login.html';
  const HOME_URL = '../dashboard/dashboard.html';

  function readUsers() {
    try {
      const v = JSON.parse(localStorage.getItem(USERS_KEY));
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }

  function writeUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function newId() {
    return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function parseSession(storage) {
    try {
      const raw = storage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* bỏ qua */ }
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* bỏ qua */ }
  }

  function userExists(id) {
    return readUsers().some(function (u) { return u.id === id; });
  }

  const Auth = {
    LOGIN_URL: LOGIN_URL,
    HOME_URL: HOME_URL,
    newId: newId,
    getUsers: readUsers,
    saveUsers: writeUsers,

    /** Trả về {id, fullName, email} nếu đang đăng nhập, ngược lại null. */
    current: function () {
      let s = null;
      try { s = parseSession(sessionStorage); } catch (e) { s = null; }
      if (!s) s = parseSession(localStorage);
      // Phiên kiểu cũ (không có id, có thể chứa mật khẩu) bị coi là không hợp lệ
      if (!s || !s.id) return null;
      return { id: s.id, fullName: s.fullName, email: s.email };
    },

    /**
     * Tạo phiên đăng nhập cho user (lấy từ danh sách users).
     * Tài khoản đăng ký từ bản cũ chưa có `id` sẽ được cấp id tại đây.
     */
    login: function (user, remember) {
      const users = readUsers();
      const emailKey = String(user.email || '').toLowerCase();
      const stored = users.find(function (u) {
        return String(u.email || '').toLowerCase() === emailKey;
      });
      if (!stored) return null;
      if (!stored.id) {
        stored.id = newId();
        writeUsers(users);
      }
      clearSession();
      const session = { id: stored.id, fullName: stored.fullName, email: stored.email };
      const target = remember ? localStorage : sessionStorage;
      target.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    },

    /** Cập nhật thông tin hiển thị trong phiên (vd: sau khi đổi họ tên). */
    updateSession: function (patch) {
      const cur = Auth.current();
      if (!cur) return;
      const next = Object.assign({}, cur, patch);
      const inLocal = !!parseSession(localStorage);
      (inLocal ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(next));
    },

    /** Dùng đầu mỗi trang bên trong: chưa đăng nhập -> đá về trang login. */
    requireLogin: function () {
      const s = Auth.current();
      if (!s || !userExists(s.id)) {
        clearSession();
        location.replace(LOGIN_URL);
        return null;
      }
      return s;
    },

    /** Dùng ở trang login: đã đăng nhập rồi thì vào thẳng dashboard. */
    redirectIfLoggedIn: function () {
      const s = Auth.current();
      if (s && userExists(s.id)) {
        location.replace(HOME_URL);
        return true;
      }
      return false;
    },

    logout: function () {
      clearSession();
      location.replace(LOGIN_URL);
    }
  };

  global.Auth = Auth;

  /* ------------------------------------------------------------
     GHI CHÚ khi chuyển sang backend thật (Node/PHP/... + MySQL):
     - Mật khẩu phải được băm (bcrypt/argon2) và kiểm tra ở SERVER.
     - Server trả về token (JWT) hoặc cookie phiên; mỗi request gửi kèm.
     - Server luôn lọc dữ liệu theo user của token, không tin id gửi từ trình duyệt.
     ------------------------------------------------------------ */
})(window);
