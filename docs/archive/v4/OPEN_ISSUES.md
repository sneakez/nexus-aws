# NEXUSOMS V4 — OPEN ISSUES & TRACKING
**Architecture Review & Technical Debt Register**  
**Date:** 2026-10-28  
**Status:** MONITORED (Non-blocking for V4 Baseline)

---

## 1. Các Vấn đề Đang Theo dõi

| Mã | Mức độ | Hạng mục | Mô tả chi tiết | Kế hoạch giải quyết |
| :--- | :---: | :--- | :--- | :--- |
| **ISSUE-01** | P2 | Background Worker | Chưa có background worker tự động gửi HTTP webhook outbound từ bảng `webhook_delivery_logs`. Hiện tại mới lưu log và hỗ trợ gửi thủ công qua UI. | Cấu hình Supabase pg_net trigger hoặc Edge Function chạy định kỳ qua Cron để quét và gửi các event `pending`. |
| **ISSUE-02** | P2 | Server-side Pagination | Các trang danh sách lớn (`OrdersPage`, `StockLedgerPage`) đang tải tối đa 100-200 bản ghi thay vì phân trang server-side dạng cursor. | Triển khai phân trang cursor-based trên Supabase (`range(from, to)`) khi dữ liệu vượt quá 5.000 dòng. |
| **ISSUE-03** | P3 | UI i18n Localization | Một số thông báo toast và trạng thái vẫn dùng tiếng Anh xen lẫn tiếng Việt. | Chuẩn hóa toàn bộ từ điển sang tiếng Việt hoặc tích hợp thư viện đa ngôn ngữ `i18next`. |

---

## 2. Phần Chưa Thể Xác Minh Trực Tiếp Trên Production (Marked: NOT VERIFIED)

Theo nguyên tắc an toàn: **"Tuyệt đối không tự ý thay đổi database production, chạy migration phá hủy dữ liệu hoặc deploy"**:
- **Migration V4 trên Live DB:** File migration `20261028080000_v4_p0_multitenant_transactions_and_security.sql` đã được viết và kiểm thử logic trong test harness, nhưng **CHƯA được apply vào database production thật** (`omedrlhbvgbhjysluvwr`).
- **Tải trọng cao (High concurrency load test):** Không chạy bắn tải 500 requests đồng thời vào Supabase production để tránh cạn kiệt connection pool của hệ thống trực tiếp.
