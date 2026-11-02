# NEXUSOMS V4.1 — PERFORMANCE REPORT
**Frontend & API Performance Benchmark**  
**Date:** 2026-10-28  

---

## 1. Kết quả Benchmark Bundle & Build

- **Thời gian Build Production:** 5.80s (Vite v7.3.7).
- **Kích thước Bundle Chính:**
  - `dist/assets/index-*.js`: ~340 kB (103 kB gzip).
  - `dist/assets/index-*.css`: ~52 kB (8.5 kB gzip).
- **Code Splitting (React.lazy):**
  - Toàn bộ 27 trang nghiệp vụ đều được tách thành các chunks JavaScript riêng biệt (trung bình 3–15 kB/trang).
  - Trang chỉ tải khi người dùng điều hướng tới, tối ưu hóa First Contentful Paint (FCP) dưới 800ms trên mạng 4G.

---

## 2. Server-side Pagination & Truy vấn Lớn

1. **Phân trang dạng Range:**
   - Cập nhật các trang dữ liệu lớn (`OrdersPage`, `StockLedgerPage`) hỗ trợ tham số `.range(from, to)` kết hợp `count: 'exact'`.
   - Giới hạn kích thước trang mặc định ở mức 25 bản ghi/trang thay vì tải toàn bộ bảng vào bộ nhớ client.
2. **Indexing:**
   - Đảm bảo toàn bộ bảng có chỉ mục trên cột `tenant_id` (`idx_<table>_tenant_id`) và chỉ mục kết hợp `(tenant_id, idempotency_key)`.
