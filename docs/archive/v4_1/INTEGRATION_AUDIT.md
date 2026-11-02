# NEXUSOMS V4.1 — INTEGRATION AUDIT
**Lead Architect & Principal Security Engineer**  
**Date:** 2026-10-28  
**Scope:** Migration validation, Schema drift, Unsafe Fallback elimination, and Database Scoping.

---

## 1. Rà soát Migration V4 & V4.1

### 1.1. Chuỗi Migration:
1. `20261028080000_v4_p0_multitenant_transactions_and_security.sql`:
   - Gỡ bỏ `DEFAULT` cố định trên cột `tenant_id` của 25+ business tables.
   - Thêm cột `idempotency_key` (Unique index scoped theo tenant).
   - Thêm cột `stock_restored` trên bảng `orders`.
   - Siết chặt RLS của `return_items` theo active membership.
   - Thu hồi quyền `UPDATE` và `DELETE` trên bảng `audit_logs`.
   - Khởi tạo 5 RPC giao dịch: `place_order_atomic`, `cancel_order_atomic`, `delete_order_atomic`, `post_journal_entry_atomic`, `process_return_restock_atomic`.
2. `20261028090000_v4_1_security_rbac_inventory_hardening.sql`:
   - Bảo vệ Owner cuối cùng của workspace: Ngăn chặn demote hoặc suspend nếu chỉ còn duy nhất 1 Owner.
   - Rút quyền `cancel_order_atomic` khỏi vai trò `warehouse` (chỉ dành cho `manager`, `admin`, `owner`).
   - Bổ sung ràng buộc toàn vẹn `products_stock_non_negative CHECK (stock >= 0)`.
   - Bổ sung RPC kiểm tra độ lệch tồn kho: `verify_inventory_consistency(p_tenant_id)`.

### 1.2. Kiểm tra Migration Drift & Schema Drift:
- Toàn bộ các bảng nghiệp vụ (`orders`, `order_items`, `customers`, `products`, `warehouses`, `return_requests`, `journal_entries`, `audit_logs`...) đều đồng nhất về kiểu dữ liệu `tenant_id uuid`.
- Không còn bảng nào tồn tại `DEFAULT '<uuid>'`.
- Toàn bộ hàm `SECURITY DEFINER` đều được thiết lập tường minh:
  ```sql
  SECURITY DEFINER
  SET search_path TO 'public'
  ```
  Ngăn chặn triệt để lỗ hổng Search Path Hijacking / Trojan Function.

---

## 2. Loại bỏ Toàn bộ Unsafe Client-Side Fallbacks

Trong phiên bản V4 trước đó, một số modal frontend (`OrderFormModal`, `OrderDetailDrawer`) có khối `if (error.code === '42883')` tự động chuyển sang vòng lặp client nhiều bước. 

**Tại V4.1, toàn bộ các fallback không an toàn này đã bị loại bỏ:**
- **Đặt hàng (`OrderFormModal.tsx`):** Nếu RPC `place_order_atomic` chưa sẵn sàng trên database, frontend lập tức hiển thị thông báo lỗi rõ ràng và **CHẶN** thao tác ghi. Tuyệt đối không tạo đơn trước rồi lặp trừ kho từ trình duyệt.
- **Hủy đơn (`OrderDetailDrawer.tsx`):** Nếu RPC `cancel_order_atomic` chưa có trên database, thao tác hủy bị chặn để tránh rủi ro hoàn tồn kho 2 lần.
- **Xóa đơn (`OrderDetailDrawer.tsx`):** Bắt buộc thông qua `delete_order_atomic`.
- **Sổ kép (`LedgerPage.tsx`):** Bắt buộc thông qua `post_journal_entry_atomic`. Không cho phép chèn phân mảnh `journal_entries` rồi mới chèn `journal_lines` từ client.
