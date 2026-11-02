# NEXUSOMS V6.2 — MA TRẬN NGHIỆM THU TRÌNH DUYỆT THẬT (BROWSER ACCEPTANCE MATRIX)

**Dự án:** NexusOMS — Digital Commerce Operating System  
**Phiên bản:** V6.2 (Phase 2: Digital Commerce Only)  
**Công cụ kiểm thử:** Google Chrome (Real Headless/Windowed Engine) qua Puppeteer Automation  
**Tập lệnh kiểm thử:** `verify_v6_2_master_acceptance.cjs`  
**Ngày thực hiện:** 29/10/2026  
**Kết quả chung:** **14/14 TEST CASES PASS (100%)**

---

## 1. MA TRẬN NGHIỆM THU CHI TIẾT TỪNG CA KIỂM THỬ

| Mã Test | Phân hệ / Màn hình | Viewport | Hành động tương tác | Kỳ vọng nghiệm thu | Kết quả thực tế | Trạng thái |
| :---: | :--- | :---: | :--- | :--- | :--- | :---: |
| **TC-01** | SKU Economics (`/app?page=skuEconomics`) | 1440x900 | Chọn lọc nhóm `🌟 Ngôi sao (STAR)` trên dropdown. | Hiển thị Trạng thái rỗng thông minh giải thích rõ: CM% $\ge 30\%$ và Sản lượng $\ge 10$ đơn; dropdown hiển thị đếm `(0)`; xuất hiện nút reset `[Xem tất cả SKU trong Portfolio]`. | Dropdown hiển thị `🌟 Ngôi sao (Star) (0)`, Empty state render đầy đủ công thức giải thích, nút reset khả dụng. | **PASS** |
| **TC-02** | SKU Economics (`/app?page=skuEconomics`) | 1440x900 | Bấm nút `[Xem tất cả SKU trong Portfolio]`. | Xóa bộ lọc `STAR`, toàn bộ 8 SKU xuất hiện trở lại trên biểu đồ phân tán BCG và bảng dữ liệu. | Bộ lọc reset về `all`, 8 SKU hiển thị đầy đủ, bong bóng biểu đồ tái hiện 100%. | **PASS** |
| **TC-03** | Shared Chart Tooltip (`ScatterBubbleChart`) | 1440x900 | Di chuột (Hover) lên bong bóng sản phẩm. | Tooltip hiển thị nền tối nguyên khối `#0F172A` (Slate-900), viền sắc nét `border-slate-700/90`, định dạng tiền tệ `tabular-nums font-mono`, tương phản tuyệt đối. | Tooltip Slate-900 hiển thị tức thì, chữ trắng sáng, số tiền VND căn chỉnh chuẩn. | **PASS** |
| **TC-04** | Sales Analytics (`/app?page=salesAnalytics`) | 1440x900 | Kiểm tra Heatmap mật độ đơn hàng trong tuần. | Heatmap tổng hợp dữ liệu thực tế từ `mockStore.getOrders()`, tổng đơn khớp chính xác 12 đơn, có nhãn `[DEMO-OBSERVED]`. | Hiển thị đúng 12 đơn thực, nhãn `[DEMO-OBSERVED]` hiển thị rõ ràng. | **PASS** |
| **TC-05** | Sales Analytics (`/app?page=salesAnalytics`) | 1440x900 | Bấm nút chuyển đổi `[Mô phỏng cao điểm]`. | Heatmap chuyển sang chế độ mô phỏng lưu lượng lớn `[SIMULATED TRAFFIC]`, mật độ giờ vàng hiển thị trực quan cho thuyết trình demo. | Chế độ mô phỏng kích hoạt mượt mà, phân bố màu đa cấp độ. | **PASS** |
| **TC-06** | Orders Grid (`/app?page=orders`) | 1440x900 | Bấm chọn Preset `[Vận hành]` trên thanh công cụ bảng. | Bảng lọc còn 6 cột vận hành (Mã đơn, Kênh, Kho xuất, Trạng thái, Vận chuyển, Mã vận đơn); ẩn các cột tài chính phức tạp. | Preset Vận hành kích hoạt ngay lập tức, bảng gọn gàng, không bị tràn ngang. | **PASS** |
| **TC-07** | Orders Grid (`/app?page=orders`) | 1440x900 | Bấm chọn Preset `[Phân tích]` trên thanh công cụ bảng. | Bảng hiển thị các cột tài chính chuyên sâu (Doanh thu thuần, COGS, CM1, Phí sàn, CM2, Phí Marketing, CM3%). | Preset Phân tích mở rộng các nhóm cột Unit Economics chuẩn xác. | **PASS** |
| **TC-08** | Orders Grid (`/app?page=orders`) | 1440x900 | Bấm icon mở rộng dòng đầu tiên (`ORD-DIGITAL-001`). | Dòng mở rộng hiển thị Stepper vòng đời đơn hàng, danh sách sản phẩm chi tiết và bảng phân rã thác nước P&L. | Dòng mở rộng mượt mà, hiển thị đầy đủ Order Lifecycle Stepper và Waterfall P&L. | **PASS** |
| **TC-09** | Inventory (`/app?page=inventory`) | 1440x900 | Kiểm tra hiển thị tên kho hàng trong bảng tồn kho. | Tên kho hàng như `Kho Tổng Bình Tân (HCM)` hiển thị trên 1 dòng duy nhất, không bị rớt dòng thành 5-7 tầng dọc. | `min-w-[150px] whitespace-nowrap` hoạt động hoàn hảo, chiều cao dòng ổn định. | **PASS** |
| **TC-10** | RMA Returns (`/app?page=returns`) | 1440x900 | Bấm chọn tab `[Returnless Refund]` (Hoàn tiền không trả hàng). | Stepper quy trình cập nhật đúng nhánh Returnless Refund (Yêu cầu $\rightarrow$ Duyệt bồi hoàn $\rightarrow$ Quyết toán), bỏ qua bước QC và Nhập kho. | Stepper ăn khớp chính xác với bản ghi `Returnless Refund`, bỏ qua QC/Receiving. | **PASS** |
| **TC-11** | Snapshot Banner (`/app?page=dashboard`) | 1440x900 | Bấm nút `[Chi tiết dữ liệu]` trên thanh Snapshot banner. | Popover nổi hiển thị đầy đủ thông số kỹ thuật (Snapshot ID, Revision, Seed version, Audit match 100%) mà không làm vỡ header. | Popover Slate-900 bung mở tinh tế, các thông số kỹ thuật hiển thị rõ nét. | **PASS** |
| **TC-12** | Orders Mobile (`/app?page=orders`) | 390x844 | Kiểm tra độ tràn trang (horizontal overflow) trên mobile. | `scrollWidth <= innerWidth` (không xuất hiện thanh cuộn ngang toàn trang); bảng chuyển sang dạng Card View dễ đọc. | `hasOverflow: false` (`scrollWidth: 390px, innerWidth: 390px`), thẻ card hiển thị sắc nét. | **PASS** |
| **TC-13** | SKU Economics Mobile (`/app?page=skuEconomics`) | 390x844 | Kiểm tra giao diện SKU Economics trên mobile. | Header co giãn linh hoạt, không che lấp thanh điều hướng; dropdown và biểu đồ co vừa khung hình điện thoại. | Giao diện mobile hiển thị hoàn hảo, không bị đè chữ hay che khuất component. | **PASS** |
| **TC-14** | Executive Dashboard Tablet (`/app?page=dashboard`) | 768x1024 | Kiểm tra hiển thị tổng thể Dashboard trên iPad/Tablet. | Lưới KPI tự động chia 2 cột, các biểu đồ tự căn chỉnh 100% chiều rộng tablet mà không bị vỡ bố cục. | Grid 2 cột tự động thích ứng mượt mà, số liệu tài chính giữ nguyên độ sắc nét. | **PASS** |

---

## 2. KHO ẢNH CHỨNG THỰC NGHIỆM THU (VERIFICATION EVIDENCE)

Toàn bộ 14 ảnh chụp màn hình thực tế được ghi nhận tự động vào thư mục `docs/v6/ux-final/BEFORE_AFTER_SCREENSHOTS/` và lưu trữ trong thư mục artifacts:

1. `01_sku_economics_stars_empty_state_1440px.png`: Trạng thái rỗng giải thích tường tận công thức nhóm Ngôi sao (Star).
2. `02_sku_economics_after_reset_stars_1440px.png`: Khôi phục toàn bộ Portfolio sau khi bấm nút reset 1 click.
3. `03_chart_tooltip_solid_contrast_1440px.png`: Tooltip nền tối Slate-900 tương phản cao và font số mono cách đều.
4. `04_sales_heatmap_real_orders_1440px.png`: Heatmap mật độ đơn hàng thực tế (12 đơn hàng đối soát 100%).
5. `05_sales_heatmap_simulated_toggle_1440px.png`: Heatmap chế độ mô phỏng lưu lượng cao điểm cho thuyết trình demo.
6. `06_orders_preset_van_hanh_1440px.png`: Preset Vận hành tinh gọn 6 cột không gây rối mắt.
7. `07_orders_preset_phan_tich_1440px.png`: Preset Phân tích tài chính mở rộng đầy đủ CM1, CM2, CM3.
8. `08_order_row_expanded_operations_1440px.png`: Mở rộng dòng xem Stepper vòng đời đơn hàng và P&L Waterfall.
9. `09_inventory_warehouse_no_wrapping_1440px.png`: Tên kho hàng trên 1 dòng đơn, không còn rớt dòng 5-7 tầng.
10. `10_rma_adaptive_stepper_active_record_1440px.png`: Stepper quy trình thích ứng cho nhánh Returnless Refund.
11. `11_snapshot_banner_popover_open_1440px.png`: Banner tinh gọn kèm Popover chi tiết kiểm toán kỹ thuật.
12. `12_mobile_390px_orders_clean_cards.png`: Màn hình mobile 390px dạng Card không cuộn ngang toàn trang.
13. `13_mobile_390px_sku_economics.png`: Phân tích SKU trên màn hình điện thoại iPhone 390px.
14. `14_tablet_768px_dashboard.png`: Bố cục Dashboard tự động chia 2 cột trên iPad/Tablet 768px.
