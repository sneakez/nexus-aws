# Dev 2 ngày 3–4: kết quả và giới hạn

## Đã hoàn thiện backend trong phạm vi này

- Tạo pending và reserve mọi dòng trong cùng PostgreSQL transaction.
- Catalog thật cung cấp snapshot SKU/tên/giá vốn; kho/customer được kiểm tra.
- Confirm -> process -> ship có endpoint, role, khóa đơn, lịch sử/audit và receipt.
- Cancel gọi release; ship gọi outbound trong context transaction chung.
- Legacy pending chưa từng giữ hàng được hủy mà không giả tạo stock mutation.
- DI và mapping 400/401/403/404/409; lỗi không dự kiến trả ProblemDetails 500 không lộ stack.
- Ngày 4 Dev 2: return request/items và fee breakdown đã kiểm tra qua HTTP thật.
- GET fees của đơn không tồn tại trả 404. Warehouse không xem finance/unitCost chi tiết đơn.

## Bằng chứng đã chạy tại máy local

| Kiểm tra | Kết quả |
|---|---|
| Unit suite Debug/Release | 66/66 pass |
| Repository/Inventory lab | Pass reserve/release/outbound, replay, rollback, concurrent cancel/ship, last-unit race |
| HTTP lab Release | 121 assertions pass |
| Postman CLI 1.73.0 | 22 requests, 31 assertions, 0 failed, exit 0 |
| Docker publish/build | Thành công; image nexus-oms-api:day3-day4-check |
| Published Docker smoke | /health ok; OpenAPI có route command/return |
| Workflow YAML | Parse thành công |
| Fresh PostgreSQL | Bootstrap CI + 7 migration + actor seed thành công |

HTTP lab chạy API Program/DI/controllers/JWT bearer/ProfileClaimsTransformation
và PostgreSQL/Inventory thật. Issuer/signing key JWT được thay RIÊNG trong tool,
không có auth bypass trong API production. Postman đi qua loopback bridge tới cùng
pipeline, không dùng response mock; không publish kết quả cloud.

Trigger tạm gây lỗi audit cho create/cancel/ship/return/fee để kiểm tra rollback.
Các bài kiểm tra khác gồm: catalog đổi/inactive sau tạo vẫn replay; thiếu dòng thứ
hai hủy mọi reserve trước; cùng khóa khác nội dung; 8 create cùng khóa; hai đơn
tranh tồn cuối; hai return tranh lượng còn lại; inactive profile; token sai/expired/
wrong issuer; warehouse token giả claim admin vẫn bị chặn.

Fixtures/trigger/container kiểm tra được dọn theo ID/tên sinh riêng. Kho/sản phẩm
DEMO cố định được giữ lại để người dùng chạy Postman thủ công, không reset tồn cũ.

## Chưa tuyên bố hoàn thành

- Supabase login/JWKS thật chưa chạy lại bằng tài khoản người dùng trong lần tự làm.
- Frontend chưa chuyển từ mock sang API (ngày 6).
- Webhook/HMAC/retry chung của Dev 1 không được nghiệm thu bởi các test này.
- QC/nhập trả/refund chưa làm. ReturnInbound không được tự gọi khi tạo return request.
- CM1-CM3 và journal thuộc ngày 5; profit-estimate hiện vẫn chưa tính refund.
- Chính sách tiền giữ nguyên precision 2 chữ số hiện có; cần chốt VND/thanh toán/
  hóa đơn trước sử dụng tài chính thực tế. Không âm thầm đổi dữ liệu thành nguyên đồng.
- Database Supabase chung chưa áp dụng các migration mới ở lần tự làm này.

## CI

Backend CI thêm job PostgreSQL cô lập và hai lab; Docker build đợi unit + integration.
Kết quả GitHub thực tế cần xem trên PR; kết quả local không tự đồng nghĩa CI xanh.

## Học lại

- docs/guides/DEV2_NGAY3_4_HOC_LAI.md
- docs/guides/DEMO_NGAY3_4_POSTMAN.md
- docs/api/ORDER_DAY3_DAY4_CONTRACT.md
