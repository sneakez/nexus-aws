> Tài liệu ghi nhận theo thời điểm trước. Trạng thái bàn giao mới nhất ở [THINH_HANDOFF_READY.md](THINH_HANDOFF_READY.md).

# Thịnh — ngày 6: đơn hàng dùng API thật

Cập nhật: 05/11/2026. Nhánh: codex/thinh-day6-frontend-api.

## Đã nối
- Đăng nhập Supabase và xác thực role bằng GET /api/v1/session/me (đã kiểm tra live trong phiên làm việc).
- Danh sách GET /api/v1/orders: tìm theo mã, lọc trạng thái, tải lại, loading/empty/error.
- Chi tiết GET /api/v1/orders/{id}: sản phẩm, số lượng, giá, tổng và trạng thái.
- Giá vốn chỉ hiển thị cho manager/admin; warehouse không có nút tạo đơn.
- Form tạo đơn lấy sản phẩm và kho active từ API.
- POST /api/v1/orders gửi customerId=null, hỗ trợ nhiều dòng, thuế và phí giao hàng.
- Tổng tiền, giá vốn và giữ tồn do backend quyết định.
- Lỗi 4xx giữ draft để sửa. Lỗi mạng/5xx giữ nguyên payload và idempotency key để replay.
- Request chưa xác định kết quả được lưu trong sessionStorage theo user ID; không lưu token.
- Khi tạo thành công, tải lại danh sách và mở chi tiết.
- Đã nối confirm/process/ship/cancel và lịch sử trạng thái. Nút xuất/hủy có bước xác nhận tác động tồn; hủy bắt buộc lý do.
- Thao tác chưa rõ kết quả giữ payload/key theo user + order trong sessionStorage; gửi lại an toàn sau đóng hoặc reload.
- Thành công tải lại trạng thái và lịch sử từ backend, đồng thời làm mới danh sách.
- Đã nối tạo/tra cứu return theo ID; chỉ manager/admin tạo, warehouse được tra cứu. Request chưa rõ kết quả giữ cùng ID/payload để replay.
- Đã nối danh sách phí, ghi phí và CM1–CM3 cho manager/admin. Phí chưa rõ kết quả tra GET theo ID trước khi POST; đối chiếu content khi gặp 409.
- CM thiếu giá vốn giữ null, không thay bằng 0. Các số tiền trên giao diện đơn thật giữ tối đa 5 chữ số thập phân như dữ liệu backend (COGS có thể có 5); không đổi quy tắc làm tròn nghiệp vụ.
- Mock mode giữ trang cũ; các trang khác chưa được chuyển hết sang API.

## Kiểm tra
- Backend regression hiện tại: 76 tests; HTTP lab tăng lên 185 assertions với endpoint ledger accounts mới.
- npm test: 148 pass, chạy mock cố định và chặn mạng để không chạm DB chung.
- Journal UI: thêm 18 browser assertions, endpoint ledger accounts và 6 unit tests tiền/role.
- npm run typecheck: pass.
- ESLint các file mới và client: pass.
- npm run build: pass; còn cảnh báo bundle lớn của ứng dụng.
- npm run test:ui:orders: 48 assertions, browser fixture HTTP cô lập.
- Browser smoke kiểm tra: chi tiết, từ chối thiếu tồn và giữ dữ liệu, lỗi sau commit,
  replay cùng payload/key sau mở lại form, refresh danh sách, warehouse, mobile, lỗi chi tiết/thử lại.
- Workflow smoke: confirm manager, process/ship warehouse, ship mất response sau commit và replay sau reload, hủy thiếu lý do, conflict giữ reason, hủy thành công, lịch sử đúng một lần trong fixture.
- Smoke chặn mọi /api request và dùng auth fixture; không tạo dữ liệu trên database chung.
- Browser hậu mãi/tài chính: return mất phản hồi rồi replay sau reload; chặn trả vượt lượng; fee mất phản hồi được GET xác nhận mà không POST lần hai; fee 409 do race được đối chiếu đúng ID/content; CM giữ phần lẻ và null; warehouse không gửi request fees/contribution.
- Chưa xác nhận thao tác tạo đơn qua frontend bằng tài khoản thật trên database chung trong lượt này.
- Các API backend đã có kiểm tra lab và lượt smoke database chung ngày 1–5 riêng.

## Chạy lại
Backend trong terminal riêng:
~~~powershell
cd D:\noxus-aws\backend
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:Frontend__Origin = 'http://localhost:5173'
dotnet run --project .\src\NexusOMS.Api\NexusOMS.Api.csproj --no-launch-profile -- --urls http://localhost:5155
~~~

Frontend:
~~~powershell
cd D:\noxus-aws\frontend
npm run dev -- --host localhost --port 5173 --strictPort
~~~

.env.local cần VITE_DATA_MODE=supabase, VITE_API_BASE_URL=http://localhost:5155,
VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY của project (chỉ public anon/publishable key).
Không commit .env.local hay token.

Mở http://localhost:5173/app?page=orders.

Khi Vite đã chạy:
~~~powershell
npm run test:ui:orders
~~~

## Hoàn thiện chế độ API thật

- Tổng quan, xử lý đơn, trả hàng và lợi nhuận từng đơn lấy danh sách đơn thật. Chi tiết đơn dùng các luồng đã kiểm tra trước đó.
- Khách hàng có danh sách và tạo mới. Kho có xem tồn, giao dịch, nhập kho và điều chỉnh tồn với khóa chống trùng.
- Kết nối kênh và ánh xạ SKU có danh sách và thêm mới.
- Báo cáo theo SKU tính tiền hàng và giá vốn cho các đơn chưa hủy. Phí cấp đơn không phân bổ xuống SKU.
- Báo cáo theo kênh dùng cùng công thức CM1–CM3 với chi tiết đơn, gồm các đơn chưa hủy. Nếu thiếu giá vốn, CM giữ trạng thái chưa đủ dữ liệu.
- Định giá nhập tay tính giá tối thiểu theo bước 0,01 đồng. Mô phỏng webhook chạy bằng API lab.
- Trả hàng hiện hỗ trợ tạo và tra cứu theo ID. Các luồng QC, hoàn tiền, đối soát và tự động ghi journal cần nghiệp vụ và API riêng.

## Độ chính xác tiền

- Số lượng 3 chữ số thập phân nhân với đơn giá 2 chữ số có thể cho thành tiền 5 chữ số. Thành tiền dòng và tổng đơn mới giữ đủ 5 chữ số trong PostgreSQL.
- Các DTO tiền đơn và CM lấy chữ số từ JSON trước khi chuyển thành số JavaScript. Báo cáo tổng hợp trả số tiền dưới dạng chuỗi decimal.
- Đơn giá, thuế, phí giao hàng, phí cấp đơn và tiền nhập journal vẫn có giới hạn đầu vào 2 chữ số.
- Migration 20261105000000_preserve_order_amount_precision.sql đã áp dụng trên lab. Cần áp dụng vào database mục tiêu trước khi sử dụng tạo đơn lẻ đến 5 chữ số. Dữ liệu cũ giữ nguyên số đã lưu.
- Tạo đơn kiểm tra số lưu trong cùng transaction. Schema cũ khiến giao dịch bị từ chối nếu làm mất chữ số.