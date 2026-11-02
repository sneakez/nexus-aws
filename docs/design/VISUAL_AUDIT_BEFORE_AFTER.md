# KIỂM TOÁN THỊ GIÁC & SO SÁNH TRƯỚC - SAU (VISUAL AUDIT BEFORE / AFTER)
**Dự án:** NexusOMS V5 Enterprise  
**Nhánh:** `feature/nexusoms-v5-visual-redesign`  
**Mục tiêu:** Nâng cấp nhận diện thị giác trang chủ Public Website dựa trên phong cách thiết kế của Ecomflow, giữ vững hệ màu Thủy – Kim – Mộc, chuẩn hóa nhịp điệu (rhythm), bố cục editorial và loại bỏ toàn bộ tuyên bố kỹ thuật chưa kiểm chứng.

---

## 1. PHÂN TÍCH THIẾT KẾ ECOMFLOW VÀ ĐỐI CHIẾU

Khi đối chiếu ngôn ngữ thiết kế của [Ecomflow](https://ecomflow.com/), nhóm kiến trúc đã rút ra các đặc trưng cốt lõi sau:

| Tiêu chí | Phong cách Ecomflow | NexusOMS Trước Cải Tổ (Before) | NexusOMS Sau Cải Tổ (After) |
| :--- | :--- | :--- | :--- |
| **Bố cục Hero** | 2 cột Editorial SaaS cân xứng (Copy trái, Product Mockup lớn bên phải). | 1 cột đơn điệu ở giữa, nhồi nhét KPI và bảng mô phỏng cồng kềnh. | **2 cột Editorial:** Bên trái tập trung lợi ích kinh doanh, bên phải Mockup bàn làm việc chiều sâu nhiều lớp. |
| **Nhịp điệu Sáng - Tối (Rhythm)** | Xen kẽ hài hòa giữa các khối sáng (Crisp White / Light Gray) và khối tối tạo điểm nhấn. | Toàn bộ trang phủ nền tối (`#081B2C`, `#05121E`), thiếu nhịp điệu và gây mỏi mắt. | **Nhịp điệu chuẩn:** Dark Hero → Light Pearl White (`#F4F8FA`) → Dark Workflow → Light Benefits → Dark Showcase → Light FAQ → Dark CTA. |
| **Thanh Điều Hướng (Navbar)** | Sticky mượt mà, phân cấp rõ logo, danh mục giải pháp, CTA đăng nhập và dùng thử. | Desktop bị co cụm thành icon hamburger hoặc thiếu nút Đăng nhập trực quan. | **Sticky Header hoàn chỉnh:** Logo + Tagline trái, Menu 5 mục trung tâm (lg:flex), Đăng nhập và Bắt đầu sử dụng nổi bật bên phải. |
| **Dữ liệu & Nội dung** | Tập trung vào giá trị vận hành thực tế cho merchant, câu từ tự nhiên. | Quá tải thuật toán kỹ thuật ("PostgreSQL ACID Lock", "<15ms", "99.99% uptime SLA"). | **Lợi ích kinh doanh thực tế:** Chống bán âm, gom sóng nhặt hàng, hạch toán đối soát doanh thu đa sàn. |
| **Khoảng trắng & Typography** | Khoảng cách section rộng rãi (py-24, py-28), tiêu đề lớn rõ ràng (text-4xl - 5xl). | Chữ nhỏ, padding chật hẹp, bảng số liệu dày đặc gây ngợp thông tin. | **Khoảng trắng tiêu chuẩn:** Padding thoáng đãng, phân cấp chữ rõ ràng (Heading 48px, Body 16px, Note 12px). |

---

## 2. BẰNG CHỨNG HÌNH ẢNH TRƯỚC VÀ SAU (SCREENSHOTS)

Tất cả các bản chụp màn hình headless phân giải cao được lưu trữ tại `docs/design/screenshots/`:

### 2.1. Bản Chụp Desktop (1440px Viewport)
- **Trước cải tổ (Before Desktop):**  
  `docs/design/screenshots/before_desktop.png`  
  *Đặc điểm:* Nền tối liên tục, bố cục hero dồn ở giữa, dashboard preview quá tải các bảng mô phỏng Flash sale và tính toán ROI kỹ thuật.
- **Sau cải tổ (After Desktop):**  
  `docs/design/screenshots/after_desktop.png`  
  *Đặc điểm:* Bố cục 2 cột sang trọng, chuyển giao mềm mại giữa Dark Hero sang Light Pearl White (`#F4F8FA`), Mockup bàn làm việc có chiều sâu nhiều lớp, quy trình 7 bước tương tác mượt mà.

### 2.2. Bản Chụp Mobile (390px Viewport)
- **Trước cải tổ (Before Mobile):**  
  `docs/design/screenshots/before_mobile.png`  
  *Đặc điểm:* Bảng dữ liệu tràn viền, nút bấm xếp chồng thiếu cân đối.
- **Sau cải tổ (After Mobile):**  
  `docs/design/screenshots/after_mobile.png`  
  *Đặc điểm:* Hamburger drawer độc lập cho mobile, các khối thẻ chuyển thành 1 cột tự nhiên, bảng dữ liệu có thanh cuộn ngang mượt mà, CTA full-width dễ chạm ngón tay cái.

---

## 3. DANH SÁCH CHI TIẾT CÁC VẤN ĐỀ ĐÃ KHẮC PHỤC

1. **Khắc phục lỗi thiếu nút Đăng nhập trên thanh điều hướng:**
   - Đã bổ sung nút **Đăng nhập** dạng outline kèm biểu tượng trực quan dẫn thẳng vào `/login`.
   - Bổ sung nút **Bắt đầu sử dụng** dạng gradient đại diện hành động chính (Primary CTA).
   - Thanh điều hướng duy trì trạng thái dính (`sticky top-0 z-50 backdrop-blur-md`).
2. **Khắc phục Hero thiếu hình ảnh sản phẩm lớn:**
   - Thay thế khối đơn một cột bằng layout 2 cột:
     - Bên trái: Eyebrow badge, tiêu đề *"Đơn hàng, tồn kho và dòng tiền. Một nơi để kiểm soát."*, đoạn giới thiệu súc tích 2 dòng, cụm 2 CTA lớn.
     - Bên phải: Mô phỏng bàn làm việc NexusOMS với bảng đơn hàng đa kênh (Shopee, TikTok Shop, Lazada), trạng thái khóa tồn nguyên tử và sổ kép hạch toán.
3. **Phá vỡ sự đơn điệu của các khối tối (Dark monotone):**
   - Đưa vào 3 section nền sáng `Pearl White (#F4F8FA)` và `Crisp White (#FFFFFF)`:
     - `ProductOverviewSection`: Giới thiệu 3 trụ cột giải pháp với thẻ nổi đổ bóng nhẹ.
     - `OperationalBenefitsSection`: 3 giá trị vận hành cốt lõi và bộ ước tính sản lượng thực tế.
     - `FaqSection`: Bộ câu hỏi thường gặp dạng accordion trên nền sáng dễ đọc.
4. **Loại bỏ các thông số kỹ thuật chưa kiểm chứng:**
   - Loại bỏ hoàn toàn các tuyên bố: "99.99% uptime", "Độ trễ < 15ms", "Zero oversell đã chứng minh", các con số ROI giả định.
   - Thay thế bằng mô tả cơ chế nguyên tử: *"PostgreSQL ACID Stock Reservation"*, *"Bút toán kép cân đối Nợ = Có"*, *"Idempotency Key chống đơn trùng"*.
