# Mock operations & money — hợp đồng đã triển khai

Tham chiếu ban đầu: 9a143e9ef020e586f0ae7b14cd6866488a6c89b8, nhánh codex/restore-ocean-role-flows. Prompt nguyên văn: [OPERATIONS_MONEY_REQUEST.md](OPERATIONS_MONEY_REQUEST.md). Kết quả chạy cuối và giới hạn phải đọc cùng [báo cáo](OPERATIONS_MONEY_RESULTS.md); hợp đồng này không thay thế evidence.

## Giao diện và quyền

Ocean shell, theme, menu và các trang chuyên biệt được giữ. Chỉ thêm trường/chi tiết/thao tác vào card, bảng, modal và drawer hiện có. WorkQueue chỉ dẫn đến trang xử lý. Không thêm/bỏ role, không bật Finance/Viewer, không tạo CS.

Owner/Manager dùng finance:reconcile hiện có để ghi chứng từ mock. Manager được vào trang Dòng tiền vốn đã có, không được cấp capability mới. Owner toàn tenant khai báo số dư đầu kỳ. Admin không sửa tiền; Warehouse nhận hàng/QC nhưng không ghi thu/chi; Growth chỉ xem analytics trong scope và gửi đề xuất. Command và read model kiểm session, tenant, từng shop/kho nguồn và tài khoản; batch ngoài scope một phần không trả tổng tiền. Tài khoản hạn chế shop/kho không nhận chứng từ nguồn ngoài phạm vi đó.

## Tiền và công nợ

- Tài khoản mặc định chưa khai báo: không tự sinh số dư mẫu. Số dư = đầu kỳ rõ nguồn + chứng từ nhận − chứng từ chi. Đơn delivered, có lãi, đối soát hay nhận hàng PO không tự làm tăng/giảm tiền.
- Batch liên kết nhiều đơn cùng shop/kênh. Dự kiến thanh toán = net sales − phí + hoàn phí/bồi thường. Ads là chi phí hiệu quả riêng; credit Ads không mặc định là tiền vào ngân hàng. Đơn chưa gom batch được liệt kê là chưa rõ lịch, không được đếm thành tiền có thể chi.
- Batch phân biệt dự kiến, đã đối soát/chờ nhận, nhận một phần, nhận đủ và điều chỉnh cần xử lý. Chứng từ có ID/ngày/tài khoản/nguồn/actor; nhận vượt dự kiến cần lý do. Phí/refund đến trễ tạo thay đổi kỳ vọng và lịch sử quan sát; receipt không bị sửa hoặc trừ tiền tự động. Chênh lệch âm được chỉ rõ; chưa có chứng từ thu hồi/chuyển trả sàn.
- PO mới liên kết supplier_id (tái dùng nhà cung cấp cùng tên trong tenant hoặc tạo hồ sơ mock). Nợ mới ghi theo hàng thực nhận từng đợt: qty × đơn giá PO. Nhận hàng và trả nợ độc lập; trả một phần/đủ phải có chứng từ. Chặn tiền âm, vượt nợ hoặc vượt số dư.
- Hạn trả mặc định chưa rõ. Đề nghị gia hạn chỉ lưu đề nghị; chỉ lựa chọn xác nhận mô phỏng mới đổi hạn. Không tuyên bố NCC thật đã chấp thuận; không đổi tiền. PO legacy đã nhận trước khi có chức năng này không tự hồi tố tạo nợ/cho rằng đã trả.
- Clone → kiểm tra/updater → persist → commit. Lỗi không ghi dở. ID tiền có chữ ký canonical để thứ tự field không làm replay sai; cùng ID khác nội dung bị chặn. PO receipt có ID để chặn cộng tồn/nợ lặp. Không thay regression RAM-X.
- Dự báo 14 ngày lấy số còn phải thu/trả có ngày, bỏ khoản đã nhận/trả đủ; chưa rõ ngày liệt kê riêng. Overdue đưa vào đầu lịch. Stress test chỉ dời lịch dự kiến +7 ngày, không đổi chứng từ hoặc tiền. Chưa đủ quan sát để tính DIO/DSO/DPO/CCC: trả null, không dùng 42/8/16/34 hoặc burn cố định.

## Doanh thu và contribution

Net sales = tổng đơn đã giao − refund; đơn chưa giao/hủy không có sales, nhưng chi phí Ads/đóng gói/phí phát sinh vẫn còn. COGS theo MAC snapshot lúc xuất và đảo phần hàng đạt QC; compensation tách khỏi doanh thu bán. Contribution/CM3 = net sales − COGS − phí net − đóng gói − Ads gross + Ads credit + compensation.

Order/SKU/channel/dashboard dùng cùng engine. SKU phân bổ chi phí của đơn theo giá trị dòng (không phải attribution campaign). Chọn cùng kỳ VN và cùng scope để đối chiếu; trang Dòng tiền thể hiện số dư hiện tại theo chứng từ, không đồng nhất kỳ đơn với kỳ thu tiền. Dashboard không dùng fallback doanh thu, chia đều xu hướng hoặc nhận định cố định. Waterfall ghi rõ tổng đặt đã trừ voucher; không trừ voucher lần hai, bồi thường là dòng riêng. Kỳ trống có trạng thái trống.

Ads = 0/net spend không dương: hiển thị Chưa đủ dữ liệu, không Healthy/NaN/Infinity. Chưa có attribution thì dùng net doanh thu giữ lại / Ads net, tách gross spend, credit và net. Biểu đồ ngày minh họa còn giữ ở Marketing được gắn nhãn ngay trên chart; không dùng để kết luận attribution.

## SLA, cảnh báo, trách nhiệm và giá

SLA là deadline từng đơn so với thời điểm kho bàn giao. Chưa bàn giao: sắp hạn/quá hạn theo giờ hiện tại; đã bàn giao: đúng/trễ theo shipped_at, không tăng trễ theo đồng hồ. Thiếu deadline/mốc bàn giao => chưa đủ dữ liệu. Đơn hủy loại khỏi kết quả bàn giao. KPI và danh sách trong Fulfillment/Operations dùng chung helper và scope; wave hoàn tất không tạo countdown mới từ created_at.

Ngưỡng hàng chưa bán, tỷ trọng doanh thu net kênh, giờ sắp hạn, cửa sổ lịch sử và hạn ngoại lệ cấu hình được tại Settings; không phải chuẩn sàn bắt buộc. Cảnh báo dùng đơn giao và tồn trong scope, có số giải thích/link; chưa đủ lịch sử báo thiếu dữ liệu. Không dựng hệ thống dự báo/automation mới.

Ngoại lệ tận dụng handoffAssignments: người phát hiện, assignee/nhóm, hạn, trạng thái, người xử lý, người xác nhận và lịch sử. Kho ghi phát hiện, Manager xử lý, Owner/Manager xác nhận sau có kết quả; không mở scope cho assignee. WorkQueue chỉ tổng hợp link.

Máy tính giá giữ component hiện có; giả định phí sàn/thanh toán, voucher người bán, đóng gói, Ads và thuế/phí tự nhập lưu theo shop. Không hardcode thuế toàn SEA. Đánh dấu khoản thuế đã nằm trong phí khác để không cộng lại. Cảnh báo biên thấp/âm hoặc tỷ lệ không khả thi; không tự cập nhật giá sàn. Phân biệt mô phỏng trước bán và economics đơn thực tế.

## Không nhận hoàn tất ngoài phạm vi

Maker/Checker chi tay, exchange/warranty và các nghiệp vụ nâng cao chưa hỗ trợ trọn vẹn: chỉ hồ sơ/trạng thái/giải thích, không giả chuyển tiền hay xuất bù thành công. Không ERP kế toán, backend/OAuth/sàn/carrier/ngân hàng thật, AI, hệ thống automation hoặc chính sách pháp lý. Không merge main hoặc deploy.
