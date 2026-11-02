# NEXUSOMS V6.2 — HỆ THỐNG KIỂM TOÁN UI/UX TOÀN DIỆN (SYSTEM-WIDE UX AUDIT)

**Hệ thống:** NexusOMS — Multichannel Digital Commerce Operating System  
**Phiên bản:** V6.2 (Phase 2: Digital Commerce Only)  
**Phạm vi kiểm toán:** Toàn bộ màn hình, luồng dữ liệu, lưới dữ liệu phân cấp, biểu đồ, typography và tương thích thiết bị.  
**Môi trường:** `VITE_DATA_MODE=mock` | Zero Production Supabase  
**Ngày thực hiện:** 29/10/2026  

---

## 1. MỤC TIÊU VÀ PHƯƠNG PHÁP KIỂM TOÁN

Đợt kiểm toán hệ thống (System-Wide UX Audit) nhằm rà soát toàn bộ các điểm mù trải nghiệm, các khuyết tật hiển thị và tính nhất quán thị giác trên nền tảng NexusOMS sau khi loại bỏ hoàn toàn phạm vi POS/Bán trực tiếp.

### Phương pháp kiểm toán:
1. **Heuristic Evaluation (Nielsen Norman Group):** Kiểm tra khả năng nhận biết trạng thái hệ thống (Visibility of system status), đối chiếu với thực tế kinh doanh (Match between system and real world), kiểm soát người dùng (User control and freedom), sự nhất quán (Consistency and standards), và phòng ngừa lỗi (Error prevention).
2. **Đối sánh Visual Reference:** Áp dụng bài học thực tế từ Linear (mật độ thông tin cao mà tinh gọn), Metabase (cắt nghĩa biểu đồ và tooltip rõ ràng), và Shopify Polaris (IndexTable phân cấp và gom nhóm cột).
3. **Multi-Viewport Testing:** Đánh giá trực tiếp trên trình duyệt Chrome ở các độ phân giải: Mobile (360px, 390px), Tablet (768px), Desktop chuẩn (1280px, 1440px), và Màn hình rộng (1920px).

---

## 2. KẾT QUẢ KIỂM TOÁN TỪNG PHÂN HỆ NGHIỆP VỤ

### 2.1. Phân hệ Bán Hàng & Đơn Hàng (Orders & Sales Velocity)
- **Màn hình kiểm toán:** `OrdersPage.tsx`, `SalesAnalyticsPage.tsx`.
- **Hiện trạng trước kiểm toán:**
  - Bảng đơn hàng có tới 16 cột hiển thị cùng lúc, gây quá tải nhận thức (cognitive overload). Header bảng chia tầng quá cao khiến phần dữ liệu bị đẩy xuống sâu.
  - Mã đơn hàng `ORD-DIGITAL-001` và tiền tệ bị co kéo, một số trường hợp rớt dòng.
  - Heatmap mật độ đơn hàng trong ngày (`HeatmapChart.tsx`) sử dụng ma trận nhân tĩnh (`val * 12`), tạo ra hàng trăm đơn hàng giả, lệch hoàn toàn so với 12 đơn thực tế trong seed store.
- **Biện pháp cải tiến V6.2:**
  - Chuyển đổi `HierarchicalDataGrid` sang kiến trúc 3 cấp độ: Cấp 1 (Hero KPIs), Cấp 2 (Bảng với 4 Preset tùy chọn: `Đơn giản`, `Vận hành`, `Phân tích`, `Toàn bộ`), Cấp 3 (Drawer mở rộng cho nghiệp vụ chuyên sâu).
  - Cột mã đơn hàng và tiền tệ được gán `sticky left-0`, `whitespace-nowrap`, `tabular-nums font-mono`.
  - Tái cấu trúc `HeatmapChart.tsx`: Gom nhóm và tính toán tổng hợp trực tiếp từ mảng `mockStore.getOrders(tenantId)`. Khớp chính xác 100% (12 đơn hàng demo). Bổ sung nhãn `[DEMO-OBSERVED]` và toggle chuyển sang chế độ `[Mô phỏng cao điểm]` (`[SIMULATED TRAFFIC]`).

### 2.2. Phân hệ Quản Trị Đơn Giá Kinh Tế (Unit Economics & Pricing Intelligence)
- **Màn hình kiểm toán:** `OrderEconomicsPage.tsx`, `SkuEconomicsPage.tsx`, `ChannelEconomicsPage.tsx`, `PricingIntelligencePage.tsx`.
- **Hiện trạng trước kiểm toán:**
  - Khi người dùng lọc danh mục SKU theo nhóm `Ngôi sao (Star)`, bảng dữ liệu trả về 0 dòng và biểu đồ `ScatterBubbleChart` biến mất hoàn toàn (`return null`), gây hoang mang và lầm tưởng lỗi hệ thống.
  - Tooltip biểu đồ phân tán và waterfall có nền mờ mờ, chữ trắng trên nền xám nhạt, độ tương phản kém và bị che khuất khi di chuột ở mép đồ thị.
  - Bảng kênh bán hàng chưa thể hiện rõ bản chất Take-rate thực tế so với Take-rate danh định.
- **Biện pháp cải tiến V6.2:**
  - `ScatterBubbleChart` và `SkuEconomicsPage`: Thiết kế trạng thái rỗng chuyên biệt (`informative empty state`) giải thích tường tận công thức: *Nhóm Ngôi sao đòi hỏi CM% $\ge 30\%$ và Sản lượng bán $\ge 10$ đơn*. Trong tập seed 12 đơn hiện tại, SKU bán nhiều nhất là 3-4 đơn nên nhóm này có đúng 0 sản phẩm. Cung cấp nút `[Xem tất cả SKU trong Portfolio]` để khôi phục trong 1 click.
  - Hiển thị số lượng SKU trong từng danh mục ngay trên dropdown: `🌟 Ngôi sao (Star) (0)`, `🐄 Bò sữa (Cash Cow) (3)`, `❓ Dấu hỏi (Question Mark) (3)`, `🐕 Chó mực (Dog) (2)`.
  - Nâng cấp `ChartTooltip.tsx`: Sử dụng nền tối nguyên khối `#0F172A` (Slate-900), viền sắc nét `border-slate-700/90`, chữ trắng độ tương phản tối đa (APCA pass), định dạng tiền VND có dấu phân cách hàng nghìn.
  - Bảng `OrderEconomics` hiển thị phân rã thác nước (Waterfall: Doanh thu gộp $\rightarrow$ Doanh thu thuần $\rightarrow$ COGS $\rightarrow$ CM1 $\rightarrow$ Phí sàn & Vận hành $\rightarrow$ CM2 $\rightarrow$ Marketing $\rightarrow$ CM3) khớp 100% với báo cáo kiểm toán tài chính.

### 2.3. Phân hệ Quản Lý Kho & Tồn Kho Đa Kênh (Inventory & Fulfillment)
- **Màn hình kiểm toán:** `InventoryPage.tsx`, `InventoryAnalyticsPage.tsx`, `FulfillmentPage.tsx`.
- **Hiện trạng trước kiểm toán:**
  - Tên kho hàng dài (ví dụ: `Kho Tổng Bình Tân (HCM)` hoặc `Kho Hoàn Hàng Tân Phú`) bị bó hẹp trong cột 80px, dẫn đến việc chữ bị ngắt thành 5-7 dòng theo chiều dọc, làm vỡ chiều cao của hàng trong bảng.
  - Thẻ `Standard Inventory Invariant` sau thao tác xuất kho đôi khi không cập nhật ngay revision state, dẫn tới lệch giữa Physical KPI (978) và Invariant Card (980).
- **Biện pháp cải tiến V6.2:**
  - Đặt `min-w-[160px] whitespace-nowrap` cho toàn bộ các ô và cột liên quan đến tên kho bãi trên tất cả các màn hình kho và phân tích kho.
  - Đồng bộ hoá toàn bộ KPI kho và Invariant Card thông qua reactive subscription từ `mockStore.subscribe()`, bảo đảm mọi chỉ số Physical, Sellable, Reserved, Damaged, Pending QC đều phản ánh cùng 1 revision state sau mỗi hành động Reserve, Pick, Pack, Dispatch.

### 2.4. Phân hệ Đổi Trả & Bảo Hành (RMA & Reverse Logistics)
- **Màn hình kiểm toán:** `ReturnsPage.tsx`.
- **Hiện trạng trước kiểm toán:**
  - Thanh tiến trình RMA (Stepper) bị cố định cứng theo tab bộ lọc đang chọn, không phản ánh trạng thái thực của bản ghi RMA đang được active.
  - Khi chuyển sang tab không có dữ liệu (ví dụ tab chưa có yêu cầu), thanh Stepper vẫn hiển thị một quy trình ảo ngẫu nhiên.
  - Khách hàng không phân biệt được luồng `Returnless Refund` (Hoàn tiền không thu hồi hàng) với luồng `Standard Refund` hoặc `Exchange / Warranty`.
- **Biện pháp cải tiến V6.2:**
  - Ràng buộc trực tiếp Stepper vào bản ghi được chọn (`activeReturn`), trích xuất chính xác từ danh sách đã lọc. Nếu danh sách rỗng, hiển thị banner trạng thái rỗng thay vì hiển thị dữ liệu không liên quan.
  - Luồng `Returnless Refund` được định hình chuẩn: `Yêu cầu RMA` $\rightarrow$ `Duyệt hoàn tiền trực tiếp` $\rightarrow$ `Quyết toán / Đóng RMA`, bỏ qua hoàn toàn các bước Nhập kho (Receiving) và Kiểm định (QC).
  - Bản ghi đang được chọn được làm nổi bật với viền trái xanh đậm `border-l-4 border-brand-600 bg-brand-50/70`.

### 2.5. Trải Nghiệm Điều Hướng & Metadata Header
- **Màn hình kiểm toán:** Toàn bộ hệ thống, `SnapshotMetadataBanner.tsx`.
- **Hiện trạng trước kiểm toán:**
  - Banner Snapshot V6.2 quá cao (chiếm hơn 90px trên màn hình), chứa quá nhiều chuỗi kỹ thuật dài (`SNAPSHOT-V6.2-FINAL-DIGITAL-COMMERCE-FREEZE`, `rev: 4`, `seed: 6.2.0`), đẩy toàn bộ nội dung chính xuống dưới và gây chật chội trên màn hình laptop/tablet.
  - Nút "Factory Reset" nằm lộ thiên dễ bị người dùng bấm nhầm làm mất dữ liệu thao tác thử nghiệm.
- **Biện pháp cải tiến V6.2:**
  - Thu gọn thanh Snapshot thành dải mảnh cao 38px tinh gọn, chỉ hiển thị tên Snapshot, nhãn `[DIGITAL-COMMERCE-ONLY]` và nút xem chi tiết.
  - Toàn bộ chuỗi kỹ thuật dài được ẩn vào Popover tương tác "Chi tiết kỹ thuật" (Hiển thị Snapshot ID, State Revision, Seed Version, Scope, và Audit Status).
  - Nút "Factory Reset" được tích hợp Modal xác nhận 2 bước để loại trừ rủi ro thao tác nhầm.

---

## 3. ĐÁNH GIÁ ĐỘ TƯƠNG THÍCH ĐA THIẾT BỊ (RESPONSIVE VIEWPORTS)

| Thiết bị | Viewport | Đánh giá hiện trạng | Giải pháp V6.2 đã áp dụng | Kết quả |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile Extra Small** | 360 x 640 | Header dính (sticky) đè lên tiêu đề trang, bảng tràn ngang làm xuất hiện thanh cuộn toàn trang (body scroll). | Đặt `padding-top` an toàn, chuyển đổi `HierarchicalDataGrid` sang dạng Thẻ thông tin (Card View) trên màn hình dưới 640px, ẩn thanh cuộn body. | **PASS (100% vừa khít màn hình)** |
| **Mobile Standard** | 390 x 844 | Tiêu đề các trang phân tích dài bị cắt xén, các nút thao tác bị dồn cục. | Flex-wrap linh hoạt cho header, font tiêu đề tự co dãn `text-lg sm:text-xl font-black`, các nút hành động tách hàng hợp lý. | **PASS** |
| **Tablet Portrait** | 768 x 1024 | Lưới KPI 4 cột bị co rúm, số liệu tiền tệ VND bị rớt dòng đơn vị `₫`. | Thiết lập grid thông minh `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, đơn vị tiền tệ gán `whitespace-nowrap tabular-nums`. | **PASS** |
| **Desktop HD** | 1280 x 800 | Thanh bên (Sidebar) chiếm diện tích khiến bảng dữ liệu bị che cột cuối. | Cho phép thu gọn Sidebar (Collapsible), áp dụng Preset cột mặc định `[Vận hành]` chỉ 6-8 cột quan trọng nhất. | **PASS** |
| **Desktop Full HD** | 1440 x 900 | Bố cục tối ưu, trực quan cao cấp, không gian rộng thoáng. | Tận dụng độ phân giải tối ưu cho Waterfall Chart, Heatmap, và Portfolio Matrix. | **PASS (Visual Chuẩn)** |
| **Desktop QHD / 4K** | 1920 x 1080 | Nội dung bị dàn trải quá rộng, khoảng cách mắt nhìn giữa các cột quá xa. | Thiết lập khung bao chuẩn `max-w-7xl mx-auto`, căn giữa hài hòa. | **PASS** |

---

## 4. KẾT LUẬN VÀ KHUYẾN NGHỊ KIỂM TOÁN

Toàn bộ 5 phân hệ cốt lõi và 6 khung nhìn thiết bị đã được rà soát và khắc phục triệt để. Hệ thống NexusOMS V6.2 đạt sự cân bằng tối ưu giữa **Mật độ thông tin cao của Hệ thống Điều hành Doanh nghiệp (Enterprise OS)** và **Độ rõ ràng, tinh tế của Giao diện Người dùng Hiện đại (Consumer-grade SaaS)**.
