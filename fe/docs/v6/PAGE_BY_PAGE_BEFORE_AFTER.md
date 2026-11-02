# NEXUSOMS V6.3 — ĐỐI SOÁNH GIAO DIỆN TỪNG TRANG TRƯỚC VÀ SAU CẢI TIẾN (PAGE-BY-PAGE BEFORE & AFTER)

**Hệ thống:** NexusOMS — Digital Commerce Operating System  
**Phiên bản:** V6.3  
**Bằng chứng kiểm thử:** Ảnh chụp màn hình độ phân giải cao tại `docs/v6/ux-v6-3/BEFORE_AFTER_SCREENSHOTS/`  

---

## 1. QUẢN TRỊ ĐƠN HÀNG ĐA KÊNH (`OrdersPage.tsx`)

### Hiện trạng trước cải tiến (V6.2):
- Bảng phẳng 16 cột gây ngợp thông tin.
- Người vận hành phải dò tìm thủ công các đơn mới cần xử lý giữa các đơn đã hoàn tất.
- Trên màn hình di động 390px, thanh tìm kiếm absolute đè lên 51px đầu tiên của tiêu đề trang H1.

### Sau khi tái cấu trúc Task-First (V6.3):
- **Level 1 Summary:** 4 thẻ KPI tinh gọn đo lường Net Sales, Đơn chờ xử lý, Đơn in-transit và Đơn đã ký POD thành công.
- **Level 2 Action Center:** Khối 3 thẻ tác vụ ưu tiên:
  1. *Chờ Khóa Tồn & Duyệt Đơn (2 đơn):* Nút bấm `[Xử lý đơn chờ duyệt ngay]` mở trực tiếp Drawer đơn hàng `ORD-44812`.
  2. *Đang Chuẩn Bị & Đóng Gói (1 đơn):* Kiểm tra tiến độ gom sóng nhặt hàng Wave.
  3. *Đang Vận Chuyển & Ký POD (1 đơn):* Xem đơn đang giao bàn giao bưu tá.
- **Level 3 Workspace:** 4 Presets cột (`Đơn giản`, `Vận hành`, `Phân tích`, `Toàn bộ`) tự động ghi nhớ vào `localStorage`.
- **Level 4 Drawer:** Mở xem Stepper vòng đời, danh sách sản phẩm và P&L Waterfall.
- **Mobile 390px / 360px:** 100% tiêu đề H1 nằm dưới header với khoảng đệm `gap = 16px`, không bị che khuất.
- **Ảnh chứng thực:**
  - `02_mobile_390px_fresh_nav_h1_clear_orders.png`
  - `04_mobile_360px_fresh_nav_orders.png`
  - `05_orders_action_center_1440px.png`
  - `08_usability_task1_pending_order_drawer.png`

---

## 2. QUẢN LÝ TỒN KHO 5 TRẠNG THÁI (`InventoryPage.tsx`)

### Hiện trạng trước cải tiến (V6.2):
- Tiêu đề dùng thẻ `<h2>` lệch chuẩn ngữ nghĩa.
- Cảnh báo tồn kho chỉ là một dòng text nhỏ nằm chìm dưới các bộ lọc.
- Tên kho dài bị rớt dòng thành 5-7 tầng dọc làm méo mó dòng bảng.

### Sau khi tái cấu trúc Task-First (V6.3):
- **Level 1 Summary:** Tiêu đề chuẩn `H1`, 6 Stat Cards thể hiện mô hình bất biến: Physical = Sellable + Reserved + Unavailable.
- **Level 2 Action Center:** Khối 3 thẻ tác vụ kho bãi thông minh:
  1. *Hàng Chờ Nghiệm Thu QC (8 cái):* Nút bấm `[Nghiệm thu QC mở bán]` mở trực tiếp Modal nghiệm thu QC dock.
  2. *SKU Chạm Ngưỡng An Toàn (2 SKU):* Nút bấm `[Lập PO nhập thêm hàng]` mở Modal tạo đơn mua hàng.
  3. *Hàng Hỏng / Cách Ly (4 cái):* Nút bấm `[Xử lý khu cách ly]` xử lý hàng phế phẩm/móp vỡ.
- **Level 3 Workspace:** Cột tên kho hàng áp dụng `min-w-[150px] whitespace-nowrap`, hiển thị gọn gàng trên 1 dòng đơn.
- **Ảnh chứng thực:**
  - `06_inventory_action_center_1440px.png`
  - `09_usability_task2_qc_modal_opened.png`

---

## 3. PHÂN HỆ ĐỔI TRẢ & BẢO HÀNH RMA (`ReturnsPage.tsx`)

### Hiện trạng trước cải tiến (V6.2):
- Stepper quy trình ở trên đầu trang bị lệch khỏi bản ghi thực tế.
- Khách hàng và kế toán không phân biệt được việc duyệt Maker/Checker và kiểm định QC kho.

### Sau khi tái cấu trúc Task-First (V6.3):
- **Level 1 Summary:** Tiêu đề H1 rõ ràng, nút tạo phiếu RMA đa nhánh.
- **Level 2 Action Center:** Khối 3 thẻ tác vụ RMA cốt lõi:
  1. *Chờ Phê Duyệt Maker/Checker (1 hồ sơ):* Nút bấm `[Phê duyệt hồ sơ chờ]` mở bản ghi cần duyệt cấp quản lý.
  2. *Chờ Kiểm Định QC Kho (1 hồ sơ):* Hàng hoàn về kho cần kiểm tra ngoại quan.
  3. *Hoàn Tiền Trực Tiếp Returnless (1 hồ sơ):* Xem luồng hoàn tiền không thu hồi hàng.
- **Level 3 & 4 Adaptive Stepper:** Stepper quy trình thích ứng chính xác theo từng nhánh: Nhánh Returnless Refund tự động bỏ qua bước Kiểm tra và Nhập kho.
- **Ảnh chứng thực:**
  - `07_returns_action_center_1440px.png`
  - `11_usability_task4_rma_maker_checker.png`

---

## 4. QUẢN TRỊ ĐƠN GIÁ KINH TẾ SKU (`SkuEconomicsPage.tsx`)

### Hiện trạng trước cải tiến (V6.2):
- Báo cáo cũ nhầm lẫn số lượng 8 SKU, trong khi mock store chỉ có 6 SKU.
- Lọc nhóm Ngôi sao (Star) làm biểu đồ biến mất hoàn toàn.
- Dùng sai thuật ngữ "BCG Matrix".

### Sau khi tái cấu trúc Task-First (V6.3):
- **P0.1 SKU Count Verification:** Xác minh chính xác **6 SKU** trong kho dữ liệu mẫu. Dropdown hiển thị rõ: `Tất cả phân nhóm (6)`.
- **Terminology:** Sử dụng thống nhất 100% thuật ngữ **SKU Portfolio Matrix**.
- **Informative Empty State:** Lọc nhóm Ngôi sao (0 SKU) hiển thị giải thích cặn kẽ công thức toán học kèm nút reset 1 click.
- **Level 2 Action Center:** Bổ sung 3 khối quyết định:
  1. *SKU Bò Sữa Chủ Lực (2 SKU):* Dòng tiền ổn định, chống đứt hàng.
  2. *SKU Dấu Hỏi Biên Lãi Cao (4 SKU):* CM% $\ge 30\%$, cần đẩy mạnh marketing để biến thành Ngôi sao.
  3. *SKU Chậm Luân Chuyển (0 SKU):* Kế hoạch xả kho khi có hàng tồn chậm.
- **Mobile 390px:** Tiêu đề H1 hiển thị hoàn hảo dưới Header, không bị che khuất.
- **Ảnh chứng thực:**
  - `01_sku_economics_all_6_skus_1440px.png`
  - `01b_sku_economics_star_filter_empty_explanation_1440px.png`
  - `03_mobile_390px_fresh_nav_h1_clear_sku.png`

---

## 5. TỔNG QUAN ĐIỀU HÀNH (`ExecutiveAnalyticsDashboard.tsx`)

### Hiện trạng trước cải tiến (V6.2):
- Khuyến nghị Decision Intelligence chỉ trình bày chữ mà không có nút hành động điều hướng nhanh.

### Sau khi tái cấu trúc Task-First (V6.3):
- Mỗi thẻ khuyến nghị Prescriptive Decision đi kèm nút hành động 1-click có icon mũi tên: Nhấp để chuyển trực tiếp tới phân hệ cần điều chỉnh (Orders, Inventory, hoặc Channel Economics) mà không bắt người dùng phải tự tìm kiếm trên menu.
- **Ảnh chứng thực:**
  - `12_usability_task5_dashboard_decision_insights.png`
