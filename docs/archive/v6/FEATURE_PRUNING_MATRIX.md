# MA TRẬN TINH GỌN SẢN PHẨM & TỔ CHỨC ĐIỀU HƯỚNG V6 (FEATURE PRUNING MATRIX)

## 1. Mục Tiêu & Nguyên Tắc Tinh Gọn
Trong phiên bản **NexusOMS V6**, nền tảng chuyển dịch từ một hệ thống quản trị kỹ thuật sang **Nền tảng Tối ưu Vận hành Đa kênh, Kinh tế Đơn vị (Unit Economics) & Trợ lý Phân tích Dữ liệu Ra Quyết Định** cho Chủ doanh nghiệp.
- **Không xóa code legacy:** Giữ nguyên các hàm nghiệp vụ, mô hình dữ liệu và router đã kiểm thử.
- **Ẩn khỏi Menu chính:** Các màn hình kế toán tổng hợp nặng nề (Sổ cái, Nợ/Có, Journal Entries) được loại khỏi Sidebar để tập trung vào Dòng tiền (Cash Flow) và Đóng góp lợi nhuận (Contribution Margin).
- **Hợp nhất (Merge):** Gộp các màn hình phân mảnh vào các trung tâm phân tích chuyên sâu.
- **Khu vực Demo Lab:** Đưa các tính năng mô phỏng, nghiệm thu vào nhóm `Quản trị & Demo Lab` (chỉ hiển thị khi `VITE_DATA_MODE=mock`).

---

## 2. Bảng Phân Loại Tính Năng Chi Tiết

| Mã Màn Hình | Tên Tính Năng | Phân Loại V6 | Vị Trí / Nhóm Mới Trong V6 | Lý Do & Hành Động Kỹ Thuật |
| :--- | :--- | :--- | :--- | :--- |
| `dashboard` | Executive Dashboard | **CORE** | `1. Tổng quan` | Nâng cấp toàn diện thành Executive Analytics Dashboard bóc tách Waterfall P&L và Decision Intelligence. |
| `orders` | Đơn hàng đa kênh | **CORE** | `2. Bán hàng` | Giữ nguyên trung tâm điều phối đơn hàng, liên kết trực tiếp sang Order Economics. |
| `customers` | Khách hàng (CRM) | **CORE** | `2. Bán hàng` | Giữ nguyên CRM, bổ sung liên kết đến Customer Analytics Cohorts & RFM. |
| `salesAnalytics` | Phân tích Bán hàng | **CORE (NEW)** | `2. Bán hàng` | Module V6 mới: Tích hợp vận tốc bán hàng, tăng trưởng MoM và bản đồ nhiệt (Heatmap). |
| `inventory` | Tồn kho 5 trạng thái | **CORE** | `3. Kho vận` | Giữ nguyên mô hình bảo toàn Canonical: Physical = Sellable + Reserved + Unavailable. |
| `fulfillment` | Wave Picking & SLA | **CORE** | `3. Kho vận` | Hợp nhất chức năng định tuyến kho (Warehouse Routing) vào Wave Picking & Countdown SLA. |
| `inventoryAnalytics` | Phân tích Kho & Tái đặt | **CORE (NEW)** | `3. Kho vận` | Hợp nhất: Sales Velocity + Safety Stock & Buffer + Phân loại Pareto ABC/XYZ + Tuổi hàng lưu kho. |
| `transfers` | Chuyển kho chi nhánh | **CORE** | `3. Kho vận` | Giữ nguyên luồng điều chuyển nội bộ giữa các kho HCM và Hà Nội. |
| `batches` | Lô & Hạn sử dụng | **CORE** | `3. Kho vận` | Giữ nguyên quản lý lô hàng FEFO và Serial/IMEI. |
| `purchaseOrders` | Đơn mua hàng (PO) | **CORE** | `4. Mua hàng` | Giữ nguyên quản lý PO, liên kết đến chu kỳ vốn lưu động và cảnh báo đứt hàng. |
| `products` | Sản phẩm & SKU | **CORE** | `4. Mua hàng` | Giữ nguyên danh mục sản phẩm, combo bundle và BOM. |
| `returns` | Đổi trả / RMA 6 Nhánh | **CORE** | `5. Hậu mãi` | Giữ nguyên ma trận 6 nhánh đổi trả và cơ chế Maker/Checker phân cấp. |
| `orderEconomics` | Order Economics | **CORE (NEW)** | `6. Unit Economics` | Bóc tách chi tiết từng dòng đơn hàng: Gross -> Discounts -> COGS -> CM1 -> Fees -> WMS -> CM2 -> Ads -> CM3. |
| `skuEconomics` | SKU Economics & BCG | **CORE (NEW)** | `6. Unit Economics` | Đo lường CM/unit, Stock ROI, Break-even price, ngày tồn kho DIO và ma trận BCG Star/Cash Cow/Dog. |
| `channelEconomics` | Channel Economics | **CORE (NEW)** | `6. Unit Economics` | So sánh hiệu quả thực tế giữa Shopee, TikTok Shop, Lazada, D2C và POS (Take Rate & ROAS). |
| `pricingCalculator` | Pricing Intelligence | **CORE (NEW)** | `6. Unit Economics` | Máy tính định giá tương tác mô phỏng giá hòa vốn, giá đề xuất và mức trần voucher giảm giá an toàn. |
| `marketingAnalytics` | Marketing & ROAS | **CORE (NEW)** | `7. Data Analytics` | Bóc tách chi phí Ads theo chiến dịch, CPA, CAC, ROAS và lợi nhuận thuần sau Ads (CM3). |
| `customerAnalytics` | Khách hàng & Cohorts | **CORE (NEW)** | `7. Data Analytics` | Ma trận giữ chân theo tháng (Cohort Retention M0-M3) và 5 phân khúc RFM với gợi ý hành động. |
| `operationsAnalytics` | Vận hành & SLA | **CORE (NEW)** | `7. Data Analytics` | Đo lường Cycle Time, thời gian nhặt/đóng gói, tỷ lệ tuân thủ SLA và so sánh các kho. |
| `cashWorkingCapital` | Dòng tiền & Vốn lưu động | **CORE (NEW)** | `7. Data Analytics` | Quản trị thanh khoản, khoảng cách vốn lưu động (Working Capital Gap) và chu kỳ tiền mặt CCC. |
| `channelConnections` | Kênh bán & Kết nối | **CORE** | `8. Quản trị` | Hợp nhất Sync Monitoring và Ánh xạ SKU kênh vào màn hình kết nối sàn TMĐT. |
| `settings` | Cài đặt & RBAC | **CORE** | `8. Quản trị` | Quản lý người dùng, phân quyền vai trò (Owner, Admin, Manager, Warehouse, Finance). |
| `auditTrail` | Nhật ký Audit | **CORE** | `8. Quản trị` | Nhật ký bất biến ghi nhận mọi giao dịch và thay đổi trạng thái trong hệ thống. |
| `ownerValidation` | Nghiệm thu nghiệp vụ | **DEMO ONLY** | `8. Quản trị > Demo Lab` | Trung tâm chạy kịch bản Before/Delta/After, chỉ hiển thị trong môi trường prototype. |
| `businessRules` | Phê duyệt quy tắc | **DEMO ONLY** | `8. Quản trị > Demo Lab` | Nơi Chủ dự án review các giả định ASSUMPTION và ký duyệt phương án kinh doanh. |
| `simulator` | Chaos Simulator | **DEMO ONLY** | `8. Quản trị > Demo Lab` | Công cụ giả lập tải cao, flash sale và lỗi webhook trong môi trường demo. |
| `salesVelocity` | Vận tốc bán hàng | **MERGED** | Hợp nhất vào `inventoryAnalytics` | Không cần trang riêng; tích hợp vào bảng phân tích tồn kho và tái đặt hàng. |
| `bufferRules` | Tồn kho an toàn & Buffer | **MERGED** | Hợp nhất vào `inventoryAnalytics` | Cấu hình safety stock nằm trực tiếp cạnh tốc độ bán và runway days. |
| `marginControl` | Margin Circuit Breaker | **MERGED** | Hợp nhất vào `skuEconomics` & `pricingCalculator` | Cảnh báo bán lỗ và giá hòa vốn được tích hợp vào công cụ định giá. |
| `routingRules` | Định tuyến kho tự động | **MERGED** | Hợp nhất vào `fulfillment` | Tùy chọn tách/gộp đơn tích hợp vào quy trình xử lý đơn hàng. |
| `syncMonitor` | Giám sát đồng bộ sàn | **MERGED** | Hợp nhất vào `channelConnections` | Trạng thái sync và log retry hiển thị trực tiếp trong danh sách kết nối shop. |
| `revenueReport` | Báo cáo doanh thu | **MERGED** | Hợp nhất vào `salesAnalytics` | Báo cáo doanh thu cũ được thay thế bằng chuỗi phân tích thời gian và heatmap. |
| `feeReconciliation` | Đối soát phí sàn | **MERGED** | Hợp nhất vào `channelEconomics` & `cashWorkingCapital` | Đối soát phí và lịch giải ngân tích hợp vào dòng tiền và take rate. |
| `ledger` | Sổ kế toán kép | **LEGACY (HIDDEN)** | Giữ trong code, ẩn khỏi Nav | Không xóa file; chỉ ẩn khỏi Sidebar để giao diện tập trung vào quản trị điều hành. |
| `complaints` | Khiếu nại & AI | **DEFERRED** | Giữ trong code, ẩn khỏi Nav | Tạm hoãn AI sentiment phức tạp, tập trung nguồn lực vào Unit Economics và Data Analytics. |
| `automationRules` | Luật tự động IF-THEN | **DEFERRED** | Giữ trong code, ẩn khỏi Nav | Tạm hoãn rule engine nâng cao cho giai đoạn sau khi chốt xong nghiệp vụ. |
| `webhooks` | Outbound Webhooks | **DEFERRED** | Giữ trong code, ẩn khỏi Nav | Tạm hoãn cấu hình webhook ra ngoài trong bản prototype. |

---

## 3. Kiến Trúc 8 Nhóm Điều Hướng Chính Thức Trong V6
```
├── 1. Tổng quan
│   └── Executive Dashboard (/app?page=dashboard)
├── 2. Bán hàng
│   ├── Đơn hàng đa kênh (/app?page=orders)
│   ├── Khách hàng (CRM) (/app?page=customers)
│   └── Phân tích bán hàng (/app?page=salesAnalytics)
├── 3. Kho vận
│   ├── Tồn kho 5 trạng thái (/app?page=inventory)
│   ├── Wave Picking & SLA (/app?page=fulfillment)
│   ├── Phân tích kho & Tái đặt (/app?page=inventoryAnalytics)
│   ├── Chuyển kho chi nhánh (/app?page=transfers)
│   └── Lô & Hạn sử dụng (/app?page=batches)
├── 4. Mua hàng
│   ├── Đơn mua hàng (PO) (/app?page=purchaseOrders)
│   └── Sản phẩm & SKU (/app?page=products)
├── 5. Hậu mãi
│   └── Đổi trả / RMA 6 Nhánh (/app?page=returns)
├── 6. Unit Economics
│   ├── Order Economics (/app?page=orderEconomics)
│   ├── SKU Economics & BCG (/app?page=skuEconomics)
│   ├── Channel Economics (/app?page=channelEconomics)
│   └── Pricing Intelligence (/app?page=pricingCalculator)
├── 7. Data Analytics
│   ├── Marketing & ROAS (/app?page=marketingAnalytics)
│   ├── Khách hàng & Cohorts (/app?page=customerAnalytics)
│   ├── Vận hành & Chu kỳ SLA (/app?page=operationsAnalytics)
│   └── Dòng tiền & Vốn lưu động (/app?page=cashWorkingCapital)
└── 8. Quản trị & Demo Lab
    ├── Kênh bán & Kết nối (/app?page=channelConnections)
    ├── Cài đặt & RBAC (/app?page=settings)
    ├── Nhật ký Audit (/app?page=auditTrail)
    ├── 🧪 Nghiệm Thu Nghiệp Vụ (/app?page=ownerValidation) [Mock only]
    ├── ⚖️ Phê Duyệt Quy Tắc (/app?page=businessRules) [Mock only]
    └── ⚡ Chaos Simulator (/app?page=simulator) [Mock only]
```
