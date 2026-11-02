# DREAM TERUS — SYSTEM STATUS, ARCHITECTURE & AI HANDOVER SPECIFICATION
> **Document Type:** Comprehensive AI & Engineering Handover Document  
> **Target Audience:** Autonomous AI Coding Agents (Antigravity, Claude, GPT, DeepSeek), Principal Architects & Full-Stack Developers  
> **Product Name:** Dream Terus — Internal Commerce Operating System (Commerce OS)  
> **Former Repository Name:** NexusOMS / Noxus-V3 ([github.com/sneakez/Noxus-V3](https://github.com/sneakez/Noxus-V3))  
> **Business Owner:** Phan Phúc Thịnh (Founder, Terus Tech)  
> **Last Updated:** 2026-10-29  
> **Active Git Branches:** `feature/nexusoms-v6-digital-commerce-only` (Active Development) & `main` (Production Track)  

---

## 1. EXECUTIVE BUSINESS CONTEXT & PHILOSOPHY

### 1.1 Về Doanh Nghiệp (Terus Tech)
Terus Tech là doanh nghiệp bán lẻ thương mại điện tử chuyên về phụ kiện và thiết bị công nghệ.
* **Kênh ưu tiên hiện tại (Tier 1):** TikTok Shop (Livestream, Short video, Shop Tab).
* **Kênh mở rộng tiếp theo (Tier 2):** Shopee.
* **Kênh dài hạn (Tier 3):** Website riêng (Shopify / WooCommerce / Custom) và hệ sinh thái sản phẩm mang thương hiệu Terus.

### 1.2 Triết Lý Sản Phẩm Dream Terus
Dream Terus **không phải** là một ứng dụng hiển thị số liệu vanity (phù phiếm) hay bảng quản trị đơn hàng thông thường. Hệ thống được xây dựng như một **Hệ Điều Hành Ra Quyết Định (Decision & Execution OS)** phục vụ trực tiếp cho Founder và đội ngũ vận hành tinh gọn, giải quyết 7 câu hỏi sống còn:
1. Doanh nghiệp đang thực sự diễn ra điều gì ngay tại thời điểm này?
2. Số liệu nào là **Thực tế (Reconciled)**, số liệu nào là **Tạm tính (Provisional)**, **Ước tính (Estimated)** hay **Mô phỏng (Simulated)**?
3. Sản phẩm, kênh và chiến dịch nào thực sự đem lại **Lợi nhuận đóng góp (Contribution Margin CM1, CM2, CM3)** sau khi trừ hết chi phí quảng cáo và phí sàn?
4. Dòng tiền thực tế có sẵn là bao nhiêu, tiền đang chờ đối soát là bao nhiêu, và nghĩa vụ thanh toán nhà cung cấp nào sắp đến hạn?
5. Điểm nghẽn vận hành nào (SLA kho, tỷ lệ hoàn hàng, đứt gãy tồn kho) đang đe dọa tăng trưởng?
6. Quyết định trọng yếu nào cần phải đưa ra hôm nay?
7. Ai chịu trách nhiệm (Owner), hạn chót là khi nào (Deadline), và kết quả sau đó được đối soát ra sao?

---

## 2. HIỆN TRẠNG KỸ THUẬT & TRẠNG THÁI HỆ THỐNG

### 2.1 Tech Stack
* **Framework:** React 18.3+ với TypeScript 5.5+.
* **Bundler & Dev Server:** Vite 5.x (Chạy cổng `http://localhost:5173/`).
* **Styling:** Tailwind CSS v4 + Tailwind Animate.
* **Icons & Visuals:** `lucide-react`.
* **Biểu đồ & Analytics:** `recharts`.
* **Kiểm thử (Testing):** `vitest` (14 test files, 85/85 tests pass 100%), TypeScript Strict Compiler (`tsc --noEmit` — 0 errors).
* **Cơ chế dữ liệu kép (Dual Data Mode):**
  * `DATA_MODE=mock` (Mặc định): Hệ thống Mock Engine mô phỏng bộ nhớ (`src/mock/store.ts` + `src/mock/data.ts`) với cơ chế LocalStorage persistence, Event Sourcing, Publish/Subscribe, và kịch bản nghiệp vụ có thể Reset tức thì.
  * `DATA_MODE=supabase`: Tích hợp Supabase Client (`src/lib/supabase.ts`) cho cơ sở dữ liệu Postgres thật khi triển khai backend.

### 2.2 Trạng Thái Git & Chất Lượng Mã Nguồn
* **Commit gần nhất:**
  * `0d13b77`: *fix(rbac): fix menu role restriction filter using getAllowedPagesForRole and URL query sync*
  * `9c62137`: *feat(rbac): integrate direct Sidebar role switcher and support full 7 business roles*
  * `0effe53`: *refactor(ui): complete Dream Terus UI/UX refactoring across shell, navigation, and all 12 operational pages*
* **Working Tree:** Hoàn toàn sạch (`clean`), đã đồng bộ giữa nhánh `feature/nexusoms-v6-digital-commerce-only` và nhánh `main`.

---

## 3. THIẾT KẾ GIAO DIỆN & HỆ MÀU OCEAN PREMIUM

Toàn bộ hệ thống tuân thủ nghiêm ngặt bảng màu **NexusOMS Ocean Premium Design System**:

```css
:root {
  --ocean-deep: #081B2C;          /* Màu nền Sidebar và Header chính */
  --ocean-midnight: #123A52;      /* Màu tiêu đề, văn bản cấp cao */
  --ocean-teal: #1E647F;          /* Màu Action Primary CTA, nút bấm chính, tab kích hoạt */
  --ocean-teal-hover: #164E65;    /* Hover nút CTA */
  --ocean-jade: #27B4A0;          /* Điểm nhấn tích cực, KPI xanh ngọc, badge thành công */
  --ocean-silver: #D9E3E8;        /* Đường viền chuẩn (Border), divider */
  --ocean-pearl: #F4F8FA;         /* Màu nền toàn bộ Canvas trang (App Background) */

  --text-primary: #123A52;
  --text-secondary: #475569;
  --panel-background: #FFFFFF;

  --status-success: #15803D;      /* Xanh lá trạng thái */
  --status-warning: #B45309;      /* Vàng cam cảnh báo */
  --status-danger: #BE123C;       /* Đỏ cảnh báo nguy cấp, biên âm */
  --status-info: #2563EB;         /* Xanh dương tiến độ vận hành */
}
```

### Quy tắc thiết kế bắt buộc cho AI:
1. **Tuyệt đối không sử dụng màu Orange** làm màu nhận diện thương hiệu.
2. **Khung Card & Container:** Dùng `bg-white border border-[#D9E3E8] rounded-2xl p-5 shadow-sm`.
3. **Typography:** Ngôn ngữ tiếng Việt chuẩn vận hành, các thuật ngữ quốc tế để trong ngoặc đơn, ví dụ: `Đơn vị kinh tế (Unit Economics)`, `Lợi nhuận đóng góp (Contribution Margin)`.
4. **Bảng dữ liệu (Data Tables):** Tiêu đề cột dùng font cỡ nhỏ in hoa `text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80`, có phân cách rõ ràng, hover hàng mượt mà.

---

## 4. KIẾN TRÚC PHÂN QUYỀN VAI TRÒ (RBAC) & ĐIỀU HƯỚNG MENU

### 4.1 Bảy Vai Trò Nghiệp Vụ Chuẩn (7 Roles)
Hệ thống hỗ trợ 7 vai trò được định nghĩa trong `src/types/index.ts` và được cấu hình ma trận tại [`src/lib/permissions.ts`](file:///d:/Noxus-V3/src/lib/permissions.ts):

| Mã Role | Tên Tiếng Việt | Quyền Hạn Thực Tế | Nhóm Menu Được Phép |
| :--- | :--- | :--- | :--- |
| `owner` | 👑 Chủ Doanh Nghiệp | Toàn quyền kiểm soát hệ thống, xem toàn bộ số liệu tài chính chiến lược, ký duyệt quyết định. | 7/7 nhóm (27 trang) |
| `admin` | ⚡ Quản Trị Viên | Quản trị kỹ thuật, cấu hình API kênh, người dùng, phân quyền, webhooks. | 7/7 nhóm (27 trang) |
| `manager` | 📊 Trưởng Phòng OMS | Điều hành toàn diện đơn hàng, tồn kho, điều phối vận chuyển, phân tích doanh số. Ẩn cài đặt người dùng. | Nhóm 01 đến 06 |
| `warehouse` | 📦 Nhân Viên Kho | Chuyên trách thực thi kho: Nhặt hàng wave, đóng gói, kiểm kê tồn kho 5 trạng thái, PO, chuyển kho, thẻ kho. **Ẩn hoàn toàn Tài chính, Tăng trưởng, Cài đặt.** | Nhóm 01 (Dashboard), 02 (Đơn & Wave), 03 (Kho) |
| `finance` | 💰 Kế Toán | Chuyên trách số liệu tài chính: Lợi nhuận đơn CM1-CM3, SKU Economics, Phí sàn, Dòng tiền & Vốn lưu động, Định giá, Sổ cái, Đối soát, Audit Trail. **Ẩn nhặt hàng kho & Ads.** | Nhóm 01, 02 (Chỉ xem đơn), 04 (Tài chính), 06 (Audit & Quyết định) |
| `growth` | 🚀 Tăng Trưởng & Ads | Tối ưu hóa chuyển đổi, chi phí Ads, ROAS, Cohort Retention, Phân tích bán hàng, Danh mục SP & Phí kênh. **Ẩn kho bãi và kế toán.** | Nhóm 01, 02 (Chỉ xem đơn), 03 (Sản phẩm), 04 (Phí kênh & Giá), 05 (Marketing) |
| `viewer` | 👁️ Người Xem | Chế độ chỉ đọc (Read-only): Xem Dashboard, Đơn hàng, Sản phẩm, Tồn kho. Toàn bộ nút tạo/sửa bị ẩn hoặc vô hiệu hóa. | Nhóm 01, 02, 03, 05 (Chỉ đọc) |

### 4.2 Cơ Chế Lọc Menu (Single Source of Truth)
* **File nguồn:** [`src/lib/permissions.ts`](file:///d:/Noxus-V3/src/lib/permissions.ts) hàm `getAllowedPagesForRole(currentRole: TenantRole): PageId[]`.
* **Sidebar Component:** [`src/components/layout/Sidebar.tsx`](file:///d:/Noxus-V3/src/components/layout/Sidebar.tsx) dùng `useMemo` lọc động `filteredGroups`. Bất kỳ trang nào không có trong Set `allowedPages` sẽ bị loại trừ. Nhóm menu không còn mục nào sẽ tự động ẩn đi.
* **Route Guard tự động:** Khi người dùng đổi vai trò hoặc cố tình truy cập trang không có quyền, Sidebar kích hoạt `useEffect` đưa URL về `dashboard` an toàn.

### 4.3 Thao Tác Chuyển Đổi Vai Trò (Role Switcher)
1. **Qua Giao Diện (GUI):** Nhấp trực tiếp vào tên người dùng / huy hiệu vai trò ở góc dưới bên trái của Sidebar (chân trang). Một popover mở ra cho phép chọn 1 trong 7 vai trò với hiệu ứng tức thì.
2. **Qua Tham Số URL:** Truyền `?role=owner`, `?role=warehouse`, `?role=finance`, `?role=growth`, `?role=manager`, `?role=viewer`. [`src/providers/AuthProvider.tsx`](file:///d:/Noxus-V3/src/providers/AuthProvider.tsx) sẽ tự động đồng bộ vai trò vào `mockStore`.

---

## 5. BẢN ĐỒ CẤU TRÚC THÔNG TIN & CÁC TRANG CỦA HỆ THỐNG

Hệ điều hành gồm 7 nhóm điều hướng chính (`src/components/layout/Sidebar.tsx` & `src/App.tsx`):

### 01. Trung Tâm Điều Hành (Command Center)
* `dashboard` ([`ExecutiveAnalyticsDashboard.tsx`](file:///d:/Noxus-V3/src/pages/analytics/ExecutiveAnalyticsDashboard.tsx)): Bảng điều hành Founder, dòng đóng góp lợi nhuận (CM1, CM2, CM3), doanh thu ròng, cảnh báo điểm nghẽn.
* `ownerValidation` ([`OwnerValidationCenterPage.tsx`](file:///d:/Noxus-V3/src/pages/businessValidation/OwnerValidationCenterPage.tsx)): Trung tâm nghiệm thu nghiệp vụ và chạy thử kịch bản vận hành thực tế.
* `businessRules` ([`BusinessRulesReviewPage.tsx`](file:///d:/Noxus-V3/src/pages/businessRules/BusinessRulesReviewPage.tsx)): Rà soát và thiết lập quy tắc vận hành.

### 02. Vận Hành Đơn Hàng (Order Operations)
* `orders` ([`OrdersPage.tsx`](file:///d:/Noxus-V3/src/pages/orders/OrdersPage.tsx)): Quản lý vòng đời đơn hàng (Chờ duyệt -> Giữ kho -> Đang pick -> Đóng gói -> Đang giao -> Giao thành công / Hoàn hàng). Hỗ trợ xem chi tiết chi phí đơn, drawer chi tiết, và preset bộ lọc.
* `customers` ([`CustomersPage.tsx`](file:///d:/Noxus-V3/src/pages/customers/CustomersPage.tsx)): Hồ sơ khách hàng, phân tầng giá trị (VIP, thường, rủi ro) và lịch sử mua.
* `fulfillment` ([`FulfillmentPage.tsx`](file:///d:/Noxus-V3/src/pages/fulfillment/FulfillmentPage.tsx)): Điều phối nhặt hàng theo đợt (Wave Picking), in phiếu đóng gói, quét barcode, đối soát SLA xuất kho.
* `returns` ([`ReturnsPage.tsx`](file:///d:/Noxus-V3/src/pages/returns/ReturnsPage.tsx)): Xử lý đổi trả hàng (RMA), quy trình Maker-Checker (Kho nhận hàng -> QC kiểm định -> Nhập lại tồn / Thanh lý -> Kế toán hoàn tiền).

### 03. Kho Hàng & Tồn Kho (WMS & Inventory)
* `products` ([`ProductsPage.tsx`](file:///d:/Noxus-V3/src/pages/products/ProductsPage.tsx)): Danh mục sản phẩm, biến thể SKU, giá vốn định mức (Standard Cost), mã barcode.
* `inventory` ([`InventoryPage.tsx`](file:///d:/Noxus-V3/src/pages/inventory/InventoryPage.tsx)): **Tồn kho 5 trạng thái** chi tiết theo từng kho bãi vật lý.
* `purchaseOrders` ([`PurchaseOrdersPage.tsx`](file:///d:/Noxus-V3/src/pages/purchaseOrders/PurchaseOrdersPage.tsx)): Quản lý đơn mua hàng từ nhà cung cấp (PO), tiến độ giao hàng, nhập kho từng phần.
* `transfers` ([`TransfersPage.tsx`](file:///d:/Noxus-V3/src/pages/transfers/TransfersPage.tsx)): Chuyển hàng giữa các kho (Kho chính -> Kho đệm TikTok Shop / Shopee), theo dõi hàng đang trên đường trung chuyển (`in_transit`).
* `stockLedger` ([`StockLedgerPage.tsx`](file:///d:/Noxus-V3/src/pages/stockLedger/StockLedgerPage.tsx)): Thẻ kho bất biến, ghi nhận từng biến động xuất/nhập/điều chỉnh/kiểm kê với đầy đủ căn cứ và người thực hiện.
* `warehouses` ([`WarehousesPage.tsx`](file:///d:/Noxus-V3/src/pages/warehouses/WarehousesPage.tsx)): Danh mục các kho vật lý.
* `batches` ([`BatchesPage.tsx`](file:///d:/Noxus-V3/src/pages/batches/BatchesPage.tsx)): Quản lý lô hàng và hạn sử dụng (Lot / Batch tracking).

### 04. Tài Chính & Unit Economics
* `orderEconomics` ([`OrderEconomicsPage.tsx`](file:///d:/Noxus-V3/src/pages/unitEconomics/OrderEconomicsPage.tsx)): Lợi nhuận chi tiết trên từng đơn hàng (Waterfall: Giá bán -> Chiết khấu sàn -> COGS -> Phí Pick/Pack -> Phí vận chuyển -> Phí sàn -> Chi phí Ads quy bổ -> CM1, CM2, CM3).
* `skuEconomics` ([`SkuEconomicsPage.tsx`](file:///d:/Noxus-V3/src/pages/unitEconomics/SkuEconomicsPage.tsx)): Phân loại ma trận SKU (Ngôi sao, Bò sữa, Dấu hỏi, Chó cọc), phát hiện SKU có biên lợi nhuận âm.
* `channelEconomics` ([`ChannelEconomicsPage.tsx`](file:///d:/Noxus-V3/src/pages/unitEconomics/ChannelEconomicsPage.tsx)): Đối soát Take Rate và hiệu quả từng kênh bán (TikTok Shop vs Shopee vs Website).
* `cashWorkingCapital` ([`CashWorkingCapitalPage.tsx`](file:///d:/Noxus-V3/src/pages/analytics/CashWorkingCapitalPage.tsx)): Quản trị thanh khoản, chu kỳ chuyển đổi tiền mặt (CCC), công nợ phải thu từ sàn và công nợ phải trả nhà cung cấp.
* `pricingCalculator` ([`PricingIntelligencePage.tsx`](file:///d:/Noxus-V3/src/pages/unitEconomics/PricingIntelligencePage.tsx)): Công cụ mô phỏng giá bán và tính toán mức giá trần/sàn đảm bảo lợi nhuận mục tiêu sau khi trừ biểu phí kênh.
* `ledger` ([`LedgerPage.tsx`](file:///d:/Noxus-V3/src/pages/ledger/LedgerPage.tsx)): Sổ kế toán kép (`Debit == Credit`).
* `feeReconciliation` ([`FeeReconciliationPage.tsx`](file:///d:/Noxus-V3/src/pages/feeReconciliation/FeeReconciliationPage.tsx)): Đối soát biểu phí sàn tự động.
* `marginControl` ([`MarginControlPage.tsx`](file:///d:/Noxus-V3/src/pages/marginControl/MarginControlPage.tsx)): Hệ thống cảnh báo sớm đơn hàng âm biên lợi nhuận.

### 05. Tăng Trưởng & Khách Hàng (Growth & Marketing)
* `marketingAnalytics` ([`MarketingAnalyticsPage.tsx`](file:///d:/Noxus-V3/src/pages/analytics/MarketingAnalyticsPage.tsx)): Phân tích chi phí quảng cáo (TikTok Ads), ROAS thực tế, CAC và lợi nhuận ròng sau chi phí tiếp thị (CM3).
* `customerAnalytics` ([`CustomerAnalyticsPage.tsx`](file:///d:/Noxus-V3/src/pages/analytics/CustomerAnalyticsPage.tsx)): Phân tích giữ chân theo Cohort (Cohort Retention Matrix) và phân nhóm khách hàng RFM.
* `salesAnalytics` ([`SalesAnalyticsPage.tsx`](file:///d:/Noxus-V3/src/pages/analytics/SalesAnalyticsPage.tsx)): Phân tích doanh số theo thời gian, biểu đồ nhiệt bán hàng (Sales Heatmap).
* `salesVelocity` ([`SalesVelocityPage.tsx`](file:///d:/Noxus-V3/src/pages/salesVelocity/SalesVelocityPage.tsx)): Vận tốc bán hàng và dự báo tốc độ cạn kho.
* `revenueReport` ([`RevenueReportPage.tsx`](file:///d:/Noxus-V3/src/pages/revenueReport/RevenueReportPage.tsx)): Báo cáo doanh thu đa chiều.

### 06. Điều Hành Chiến Lược (Execution OS)
* `founderExecution` ([`FounderExecutionPage.tsx`](file:///d:/Noxus-V3/src/pages/founder/FounderExecutionPage.tsx)): Quản trị mục tiêu điều hành OKRs, kế hoạch hành động 8 bước, và **Nhật ký quyết định bất biến (Auditable Decision Log)**.
* `auditTrail` ([`AuditTrailPage.tsx`](file:///d:/Noxus-V3/src/pages/auditTrail/AuditTrailPage.tsx)): Nhật ký hệ thống kiểm toán SHA-256 chống sửa xóa.
* `simulator` ([`SimulatorPage.tsx`](file:///d:/Noxus-V3/src/pages/simulator/SimulatorPage.tsx)): Môi trường thử nghiệm tải và giả lập kịch bản bão đơn / đứt hàng.
* `flowGuide` ([`FlowGuidePage.tsx`](file:///d:/Noxus-V3/src/pages/flowGuide/FlowGuidePage.tsx)): Sơ đồ luồng nghiệp vụ end-to-end hướng dẫn cho nhân sự mới.

### 07. Hệ Thống & Cài Đặt (Governance & Admin)
* `settings` ([`SettingsPage.tsx`](file:///d:/Noxus-V3/src/pages/settings/SettingsPage.tsx)): Quản lý tài khoản, danh sách người dùng và phân bổ vai trò thành viên.
* `channelConnections` ([`ChannelConnectionsPage.tsx`](file:///d:/Noxus-V3/src/pages/channelConnections/ChannelConnectionsPage.tsx)): Quản lý API keys và kết nối Shop TikTok / Shopee.
* `channelMapping` ([`ChannelMappingPage.tsx`](file:///d:/Noxus-V3/src/pages/channelMapping/ChannelMappingPage.tsx)): Bảng ánh xạ mã SKU nội bộ với mã SKU sàn.
* `syncMonitor` ([`SyncMonitorPage.tsx`](file:///d:/Noxus-V3/src/pages/syncMonitor/SyncMonitorPage.tsx)): Giám sát webhook và tiến trình đồng bộ số lượng tồn kho lên sàn TMĐT.
* `automationRules` ([`AutomationRulesPage.tsx`](file:///d:/Noxus-V3/src/pages/automationRules/AutomationRulesPage.tsx)): Cấu hình luật tự động IF-THEN (Ví dụ: tự động gắn nhãn đơn VIP, tự động cảnh báo tồn thấp).
* `webhooks` ([`WebhooksPage.tsx`](file:///d:/Noxus-V3/src/pages/webhooks/WebhooksPage.tsx)): Cổng gửi tín hiệu bảo mật HMAC ra hệ thống bên ngoài.
* `bufferRules` ([`BufferRulesPage.tsx`](file:///d:/Noxus-V3/src/pages/bufferRules/BufferRulesPage.tsx)): Cấu hình định mức tồn kho an toàn (Safety Stock).
* `routingRules` ([`RoutingRulesPage.tsx`](file:///d:/Noxus-V3/src/pages/routingRules/RoutingRulesPage.tsx)): Cấu hình điều phối đơn hàng về kho gần nhất hoặc kho chuyên biệt.

---

## 6. CÁC QUY TẮC NGHIỆP VỤ BẤT BIẾN (INVARIANTS) — KHÔNG ĐƯỢC PHÁ VỠ

Bất kỳ AI hoặc kỹ sư nào tiếp quản dự án này **phải duy trì 4 quy tắc cốt lõi sau**:

### 6.1 Công Thức Tồn Kho 5 Trạng Thái (5-State Inventory Invariant)
$$Tồn\ Kho\ Vật\ Lý\ (Physical) = Khả\ Dụng\ (Available) + Đang\ Giữ\ (Allocated) + Không\ Khả\ Dụng\ (Unavailable)$$
$$Hàng\ Đang\ Về\ (In\text{-}Transit) = Hàng\ Chờ\ Nhập\ PO + Hàng\ Đang\ Chuyển\ Kho$$
* *Quy tắc:* Không bao giờ được cộng gộp `In-Transit` vào `Physical` trước khi nhân viên kho hoàn tất biên bản kiểm đếm nghiệm thu (GRN).
* *Quy tắc giữ hàng (Allocation):* Khi đơn hàng tạo mới, tồn kho `Available` phải trừ đi và chuyển sang `Allocated`. Khi đơn hàng xuất kho thành công, `Allocated` và `Physical` mới được trừ đồng thời.

### 6.2 Thác Lợi Nhuận Đóng Góp (Unit Economics Waterfall)
* **Doanh thu thuần (Net Revenue):** Doanh thu sau khi trừ mã giảm giá của nhà bán hàng và trợ giá sàn.
* **CM1 (Contribution Margin 1):** $\text{Net Revenue} - \text{COGS (Giá vốn hàng bán)}$.
* **CM2 (Contribution Margin 2):** $\text{CM1} - (\text{Phí sàn} + \text{Phí Pick/Pack} + \text{Phí Vận chuyển net})$.
* **CM3 (Contribution Margin 3):** $\text{CM2} - \text{Chi phí Quảng cáo trực tiếp (Ads Spend)}$.
* *Quy tắc:* Không được gọi doanh thu là "lợi nhuận". Doanh nghiệp chỉ thực sự có lãi để trang trải chi phí cố định (lương, mặt bằng) khi $\text{CM3} > 0$.

### 6.3 Nhãn Độ Tin Cậy Của Số Liệu (Confidence Tagging)
Mọi KPI tài chính hiển thị trên giao diện phải có nhãn nguồn gốc số liệu:
* `RECONCILED` (Xanh ngọc): Đã đối soát chính thức khớp 100% với báo cáo sao kê thanh toán từ TikTok Shop / Shopee / Ngân hàng.
* `PROVISIONAL` (Xanh dương): Tạm tính dựa trên công thức biểu phí hợp đồng và giá vốn tiêu chuẩn.
* `ESTIMATED` (Vàng hổ phách): Dự phóng dựa trên xu hướng thống kê.
* `SIMULATED` (Tím nhạt): Dữ liệu giả lập kịch bản thử nghiệm.

### 6.4 Vòng Lặp Ra Quyết Định Của Founder (8-Step Decision Loop)
Trong [`FounderExecutionPage.tsx`](file:///d:/Noxus-V3/src/pages/founder/FounderExecutionPage.tsx), mỗi hành động chiến lược phải ghi nhận đủ:
1. `Vấn đề nhận diện (Problem)`
2. `Bằng chứng số liệu (Evidence)`
3. `Tác động tài chính (Financial Impact)`
4. `Người chịu trách nhiệm (Owner)`
5. `Thời hạn hoàn thành (Deadline)`
6. `Giả định kiểm chứng (Hypothesis)`
7. `Quyết định ban hành (Decision)`
8. `Đối soát kết quả thực tế (Outcome Audit)`

---

## 7. HƯỚNG DẪN DÀNH CHO CÁC CON AI TIẾP THEO

Khi bạn (AI) nhận yêu cầu tiếp theo từ người dùng, hãy tuân thủ quy trình làm việc chuẩn sau:

### Bước 1: Khảo sát và chạy kiểm thử
Trước khi sửa bất kỳ file nào, hãy chạy kiểm thử để đảm bảo môi trường sạch sẽ:
```bash
# Kiểm tra lỗi biên dịch TypeScript
cd d:\Noxus-V3
npx tsc --noEmit

# Chạy toàn bộ 85 bài test
npx vitest run
```

### Bước 2: Thử nghiệm giao diện & Phân quyền
* Khởi động server dev nếu cần: `npm run dev`
* Kiểm tra giao diện qua các đường dẫn có vai trò:
  * Owner: `http://localhost:5173/app?page=dashboard&role=owner`
  * Warehouse: `http://localhost:5173/app?page=fulfillment&role=warehouse`
  * Finance: `http://localhost:5173/app?page=orderEconomics&role=finance`
  * Growth: `http://localhost:5173/app?page=marketingAnalytics&role=growth`
  * Manager: `http://localhost:5173/app?page=orders&role=manager`
  * Viewer: `http://localhost:5173/app?page=dashboard&role=viewer`

### Bước 3: Nguyên tắc sửa mã nguồn
1. **Bảo toàn chức năng:** Không xóa bỏ các tính năng hoặc quy tắc nghiệp vụ đã có.
2. **Tuân thủ Ocean Premium:** Luôn dùng màu chuẩn (`#081B2C`, `#123A52`, `#1E647F`, `#27B4A0`, `#D9E3E8`, `#F4F8FA`).
3. **Phân quyền nhất quán:** Nếu thêm trang mới, bắt buộc phải cập nhật:
   * Thêm `PageId` vào [`src/components/layout/Sidebar.tsx`](file:///d:/Noxus-V3/src/components/layout/Sidebar.tsx).
   * Khai báo quyền cho từng vai trò trong [`src/lib/permissions.ts`](file:///d:/Noxus-V3/src/lib/permissions.ts) tại `ROLE_PERMISSIONS`.
   * Khai báo route và page metadata trong [`src/App.tsx`](file:///d:/Noxus-V3/src/App.tsx).
4. **Không để hỏng test:** Chạy lại `npx vitest run` và `npx tsc --noEmit` sau khi sửa code.
5. **Commit rõ ràng & đẩy lên GitHub:** Commit với thông điệp Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`) và đẩy lên cả nhánh làm việc và nhánh `main`.

---

## 8. DANH MỤC TÀI LIỆU & BỘ ẢNH CHỨNG MINH ĐÍNH KÈM

Các file và báo cáo chi tiết liên quan:
* Báo cáo thư viện ảnh phân quyền RBAC: [`DREAM_TERUS_RBAC_ROLE_GALLERY.md`](file:///C:/Users/Admin/.gemini/antigravity/brain/8a04f802-e5a0-46f9-bd6e-2bf71f22b582/DREAM_TERUS_RBAC_ROLE_GALLERY.md)
* Báo cáo tái thiết kế UI/UX Ocean Premium: [`DREAM_TERUS_UI_UX_REFACTOR_REPORT.md`](file:///C:/Users/Admin/.gemini/antigravity/brain/8a04f802-e5a0-46f9-bd6e-2bf71f22b582/DREAM_TERUS_UI_UX_REFACTOR_REPORT.md)
* Các file ảnh chụp màn hình độ phân giải cao tại artifact directory:
  * `role_01_owner_dashboard.png` (246 KB)
  * `role_02_warehouse_fulfillment.png` (118 KB)
  * `role_03_finance_orderEconomics.png` (248 KB)
  * `role_04_growth_marketing.png` (196 KB)
  * `role_05_manager_orders.png` (84 KB)
  * `role_06_viewer_dashboard.png` (246 KB)
  * `role_switcher_view.png` (246 KB)

---
*Tài liệu này được tạo tự động và phê chuẩn bởi Antigravity Engineering System để phục vụ việc chuyển giao liên thông giữa các phiên làm việc và các hệ thống trí tuệ nhân tạo (AI Agents).*
