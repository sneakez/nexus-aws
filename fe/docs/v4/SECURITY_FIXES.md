# NEXUSOMS V4 — SECURITY FIXES
**Security Engineering & Architecture Report**  
**Date:** 2026-10-28  
**Classification:** STRICT AUDIT TRAIL

---

## 1. Tổng quan các Lỗ hổng Bảo mật Đã Khắc phục

| Mã lỗi | Phân loại | Mô tả lỗ hổng ban đầu | Biện pháp khắc phục V4 | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Multi-Tenancy Leak (P0) | 25+ bảng kinh doanh có `tenant_id SET DEFAULT '<default-tenant-uuid>'`. Khi frontend INSERT không gửi `tenant_id`, dữ liệu tự nhảy về tenant mặc định. | Đã viết migration `DROP DEFAULT` trên toàn bộ bảng. Frontend bắt buộc chèn `tenant_id: activeTenant.id`. | **FIXED** |
| **SEC-02** | RLS Bypass (P0) | Bảng `return_items` có chính sách RLS `USING (true)` và `WITH CHECK (true)` cho role `authenticated`. | Thay thế bằng 4 chính sách RLS có scoped membership check (`EXISTS (SELECT 1 FROM tenant_memberships WHERE tenant_id = return_items.tenant_id AND user_id = auth.uid() AND status = 'active')`). | **FIXED** |
| **SEC-03** | Audit Trail Tampering (P0) | Bảng `audit_logs` cấp quyền `UPDATE` và `DELETE` cho role `authenticated`. | Chạy lệnh `REVOKE UPDATE, DELETE ON public.audit_logs FROM PUBLIC, anon, authenticated;` và xóa các policy update/delete. Audit log trở thành strictly Append-Only. | **FIXED** |
| **SEC-04** | Cross-Tenant UI Exposure (P0) | Các câu lệnh `.select('*')` trên các trang Orders, Customers, Products, Inventory không kèm `.eq('tenant_id', activeTenant.id)`. | Đã thêm bộ lọc `tenant_id` cưỡng bức trên toàn bộ query frontend. | **FIXED** |
| **SEC-05** | Double Restocking Attack (P0) | Hủy đơn hàng rồi xóa đơn hoặc chuyển `cancelled` sang `refunded` gây gọi `restore_stock` lặp lại. | Bổ sung cột `stock_restored boolean` trên `orders` và chuyển logic sang RPC `cancel_order_atomic` / `delete_order_atomic`. | **FIXED** |
| **SEC-06** | RBAC Privilege Elevation (P1) | `admin_create_user` ép `manager` thành `warehouse`; `admin_update_profile` chỉ sửa bảng `profiles` mà không sửa `tenant_memberships.role`. | Viết lại cả 2 RPC để đồng bộ hóa quyền theo tenant và ngăn chặn người không phải Owner tự thăng cấp lên Admin/Owner. | **FIXED** |
| **SEC-07** | PII Null Pointer Guard (P2) | Hàm `maskPII` gặp lỗi `TypeError: Cannot read properties of null` khi dữ liệu số điện thoại/email truyền vào là null. | Bổ sung validation `if (!text) return '';` trước khi xử lý regex che thông tin cá nhân. | **FIXED** |

---

## 2. Chi tiết Kỹ thuật Các Biện pháp An ninh

### 2.1. Ngăn chặn Rò rỉ Dữ liệu Đa người thuê (Multi-Tenancy Isolation)
1. **Database Enforced Scoping:**
   Khi loại bỏ giá trị `DEFAULT`, PostgreSQL sẽ ngăn chặn bất kỳ hành vi ghi âm thầm nào vào tenant mặc định. Nếu một client cố tình gửi bản ghi không có `tenant_id`, PostgreSQL sẽ kích hoạt lỗi `NOT NULL constraint violation` thay vì âm thầm lưu vào tenant khác.
2. **Tenant Membership Validation:**
   Tất cả RPC giao dịch (`place_order_atomic`, `cancel_order_atomic`, `delete_order_atomic`, `post_journal_entry_atomic`) đều kiểm tra nghiêm ngặt:
   ```sql
   SELECT m.role INTO v_role
     FROM public.tenant_memberships m
     WHERE m.user_id = auth.uid()
       AND m.tenant_id = p_tenant_id
       AND m.status = 'active';
   IF v_role IS NULL THEN
     RAISE EXCEPTION 'Khong co quyen: ban khong thuoc tenant nay' USING ERRCODE = '42501';
   END IF;
   ```

### 2.2. Kiểm soát Quyền Truy cập Hạn chế (Principle of Least Privilege)
- Nhân viên kho (`warehouse`) chỉ có quyền thao tác trên các phân hệ kho, xuất nhập, đóng gói; không có quyền đọc số liệu biên lợi nhuận, doanh thu tài chính, sổ kép hoặc quản lý tài khoản.
- Kế toán (`finance`) được xem và tạo bút toán sổ kép nhưng không được trực tiếp điều chỉnh số lượng tồn kho tự do nếu không qua phiếu kiểm kê/giao dịch.
- Owner là người duy nhất có quyền thăng cấp tài khoản lên Admin hoặc xóa vĩnh viễn các thực thể dữ liệu nhạy cảm.
