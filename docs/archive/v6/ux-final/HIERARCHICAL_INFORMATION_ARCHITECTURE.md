# NEXUSOMS V6.2 — KIẾN TRÚC THÔNG TIN PHÂN CẤP 3 TẦNG (3-LEVEL INFORMATION ARCHITECTURE)

**Phân hệ:** Hệ thống Điều hành Đa Kênh NexusOMS (Digital Commerce Operating System)  
**Phiên bản:** V6.2 Final  
**Nguyên tắc cốt lõi:** Loại bỏ bảng tính phẳng hỗn loạn (Anti-Spreadsheet Chaos), phân tách rành mạch nhận thức theo 3 tầng thông tin.  

---

## 1. BỐI CẢNH VÀ TRIẾT LÝ THIẾT KẾ

Trong các hệ thống quản trị thương mại điện tử đa kênh trước đây, giao diện thường mắc bẫy "Bảng tính nhồi nhét" (Spreadsheet bloat):
- Hàng chục cột từ thông tin cơ bản, đóng gói, xuất kho, giá vốn, phí sàn, biên lợi nhuận CM1, CM2, CM3 bị đổ dồn vào một bảng phẳng duy nhất.
- Người dùng bị kiệt sức nhận thức (Cognitive Fatigue), mất trung bình 15-20 giây mới định vị được thông tin cần thiết.
- Thao tác nghiệp vụ cốt lõi (Reserve kho, In phiếu nhặt hàng, Dispatch, Hoàn tiền) bị chìm lấp giữa ma trận số liệu tài chính.

### Triết lý 3 tầng thông tin V6.2:
```
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: HERO SUMMARY KPIS (Đọc hiểu trong 5 giây)                     │
│ [Tổng Doanh Thu]   [Sản Lượng Đơn]   [AOV]   [Biên CM3 Quản Trị]       │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│ LEVEL 2: CONTEXTUAL GROUPED GRID (Tập trung & Tránh xao nhãng)         │
│ Presets: [Đơn giản]  [★ Vận hành]  [Phân tích]  [Toàn bộ]               │
│ Sticky ID • Status Badges • Clean Alignments • Tabular Numbers         │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│ LEVEL 3: EXPANDABLE ROW / DETAIL DRAWER (Nghiệp vụ sâu & Quyết định)   │
│ Order Line Items • Stepper Tiến Trình • P&L Waterfall • Domain Action  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CHI TIẾT TRIỂN KHAI TỪNG TẦNG KIẾN TRÚC

### TẦNG 1: HERO SUMMARY KPIS (Executive Glance)
- **Mục tiêu:** Cung cấp bức tranh toàn cảnh sức khỏe tài chính & vận hành trong 5 giây đầu tiên khi mở trang.
- **Quy chuẩn hiển thị:**
  - Lưới 4 thẻ KPI đồng nhất (`KPICard.tsx`) hiển thị chỉ số quan trọng nhất của phân hệ.
  - Phân tầng thị giác rõ ràng: Tiêu đề phụ (11px Uppercase Slate-500) $\rightarrow$ Con số chính (24px Bold Slate-900 `tabular-nums`) $\rightarrow$ Tỷ lệ tăng trưởng Delta so với kỳ trước kèm mũi tên chỉ hướng (Xanh/Đỏ).
  - Đi kèm huy hiệu định danh nguồn dữ liệu minh bạch (`[SIMULATED PROTOTYPE]`, `[DEMO-OBSERVED]`, `[ESTIMATED]`).
- **Áp dụng tiêu biểu:**
  - *Orders / Sales:* Doanh thu thuần, Đơn thành công, AOV, Tốc độ chốt đơn/ngày.
  - *Inventory:* Tồn vật lý (Physical), Sẵn sàng bán (Sellable), Dự trữ (Reserved), Giá trị vốn kho (Inventory Value).
  - *Unit Economics:* Doanh thu nhận diện (Recognized Revenue), Biên CM1, Biên CM2, Biên CM3.

---

### TẦNG 2: BẢNG DỮ LIỆU PHÂN NHÓM THEO NGỮ CẢNH (Hierarchical Data Grid)
- **Mục tiêu:** Giảm 60% số cột hiển thị đồng thời mà vẫn đáp ứng đa dạng vai trò người dùng (Nhân viên kho vs Kế toán vs Giám đốc kinh doanh).
- **Cơ chế Presets ngữ cảnh (One-click View Switching):**
  1. **Preset [Đơn giản]:** Chỉ hiển thị các cột định danh bắt buộc (`Mã đơn`, `Kênh bán`, `Thời gian`, `Khách hàng`, `Tổng tiền`, `Trạng thái`). Phục vụ tra cứu nhanh.
  2. **Preset [Vận hành] (Mặc định cho OMS/WMS):** Bổ sung các cột điều phối kho (`Kho xuất`, `Phương thức vận chuyển`, `Mã vận đơn`, `Trọng lượng`, `Tiến độ đóng gói`). Ẩn hoàn toàn các cột chi phí tài chính phức tạp.
  3. **Preset [Phân tích] (Dành cho Finance & Owner):** Tập trung vào cấu trúc đơn giá kinh tế (`Doanh thu thuần`, `Giá vốn COGS`, `Biên CM1`, `Phí sàn Marketplace`, `Biên CM2`, `Phí Marketing/Ad`, `Biên CM3%`).
  4. **Preset [Toàn bộ]:** Bật tất cả các nhóm cột dành cho tác vụ kiểm toán đối soát toàn diện.
- **Tính năng Ghi nhớ Trạng thái (LocalStorage Persistence):**
  - Mọi thao tác chọn Preset hoặc bật/tắt nhóm cột tùy chỉnh đều được lưu tức thì vào `localStorage` theo `storageKey` của từng trang (`orders_grid_groups_v1`, `sku_economics_grid_groups_v1`, v.v.). Khi người dùng F5 hoặc quay lại trang, giao diện giữ nguyên tùy biến cá nhân.
- **Quy tắc hiển thị vi mô (Micro-typography & Ergonomics):**
  - Cột mã định danh (Mã đơn, SKU, Mã RMA) luôn cố định bên trái (`sticky left-0 bg-white shadow-r`).
  - Toàn bộ số tiền và tỷ lệ phần trăm được căn phải (`text-right font-mono tabular-nums whitespace-nowrap`).
  - Tên kho và nhãn trạng thái có độ rộng tối thiểu cố định (`min-w-[150px] whitespace-nowrap`), triệt tiêu hoàn toàn hiện tượng ngắt dòng 5-7 hàng làm vỡ bảng.

---

### TẦNG 3: DÒNG MỞ RỘNG VÀ DRAWER CHI TIẾT (Domain Execution Layer)
- **Mục tiêu:** Tách biệt rạch ròi giữa thao tác CRUD cơ bản và các Nghiệp vụ Tác nghiệp Chuyên sâu (Domain Business Operations).
- **Nội dung hiển thị khi mở rộng dòng (Inline Expansion):**
  1. **Thanh tiến trình nghiệp vụ thích ứng (Adaptive Workflow Stepper):** Hiển thị trực quan trạng thái vòng đời của thực thể (Ví dụ: Order Lifecycle `Tạo đơn` $\rightarrow$ `Dự trữ kho` $\rightarrow$ `Nhặt hàng` $\rightarrow$ `Đóng gói` $\rightarrow$ `Xuất kho` $\rightarrow$ `Giao thành công`).
  2. **Danh sách dòng sản phẩm chi tiết (Line Items):** SKU, hình ảnh, phân loại màu/size, số lượng, đơn giá, mã kho xuất.
  3. **Bảng phân rã thác nước P&L thu nhỏ (Mini P&L Waterfall):** Hiển thị chi tiết từng chi phí cấu thành CM1, CM2, CM3 của riêng đơn hàng/SKU đó.
- **Hành động nghiệp vụ đặc thù (Domain Actions vs Generic CRUD):**
  - Không dừng lại ở "Sửa / Xóa", NexusOMS cung cấp các nút kích hoạt nghiệp vụ có kiểm soát Invariant:
    - `[Giữ tồn (Reserve Stock)]`: Chuyển tồn Sellable sang Reserved.
    - `[Xuất kho (Dispatch)]`: Giảm Physical, xóa Reserved, ghi nhận giá vốn xuất kho và giảm giá trị tồn kho.
    - `[Duyệt bồi hoàn (Approve Refund)]`: Maker/Checker phê duyệt hoàn tiền theo chính sách.
    - `[Xác nhận POD]`: Ghi nhận Doanh thu kế toán (Recognized Revenue) đối với đơn hàng Cash-on-Delivery.

---

## 3. ĐỐI SOÁNH TRƯỚC VÀ SAU KHI TÁI CẤU TRÚC KIẾN TRÚC

| Tiêu chí | Trước khi tái cấu trúc (V6.1) | Sau khi tái cấu trúc (V6.2 Final) |
| :--- | :--- | :--- |
| **Số cột hiển thị mặc định** | 16-18 cột tràn ngang toàn màn hình. | 6-8 cột tinh gọn theo từng Preset chuyên biệt. |
| **Thời gian định vị thông tin** | 15 - 20 giây (phải cuộn ngang và tìm kiếm thủ công). | 3 - 5 giây (nhìn lướt qua Hero KPI và Preset phù hợp). |
| **Ghi nhớ cấu hình cột** | Mất sạch mỗi khi chuyển trang hoặc tải lại trình duyệt. | Lưu tự động và bền vững trong `localStorage`. |
| **Phân định nghiệp vụ** | Nút CRUD chung chung, không rõ ràng về mặt vận hành kho. | Phân định rạch ròi giữa CRUD và Tác vụ Vận hành Kho/Tài chính. |
| **Trải nghiệm trên màn hình nhỏ** | Vỡ layout, chữ rớt dòng 5-7 tầng dọc. | Tự động thích ứng sang dạng Card View hoặc cuộn ngang độc lập. |
