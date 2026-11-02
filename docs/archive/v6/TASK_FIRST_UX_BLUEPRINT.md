# NEXUSOMS V6.3 — BẢN THIẾT KẾ TRẢI NGHIỆM NGƯỜI DÙNG ƯU TIÊN TÁC VỤ (TASK-FIRST UX BLUEPRINT)

**Hệ thống:** NexusOMS — Digital Commerce Operating System  
**Phiên bản:** V6.3 Final  
**Triết lý kiến trúc:** TASK FIRST → CONTEXT SECOND → DETAILS ON DEMAND  

---

## 1. BỐI CẢNH VÀ NGUYÊN TẮC THIẾT KẾ

Người dùng của NexusOMS bao gồm:
1. **Chủ doanh nghiệp (Business Owner):** Cần nhìn thấy ngay sức khỏe dòng tiền, rủi ro tồn kho và lãi đóng góp sau quảng cáo (CM3).
2. **Quản lý vận hành (Operations / OMS Manager):** Cần biết ngay có bao nhiêu đơn hàng mới cần khóa tồn, bao nhiêu đơn bị nghẽn ở khâu đóng gói hoặc giao hàng.
3. **Thủ kho (Warehouse / WMS Staff):** Cần xử lý ngay các kiện hàng đang chờ nghiệm thu QC tại dock hoặc cách ly hàng hư hỏng.
4. **Kế toán đối soát (Finance Specialist):** Cần phê duyệt các phiếu hoàn tiền đổi trả (Maker/Checker) và đối soát doanh thu Có 511 khi có biên bản POD.

Mỗi nhóm người dùng đều không có thời gian để đọc toàn bộ hàng chục cột số liệu. Bản thiết kế Task-First đảm bảo khi người dùng mở bất kỳ trang nào, họ trả lời được ngay 4 câu hỏi:
- **Tôi đang ở đâu?** (Header ngắn gọn, định danh phân hệ rõ ràng).
- **Tôi cần chú ý điều gì?** (Hero KPIs & Cảnh báo rủi ro).
- **Tôi phải làm gì trước?** (Action Center với các nút hành động 1-click).
- **Tôi xem sâu hơn bằng cách nào?** (Góc nhìn Presets của Data Grid & Drawer chi tiết khi cần).

---

## 2. QUY CHUẨN 4 TẦNG THIẾT KẾ TRANG (THE 4-LEVEL STANDARD PAGE BLUEPRINT)

### LEVEL 1 — SIMPLE SUMMARY (TỔNG QUAN TINH GỌN)
- **Cấu trúc:**
  - Tiêu đề màn hình chuẩn `H1` (20px-24px, Font Black, tracking-tight).
  - Phụ đề 1 dòng giải thích ngắn gọn mục đích phân hệ.
  - Tối đa 1 Primary CTA chính (ví dụ: `+ Tạo Đơn Hàng Mới` hoặc `Mô Phỏng Định Giá`).
  - Lưới 2-4 thẻ Hero KPI chọn lọc, chỉ hiển thị số liệu thực sự cần thiết cho việc ra quyết định tại phân hệ đó.
- **Tiêu chuẩn dữ liệu:**
  - Mọi con số tài chính áp dụng `whitespace-nowrap tabular-nums font-mono`.
  - Có nhãn định danh nguồn dữ liệu minh bạch (`[SIMULATED]`, `[DEMO-OBSERVED]`, `[ESTIMATED]`).

---

### LEVEL 2 — ACTION CENTER (TRUNG TÂM TÁC VỤ ƯU TIÊN)
- **Vị trí:** Nằm ngay bên dưới Hero KPIs và ngay trên bảng dữ liệu Workspace.
- **Cấu trúc một khối Action Center:**
  - Header thanh tác vụ: Chấm trạng thái động (Pulse indicator), tiêu đề `Trung Tâm Tác Vụ Cần Xử Lý`, đếm tổng số việc cần làm.
  - Lưới 3 thẻ tác vụ ưu tiên theo trình tự thời gian và luồng nghiệp vụ.
- **Mỗi thẻ tác vụ bao gồm:**
  1. *Tiêu đề tác vụ:* Đánh số thứ tự luồng (1, 2, 3) kèm huy hiệu số lượng bản ghi thực tế.
  2. *Lý do & Tác động:* 1-2 câu giải thích ngắn gọn vì sao cần xử lý (ví dụ: Khóa tồn để ngăn overselling; Nghiệm thu QC để mở bán Sellable).
  3. *Nút hành động (CTA):* Nút bấm có icon điều hướng trực tiếp: mở Drawer chi tiết của bản ghi cần xử lý hoặc mở Modal thao tác tương ứng.

---

### LEVEL 3 — CLEAN DATA WORKSPACE (BẢNG LÀM VIỆC SẠCH)
- **Mặc định:** Chỉ hiển thị từ 4 đến 7 trường thông tin quan trọng nhất.
- **Cơ chế 4 Presets góc nhìn:**
  - `[Đơn giản]`: Chỉ mã đơn/SKU, tên khách, tổng tiền, trạng thái.
  - `[Vận hành]`: Mã đơn, kho xuất, phương thức vận chuyển, mã vận đơn, tiến độ đóng gói.
  - `[Phân tích]`: Doanh thu thuần, COGS, CM1, Phí sàn, CM2, Ads, CM3%.
  - `[Toàn bộ]`: Bật tất cả các cột cho mục đích kiểm toán.
- **Tính năng bền vững:** Tự động lưu cấu hình góc nhìn vào `localStorage` theo từng trang (`storageKey`).
- **Quy chuẩn hiển thị:**
  - Cột mã định danh cố định bên trái (`sticky left-0 bg-white`).
  - Tên kho hàng và trạng thái có `min-w-[150px] whitespace-nowrap`, không ngắt dòng 5-7 tầng dọc.

---

### LEVEL 4 — DETAIL ON DEMAND (CHI TIẾT THEO YÊU CẦU)
- **Phương thức kích hoạt:** Nhấp vào dòng hoặc bấm icon mở rộng.
- **Cấu trúc Drawer / Expanded View:**
  - *Tab Tổng quan & Vòng đời:* Workflow Step Visualizer thể hiện rõ bước hiện tại, ai thực hiện, bước tiếp theo.
  - *Tab Danh sách dòng sản phẩm:* SKU, phân loại màu/size, đơn giá, kho xuất.
  - *Tab Phân rã thác nước P&L:* Chi tiết cấu thành từng loại chi phí (Doanh thu gộp $\rightarrow$ Voucher $\rightarrow$ COGS $\rightarrow$ Phí sàn $\rightarrow$ Đóng gói kho $\rightarrow$ Chiết khấu $\rightarrow$ Ads $\rightarrow$ CM3).
  - *Tác vụ tác nghiệp chuyên sâu:* Giữ tồn, Xuất kho, Nghiệm thu QC, Duyệt chi hoàn tiền, Xác nhận biên bản POD. Mọi thao tác nguy hiểm đều có modal xác nhận 2 bước.

---

## 3. THIẾT KẾ ĐÁP ỨNG THIẾT BỊ DI ĐỘNG (RESPONSIVE BLUEPRINT)

- **Mobile 360px & 390px:**
  - Header dính (Sticky Topbar) đặt thanh tìm kiếm trong normal flow, bảo đảm chiều cao tự nhiên, không che khuất `H1`.
  - Tiêu đề `H1` luôn cách đáy header một khoảng đệm an toàn `gap = 16px` ngay từ khi tải trang (`scrollY = 0`).
  - Bảng dữ liệu tự động chuyển đổi sang dạng Thẻ thông tin di động (Card View), hiển thị đầy đủ: Mã đơn, Khách hàng, Trạng thái, Số tiền và Nút xem chi tiết.
  - Tuyệt đối không xuất hiện thanh cuộn ngang toàn trang (`hasHorizontalOverflow: false`).

---

## 4. KẾT LUẬN

Bản thiết kế này là kim chỉ nam đảm bảo tính nhất quán trên toàn bộ 41 màn hình của NexusOMS V6.3, giúp sản phẩm đạt chuẩn một phần mềm SaaS thương mại điện tử chuyên nghiệp cấp quốc tế.
