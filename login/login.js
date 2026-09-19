document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const identifierInput = document.getElementById('identifier');
  const passwordInput = document.getElementById('password');

  const identifierError = document.getElementById('identifierError');
  const passwordError = document.getElementById('passwordError');
  const loginError = document.getElementById('loginError');

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem('poketto_users')) || [];
    } catch (error) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem('poketto_users', JSON.stringify(users));
  }

  function newId() {
    return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function validateIdentifier() {
    if (identifierInput.value.trim() === '') {
      identifierError.textContent = 'Vui lòng nhập email hoặc tên đăng nhập.';
      return false;
    }
    identifierError.textContent = '';
    return true;
  }

  function validatePassword() {
    if (passwordInput.value === '') {
      passwordError.textContent = 'Vui lòng nhập mật khẩu.';
      return false;
    }
    passwordError.textContent = '';
    return true;
  }

  identifierInput.addEventListener('input', validateIdentifier);
  passwordInput.addEventListener('input', validatePassword);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    loginError.style.color = '#e63946';
    loginError.textContent = '';

    const isIdentifierValid = validateIdentifier();
    const isPasswordValid = validatePassword();

    if (!(isIdentifierValid && isPasswordValid)) {
      return;
    }

    const identifier = identifierInput.value.trim().toLowerCase();
    const users = getUsers();

    const matchedUser = users.find((user) => {
      const emailMatches = user.email && user.email.toLowerCase() === identifier;
      const nameMatches = user.fullName && user.fullName.toLowerCase() === identifier;
      return emailMatches || nameMatches;
    });

    if (!matchedUser || matchedUser.password !== passwordInput.value) {
      loginError.textContent = 'Sai tài khoản hoặc mật khẩu.';
      console.log('Đăng nhập thất bại: sai tài khoản hoặc mật khẩu.');
      return;
    }

    // Tài khoản tạo từ bản cũ có thể chưa có id -> cấp id và lưu lại
    if (!matchedUser.id) {
      matchedUser.id = newId();
      saveUsers(users);
    }

    // Phiên đăng nhập chỉ chứa id/fullName/email, KHÔNG chứa mật khẩu
    const session = { id: matchedUser.id, fullName: matchedUser.fullName, email: matchedUser.email };
    localStorage.setItem('poketto_current_user', JSON.stringify(session));
    console.log('Đăng nhập thành công:', session);

    loginError.style.color = '#2f7d5b';
    loginError.textContent = 'Đăng nhập thành công! Chào mừng ' + matchedUser.fullName + '.';

    setTimeout(function () {
      window.location.href = '../dashboard/dashboard.html';
    }, 600);
  });
});