# NEXUSOMS V4 — RBAC PERMISSION MATRIX
**Role-Based Access Control Specification**  
**Module:** `src/lib/permissions.ts` & `src/providers/AuthProvider.tsx`

---

## 1. Ma trận Phân quyền theo Vai trò (Active Tenant Role)

| Quyền hạn (Permission) | Owner | Admin | Manager | Warehouse | Finance | Viewer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Xem Dashboard (`dashboard:view`)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Xem Đơn hàng (`orders:view`)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Tạo Đơn hàng (`orders:create`)** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Hủy Đơn hàng (`orders:cancel`)** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Xóa Đơn hàng (`orders:delete`)** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Xem Tồn kho (`inventory:view`)** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Biến động Tồn kho (`inventory:mutate`)** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Quản lý Danh mục & Sản phẩm (`products:manage`)** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Quản lý Kho & Bin (`warehouses:manage`)** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Xem Báo cáo Tài chính (`finance:view`)** | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Quản lý Tài chính & Sổ kép (`finance:manage`)** | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Xem Nhật ký Audit (`audit:view`)** | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Cấu hình Hệ thống (`settings:manage`)** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Quản lý Người dùng (`users:manage`)** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Thăng cấp Admin/Owner** | ✅ (chỉ Owner) | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Sử dụng Simulator (`simulator:access`)** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Quản lý Webhooks (`webhooks:manage`)** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 2. Kiểm soát Menu Giao diện (Navigation Guard)

- Phân hệ **Tài chính** (`ledger`, `feeReconciliation`, `marginControl`, `salesVelocity`, `revenueReport`):
  - **Hiển thị cho:** `owner`, `admin`, `manager`, `finance`.
  - **Ẩn hoàn toàn đối với:** `warehouse`, `viewer`.
- Phân hệ **Quản trị & Nền tảng** (`auditTrail`, `automationRules`, `webhooks`, `simulator`, `settings`):
  - **Hiển thị cho:** `owner`, `admin` (một phần mở cho `manager`).
  - **Ẩn hoàn toàn đối với:** `warehouse`, `finance`, `viewer`.
- Phân hệ **Kho hàng & Giao hàng** (`inventory`, `warehouses`, `transfers`, `batches`, `stockLedger`, `fulfillment`):
  - **Hiển thị cho:** `owner`, `admin`, `manager`, `warehouse`.
  - **Ẩn đối với:** `finance`.
