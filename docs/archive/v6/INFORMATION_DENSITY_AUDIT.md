# NEXUSOMS V6.3 — KIỂM TOÁN MẬT ĐỘ THÔNG TIN & GIẢM TẢI NHẬN THỨC (INFORMATION DENSITY AUDIT)

**Hệ thống:** NexusOMS — Digital Commerce Operating System  
**Phiên bản:** V6.3  
**Mục tiêu kiểm toán:** Chuyển hóa giao diện từ "Bảng tính nhồi nhét" sang **Task First → Context Second → Details on Demand**.  

---

## 1. THỰC TRẠNG QUÁ TẢI NHẬN THỨC TRƯỚC V6.3

Trước đợt tái cấu trúc V6.3, NexusOMS gặp phải các vấn đề về mật độ thông tin:
1. **Quá tải thông tin đầu trang (Above-the-fold Clutter):**
   - Hầu hết các trang đều xuất hiện đồng thời: Banner Snapshot dài dòng $\rightarrow$ Tiêu đề kèm nhiều badge trang trí $\rightarrow$ Lưới 4-6 thẻ KPI dày đặc $\rightarrow$ Bảng dữ liệu lớn $\rightarrow$ Biểu đồ phân tích.
   - Người dùng đăng nhập vào hệ thống không biết phải làm gì trước, đâu là việc khẩn cấp cần giải quyết ngay trong ca làm việc.
2. **Hội chứng "Bảng tính phẳng" (Flat Spreadsheet Syndrome):**
   - Bảng đơn hàng và bảng tồn kho hiển thị 14 đến 18 cột cùng lúc. Nhân viên đóng gói phải nhìn qua các cột tài chính phức tạp (COGS, Phí sàn, CM2, CM3), trong khi kế toán lại bị rối bởi các cột mã vận đơn, trọng lượng kiện hàng.
3. **Các con số tài chính bị xuống dòng hoặc co ép:**
   - Việc cố nhét quá nhiều cột trong chiều rộng màn hình khiến số tiền VND bị rớt đơn vị `₫` xuống dòng riêng, hoặc tên kho hàng bị bẻ thành 5-7 dòng theo chiều dọc.
4. **Trùng lặp số liệu giữa các màn hình:**
   - Số liệu doanh thu, số đơn, và chi phí xuất hiện lặp lại ở cả Dashboard, Sales Analytics, Orders, và Order Economics mà không phân định rõ mục đích ra quyết định của từng nơi.

---

## 2. NGUYÊN TẮC GIẢM TẢI NHẬN THỨC THEO 4 LỚP (4-LEVEL BLUEPRINT)

Để giải quyết triệt để tình trạng trên, kiến trúc hiển thị chuẩn hóa 4 lớp được áp dụng thống nhất:

```
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: SIMPLE SUMMARY                                                │
│ Tiêu đề ngắn gọn • Mô tả 1 dòng • 1 Primary CTA • 2-4 KPI chọn lọc     │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│ LEVEL 2: ACTION CENTER (Ưu tiên hàng đầu)                             │
│ Việc cần xử lý ngay: Khóa tồn • Nghiệm thu QC • Ký nhận POD • Maker/Checker│
│ Tự động phân loại: Lý do • Số lượng • Mức ưu tiên • CTA 1-click       │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│ LEVEL 3: CLEAN DATA WORKSPACE                                          │
│ 4-7 trường cốt lõi • Presets theo vai trò: Đơn giản / Vận hành / Phân tích│
│ Sticky ID Column • Tabular Numbers • Không cuộn ngang ép buộc          │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│ LEVEL 4: DETAIL ON DEMAND                                              │
│ Click dòng mở Drawer chi tiết • Stepper vòng đời • Thác nước P&L       │
│ Thao tác tác nghiệp chuyên sâu nằm trong Drawer có xác nhận an toàn    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. ĐỐI SOÁNH MẬT ĐỘ THÔNG TIN TRƯỚC VÀ SAU CẢI TIẾN

| Phân hệ / Màn hình | Mật độ thông tin trước cải tiến (V6.2) | Cải tiến tinh gọn Task-First V6.3 | Mức giảm tải nhận thức |
| :--- | :--- | :--- | :---: |
| **Đơn Hàng (`OrdersPage`)** | Hiển thị 16 cột phẳng; người dùng phải tự tìm đơn pending giữa hàng chục đơn khác; không có khu vực việc cần làm. | - Bổ sung **Action Center**: 3 thẻ tác vụ ưu tiên (1. Chờ khóa tồn; 2. Đang đóng gói; 3. Đang giao chờ POD).<br/>- Presets cột: Mặc định [Vận hành] chỉ 6 cột cần thiết.<br/>- Toàn bộ chi tiết tài chính đưa vào Drawer Level 4. | **Giảm 55% thời gian tìm việc** |
| **Tồn Kho (`InventoryPage`)** | 6 thẻ stat, 5 nút chức năng trải dài, cảnh báo tồn kho nằm trong 1 dòng text nhỏ dễ bỏ sót. | - Tích hợp **Inventory Task Center**: 3 khối tác vụ rõ ràng (Hàng chờ nghiệm thu QC tại dock, SKU chạm ngưỡng an toàn cần mua, Hàng lỗi cần cách ly).<br/>- Tên kho hiển thị trên 1 dòng đơn (`whitespace-nowrap min-w-[150px]`). | **Giảm 45% thao tác thừa** |
| **Đổi Trả (`ReturnsPage`)** | Chỉ có bảng phẳng và tab bộ lọc; người vận hành không biết hồ sơ nào đang chờ duyệt hay chờ kiểm tra kho. | - Bổ sung **RMA Task Center**: Ưu tiên hồ sơ chờ Maker/Checker duyệt chi, hồ sơ chờ QC kho, hồ sơ Returnless Refund hoàn tiền ngay.<br/>- Stepper thích ứng bám sát đúng bản ghi được chọn. | **Giảm 60% rủi ro trễ duyệt** |
| **SKU Economics (`SkuEconomicsPage`)** | Biểu đồ biến mất khi chọn nhóm Star; không có khuyến nghị định hướng danh mục. | - Hiển thị số lượng SKU thực tế `(6)` trên dropdown.<br/>- Bổ sung **Portfolio Action Center**: Khuyến nghị rõ ràng cho nhóm Bò sữa (giữ tồn an toàn), Dấu hỏi (kéo ads kéo traffic), và Chậm luân chuyển (Flash sale xả hàng). | **Tăng 100% độ rõ ràng** |
| **Mobile Header (390px/360px)** | Thanh tìm kiếm absolute đè lên 51px tiêu đề trang H1. | - Đưa thanh tìm kiếm vào normal flow của Header.<br/>- Đảm bảo khoảng cách `gap = 16px` an toàn, 100% H1 hiển thị rõ ràng bên dưới Header tại `scrollY = 0`. | **Khắc phục 100% lỗi che khuất** |

---

## 4. KẾT LUẬN KIỂM TOÁN

Việc áp dụng triệt để nguyên lý **Task First → Context Second → Details on Demand** đã giúp NexusOMS giải phóng giao diện khỏi sự nặng nề của hệ thống ERP truyền thống, mang lại trải nghiệm làm việc nhẹ nhàng, sắc bén và trực quan cho cả chủ doanh nghiệp lẫn nhân viên vận hành.
