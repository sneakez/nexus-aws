# Thịnh — bàn giao ngày 5

## Phần đã làm

- `GET /api/v1/orders/{orderId}/contribution`:
  - CM1 = doanh thu chưa thuế - giá vốn.
  - CM2 = CM1 - phí vận hành đã ghi nhận.
  - CM3 = CM2 - phí quảng cáo.
  - Doanh thu gồm tiền hàng và phí vận chuyển thu khách; không gồm thuế.
  - Phí vận hành: commission, payment, shipping, packaging, return_processing.
  - Ads chỉ trừ một lần ở CM3. Thiếu giá vốn: cả ba mức CM trả `null`.
- `GET /api/v1/journals/{id}` và `POST /api/v1/journals`.
- Chỉ manager/admin được xem contribution và đọc/ghi journal.
- Journal, các dòng và audit được lưu cùng transaction.
- Cùng journal ID và nội dung: replay; khác nội dung: HTTP 409.
- Database kiểm tra journal có ít nhất hai dòng và tổng Nợ bằng tổng Có
  bằng deferred constraint trigger khi commit.

## Tích hợp phần của Dev 1

Đã merge `main` có webhook retry và inventory audit:
`0750ffc feat: add webhook retry and inventory audit` (PR #36).

Migration webhook dùng phiên bản `20261104060000`.
Migration journal đổi thành `20261104070000_guard_journal_balance.sql`
để tránh trùng phiên bản. Chỉ đổi tên file; không chạy lại migration journal
trên database lab đã có function/trigger.

## Kiểm tra đã chạy cùng Thịnh

- 76 unit test pass sau merge.
- 179 assertion HTTP lab pass.
- Lab có 100 webhook HMAC, retry/replay và kiểm tra không oversell.
- CM: đủ/thiếu giá vốn, tách ads, quyền warehouse bị chặn và đơn không có trả 404.
- Journal: tạo, đọc, replay, conflict, sai cân bằng, tài khoản không tồn tại,
  phân quyền, audit lỗi rollback, retry và hai request đồng thời.
- Hai request đồng thời: một HTTP 201, một HTTP 200;
  database chỉ có một journal, hai dòng và một audit.
- Audit lỗi: không còn header, dòng hoặc audit; gỡ trigger tạm rồi retry thành công.
- SQL trực tiếp tạo journal rỗng hoặc lệch tổng bị database chặn khi commit.
- Cả 9 migration chạy thành công trên PostgreSQL kiểm tra mới
  trong container `nexus-dev2-migration-check`, database `nexus_lab`.
- Các kết quả trên là local; chưa xác nhận CI GitHub của phần ngày 5 mới.

## File chính để học lại

Đường dẫn tính từ `D:/noxus-aws/backend/`:

| File | Trách nhiệm |
|---|---|
| src/Modules/OrderingAndFinance/Application/OrderContributionService.cs | Đọc đơn/phí và tính CM1–CM3 |
| src/Modules/OrderingAndFinance/Domain/JournalLine.cs | Dữ liệu một dòng Nợ/Có |
| src/Modules/OrderingAndFinance/Domain/JournalRules.cs | Kiểm tra dòng, số tiền và cân bằng |
| src/Modules/OrderingAndFinance/Application/JournalService.cs | Chuẩn hóa chứng từ và kiểm tra request |
| src/Modules/OrderingAndFinance/Application/IJournalRepository.cs | Hợp đồng đọc/tạo journal |
| src/Modules/OrderingAndFinance/Infrastructure/PostgresJournalRepository.cs | Khóa ID, replay, SQL, audit và transaction |
| src/NexusOMS.Api/Controllers/JournalsController.cs | HTTP, role, actor từ JWT và mã phản hồi |
| src/NexusOMS.Api/Controllers/OrderContributionController.cs | Endpoint báo cáo có phân quyền |
| tools/NexusOMS.ApiLab/Program.cs | Kiểm tra HTTP, dữ liệu thật trong Docker lab và cleanup |

Migration nằm tại
`D:/noxus-aws/supabase/migrations/20261104070000_guard_journal_balance.sql`.

## Giới hạn và việc còn lại

- CM là ước tính theo dữ liệu đã lưu, chưa điều chỉnh hoàn tiền.
- Công thức CM là quy ước quản trị của dự án, không phải chuẩn duy nhất cho mọi doanh nghiệp.
- Journal tối thiểu kiểm tra cấu trúc/cân bằng; chưa tự động định khoản từ đơn,
  chưa có nghiệp vụ đảo bút toán hoặc xác nhận tuân thủ kế toán.
- Migration journal mới áp dụng trong lab, chưa lên Supabase chung.
- Phần HTTP test ngày 5 mới chưa commit/push tại thời điểm lập tài liệu.
- Còn cập nhật collection Postman cho contribution/journal và kiểm tra CI.
- Frontend thật và triển khai ngày 6–7 chưa hoàn thành.

## Chạy lại

Trong PowerShell tại `D:/noxus-aws/backend`:

```powershell
dotnet test NexusOMS.slnx
dotnet run --project tools/NexusOMS.ApiLab/NexusOMS.ApiLab.csproj --configuration Release
```

Docker lab phải đang chạy và có đầy đủ migration. Không dán C#/SQL trực tiếp
vào dấu nhắc PowerShell. C# sửa trong Visual Studio; SQL lưu trong migration
hoặc chạy qua psql/SQL Editor.

## Thứ tự học lại cùng Thịnh

1. Tự tính ví dụ 230000 doanh thu, 120000 vốn, 10000 phí vận hành, 20000 ads.
2. Theo controller -> service -> repository; chỉ ra bước nào tính và bước nào ghi DB.
3. Giải thích vì sao journal cần cân bằng ở cả Domain và database.
4. Đọc luồng khóa ID -> replay -> header/lines -> audit -> commit.
5. Phân biệt replay hợp lệ, conflict nội dung, validation và lỗi audit.
6. Chạy lại bài rollback và concurrent; kiểm tra số bản ghi thay vì chỉ xem HTTP.
