# KỊCH BẢN DỮ LIỆU MOCK & TRƯỜNG HỢP KIỂM THỬ V6 (MOCK DATA SCENARIOS)

Tài liệu mô tả tập dữ liệu mẫu, các tình huống kinh doanh thực tế, và cơ chế khôi phục trạng thái (Reset to Baseline) trong Centralized Mock Store của NexusOMS V6.

---

## 1. Cơ Cấu Tập Dữ Liệu Seed Chuẩn (Deterministic Baseline)

Toàn bộ dữ liệu trong V6 hoàn toàn độc lập với backend remote, chạy trên bộ nhớ In-Memory và được lưu bền vững vào `localStorage`:
- **Đa kênh bán hàng:** Shopee Mall (`shopee`), TikTok Shop (`tiktok`), Lazada Flagship (`lazada`), Website D2C (`website`), POS Bán lẻ trực tiếp (`manual`).
- **Danh mục SKU đa dạng biên lợi nhuận:**
  - SKU Ngôi sao (Star): Smartphone Flagship `NEXUS-PRO-01` (Doanh thu cao, biên CM1 55%, CM2 38%).
  - SKU Bò sữa (Cash Cow): Cáp sạc nhanh `NEXUS-ACC-01` (Số lượng bán lớn, doanh thu đều đặn).
  - SKU Dấu hỏi (Question Mark): Tai nghe Gaming Type-C `NEXUS-ACC-02` (Biên CM1 68.4%, CM2 48.2%, bán chậm do thiếu traffic).
  - SKU Con chó (Dog): Ốp lưng silicon mẫu cũ `NEXUS-CASE-OLD` (Tồn đọng trên 90 ngày, biên mỏng 14%).
- **Tập đơn hàng trải dài theo chu kỳ thời gian:** Các đơn hàng phân bố qua các ngày trong tuần, có các khung giờ cao điểm ban đêm (20h-24h) và cuối tuần để phản ánh chính xác bản đồ nhiệt Sales Heatmap.
- **Chiến dịch Marketing đa nền tảng:** Meta Flash Sale (ROAS 6.0x), TikTok Video KOC (ROAS 3.21x), Shopee In-App Search (ROAS 4.97x), KOC Livestream (ROAS 1.75x - lỗ biến đổi).
- **Phân khúc khách hàng RFM:** 336 khách hàng chia thành 5 nhóm (Champions 12.5%, Loyal 25.6%, Potential 28.0%, At Risk 20.2%, Lost 13.7%).

---

## 2. Các Tình Huống Kiểm Thử Nghiệp Vụ (Simulated Business Scenarios)

### Kịch Bản 1: Kênh Doanh Thu Cao Nhưng Lỗ Biến Đổi Sau Ads (TikTok KOC Leak)
- **Thiết lập:** Chiến dịch KOC Livestream chi 2.000.000 ₫ tiền booking, tạo ra 3.500.000 ₫ doanh thu (14 đơn hàng), nhưng tỷ lệ voucher và chiết khấu cao.
- **Kết quả tính toán:** Lợi nhuận sau Ads:
  $$\text{CM3} = 3.500.000 - 2.100.000 (\text{COGS}) - 380.000 (\text{Fees}) - 2.000.000 (\text{Ads}) = -980.000 \text{ ₫}$$
- **Trực quan hóa:** Màn hình `MarketingAnalyticsPage` đánh dấu nhãn đỏ `LOSS_MAKING` và Decision Intelligence tự động đưa ra khuyến nghị cắt giảm 25% ngân sách Ads.

### Kịch Bản 2: Cảnh Báo Nguy Cơ Đứt Hàng (Stockout Runway Alert)
- **Thiết lập:** SKU `NEXUS-PRO-01` còn 28 cái trong kho, tốc độ bán đạt 5.6 cái/ngày $\rightarrow$ Runway còn 5.0 ngày, trong khi thời gian nhà cung cấp giao hàng (Lead time) là 7 ngày.
- **Kết quả:** Màn hình `InventoryAnalyticsPage` hiển thị thẻ cảnh báo `⚠️ Nguy Cơ Đứt Hàng` và tính toán số lượng đề xuất đặt hàng mới (+80 chiếc).

### Kịch Bản 3: Thử Nghiệm Định Giá & Chặn Lỗ Bán Hàng (Pricing Circuit Breaker)
- **Thiết lập:** Trên màn hình `PricingIntelligencePage`, người dùng thử kéo mức voucher từ 30.000 ₫ lên 300.000 ₫ cho sản phẩm có giá niêm yết 550.000 ₫ và giá vốn 220.000 ₫.
- **Kết quả:** Hệ thống lập tức hiển thị mức giảm giá vượt trần tối đa cho phép (Trần an toàn là 275.000 ₫), thác lợi nhuận chuyển sang màu đỏ báo động biên CM2 âm.

---

## 3. Khôi Phục Dữ Liệu Gốc (Reset to Baseline)

Bất kỳ lúc nào, người dùng có thể bấm nút **"Đặt Lại Gốc (Reset)"** trên thanh điều khiển Demo Control Panel hoặc gọi `mockStore.resetToBaseline()`.
- Toàn bộ các đột biến, đơn hàng thêm mới và thay đổi giả lập sẽ được xóa sạch.
- Dữ liệu hoàn nguyên 100% về trạng thái chuẩn ban đầu, bảo đảm tính tái lập cho mọi bài kiểm thử trình duyệt.
