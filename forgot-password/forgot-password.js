document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgotForm');
  const emailInput = document.getElementById('forgotEmail');
  const emailError = document.getElementById('emailError');
  const successMessage = document.getElementById('successMessage');

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem('poketto_users')) || [];
    } catch (error) {
      return [];
    }
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

  emailInput.addEventListener('input', validateEmail);

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    if (!validateEmail()) {
      return;
    }

    const emailLower = emailInput.value.trim().toLowerCase();
    const users = getUsers();
    const exists = users.some((user) => user.email.toLowerCase() === emailLower);

    if (!exists) {
      emailError.textContent = 'Email này chưa được đăng ký trong hệ thống.';
      console.log('Không tìm thấy email trong danh sách người dùng.');
      return;
    }

    // Đây là bản demo giao diện (chưa gửi email thật).
    // Khi có backend thật, thay đoạn này bằng lệnh gọi API gửi OTP.
    console.log('Đã gửi mã OTP (giả lập) tới:', emailInput.value.trim());
    form.style.display = 'none';
    successMessage.style.display = 'block';
  });
});
