# NEXUSOMS V4 — REGRESSION TEST RESULTS
**QA Automation & Test Execution Evidence**  
**Date:** 2026-10-28  
**Environment:** Local Dev & Vitest Suite

---

## 1. Kết quả Tổng thể

```text
RUN v5.0.5 D:/Noxus-V3

✓ src/tests/rbac.test.ts (8 tests)
✓ src/tests/transactions.test.ts (4 tests)
✓ src/tests/ledger.test.ts (4 tests)
✓ src/tests/multitenancy.test.ts (4 tests)
✓ src/tests/security.test.ts (4 tests)

Test Files  5 passed (5)
     Tests  24 passed (24)
  Duration  860ms
```

---

## 2. Bảng Chi tiết Kiểm thử Tự động

| Test Suite | Nội dung kiểm tra | Số case | Kết quả | Ghi chú |
| :--- | :--- | :---: | :---: | :--- |
| **`rbac.test.ts`** | Ma trận quyền 6 roles (Owner, Admin, Manager, Warehouse, Finance, Viewer); kiểm tra route guard và ẩn menu | 8 | **PASS** | Warehouse không thể xem tài chính |
| **`transactions.test.ts`** | Tính toán tài chính đơn hàng; kiểm tra trạng thái hủy đơn và chặn hoàn tồn lặp lại | 4 | **PASS** | Double-restock prevention verified |
| **`ledger.test.ts`** | Quy tắc bút toán kép (Debit == Credit); phát hiện và chặn lệch số liệu nợ/có | 4 | **PASS** | Bút toán lệch bị từ chối tuyệt đối |
| **`multitenancy.test.ts`** | Ràng buộc tenant_id trên query và insert; cách ly dữ liệu Tenant A và Tenant B | 4 | **PASS** | Không còn rò rỉ dữ liệu chéo |
| **`security.test.ts`** | Che mờ PII (SĐT, Email); cắt ngắn mã SHA-256; bảo vệ chống crash khi giá trị null/undefined | 4 | **PASS** | Không crash ứng dụng |

---

## 3. Kết quả Kiểm tra Tĩnh (Static Analysis)

- **TypeScript Typecheck:**
  ```text
  > tsc --noEmit -p tsconfig.app.json
  Done with code 0 (Zero errors)
  ```
- **ESLint Code Quality:**
  ```text
  > eslint .
  Done with code 0 (Zero errors, Zero warnings)
  ```
- **Vite Production Build:**
  ```text
  > vite build
  ✓ 1680 modules transformed.
  ✓ built in 5.80s (Zero errors)
  ```
