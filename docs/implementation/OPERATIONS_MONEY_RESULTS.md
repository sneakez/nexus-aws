# Vận hành xuyên role, tiền và công nợ mock — kết quả triển khai

Ngày 01/11/2026. Prompt gốc: [OPERATIONS_MONEY_REQUEST.md](OPERATIONS_MONEY_REQUEST.md). Baseline 9a143e9ef020e586f0ae7b14cd6866488a6c89b8 trên codex/restore-ocean-role-flows. Trước sửa Git sạch; không reset về baseline, không cài lại dependencies. Đây là phần tiếp tục triển khai, không phải gói bàn giao sang phiên khác.

## Trước / sau và file chính

| Chức năng | Trước khảo sát trên source | Sau triển khai | File chính |
|---|---|---|---|
| Tiền sàn / tiền khả dụng | Số dư/lịch tiền cố định; nút rút chỉ đổi local state rồi báo như rút thật | Batch liên kết nhiều đơn; chứng từ nhận từng phần/đủ, ID/ngày/tài khoản/nguồn/actor; replay/chênh lệch; số dư từ engine | src/mock/finance.ts, src/mock/store.ts, CashWorkingCapitalPage.tsx, MoneyDialog.tsx |
| Công nợ PO | PO/nhận hàng chưa nối chứng từ công nợ và tiền | Nợ theo từng đợt nhận, supplier_id/PO/receipt; chi từng phần/đủ; hạn, overdue, đề nghị/xác nhận gia hạn mock; chặn trả vượt | store.ts, finance.ts, PurchaseOrdersPage.tsx, POReceiptModal.tsx |
| Dự báo | Lịch, burn 1,5M/ngày, CCC và nhận định an toàn cố định | Số còn phải thu/trả có nguồn/ngày, chưa rõ ngày riêng; không đếm lại đã thanh toán; DIO/DSO/DPO/CCC chưa đủ dữ liệu = null | finance.ts, analyticsService.ts, CashWorkingCapitalPage.tsx |
| Dashboard | Fallback doanh thu/chi phí, xu hướng chia đều và nhận định cố định | Giá trị thật của mock trong kỳ/scope, kỳ trống; quan sát có dữ liệu giải thích; cash bị giới hạn quyền hiển thị không có quyền thay vì 0 | analyticsService.ts, ExecutiveAnalyticsDashboard.tsx |
| Ads / economics | Healthy cố định, tổng doanh thu shop gắn attribution; ratio gross/net chưa rõ | Gross/credit/net riêng; net revenue / Ads net, thiếu dữ liệu khi Ads0; kỳ dùng chung; export ghi rõ chưa attribution | MarketingAnalyticsPage.tsx, analyticsService.ts, export.ts, EconomicsPeriod.tsx |
| SLA | Cùng critical cho gần/quá hạn; wave created_at+4h; 100% nếu không có breach; dashboard kho cố định | Helper chung theo deadline/shipped_at, sắp/quá hạn riêng, đúng/trễ khi đã bàn giao; thiếu mốc không kết luận; wave hoàn tất không countdown hiện tại | operations.ts, FulfillmentPage.tsx, OperationsAnalyticsPage.tsx |
| Giá bán | Bộ giả định cố định trong máy tính | Lưu giả định theo shop; thuế/phí tự cấu hình, tránh cộng trùng, cảnh báo biên thấp/âm/tỷ lệ không khả thi; không đổi giá sàn | ShopPricingAssumptions.tsx, PricingIntelligencePage.tsx, PricingWaterfallSimulator.tsx, metricsEngine.ts |
| Cảnh báo tồn/kênh | Nhận định và ngưỡng cố định | Đơn giao + tồn thật trong scope, thiếu lịch sử riêng; ngưỡng cấu hình và link nguồn, tỷ trọng net/kỳ rõ | operations.ts, InventoryObservations.tsx, OperationsThresholds.tsx |
| Trách nhiệm | Assignee/history đã có nhưng thiếu hạn/status/phân biệt actor kết quả | Ngoại lệ trên drawer gốc: phát hiện, xử lý, xác nhận, hạn và lịch sử; WorkQueue chỉ link | HandoffException.tsx, store.ts, workQueue.ts |
| Đổi trả nâng cao | Một số mô tả như đã có payout/đổi/bảo hành hoàn chỉnh; ghi chú QC fallback | Ghi rõ hồ sơ/mô phỏng/chưa hỗ trợ; không giả chi tiền/xuất bù/kiểm định; hàng và refund độc lập | ReturnsPage.tsx, ReturnActions.tsx |

Ocean shell/theme/menu và các trang chuyên biệt giữ nguyên. Không dựng màn hình tài chính mới: dùng trang Dòng tiền, bảng/modal gốc, thêm trường/thao tác cần thiết. Manager được phép vào route Dòng tiền đã có để dùng finance:view/reconcile hiện hữu; không thêm capability/role. Admin/Kho/Growth không có quyền thu/chi. Finance/Viewer vẫn tắt, không thêm CS. [Quy tắc chi tiết](OPERATIONS_MONEY_CONTRACT.md).

## Luồng và điểm bàn giao

1. Owner mở fixture MONEY trong browser biệt lập → Admin reconnect/retry hai đơn cùng shop tại Đồng bộ.
2. Manager giữ tồn, phân công → Warehouse nhặt, đóng gói, bàn giao tại Xử lý đơn.
3. Nguồn mô phỏng xác nhận giao → Manager nhận phí, đối soát trên đơn/modal phí. Delivered/đối soát không tạo tiền khả dụng.
4. Manager/Owner lập đợt nhiều đơn và ghi chứng từ thực nhận tại Dòng tiền. Growth xem economics trong scope, gửi đề xuất; Manager tiếp nhận. Owner đối chiếu đơn/tồn/contribution/chứng từ tiền.
5. Manager tạo/xác nhận PO → Warehouse nhận 1+3 từng đợt → nợ theo giá trị nhận → Manager/Owner chi từng phần/đủ → Owner xem tồn/nợ/tiền. Gia hạn chỉ là đề nghị trừ khi chọn xác nhận mô phỏng.
6. Ngoại lệ: Kho phát hiện → Manager ghi kết quả → Owner xác nhận, lưu riêng ba actor và lịch sử. Assignee không được tăng scope.

## Giá trị kỳ vọng độc lập của MONEY fixture

- Đầu kỳ tiền 200.000 VND; hai đơn 1.000.000 + 500.000; phí 100.000 + 50.000. Sàn dự kiến trả 1.350.000. COGS 2 × 600.000; đóng gói 2 × 20.000; gross Ads100.000. CM3 trước điều chỉnh = 10.000.
- Cash: 200.000 → nhận600.000 = 800.000 → nhận750.000 = 1.550.000. Replay cùng ID giữ nguyên; ID khác nội dung bị từ chối. Tiền sàn dự kiến đã nhận không còn tính ở dự báo.
- Refund đến trễ100.000, phí tăng20.000, Ads credit50.000: cash vẫn1.550.000; net sales1.400.000, phí170.000, net Ads50.000, CM3−60.000. Batch expected1.230.000, đã nhận1.350.000, chênh lệch120.000 cần xử lý; không sửa receipt hoặc tự trừ tiền.
- PO4 ×100.000: chưa nhận chưa có nợ; nhận1 tạo100.000, nhận3 thành400.000. Trả100.000 → cash1.450.000/nợ300.000; trả300.000 → cash1.150.000/nợ0. Physical10 → xuất2 =8 → nhập4 =12. Gia hạn không đổi tiền.
- RAM-X giữ nguyên các mốc 10/0/0/10 → 10/3/0/7 → 8/1/0/7 → 8/0/0/8 → 9/0/1/8 → 9/0/0/9 và contribution−120.000 → −80.000 sau credit40.000. Không sửa expected cũ để làm xanh test.

## Kết quả thực chạy

<!-- GATES_START -->
| Kiểm tra | Kết quả thực chạy | Phạm vi | Evidence |
|---|---|---|---|
| unit/integration | PASS | 142/142; 20 file | [file](../../artifacts/operations-money/unit-results.json) |
| typecheck | PASS | tsc --noEmit; exit0 | [file](../../artifacts/operations-money/typecheck.log) |
| build Windows | PASS | exit0; warning chunk >500kB | [file](../../artifacts/operations-money/build.log) |
| test:ui | PASS | 10 nhóm RAM-X | [file](../../artifacts/operations-money/core/results.json) |
| test:ui:edges | PASS | 8 nhóm edge | [file](../../artifacts/operations-money/edges/results.json) |
| test:ui:money | PASS | 30 ca xuyên role, tiền/PO/ngoại lệ/giá/scope | [file](../../artifacts/operations-money/browser/results.json) |
| UI rút yêu cầu hủy | PASS | 4 điểm bàn giao Manager/Kho | [file](../../artifacts/operations-money/withdraw/results.json) |
| test:ui:followup | PASS | 120 lượt menu/trang; không thay nghiệm thu nghiệp vụ | [file](../../artifacts/operations-money/menus/menu-results.json) |
| test:ui:login | PASS | 5 role × 2 cách logout; reload trước/sau logout | [file](../../artifacts/operations-money/login/ui-login-results.json) |

Lượt cuối chạy 01/11/2026; exit code/thời gian UTC: [code](../../artifacts/operations-money/code-gate-exits.json), [browser](../../artifacts/operations-money/browser-gate-exits.json), [tổng hợp](../../artifacts/operations-money/verification-summary.json). Browser UAT dùng shell; không suy ra PASS cho unified Chrome. Menu theo role: Owner43, Admin10, Manager39, Kho14, Growth14.

Source manifest khớp 188 file source/config/script; SHA256 **00465aad942fd861f0d1c1d71559ebe4e9ae85e89dd673cf493f13b19d647261**, application SHA256 **c7184a90164a70694d9112d8d90f93112edf7abbd9b9742b2d9eade2930f634e**. HEAD trong evidence là nền 9a143e9ef020e586f0ae7b14cd6866488a6c89b8; code đã chạy là working tree được manifest đóng dấu. Không coi SHA nền là commit tính năng mới.
<!-- GATES_END -->

Evidence baseline 9a143e9 ở artifacts/ocean-restore và docs/audit/GATE_SUMMARY.md là lịch sử; không dùng để nhận PASS cho source mới. Evidence mới: [source manifest](../../artifacts/operations-money/source-manifest.json), [unit](../../artifacts/operations-money/unit-results.json), [browser tiền](../../artifacts/operations-money/browser/results.json), [core](../../artifacts/operations-money/core/results.json), [edges](../../artifacts/operations-money/edges/results.json). Mỗi ca browser tiền ghi ID, role/user, màn hình, đầu vào, thao tác, expected/actual, người nhận tiếp và ảnh.

Các lần chưa đạt được giữ riêng: selector data-event không khớp data-source-event; click vào nút trong bảng cuộn không mở modal ở runner, chuyển sang keyboard activation thật và chờ modal; test kỳ trống phát hiện channel economics chưa lọc theo kỳ (đã sửa). Một số assertion cũ đòi luôn có ít nhất 3 khuyến nghị hoặc CCC luôn là số bị thay vì trái yêu cầu không bịa nhận định. Các test RAM-X/stock/money regression được giữ nguyên. DOM/localStorage chỉ đọc để assert trong browser; không gọi store thay thao tác UI. Test integration có setup fixture/injection riêng để kiểm rollback, không được coi là browser proof.

## Checklist nghiệm thu thủ công và giữ dữ liệu demo

1. App thường: http://127.0.0.1:5174/app. Giữ dữ liệu browser hiện có. Không bấm Nạp fixture ở phiên demo người dùng, không xóa localStorage hoặc đổi schema/reset seed để chữa lỗi.
2. Chạy fixture bằng browser/profile Guest hoặc Incognito riêng; tất cả script Puppeteer tạo profile tạm không dùng userDataDir của người dùng. Origin/profiles phải cách ly với browser demo. Trong phiên riêng: Owner → Mô phỏng → Nạp fixture tiền & công nợ (có xác nhận).
3. Đi theo sáu bước liên role ở trên. Kiểm tiền vẫn200k sau giao/đối soát; có chứng từ mới tăng. Mở chi tiết đợt để xem từng receipt và actor. Thử cùng ID cùng/khác amount; reload giữa các bước.
4. Sau nhận đủ, gửi refund/phí/credit mới bằng ID riêng; mở lại Dòng tiền: lịch sử nhận và cash giữ nguyên, khoản chênh hiện cần xử lý.
5. Tạo PO mới tên NCC demo, SL4 ×100k; xác nhận chỉ mô phỏng. Kho nhận1 rồi3; kiểm tồn/nợ. Thử trả vượt, trả từng phần/đủ. Đề nghị gia hạn không chọn xác nhận: hạn thực chưa đổi và không có tiền ra.
6. So cùng kỳ tại Order/SKU/Channel/Marketing và dashboard. Số dư Dòng tiền là hiện tại theo chứng từ, không phải doanh thu của kỳ đơn. Compensation tách sales; Ads0/kỳ trống/SKU mới không được gắn Healthy hoặc thay bằng dữ liệu mẫu.
7. Kiểm SLA trong cùng scope và danh sách; mở wave hoàn tất để xác nhận không tiếp tục đếm quá hạn. Thử Ngoại lệ tại drawer đơn: Kho phát hiện, Manager xử lý, Owner xác nhận.
8. Owner Settings giới hạn shop/kho cho Manager/Kho/Growth, reload và thử link trái quyền. Không dùng assignee để tự mở scope. Trả scope ban đầu ở phiên kiểm thử hoặc đóng profile tạm.
9. Giữ nguyên sáu trang chính để người dùng xác nhận: Tổng quan, Xử lý đơn, Đổi trả, Đồng bộ, Hiệu quả Ads, Audit; thêm Dòng tiền/PO để kiểm chứng phần tiền mới. Mở menu bằng nút ba gạch khi panel hẹp.

## Chưa hỗ trợ, giới hạn và lỗi còn mở

- Không backend/OAuth/sàn/carrier/ngân hàng thật; không DB concurrency, nhiều tab ghi đồng thời hoặc bảo đảm localStorage là hệ thống kế toán. Linux build chưa chạy. Build còn cảnh báo chunk >500kB.
- Khoản chênh âm sau sàn đã trả được nêu rõ để xử lý; chưa có chứng từ chuyển trả/thu hồi tiền sàn. Không tự lấy chi phí Ads/P&L làm chứng từ tiền ngân hàng. Chưa dựng thu/chi ngoài phạm vi tiền sàn và NCC.
- PO legacy đã nhận trước khi có chứng từ công nợ không được hồi tố đoán nợ/đã trả. DIO/DSO/DPO/CCC thiếu lịch sử vẫn unavailable; không dùng burn/CCC giả. Không có currency conversion đa tiền tệ.
- Maker/Checker chi tay, exchange/warranty, thao tác nâng cao từng module và toàn bộ form mobile chưa hoàn chỉnh/nghiệm thu. Claim paid chọn compensation qua browser chưa chạy trọn; engine regression có kiểm proof.
- Chưa có attribution campaign/impressions/clicks thật; chart ngày minh họa tại Marketing phải đọc nhãn. Chỉ số phân bổ SKU không phải attribution. Các module analytics nâng cao gốc ngoài phạm vi chưa được coi đã hoàn thiện.
- Unified Chrome156 headless trên Windows từng không chuyển input sau reload; login và lượt UAT mới dùng headless-shell đã có. Không nhận PASS cho unified headless từ kết quả shell. Click automation trong bảng cuộn chưa được coi là bằng chứng chuột đầy đủ; keyboard/browser UAT được ghi rõ, người dùng cần kiểm thêm thao tác chuột thực tế.
- Finance/Viewer/CS chỉ giữ quyết định cũ, không được triển khai thêm. Không ERP, AI, automation engine, chính sách vay/quỹ/pháp lý.

Không merge main hoặc deploy. Các phần chưa hỗ trợ ở trên là backlog, không ghi thành hoàn tất. Kiểm tra nguồn cuối dựa manifest và gate JSON, không dùng tổng lượt mở menu thay cho hoàn tất nghiệp vụ.

## Git / app ở thời điểm chốt kiểm chứng

Nhánh hiện tại `codex/restore-ocean-role-flows`, HEAD nền `9a143e9ef020e586f0ae7b14cd6866488a6c89b8`. Thay đổi chức năng mới ở working tree local, chưa commit/push; không merge main hoặc deploy. Source và runner đã chạy được đóng dấu bởi manifest188 file; tài liệu/tổng hợp evidence không đổi ứng dụng sau các lượt test. `dist/index.html` là output build phát sinh, không phải triển khai.

[Kiểm tra secrets và file](../../artifacts/operations-money/security-review.json): không thấy credentials/keys/URL có mật khẩu hoặc file node_modules/.env/key/dữ liệu nhập khách hàng mới trong phần thay đổi. Đây là scan mẫu cộng đối chiếu nguồn fixture, không phải chứng nhận an toàn production. [App health](../../artifacts/operations-money/app-health.json): HTTP200 tại localhost:5174/app. Work settings đang tắt điều khiển browser, vì vậy không thao tác/khẳng định đã kiểm lại tab người dùng trực tiếp; browser/profile fixture được tạo riêng và đóng sau UAT.

[Ảnh đối chiếu Ocean trước/sau](../../artifacts/operations-money/comparison.html). Ảnh gắn ca UAT và scope riêng; không dùng ảnh demo để khẳng định dữ liệu thật. Người dùng cần xác nhận thao tác chuột và các màn hình hiện tại trước nghiệm thu.
