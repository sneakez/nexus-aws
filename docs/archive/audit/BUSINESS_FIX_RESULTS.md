# Kết quả sửa nghiệp vụ và hợp nhất yêu cầu

> Báo cáo gốc đi kèm ZIP, mô tả lần chạy ở môi trường tác giả patch. Kết quả tích hợp và thực chạy trên Windows trong repo hiện tại nằm tại [ZIP_INTEGRATION_RESULTS.md](ZIP_INTEGRATION_RESULTS.md). Nhánh `fix/independent-audit-business-flows` và Linux build bên dưới là thông tin lịch sử, không phải nhánh/môi trường của lần tích hợp này.

Ngày 31/10/2026 — Asia/Ho_Chi_Minh.
Baseline: a5316c937efb882f807f6b7f61a35130f7d06637.
Nhánh local: fix/independent-audit-business-flows. Không push, merge hoặc deploy.

## Đã sửa

| Phát hiện kiểm toán | Sửa code/UI | Kiểm chứng |
|---|---|---|
| IA-01: bỏ sót giao dịch tiền đến trễ | Version ordering chỉ chặn snapshot delivery. Refund/Ads credit khác ID được cộng, giữ replay/conflict/limit guards | Refund + Ads đảo thứ tự; refund replay/conflict/over-limit; các test baseline |
| IA-02: returnless vào kho | Ghi cờ khi tạo; nhận/QC/queue kiểm cả branch và cờ; không tính dòng returnless vào lượng hàng đã trả; UI có lựa chọn returnless | Command từ chối receipt, queue rỗng, browser tạo phiếu không giao kho |
| IA-03: Growth lộ đề xuất shop khác | Getter lọc tenant và đơn được phép đọc; UI dùng getter | Command scope + browser đổi scope/reload, không còn đề xuất A |
| IA-04: Manager không phân công kho | Selector riêng gán task kho từ monitor; hỗ trợ nhận hoàn; lọc người theo shop/kho | Command history/out-of-scope; browser Manager gán → Warehouse thấy sau reload |
| IA-05: không tiếp tục khi hủy thất bại | resolveCancellation yêu cầu quyền, trạng thái chờ, lý do; UI từ chối/rút yêu cầu; giữ reservation | Command từ chối/rút, sai role, sau bàn giao; browser từ chối → nhặt/pack/giao |
| IA-06: refund hiển thị underpayment | orderPaymentLabel ưu tiên refunded_amount tại list/drawer, không đổi ngầm enum cũ | Browser drawer hiện “Đã hoàn tiền một phần” |
| IA-07: không kết thúc phần hàng thiếu | Chốt thực nhận không đụng tồn; chặn khi còn pending QC; claim độc lập; paid phải gắn compensation transaction đúng đơn; mở lại có lý do | Command chốt/reopen/paid-proof/QC; browser thiếu → chờ bồi thường → từ chối → mở lại → nhận/QC |
| Bổ sung: refund không được làm mất việc kho | Legacy return status refunded vẫn hiện outstanding physical work | Test snapshot tài chính đã refund nhưng còn chờ nhận |

UI nhận hoàn và QC vẫn dùng chung màn hình, không thêm role. Theo dõi bồi thường dùng phiếu hiện có và fee adjustment, không xây module claims riêng.

## Kết quả chạy

- 128/128 unit/integration PASS, 19 file: 118 baseline + 10 followup tests.
- Typecheck PASS; Linux build PASS, warning chunk >500 kB còn nguyên.
- Browser core: 14 nhóm PASS.
- Browser edge: 8 nhóm PASS.
- Browser followup: 5 nhóm PASS (mỗi nhóm gồm nhiều bước/assertions).
- Các bước browser tạo/mutate qua UI; localStorage chỉ đọc để assert.
- Bộ followup lần đầu bắt assertion trước khi drawer tải xong; đã thêm wait theo nội dung và chạy lại thành công, không bỏ assertion.
- Browser sử dụng Chromium headless với executablePath cấu hình; app source không thay vì môi trường test.

Evidence: artifacts/business-fix/unit-results.json, unit-run.log, typecheck.log, build.log, ui-results.json, ui-edge-results.json, ui-followup-results.json, source-manifest.json và ảnh.
JSON UAT ghi HEAD baseline + workingTree=true vì chạy trước commit kết quả. Manifest ghi hash source thật được kiểm thử. Không coi SHA baseline là SHA chứa code sửa.

## Đối chiếu file NexusOMS-Ban-hop-nhat (1).md

| Nội dung file | Quyết định hợp nhất | Lý do |
|---|---|---|
| Một kho, Website/Shopee/TikTok | Một kho vận hành mặc định, test scope nhiều kho; marketplace demo gồm Shopee/TikTok/Lazada, Website roadmap | Khớp nhu cầu đã chốt, không bắt đầu từ checkout Website |
| FR02 mapping chỉ thiết kế | Core prototype | Không map thì đơn mới không giao xuống kho được |
| FR10 đơn, FR14 báo cáo, FR15 đối soát, FR16 RMA là roadmap | Core prototype | Đây là chuỗi vận hành người dùng muốn kiểm thử |
| Chỉ physical/reserved/available xây thật | Giữ pending QC/damaged/unavailable đang hoạt động | Tránh cộng hàng hoàn hỏng vào available |
| Trừ kho → Confirmed/Rejected và tự hủy/hoàn đơn sàn khi thiếu hàng | Hold và người xử lý + chờ kết quả nguồn | Không giả định hệ thống đã được sàn chấp nhận hủy/hoàn |
| TTL thanh toán | Chỉ thiết kế cho Website/nhánh chưa thanh toán phù hợp | Không tự expire đơn sàn đã xác nhận |
| Kafka/SQS/Redis/gRPC/.NET/Postgres | Roadmap backend riêng | Không cần để mock E2E chạy; giữ kiến trúc hiện có |
| AI khiếu nại | Stretch/roadmap | Không chặn luồng xử lý thủ công |
| Gây lỗi → đo → ADR | Giữ nguyên nguyên tắc | Chỉ bổ sung công nghệ có lý do và bằng chứng |
| 7 Problems “đầy đủ” | Không dùng nhãn đó thay coverage | Một fixture PASS không chứng minh mọi trường hợp thực tế |

Prompt tự chứa: docs/product/BUILD_PROMPT_UNIFIED.md. Prompt đã có role/handoff, FR01–18, invariants, scope và test expectations. Không cần dán các prompt cũ nối tiếp nữa.

## Cách tự chạy

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run dev -- --host 127.0.0.1 --port 5174
```

Trong terminal thứ hai:

```sh
npm run test:ui
npm run test:ui:edges
npm run test:ui:followup
```

Puppeteer cần Chrome cài sẵn hoặc `npx puppeteer browsers install chrome`. Có thể đặt UAT_CHROMIUM_PATH tới executable phù hợp, UAT_BASE_URL tới server, UAT_OUTPUT_DIR tới thư mục kết quả. UAT_NO_SANDBOX=1 chỉ dành môi trường container cần chạy browser không sandbox; không phải cấu hình production mặc định.

Demo thủ công: Owner nạp fixture RAM-X → Admin retry A/B/C → Manager giữ hàng/giao kho; chọn monitor để phân công kho hoặc yêu cầu hủy. Warehouse thao tác trong queue. Manager mô phỏng kết quả nguồn/đối soát. Growth xem cùng dữ liệu. Với phiếu hoàn, Manager có monitor để chốt thiếu/theo dõi claim; hàng tới muộn mở từ mục “Hàng đến muộn sau khi đã chốt thực nhận”.

## Giới hạn và việc tiếp theo

- Không có backend/OAuth/sàn/tiền thật. Không kiểm chứng DB concurrency hoặc hai tab ghi đồng thời.
- Nhánh claim paid đã test command với transaction đúng/sai; browser followup chạy nhánh claim bị từ chối, chưa chạy riêng toàn bộ UI chọn compensation rồi paid.
- Khách rút hủy đã test command; browser chạy nhánh sàn từ chối. Mobile toàn bộ form mới chưa chạy.
- Listing nguồn hoàn toàn mới chưa có product_id: cần UAT mapping từ đầu; hiện không tuyên bố đã giải quyết đầy đủ ca này.
- Website reservation TTL, sync tồn ngược đầy đủ, API contract thực tế, multi-currency/country policy chưa triển khai.
- Giao thất bại trong fixture là kết luận hoàn về; giao thử thất bại rồi giao lại cần adapter/state semantics riêng.
- UI Growth còn dùng WorkQueuePage chung; tinh gọn theo role là cải tiến UX sau, không cần thêm dashboard mới.
- Claim paid hiện liên kết một giao dịch bồi thường/phiếu; nhiều khoản bồi thường từng đợt cần thiết kế thêm nếu thực tế phát sinh.
- Không có bảo đảm “không còn mọi P0/P1”; kết luận chỉ dựa trên ca đã chạy và giới hạn công bố.
