# API ngày 3–4: hợp đồng trước triển khai

Tất cả URL dưới /api/v1. Bearer JWT của Supabase; role lấy từ profile đang hoạt động.

| Endpoint | Role | Thành công | Lỗi nghiệp vụ |
|---|---|---|---|
| POST /orders | manager/admin | 201 mới; 200 replay; Location tới chi tiết đơn | 400 input/reference; 409 thiếu tồn/trùng khác nội dung |
| POST /orders/{id}/confirm | manager/admin | 200 confirmed hoặc replay | 404 thiếu đơn; 409 sai trạng thái/khóa |
| POST /orders/{id}/process | warehouse/manager/admin | 200 processing hoặc replay | 404/409 |
| POST /orders/{id}/cancel | manager/admin | 200 cancelled hoặc replay | 404/409 |
| POST /orders/{id}/ship | warehouse/manager/admin | 200 shipped hoặc replay | 404/409 |
| POST /returns | manager/admin | 201 mới; 200 replay theo request Id | 400 input; 404 thiếu đơn; 409 trạng thái/lượng/trùng |
| GET /returns/{id} | warehouse/manager/admin | 200 | 404 |
| GET /orders/{id}/fees | manager/admin | 200 danh sách, có thể rỗng | 404 thiếu đơn |
| POST /orders/{id}/fees | manager/admin | 201 | 400; 404 thiếu đơn; 409 trùng fee Id |

Không đăng nhập hoặc token không hợp lệ: 401. Token hợp lệ nhưng role không đủ: 403.

## Tạo đơn

CreateOrderRequest hiện có được giữ nguyên. Backend lấy SKU/tên/giá vốn từ catalog,
tính tiền, lưu pending và reserve TẤT CẢ dòng trong cùng transaction.
Thiếu tồn một dòng: rollback toàn bộ. Replay không đọc lại catalog hoặc giữ lại tồn.
Kho phải tồn tại/đang hoạt động; customer nếu có phải tồn tại.

## Chuyển trạng thái

pending -> confirmed -> processing -> shipped. delivered là trạng thái sau giao hàng,
chưa được giả lập thành công tự động bởi API xuất kho.
Hủy được pending/confirmed/processing; không hủy sau xuất.
Confirm/process/ship body: { "idempotencyKey": "mã duy nhất" }.
Cancel thêm "reason". Mỗi thao tác sử dụng khóa riêng; receipts có replay kết quả.
Toàn bộ trạng thái, Inventory, ledger, audit và receipt dùng transaction chung.
Đơn pending cũ (creation_request NULL), chưa từng có reservation, được hủy no-op tồn.
Đơn mới hoặc đơn đã xử lý mà mất reservation phải báo conflict.

## Ngày 4

Return request chỉ tạo cho shipped/delivered/returned; quantity không vượt lượng
còn lại sau các yêu cầu không bị rejected. Cùng Id/cùng nội dung replay; khác nội
dung conflict. Tạo request KHÔNG tự nhập kho, QC hoặc hoàn tiền.
Fee giữ quy tắc hiện tại: 6 loại phí, amount >=0, tối đa 2 số thập phân; trùng Id
trả 409 và không ghi audit lần nữa.

## Độ chính xác tiền

Giữ tương thích hợp đồng đang có: decimal, tối đa 2 chữ số thập phân; làm tròn
thành tiền từng dòng bằng AwayFromZero đến 2 chữ số rồi cộng tổng. Chưa chuyển
đổi giá trị sang nguyên VND, chưa tích hợp thanh toán/hóa đơn. Đây là chính sách
nội bộ hiện hành được ghi rõ để test; không phải khẳng định quy định pháp lý.
Giá vốn là snapshot khi tạo đơn. Lợi nhuận hiện vẫn là ước tính, chưa có refund.
