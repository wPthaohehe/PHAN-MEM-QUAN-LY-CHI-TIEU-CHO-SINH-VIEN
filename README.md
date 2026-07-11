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
*   **Thêm giao dịch**: người dùng chọn loại (thu/chi) → chọn danh mục (VD: ăn uống, học tập,...) → nhập số tiền, ngày, ghi chú → hệ thống lưu vào database và cập nhật lại tổng chi tiêu.
*   **Thống kê chi tiêu**: hệ thống lấy toàn bộ giao dịch trong khoảng thời gian được chọn (ngày/tuần/tháng) → gộp nhóm theo danh mục → tính tổng từng nhóm → hiển thị dưới dạng biểu đồ (tròn, cột) để người dùng dễ so sánh
### Yêu cầu phi chức năng:
*   Dữ liệu được lưu lại sau khi tắt ứng dụng: Toàn bộ giao dịch, ngân sách phải được lưu vào database (SQLite/MySQL) hoặc local storage, 
*   Giao diện dễ sử dụng: Đơn giản, trực quan, phù hợp thao tác nhanh trên điện thoại/máy tính
*   Hệ thống hoạt động ổn định, hạn chế lỗi.
*   Đảm bảo tính chính xác của dữ liệu.

## 4. Công nghệ dự kiến sử dụng
*   Ngôn ngữ lập trình: C++
*   Hệ quản trị CSDL / Lưu trữ: 
*   Công cụ quản lý: Git, GitHub

## 5. Thiết kế Database

### Xác định các thực thể:
* NguoiDung (Người dùng)
* DanhMuc (Danh mục thu/chi)
* GiaoDich (Giao dịch thu/chi)

### Thuộc tính & khóa chính từng thực thể:

**NguoiDung**
* MaND (khóa chính)
* TenDangNhap
* MatKhau
* HoTen
* Email
* SDT

**DanhMuc**
* MaDanhMuc (khóa chính)
* TenDanhMuc (VD: ăn uống, học tập, đi lại...)
* LoaiDanhMuc (Thu/Chi)

**GiaoDich**
* MaGiaoDich (khóa chính)
* MaND (khóa ngoại → NguoiDung)
* MaDanhMuc (khóa ngoại → DanhMuc)
* SoTien
* NgayGiaoDich
* GhiChu

### Mối quan hệ giữa các thực thể:
* NguoiDung – GiaoDich: quan hệ 1-nhiều (1 người dùng có nhiều giao dịch)
* DanhMuc – GiaoDich: quan hệ 1-nhiều (1 danh mục có nhiều giao dịch)

### Sơ đồ quan hệ (ERD):
```
NguoiDung (1) ──< (n) GiaoDich (n) >── (1) DanhMuc
```
