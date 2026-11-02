# Tích hợp NexusOMS-fix (1).zip — 31/10/2026

> Báo cáo lịch sử trước phục hồi Ocean. Trạng thái mới nhất: [OCEAN_RESTORE_RESULTS.md](OCEAN_RESTORE_RESULTS.md).
Repo `D:\Noxus-V3`, nhánh `refactor/prototype-marketplace-e2e`, HEAD nền `a5316c937efb882f807f6b7f61a35130f7d06637`. Thay đổi hiện tại chưa commit, push, merge hoặc deploy. Giờ người dùng: Asia/Ho_Chi_Minh; timestamps evidence lưu UTC. Source hash: `2800a1e94c91501f3d7f33d8d7d64efa6534c90be8f91fa3adfb255461653976`.

## Đối chiếu và tích hợp

Đã giải nén và đọc README.txt, BUILD_PROMPT_UNIFIED.md, BUSINESS_FIX_RESULTS.md. ZIP chứa một patch 17 file, không chứa dependency mới hoặc evidence lịch sử. Working tree sạch trước khi tích hợp; HEAD trùng baseline patch. `git apply --check` thành công; áp dụng không xung đột. `git apply --reverse --check` sau áp dụng thành công, chứng minh toàn bộ patch đã có trong tree trước khi bổ sung tài liệu lần chạy này. Các sửa baseline về QC/fee replay/session identity, partial return/PO, scope và handoff được giữ và chạy regression.

Không triển khai thêm backend từ roadmap trong prompt. Báo cáo tác giả patch được giữ riêng trong BUSINESS_FIX_RESULTS.md; thông tin Linux/nhánh fix trong đó là lịch sử. Báo cáo này mô tả lần thực chạy tại máy Windows hiện tại.

| Phần tích hợp | Hành vi và điểm bàn giao |
|---|---|
| Tiền đến trễ | Version chặn snapshot delivery quay lùi; refund/Ads credit khác ID vẫn ghi nhận dù đến sai thứ tự, giữ replay/conflict/limit guards |
| Hoàn không nhận hàng | Lưu cờ và hỗ trợ branch legacy; không đưa vào queue Kho, receipt hoặc QC; không chiếm số lượng của phiếu trả vật lý |
| Growth scope | Getter đề xuất lọc theo tenant và đơn trong scope; UI dùng getter sau đổi scope/reload |
| Manager → Warehouse | Phân công chuẩn bị/nhận hoàn từ monitor, giữ lịch sử, từ chối người ngoài scope |
| Hủy bị từ chối/rút yêu cầu | Manager ghi lý do/kết quả, gỡ chặn kho và giữ nguyên reservation/bước đã làm |
| Nhãn hoàn tiền | List/drawer phân biệt hoàn một phần/toàn bộ với thanh toán thiếu |
| Hàng hoàn thiếu/claim | Chốt thực nhận sau QC, không tạo tồn giả; claim độc lập; paid tham chiếu đúng giao dịch compensation; mở lại khi hàng đến muộn |
| Tương thích snapshot cũ | Trạng thái tài chính refunded không làm mất công việc nhận/QC vật lý |
| UAT | Thêm followup script, dùng chung launcher và cấu hình browser/output; giữ core/edges assertions |

## Dependencies và kết quả thực chạy

`npm ls --depth=0` exit 0, không missing/invalid dependency; Chromium của Puppeteer đã tồn tại. Không chạy install/npm ci, không đổi package-lock.json. Chỉ thêm npm script test:ui:followup vào package.json.

| Lệnh | Kết quả tại máy này |
|---|---|
| npm test -- --reporter=json --outputFile=artifacts/business-fix/unit-results.json | PASS 128/128 tests, 19 file (118 baseline + 10 followup), exit 0 |
| npm run typecheck | PASS, exit 0 |
| npm run build | PASS Windows, exit 0, 6882 modules; warning chunk >500 kB còn nguyên |
| npm run test:ui | PASS 14 nhóm, exit 0; page errors rỗng |
| npm run test:ui:edges | PASS 8 nhóm, exit 0; page errors rỗng |
| npm run test:ui:followup | PASS 5 nhóm, exit 0; page errors rỗng |

Lượt UAT đầu bị ERR_CONNECTION_REFUSED vì chưa có server port 5174. Đã khởi động Vite local rồi chạy lại cả ba script thành công; không sửa assertion hoặc source để hợp thức hóa kết quả. Ảnh lỗi hạ tầng được lưu tên infrastructure-startup-failure.png, tách với JSON lần PASS. Không phát sinh lỗi code/test cần sửa thêm sau khi áp patch.

Evidence mới: [unit JSON](../../artifacts/business-fix/unit-results.json), [unit runner log](../../artifacts/business-fix/unit-run.log), [core](../../artifacts/business-fix/ui-results.json), [edges](../../artifacts/business-fix/ui-edge-results.json), [followup](../../artifacts/business-fix/ui-followup-results.json), [source manifest](../../artifacts/business-fix/source-manifest.json), [verification summary](../../artifacts/business-fix/verification-summary.json). UAT chạy trong browser biệt lập, tạo dữ liệu qua UI; DOM/localStorage chỉ đọc để assert. HEAD trong JSON là nền, không phải commit chứa phần tích hợp; manifest xác định hash source đã chạy.

## Tự kiểm thử role và handoff

App đang chạy ở http://127.0.0.1:5174/app, đã mở trong browser của Codex và để role Owner. Chưa nạp fixture vào browser thủ công để tránh tự thay dữ liệu demo đang có. Menu hẹp: nút ba gạch mở sidebar; tài khoản cuối sidebar đổi role.

1. Owner → Công việc & bàn giao → Nạp fixture RAM-X, xác nhận thay dữ liệu demo. Fixture nhiều dòng dùng nút riêng, serial SECOND là SERIAL-SECOND.
2. Admin → event A → Kết nối lại shop demo → Retry A/B/C; reload kiểm tra không sinh đơn trùng.
3. Manager → Giữ tồn & giao kho → mở monitor → chọn Phân công kho. Ghi yêu cầu hủy B rồi đổi Warehouse để kiểm tra bị chặn; Manager chọn từ chối/rút hoặc xác nhận hủy.
4. Warehouse → mở task → RAM-X → nhặt/đóng gói → nhập vận đơn → bàn giao A/C. Manager mô phỏng A giao thành công, C giao thất bại.
5. Warehouse → nhận hoàn C → nhận thực tế → QC. Manager xem phiếu monitor/chênh lệch, chốt phần thiếu và theo dõi claim. Hàng đến muộn mở lại bằng mục riêng; compensation ghi ở Đối soát trước khi xác nhận claim paid.
6. Manager → nhập phí A100000/B0/C60000 → chốt đối soát. Growth đọc cùng dữ liệu, gửi đề xuất; Manager tiếp nhận. Owner đổi shop scope Growth rồi đổi role/reload để thử giới hạn.
7. Manager → Tạo phiếu trả theo dòng hàng → chọn Hoàn tiền không nhận hàng; Warehouse không có task vật lý. Link Sự kiện muộn cho phép thử refund/Ads credit riêng.

Fixture core: available cuối 9, sales 1000000, Ads 300000, contribution -120000. Credit Ads C40000 → netAds260000, contribution -80000; compensation không tăng sales.

## Chưa kiểm chứng và giới hạn

- Không chạy Linux build trong lần này. Không có backend, OAuth, sàn/carrier hoặc tiền thật; không chứng minh DB concurrency hay hai tab ghi đồng thời.
- Claim paid có integration test với transaction proof; followup browser chạy nhánh claim bị từ chối, chưa chạy trọn UI chọn compensation → paid.
- Khách rút hủy có command test; followup browser chạy nhánh sàn từ chối. Chưa chạy toàn bộ form mới trên mobile; core có kiểm tra 390px.
- Listing nguồn hoàn toàn mới chưa có product_id chưa được UAT mapping từ đầu; ZIP nêu rõ gap này, không có implementation tương ứng để tích hợp.
- Website TTL, sync tồn ngược đầy đủ, giao thử thất bại rồi giao lại, multi-currency và nhiều khoản compensation từng đợt vẫn ngoài coverage hiện tại.
- UAT 5 nhóm không đồng nghĩa mọi edge/permission của mọi role đều đã chạy qua browser; xem tên test và JSON để phân biệt command/integration/browser.

Đã đối chiếu git blob hash của cả 15 file source/script/package với nội dung đích trong patch: khớp hoàn toàn. `git diff --check` sạch. Bản giải nén tạm đã dọn, ZIP gốc không thay đổi; dist/index.html được khôi phục đúng bytes nền vì chỉ là output build và sạch trước khi chạy.

Quét phần thay đổi không phát hiện private key, AWS access key, GitHub/Slack token, webhook/live key hoặc URL chứa credentials; không có đường dẫn node_modules/.env/key mới. Không có dữ liệu khách hàng thật mới được thêm bởi patch; node_modules giữ ở vùng ignored. Các ca và ảnh UAT sử dụng seed/fixture demo.
