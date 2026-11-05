> Tài liệu ghi nhận theo thời điểm trước. Trạng thái bàn giao mới nhất ở [THINH_HANDOFF_READY.md](THINH_HANDOFF_READY.md).

# Kiểm toán NexusOMS của Thịnh — 05/11/2026

## Kết quả và giới hạn

Bản API thật chạy ở http://localhost:5175, API ở http://localhost:5156, nghiệp vụ trên Docker PostgreSQL nexus_lab. Supabase cấp phiên đăng nhập. Bản tham khảo thiết kế ở cổng 5174 vẫn dùng mock.

Đã kiểm tra toàn bộ trang được phép cho admin, manager, warehouse ở 1440 và 390 px, tổng 58 tổ hợp. Bài browser audit thay AuthProvider và HTTP bằng fixtures. Kết quả này chứng minh route, render, menu và kích thước trang. API Lab riêng kiểm tra JWT, hồ sơ quyền, database và transaction với khóa ký cục bộ.

Backend đã chạy lại 76 test. API Lab đã qua 199 assertions, gồm create/reserve, confirm/process/ship, cancel/release, rollback, replay, cạnh tranh tồn cuối, return request, phí, CM1–CM3, webhook HMAC và retry. API Lab dọn dữ liệu kiểm tra sau khi chạy.

## Đối chiếu vai trò và màn hình

| Vai trò API | Trang được phép | Giới hạn |
| --- | --- | --- |
| admin | Tổng quan, Kho, Đơn, Xử lý, Đổi trả, Khách hàng, Lợi nhuận đơn/SKU/kênh, Định giá, Kết nối và Mapping | Vai trò quản trị cao nhất hiện có trong backend |
| manager | Cùng nhóm trang với admin | Backend hiện dùng chung chính sách manager-or-admin ở nhiều API |
| warehouse | Tổng quan, Kho, Đơn, Xử lý, Đổi trả | Không xem giá vốn, phí hoặc CM, không tạo/hủy đơn và không tạo yêu cầu trả hàng |
| owner | Có trong bản mock | Chưa có vai trò owner trong backend thật. Tài khoản doanh nghiệp dùng admin khi cấp hồ sơ |

Bút toán và Simulator không thuộc menu API thật. Truy cập trực tiếp bị kiểm tra quyền trang. Bộ kiểm tra HTTP của backend vẫn kiểm tra API bút toán.

## Mock và độ khớp dữ liệu

- Trang API lấy đơn, kho, khách, kênh, mapping và báo cáo từ HTTP.
- Đã gỡ thông báo mẫu khỏi chế độ API thật. Đã gỡ nút chuyển vai trò khỏi sidebar.
- Source vẫn chứa mock store, mock adapter và các trang thiết kế tham khảo. Một số import chung vẫn tải mock store. Vì thế chưa đạt tiêu chí xóa toàn bộ mã và dữ liệu mock khỏi repository/bundle.
- API tổng quan chỉ tải tối đa 100 đơn gần nhất. Các biểu đồ trạng thái mô tả tập đó.
- Đổi trả hiện tạo và tra cứu theo mã, chưa có API danh sách tất cả yêu cầu. Chưa có QC, nhập trả hoặc refund.
- Chưa tích hợp OAuth và nhận đơn từ tài khoản sàn thương mại thật. Webhook simulator có HMAC chứng minh luồng kênh thử.
- UI kết nối hiện hỗ trợ xem/thêm tài khoản, mapping xem/thêm. API có thêm update/delete nhưng UI chưa đầy đủ các thao tác đó.
- Thiết kế dùng component Noxus-V3, chưa nghiệm thu pixel-by-pixel tất cả trang.
- Database chung còn cần xác minh migration precision. Schema lab có subtotal, total, line_total scale 5.
- Lint còn 251 errors và 20 warnings theo lượt kiểm tra trước. Workflow hiện cho phép lỗi lint.

## Bộ demo riêng

Chạy tại thư mục repo:

~~~powershell
.\backend\tools\Seed-ThinhEndToEndDemo.ps1
~~~

Script chỉ gọi container nexus-dev2-returns-lab, kiểm tra database nexus_lab, thêm dữ liệu theo ID cố định, giữ nguyên tồn khi chạy lại.

| Dữ liệu | Giá trị |
| --- | --- |
| Kho | THINH-E2E-WH — 5cbb62c8-0c3e-4b5d-b52f-111111111111 |
| Sản phẩm | THINH-E2E-TSHIRT — 5cbb62c8-0c3e-4b5d-b52f-222222222222 |
| Khách | Khách demo Thịnh — 5cbb62c8-0c3e-4b5d-b52f-333333333333 |
| Kênh thử | THINH-E2E-SHOP — 5cbb62c8-0c3e-4b5d-b52f-444444444444 |
| SKU trên kênh | THINH-SHOPEE-01 |
| Giá vốn | 60.000 ₫ |
| Tồn ban đầu | 20, giữ 0 |
| Giá bán demo | 100.000 ₫ |

Dùng kịch bản trong THINH_FULL_FLOW_DEMO.md, chọn đúng kho/SKU bên trên. Tạo 2 chiếc với phí giao 30.000 ₫, tổng 230.000 ₫. Sau xuất, tồn 18 giữ 0. Ghi phí vận hành 10.000 ₫ và quảng cáo 20.000 ₫ thì CM1 110.000 ₫, CM2 100.000 ₫, CM3 80.000 ₫. Mỗi lượt dùng mã đơn và khóa mới.

Để cấp hồ sơ admin local cho một tài khoản Supabase đã có:

~~~powershell
.\backend\tools\Seed-ThinhEndToEndDemo.ps1 -OwnerUserId '<Supabase User UID>'
~~~

Tham số này tạo hồ sơ local tương ứng, không tạo tài khoản đăng nhập trên Supabase. Máy hiện chỉ có Supabase URL và Postgres connection trong user-secrets. Tạo tài khoản Auth mới cần Supabase Auth admin capability. Lượt đăng nhập thật của tài khoản Owner còn chưa nghiệm thu.

## Tái kiểm tra

- frontend/scripts/day6-role-pages-audit.mjs chạy với UAT_BASE_URL mặc định http://localhost:5175.
- npm run test:ui:orders dùng HTTP fixtures ở localhost:5173.
- dotnet run --project tools/NexusOMS.ApiLab/NexusOMS.ApiLab.csproj -c Release dùng PostgreSQL lab thật.
- Nghiệm thu cuối còn cần đăng nhập Supabase thật, chạy bảng demo thủ công trên dữ liệu riêng, xác minh deployment và smoke test sau triển khai.
