# Noxus-V3 — nghiệm thu prototype mock

> Báo cáo lịch sử trước phục hồi Ocean. Trạng thái mới nhất: [OCEAN_RESTORE_RESULTS.md](OCEAN_RESTORE_RESULTS.md).
Triển khai ngày 30/10/2026; kiểm chứng lại để đóng gói ngày 31/10/2026, Asia/Ho_Chi_Minh. Tài liệu này thay thế kết luận nghiệm thu trước đó.

## Phiên bản và kết luận

- Repository: https://github.com/sneakez/Noxus-V3/
- Branch: `refactor/prototype-marketplace-e2e`.
- Base HEAD và remote branch tại thời điểm kiểm chứng trước commit: `b70ec985dc7e78ab86e17e579d07242df13269df`.
- Bằng chứng kiểm thử ghi **base HEAD + working tree** trước khi tạo commit đóng gói. Commit bàn giao được xác định bằng `git log -1`; không thay HEAD lịch sử trong các JSON runner. Dấu vân tay code chạy test: [source-manifest.json](../../artifacts/uat/source-manifest.json).
- Trước sửa: checkout sạch; 101/101 test và typecheck PASS. Ba regression bổ sung đều FAIL. Báo cáo cũ “28/28 resolved” không chứng minh nghiệp vụ đã đạt.
- Sau sửa: **118/118 test PASS**, typecheck PASS, build Windows PASS; browser UAT chính **14 nhóm kiểm chứng PASS**, UAT edge **8 nhóm PASS**. Đây là phạm vi fixture đã thực thi, không chứng nhận mọi dữ liệu hay backend production.

## Phạm vi đã thực thi

Owner, Manager, Warehouse, Growth và Admin dùng các user ID khác nhau, cùng mock database bền qua reload. Owner/Manager đối soát; Admin không được sửa tiền; Warehouse không được kết luận giao thành công. Viewer bị loại khỏi selector và command; Finance tắt mặc định.

Core dùng các module sẵn có: dashboard/công việc, đơn hàng, kho, trả hàng, kết nối, đối soát và phân tích. `fulfillment`, `returns`, `syncMonitor`, `marketingAnalytics` dùng chung hàng chờ/chi tiết thay cho các handler cũ chỉ đổi cờ. Giữ shell Ocean.

## Bằng chứng

| Gate | Kết quả | Evidence |
|---|---|---|
| QC replay, fee replay, actor spoofing | PASS sau khi cả 3 FAIL trước sửa | `src/tests/handoverRegression.test.ts`, [unit-results.json](../../artifacts/uat/unit-results.json) |
| RAM-X checkpoints, tiền/Ads, đa shop, partial, serial, rollback, scope | PASS | `src/tests/commerceAcceptance.test.ts`, cùng JSON runner |
| Unit/integration toàn repository | 118/118 PASS | [unit-results.json](../../artifacts/uat/unit-results.json) |
| Typecheck | PASS | [typecheck.txt](../../artifacts/uat/typecheck.txt) |
| Build Windows | PASS, cảnh báo kích thước chunk | [build.txt](../../artifacts/uat/build.txt) |
| UI xuyên role, reload, Growth, fee modal, deep link, 390px | 14 nhóm PASS | [ui-results.json](../../artifacts/uat/ui-results.json) |
| UI nhiều dòng, ngoại lệ, serial, nhãn, nhận nhiều đợt, scope và PO | 8 nhóm PASS | [ui-edge-results.json](../../artifacts/uat/ui-edge-results.json) |

Chi tiết bước, expected/actual và phân biệt lớp test: [UAT_RESULTS.md](UAT_RESULTS.md). Bàn giao: [E2E_FLOW_MAP.md](E2E_FLOW_MAP.md). Phân quyền: [ROLE_PERMISSION_MATRIX.md](ROLE_PERMISSION_MATRIX.md).

## Giới hạn / vấn đề còn mở

- Không có P0/P1 core được biết còn mở trong hai fixture đã chạy. Không dùng kết luận này thay cho kiểm thử dữ liệu mới hoặc các module tùy chọn.
- **DEFERRED, đã ẩn route/sidebar:** chuyển kho UI, lô/bảo hành/đổi hàng, wave nâng cao, sổ kế toán, dự báo/velocity, cash working capital, cohort/CRM analytics nâng cao, Founder/OKR, automation/webhooks/rules lab. Danh sách chính xác là `OPTIONAL_PAGES` trong `src/lib/permissions.ts`. Command chuyển kho đã sửa kho đích và kiểm thử integration; chưa nhận nghiệm thu UI module đó.
- Các màn hình lõi còn lại dùng nguồn mock. Không có OAuth, vận chuyển, khiếu nại, Ads hoặc hoàn tiền thật. Không có attributed ROAS campaign; tỷ lệ giữ lại/Ads và tỷ lệ nguồn giả định được ghi riêng.
- `localStorage` không phải backend nhiều người dùng. Đã thử reload, đổi tài khoản trong cùng browser và cạnh tranh tồn mô phỏng trong một execution context. **NOT RUN:** ghi đồng thời từ hai tab độc lập, DB concurrency, backend Supabase thật, Linux build trong môi trường này, toàn bộ form trên mobile.
- Snapshot schema 3 được giữ lại khi nâng cấp. Phiếu cũ đã nhận/QC nhưng thiếu chứng từ dòng bị giữ để kiểm tra; không suy đoán và cộng tồn lại. Những dữ liệu lịch sử đó chưa được nghiệm thu tự động. Dùng fixture biệt lập để chạy demo tái lập.
- PO nhận theo số thực tế; demo coi hàng đã đạt kiểm đếm, nhập khả dụng và cập nhật MAC. Không tuyên bố module QC nhà cung cấp hoàn chỉnh.
- Build còn cảnh báo chunk >500 kB (P2 tối ưu tải). Không triển khai hoặc merge main. Commit/push đóng gói lên nhánh refactor không thay đổi phạm vi nghiệm thu.
