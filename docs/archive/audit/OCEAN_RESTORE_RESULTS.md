# Khôi phục Ocean UI và luồng theo role — 01/11/2026

## Nhánh và bảo toàn công việc

- Đã kiểm tra Git trước khi sửa; toàn bộ thay đổi và bằng chứng trước khôi phục nằm tại `codex/backup-before-ocean-restore-20261031`, commit `c52cf87c56e0a397bc121d355302be170f933783` (snapshot chính `c2434b5`, bổ sung log tại `c52cf87`).
- Nhánh kiểm toán: `codex/restore-ocean-role-flows`, nền backup `c52cf87`. Phần khôi phục, script và evidence được đóng gói trong commit chứa báo cáo này; chỉ xuất bản nhánh riêng, không merge main hoặc deploy. SHA nền trong các lượt chạy không phải commit khôi phục.
- Không dùng reset --hard hoặc xóa công việc. Chỉ lấy lại các phần UI đã đối chiếu, không đưa engine cũ đè lên các sửa nghiệp vụ.
- Đã đọc tree `b891421`: đây là merge commit có diff chủ yếu về README/env, nhưng tree thực tế có dashboard Ocean, các trang chuyên biệt và menu. Đối chiếu với `f801f38` xác nhận các sửa typecheck được giữ; không chọn nền chỉ theo tên commit.

## Giao diện đã phục hồi

| Khu vực | Kết quả |
|---|---|
| Shell/menu | Giữ sidebar Ocean, header, màu và bố cục cũ; gỡ lọc OPTIONAL_PAGES; bổ sung lại đường vào các route chuyên biệt trong nhóm menu gốc |
| Tổng quan | Dashboard kinh doanh với KPI, waterfall, biểu đồ và bảng kênh; Admin dùng màn Đồng bộ gốc, Kho dùng dashboard Vận hành gốc, để role thiếu quyền analytics không nhận dashboard tài chính |
| Xử lý đơn | Trả về FulfillmentPage: waves, SLA, picklist/labels và drawer đơn. Có danh sách đơn đã giao nhóm Kho, không thay cả trang bằng WorkQueue |
| Đổi trả | Trả về bảng, bộ lọc, KPI, form RMA và drawer gốc; thao tác dòng/receipt/QC/claim nằm trong hồ sơ chuyên biệt |
| Đồng bộ | Trả về SyncMonitorPage và bảng log; retry/reconnect source demo nằm tại trang này |
| Growth | Khôi phục MarketingAnalyticsPage gốc với bảng/đường/cột, export và bộ lọc; giữ engine số liệu hiện tại, ghi rõ trend ngày minh họa/chưa có attribution campaign |
| Audit | Giữ dạng header/card/table chuyên biệt; actor/tenant/scope từ engine hiện tại, không khôi phục tuyên bố SHA-256 bất biến chưa được chứng minh |
| Các module khác | Dòng tiền, chuyển kho, lô/kho, ledger, analytics, Founder, rules, simulator, webhooks và guide được mở lại theo whitelist role; không dùng tình trạng chưa nghiệm thu để ẩn module hàng loạt |
| Công việc & bàn giao | Trang riêng, chỉ chứa link đến chứng từ/trang xử lý; không có form, receipt, QC, điều chỉnh tiền hoặc business mutation |

Không đổi CSS/theme hoặc dựng hệ thống layout mới. Các chỉnh sửa bổ sung phục vụ quyền và hành vi: khóa nút tạo đơn/nhóm cột/tab tài chính khi thiếu capability, giữ modal/drawer theo viewport bằng portal, giữ header/footer modal khi body cuộn, và refresh nền để không tháo form đang thao tác trên cùng một đơn.

## Các sửa nghiệp vụ được giữ

`src/mock`, type nghiệp vụ và `analyticsService.ts` không có diff so với backup. Vì vậy không khôi phục lại engine tại b891421. Giữ nguyên:

- Chống replay/cộng tồn và tiền lặp; cùng ID khác payload bị từ chối.
- Nhận hoàn nhiều chứng từ, partial receipt, pending QC, good/damaged, serial và warehouse cụ thể; lỗi không ghi dở.
- Refund/Ads credit khác ID đến trễ vẫn được ghi nhận; không dùng version snapshot để bỏ giao dịch tiền hợp lệ.
- Quyền từ session/membership, không tin actorRole/actorId payload; kiểm tenant/shop/kho tại command và read scope.
- Phân công/hủy/ngoại lệ/claim có actor và lịch sử; tiền và hàng độc lập; PO partial/MAC và economics dùng chung engine.

Các handler cũ sửa trạng thái/tồn/tiền bằng generic update không được nối lại để lách command. Ví dụ thao tác nhận/QC trong drawer RMA gọi receiveReturnDock/inspectReturnQC; refund là kết quả nguồn tại đơn, fee adjustment đi qua reconcileFeeBreakdown.

## Kết quả thực chạy

| Kiểm tra | Kết quả thực chạy |
|---|---|
| Unit/integration | PASS 128/128, 19 file, exit 0 |
| Typecheck | PASS, exit 0 |
| Build Windows | PASS, exit 0; còn warning chunk >500kB |
| test:ui | PASS 10 nhóm qua các trang gốc |
| test:ui:edges | PASS 8 nhóm |
| test:ui:followup | PASS 119 lượt menu/trang, page errors rỗng |
| test:ui:login | PASS 5 role × 2 cách logout, 10 lifecycle + 1 ca email sai; gồm reload sau đăng nhập và sau logout; headless-shell, hai lượt đủ liên tiếp |

Dependencies được kiểm tra bằng npm ls --depth=0: đủ và không invalid, Chrome và headless-shell đã có; không cài thêm. Source hash/raw và Git blob IDs để kiểm toán độc lập nằm trong [manifest](../../artifacts/ocean-restore/source-manifest.json). Các lần chạy diễn ra 31/10–01/11/2026; xem timestamps UTC trong JSON/log. [Gate summary](GATE_SUMMARY.md) được sinh bằng `node scripts/ocean-gate-summary.mjs` từ evidence; application/config giữ nguyên byte so với các lượt unit/typecheck/build/Ocean UI trước đó, chỉ đổi runner login và thêm tùy chọn tương thích cho launcher.

Menu/trang được kiểm qua từng nút điều hướng, nội dung và lỗi render, có ảnh riêng; đây không phải kết luận rút ra từ số lượng unit test. Lượt menu bao gồm Owner43, Admin10, Manager38, Warehouse14, Growth14. Các role không được cấp thêm capability khi module được mở lại; deep link trái quyền vẫn bị chặn.

Luồng core kiểm độc lập từng mốc physical/reserved/pendingQC/available: 10/0/0/10 → 10/3/0/7 → 8/1/0/7 → 8/0/0/8 → 9/0/1/8 → 9/0/0/9. Growth thấy contribution -120000 rồi -80000 sau credit Ads40000. Không dùng output engine làm expected.

Ca edge: serial sai, returnless, RMA một phần nhiều đợt/mixed QC, reload, nhãn refund, phí +5000/reopen không cộng lại, chốt thiếu/claim/mở lại hàng đến muộn, PO partial, scope Growth/Kho và 4 trang ở 390px. Modal tạo RMA được kích hoạt bằng bàn phím qua UI; test không gọi store thay thao tác UI, localStorage chỉ dùng đọc để assert.

Các lần chạy đầu có FAIL được giữ/ghi nhận: reconnect nhầm connection.id với shop_id (đã sửa), thao tác khi drawer tải lại, và refresh làm unmount form Kho (đã sửa). Bài UI đã chuyển sang chờ DOM/kết quả command thay vì lấy network-idle làm bằng chứng app mock đã sẵn sàng. Không đổi số tiền/tồn kỳ vọng để làm xanh test.

## Ảnh và evidence

- [So sánh cùng 8 màn hình trước/sau](../../artifacts/ocean-restore/comparison.html).
- [Menu/trang theo role](../../artifacts/ocean-restore/menu-results.json), ảnh trong `artifacts/ocean-restore/menus`.
- [Luồng liên role](../../artifacts/ocean-restore/flow/results.json), [edge](../../artifacts/ocean-restore/edges/results.json).
- [Unit](../../artifacts/ocean-restore/unit-results.json), log typecheck/build/core/edges/menu nằm cùng thư mục evidence.
- [Manifest source](../../artifacts/ocean-restore/source-manifest.json), [tổng hợp kiểm chứng](../../artifacts/ocean-restore/verification-summary.json). HEAD trong evidence là nền backup, working tree mới là code khôi phục; không coi SHA backup là commit chứa UI này.

## Phần chưa xử lý/chưa kiểm chứng

- Unified Chrome 156 headless trên Windows có lỗi chuyển input sau reload trong bài login; các lượt FAIL vẫn giữ tại login-investigation. Runner login dùng headless-shell đã có sẵn và đã chạy đạt đủ 5 role tuần tự, cả chuột và Space, hai lượt đầy đủ liên tiếp. Không sửa UI/session để làm xanh test, không dùng DOM click chẩn đoán làm PASS. Chưa xác định nguyên nhân nội bộ Chromium; không nhận PASS cho unified headless. [Điều tra và kết quả](LOGIN_UAT_INVESTIGATION.md).
- Finance/Viewer giữ trạng thái bị tắt/không cấp quyền từ trước backup. CS chưa có TenantRole riêng. [Bảng quyền và đề xuất](OCEAN_ROLE_REVIEW.md) chỉ là đối chiếu; không tự bật/tắt/thêm role trong lần khôi phục.
- Full Maker/Checker chi tiền tay, exchange/warranty, mọi nút nâng cao của từng module và mọi form mobile chưa được nghiệm thu. Các trang được mở lại không đồng nghĩa mọi thao tác đã hoàn chỉnh. Các nhánh engine chưa hỗ trợ vẫn trả lỗi, không giả thành công.
- Một số dashboard/analytics nâng cao còn dữ liệu minh họa của prototype gốc; không coi trend/cohort/campaign demo là số liệu vận hành hoặc attribution thật.
- Không có backend/OAuth/sàn/carrier/tiền thật, DB concurrency hoặc nhiều tab ghi đồng thời. Chưa chạy Linux build trong lần khôi phục. Cảnh báo bundle >500kB còn nguyên.
- Claim paid có test command với transaction proof; UI edge chạy nhánh claim rejected/reopen, chưa chạy trọn việc chọn compensation rồi paid qua browser.

## Tự xem bản khôi phục

App local: http://127.0.0.1:5174/app. Bắt đầu ở Owner để xem đầy đủ menu/dashboard; đổi role ở tài khoản cuối sidebar. Các bước fixture/handoff và lệnh chạy test được cập nhật trong [README](../../README.md). App dùng dữ liệu demo, không cần cài lại dependencies hay cung cấp credentials.

Sáu màn hình chờ người dùng xác nhận: [Tổng quan](http://127.0.0.1:5174/app?page=dashboard), [Xử lý đơn](http://127.0.0.1:5174/app?page=fulfillment), [Đổi trả](http://127.0.0.1:5174/app?page=returns), [Đồng bộ](http://127.0.0.1:5174/app?page=syncMonitor), [Hiệu quả Ads](http://127.0.0.1:5174/app?page=marketingAnalytics), [Audit](http://127.0.0.1:5174/app?page=auditTrail). PASS tự động không thay thế xác nhận giao diện này.

Kiểm tra cuối và manifest: xem [verification-summary.json](../../artifacts/ocean-restore/verification-summary.json) và [gate](GATE_SUMMARY.md). App đã được xác nhận hiển thị dashboard Owner trong browser của Codex, ảnh owner-review.png. Không import dữ liệu khách hàng thật mới. Bản build sinh ra trong dist không phải artifact triển khai của nhánh kiểm toán; source và log build là bằng chứng tái tạo.
