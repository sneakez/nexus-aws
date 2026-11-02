# NEXUSOMS V4.1 — INVENTORY & ACCOUNTING INTEGRITY
**Integrity Controls & Anti-Fraud Verification**  
**Specification:** `src/tests/transactions.test.ts` & `src/tests/ledger.test.ts`

---

## 1. Tính Toàn vẹn Tồn kho (Inventory Integrity)

1. **Ràng buộc Không Âm Tồn Kho (Non-Negative Stock):**
   - Đã thêm ràng buộc `CONSTRAINT products_stock_non_negative CHECK (stock >= 0)`.
   - RPC `place_order_atomic` kiểm tra `stock >= quantity` trước khi trừ và khóa bản ghi bằng `SELECT FOR UPDATE`.
2. **Sổ cái Biến động Kho Bất biến (Immutable Stock Transactions):**
   - Mọi lần trừ tồn (bán hàng), hoàn tồn (hủy đơn) hay nhập kho đều ghi nhận bản ghi vào `stock_transactions` kèm:
     - `warehouse_id`
     - `product_id`
     - `quantity_delta`
     - `balance_after`
     - `reference_id` (Mã đơn hàng/PO)
     - `reason` & `created_by`
3. **Phân biệt Tồn kho và Hoàn hàng Từng phần (Item-level Return):**
   - Bảng `return_items` lưu trữ trạng thái kiểm tra chất lượng kho (`condition_received: 'pass_inspection' | 'damaged_scrap'`).
   - Chỉ những mặt hàng đạt tiêu chuẩn kiểm tra (`pass_inspection`) và có cờ `is_restocked = false` mới được hoàn lại vào tồn khả dụng.

---

## 2. Tính Cân đối Kế toán Sổ kép (Double-Entry Balance)

1. **Kiểm tra Ràng buộc $\text{Tổng Nợ} == \text{Tổng Có}$:**
   - RPC `post_journal_entry_atomic` tính toán và so khớp:
     $$\left|\sum \text{Debit} - \sum \text{Credit}\right| \le 0.001$$
   - Nếu có chênh lệch dù chỉ 1 đồng, database sẽ ném lỗi `23514` và hủy toàn bộ bút toán.
2. **Chính sách Không tự sinh Bút toán Tuỳ tiện:**
   - Hệ thống không tự động tạo bút toán ngầm khi chưa có chứng từ rõ ràng từ đối soát sàn TMĐT hoặc xác nhận của Kế toán trưởng.
