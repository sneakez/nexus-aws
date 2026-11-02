# Ma trận role, session và scope

Ngày 30/10/2026. Phiên bản/evidence theo [PROTOTYPE_ACCEPTANCE.md](PROTOTYPE_ACCEPTANCE.md).

## Quyền thực thi

| Hành động | Owner | Manager | Warehouse | Growth | Admin |
|---|---|---|---|---|---|
| Xem đơn trong scope | Có | Có | Có | Có, phục vụ phân tích | Có, chẩn đoán |
| Map SKU / giữ tồn / giao kho / hủy | Có | Có | Không | Không | Không |
| Nhặt / kiểm SKU-serial / đóng gói / in nhãn demo / bàn giao | Có | Có theo capability | Có | Không | Không |
| Nhận hoàn / QC / báo ngoại lệ | Có | Có theo capability | Có, theo kho | Không | Không |
| Xác nhận kết quả giao từ mô phỏng sàn | Có | Có | Không | Không | Không qua command nghiệp vụ |
| Refund / nguồn phí / Ads credit / đối soát | Có | Có | Không | Không | Không |
| Phân tích contribution / đề xuất | Có | Xem và tiếp nhận | Không | Có | Không |
| Kết nối mock / retry nguồn đơn | Có | Xem và xử lý mapping | Không | Không | Có |
| Tài khoản / scope | Có | Không | Không | Không | Có kỹ thuật; không tự cấp Owner/Manager |
| Tạo PO / đặt PO | Có | Có | Không | Không | Không |
| Nhận PO | Có | Có | Có | Không | Không |

Finance tùy chọn, `ENABLE_FINANCE_ROLE=false`; không nằm trong luồng bắt buộc. Viewer legacy không có quyền/trang. Các trang nâng cao chưa nghiệm thu bị lọc bởi `OPTIONAL_PAGES` cho mọi role.

## Context thống nhất

`getExecutionContext()` yêu cầu `activeUserId`, membership đang active đúng tenant/role và profile active. `setActiveRole` là **bộ chuyển tài khoản demo rõ ràng**, chọn user thuộc membership; đây không phải cơ chế bảo mật production. Đăng nhập mock khớp email thực trong danh sách profile; email lạ không trở thành Owner.

`actorRole`/`actorId` trong payload cũ không cấp quyền, không đổi người ghi audit. `authorize()` kiểm capability và tenant/shop/warehouse, cả quan hệ đơn gốc của fee/return. Các command kho, đơn, tiền và cấu hình kiểm context tại lớp thực thi. Thiếu context bị từ chối.

`shop_ids` và `warehouse_ids` trên membership là scope; không khai báo nghĩa là toàn tenant. Owner/Admin cấu hình ở Công việc & bàn giao → Tài khoản demo & phạm vi được giao. Scope không có dữ liệu thì queue rỗng; không fallback sang kho/shop khác. Người được phân công phải có membership hợp lệ trong phạm vi.

Generic insert/update/delete/mutateTable không được đổi kho, tiền, các dòng giao dịch hoặc vòng đời đơn để đi vòng command. Các bảng tài chính/tồn/chứng từ bị khóa generic mutation; metadata được phép vẫn kiểm quyền và scope. Adapter trả lỗi khi command thất bại hoặc RPC chưa triển khai. Các getter chứng từ trọng yếu trả bản sao.

Audit ghi `userId` thật của session, thời điểm và nguồn; không gọi lịch sử client mock là chuỗi SHA-256 bất biến.

## Bằng chứng thực thi

- `handoverRegression.test.ts`: Warehouse + payload Manager bị chặn, dữ liệu không đổi.
- `commerceAcceptance.test.ts`: direct command, CRUD bypass, user thiếu context, Viewer, Admin sửa tiền, tenant/shop/kho ngoài scope; user CRUD và đăng nhập không fallback.
- UI chính: Warehouse mở deep link phí bị chặn; Owner/Manager lưu đối soát.
- UI edge: Owner cấp scope kho khác → Warehouse không thấy việc/tồn ngoài kho; xóa scope hợp lệ rồi nhận PO.
- Kiểm tra route chỉ là lớp UI; các test command ở trên vẫn bắt buộc.
