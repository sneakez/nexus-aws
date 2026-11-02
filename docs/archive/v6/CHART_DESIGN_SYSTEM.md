# HỆ THỐNG THIẾT KẾ BIỂU ĐỒ V6 (CHART DESIGN SYSTEM)

Tài liệu hướng dẫn trực quan hóa số liệu, bảng màu bản mệnh Tuyền Trung Thủy, và nguyên tắc lựa chọn loại biểu đồ chuẩn SaaS Analytics trong NexusOMS V6.

---

## 1. Triết Lý & Bảng Màu Ocean Premium

Hệ thống biểu đồ V6 sử dụng ngôn ngữ thiết kế **Ocean Premium** kết hợp nền phân tích màu trắng ngọc thanh thoát, độ tương phản cao đạt chuẩn WCAG 2.1 AAA:

- **Nền thẻ phân tích:** Trắng tinh khiết (`#FFFFFF`) và xám ngọc sương (`#F8FAFC`).
- **Typography & Trục số:** Deep Ocean Ink (`#0F172A`, `#334155`, `#64748B`).
- **Màu Series Chủ Đạo:**
  - **Ocean Teal (Chủ mệnh - Doanh thu & Dòng tiền):** `#27B4A0` (Dòng suối nguồn luân chuyển).
  - **Cerulean Blue (Lợi nhuận đóng góp CM2):** `#0284C7` (Độ tin cậy, vững chãi).
  - **Emerald Green (Lợi nhuận sau Ads CM3 & Tăng trưởng):** `#10B981` (Tăng trưởng thịnh vượng).
  - **Amber Gold (Cảnh báo & Dấu hỏi):** `#F59E0B` (Lưu ý, đứt hàng tiềm ẩn).
  - **Rose Crimson (Giá vốn, Chi phí sàn & Thất thoát):** `#E11D48` / `#EF4444`.
  - **Purple Violet (Marketing & Khách hàng):** `#8B5CF6`.

---

## 2. Ma Trận Lựa Chọn Biểu Đồ Theo Mục Đích (Chart Purpose Matrix)

| Mục Đích Phân Tích | Loại Biểu Đồ Chuẩn | Component Trong Codebase | Màn Hình Ứng Dụng |
| :--- | :--- | :--- | :--- |
| **Xu hướng thời gian (Trend)** | Line / Area Chart | `LineAreaChart.tsx` | Executive Dashboard, Sales Analytics (Doanh thu vs Giá vốn) |
| **Bóc tách chi phí (Decomposition)** | Waterfall Chart | `WaterfallChart.tsx` | Dashboard P&L, Pricing Simulator (Gross -> Net -> CM1 -> CM2 -> CM3) |
| **Đối chiếu đa kênh (Comparison)** | Grouped Bar Chart | `GroupedBarChart.tsx` | Channel Economics (Shopee vs TikTok vs Lazada vs D2C) |
| **Phân tích 80/20 (Pareto)** | Composed Bar + Line | `ParetoChart.tsx` | Inventory Analytics (Xác định 20% SKU nhóm A đóng góp 80% doanh thu) |
| **Mật độ theo giờ/ngày (Distribution)**| Matrix Heatmap | `HeatmapChart.tsx` | Sales Analytics (Giờ vàng chốt đơn trong tuần) |
| **Giữ chân theo nhóm (Cohort)** | Month Cohort Matrix | `CohortHeatmap.tsx` | Customer Analytics (Tỷ lệ giữ chân khách từ M0 đến M3) |
| **Mối quan hệ 3 biến (Relationship)** | 3-Variable Bubble Chart | `ScatterBubbleChart.tsx` | SKU Economics (Trục X: CM%, Trục Y: Doanh thu, Bong bóng: Vốn tồn) |
| **Chỉ số tổng hợp (Summary)** | KPI Cards with Deltas | `KPICard.tsx` | Tất cả màn hình phân tích (Doanh thu, CM1, CM2, CM3, CCC, AOV) |

---

## 3. Các Thành Phần Trực Quan Dùng Lại (Reusable Components)

1. **`AnalyticsCard` (`src/components/charts/AnalyticsCard.tsx`):** Khung card chuẩn hóa có Tiêu đề, Phụ đề, Huy hiệu nguồn dữ liệu (`ACTUAL` / `ESTIMATED` / `ASSUMPTION` / `SIMULATED`), Tooltip giải thích công thức toán học và Khu vực nút thao tác nhanh.
2. **`KPICard` (`src/components/charts/KPICard.tsx`):** Thẻ chỉ số hiển thị giá trị lớn font mono, phần trăm biến động so với kỳ trước kèm mũi tên xanh/đỏ thông minh, và hỗ trợ đảo chiều xu hướng (Inverse trend - ví dụ tỷ lệ hoàn giảm là tích cực).
3. **`DateRangeFilter` & `ComparisonSelector` (`src/components/charts/DateRangeFilter.tsx`):** Bộ lọc chu kỳ (Hôm nay, 7 ngày, 30 ngày, Tháng này, Tháng trước) và tùy chọn đối chiếu kỳ trước hoặc mục tiêu.
4. **`CustomChartTooltip` (`src/components/charts/ChartTooltip.tsx`):** Tooltip nền tối hiệu ứng kính mờ (Dark glass), tự động định dạng tiền tệ Việt Nam Đồng và dấu thập phân chuẩn xác.
5. **`InsightSummary` (`src/components/charts/InsightSummary.tsx`):** Khung hiển thị Decision Intelligence 4 tầng trực quan kèm điểm tin cậy và liên kết trực tiếp tới trang hành động.
