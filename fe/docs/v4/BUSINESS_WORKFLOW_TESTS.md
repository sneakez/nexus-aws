# NEXUSOMS V4 — BUSINESS WORKFLOW TESTS
**Business Logic & Integration Test Scenarios**  
**Test Suite:** `src/tests/*.test.ts` (Vitest)

---

## 1. Kịch bản Đặt hàng & Trừ Tồn kho Nguyên tử (Atomic Order Placement)

### Mục tiêu:
Xác minh rằng khi tạo đơn hàng gồm nhiều mặt hàng, toàn bộ quy trình diễn ra trọn vẹn trong một giao dịch. Nếu xảy ra lỗi hết hàng ở bất kỳ mặt hàng nào, giao dịch phải bị hủy hoàn toàn mà không làm mất mát dữ liệu hoặc tạo đơn rác.

### Quy trình Kiểm thử:
1. Sản phẩm A có tồn khả dụng = 10; Sản phẩm B có tồn khả dụng = 1.
2. Khách hàng đặt đơn gồm 2 Sản phẩm A và 2 Sản phẩm B.
3. RPC `place_order_atomic` khóa các dòng sản phẩm (`SELECT FOR UPDATE`).
4. Kiểm tra Sản phẩm A: $10 \ge 2$ -> OK.
5. Kiểm tra Sản phẩm B: $1 < 2$ -> **Lỗi ngoại lệ `23514` (Tồn kho không đủ)**.
6. **Kết quả mong đợi:** 
   - Không có bản ghi nào được ghi vào `orders`.
   - Tồn kho của Sản phẩm A vẫn giữ nguyên = 10 (không bị trừ).
   - Trả về mã lỗi rõ ràng cho người dùng.

---

## 2. Kịch bản Ngăn chặn Trùng Đơn (Idempotency Key Check)

### Mục tiêu:
Xác minh rằng khi mạng chập chờn và người dùng hoặc hệ thống sàn TMĐT gửi lại cùng một webhook/request nhiều lần, hệ thống không tạo thêm đơn hàng thứ hai.

### Quy trình Kiểm thử:
1. Client gửi request tạo đơn với `idempotency_key = "idemp_order_12345"`.
2. Hệ thống tạo đơn hàng thành công và trả về `order_id = "uuid-1"`.
3. Client gửi lại request thứ hai với cùng `idempotency_key = "idemp_order_12345"`.
4. RPC nhận diện key đã tồn tại trong phạm vi tenant.
5. **Kết quả mong đợi:**
   - Trả về thông tin đơn hàng hiện tại `uuid-1`.
   - Không tạo đơn mới, không trừ kho lần thứ hai.

---

## 3. Kịch bản Hủy đơn và Phòng chống Hoàn tồn Hai lần (Double-Restock Prevention)

### Mục tiêu:
Đảm bảo khi đơn hàng bị hủy hoặc hoàn tiền, số lượng tồn kho chỉ được hoàn trả đúng một lần.

### Quy trình Kiểm thử:
1. Đơn hàng `ORD-001` đang ở trạng thái `pending`.
2. Quản lý thực hiện hủy đơn:
   - Gọi `cancel_order_atomic`.
   - Cột `stock_restored` chuyển thành `true`.
   - Tồn kho các mặt hàng được hoàn lại.
3. Người dùng thao tác chuyển tiếp trạng thái sang `refunded` hoặc bấm nút xóa đơn:
   - Hệ thống kiểm tra cờ `stock_restored == true`.
   - **Kết quả mong đợi:** Không gọi `restore_stock` thêm lần nào nữa; số lượng tồn kho không bị tăng ảo.

---

## 4. Kịch bản Cân đối Bút toán Sổ kép (Debit == Credit)

### Mục tiêu:
Đảm bảo mọi bút toán phát sinh trong hệ thống tài chính luôn tuân thủ nguyên tắc kế toán kép.

### Quy trình Kiểm thử:
1. Gửi payload bút toán có $\text{Tổng Nợ} = 500.000$ VNĐ và $\text{Tổng Có} = 500.000$ VNĐ -> **Hợp lệ (PASS)**.
2. Gửi payload bút toán có $\text{Tổng Nợ} = 500.000$ VNĐ và $\text{Tổng Có} = 490.000$ VNĐ -> **Lỗi ngoại lệ `23514` (Bút toán không cân đối)**.
3. Giao dịch bị từ chối; không có dòng nào được chèn vào `journal_entries` hay `journal_lines`.
