# HỒ SƠ TRIỂN KHAI THIẾT KẾ V5 (REDESIGN IMPLEMENTATION)
**Dự án:** NexusOMS Enterprise V5  
**Nhánh:** `feature/nexusoms-v5-visual-redesign`  
**Kiến trúc:** React 19 + TypeScript + Tailwind CSS + Lucide Icons

---

## 1. TỔNG QUAN KIẾN TRÚC GIAO DIỆN MỚI

Trang chủ Public Website đã được cấu trúc lại hoàn toàn thành các component độc lập, tuân thủ nguyên tắc thiết kế Editorial SaaS hiện đại:

```
src/pages/public/LandingPage.tsx
├── 1. PublicHeader.tsx            [Sticky Nav: Logo, Links, Đăng nhập, Bắt đầu]
├── 2. HeroSection.tsx             [Dark Hero 2 cột: Editorial Copy + Layered Mockup]
├── 3. ProductOverviewSection.tsx  [Light Pearl White: 3 Trụ cột nền tảng]
├── 4. RealWorkflowSection.tsx     [Dark Pipeline: 7 Bước vận hành tương tác]
├── 5. OperationalBenefitsSection.tsx [Light Pearl White: 3 Lợi ích thực tế + Estimator]
├── 6. WorkspaceShowcaseSection.tsx   [Dark Tabbed Showcase: Đơn, Kho, Wave, Kế toán]
├── 7. FaqSection.tsx              [Light Accordion: Câu hỏi & Thắc mắc thường gặp]
├── 8. FinalCtaSection.tsx         [Dark Editorial CTA: Kêu gọi hành động chính]
└── 9. PublicFooter.tsx            [Balanced Footer: Bản mệnh Thủy-Kim-Mộc, Liên kết]
```

---

## 2. CHI TIẾT CÁC COMPONENT THỰC HIỆN

### 2.1. `PublicHeader.tsx` (Thanh Điều Hướng Sticky)
- **Vị trí:** Cố định trên cùng (`sticky top-0 z-50 backdrop-blur-md bg-[#081B2C]/90`).
- **Bên trái:** Logo NexusOMS biểu tượng khối hộp kép (Boxes) kèm tagline *"Quản Trị Vận Hành Đa Kênh"*.
- **Ở giữa:** Menu điều hướng hoàn chỉnh trên Desktop (`lg:flex`):
  - *Trang chủ*, *Giải pháp* (Dropdown 5 mô hình ngành), *Tính năng* (Dropdown OMS, WMS, Fulfillment, Finance), *Bản Demo*, *Bảng giá*, *Về chúng tôi*.
- **Bên phải:**
  - Nút **Đăng nhập** dạng nút viền xám tinh tế dẫn tới `/login`.
  - Nút **Bắt đầu sử dụng** dạng gradient đại dương dẫn tới `/register`.
- **Responsive:** Viewport $< 1024\text{px}$ tự động chuyển thành nút Hamburger mở Drawer trượt mượt mà.

### 2.2. `HeroSection.tsx` (Bố Cục Editorial 2 Cột)
- **Bên trái (5 Cột trên desktop):**
  - Eyebrow badge: *"NỀN TẢNG QUẢN TRỊ BÁN HÀNG & KHO VẬN"*.
  - Tiêu đề lợi ích cốt lõi: *"Đơn hàng, tồn kho và dòng tiền. Một nơi để kiểm soát."*
  - Đoạn văn hỗ trợ súc tích 2 dòng làm rõ khả năng khóa tồn và đồng bộ đa sàn.
  - Cặp nút CTA nổi bật: *Bắt đầu sử dụng* (Primary) và *Dùng thử bản Demo* (Secondary).
- **Bên phải (7 Cột trên desktop):**
  - Mô phỏng cửa sổ điều hành NexusOMS với thanh trạng thái macOS tinh tế.
  - Dải số liệu vận hành thực tế: 1.240 đơn/ngày, 14.200 tồn khả dụng, 99.8% giao đúng hạn.
  - Bảng đơn hàng trực quan đa sàn (Shopee, TikTok Shop, Lazada) hiển thị rõ trạng thái *Đã khóa tồn* và *Đã xuất kho*.
  - Hai thẻ nổi (Floating badges) tạo chiều sâu không gian: *Khóa Tồn Nguyên Tử* và *Sổ Kế Toán Kép*.

### 2.3. `ProductOverviewSection.tsx` (Khối Sáng Pearl White)
- **Nền:** `#F4F8FA` (Pearl White) tạo nhịp thở thị giác sau Hero tối.
- **3 Thẻ nổi bật:**
  - **OMS Đa Kênh:** Đồng bộ tức thời từ Shopee, TikTok Shop, Lazada; gán Idempotency Key chống đơn trùng.
  - **WMS 5 Trạng Thái:** Phân định rõ ràng Physical, Reserved, Available, In-Transit, Damaged; chống bán âm.
  - **Kế Toán Sổ Kép:** Tự động sinh bút toán Nợ = Có; phát hiện và cảnh báo đơn hàng bị âm biên lợi nhuận.

### 2.4. `RealWorkflowSection.tsx` (Quy Trình 7 Bước Tương Tác)
- **Chuỗi 7 bước vận hành:**
  1. *Khách Đặt Hàng* → 2. *Xác Nhận Đơn* → 3. *Giữ Tồn Kho* → 4. *Wave Picking* → 5. *Scan-to-Pack* → 6. *Giao Vận Chuyển* → 7. *Đối Soát & Sổ Kép*.
- **Tương tác động:** Bấm vào từng bước để xem:
  - Tác nhân thực hiện (Khách hàng, Hệ thống OMS, Nhân viên kho, Kế toán).
  - Hành động nghiệp vụ chi tiết.
  - Biến đổi trạng thái tồn kho và bút toán kế toán tương ứng theo thời gian thực.

### 2.5. `OperationalBenefitsSection.tsx` (Hiệu Quả Vận Hành & Ước Tính Sản Lượng)
- **3 Giá trị kinh doanh thực tế:**
  1. *Chống bán âm & hủy đơn do lệch kho.*
  2. *Đóng gói nhanh hơn & không nhầm lẫn nhờ gom sóng và quét mã vạch.*
  3. *Kiểm soát lợi nhuận thực & đối soát sàn minh bạch.*
- **Bộ trượt ước tính sản lượng (Volume Estimator):** Cho phép merchant kéo chọn từ 100 đến 10.000 đơn/ngày để nhận khuyến nghị phương án tổ chức kho phù hợp.

### 2.6. `WorkspaceShowcaseSection.tsx` (Bàn Làm Việc Thực Tế)
- Hệ thống 4 Tab chuyển đổi linh hoạt:
  - **Tab 1: Đơn Hàng Đa Sàn (OMS)** — Bộ lọc trạng thái và bảng đơn hàng chi tiết.
  - **Tab 2: Tồn Kho 5 Trạng Thái (WMS)** — Dải 5 chỉ số tồn và bảng Stock Runway theo ngày bán.
  - **Tab 3: Wave Picking & Scan-to-Pack** — Tiến độ đợt nhặt hàng và giao diện kiểm tra mã vạch.
  - **Tab 4: Kế Toán Sổ Kép & Đối Soát** — Bút toán bán hàng cân đối Nợ/Có và đối soát phí sàn.

### 2.7. `FaqSection.tsx` & `FinalCtaSection.tsx`
- **FAQ:** 5 câu hỏi thường gặp thiết kế dạng Accordion trên nền sáng, cung cấp câu trả lời thỏa đáng về di chuyển dữ liệu, đa kho, kế toán và dùng thử.
- **Final CTA:** Băng chuyền kết bài sang trọng trên nền tối với ánh sáng chuyển sắc đại dương, cam kết 3 điểm: không cần thẻ tín dụng, tạo workspace trong 2 phút, bảo mật cấp cơ sở dữ liệu.

---

## 3. HỆ THỐNG TOKEN MÀU BẢN MỆNH (THỦY – KIM – MỘC)

Bảng màu được áp dụng chặt chẽ theo hướng dẫn định hướng thương hiệu:

| Hành | Vai trò | Mã Màu HEX | Sử dụng trong giao diện |
| :--- | :--- | :--- | :--- |
| **Thủy (Nước)** | Màu chủ đạo (Primary) | `#081B2C` (Deep Ocean) | Nền Hero, Navbar, Workspace Showcase, Footer |
| | | `#123A52` (Midnight Blue) | Thẻ nổi, Badge nền tối, Input container |
| | | `#1E647F` (Ocean Teal) | Đường viền (Borders), Gradient điểm nhấn |
| **Kim (Kim loại)** | Màu tương sinh (Supporting) | `#D9E3E8` (Silver Mist) | Đường viền khối sáng, Icon subtle |
| | | `#F4F8FA` (Pearl White) | Nền khối sáng xen kẽ (Rhythm surface) |
| **Mộc (Cây)** | Màu sinh sôi (Accent) | `#27B4A0` (Jade Aqua) | Nút hành động chính, Checkmarks, Trạng thái thành công |

---

## 4. KẾT QUẢ KIỂM TOÁN CHẤT LƯỢNG (QUALITY GATES)

1. **ESLint (`npm run lint`):**
   - Đạt 100% chuẩn quy tắc, 0 errors, 0 warnings.
2. **TypeScript Compilation (`tsc --noEmit`):**
   - Hoàn tất không phát sinh bất kỳ lỗi gõ kiểu nào.
3. **Unit & Integration Tests (`vitest run`):**
   - 10/10 test suites vượt qua.
   - 48/48 unit tests đạt kết quả PASS (Brand tokens, Router, Onboarding, Ledger, Consistency, Transactions, Multitenancy, Security, RBAC).
4. **Vite Production Build (`npm run build`):**
   - Biên dịch thành công 1706 modules trong 21.5 giây, sẵn sàng phát hành.
