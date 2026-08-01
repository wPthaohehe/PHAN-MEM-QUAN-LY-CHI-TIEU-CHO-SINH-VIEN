# Phần mềm quản lý chi tiêu cho sinh viên

## 1. Mô tả ngắn gọn & Mục tiêu dự án
*   **Mô tả:** Là phần mềm quản lý chi tiêu cá nhân dành riêng cho sinh viên, giúp người dùng theo dõi các khoản thu – chi hàng ngày một cách đơn giản và trực quan. Với nguồn tài chính hạn chế và thường xuyên biến động (học bổng, làm thêm, trợ cấp từ gia đình...), sinh viên rất cần một công cụ giúp kiểm soát dòng tiền, tránh chi tiêu vượt mức và hình thành thói quen quản lý tài chính cá nhân ngay từ khi còn ngồi trên ghế nhà trường. Dự án ra đời nhằm giải quyết vấn đề đó.
*   **Mục tiêu:** 
- Giúp sinh viên ghi chép và theo dõi thu – chi hàng ngày nhanh chóng, dễ dàng
- Phân loại chi tiêu theo từng danh mục cụ thể (ăn uống, học tập, đi lại, giải trí...)
- Trực quan hóa dữ liệu chi tiêu qua biểu đồ, giúp người dùng dễ dàng nhận biết thói quen chi tiêu của bản thân

## 2. Thành viên nhóm
*   [Ngô Hoàng Phương Thảo] - [28A4042635] 
*   [Lê Minh Ánh] - [28A4042584] 

## 3. Các chức năng chính 
### Yêu cầu chức năng:
*   Đăng nhập/ Đăng ký tài khoản
*   Thêm/sửa/xóa khoản thu-chi (CRUD)
*   Thống kê, biểu đồ

### Cách thức hoạt động:
* **Đăng ký tài khoản**: người dùng nhập tên đăng nhập, mật khẩu, họ tên, email → hệ thống kiểm tra tên đăng nhập/email chưa từng tồn tại → nếu hợp lệ thì lưu tài khoản mới vào database, nếu trùng thì báo lỗi và yêu cầu nhập lại.
* **Đăng nhập**: người dùng nhập tên đăng nhập và mật khẩu → hệ thống đối chiếu với dữ liệu đã lưu → nếu khớp thì cho vào trang chính, nếu sai thì hiển thị thông báo "Sai tài khoản hoặc mật khẩu".
*   **Thêm giao dịch**: người dùng chọn loại (thu/chi) → chọn danh mục (VD: ăn uống, học tập,...) → nhập số tiền, ngày, ghi chú → hệ thống lưu vào database và cập nhật lại tổng chi tiêu.
*   **Sửa giao dịch**: người dùng chọn 1 giao dịch trong danh sách → chỉnh sửa thông tin (số tiền, danh mục, ngày, ghi chú) → hệ thống cập nhật lại dữ liệu trong database.
*   **Xóa giao dịch**: người dùng chọn 1 giao dịch → xác nhận xóa → hệ thống xóa bản ghi khỏi database và cập nhật lại tổng chi tiêu.
*   **Thống kê chi tiêu**: hệ thống lấy toàn bộ giao dịch trong khoảng thời gian được chọn (ngày/tuần/tháng) → gộp nhóm theo danh mục → tính tổng từng nhóm → hiển thị dưới dạng biểu đồ (tròn, cột) để người dùng dễ so sánh
### Yêu cầu phi chức năng:
*   **Lưu trữ dữ liệu**: Toàn bộ giao dịch phải được lưu vào database MySQL, đảm bảo dữ liệu vẫn còn khi tắt/mở lại ứng dụng. Sử dụng XAMPP để chạy MySQL Server cục bộ trong quá trình phát triển.
*   **Giao diện dễ sử dụng**: Xây dựng bằng Qt (C++), bố cục đơn giản, rõ ràng; thao tác thêm 1 giao dịch không quá 3 bước; các nút chức năng chính hiển thị ngay trên màn hình chính.
*   **Hệ thống hoạt động ổn định, hạn chế lỗi**: Kiểm tra tính hợp lệ của dữ liệu đầu vào (số tiền phải lớn hơn 0, ngày nhập phải hợp lệ, danh mục bắt buộc phải chọn); sử dụng try-catch cho mọi thao tác kết nối và truy vấn cơ sở dữ liệu (đặc biệt xử lý trường hợp mất kết nối đến MySQL Server); ứng dụng không bị treo/sập khi người dùng nhập sai định dạng.
*   **Đảm bảo tính chính xác của dữ liệu**: Sử dụng khóa ngoại (Foreign Key) để ràng buộc dữ liệu giữa các bảng; kiểm tra trùng lặp khi thêm giao dịch; tổng chi tiêu hiển thị phải khớp chính xác với dữ liệu đã lưu trong database.

## 4. Công nghệ dự kiến sử dụng
*   Ngôn ngữ lập trình: C++
*   Framework giao diện: Qt
*   Hệ quản trị CSDL / Lưu trữ: MySQL
*   Công cụ quản lý: Git, GitHub
## 5. Tài liệu chi tiết
*   [Thiết kế Database](https://docs.google.com/document/d/1g6KCY7egKtHEWlcyVNjYLM6KV7qg6kOb/edit)
