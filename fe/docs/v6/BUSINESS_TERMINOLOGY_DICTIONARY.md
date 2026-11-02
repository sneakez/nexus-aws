# NEXUSOMS V6.3 — TỪ ĐIỂN THUẬT NGỮ KINH DOANH & NGỮ NGHĨA VẬN HÀNH (BUSINESS TERMINOLOGY DICTIONARY)

**Hệ thống:** NexusOMS — Digital Commerce Operating System  
**Phiên bản:** V6.3  
**Mục đích:** Xóa bỏ rào cản thuật ngữ kỹ thuật, thiết lập ngôn ngữ vận hành tiếng Việt thực chiến, đồng nhất giữa giao diện (UI), công thức và tài liệu.  

---

## 1. PHÂN HỆ QUẢN TRỊ TỒN KHO & KHO BÃI (INVENTORY & WMS)

| Thuật ngữ tiếng Anh gốc | Thuật ngữ chuẩn tiếng Việt | Định nghĩa nghiệp vụ & Ý nghĩa thực tế | Vị trí hiển thị trên UI |
| :--- | :--- | :--- | :--- |
| **Physical Stock** | **Tồn Vật Lý** | Tổng số lượng hàng hóa thực tế đang nằm trong khuôn viên kho, bao gồm cả hàng có thể bán, hàng đang giữ và hàng chưa thể bán. | Stat Card, Bảng tồn kho, Inventory Analytics. |
| **Sellable / Available** | **Có Thể Bán (Khả dụng)** | Số lượng hàng tự do mở bán trên các sàn TMĐT (Shopee, TikTok, Lazada, D2C). Đạt chuẩn QC và chưa bị khóa bởi bất kỳ đơn hàng nào. | Stat Card, Bảng tồn kho, Invariant Card. |
| **Reserved Stock** | **Đã Giữ Cho Đơn** | Số lượng hàng đã được hệ thống khóa tạm thời cho các đơn hàng mới đặt nhằm chống bán vượt tồn (Overselling). Sẽ trừ khỏi tồn vật lý khi xuất kho. | Stat Card, Action Center, Dòng mở rộng đơn. |
| **Unavailable Stock** | **Chưa Thể Bán** | Hàng đang nằm trong kho nhưng không được phép mở bán, bao gồm hàng đang chờ kiểm định (Pending QC) và hàng hư hỏng/móp vỡ (Damaged). | Stat Card, Invariant Card. |
| **Pending QC** | **Chờ Nghiệm Thu QC** | Hàng từ đơn mua PO vừa cập cảng/dock kho, đang chờ nhân viên kiểm tra ngoại quan và chức năng trước khi chuyển vào Có Thể Bán. | Action Center Kho, Modal Nghiệm thu QC. |
| **Damaged / Quarantine** | **Hàng Hỏng / Cách Ly** | Hàng bị móp hộp, vỡ do bưu tá hoặc lỗi từ khách trả về, được đưa vào khu cách ly để thanh lý hoặc bồi hoàn. | Action Center Kho, Modal Cách ly hàng. |
| **In-Transit** | **Đang Luân Chuyển** | Hàng đang trên xe tải di chuyển giữa các kho chi nhánh nội bộ (ví dụ: chuyển từ Kho Miền Bắc vào Kho Miền Nam). Nằm ngoài Physical của cả 2 kho cho đến khi nhập. | Stat Card luân chuyển, Bảng Transfer. |
| **Incoming (PO)** | **Đang Về Kho** | Hàng đã đặt từ nhà cung cấp nhưng chưa cập dock kho. Nằm ngoài Physical, phục vụ lập kế hoạch mua hàng. | Stat Card Incoming, Đơn mua hàng PO. |
| **Runway (Days)** | **Số Ngày Dự Kiến Còn Hàng** | Dự báo số ngày tồn kho khả dụng còn lại dựa trên tốc độ bán bình quân hàng ngày (Sales Velocity). Cảnh báo đứt hàng khi Runway < 10 ngày. | Bảng tồn kho, Action Center SKU. |

---

## 2. PHÂN HỆ QUẢN TRỊ ĐƠN HÀNG & GIAO VẬN (OMS & FULFILLMENT)

| Thuật ngữ tiếng Anh gốc | Thuật ngữ chuẩn tiếng Việt | Định nghĩa nghiệp vụ & Ý nghĩa thực tế | Vị trí hiển thị trên UI |
| :--- | :--- | :--- | :--- |
| **Net Sales (Managerial)** | **Doanh Thu Quản Trị** | Tổng giá trị hàng bán theo hóa đơn sau khi trừ chiết khấu voucher sàn và voucher shop, phục vụ phân tích bán hàng ngay khi chốt đơn. | Hero KPI Orders, Dashboard. |
| **Recognized Revenue** | **Doanh Thu Kế Toán Có 511** | Doanh thu được ghi nhận chính thức vào sổ sách kế toán theo chuẩn mực FOB Destination: Chỉ ghi nhận Có 511 khi khách đã nhận hàng và có biên bản POD. | Hero KPI Orders, Bảng đối soát tài chính. |
| **POD (Proof of Delivery)** | **Xác Nhận Giao Hàng (Ký POD)** | Bằng chứng khách đã nhận kiện hàng thành công (chữ ký, ảnh chụp bưu tá hoặc xác nhận điện tử từ SPX / GHN / NinjaVan). Là điều kiện tiên quyết để quyết toán tiền COD. | Action Center Đơn hàng, Drawer đơn hàng. |
| **Wave Picking** | **Gom Sóng Nhặt Hàng** | Kỹ thuật gom nhiều đơn hàng có cùng mặt hàng hoặc cùng khu vực kho vào một đợt nhặt hàng duy nhất để tối ưu hóa thời gian di chuyển của thủ kho. | Thẻ tác vụ Đóng gói, Bảng Fulfillment. |
| **Pick & Pack** | **Nhặt Hàng & Đóng Gói** | Quy trình lấy hàng từ kệ, đối soát mã vạch (Barcode/Serial) và đóng gói vào kiện kèm in phiếu giao hàng. | Stepper vòng đời đơn hàng. |
| **Dispatch / Handover** | **Bàn Giao Bưu Tá (Xuất Kho)** | Thời điểm kiện hàng được bàn giao cho đơn vị vận chuyển. Trừ chính thức Tồn vật lý, xóa Tồn giữ và ghi nhận Giá vốn xuất kho (Nợ 632 / Có 156). | Nút thao tác Drawer, Thẻ Action Center. |

---

## 3. PHÂN HỆ ĐƠN GIÁ KINH TẾ & PHÂN TÍCH TÀI CHÍNH (UNIT ECONOMICS & ANALYTICS)

| Thuật ngữ tiếng Anh gốc | Thuật ngữ chuẩn tiếng Việt | Định nghĩa nghiệp vụ & Ý nghĩa thực tế | Vị trí hiển thị trên UI |
| :--- | :--- | :--- | :--- |
| **COGS (Cost of Goods Sold)** | **Giá Vốn Hàng Bán** | Chi phí nhập hàng hoặc chi phí sản xuất đích danh/bình quân gia quyền của sản phẩm. | Thác nước P&L, Bảng Order Economics. |
| **CM1 (Contribution Margin 1)** | **Lãi Sau Giá Vốn** | $CM1 = \text{Doanh thu thuần} - \text{Giá vốn COGS}$. Đo lường hiệu quả sinh lời cốt lõi của giá bán so với chi phí mua hàng. | Bảng Phân tích đơn, KPI Unit Economics. |
| **CM2 (Contribution Margin 2)** | **Lãi Sau Biến Phí** | $CM2 = CM1 - \text{Phí sàn} - \text{Phí thanh toán} - \text{Đóng gói kho} - \text{Trợ giá ship} - \text{Chi phí hoàn hàng}$. Đo lường lợi nhuận thực thu từ sàn TMĐT. | Thác nước P&L, Bảng Phân tích đơn. |
| **CM3 (Contribution Margin 3)** | **Lãi Sau Quảng Cáo (Quản trị)** | $CM3 = CM2 - \text{Chi phí Marketing/Ads}$. Là lợi nhuận ròng cuối cùng của dòng hàng để đóng góp vào chi phí cố định và lợi nhuận doanh nghiệp. | Hero KPI, Cột bảng phân tích, Thác nước P&L. |
| **Break-Even Price** | **Giá Bán Hòa Vốn** | Mức giá bán tối thiểu mà tại đó $CM2 = 0$. Bán dưới mức giá này chắc chắn doanh nghiệp sẽ chịu lỗ trên từng đơn hàng. | Bảng SKU Economics, Modal Mô phỏng giá. |
| **Safety Discount Cap** | **Trần Chiết Khấu An Toàn** | Số tiền giảm giá hoặc voucher tối đa được phép áp dụng mà không đẩy giá bán xuống dưới mức giá hòa vốn. | Modal Mô phỏng giá bán. |
| **Stock ROI** | **Tỷ Suất Sinh Lời Vốn Tồn** | Tỷ lệ giữa tổng lãi đóng góp tạo ra trong kỳ so với giá trị vốn lưu kho: $\frac{\text{Lãi đóng góp}}{\text{Giá trị vốn tồn kho}} \times 100\%$. | KPI SKU Economics, Thẻ Action Center. |
| **SKU Portfolio Matrix** | **Ma Trận Danh Mục SKU** | Mô hình phân loại 4 nhóm sản phẩm theo Biên CM% và Vận tốc bán: **Ngôi sao (Star)**, **Bò sữa (Cash Cow)**, **Dấu hỏi (Question Mark)**, **Chậm luân chuyển (Dog)**. (Thay thế thuật ngữ cũ BCG Matrix). | SKU Economics Page, Scatter Bubble Chart. |

---

## 4. PHÂN HỆ HẬU MÃI & ĐỔI TRẢ (RMA & REVERSE LOGISTICS)

| Thuật ngữ tiếng Anh gốc | Thuật ngữ chuẩn tiếng Việt | Định nghĩa nghiệp vụ & Ý nghĩa thực tế | Vị trí hiển thị trên UI |
| :--- | :--- | :--- | :--- |
| **RMA (Return Merchandise Authorization)** | **Phiếu Đổi Trả / Bảo Hành** | Hồ sơ pháp lý ghi nhận yêu cầu trả hàng, đổi sản phẩm mới hoặc gửi bảo hành của khách hàng. | Returns Page, Stepper RMA. |
| **Returnless Refund** | **Hoàn Tiền Không Thu Hồi Hàng** | Chính sách hoàn tiền nhanh trực tiếp cho khách mà không yêu cầu gửi hàng về kho (áp dụng cho hàng giá trị thấp hoặc vỡ nát hoàn toàn). Bỏ qua bước QC kho. | Action Center RMA, Tab nhánh Returnless. |
| **Maker / Checker** | **Phê Duyệt Hai Bước** | Cơ chế kiểm soát nội bộ: Nhân viên CSKH/Kho lập phiếu (Maker), Cấp Quản lý/Chủ doanh nghiệp duyệt chi (Checker) để ngăn chặn gian lận. | Action Center RMA, Cột duyệt hồ sơ. |
| **Standard Refund** | **Hoàn Tiền Tiêu Chuẩn** | Quy trình thu hồi hàng về kho $\rightarrow$ Kiểm định QC đạt $\rightarrow$ Duyệt chi hoàn tiền. | Tab nhánh RMA, Stepper tiến trình. |
| **Exchange** | **Đổi Hàng Mới** | Thu hồi hàng cũ về kho $\rightarrow$ QC thông qua $\rightarrow$ Khởi tạo đơn hàng mới xuất kho cho khách. | Tab nhánh RMA, Stepper tiến trình. |
| **Warranty** | **Bảo Hành / Sửa Chữa** | Tiếp nhận thiết bị $\rightarrow$ Sửa chữa kỹ thuật $\rightarrow$ Giao hoàn trả cho khách. | Tab nhánh RMA, Stepper tiến trình. |

---

## 5. BẢNG HUY HIỆU NGUỒN DỮ LIỆU MINH BẠCH (DATA PROVENANCE BADGES)

| Huy hiệu trên UI | Ý nghĩa minh bạch | Ngữ cảnh sử dụng |
| :--- | :--- | :--- |
| **`[DEMO-OBSERVED]`** | Dữ liệu được tính toán chính xác 100% từ 12 đơn hàng và 6 SKU thực tế có trong kho dữ liệu mẫu của Prototype. | Heatmap bán hàng, Doanh thu kênh, Tồn kho thực tế. |
| **`[SIMULATED]`** | Dữ liệu được tính toán dựa trên các kịch bản mô phỏng vận hành (ví dụ: mô phỏng cao điểm Flash Sale). | Chế độ mô phỏng lưu lượng Heatmap, Demo Control Panel. |
| **`[ESTIMATED]`** | Chỉ số được ước lượng dựa trên các tỷ lệ chuẩn ngành thương mại điện tử (ví dụ: Take-rate sàn 9.5%, Phí vận hành 18.000₫/đơn). | Break-even price, Stock ROI, Chi phí sàn dự kiến. |
| **`[ASSUMPTION]`** | Con số giả định tạm thời do chưa có số liệu lịch sử dài hạn (ví dụ: CAC khách hàng mới, LTV dài hạn). | Marketing Analytics, Customer Retention Cohort. |
| **`[INSUFFICIENT DATA]`** | Cảnh báo dữ liệu mẫu chưa đủ mẫu thống kê để đưa ra kết luận chắc chắn. | Khuyến nghị chu kỳ dài, Dự báo xu hướng năm. |
