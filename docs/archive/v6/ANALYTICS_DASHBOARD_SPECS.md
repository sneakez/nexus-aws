# ĐẶC TẢ KỸ THUẬT CÁC MÀN HÌNH DASHBOARD & DATA ANALYTICS V6 (ANALYTICS DASHBOARD SPECS)

Tài liệu đặc tả chi tiết giao diện người dùng, các khối widget, biểu đồ và hành động trên từng màn hình phân tích trong NexusOMS V6.

---

## 1. Executive Analytics Dashboard (`/app?page=dashboard`)
- **Mục tiêu:** Màn hình chào mừng dành cho Chủ doanh nghiệp (Owner), cung cấp bức tranh toàn cảnh về sức khỏe dòng tiền, biên lợi nhuận và các hành động cần can thiệp ngay lập tức.
- **Bố cục các hàng widget:**
  - **Hàng 1 - Bộ lọc thời gian:** DateRangeFilter (7 ngày, 30 ngày, Tháng này) + ComparisonSelector (Vs Kỳ trước, Vs Target).
  - **Hàng 2 - 4 Thẻ KPI Doanh thu & Sản lượng:** Doanh thu thuần, Số đơn hàng, Giá trị trung bình đơn (AOV), Tỷ lệ hoàn hàng (Return rate).
  - **Hàng 3 - 3 Thẻ Lợi nhuận đóng góp (Unit Economics):** Lãi gộp CM1 (sau COGS), Lợi nhuận đóng góp CM2 (sau phí sàn & WMS), Lợi nhuận sau Ads CM3.
  - **Hàng 4 - Khung Decision Intelligence 4 Tầng:** 3 khuyến nghị tự động về kênh TikTok biên mỏng, SKU sắp đứt hàng và cơ hội bán Bundle phụ kiện.
  - **Hàng 5 - Thác Dòng Lợi Nhuận (Waterfall P&L) & Biểu Đồ Xu Hướng:** 
    - Cột trái: Thác P&L từ Doanh thu gộp -> Voucher -> COGS -> Phí sàn -> Chi phí kho -> Ads -> CM3.
    - Cột phải: Biểu đồ diện tích (Area Chart) theo dõi biến động Doanh thu thuần vs CM2 vs CM3 theo từng ngày.
  - **Hàng 6 - Bảng Ma Trận Hiệu Quả Kênh Bán Hàng:** So sánh Shopee, TikTok Shop, Lazada, Website D2C và POS về Số đơn, Doanh thu thuần, Phí sàn (Take Rate), CM1, CM2, CM3 và Tỷ lệ hoàn.

---

## 2. Order Economics (`/app?page=orderEconomics`)
- **Mục tiêu:** Soi chiếu từng đơn hàng riêng lẻ để phát hiện các đơn hàng bị lỗ biến đổi (CM2 < 0) do voucher quá đà hoặc phí sàn cao bất thường.
- **Bố cục & Tính năng:**
  - Thanh tổng kết: Tổng giá niêm yết, Doanh thu thuần, Tổng CM1, Tổng CM2, Tổng CM3.
  - Ô tìm kiếm mã đơn và bộ lọc theo kênh bán hàng.
  - Bảng dữ liệu chi tiết bóc tách từng cột: Mã đơn, Thời gian, Giá niêm yết, Doanh thu thuần, Giá vốn COGS, Lãi CM1, Phí sàn & WMS, Lãi CM2 và Lãi CM3.
  - Đánh dấu màu cảnh báo: Đơn có CM2 hoặc CM3 âm được bôi đỏ nổi bật.

---

## 3. SKU Economics & BCG Matrix (`/app?page=skuEconomics`)
- **Mục tiêu:** Đánh giá hiệu quả sinh lời và vòng quay vốn của từng sản phẩm trong kho.
- **Bố cục & Tính năng:**
  - 4 Thẻ KPI: Tổng vốn tồn kho (Stock value), Lãi đóng góp 30 ngày, Tỷ suất sinh lời vốn tồn (Stock ROI), Tổng số SKU quản lý.
  - Biểu đồ bong bóng 3 biến (Scatter Bubble Chart):
    - Trục X: Biên lợi nhuận CM%.
    - Trục Y: Doanh thu thuần.
    - Kích thước bong bóng: Giá trị vốn tồn kho (₫).
    - Màu sắc: Xanh lá (Ngôi sao - Star), Xanh dương (Bò sữa - Cash Cow), Vàng (Dấu hỏi - Question Mark), Đỏ (Con chó - Dog).
  - Bảng chi tiết từng SKU: Mã SKU, Tên, Phân nhóm, Giá bán ASP, Giá vốn COGS, Lãi CM/chiếc, Biên CM%, Giá hòa vốn, Tồn khả dụng, Số ngày tồn DIO và Stock ROI.

---

## 4. Channel Economics (`/app?page=channelEconomics`)
- **Mục tiêu:** Đo lường chi phí sàn TMĐT thực tế và hiệu quả sinh lời của từng kênh bán hàng.
- **Bố cục & Tính năng:**
  - KPI: Tổng doanh thu đa kênh, Tổng phí sàn, Tỷ lệ phí sàn bình quân (Take Rate ~9.5%), Tổng CM3 sau Ads.
  - Biểu đồ cột nhóm (Grouped Bar Chart): So sánh song song Doanh thu thuần vs CM2 vs CM3 của Shopee, TikTok, Lazada, D2C, POS.
  - Bảng đối soát chi tiết: Bóc tách phí hoa hồng, chi phí kho WMS, chi phí Ads và Blended ROAS theo từng sàn.

---

## 5. Pricing Intelligence Simulator (`/app?page=pricingCalculator`)
- **Mục tiêu:** Công cụ tương tác giúp chủ shop tính toán giá bán đề xuất, giá hòa vốn và mức voucher giảm giá tối đa.
- **Bố cục & Tính năng:**
  - Bộ chọn sản phẩm mẫu (Flagship Phone, Earbuds, Charger...).
  - Cột trái - Thanh trượt tương tác:
    - Giá niêm yết (₫)
    - Giá vốn hàng bán (COGS)
    - Phí sàn TMĐT (%)
    - Phí thanh toán (%)
    - Chi phí đóng gói & kho (₫)
    - Voucher giảm giá (₫)
    - Mục tiêu biên lợi nhuận CM2 (%)
  - Cột phải - Thác dòng lợi nhuận (Waterfall): Cập nhật tức thì các nấc chi phí và lợi nhuận khi người dùng kéo thanh trượt.
  - 3 Thẻ chỉ số an toàn: Giá hòa vốn (Break-even), Giá bán đề xuất, Mức voucher tối đa cho phép.

---

## 6. Sales, Inventory, Marketing, Customer, Operations & Cash Analytics
- **Sales Analytics (`/app?page=salesAnalytics`):** Biểu đồ diện tích doanh thu vs giá vốn + Bản đồ nhiệt bán hàng (Sales Heatmap) 7 ngày trong tuần x 6 khung giờ.
- **Inventory Analytics (`/app?page=inventoryAnalytics`):** Biểu đồ Pareto 80/20 + Thanh cơ cấu tuổi hàng tồn kho (Aging Buckets) + Bảng đề xuất đặt hàng bổ sung (Replenishment Intelligence).
- **Marketing Analytics (`/app?page=marketingAnalytics`):** Đo lường Ad Spend, Attributed Revenue, Blended ROAS, CPA và Bảng hiệu quả từng chiến dịch (Meta Ads, TikTok Ads, Shopee In-App, Booking KOC) có gắn nhãn `[ACTUAL]` / `[ESTIMATED]`.
- **Customer Analytics (`/app?page=customerAnalytics`):** Ma trận giữ chân theo tháng (Cohort Retention Heatmap M0->M3) + Bảng phân tầng 5 nhóm RFM kèm chiến lược hành động.
- **Operations Analytics (`/app?page=operationsAnalytics`):** Đo lường Cycle Time, thời gian nhặt hàng theo wave, thời gian scan-to-pack, tỷ lệ tuân thủ SLA (98.2%) và so sánh năng suất giữa các kho HCM và Hà Nội.
- **Cash & Working Capital (`/app?page=cashWorkingCapital`):** Quản trị dòng tiền thực thu, Khoảng cách vốn lưu động (Working Capital Gap), Chu kỳ luân chuyển tiền mặt (CCC = 34 ngày) và Lịch giải ngân đối soát sàn TMĐT.
