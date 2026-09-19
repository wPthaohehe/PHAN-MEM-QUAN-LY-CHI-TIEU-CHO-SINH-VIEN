document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const identifierInput = document.getElementById('identifier');
  const passwordInput = document.getElementById('password');

  const identifierError = document.getElementById('identifierError');
  const passwordError = document.getElementById('passwordError');
  const loginError = document.getElementById('loginError');

  // Nếu phiên vẫn còn hợp lệ, không yêu cầu người dùng đăng nhập lại.
  if (window.Auth && Auth.redirectIfLoggedIn()) return;

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
    const users = Auth.getUsers();

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

    // Dùng mô-đun xác thực chung để tôn trọng lựa chọn "Ghi nhớ đăng nhập".
    const remember = form.elements.remember.checked;
    const session = Auth.login(matchedUser, remember);
    if (!session) {
      loginError.textContent = 'Không thể tạo phiên đăng nhập. Vui lòng thử lại.';
      return;
    }
    console.log('Đăng nhập thành công:', session);

    loginError.style.color = '#2f7d5b';
    loginError.textContent = 'Đăng nhập thành công! Chào mừng ' + matchedUser.fullName + '.';

    setTimeout(function () {
      window.location.href = '../dashboard/dashboard.html';
    }, 600);
  });
});
