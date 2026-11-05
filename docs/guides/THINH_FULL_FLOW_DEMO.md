# Kịch bản demo NexusOMS của Thịnh

## Chuẩn bị

- Mở [NexusOMS dùng API thật](http://localhost:5175/app) với `VITE_DATA_MODE=supabase`. Backend demo ở cổng 5156 trỏ tới PostgreSQL lab. Có thể dùng hai hồ sơ trình duyệt riêng cho tài khoản manager và warehouse của nhóm.
- Dùng [hướng dẫn khởi động API và seed lab](DEMO_NGAY3_4_POSTMAN.md), đổi cổng API thành 5156 và đặt Frontend__Origin=http://localhost:5175. Khi chạy Vite, đặt VITE_API_BASE_URL=http://localhost:5156 và chọn cổng 5175. Đăng nhập bằng tài khoản Supabase thử nghiệm đã có profile tương ứng trong lab. Chuẩn bị một SKU có giá vốn 60.000 ₫ và kho có ít nhất 3 chiếc khả dụng. Ghi lại tồn và số lượng đang giữ trước demo.
- Dùng mã đơn mới cho mỗi lượt, ví dụ `THINH-DEMO-20261105-01`. Kiểm tra trước rằng trang Đơn hàng tải được và tài khoản kho thấy kho dự kiến.

## Kịch bản trình bày

| Bước | Vai trò và màn hình | Thao tác và kết quả |
| --- | --- | --- |
| 1 | Manager, Vận hành kho | Chọn SKU demo. Nếu bắt đầu với 20 tồn và 0 giữ, khả dụng là 20. |
| 2 | Manager, Đơn hàng | Tạo đơn mua 2 chiếc, đơn giá 100.000 ₫, phí giao 30.000 ₫, thuế 0. Tổng 230.000 ₫. Sau khi tải lại kho, tồn vẫn 20, đã giữ 2, khả dụng 18. |
| 3 | Manager, chi tiết đơn | Xác nhận đơn. Lịch sử có trạng thái đã xác nhận và lượng giữ vẫn là 2. |
| 4 | Warehouse, Xử lý đơn | Mở cùng mã đơn, bắt đầu chuẩn bị, rồi xuất kho. Tồn giảm còn 18, đã giữ về 0, khả dụng 18. Giá vốn và khu tài chính được ẩn với vai trò kho. |
| 5 | Manager, Đổi trả | Mở đơn đã xuất và tạo yêu cầu trả 1 chiếc. Lưu mã yêu cầu để tra cứu lại. Trạng thái là Đã gửi yêu cầu (requested) và tồn vẫn là 18. |
| 6 | Manager, Lợi nhuận đơn | Mở đơn và ghi phí hoa hồng 10.000 ₫ cùng phí quảng cáo 20.000 ₫. Với giá vốn 120.000 ₫, CM1 = 110.000 ₫, CM2 = 100.000 ₫, CM3 = 80.000 ₫. |
| 7 | Manager, Đơn hàng | Tạo một đơn thứ hai mua 1 chiếc rồi hủy trước khi xuất. Tồn vẫn 18, lượng giữ trở lại 0. |

Số tồn ở bảng là ví dụ với kho mới. Khi chạy lại, đối chiếu mức tăng giảm với số thực tế ngay trước mỗi thao tác.

## Nếu demo đơn đến từ sàn

Trong Kết nối sàn, chọn tài khoản kênh thử. Trong Ánh xạ SKU, trỏ mã trên kênh về SKU demo trong kho. Gửi một webhook có chữ ký HMAC từ công cụ nội bộ trỏ vào lab, rồi tải lại Đơn hàng để thấy đơn và kiểm tra tồn đã giữ. Giới thiệu rõ đây là kênh thử. Kịch bản gửi hàng loạt, gửi lại, chống bán vượt tồn và retry chạy riêng trong API Lab.

## Chạy kiểm tra lại

- Backend tại `D:\noxus-aws\backend` chạy `dotnet test NexusOMS.slnx -c Release` và `dotnet run --project tools/NexusOMS.ApiLab/NexusOMS.ApiLab.csproj -c Release`.
- Frontend tại `D:\noxus-aws\frontend` chạy `npm run typecheck`, `npm test`, `npm run build` và `npm run test:ui:orders`. Smoke trình duyệt dùng HTTP fixtures, API Lab kiểm tra database PostgreSQL thật.
- Khi nghiệm thu trên database đích, xác nhận migration độ chính xác tiền và chạy một lượt theo bảng trên bằng tài khoản thử nghiệm.
