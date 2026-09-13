CREATE DATABASE QuanLyChiTieu;
GO
USE QuanLyChiTieu;
GO
/* ============================================================
   1. BANG NGUOI_DUNG
   ============================================================ */
CREATE TABLE NGUOI_DUNG (
    ma_nd           INT             IDENTITY(1,1) NOT NULL,
    ten_dang_nhap   VARCHAR(50)     NOT NULL,
    mat_khau        VARCHAR(255)    NOT NULL,
    ho_ten          NVARCHAR(100)   NOT NULL,
    email           VARCHAR(100)    NOT NULL,
    sdt             VARCHAR(15)     NULL,
    CONSTRAINT PK_NGUOI_DUNG PRIMARY KEY (ma_nd),
    CONSTRAINT UQ_NGUOIDUNG_tendangnhap UNIQUE (ten_dang_nhap),
    CONSTRAINT UQ_NGUOIDUNG_email UNIQUE (email)
);
GO
/* ============================================================
   2. BANG DANH_MUC
   ============================================================ */
CREATE TABLE DANH_MUC (
    ma_danh_muc     INT             IDENTITY(1,1) NOT NULL,
    ten_danh_muc    NVARCHAR(100)   NOT NULL,
    loai_danh_muc   NVARCHAR(10)    NOT NULL,
    CONSTRAINT PK_DANH_MUC PRIMARY KEY (ma_danh_muc),
    CONSTRAINT CK_DANHMUC_loai
        CHECK (loai_danh_muc IN (N'Thu', N'Chi'))
);
GO
/* ============================================================
   3. BANG GIAO_DICH
   ============================================================ */
CREATE TABLE GIAO_DICH (
    ma_giao_dich    INT             IDENTITY(1,1) NOT NULL,
    ma_nd           INT             NOT NULL,
    ma_danh_muc     INT             NOT NULL,
    so_tien         DECIMAL(15,2)   NOT NULL,
    ngay_giao_dich  DATE            NOT NULL DEFAULT GETDATE(),
    ghi_chu         NVARCHAR(200)   NULL,
    CONSTRAINT PK_GIAO_DICH PRIMARY KEY (ma_giao_dich),
    CONSTRAINT FK_GIAODICH_NGUOIDUNG FOREIGN KEY (ma_nd)
        REFERENCES NGUOI_DUNG (ma_nd),
    CONSTRAINT FK_GIAODICH_DANHMUC FOREIGN KEY (ma_danh_muc)
        REFERENCES DANH_MUC (ma_danh_muc),
    CONSTRAINT CK_GIAODICH_sotien
        CHECK (so_tien > 0)
);
GO