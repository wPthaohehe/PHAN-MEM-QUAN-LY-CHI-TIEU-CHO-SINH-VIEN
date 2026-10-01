# Trợ lý AI Poketto

Trang tư vấn chi tiêu chạy trong ứng dụng Poketto.

## Tệp

- `chatbot.html`: điểm vào của trang.
- `chatbot.css`: giao diện riêng, kế thừa màu sắc và chế độ sáng/tối từ `app.css`.
- `chatbot.js`: hội thoại, gợi ý theo quy tắc và đọc thống kê trong `Store`.

## Chạy

Chạy ứng dụng từ thư mục gốc theo hướng dẫn trong `README.md` chính (`npm start`), đăng nhập và chọn **Trợ lý AI** ở thanh bên. Không mở trực tiếp tệp HTML vì tính năng cần các script đăng nhập và dữ liệu chung của Poketto.

## Phạm vi hiện tại

Đây là trợ lý tư vấn cục bộ theo từ khóa và quy tắc, không gọi dịch vụ/mô hình AI trực tuyến và không cần API key. Thống kê chỉ lấy giao dịch, danh mục và ngân sách của tài khoản hiện đang đăng nhập; lịch sử chat lưu trong localStorage theo tài khoản. Để tích hợp LLM thật sau này, hãy gọi API qua backend có quản lý khóa; không đặt API key trong JavaScript phía trình duyệt.
