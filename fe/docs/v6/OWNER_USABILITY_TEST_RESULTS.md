# NEXUSOMS V6.3 — XÁC MINH LUỒNG TÁC VỤ TỰ ĐỘNG BẰNG TRÌNH DUYỆT THẬT
*(AUTOMATED TASK FLOW & BUSINESS COMPLETION VERIFICATION)*

> [!NOTE]
> **Lưu ý phương pháp luận:** Báo cáo này ghi nhận kết quả **Xác minh Luồng Tác vụ Tự Động (Automated Task Flow Verification)** được thực thi trực tiếp trên trình duyệt Chromium thật qua tập lệnh tự động hóa `verify_v6_3_business_completion.cjs`. Đây **không phải** là nghiên cứu đo lường trải nghiệm người dùng thực tế với đối tượng con người (Human Usability Study), mà là kiểm thử kỹ thuật E2E nhằm chứng minh khả năng hoàn tất nghiệp vụ trọn vẹn và bảo toàn tính bất biến trong môi trường nguyên mẫu mock.

**Ngày kiểm thử:** 29/10/2026  
**Môi trường:** Local Prototype Mock Engine (`VITE_DATA_MODE=mock`)  
**Thiết bị thực thi:** Chrome Headless / Chromium Automation Engine (Puppeteer)  
**Tập lệnh kiểm thử:** `verify_v6_3_business_completion.cjs`  
**File nhật ký chi tiết:** `docs/v6/AUTOMATED_TASK_VERIFICATION_LOG.json`  

---

## 1. PHÂN ĐỊNH HAI KẾT QUẢ ĐỘC LẬP: NAVIGATION VS BUSINESS COMPLETION

Theo chỉ đạo của Chủ đầu tư, mỗi tác vụ phải được đánh giá qua hai tiêu chí độc lập:
1. **Navigation Result (PASS / FAIL):** Hệ thống có mở đúng bản ghi, kích hoạt đúng Drawer, Modal, Accordion hoặc chuyển đúng route với bộ lọc tương ứng hay không.
2. **Business Completion Result (PASS / FAIL):** Thao tác có thực sự thực thi đột biến dữ liệu (Mutation) thành công, cập nhật state của `mockStore`, phản ánh đúng qua `stateRevision`, lưu trữ bền vững qua `localStorage`, bảo toàn quy tắc bất biến và chặn quyền truy cập trái phép (RBAC) hay không.

### Bảng Tổng Hợp Kết Quả 5 Tác Vụ Điều Hành Cốt Lõi:

| Mã Tác Vụ | Tên Tác Vụ Nghiệp Vụ | Thao Tác Kiểm Thử | Navigation Result | Business Completion Result | Kết Luận Chung |
|:---:|:---|:---|:---:|:---:|:---:|
| **TASK 1** | **Xử lý đơn hàng Chờ duyệt (Shopee)** | Mở Drawer chi tiết từ Action Center $\rightarrow$ Chuyển trạng thái đơn sang `processing` | **PASS** | **PASS** | **VERIFIED** |
| **TASK 2** | **Kiểm định QC & Nhập kho lại (TikTok Shop)** | Mở Modal kiểm định QC $\rightarrow$ Nghiệm thu 2 đạt chuẩn (Sellable), 1 lỗi (Damaged) | **PASS** | **PASS** | **VERIFIED** |
| **TASK 3** | **Phân tích P&L Waterfall Đơn hàng** | Mở Accordion hàng mở rộng đơn `ORD-90214` $\rightarrow$ Đối soát từng dòng CM1/CM2/CM3 | **PASS** | **PASS** | **VERIFIED** |
| **TASK 4** | **Phê duyệt RMA Kiểm soát Kép (Maker/Checker)** | Duyệt Maker bởi Quản lý $\rightarrow$ Chặn tự duyệt Checker $\rightarrow$ Kế toán duyệt Checker | **PASS** | **PASS** | **VERIFIED** |
| **TASK 5** | **Điều hành & Drill-down từ Dashboard** | Nhấp khuyến nghị tại Action Center $\rightarrow$ Chuyển trang Channel Economics & đối soát số | **PASS** | **PASS** | **VERIFIED** |

---

## 2. CHI TIẾT TỪNG TÁC VỤ & BẰNG CHỨNG BIẾN ĐỘNG DỮ LIỆU

### TASK 1: Xử Lý Đơn Chờ Duyệt & Khóa Tồn (Shopee)

- **Mục tiêu:** Mở đơn hàng `ORD-44812` từ Action Center, chuyển trạng thái sang `processing`, kiểm tra lưu trữ bền vững và phân quyền RBAC.
- **Navigation Verification:** Nhấp nút `Xử lý đơn ORD-44812` $\rightarrow$ Drawer trượt từ bên phải mở thành công, hiển thị đầy đủ thông tin đơn hàng, tồn giữ chỗ (Reserved 25) và các mốc quy trình. $\rightarrow$ **Navigation PASS**.
- **Business Completion Verification:**
  - Nhấp nút `Xác nhận & Khóa tồn`: Trạng thái đơn đổi thành `processing`.
  - State Revision của `mockStore` tăng từ `0` lên `1`.
  - Tải lại trang (Reload Page): Trạng thái đơn `ORD-44812` vẫn duy trì là `processing` trong `localStorage`.
  - Chuyển vai trò sang `viewer`: Thử cập nhật đơn $\rightarrow$ Hệ thống hiển thị Toast chặn quyền thao tác (`Vai trò viewer không có quyền thao tác dữ liệu`). $\rightarrow$ **Business Completion PASS**.

#### Bảng Kiểm Toán Biến Động Dữ Liệu (Before vs After):
| Thuộc Tính Kiểm Tra | Trước Thao Tác (Before) | Sau Thao Tác (After) | Kết Quả / Đánh Giá |
|:---|:---:|:---:|:---|
| **Mã đơn hàng** | `ORD-44812` | `ORD-44812` | Đúng đối tượng kiểm thử |
| **Trạng thái đơn (Status)** | `pending` | `processing` | Đột biến trạng thái thành công |
| **Tồn giữ chỗ SKU NX-TITAN-1L** | 25 | 25 | Giữ nguyên mức tồn giữ chỗ |
| **Tồn khả dụng (Available)** | 65 | 65 | Đúng định mức khả dụng |
| **Tồn vật lý (Physical)** | 95 | 95 | Chưa xuất kho $\rightarrow$ Physical bất biến |
| **Store Revision Counter** | 0 | 1 | Tăng số phiên bản dữ liệu |

- **Bằng chứng ảnh chụp:**
  - `task1_orders_before_nav.png`: Giao diện danh sách đơn hàng trước khi mở Drawer.
  - `task1_orders_drawer_nav_pass.png`: Drawer chi tiết đơn mở thành công (Navigation PASS).
  - `task1_orders_business_completed.png`: Trạng thái đơn chuyển sang `processing` (Business Completion PASS).
  - `task1_orders_reloaded_persistence.png`: Dữ liệu duy trì bền vững sau khi tải lại trang.
  - `task1_orders_rbac_viewer_blocked.png`: Thông báo chặn quyền khi vai trò Viewer cố thao tác.

---

### TASK 2: Tiếp Nhận & Nghiệm Thu QC Hàng Nhập/Hoàn (TikTok Shop)

- **Mục tiêu:** Tiếp nhận 3 đơn vị SKU `NX-TITAN-1L` đang ở trạng thái `Pending QC` tại dock nhập hàng; phân loại 2 đơn vị đạt chuẩn (Sellable) và 1 đơn vị lỗi (Damaged).
- **Navigation Verification:** Nhấp `Hàng Chờ Nghiệm Thu QC` tại Action Center kho $\rightarrow$ Modal kiểm định tiếp nhận lô hàng mở thành công. $\rightarrow$ **Navigation PASS**.
- **Business Completion Verification:**
  - Nhập số lượng: Đạt chuẩn = `2`, Lỗi cách ly = `1`.
  - Nhấp `Xác nhận kết quả kiểm định`:
    - `Pending QC` giảm từ `3` về `0`.
    - `Sellable` tăng từ `65` lên `67` ($+2$).
    - `Damaged` tăng từ `2` lên `3` ($+1$).
    - `Unavailable` giảm từ `5` xuống `3` ($0 + 3$).
    - `Physical` giữ nguyên tuyệt đối ở mức `95` đơn vị ($67 + 25 + 3 = 95$).
    - Thẻ kho ghi nhận thêm 2 bút toán: `+2 Sellable` (loại `qc_pass`) và `+1 Damaged` (loại `qc_fail`).
    - Bất biến tồn kho $Physical = Sellable + Reserved + Unavailable$ được duy trì nghiêm ngặt. $\rightarrow$ **Business Completion PASS**.

#### Bảng Kiểm Toán Biến Động Tồn Kho SKU NX-TITAN-1L:
| Thành Phần Tồn Kho | Trước QC (Before) | Sau QC (After) | Chênh Lệch ($\Delta$) | Quy Tắc Kiểm Chứng |
|:---|:---:|:---:|:---:|:---|
| **Pending QC** | 3 | 0 | $-3$ | Toàn bộ hàng chờ đã được nghiệm thu |
| **Sellable (Có thể bán)** | 65 | 67 | $+2$ | Nhập kho đạt chuẩn để kinh doanh |
| **Reserved (Đang giữ chỗ)** | 25 | 25 | $0$ | Không ảnh hưởng đơn đang chờ xuất |
| **Damaged (Hư hỏng/Cách ly)** | 2 | 3 | $+1$ | Cách ly sản phẩm lỗi vào kho bảo hành |
| **Unavailable ($Pending + Damaged$)** | 5 | 3 | $-2$ | Tổng hàng chưa sẵn sàng bán |
| **Physical ($Sellable + Reserved + Unavail$)** | **95** | **95** | **0** | **BẤT BIẾN HOÀN TOÀN** |
| **Số lượng bút toán Sổ cái thẻ kho** | 2 | 4 | $+2$ | Ghi nhận đầy đủ lịch sử kiểm toán |

- **Bằng chứng ảnh chụp:**
  - `task2_inventory_before_qc.png`: Trạng thái kho hàng trước khi kiểm định.
  - `task2_inventory_qc_modal_nav_pass.png`: Modal kiểm định QC mở sẵn sàng (Navigation PASS).
  - `task2_inventory_qc_business_completed.png`: Số dư các trạng thái tồn kho cập nhật chính xác (Business Completion PASS).

---

### TASK 3: Phân Tích Lỗ/Lãi (P&L Waterfall) Chi Tiết Từng Đơn Hàng

- **Mục tiêu:** Mở hàng mở rộng đơn `ORD-90214`, đối soát từng dòng chi phí với dữ liệu gốc trong `mockStore`.
- **Navigation Verification:** Nhấp biểu tượng mở rộng hàng (Chevron) tại dòng đơn `ORD-90214` $\rightarrow$ Khối phân rã Thác nước P&L hiển thị trực quan ngay dưới dòng đơn. $\rightarrow$ **Navigation PASS**.
- **Business Completion Verification:**
  - Đối chiếu số liệu hiển thị trên UI với bản ghi `mockStore.orders.find(o => o.order_number === 'ORD-90214')`:
    - Doanh thu gộp (Gross Sales): `1.250.000 ₫`
    - Chiết khấu (Discount): `0 ₫`
    - Doanh thu thuần (Net Revenue): `1.250.000 ₫`
    - Giá vốn hàng bán (COGS): `680.000 ₫`
    - Lợi nhuận gộp CM1: $1.250.000 - 680.000 = 570.000\text{ ₫}$ (Biên CM1: $45.6\%$).
    - Công thức toán học $CM1 = Net - COGS$ hoàn toàn trùng khớp giữa UI, mock database và công thức chuẩn. $\rightarrow$ **Business Completion PASS**.

- **Bằng chứng ảnh chụp:**
  - `task3_order_econ_before_nav.png`: Bảng Order Economics ở chế độ mặc định.
  - `task3_order_econ_row_expanded_nav_pass.png`: Mở rộng hàng thành công (Navigation PASS).
  - `task3_order_econ_pnl_reconciled.png`: Đối soát chi tiết từng dòng P&L (Business Completion PASS).

---

### TASK 4: Phê Duyệt Hoàn Tiền Theo Cơ Chế Kiểm Soát Kép (Maker/Checker)

- **Mục tiêu:** Thực thi quy trình kiểm soát kép trên đơn hoàn `RMA-2026-009` (Giá trị `1.250.000 ₫` $\ge 1.000.000\text{ ₫}$ bắt buộc 2 người duyệt).
- **Navigation Verification:** Truy cập `/returns`, định vị thẻ hoàn tiền `RMA-2026-009` có trạng thái `pending`. $\rightarrow$ **Navigation PASS**.
- **Business Completion Verification:**
  - **Bước 1 (Maker Approval):** Đăng nhập vai trò `manager`, nhấp `Duyệt Yêu Cầu (Maker)`.
    - Trạng thái yêu cầu chuyển thành `maker_approved`.
    - Ghi nhận `maker_by = 'manager'`.
  - **Bước 2 (Negative Test - Chặn tự duyệt):** Vai trò `manager` cố tình nhấp `Phê Duyệt Chi Tiền (Checker)`.
    - Hệ thống chặn thao tác và hiển thị cảnh báo: `Người tạo đề xuất không được tự phê duyệt checker`.
  - **Bước 3 (Checker Approval):** Đổi vai trò sang `finance`, nhấp `Phê Duyệt Chi Tiền (Checker)`.
    - Trạng thái yêu cầu chuyển thành `checker_approved`.
    - Ghi nhận `checker_by = 'finance'`.
    - Hai tác nhân độc lập được thực thi nghiêm ngặt trên state của mock store. $\rightarrow$ **Business Completion PASS**.

- **Bằng chứng ảnh chụp:**
  - `task4_rma_before_nav.png`: Danh sách RMA với yêu cầu chờ duyệt.
  - `task4_rma_maker_approved.png`: Manager duyệt Maker thành công.
  - `task4_rma_self_approval_blocked.png`: Chặn thành công Manager tự duyệt Checker.
  - `task4_rma_checker_approved_by_finance.png`: Finance duyệt Checker thành công.

---

### TASK 5: Ra Quyết Định Điều Hành & Drill-Down Khớp Số Liệu Từ Dashboard

- **Mục tiêu:** Nhấp liên kết khuyến nghị tại Executive Dashboard, điều hướng sang Channel Economics và đối soát tính đồng nhất của số liệu.
- **Navigation Verification:** Tại khối Action Center của Dashboard, nhấp `[Tối ưu kênh TikTok Shop]` $\rightarrow$ Trình duyệt tự động chuyển hướng sang route `/channel-economics`. $\rightarrow$ **Navigation PASS**.
- **Business Completion Verification:**
  - Số liệu Net Revenue của TikTok Shop trên thẻ khuyến nghị Dashboard: `2.710.000 ₫`.
  - Số liệu Net Revenue của dòng TikTok Shop trong bảng Channel Economics: `2.710.000 ₫`.
  - Cả hai màn hình đều truy vấn trực tiếp từ `getChannelEconomics()` của `analyticsService`, loại bỏ hoàn toàn sự không khớp số liệu tĩnh. $\rightarrow$ **Business Completion PASS**.

- **Bằng chứng ảnh chụp:**
  - `task5_dashboard_before_nav.png`: Executive Dashboard trước khi nhấp liên kết.
  - `task5_dashboard_drilldown_nav_pass.png`: Chuyển trang thành công sang Channel Economics (Navigation PASS).
  - `task5_dashboard_metric_reconciled.png`: Đối soát trùng khớp số liệu giữa hai màn hình (Business Completion PASS).

---

## 3. BẢNG SO SÁNH THAO TÁC NGHIỆP VỤ (OPERATIONAL COMPARISON)

*(Thay thế các con số tỷ lệ phần trăm ước tính không có công thức bằng các chỉ số thao tác cụ thể)*

| Chỉ Số Thao Tác | Baseline V6.2 Cũ | Baseline V6.3 Hiện Tại | Phương Thức Đo Lường |
|:---|:---:|:---:|:---|
| **Số lần nhấp để mở đơn Pending khẩn cấp** | 3 - 4 clicks (Lọc $\rightarrow$ Tìm dòng $\rightarrow$ Chọn menu) | **1 click** (Nhấp CTA trên Level 2 Action Center) | Đếm số thao tác chuột trên Chromium |
| **Số lần nhấp để mở phiếu kiểm định QC kho** | 3 clicks (Cuộn tìm $\rightarrow$ Mở tab QC $\rightarrow$ Chọn lô) | **1 click** (Nhấp CTA trên Level 2 Action Center) | Đếm số thao tác chuột trên Chromium |
| **Số lần nhấp để xem phân rã chi phí P&L đơn hàng** | Phải tải lại hoặc tìm qua nhiều cột bảng tính | **1 click** (Nhấp mở rộng hàng Accordion) | Đếm số thao tác chuột trên Chromium |
| **Cơ chế duyệt hoàn tiền giá trị cao ($\ge 1\text{M}$)** | 1 người duyệt đơn giản | **Bắt buộc 2 vai trò độc lập** (Manager duyệt Maker, Finance duyệt Checker) | Kiểm tra biến trạng thái `maker_by` $\ne$ `checker_by` |
| **Độ trễ phản ánh thay đổi sau khi cập nhật trạng thái** | Phải F5 tải lại trang | **Tức thì (Phản ứng qua React State & LocalStorage)** | Kiểm tra `stateRevision` tăng tự động |
