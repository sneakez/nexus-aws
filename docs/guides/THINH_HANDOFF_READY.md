# Bàn giao Thịnh — ngày 6–7

## Bản để sử dụng

Mở http://localhost:5175/login. Đây là frontend API thật, gọi API 5156. Khi khởi động với LocalLab, dữ liệu nghiệp vụ nằm trong Docker nexus_lab. Supabase xác thực email và mật khẩu. API kiểm tra quyền trên database nghiệp vụ, frontend dùng kết quả đó. Đã xác nhận URL Supabase trong cấu hình frontend và backend cùng project.

Đã xác minh hồ sơ admin thật trong Supabase chung và đồng bộ cùng UID vào lab. Thịnh đăng nhập bằng email admin đã tạo và mật khẩu đã đặt. Không cần cung cấp mật khẩu hoặc khóa quản trị vào chat.

Bản ở 5174 là bản thiết kế tham khảo, vẫn có nguồn dữ liệu mock khi khởi động VITE_DATA_MODE=mock. Vite chọn riêng module cho bản API thật. Build API thật có bước kiểm tra từ chối module src/mock và src/stores. Các module gốc vẫn được giữ để tham khảo và chạy test cũ.

## Khởi động lại

Mở terminal thứ nhất tại D:\noxus-aws:

~~~powershell
.\backend\tools\Start-ThinhDemo.ps1 -Component Api -DataTarget LocalLab
~~~

Mở terminal thứ hai:

~~~powershell
.\backend\tools\Start-ThinhDemo.ps1 -Component Frontend
~~~

Nếu cổng đang được dùng, tiếp tục dùng tiến trình đã chạy hoặc dừng đúng tiến trình demo trước khi khởi động lại. Frontend đọc cấu hình Supabase công khai từ frontend/.env.local.

Để API dùng dữ liệu chung, chọn -DataTarget Shared. Script sẽ dùng ConnectionStrings:Postgres trong user-secrets. Kiểm tra dòng target được in ở terminal trước khi thao tác.

## Dữ liệu demo riêng

~~~powershell
.\backend\tools\Seed-ThinhEndToEndDemo.ps1
~~~

| Thành phần | Tên |
| --- | --- |
| Kho | THINH-E2E-WH |
| SKU nội bộ | THINH-E2E-TSHIRT |
| Khách hàng | Khách demo Thịnh |
| Kênh thử | THINH-E2E-SHOP |
| SKU kênh | THINH-SHOPEE-01 |
| Tồn mới ban đầu | 20 |
| Giá vốn | 60.000 ₫ |

Script giữ nguyên tồn nếu chạy lại. Kịch bản thao tác đầy đủ nằm trong THINH_FULL_FLOW_DEMO.md. Chọn các tên ở bảng trên, tạo đơn 2 chiếc, đơn giá 100.000 ₫ và giao hàng 30.000 ₫. Tổng đơn 230.000 ₫, giữ 2. Khi xuất kho, tồn giảm 2 và lượng giữ giảm 2. Tạo yêu cầu trả 1 chiếc để kiểm tra return request. Ghi phí vận hành 10.000 ₫, quảng cáo 20.000 ₫ để thấy CM1 110.000 ₫, CM2 100.000 ₫, CM3 80.000 ₫. Tạo đơn thứ hai 1 chiếc và hủy để kiểm tra nhả giữ hàng.

## Các thay đổi đã hoàn tất

- Runtime API riêng cho Login, AuthProvider, AppShell, Supabase client và route. Build API thật loại mock khỏi dependency graph.
- Quyền lấy từ API cùng nguồn với nghiệp vụ. Không đọc hồ sơ quyền lần nữa từ database Supabase khác.
- Giữ số tiền dạng decimal ở API/client, lưu thành tiền numeric(17,5).
- Migration 20261105000000 đã áp dụng trực tiếp trong transaction và xác minh trên Supabase chung, ngoài lab đã có.
- Đã gỡ Bút toán, Simulator và đổi role khỏi menu API thật. Thông báo mẫu không nằm trong shell API.
- Có các màn hình API cho kho, đơn, xử lý, yêu cầu trả, khách, CM theo đơn/SKU/kênh, định giá và kênh/SKU.
- Docker/Compose mặc định dùng API thật, truyền API URL và CORS. Workflow publish kiểm tra ba biến cấu hình frontend.
- Tài khoản admin hiện có đã đồng bộ vào demo theo cùng UID, không cần tạo thêm Auth user.

## Kiểm tra

| Bộ kiểm tra | Kết quả |
| --- | --- |
| Backend | 76 test qua |
| API Lab | 199 assertions qua với JWT và PostgreSQL lab |
| Frontend unit | 149 test qua |
| Browser đơn hàng | 49 assertions qua với HTTP fixtures |
| Browser tồn mobile và phí lẻ | Qua, gồm tồn 20/giữ 2/khả dụng 18 và CM của đơn 229.999,98 ₫ |
| Browser vai trò và trang | 58 tổ hợp trang/vai trò/kích thước qua với HTTP fixtures |
| Browser Login và AuthProvider thật | Admin, manager, warehouse, thiếu quyền qua đăng nhập/khôi phục/đăng xuất với HTTP fixtures |
| Lint build API | 40 file thực sự được bundle, 0 lỗi và 0 cảnh báo |
| Build frontend | Qua, guard xác nhận không có module mock/store trong live bundle |
| Docker frontend | Build image qua, health và SPA được kiểm tra riêng |

Chạy lại từ frontend:

~~~powershell
npm run typecheck
npm test
npm run lint:live
npm run build
npm run test:ui
~~~

test:ui mặc định dùng frontend 5175. Đặt UAT_BASE_URL nếu thay cổng. Browser fixtures không thay thế việc Thịnh đăng nhập Supabase thật để nghiệm thu tài khoản và dữ liệu demo. API Lab dùng khóa ký cục bộ để kiểm tra pipeline thật.

## Phần cần Thịnh nghiệm thu hoặc cấu hình đích

1. Đăng nhập tài khoản admin thật ở 5175 bằng mật khẩu đã đặt. Chạy bảng kịch bản một lượt. Đăng nhập tài khoản kho để xác nhận không thấy tài chính.
2. Cấu hình GitHub repository variables VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY cho nơi phát hành. Chỉ dùng public anon/publishable key ở frontend.
3. Chọn môi trường triển khai và xác nhận bản triển khai. Workflow hiện publish image, chưa có job triển khai AWS.
4. Chốt UI và phạm vi qua lượt demo. Bản API không có đầy đủ các chỉ số và nghiệp vụ của prototype lớn.

Nguồn tham khảo cũ vẫn có 248 lỗi lint và 20 cảnh báo ở lượt kiểm tra toàn repo. Lệnh npm run lint vẫn báo đúng các lỗi đó; lint:live dùng cùng quy tắc ESLint trên module thực sự thuộc bundle bàn giao. Đã vá dependency trong dải phiên bản tương thích. npm audit --omit=dev trả 0 lỗ hổng; toàn bộ dependency phát triển còn 9 cảnh báo mức moderate. Chưa áp dụng thay đổi phiên bản phá vỡ tương thích do npm audit --force đề xuất.

Kết nối sàn hiện là cấu hình kênh thử và mapping. Chưa nghiệm thu OAuth/sàn thương mại thật. Trả hàng thuộc phạm vi tạo và tra cứu yêu cầu. QC, nhập trả, hoàn tiền và đối soát không thuộc luồng đã bàn giao.

Phạm vi và checklist nghiệm thu của hai dev được đối chiếu trong [THINH_BACKEND_7DAY_CHECKLIST.md](THINH_BACKEND_7DAY_CHECKLIST.md).
