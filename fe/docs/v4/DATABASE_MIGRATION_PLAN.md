# NEXUSOMS V4 — DATABASE MIGRATION PLAN
**PostgreSQL & Supabase Architecture Plan**  
**Migration File:** `supabase/migrations/20261028080000_v4_p0_multitenant_transactions_and_security.sql`  
**Execution Target:** Staging -> Production (Pending User Approval)

---

## 1. Mục tiêu Migration

1. Loại bỏ toàn bộ `DEFAULT` tenant_id trên các bảng kinh doanh để ngăn chặn ô nhiễm dữ liệu giữa các tenant.
2. Thêm cột `idempotency_key` và chỉ mục duy nhất trên bảng `orders` (tenant-scoped).
3. Thêm cột `stock_restored` trên bảng `orders`.
4. Thêm cột `is_restocked` và `restocked_at` trên bảng `return_items`.
5. Siết chặt chính sách RLS cho bảng `return_items` theo tenant membership.
6. Thu hồi quyền UPDATE/DELETE trên `audit_logs` để bảo đảm tính chất Append-Only.
7. Tạo mới 5 RPC giao dịch an toàn:
   - `place_order_atomic`
   - `cancel_order_atomic`
   - `delete_order_atomic`
   - `process_return_restock_atomic`
   - `post_journal_entry_atomic`
8. Cập nhật 2 RPC quản trị:
   - `admin_create_user`
   - `admin_update_profile`

---

## 2. Kế hoạch Triển khai Thực tế (Runbook)

### Bước 1: Tiền kiểm tra (Pre-migration Checks)
- Đảm bảo toàn bộ các bản ghi hiện tại trên database đã có `tenant_id` hợp lệ.
- Chạy câu lệnh kiểm tra:
  ```sql
  SELECT count(*) FROM orders WHERE tenant_id IS NULL;
  SELECT count(*) FROM customers WHERE tenant_id IS NULL;
  SELECT count(*) FROM products WHERE tenant_id IS NULL;
  ```
  Nếu kết quả $= 0$, an toàn để tiến hành.

### Bước 2: Thực thi Migration (Execution)
- Chạy file migration bằng Supabase CLI trên môi trường Staging:
  ```bash
  supabase migration apply
  ```
- Hoặc thực thi thông qua Supabase Dashboard SQL Editor (đối với môi trường preview).

### Bước 3: Hậu kiểm tra (Post-migration Verification)
1. Thử gọi `place_order_atomic` từ một user đã xác thực để tạo đơn hàng demo.
2. Kiểm tra log giao dịch trong `stock_transactions` để xác nhận số tồn sau khi trừ (`balance_after`).
3. Thử gọi `place_order_atomic` lần 2 với cùng `idempotency_key` -> kết quả phải trả về đơn hàng đã tạo, không trừ kho lần 2.
4. Thử cập nhật hoặc xóa 1 dòng trong `audit_logs` -> phải bị từ chối bởi database (`permission denied`).
5. Thử truy vấn `return_items` từ Tenant B để đảm bảo không thấy dữ liệu của Tenant A.

---

## 3. Kế hoạch Rollback (Dự phòng)

Nếu xảy ra sự cố không tương thích:
```sql
-- Khôi phục quyền tạm thời nếu có ứng dụng cũ chưa cập nhật
GRANT UPDATE, DELETE ON public.audit_logs TO authenticated;

-- Cho phép gọi các RPC phiên bản trước (nếu cần)
```
*Lưu ý: Không khôi phục lại DEFAULT tenant_id vì DEFAULT tenant_id là nguồn gốc của lỗi rò rỉ dữ liệu giữa các workspace.*
