# BÁO CÁO NGHIÊN CỨU THIẾT KẾ THAM CHIẾU (VISUAL REFERENCE STUDY)

**Dự án:** Hệ Thống Quản Trị Đơn Hàng & Kho Vận Đa Kênh NexusOMS (Phiên bản V6.2 Digital Commerce Only)  
**Nhánh Git:** `feature/nexusoms-v6-digital-commerce-only`  
**Mục tiêu:** Khảo sát các hệ thống thiết kế và sản phẩm SaaS hàng đầu thế giới (Linear, Plane, Metabase, Ant Design Table, Shopify Polaris IndexTable) để rút ra các nguyên tắc cốt lõi về phân tầng thông tin, mật độ dữ liệu, trực quan hóa trạng thái và khả năng tiếp cận (Accessibility), áp dụng chuẩn xác vào NexusOMS Design System (Deep Ocean, Teal, Jade, White, Silver).

---

## 1. PHÂN TÍCH CHI TIẾT 5 NGUỒN THAM CHIẾU

### 1.1. Reference A — Linear: Trải Nghiệm Điều Hành Tinh Gọn & Tốc Độ
* **Nguồn tham khảo:** *How we redesigned the Linear UI* (Linear Design Reset, Karri Saarinen & Team).
* **Nguyên tắc cốt lõi:**
  1. **Giảm thiểu nhiễu thị giác (Reducing Visual Noise):** Loại bỏ các đường viền (borders) thừa, các mảng màu nền tương phản quá gắt hoặc quá nhiều khối hộp độc lập. Giao diện phẳng nhưng có chiều sâu nhờ phân cấp font chữ và khoảng cách (whitespace).
  2. **Mật độ thông tin tối ưu (Row Density):** Chiều cao hàng bảng (table rows) được chuẩn hóa ($44\text{px} - 48\text{px}$), đủ thoáng để quét nhanh bằng mắt mà không lãng phí diện tích màn hình.
  3. **Tách biệt Danh sách / Chi tiết (List/Detail Split View):** Màn hình chính chỉ hiển thị các thuộc tính định danh (ID, tiêu đề, trạng thái, người phụ trách, ngày cập nhật). Mọi thông tin mở rộng được đưa vào Side Panel hoặc Drawer mở nhanh.
  4. **Thao tác theo ngữ cảnh (Contextual Actions):** Không nhồi nhét hàng loạt nút bấm chức năng vào từng ô dữ liệu; các hành động phụ xuất hiện khi hover hoặc nằm gọn trong menu 3 chấm.
* **Phạm vi áp dụng cho NexusOMS:** Màn hình Quản lý Đơn hàng (Orders), Đơn mua hàng PO (Purchase Orders), Khách hàng (Customers) và Đổi trả (RMA).

### 1.2. Reference B — Plane: Bảng Điều Khiển Chi Tiết Bản Ghi Phức Tạp (Detail Side-Peek Panel)
* **Nguồn tham khảo:** *Plane Core Concepts & Work Items Overview* (Plane.so Documentation).
* **Nguyên tắc cốt lõi:**
  1. **Side-Peek Drawer (Bảng trượt chi tiết cạnh phải):** Khi nhấp chuột vào một bản ghi, một ngăn kéo cạnh phải mở ra mượt mà, cho phép người dùng kiểm tra thông tin chuyên sâu mà không làm mất ngữ cảnh bảng danh sách hiện tại.
  2. **Thuộc tính nhóm (Grouped Properties Sidebar):** Các thuộc tính trạng thái, độ ưu tiên, người phê duyệt, hạn mức tài chính được nhóm lại ngăn nắp ở cột phụ của ngăn kéo.
  3. **Dòng thời gian hoạt động & Lịch sử vết (Activity History & Audit Trail):** Hiển thị trực quan từng bước thay đổi trạng thái (ai làm, vào lúc nào, lý do gì), đặc biệt phù hợp cho kiểm toán tài chính.
* **Phạm vi áp dụng cho NexusOMS:** Chi tiết Đơn hàng (Order Drawer), Chi tiết SKU Tồn kho (Inventory Drawer), Phiếu kiểm định RMA và Kiểm duyệt Maker/Checker.

### 1.3. Reference C — Metabase: Trực Quan Hóa Dữ Liệu & Phân Tích Kinh Doanh
* **Nguồn tham khảo:** *Metabase Analytics & BI Design Patterns* (Metabase.com).
* **Nguyên tắc cốt lõi:**
  1. **Thẻ KPI đồng nhất (Consistent KPI Context):** Mỗi chỉ số chính (Revenue, Volume, Margin) có định dạng rõ ràng, con số lớn, chỉ báo biến động ($\Delta\%$) kèm chú giải chu kỳ so sánh cụ thể.
  2. **Tooltip biểu đồ tương phản cao (High-Contrast Solid Tooltips):** Nền tooltip luôn là màu tối đặc ($#0F172A$), không trong suốt nhạt nhòa, hiển thị tên chuỗi, màu nhận diện, đơn vị đo chuẩn xác và số tiền VND định dạng đầy đủ.
  3. **Khoan sâu từ biểu đồ sang dữ liệu nguồn (Chart Drill-Down):** Khi nhấp vào một cột, bong bóng hoặc thanh dữ liệu, hệ thống tự động lọc danh sách bản ghi nguồn tương ứng bên dưới.
  4. **Tính minh bạch nguồn dữ liệu (Data Provenance):** Phân biệt rạch ròi giữa số liệu thực tế quan sát được (Observed), số liệu ước tính (Estimated) và số liệu mô phỏng kịch bản (Simulated).
* **Phạm vi áp dụng cho NexusOMS:** Executive Dashboard, Sales Analytics, Marketing Analytics, Inventory Analytics, SKU Economics và Channel Economics.

### 1.4. Reference D — Ant Design Table: Cấu Trúc Bảng Dữ Liệu Doanh Nghiệp Phân Cấp
* **Nguồn tham khảo:** *Ant Design Table Component Architecture* (Antgroup Table Specs).
* **Nguyên tắc cốt lõi:**
  1. **Tiêu đề cột nhóm (Grouped Column Headers):** Cho phép nhóm 2 tầng logic (ví dụ: Thông tin đơn $\rightarrow$ Tài chính $\rightarrow$ Biên lợi nhuận CM $\rightarrow$ Vận hành POD).
  2. **Cố định cột định danh (Fixed / Sticky Key Column):** Cố định mã đơn / mã SKU ở mép trái với đường bóng phân cách (drop shadow) khi cuộn ngang, giúp người dùng không bao giờ mất dấu bản ghi đang xem.
  3. **Quản lý ẩn/hiện cột (Column Visibility & Presets):** Cho phép người dùng chuyển nhanh giữa các preset góc nhìn: `Đơn giản`, `Vận hành`, `Phân tích`, `Toàn bộ`, đồng thời ghi nhớ cấu hình vào `localStorage`.
  4. **Số liệu căn phải & Không ngắt dòng bừa bãi:** Toàn bộ cột tiền tệ, tỷ lệ $\%$ và số lượng căn lề phải, áp dụng font `tabular-nums` và thuộc tính `white-space: nowrap`.
* **Phạm vi áp dụng cho NexusOMS:** Thành phần lõi `HierarchicalDataGrid.tsx` và các bảng dữ liệu vận hành đa thuộc tính.

### 1.5. Reference E — Shopify Polaris IndexTable: Chuẩn Mực Quản Trị Thương Mại Điện Tử
* **Nguồn tham khảo:** *Shopify Polaris IndexTable Guidelines & Density Standards*.
* **Nguyên tắc cốt lõi:**
  1. **Mật độ thông tin chuẩn thương mại (Commerce Operational Density):** Giới hạn từ 4 đến 7 cột mặc định trên bảng chính để tránh mỏi mắt và bấm nhầm.
  2. **Huy hiệu trạng thái ngữ nghĩa rõ ràng (Semantic Status Badges):** Trạng thái thanh toán, giao hàng POD và kho vận được mã hóa màu chuẩn mực (Xanh lá: Đã ký POD / Thành công; Vàng: Đang xử lý; Xanh dương: Đang vận chuyển; Đỏ: Hủy / Thất bại).
  3. **Bố cục thẻ thay thế trên Mobile (Responsive Card Fallback):** Trên màn hình nhỏ ($< 768\text{px}$), không cố nhồi bảng desktop cuộn ngang phức tạp mà tự động chuyển sang thẻ đơn hàng có accordion mở rộng chi tiết.
* **Phạm vi áp dụng cho NexusOMS:** Bảng Đơn hàng, Tồn kho đa kho, Đổi trả RMA và giao diện Mobile/Tablet.

---

## 2. MA TRẬN ĐỐI CHIẾU KHUYẾT TẬT UX & ĐỀ XUẤT CẢI TIẾN

| Giao diện NexusOMS hiện tại | Khuyết tật UX phát hiện | Nguyên tắc tham chiếu áp dụng | Đề xuất cải tiến kỹ thuật | Tiêu chí nghiệm thu (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **Bảng Đơn hàng (OrdersPage)** | Bảng có tới 13 cột nhỏ dày đặc, số liệu tài chính và biến phí nhồi chung với cột vận hành khiến người dùng hoa mắt như bảng tính Excel thô sơ. | **Polaris IndexTable & Linear:** Giới hạn 4–7 cột mặc định, ưu tiên thông tin quyết định nhanh; phân tầng nhóm cột theo Ant Design Table. | Đặt preset mặc định `Đơn giản` ẩn nhóm Unit Economics; hiển thị 7 cột nghiệp vụ cốt lõi. Bổ sung bộ chuyển preset `Đơn giản`, `Vận hành`, `Phân tích`, `Toàn bộ` và lưu vào `localStorage`. | Mặc định bảng chỉ có 7 cột chính; không cuộn ngang tràn lan; người dùng chuyển preset hoặc bật nhóm cột trong 1 click; cấu hình lưu giữ sau khi refresh. |
| **SKU Portfolio Matrix (SkuEconomicsPage)** | Khi chọn bộ lọc `Star`, bảng có 0 bản ghi và bong bóng biểu đồ biến mất hoàn toàn (trả về `null`), tạo cảm giác hệ thống bị lỗi hoặc dữ liệu bị hỏng. | **Metabase & Polaris:** Luôn hiển thị trạng thái rỗng có giải thích nguyên nhân rõ ràng và cung cấp lối thoát (action button); đồng bộ số lượng từng nhóm trên bộ lọc. | Thêm số lượng SKU vào từng option trong dropdown: `Star (0)`, `Cash Cow (5)`... Khi nhóm có 0 SKU, biểu đồ và bảng hiển thị Empty State giải thích công thức (CM $\ge 30\%$, Sản lượng $\ge 10$) kèm nút `[Xem tất cả SKU]`. | Chọn `Star` không gây trắng màn hình; hiển thị thông điệp giải thích toán học minh bạch; bấm nút xem tất cả đưa bảng về trạng thái toàn bộ. |
| **Tooltip Biểu đồ (All Charts)** | Tooltip nền trong suốt mờ mờ (`backdrop-blur`), chữ trắng trên nền sáng hoặc chữ xám mờ (`text-ink-400`), khó đọc trong điều kiện ánh sáng mạnh hoặc bị cắt ngoài viewport. | **Metabase Solid Tooltips:** Nền tối đặc ($#0F172A$), viền tương phản cao, định dạng tiền tệ VND đồng nhất, chú giải chấm tròn màu tương ứng. | Chuẩn hóa `CustomChartTooltip` với nền đặc `bg-slate-900 border-slate-700`, chữ trắng đậm, tiền tệ `font-mono tabular-nums`, vị trí tự động điều chỉnh tránh tràn mép màn hình. | 100% biểu đồ (Line, Bar, Pareto, Bubble, Waterfall) có tooltip đọc rõ ràng trong 5 giây, chữ và số tiền sắc nét, không bị clipping. |
| **Bản đồ nhiệt (HeatmapChart)** | Bảng Sales Density Heatmap hiển thị số đơn hàng lặp lại (36 đơn, 48 đơn...) dựa trên ma trận tĩnh hardcode, trong khi toàn bộ dữ liệu mock chỉ có 12 đơn hàng. | **Metabase Data Trust:** Nghiêm cấm tạo số liệu giả mạo; phân biệt rạch ròi giữa số liệu thực tế quan sát được và kịch bản mô phỏng. | Tái cấu trúc `HeatmapChart` để tổng hợp trực tiếp từ danh sách đơn hàng thực tế theo thứ trong tuần và khung giờ; tổng các ô bằng đúng 12 đơn; thêm nhãn `[DEMO-OBSERVED]`; bổ sung tab kịch bản mô phỏng lưu lượng cao có cờ `[SIMULATED]`. | Tổng số đơn trên Heatmap khớp 100% với tập đơn hàng thực tế; có tooltip chi tiết từng ô; không đánh lừa người dùng bằng số liệu giả. |
| **Tiến trình RMA (ReturnsPage)** | Workflow Stepper ở đầu trang chỉ thay đổi theo tab lọc mà không gắn liền với bản ghi RMA cụ thể đang được chọn; người dùng không rõ phiếu nào đang ở bước nào. | **Plane Status Workflow & Activity:** Stepper phải gắn trực tiếp với bản ghi thực tế được chọn (selected record), phản ánh chính xác nhánh và tiến độ của phiếu đó. | Gắn Stepper với `selectedRmaId` (hoặc bản ghi đầu tiên trong danh sách lọc); hiển thị rõ mã RMA, tên nhánh và trạng thái của phiếu đó; khi click vào bất kỳ dòng nào trong bảng, Stepper cập nhật theo phiếu đó. | Khi chọn phiếu Returnless Refund, Stepper chỉ hiện 4 bước bỏ qua QC; khi chọn phiếu Exchange, Stepper hiện quy trình đổi hàng mới; không có bước giả định. |
| **Giao diện Di động (Mobile 390px)** | Tiêu đề trang (Heading) bị thanh sticky header che khuất mép trên; bảng dữ liệu desktop bị ép nhỏ hoặc gây tràn viền ngang toàn trang (`body overflow`). | **Polaris Mobile-first & Linear:** Heading luôn hiển thị từ ký tự đầu tiên; bảng phức tạp chuyển sang Card Layout thân thiện một tay; không dùng `overflow-x: hidden` để che lỗi. | Căn chỉnh `padding-top` và z-index của container chính; sử dụng `ResponsiveDataCards` cho Orders, Inventory và RMA trên màn hình $< 768\text{px}$; loại bỏ hoàn toàn các phần tử gây tràn ngang body. | `document.documentElement.scrollWidth <= window.innerWidth` đạt 100%; tiêu đề hiển thị trọn vẹn; thao tác vuốt chạm một tay dễ dàng. |

---

## 3. KẾT LUẬN & ĐỊNH HƯỚNG TRIỂN KHAI

Bản nghiên cứu thiết kế tham chiếu này là kim chỉ nam cho toàn bộ quá trình tinh chỉnh UX trong NexusOMS V6.2. Mọi thay đổi về giao diện đều tuân thủ triệt để nguyên lý:

$$\textbf{VISUAL CLARITY} \longrightarrow \textbf{INFORMATION HIERARCHY} \longrightarrow \textbf{PROGRESSIVE DISCLOSURE} \longrightarrow \textbf{BUSINESS ACTION} \longrightarrow \textbf{DATA TRUST}$$

Không sao chép hình ảnh của bên thứ ba, giữ vững bản sắc **Ocean Premium Design System** của NexusOMS, đồng thời nâng tầm chất lượng trải nghiệm lên tiêu chuẩn quốc tế của một nền tảng Digital Commerce Operating System chuyên nghiệp.
