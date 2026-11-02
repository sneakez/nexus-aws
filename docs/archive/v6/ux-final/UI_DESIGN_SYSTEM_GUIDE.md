# NEXUSOMS V6.2 — HƯỚNG DẪN HỆ THỐNG THIẾT KẾ GIAO DIỆN (UI DESIGN SYSTEM GUIDE)

**Hệ thống thiết kế:** NexusOMS Ocean Premium Design System  
**Phiên bản:** V6.2 (Digital Commerce Only)  
**Tiêu chuẩn chất lượng:** Tương phản WCAG AA & APCA, Typography có phân cấp, Căn chỉnh số liệu chuẩn ngân hàng (Tabular Numbers).  

---

## 1. BẢNG MÀU THƯƠNG HIỆU VÀ MÀU NGỮ NGHĨA (COLOR PALETTE)

NexusOMS sử dụng bảng màu **Ocean Premium**: Sang trọng, điềm tĩnh, chuyên nghiệp dành cho hệ thống điều hành thương mại và tài chính cấp doanh nghiệp.

### 1.1. Bảng màu chủ đạo (Primary & Base Tokens)
- **Deep Slate / Ink (Nền tối & Chữ chính):**
  - `slate-950` (`#020617`): Nền tooltip, banner hệ thống, header tương phản cao.
  - `slate-900` (`#0F172A`): Nền thẻ tooltip biểu đồ nguyên khối (`ChartTooltip.tsx`), popover metadata.
  - `slate-800` (`#1E293B`): Viền thẻ, đường phân cách tối.
  - `ink-900` (`#0F172A`): Màu chữ tiêu đề cấp 1 (H1, H2), số liệu Hero KPI.
  - `ink-700` (`#334155`): Màu chữ nội dung chính trong bảng và thẻ.
  - `ink-500` (`#64748B`): Màu phụ chú, nhãn trường, placeholder.
  - `ink-100` / `ink-200` (`#F1F5F9` / `#E2E8F0`): Màu đường viền bảng, đường kẻ phân chia card.
  - `ink-50` (`#F8FAFC`): Nền trang, nền xen kẽ hàng chẵn/lẻ (zebra stripes).

### 1.2. Màu sắc Thương hiệu (Brand Accent)
- **Ocean Teal / Jade (Điểm nhấn nhận diện & Tăng trưởng):**
  - `brand-600` (`#0284C7`): Nút hành động chính (Primary Action), viền active item.
  - `brand-700` (`#0369A1`): Trạng thái hover của nút.
  - `brand-50` (`#F0F9FF`): Nền highlight dòng được chọn trong bảng hoặc thanh điều hướng.

### 1.3. Màu Ngữ Nghĩa Trạng Thái Nghiệp Vụ (Semantic Operational Colors)
| Trạng thái / Nhóm | Mã màu nền | Mã màu chữ | Mã viền | Ngữ cảnh sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| **Thành công / Hoàn tất (Delivered / QC Pass / Active)** | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` | Giao thành công, QC Đạt, Kênh kết nối tốt. |
| **Đang xử lý / Vận chuyển (In-Transit / Picking / Packing)** | `bg-blue-50` | `text-blue-700` | `border-blue-200` | Đang đóng gói, Đang giao hàng, Đơn COD. |
| **Cảnh báo / Tồn kho thấp (Low Stock / Scrap / Damaged)** | `bg-amber-50` | `text-amber-700` | `border-amber-200` | Tồn kho dưới ngưỡng an toàn, Hàng cần kiểm tra. |
| **Nguy hiểm / Hủy / Đổi trả (Cancelled / Refunded / Loss)** | `bg-rose-50` | `text-rose-700` | `border-rose-200` | Đơn hủy, Lỗ dòng hàng (CM3 âm), Phế phẩm kho. |
| **Nhóm BCG Ngôi sao (Star)** | `bg-amber-100` | `text-amber-900` | `border-amber-300` | Sản phẩm biên lợi nhuận cao và sản lượng lớn. |
| **Nhóm BCG Bò sữa (Cash Cow)**| `bg-emerald-100`| `text-emerald-900`| `border-emerald-300`| Sản phẩm mang lại dòng tiền chủ lực cho shop. |

---

## 2. QUY CHUẨN TYPOGRAPHY VÀ SỐ LIỆU TÀI CHÍNH

### 2.1. Thang kích thước chữ (Type Scale)
- **H1 — Tiêu đề màn hình:** `text-xl sm:text-2xl font-black text-ink-900 tracking-tight` (20px - 24px).
- **H2 — Tiêu đề phân khu / Card:** `text-base sm:text-lg font-bold text-ink-900 tracking-tight` (16px - 18px).
- **H3 / Thẻ phụ:** `text-xs sm:text-sm font-semibold text-ink-800` (12px - 14px).
- **Body / Dữ liệu bảng:** `text-xs text-ink-800 font-normal` (12px). Tuyệt đối không dùng font 9px-11px cho nội dung chính.
- **Micro-labels / Badges:** `text-[10px] sm:text-[11px] font-bold uppercase tracking-wider`.

### 2.2. Quy chuẩn hiển thị số liệu tiền tệ & phần trăm (Financial Ergonomics)
- **Tabular Numbers:** Bắt buộc áp dụng thuộc tính CSS `tabular-nums` hoặc `font-mono font-medium text-right` cho mọi ô tiền tệ, số lượng và tỷ lệ % để đảm bảo các chữ số thẳng hàng tuyệt đối theo chiều dọc, giúp mắt người dùng so sánh tức thì không bị xô lệch.
- **Định dạng tiền tệ VND:**
  - Luôn có dấu chấm phân cách hàng nghìn: `22.840.000 ₫`.
  - Không bao giờ để đơn vị `₫` bị rớt xuống dòng riêng biệt (`whitespace-nowrap`).
- **Mã định danh:**
  - Mã đơn hàng (`ORD-DIGITAL-001`), Mã SKU (`SKU-TECH-001`), Mã RMA (`RMA-20261029-001`) dùng font `font-mono font-semibold text-ink-900` với màu nền nhẹ bo tròn để nhận diện nhanh.

---

## 3. QUY CHUẨN BIỂU ĐỒ VÀ TOOLTIP TRỰC QUAN (CHARTS & TOOLTIPS)

### 3.1. Tooltip Biểu Đồ Toàn Hệ Thống (`ChartTooltip.tsx`)
```tsx
// Chuẩn thiết kế Tooltip cao cấp trong NexusOMS
<div className="rounded-xl bg-[#0F172A] border border-slate-700/90 shadow-2xl p-3 min-w-[200px] z-50 text-slate-100 font-sans">
  <div className="font-semibold text-xs text-slate-200 border-b border-slate-700 pb-1.5 mb-2">
    {label}
  </div>
  {items.map(item => (
    <div key={item.name} className="flex items-center justify-between gap-4 text-xs">
      <span className="flex items-center gap-1.5 text-slate-400">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
        {item.name}:
      </span>
      <span className="font-mono font-bold text-white tabular-nums">
        {formatCurrency(item.value)}
      </span>
    </div>
  ))}
</div>
```

### 3.2. Tiêu chuẩn hiển thị Biểu đồ (Scatter, Waterfall, Area, Heatmap)
- **Waterfall Chart:** Cột bắt đầu (Gross Revenue) xanh dương $\rightarrow$ Cột trừ chi phí đỏ nhạt/cam $\rightarrow$ Cột kết quả (CM1, CM2, CM3) xanh ngọc jade.
- **Heatmap Chart:** Thể hiện thang màu chuyển từ xanh lục nhạt (`emerald-100`) sang xanh lục đậm (`emerald-800`), cell có tooltip thể hiện số đơn thực và doanh thu tương ứng.
- **Scatter Bubble Chart:** Trục X (CM%), Trục Y (Doanh thu), Bán kính bong bóng (Giá trị vốn kho). Luôn có chú thích màu phân hạng BCG.

---

## 4. QUY CHUẨN TƯƠNG TÁC BẢNG DỮ LIỆU (DATA GRID PATTERNS)

1. **Preset Toolbars:** Cung cấp thanh chuyển đổi nhanh 4 Preset (`Đơn giản`, `Vận hành`, `Phân tích`, `Toàn bộ`) ở góc trên của bảng.
2. **Sticky ID Column:** Cột mã ID luôn cố định bên trái khi cuộn ngang (`sticky left-0 bg-white z-10`).
3. **Adaptive Row Expand:** Nút mở rộng dạng mũi tên quay 90 độ khi kích hoạt, nội dung bên trong có nền xám nhẹ `bg-ink-50/40` và viền phân định rõ ràng.
4. **Trạng thái rỗng (Empty States):** Không bao giờ hiển thị bảng trắng trơn. Luôn hiển thị hình minh họa, thông điệp hướng dẫn rõ ràng và nút khôi phục cài đặt gốc (`[Đặt lại bộ lọc]`).

---

## 5. QUY CHUẨN THIẾT BỊ DI ĐỘNG (MOBILE-FIRST POLICIES)

- **Ngăn ngừa cuộn ngang toàn trang:** Toàn bộ container gốc sử dụng `overflow-x-hidden`. Mọi bảng lớn phải nằm trong container có thanh cuộn riêng (`overflow-x-auto`) hoặc chuyển đổi sang định dạng Thẻ di động (Card View) ở màn hình dưới 640px.
- **An toàn cho Touch Screen:** Mọi nút bấm, dropdown và thẻ tab có diện tích chạm tối thiểu `min-h-[36px] min-w-[36px]` để người dùng thao tác ngón tay chính xác.
- **Không cắt cụt Header:** Tiêu đề trang kết hợp với `SnapshotMetadataBanner` sử dụng `flex-wrap` linh hoạt, không để banner đè lên nội dung chính.
