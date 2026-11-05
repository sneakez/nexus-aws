# Checklist backend 7 ngày — Thịnh và Dev 1

Ngày đối chiếu 05/11/2026. Nhánh codex/thinh-day6-frontend-api, PR #38.

Checklist này đối chiếu các contract, bàn giao và code đang có. Repo chưa chứa một bảng phân công đầy đủ từng ngày cho cả hai dev. Vì vậy các mốc dưới đây chỉ gán ngày khi tài liệu ghi rõ; không suy ra hoàn tiền bắt buộc từ số ngày đã làm.

| Hạng mục | Phần phụ trách | Bằng chứng | Kết luận |
| --- | --- | --- | --- |
| Auth Supabase, JWT và quyền theo profiles | Dev 2, nền tảng ngày 1 | DEV2_DAY1_HANDOFF.md; kiểm tra JWT, inactive profile, 401/403 trong ApiLab | Đã triển khai và có test |
| Khách hàng, đọc đơn, chi tiết và lịch sử | Dev 2 | Service/repository/controller; test backend và demo UI | Có API và UI. Form tạo đơn hiện dùng khách vãng lai |
| Catalog, kho, kênh và SKU mapping | Dev 1 | Module InventoryAndChannels và controller tương ứng | Có backend. UI bàn giao hiện hỗ trợ các thao tác đã liệt kê bên dưới |
| Tạo đơn và giữ tồn cùng transaction | Hai dev, ngày 3 | ApiLab kiểm tra thiếu tồn dòng sau, lỗi audit rollback và replay | Đã kiểm tra tích hợp |
| Xác nhận, chuẩn bị, xuất kho và nhả giữ khi hủy | Hai dev, ngày 3 | ApiLab và browser smoke | Đã kiểm tra tích hợp |
| Giữ đơn đồng thời, chống bán vượt tồn | Hai dev | Hai đơn tranh lượng cuối và request cùng khóa | Đã có test |
| Yêu cầu trả hàng và đọc lại | Dev 2, ngày 4 | ORDER_DAY3_DAY4_CONTRACT.md; test số lượng, quyền, replay | Phạm vi backend được ghi rõ hiện dừng ở request/read |
| ReturnInboundAsync | Dev 1 | PostgresInventoryContract.cs | Có implementation nội bộ. Chưa có luồng application nhận/QC để gọi; chưa có bài test riêng trong bộ test tìm thấy |
| Webhook giả lập, HMAC, retry, inventory audit | Dev 1 và tích hợp Dev 2 | PR #36; ApiLab 100 webhook và retry/replay | Đã kiểm tra kênh thử. Chưa nghiệm thu tích hợp sàn thật |
| Phí và contribution CM1–CM3 | Dev 2, ngày 4–5 | THINH_DAY5_HANDOFF.md; ApiLab; browser kiểm tra phí lẻ | Đã kiểm tra. CM hiện là ước tính, chưa điều chỉnh refund |
| Journal cân bằng Nợ/Có và audit | Dev 2, ngày 5 | API, deferred trigger và ApiLab | Backend có test. UI Bút toán đã gỡ theo yêu cầu của Thịnh |
| Frontend dùng API thật | Dev 2, ngày 6 | Typecheck, unit test, browser smoke và 58 tổ hợp màn hình/vai trò/kích thước | Đã có bản để nghiệm thu, cần Thịnh chốt UI và thao tác thực tế |
| Decimal tiền và schema đích | Dev 2 | Migration 20261105000000; đã áp dụng và kiểm tra Supabase chung | Thành tiền được giữ ở numeric(17,5) |
| CI, Docker và image publishing | Cấu hình chung, ngày 7 | Các check PR #38 đã qua | Đã kiểm tra build/test/image build. Workflow có bước publish khi merge |
| Triển khai và smoke test trên môi trường đích | Ngày 7 | Chưa có URL môi trường đã triển khai và kết quả nghiệm thu tương ứng | Chưa hoàn tất |

Phạm vi UI API thật đang có

- Kho có xem tồn, nhập/điều chỉnh và lịch sử.
- Khách hàng có xem/thêm. Chọn khách hàng từ danh sách trong form tạo đơn chưa được nối.
- Kết nối kênh có xem/thêm cấu hình. Mapping có xem/thêm. Các thao tác update/delete có ở backend nhưng chưa có đầy đủ UI.
- Đơn có tạo, xác nhận, chuẩn bị, xuất kho, hủy, lịch sử, phí và yêu cầu trả hàng.
- Báo cáo có contribution theo đơn và tổng hợp theo SKU/kênh. Tổng quan đơn lấy tối đa 100 đơn gần nhất.
- Định giá nhập tay tính giá tối thiểu theo chi phí và tỷ lệ.
- Bản API thật loại module mock khỏi bundle. Source prototype tham khảo vẫn tồn tại ở chế độ mock.

Nguồn quyết định phạm vi

1. docs/api/ORDER_DAY3_DAY4_CONTRACT.md ghi ngày 4 là return request/read, không tự QC, nhập kho hoặc hoàn tiền.
2. docs/guides/THINH_DAY5_HANDOFF.md ghi contribution/journal và giới hạn chưa điều chỉnh hoàn tiền.
3. docs/guides/DEV2_NGAY3_4_HOC_LAI.md ghi ngày 5 là CM/journal, ngày 6 frontend, ngày 7 triển khai.
4. docs/product/BUILD_PROMPT_UNIFIED.md mô tả prototype Noxus-V3 và tách riêng lộ trình backend. Refund/QC thuộc core của prototype đó; tài liệu này không đủ để kết luận chúng đã được giao vào đợt backend 7 ngày.
5. Các handoff cũ mô tả tình trạng tại lúc viết. Trạng thái code và test hiện tại được ghi riêng trong THINH_HANDOFF_READY.md.

Chưa bổ sung scope hoàn tiền hoặc QC vào đợt backend này chỉ dựa trên tài liệu prototype. Nếu kế hoạch gốc của hai dev có yêu cầu khác, cần đưa đúng checklist đó vào repo và đối chiếu lại.

Thứ tự nghiệm thu còn lại

1. Thịnh chạy tiếp ghi phí, xem CM, tạo/tra cứu yêu cầu trả và hủy đơn thứ hai bằng dữ liệu riêng.
2. Kiểm tra cùng luồng bằng tài khoản Kho; xác nhận quyền giá vốn/tài chính và thao tác tạo/hủy bị chặn.
3. Chốt các thao tác UI ở bảng trên có đúng phạm vi đã giao.
4. Review PR #38, cấu hình URL API/Auth cho image đích.
5. Triển khai và ghi nhận smoke test tại URL thực tế trước khi chốt ngày 7.

Không dùng kết quả test lab để thay thế việc nghiệm thu môi trường triển khai. Không đánh dấu cả hai dev hoàn tất toàn bộ phân công khi chưa có bảng phân công đầy đủ để đối chiếu.
