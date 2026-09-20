/* ================================================================
   POKETTO - THIẾT KẾ VẬT LÝ CƠ SỞ DỮ LIỆU (SQL Server)
   ----------------------------------------------------------------
   File này mô phỏng bằng bảng quan hệ đúng 4 "bảng" (mảng JSON)
   hiện có trong storage.js, để có thể chuyển từ LocalStorage sang
   SQL Server sau này mà không đổi cấu trúc dữ liệu:

     JS (storage.js)              SQL (file này)
     ---------------------------  ---------------------------
     poketto_users             -> NGUOI_DUNG
     poketto_categories        -> DANH_MUC
     poketto_transactions      -> GIAO_DICH
     poketto_budgets           -> NGAN_SACH

   ================================================================ */
CREATE DATABASE QuanLyChiTieu;
GO
USE QuanLyChiTieu;
GO

/* ================================================================
   1. BẢNG NGUOI_DUNG  <->  storage.js: KEYS.users (poketto_users)
   ------------------------------------------------------------
   Trường JS tương ứng: { fullName, email, phone, password }
   Ứng dụng đăng nhập bằng EMAIL, không có username riêng
   (register.js không thu thập username) nên bảng này không có
   cột "ten_dang_nhap" như bản thiết kế trước.
   ================================================================ */
CREATE TABLE NGUOI_DUNG (
    ma_nd           INT             IDENTITY(1,1) NOT NULL,
    ho_ten          NVARCHAR(100)   NOT NULL,      -- fullName
    email           VARCHAR(100)    NOT NULL,      -- email (dùng để đăng nhập)
    sdt             VARCHAR(15)     NOT NULL,      -- phone (bắt buộc khi đăng ký)
    mat_khau        VARCHAR(255)    NOT NULL,      -- password
    CONSTRAINT PK_NGUOI_DUNG PRIMARY KEY (ma_nd),
    CONSTRAINT UQ_NGUOIDUNG_email UNIQUE (email)
);
GO
/* Ghi chú bảo mật: register.js/auth.js hiện lưu mat_khau dạng văn bản
   thuần (chưa băm) — đúng với giới hạn đã nêu trong auth.js. Khi có
   backend thật, cột này phải lưu chuỗi đã băm bằng bcrypt/argon2,
   không đổi kiểu cột (VARCHAR(255) đã đủ dài cho một chuỗi băm). */

/* ================================================================
   2. BẢNG DANH_MUC  <->  storage.js: KEYS.categories (poketto_categories)
   ------------------------------------------------------------
   Trường JS tương ứng: { userId, name, type, icon, color }
   QUAN TRỌNG: mỗi người dùng có bộ danh mục RIÊNG (kể cả danh mục
   mặc định do ensureDefaults() tạo ra) — khác bản thiết kế trước,
   nơi DANH_MUC không có khóa ngoại tới người dùng.
   ================================================================ */
CREATE TABLE DANH_MUC (
    ma_danh_muc     INT             IDENTITY(1,1) NOT NULL,
    ma_nd           INT             NOT NULL,          -- userId: danh mục thuộc về ai
    ten_danh_muc    NVARCHAR(100)   NOT NULL,          -- name (tối đa 100 ký tự, validateCategory)
    loai_danh_muc   NVARCHAR(10)    NOT NULL,          -- type: 'income' -> N'Thu', 'expense' -> N'Chi'
    bieu_tuong      NVARCHAR(10)    NOT NULL DEFAULT N'🏷️',   -- icon
    mau_sac         CHAR(7)         NOT NULL DEFAULT '#8d99ae', -- color, dạng mã hex '#rrggbb'
    CONSTRAINT PK_DANH_MUC PRIMARY KEY (ma_danh_muc),
    CONSTRAINT FK_DANHMUC_NGUOIDUNG FOREIGN KEY (ma_nd)
        REFERENCES NGUOI_DUNG (ma_nd),
    CONSTRAINT CK_DANHMUC_loai
        CHECK (loai_danh_muc IN (N'Thu', N'Chi')),
    /* Khớp validateCategory(): 1 người dùng không được có 2 danh mục
       trùng tên trong cùng 1 loại (Thu/Chi). Collation mặc định của
       SQL Server không phân biệt hoa/thường nên ràng buộc này cũng
       tự động chặn trùng tên kiểu "Ăn uống" và "ăn uống". */
    CONSTRAINT UQ_DANHMUC_ND_loai_ten UNIQUE (ma_nd, loai_danh_muc, ten_danh_muc)
);
GO

/* ================================================================
   3. BẢNG GIAO_DICH  <->  storage.js: KEYS.transactions (poketto_transactions)
   ------------------------------------------------------------
   Trường JS tương ứng: { userId, categoryId, amount, date, note, createdAt }
   Loại thu/chi của một giao dịch KHÔNG lưu riêng — được suy ra từ
   DANH_MUC.loai_danh_muc thông qua ma_danh_muc, đúng như storage.js
   (biến `type` trong listTxns() lấy từ danh mục, không lưu ở giao dịch).
   ================================================================ */
CREATE TABLE GIAO_DICH (
    ma_giao_dich    INT             IDENTITY(1,1) NOT NULL,
    ma_nd           INT             NOT NULL,              -- userId
    ma_danh_muc     INT             NOT NULL,              -- categoryId
    so_tien         DECIMAL(15,2)   NOT NULL,              -- amount (MAX_AMOUNT ~ 999,999,999,999)
    ngay_giao_dich  DATE            NOT NULL DEFAULT GETDATE(), -- date 'YYYY-MM-DD'
    ghi_chu         NVARCHAR(200)   NULL,                  -- note (không bắt buộc)
    ngay_tao        DATETIME        NOT NULL DEFAULT GETDATE(), -- createdAt: dùng để sắp xếp khi 2 giao dịch cùng ngày
    CONSTRAINT PK_GIAO_DICH PRIMARY KEY (ma_giao_dich),
    CONSTRAINT FK_GIAODICH_NGUOIDUNG FOREIGN KEY (ma_nd)
        REFERENCES NGUOI_DUNG (ma_nd),
    /* Không có ON DELETE CASCADE: khớp với categories.remove() trong
       storage.js, nơi hệ thống CHẶN xóa một danh mục nếu vẫn còn
       giao dịch tham chiếu tới nó (tránh giao dịch mồ côi). */
    CONSTRAINT FK_GIAODICH_DANHMUC FOREIGN KEY (ma_danh_muc)
        REFERENCES DANH_MUC (ma_danh_muc),
    CONSTRAINT CK_GIAODICH_sotien
        CHECK (so_tien > 0)
);
GO

/* ================================================================
   4. BẢNG NGAN_SACH  <->  storage.js: KEYS.budgets (poketto_budgets)
   ------------------------------------------------------------
   Trường JS tương ứng: { userId, categoryId, month, limit }
   Bảng này CHƯA CÓ trong bản thiết kế trước — bổ sung mới để khớp
   với chức năng Ngân sách đang chạy thật trong code.
   ================================================================ */
CREATE TABLE NGAN_SACH (
    ma_ngan_sach    INT             IDENTITY(1,1) NOT NULL,
    ma_nd           INT             NOT NULL,          -- userId
    ma_danh_muc     INT             NOT NULL,          -- categoryId (chỉ áp dụng cho danh mục loại 'Chi')
    thang           CHAR(7)         NOT NULL,          -- month 'YYYY-MM', ví dụ '2026-09'
    han_muc         DECIMAL(15,2)   NOT NULL,          -- limit
    CONSTRAINT PK_NGAN_SACH PRIMARY KEY (ma_ngan_sach),
    CONSTRAINT FK_NGANSACH_NGUOIDUNG FOREIGN KEY (ma_nd)
        REFERENCES NGUOI_DUNG (ma_nd),
    CONSTRAINT FK_NGANSACH_DANHMUC FOREIGN KEY (ma_danh_muc)
        REFERENCES DANH_MUC (ma_danh_muc),
    CONSTRAINT CK_NGANSACH_hanmuc
        CHECK (han_muc > 0),
    CONSTRAINT CK_NGANSACH_thang
        CHECK (thang LIKE '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
    /* Khớp budgets.add() trong storage.js: fail(...) nếu đã tồn tại
       ngân sách cho đúng (danh mục, tháng) đó -> ràng buộc UNIQUE. */
    CONSTRAINT UQ_NGANSACH_ND_danhmuc_thang UNIQUE (ma_nd, ma_danh_muc, thang)
);
GO

/* ================================================================
   GHI CHÚ: những ràng buộc nghiệp vụ KHÔNG thể diễn đạt bằng
   CHECK/UNIQUE thuần túy trong SQL Server, hiện đang được xử lý ở
   tầng ứng dụng (storage.js) và nên chuyển thành TRIGGER nếu triển
   khai backend thật:
     - "Chỉ đặt ngân sách cho danh mục loại Chi"
       (storage.js: budgets.add() kiểm tra cat.type === 'expense')
     - Ngưỡng cảnh báo ngân sách 80% / vượt mức 100%
       (storage.js: hàm budgetStatus(percent) — đây là logic hiển
       thị, tính lại mỗi lần xem, không cần lưu xuống cơ sở dữ liệu)
   ================================================================ */
