# Phần mềm Quản lý Chi tiêu cho Sinh viên (Poketto)

## 1. Mô tả ngắn gọn & Mục tiêu dự án
* Mô tả: Là ứng dụng web giúp sinh viên theo dõi và ghi chép các khoản thu - chi hàng ngày. Với khoản tiền hàng tháng có hạn, web giúp người dùng biết mình đã tiêu những gì để tránh bị mất cân bằng chi tiêu.
* Mục tiêu:
  - Ghi chép thu chi nhanh gọn ngay trên trình duyệt máy tính hoặc điện thoại.
  - Phân loại giao dịch theo từng nhóm như ăn uống, đi lại, học tập, nhà trọ.
  - Đặt hạn mức chi tiêu cho từng tháng để biết khi nào sắp tiêu quá tay.
  - Hiển thị biểu đồ trực quan để dễ theo dõi thói quen tiêu tiền.

## 2. Thành viên nhóm
* Ngô Hoàng Phương Thảo - 28A4042635
* Lê Minh Ánh - 28A4042584

## 3. Các chức năng chính
* Đăng ký & Đăng nhập: Người dùng tạo tài khoản mới bằng họ tên, email, số điện thoại và mật khẩu; hệ thống kiểm tra tính hợp lệ của dữ liệu đầu vào và lưu trạng thái đăng nhập để bảo vệ dữ liệu riêng của từng người.
* Quản lý thu - chi: Cho phép thêm, sửa, xóa các khoản giao dịch hàng ngày kèm số tiền, danh mục, ngày thực hiện và ghi chú; hệ thống có kiểm tra số tiền hợp lệ, cảnh báo khi nhập trùng, hỗ trợ lọc theo mốc thời gian/danh mục, tìm kiếm và xuất dữ liệu ra file CSV.
* Quản lý danh mục & Ngân sách: Cung cấp sẵn các nhóm chi tiêu cơ bản và cho phép tạo mới danh mục (không cho xóa danh mục đã phát sinh giao dịch); hỗ trợ đặt hạn mức chi tiêu tối đa theo tháng và tự động đổi màu cảnh báo khi người dùng tiêu gần hết hoặc vượt quá ngân sách.
* Thống kê & Biểu đồ: Tổng hợp các khoản thu chi để tính toán số dư hiện tại, trực quan hóa dữ liệu qua biểu đồ tròn (thể hiện cơ cấu tỷ trọng từng danh mục) và biểu đồ cột (so sánh tương quan tổng thu với tổng chi theo từng tháng).

## 4. Công nghệ sử dụng
* Giao diện web: HTML, CSS, JavaScript.
* Lưu trữ dữ liệu: Sử dụng LocalStorage của trình duyệt để lưu lại dữ liệu người dùng và các khoản chi tiêu (đóng trình duyệt mở lại vẫn còn nguyên).
* Thiết kế CSDL: Nhóm đã có sẵn file thiết kế bảng dữ liệu THIET_KE_VATLY.sql để chuẩn bị cho việc kết nối SQL Server sau này.
* Quản lý mã nguồn: Git, GitHub.

## 5. Chạy dự án

1. Mở terminal tại đúng thư mục dự án (thư mục chứa `server.js`).
2. Chạy lệnh `npm start`.
3. Mở [http://localhost:3000](http://localhost:3000). Máy chủ sẽ tự chuyển tới trang đăng nhập.

Hoặc bạn có thể mở file `login/login.html` bằng **Live Server** trong Visual Studio Code.

> Nếu chưa có **Live Server**, hãy cài extension này trong Visual Studio Code rồi thực hiện lại các bước trên.
