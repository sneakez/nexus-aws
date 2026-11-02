# NexusOMS AWS MVP Prototype

Prototype giao diện cho hệ thống vận hành thương mại đa kênh NexusOMS. Phiên bản này tập trung vào luồng demo tốt nghiệp FCAJ và giữ kiến trúc sẵn sàng nối backend .NET/AWS sau khi luồng nghiệp vụ local đã ổn định.

## Phạm vi MVP

Prototype chỉ đưa các phân hệ cốt lõi lên điều hướng chính:

1. Tổng quan KPI
2. Vận hành kho
3. Đơn hàng
4. Xử lý đơn
5. Đổi trả hàng
6. Khách hàng
7. Lợi nhuận đơn
8. Lợi nhuận SKU
9. Hiệu quả kênh
10. Dòng tiền
11. Định giá bán
12. Kết nối sàn, ánh xạ SKU và mô phỏng Flash Sale

Các màn hình nâng cao vẫn được giữ trong source để bảo toàn công việc cũ, nhưng không xuất hiện trong menu MVP.

## Role trong prototype

- **Owner**: toàn bộ 12 phân hệ, bao gồm cấu hình kết nối và ánh xạ SKU.
- **Manager**: vận hành đơn, CRM, tài chính/P&L và chạy simulator.
- **Warehouse**: dashboard, tồn kho, đơn hàng, xử lý đơn và đổi trả.

Admin, Finance, Growth và Viewer được giữ ở tầng mock engine để tương thích dữ liệu/test cũ, nhưng không còn là tài khoản đăng nhập hoặc role điều hướng của MVP. Public marketing, đăng ký, onboarding, quản trị người dùng và các màn hình nâng cao cũng đã được rút khỏi runtime prototype.

## Chạy local

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Mở `http://127.0.0.1:5174/app`.

Prototype mặc định dùng mock store và không cần AWS credentials, Supabase thật hay backend .NET. Ở màn hình đăng nhập có thể dùng các tài khoản demo được điền nhanh; mật khẩu demo là `demo`.

## Kiểm tra chất lượng

```powershell
npm run typecheck
npm test
npm run build
```

Các bài kiểm thử UI chuyên sâu nằm trong `scripts/`. Script lịch sử từ các vòng nghiệm thu cũ được gom vào `scripts/legacy/` và không còn nằm ở thư mục gốc.

## Cấu trúc chính

```text
src/
  app/           AppRoot, router, AppShell, navigation và page registry
  features/      Màn hình và public API theo domain nghiệp vụ
  components/    UI primitives, layout dùng chung và biểu đồ
  hooks/         React hooks dùng chung
  services/      Tích hợp kỹ thuật như ký webhook/API adapter
  stores/        Facade state cho application layer
  schemas/       Contract và validation payload
  providers/     Auth/tenant/toast providers
  mock/          Dữ liệu và engine nghiệp vụ local
  analytics/     Tính KPI, P&L và báo cáo
  utils/         Formatter và helper thuần
  tests/         Unit và integration tests
scripts/         Smoke test MVP và kiểm thử đăng nhập theo role
supabase/        Schema và migration tham chiếu
docs/            Tài liệu kỹ thuật và lịch sử kiểm chứng
```

Runtime chỉ import screen qua `features/*`. Chi tiết ranh giới module và lộ trình Next.js nằm tại `docs/implementation/PROJECT_STRUCTURE.md`.

## Hướng AWS dự kiến

- .NET 8/9 Web API đóng gói Docker trên AWS App Runner
- Amazon SQS và DLQ cho webhook bất đồng bộ
- Amazon RDS PostgreSQL cho ordering, inventory và finance
- Amazon S3 với pre-signed URL cho ảnh và chứng từ
- Amazon EventBridge cho job định kỳ
- SSM Parameter Store cho secret và cấu hình
- CloudWatch và X-Ray cho log, metric và trace

Đây là prototype frontend. Simulator tạo 100 webhook local, ký HMAC-SHA256 và gọi mock store để chứng minh nguyên tắc chống oversell; nó không gửi request đến Shopee/TikTok. SQS, RDS, App Runner, xác minh HMAC phía server và atomic inventory phải được triển khai và kiểm chứng ở backend trước khi coi là production-ready. Contract mô phỏng nằm tại `docs/api/WEBHOOK_SIMULATOR_CONTRACT.md`.

## Quy tắc repository

- Không commit `node_modules`, `dist`, evidence trong `artifacts`, file `.env` hoặc secret.
- Không xóa mock engine hiện có khi chuyển sang API thật; tách adapter để giữ test local.
- Mọi thay đổi luồng đơn, kho và P&L phải chạy lại typecheck, test và build.
