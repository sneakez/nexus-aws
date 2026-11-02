# Prompt hợp nhất NexusOMS — prototype vận hành và lộ trình backend

Ngày 31/10/2026, Asia/Ho_Chi_Minh.
Nguồn hợp nhất: yêu cầu vận hành Terus Tech; kiểm toán source a5316c9; file người dùng “NexusOMS-Ban-hop-nhat (1).md” cập nhật 28/10/2026; bản sửa trên nhánh fix/independent-audit-business-flows.

Dán nội dung từ “Nhiệm vụ” bên dưới vào Codex đã mở repo. Đọc báo cáo kiểm chứng đi kèm trước khi làm tiếp; không làm lại phần đã sửa nếu test vẫn chứng minh đúng.

## Nhiệm vụ

Bạn tiếp quản repository https://github.com/sneakez/Noxus-V3/ để hoàn thiện prototype NexusOMS cho Terus Tech. Hãy kiểm tra branch/HEAD, working tree, AGENTS.md và các tài liệu audit trước khi sửa; không reset hoặc ghi đè thay đổi. Baseline kiểm toán là a5316c937efb882f807f6b7f61a35130f7d06637. Bản sửa tiếp theo có thể nằm ở branch fix/independent-audit-business-flows; kiểm tra commit thực tế và diff, không mặc định remote đã chứa bản local.

Triển khai code và test, không dừng ở bản kế hoạch. Giữ Ocean UI và kiến trúc app hiện tại. Mục tiêu là chạy được công việc từng role và bàn giao liên role bằng UI, trên dữ liệu mock bền qua reload. Không tuyên bố đạt production hoặc mọi chính sách sàn.

## 1. Phân định hai mục tiêu, tránh xung đột tài liệu

A. Prototype vận hành — ưu tiên hiện tại:
- Một thương hiệu, một kho vật lý chính, nhiều shop; mock TikTok Shop, Shopee, Lazada.
- Giữ cấu trúc warehouse/tenant/shop scope để không hardcode; nhiều kho chỉ dùng test scope hoặc khi có nhu cầu thật.
- Mapping SKU, quản lý đơn, giữ chỗ, chuẩn bị hàng, bàn giao, hủy, hoàn/QC, đối soát và phân tích đều phải nằm trong core.
- Website là kênh tương lai/adapter riêng. Không áp TTL chờ thanh toán Website cho đơn sàn đã được xác nhận.
- Source events, phí, Ads và kết nối đều giả lập rõ. Không yêu cầu credentials/OAuth thật để nghiệm thu prototype.

B. Backend/lộ trình học .NET 18 tuần — tài liệu thiết kế riêng, chưa triển khai trong lần sửa prototype:
- .NET/PostgreSQL là hướng đã nêu trong tài liệu người dùng; không thay React/mock app thành backend giữa chừng.
- Modular monolith trước; tách service, Kafka/SQS/Redis/gRPC chỉ theo mục tiêu học hoặc bằng chứng tải, không là điều kiện bắt buộc để chạy luồng.
- Lưu ADR, contract, ERD và kế hoạch kiểm chứng. Chỉ triển khai backend khi người dùng yêu cầu giai đoạn đó.
- Không đưa tuyên bố hiệu năng, chi phí AWS, chính sách HMAC hoặc sự đảm bảo concurrency chưa đo vào báo cáo nghiệm thu.

Trong xung đột phạm vi, mục tiêu A quyết định chức năng prototype. Không dùng nhãn roadmap trong tài liệu backend để bỏ các màn hình vận hành core.

## 2. Role và giới hạn quyền

| Role | Trách nhiệm | Đầu ra/bàn giao | Không làm |
|---|---|---|---|
| Owner | Scope, tài khoản, kết quả kinh doanh, quyết định ngoại lệ/đối soát | Cấu hình có hiệu lực; khoản tiền có lịch sử | Không phải người cứu hộ cho luồng role khác |
| Manager/Vận hành | Đơn, mapping, hủy, CS, hoàn, ngoại lệ, đối soát theo quyền | Việc kho đủ thông tin; khiếu nại/tiền có người xử lý | Không sửa trực tiếp tồn/tiền để lách command |
| Warehouse | Nhặt, đóng gói, bàn giao, nhận hoàn/QC | Chứng từ thực nhận; lượng đạt/lỗi; bằng chứng lệch | Không kết luận giao thành công, không tự refund/đối soát |
| Growth | Hiệu quả shop/kỳ, chênh nguồn và thực giữ, đề xuất | Đề xuất có nguồn và trạng thái | Không thấy đơn/đề xuất ngoài scope |
| Admin | User kỹ thuật, connector, lỗi/retry | Đơn đồng bộ duy nhất đến Vận hành | Không tự có quyền sửa tiền |

Viewer bỏ khỏi mặc định. Finance/Kế toán không bắt buộc; Owner/Manager có thể đối soát. CS gộp Vận hành. Không thêm role chỉ để đủ bảng actors của tài liệu.

Quyền lấy từ execution/session context, không tin actorRole/actorId trong payload. Check capability + tenant/shop/kho ở mutation. UI chỉ là lớp hướng dẫn. Không gọi bảo mật localStorage là bảo mật production.

## 3. Các bất biến nghiệp vụ

### Đơn và tồn
- Định danh đơn nguồn gồm tenant, shop, channel và source order ID; retry không sinh thêm đơn/giữ chỗ.
- Chưa map SKU hoặc thiếu hàng: hàng chờ có lý do và đường xử lý; không tự hủy/hoàn đơn sàn như thể đã được sàn chấp nhận.
- Available = physical − reserved − unavailable; unavailable gồm chờ QC/hỏng theo mô hình hiện tại. Incoming không phải hàng bán ngay. Safety stock nếu dùng phải xác định rõ là mức cảnh báo hay phần trừ khỏi lượng publish; không trừ hai lần.
- Giữ chỗ không giảm physical. Bàn giao giảm physical và reserved đúng lượng. Hủy hợp lệ trước bàn giao giải phóng reserved, không tự tăng physical.
- Giao thất bại không chứng minh hàng đã về. Kho nhận thực tế → pending QC → lượng đạt vào available; lỗi cách ly.
- Nhận/QC theo chứng từ, dòng, kho và quantity. Replay đúng ID không áp lần hai. Nhận nhiều đợt khác ID vẫn hợp lệ. Lỗi phải rollback toàn bộ.
- Đơn nhiều dòng phải giữ đúng dòng còn lại khi hoàn một phần.

### Hủy
- Yêu cầu hủy là trạng thái chờ kết quả; kho dừng xử lý tương ứng.
- Chấp nhận hủy: hủy đúng một lần, giải phóng giữ chỗ đúng một lần.
- Từ chối/rút yêu cầu: cần lý do/kết quả nguồn, gỡ chặn nhưng giữ nguyên reservation và bước đã làm.
- Không dùng generic update để thay vòng đời.

### Hàng hoàn và khiếu nại
- Hoàn tiền không yêu cầu trả hàng: không task nhận hàng, không receipt/QC/cộng tồn. Hỗ trợ cả dữ liệu cũ có rma_branch và cờ mới.
- Nhận và QC có thể cùng màn hình, cùng người; vẫn lưu độc lập kết quả.
- Kho hoàn tất không tự đóng refund/phí/bồi thường.
- Thiếu vĩnh viễn: Vận hành chốt phần thực nhận có bằng chứng, không tạo lượng nhận giả. Chỉ chốt khi hàng đã nhận đã QC hết.
- Khiếu nại bồi thường có trạng thái chờ/đã nhận/từ chối riêng. “Đã nhận” phải tham chiếu giao dịch bồi thường đúng đơn, không tạo tiền lần nữa.
- Hàng đến muộn sau chốt: mở lại có quyền/lý do, nhận/QC đúng số còn lại.
- Không tự ép mọi delivery_failed là một lần giao không thành công tạm thời hoặc hoàn cuối cùng. Adapter phải làm rõ ý nghĩa sự kiện; nếu chưa hỗ trợ giao lại thì nêu giới hạn.

### Tiền và báo cáo
- Snapshot trạng thái dùng version để chặn quay lùi; giao dịch tiền khác ID phải xử lý dù đến trễ/sai thứ tự.
- Refund, Ads credit, fee adjustment, compensation có định danh riêng; replay không cộng lại; cùng ID khác payload báo lỗi; hai ID cùng số tiền vẫn hợp lệ.
- Refund không vượt tiền đơn; Ads credit không vượt Ads đã ghi theo mô hình prototype. UI phải phân biệt hoàn một phần với khách thanh toán thiếu.
- Phí nguồn và điều chỉnh phải nói rõ là snapshot hay delta. Không ghi phí cộng dồn bằng cách overwrite không có contract.
- Doanh thu giữ lại, giá vốn, phí, đóng gói, Ads đã chi, credit và bồi thường tách riêng.
- Hàng hoàn còn bán được không mất toàn bộ giá vốn. Bồi thường không là doanh thu bán hàng.
- Không gọi tổng doanh thu/Ads là attributed campaign ROAS khi không có attribution. Hiện nguồn, kỳ cohort, khoản chưa chốt và dữ liệu thiếu.
- Ngày UI theo Asia/Ho_Chi_Minh; timestamps lưu UTC. Đơn và giao dịch tiền có ngày riêng nếu mở rộng báo cáo dòng tiền.

## 4. Handoff phải chạy bằng UI

| Điểm giao | Người nhận thấy gì | Điều kiện ra khỏi hàng chờ |
|---|---|---|
| Admin → Manager | Đơn mới hoặc hold SKU, shop và lỗi nguồn | Mapping/giữ chỗ hợp lệ |
| Manager → Warehouse | Task chuẩn bị, lượng hàng, deadline, assignee hoặc nhóm | Bàn giao thực tế hoặc hủy hợp lệ |
| Warehouse → Manager | Thiếu/sai/hỏng hoặc đã giao chờ sàn nhận | Ngoại lệ được xử lý / kết quả nguồn |
| Kho hoàn → Manager | Thực nhận, QC, thiếu/hỏng, bằng chứng | Phần hàng có quyết định; tiền vẫn độc lập |
| Manager → người đối soát | Phí/refund/credit/bồi thường chưa chốt | Đủ dữ liệu và ghi nhận người xác nhận |
| Nghiệp vụ → Growth | Số liệu cùng nguồn, nguồn chưa chốt, thay đổi sau hoàn | Báo cáo cập nhật; không nhập lại |
| Growth → Owner/Manager | Đề xuất có số liệu và scope đúng | Accepted/dismissed có lịch sử |

Group queue không assignee là hợp lệ. Manager phải phân công được người kho trong scope từ màn hình theo dõi, không cần Owner. Đổi người phải giữ lịch sử. Các thao tác hằng ngày không cần mở simulator kỹ thuật; nguồn giả lập đặt rõ ở chế độ demo.

## 5. Ánh xạ 18 FR từ file hợp nhất

| FR | Prototype hiện tại | Backend/lab về sau |
|---|---|---|
| 01 Catalog | Core SKU/danh mục đủ để vận hành | API, upload ảnh; S3 nếu triển khai |
| 02 SKU mapping | Core, không được chỉ thiết kế | Adapter listing nguồn → SKU nội bộ |
| 03 Đa kho/chuyển kho | Một kho chính; scope kiểm thử; chuyển kho optional | ERD, mở rộng khi có nhu cầu |
| 04 Tồn nguyên tử | Command atomic trong mock, invariant tests | Transaction/conditional update trên Postgres + concurrency thật |
| 05 Safety stock | Rule đơn giản nếu cần; định nghĩa rõ | Kiểm chứng publish allocation theo kênh |
| 06 Sync tồn kênh | Trạng thái/queue/retry mock, nêu coverage | Outbox/worker; broker theo ADR, không bắt buộc Kafka ngay |
| 07 Webhook | Sự kiện giả lập, không tuyên bố xác thực thật | Xác minh signature/timestamp theo contract từng nền tảng |
| 08 Chống trùng | Core idempotency, không mất đơn/giao dịch | Durable uniqueness/transaction/outbox, cache chỉ tối ưu |
| 09 TTL/Saga | Hủy trước bàn giao, trạng thái đến trễ; Website TTL chưa xây | Web checkout reservation riêng; Saga chỉ khi có giao dịch phân tán |
| 10 Trung tâm đơn | Core, UI E2E; bulk action sau khi single-order đúng | API/filter/pagination/bulk atomicity |
| 11 Routing/tách/gộp | Optional, không ép vào core một kho | Thiết kế theo nhu cầu thật |
| 12 RBAC/tenant/audit | Core mock logic + evidence người thao tác | Auth/server enforcement/RLS/test BOLA |
| 13 Sổ XNT | Core log biến động và kiểm invariant | Đối soát job idempotent; lịch theo timezone cấu hình |
| 14 Doanh thu/lợi nhuận | Core dùng chung money engine | Report/query và dữ liệu ngày giao dịch |
| 15 Đối soát | Core phí/refund/credit/bồi thường; không là sổ kế toán | Integration statement/payout; thuế/hóa đơn ngoài scope hiện tại |
| 16 RMA | Core nhận/QC/refund/thiếu/hỏng; exchange/warranty optional | Contract từng kênh, workflow đầy đủ khi triển khai |
| 17 CRM/loyalty | Roadmap | Chỉ triển khai sau xác minh nhu cầu/identity |
| 18 AI khiếu nại | Roadmap/stretch, không chặn vận hành | Allowlist dữ liệu, PII, schema/fallback và test riêng |

Không dùng số FR đã đánh dấu làm bằng chứng nghiệm thu. Mỗi FR phải nêu mức: mock UI đã chạy / command đã test / thiết kế / chưa làm.

## 6. Test và tiêu chuẩn kết luận

Giữ baseline tests, browser UAT chính và edge. Thêm test cho lỗi phát hiện, không thay expected để hợp thức hóa implementation.

Bắt buộc cho từng role: happy case, edge case, sai quyền, scope, reload; có điểm nhận việc và người nhận tiếp. Không dùng Owner làm thay.

Các ca bắt buộc:
1. Success full chain: nhập đơn → giữ hàng → kho → bàn giao → nguồn giao → phí → Growth.
2. Hủy khi đang packed; chấp nhận / từ chối / rút yêu cầu.
3. Failed delivery → chưa cộng tồn → nhận → QC → đối soát.
4. Hoàn nhiều dòng/một phần; nhận nhiều đợt; mixed QC; serial sai.
5. Returnless không tạo hàng vật lý; refund vẫn có bằng chứng.
6. Hai shop cạnh tranh SKU, no oversell trong mock; không gọi đó là DB concurrency.
7. SKU mới chưa map: người vận hành chọn SKU đích được, không chỉ xóa mapping của fixture đã biết product_id.
8. Duplicate/source stale và hai giao dịch tiền khác ID đến sai thứ tự; conflict replay.
9. Chuyển scope Growth không lộ đề xuất cũ; mutation sai scope bị chặn.
10. Manager phân công kho, đổi người, reload; assignee ngoài scope bị từ chối.
11. Thiếu vĩnh viễn: đóng phần kho, claim còn mở; reject hoặc paid với giao dịch thật trong mock; hàng đến muộn mở lại.
12. Quota/storage failure không ghi dở; UI không báo thành công giả.

Fixture A/B/C độc lập:
- Initial RAM-X 10; sell 1.000.000; cost 600.000; mỗi đơn Ads 100.000, pack 20.000.
- A delivered phí 100.000 → contribution +180.000.
- B packed cancelled → -120.000.
- C failed/returned good, phí 60.000 → -180.000.
- Tổng sales 1.000.000; Ads 300.000; contribution -120.000; available cuối 9; retained ratio 3,3333.
- Ads credit C 40.000 → netAds 260.000; contribution -80.000; ratio 3,8462.
- Bồi thường ghi riêng, không tăng sales.
- Assert từng mốc physical/reserved/QC/available, không chỉ số cuối.

Nghiệm thu:
- PASS phải có assertion/evidence đúng ca; phân biệt command/integration/browser.
- FAIL/BLOCKED/NOT RUN/DEFERRED riêng. Browser không có thì ghi NOT RUN, không đoán PASS.
- Mô phỏng tuần tự không chứng minh race đa tab/DB; test backend thật cần môi trường riêng.
- Build/typecheck xanh không chứng minh E2E nghiệp vụ.
- Dữ liệu và công thức kỳ vọng độc lập engine. Không ghi thành tích throughput/latency/coverage chưa đo.

## 7. Cách tiếp tục làm và bàn giao

1. Đọc `docs/audit/BUSINESS_FIX_RESULTS.md` và test `src/tests/independentFollowupAudit.test.ts` để biết phần đã sửa.
2. Chạy baseline trên đúng HEAD; kiểm tra patch local đã được áp dụng chưa.
3. Ưu tiên gap nghiệp vụ còn mở; không dựng thêm stack backend khi chưa được yêu cầu.
4. Giữ mọi sửa đổi có thể review; cập nhật ADR ngắn cho lựa chọn có ảnh hưởng.
5. Bàn giao code, tests, script UI, ma trận role/handoff, kết quả thật và giới hạn; ghi branch/commit/dirty state.
6. Không deploy/merge vào main khi chưa được yêu cầu. Không coi prompt này là lệnh xóa module đang hoạt động.

Kết quả phải trả lời: đã sửa gì; role nào chạy được gì; giao việc ở đâu; ca nào đã chạy; còn gì chưa đúng/chưa kiểm chứng; người dùng tự test thế nào.
