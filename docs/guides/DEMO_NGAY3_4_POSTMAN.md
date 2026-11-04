# Demo ngày 3–4 bằng Postman

## A. Cách nhanh để xem toàn bộ kiểm tra tự động

Trong PowerShell tại D:/noxus-aws, khi Docker lab đã sẵn sàng:

```powershell
dotnet run --project backend/tools/NexusOMS.ApiLab/NexusOMS.ApiLab.csproj -- --postman
```

Lab tự tạo dữ liệu, JWT chỉ dùng trong test, gọi API, kiểm tra database và dọn dữ
liệu. Đây là cách xem kết quả kiểm tra; không cần copy token lab ra ngoài.

## B. Demo thủ công với tài khoản Supabase thật của nhóm

1. Chạy API bình thường ở 5155, connection trỏ vào Docker nexus_lab.
2. Đăng nhập Supabase bằng request POST token?grant_type=password đã dùng trước đó.
   Lấy access_token của manager và warehouse, giữ riêng trong Postman environment.
   Không dán token/mật khẩu vào Git hoặc gửi lại chat.
3. Import postman/collections/NexusOMS-Day3-Day4.postman_collection.json và file
   postman/environments/NexusOMS-local.example.postman_environment.json.
4. Để có sản phẩm/kho mẫu, chạy trong PowerShell tại thư mục repo:

```powershell
./backend/tools/Seed-Day3Day4Demo.ps1 -EnvironmentFile ./postman/environments/demo.local.json
```

   Import environment vừa tạo; file .local.json được Git bỏ qua. Script không ghi đè
   file đã có, không reset tồn đang dùng. Điền managerToken/warehouseToken riêng.
   Sản phẩm mẫu có giá vốn 60000 và tồn ban đầu 20. Đặt runPrefix duy nhất, feeId/returnId là GUID mới. API tạo đơn nhận
   quantity 2, unitPrice 100000, tax 0, shippingFee 30000 trong collection.
5. Chạy collection bằng Runner. Sau mỗi lần chạy mới, đổi runPrefix, feeId và
   returnId. Nếu giữ nguyên sẽ là thử replay/duplicate chứ không phải tạo mới 201.

Khởi động API trong một PowerShell riêng (giữ cửa sổ mở):

```powershell
cd D:/noxus-aws/backend
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:Supabase__Url = "https://kvljwzakehjrdxkqpqmw.supabase.co"
$env:ConnectionStrings__Postgres = "Host=127.0.0.1;Port=25439;Database=nexus_lab;Username=postgres;Password=nexus-lab-only"
dotnet run --project src/NexusOMS.Api/NexusOMS.Api.csproj --no-launch-profile -- --urls http://localhost:5155
```

Đăng nhập thật vẫn do Supabase; database profile và nghiệp vụ trong demo là lab.
Nếu token đã hết hạn lấy token mới. Trình duyệt mở URL không tự gửi Bearer token.

## C. Kịch bản nói khi demo

| Bước | Gọi API | Điều cần giải thích |
|---|---|---|
| 1 | POST /orders bằng manager | pending, tổng tiền 230000, stock giữ 2, chưa xuất |
| 2 | Gửi lại cùng request | 200 và cùng OrderId, không giữ thêm |
| 3 | Cùng khóa đổi tiền vận chuyển | 409, đơn cũ không đổi |
| 4 | POST /orders/{id}/confirm | manager xác nhận, vẫn giữ tồn |
| 5 | POST /orders/{id}/process | warehouse bắt đầu xử lý |
| 6 | POST /orders/{id}/ship | shipped; stock và reserved cùng giảm 2 |
| 7 | Gửi lại ship | replay, không xuất lần hai |
| 8 | POST /orders/{id}/fees | commission 10000, fee và audit cùng transaction |
| 9 | POST /returns | yêu cầu trả 1 sản phẩm, chưa tự cộng stock/refund |
| 10 | Gửi yêu cầu trả quá lượng còn lại | 409 |
| 11 | GET profit-estimate | 230000 - 120000 - 10000 = 100000 ước tính |
| 12 | Dùng warehouse đọc fees/profit | 403 |

Để demo hủy, tạo đơn thứ hai với khóa/mã đơn mới rồi POST /orders/{id}/cancel:

```json
{
  "idempotencyKey": "demo-cancel-unique",
  "reason": "Khách đổi ý"
}
```

Manager được hủy trước xuất; physical stock không đổi, reserved được nhả. Không
hủy đơn shipped; luồng sau giao đi qua yêu cầu trả hàng.

## D. Kiểm tra tồn bằng SQL (chỉ nhập vào SQL Editor/psql)

```sql
select stock, reserved, stock - reserved as available
from public.inventory_items
where warehouse_id = 'WAREHOUSE_GUID' and product_id = 'PRODUCT_GUID';

select operation_type, idempotency_key, result_payload
from public.order_operation_receipts
where order_id = 'ORDER_GUID';
```

Tài liệu API đầy đủ: docs/api/ORDER_DAY3_DAY4_CONTRACT.md.
Tài liệu giải thích code: docs/guides/DEV2_NGAY3_4_HOC_LAI.md.

OpenAPI của API đang chạy: http://localhost:5155/openapi/v1.json (JSON, không phải Swagger UI).

## E. Dừng API nếu trợ lý đã chạy ẩn ở cổng 5155

Trong PowerShell, đoạn sau chỉ dừng process API đúng đường dẫn của project:

```powershell
$labListener = Get-NetTCPConnection -LocalPort 5155 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($labListener) {
    $labApiProcess = Get-Process -Id $labListener.OwningProcess
    if ($labApiProcess.ProcessName -eq 'NexusOMS.Api' -and
        $labApiProcess.Path -like 'D:\noxus-aws\backend\src\NexusOMS.Api\bin\*\net10.0\NexusOMS.Api.exe') {
        Stop-Process -Id $labApiProcess.Id
    }
}
```

Sau đó bạn có thể chạy lại bằng dotnet run trong terminal của mình và dùng Ctrl+C
để dừng bình thường. Không cần tắt tất cả dotnet hoặc Visual Studio.
