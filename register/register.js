document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');

  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const termsInput = document.getElementById('terms');

  const fullNameError = document.getElementById('fullNameError');
  const emailError = document.getElementById('emailError');
  const phoneError = document.getElementById('phoneError');
  const passwordError = document.getElementById('passwordError');
  const confirmPasswordError = document.getElementById('confirmPasswordError');
  const termsError = document.getElementById('termsError');
  const formError = document.getElementById('formError');

  // Họ tên: chỉ chữ cái (có dấu tiếng Việt) và khoảng trắng, tối thiểu 2 ký tự
  const NAME_REGEX = /^[\p{L}\s]{2,50}$/u;
  // Email: dạng ten@domain.duoi
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Số điện thoại Việt Nam: bắt đầu bằng 0 hoặc +84, theo sau 9 chữ số
  const PHONE_REGEX = /^(0|\+84)\d{9}$/;
  // Mật khẩu: tối thiểu 6 ký tự, có ít nhất 1 chữ và 1 số
  const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

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

  function validateFullName() {
    const value = fullNameInput.value.trim();
    if (value === '') {
      fullNameError.textContent = 'Vui lòng nhập họ và tên.';
      return false;
    }
    if (!NAME_REGEX.test(value)) {
      fullNameError.textContent = 'Họ và tên chỉ được chứa chữ cái và khoảng trắng.';
      return false;
    }
    fullNameError.textContent = '';
    return true;
  }

  function validateEmail() {
    const value = emailInput.value.trim();
    if (value === '') {
      emailError.textContent = 'Vui lòng nhập email.';
      return false;
    }
    if (!EMAIL_REGEX.test(value)) {
      emailError.textContent = 'Email không đúng định dạng (vd: ten@example.com).';
      return false;
    }
    emailError.textContent = '';
    return true;
  }

  function validatePhone() {
    const value = phoneInput.value.trim();
    if (value === '') {
      phoneError.textContent = 'Vui lòng nhập số điện thoại.';
      return false;
    }
    if (!PHONE_REGEX.test(value)) {
      phoneError.textContent = 'Số điện thoại không hợp lệ (vd: 0912345678).';
      return false;
    }
    phoneError.textContent = '';
    return true;
  }

  function validatePassword() {
    const value = passwordInput.value;
    if (value === '') {
      passwordError.textContent = 'Vui lòng nhập mật khẩu.';
      return false;
    }
    if (!PASSWORD_REGEX.test(value)) {
      passwordError.textContent = 'Mật khẩu tối thiểu 6 ký tự, gồm cả chữ và số.';
      return false;
    }
    passwordError.textContent = '';
    return true;
  }

  function validateConfirmPassword() {
    const value = confirmPasswordInput.value;
    if (value === '') {
      confirmPasswordError.textContent = 'Vui lòng nhập lại mật khẩu.';
      return false;
    }
    if (value !== passwordInput.value) {
      confirmPasswordError.textContent = 'Mật khẩu nhập lại không khớp.';
      return false;
    }
    confirmPasswordError.textContent = '';
    return true;
  }

  function validateTerms() {
    if (!termsInput.checked) {
      termsError.textContent = 'Bạn cần đồng ý với Điều khoản sử dụng.';
      return false;
    }
    termsError.textContent = '';
    return true;
  }

  // Kiểm tra ngay khi người dùng gõ, để chữ cảnh báo tự mất khi nhập đúng
  fullNameInput.addEventListener('input', validateFullName);
  emailInput.addEventListener('input', validateEmail);
  phoneInput.addEventListener('input', validatePhone);
  passwordInput.addEventListener('input', () => {
    validatePassword();
    if (confirmPasswordInput.value !== '') {
      validateConfirmPassword();
    }
  });
  confirmPasswordInput.addEventListener('input', validateConfirmPassword);
  termsInput.addEventListener('change', validateTerms);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    formError.style.color = '#e63946';
    formError.textContent = '';

    const isNameValid = validateFullName();
    const isEmailValid = validateEmail();
    const isPhoneValid = validatePhone();
    const isPasswordValid = validatePassword();
    const isConfirmValid = validateConfirmPassword();
    const isTermsValid = validateTerms();

    const allValid = isNameValid && isEmailValid && isPhoneValid
      && isPasswordValid && isConfirmValid && isTermsValid;

    if (!allValid) {
      return;
    }

    const users = getUsers();
    const emailLower = emailInput.value.trim().toLowerCase();
    const emailExists = users.some((user) => user.email.toLowerCase() === emailLower);

    if (emailExists) {
      emailError.textContent = 'Email này đã được đăng ký.';
      return;
    }

    const newUser = {
      fullName: fullNameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      password: passwordInput.value
    };

    users.push(newUser);
    saveUsers(users);

    console.log('Đăng ký thành công:', newUser);

    formError.style.color = '#2f7d5b';
    formError.textContent = 'Đăng ký thành công! Đang chuyển sang trang đăng nhập...';

    setTimeout(() => {
      window.location.href = '../login/login.html';
    }, 1200);
  });
});
