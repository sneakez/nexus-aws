# NEXUSOMS V4.1 — RBAC VERIFICATION
**Granular Access Control Verification**  
**Specification:** `src/lib/permissions.ts` & `src/tests/rbac.test.ts`

---

## 1. Kết quả Rà soát & Định hình Lại Vai trò

Theo yêu cầu của Workstream 4, chúng tôi đã rà soát lại toàn diện các ranh giới quyền hạn:

1. **Warehouse có quyền hủy đơn không?**
   - **Quyết định:** **KHÔNG**. Hủy đơn hàng là quyết định mang tính thương mại và chăm sóc khách hàng. Quyền `orders:cancel` đã được rút khỏi vai trò `warehouse` cả ở UI, Permission Registry và RPC `cancel_order_atomic`.
2. **Warehouse có được thay đổi master product không?**
   - **Quyết định:** **KHÔNG**. Nhân viên kho chỉ có quyền xem thông tin sản phẩm (`products:view`) để phục vụ nhận hàng/đóng gói/kiểm kê. Quyền chỉnh sửa giá bán, tên, danh mục (`products:manage`) chỉ dành cho `owner`, `admin`, `manager`.
3. **Manager có được quản lý tài chính không?**
   - **Quyết định:** **CÓ**. Manager có quyền `finance:view` và `finance:manage` để đối soát phí sàn TMĐT và kiểm tra biên lợi nhuận.
4. **Finance có được sửa dữ liệu đơn không?**
   - **Quyết định:** **KHÔNG**. Vai trò `finance` chỉ có quyền xem đơn hàng (`orders:view`) để đối chiếu dòng tiền và lập bút toán Sổ kép, không được tạo đơn hay sửa đổi trạng thái đơn.
5. **Viewer có thể gọi mutation API không?**
   - **Quyết định:** **KHÔNG**. `viewer` chỉ có quyền đọc (`:view`) đối với các màn hình cơ bản; mọi mutation RPC đều chặn `role = 'viewer'`.
6. **Owner cuối cùng có được bảo vệ không?**
   - **Quyết định:** **CÓ**. Database RPC `admin_update_profile` từ chối bất kỳ thao tác hạ quyền hoặc đình chỉ tài khoản Owner nếu người đó là Owner duy nhất còn lại của tenant.

---

## 2. Kết quả Chạy Test RBAC
```text
✓ src/tests/rbac.test.ts (8 tests passed)
```
- Warehouse không thể hủy đơn: PASS.
- Warehouse không thể sửa master product: PASS.
- Finance không thể tạo đơn/trừ kho: PASS.
- Menu điều hướng ẩn toàn bộ các phân hệ không thuộc thẩm quyền: PASS.
