> Tài liệu ghi nhận theo thời điểm trước. Trạng thái bàn giao mới nhất ở [THINH_HANDOFF_READY.md](THINH_HANDOFF_READY.md).

# Thịnh — journal UI, ngày 6 (05/11/2026)

## Đường dẫn
Chế độ thật: mục **Bút toán**, URL http://localhost:5173/app?page=cashWorkingCapital.
Chế độ mock giữ màn hình Dòng tiền cũ.

## API
- GET /api/v1/ledger-accounts: danh sách { id, code, name }, sắp code/id.
- GET /api/v1/journals/{id}: tra cứu bút toán theo UUID.
- POST /api/v1/journals: tạo hoặc replay cùng ID/nội dung.
- Cả ba chỉ cho manager/admin đang hoạt động; warehouse bị 403, chưa đăng nhập bị 401.
- Endpoint accounts là read model qua Application/Infrastructure; không thêm migration.
- Journal chưa có API danh sách; UI không hiển thị danh sách giả.
- Chọn tài khoản từ danh mục thật, không tự suy ra tài khoản từ tên hay số tiền.

## Tạo bút toán
- Số chứng từ, nguồn, tham chiếu UUID tùy chọn, 2–100 dòng.
- Mỗi dòng chọn tài khoản, Nợ/Có, số tiền dương với tối đa 2 số lẻ.
- Cộng/so sánh bằng BigInt theo đơn vị 0.01; không dùng cộng số thực để quyết định cân bằng.
- Backend và deferred triggers vẫn là lớp kiểm tra cuối.
- Lỗi mạng/5xx giữ ID/payload trong sessionStorage theo user; mở lại form để replay.
- 400/409 giữ draft cho chỉnh sửa. Không có sửa/xóa bút toán đã ghi trên UI.
- Không gửi thử bút toán lên database chung trong lượt triển khai này.

## Kiểm tra đã chạy
- Backend: 76 tests pass.
- HTTP lab thật: 185 assertions pass, gồm accounts manager/admin/warehouse/anonymous.
- Frontend: typecheck, lint các file mới và production build pass.
- Unit test journal tiền và route/role: 6 pass; toàn bộ frontend: 148 tests pass (21 files).
- Đã thêm vitest.config.ts và unitSetup.ts: cố định mock, URL/key giả và chặn fetch trong unit test để không đọc .env.local thật.
- Journal browser smoke: 18 assertions, HTTP/auth fixtures cô lập.
- Order browser smoke riêng: 48 assertions (xem biên bản ngày 6).
- Đã kiểm tra hình form journal mobile 390px.

## Chạy lại
~~~powershell
cd D:\noxus-aws\frontend
npm run typecheck
npm run test:ui:journals
npx vitest run src/tests/backendJournalRules.test.ts
~~~
Browser smoke cần Vite ở http://localhost:5173. Nó chặn mọi API request và không ghi DB thật.

## Quyền và shell
- Chế độ thật ánh xạ role admin/manager theo backend; warehouse không được trang journal.
- Chính sách role demo cũ được giữ khi không bật backend mode.
- Đã ẩn đổi role demo khi dùng tài khoản thật.
- Đã ngừng lấy badge đếm đơn/tồn từ mock trong shell thật; chưa thay bằng thống kê API.
- Những trang ngoài Order/Journal vẫn cần nối tiếp và kiểm tra; chưa chốt toàn bộ ngày 6.
