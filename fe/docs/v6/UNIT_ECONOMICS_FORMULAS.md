# CÔNG THỨC TOÁN HỌC & MÔ HÌNH KINH TẾ ĐƠN VỊ V6 (UNIT ECONOMICS FORMULAS)

Tài liệu chi tiết về mô hình định giá, điểm hòa vốn, biên lợi nhuận sản phẩm và ma trận BCG tích hợp trong NexusOMS V6.

---

## 1. Mô Hình Giá Hòa Vốn (Break-Even Pricing)

### 1.1. Giá Hòa Vốn Vận Hành (Break-even CM2)
Để một đơn hàng hoặc một đơn vị sản phẩm bán ra không bị lỗ biến đổi (tức $\text{CM2} = 0$):

$$\text{Price} \times (1 - \text{Fee Rate}) = \text{COGS} + \text{Fulfillment Cost}$$

$$\text{Break-Even Price}_{\text{CM2}} = \frac{\text{COGS} + \text{Packaging \& Warehouse Fulfillment}}{1 - (\text{Marketplace Fee \%} + \text{Payment Fee \%})}$$

*Ví dụ:*
- Giá vốn hàng bán (COGS): 200.000 ₫
- Chi phí đóng gói, tem nhãn, nhân công kho (WMS): 18.000 ₫
- Phí hoa hồng sàn TMĐT (Shopee): 8.5% (0.085)
- Phí thanh toán: 2.0% (0.02)
- Mẫu số: $1 - (0.085 + 0.02) = 0.895$
- Giá hòa vốn: $\frac{200.000 + 18.000}{0.895} = 243.575 \text{ ₫}$
$\rightarrow$ Bán sản phẩm này dưới **243.575 ₫** trên sàn Shopee sẽ trực tiếp tạo ra biên CM2 âm.

---

### 1.2. Giá Bán Đề Xuất Theo Mục Tiêu Lợi Nhuận (Target Margin Pricing)
Để đạt được tỷ suất đóng góp mục tiêu $\text{Target CM2 \%}$ (ví dụ $35\%$):

$$\text{Recommended Price} = \frac{\text{COGS} + \text{Fulfillment Cost}}{1 - (\text{Marketplace Fee \%} + \text{Payment Fee \%} + \text{Target CM2 \%})}$$

*Ví dụ:*
- Target CM2 = 35% (0.35)
- Mẫu số: $1 - (0.085 + 0.02 + 0.35) = 0.545$
- Giá đề xuất: $\frac{218.000}{0.545} = \mathbf{400.000 \text{ ₫}}$

---

### 1.3. Ngưỡng Voucher Giảm Giá Tối Đa Cho Phép (Max Discount Cap)
Mức giảm giá tối đa mà nhà bán có thể tự tài trợ mà không vi phạm điểm hòa vốn:

$$\text{Max Discount} = \max(0, \text{Current List Price} - \text{Break-Even Price}_{\text{CM2}})$$

*Ví dụ:*
- Giá niêm yết hiện tại: 500.000 ₫
- Giá hòa vốn: 243.575 ₫
- Mức giảm giá tối đa: $500.000 - 243.575 = \mathbf{256.425 \text{ ₫}}$
- Nếu nhà bán tung voucher giảm 300.000 ₫, hệ thống sẽ kích hoạt cảnh báo nguy cơ vi phạm biên lợi nhuận an toàn.

---

## 2. Mô Hình Hiệu Suất Vốn Tồn Kho (Stock ROI)

Stock ROI đo lường tốc độ một đồng vốn lưu kho sản sinh ra bao nhiêu đồng lợi nhuận đóng góp trong 30 ngày:

$$\text{Stock ROI \%} = \frac{\text{Total 30-Day Contribution (CM2)}}{\text{Physical Stock Quantity} \times \text{COGS}} \times 100\%$$

- **Stock ROI > 150%:** Vốn hàng luân chuyển siêu tốc, dòng tiền dồi dào, cần ưu tiên cấp vốn nhập thêm.
- **Stock ROI 50% - 150%:** Vận hành bình thường.
- **Stock ROI < 20%:** Hàng đọng vốn, chi phí cơ hội cao, cần kích hoạt chiến dịch xả kho hoặc gom combo.

---

## 3. Ma Trận BCG & Phân Nhóm SKU Đóng Góp

Mỗi SKU trong NexusOMS V6 được tự động phân loại vào 1 trong 4 nhóm:

| Nhóm SKU | Tỷ Suất Biên CM% | Tốc Độ Bán / Số Lượng Bán | Ý Nghĩa Kinh Doanh | Chiến Lược Đề Xuất |
| :--- | :--- | :--- | :--- | :--- |
| **⭐ Ngôi Sao (STAR)** | $\ge 30\%$ | Cao ($\ge 10$ đơn/tháng) | Sản phẩm chủ lực tạo cả doanh thu lẫn lợi nhuận lớn. | Ưu tiên ngân sách Ads, không được phép để đứt hàng (Lead time safety stock cao). |
| **🐄 Bò Sữa (CASH COW)** | $20\% - 30\%$ | Rất cao | Sản phẩm bán chạy số lượng lớn, mang lại dòng tiền mặt liên tục. | Duy trì chuỗi cung ứng ổn định, tối ưu chi phí bao bì và phí vận chuyển. |
| **❓ Dấu Hỏi (QUESTION MARK)** | $\ge 30\%$ | Thấp ($< 5$ đơn/tháng) | Biên lợi nhuận cực tốt nhưng thiếu lượt mua (ít traffic). | Đẩy mạnh Marketing, thiết lập combo bundle mua kèm giảm giá với dòng Bò Sữa. |
| **🐕 Con Chó (DOG)** | $< 20\%$ | Thấp ($< 5$ đơn/tháng) | Biên mỏng, bán chậm, gây giam vốn lưu động và chiếm chỗ kho. | Ngừng nhập hàng mới, chạy flash sale xả hàng thu hồi vốn lưu động. |
