# UAT — triển khai 30/10, kiểm chứng đóng gói 31/10/2026

> Báo cáo lịch sử trước phục hồi Ocean. Trạng thái mới nhất: [OCEAN_RESTORE_RESULTS.md](OCEAN_RESTORE_RESULTS.md).
> Đây là bằng chứng baseline trước tích hợp ZIP. Kết quả mới nhất: [tích hợp và UAT followup ngày 31/10/2026](ZIP_INTEGRATION_RESULTS.md).

Branch `refactor/prototype-marketplace-e2e`; HEAD `b70ec985dc7e78ab86e17e579d07242df13269df` + working tree chưa commit. Dấu vân tay source: [manifest](../../artifacts/uat/source-manifest.json). Ngày/giờ JSON là UTC; UI vận hành theo Asia/Ho_Chi_Minh.

## Trước sửa

Chạy `npm test`: 101/101 PASS; typecheck PASS. Sau đó chạy riêng 3 test mới trong `handoverRegression.test.ts`: **3/3 FAIL**:

| Regression | Expected | Actual quan sát trong lần chạy trước sửa |
|---|---|---|
| QC lần hai | success=false; không áp tồn lần nữa | success=true; assertion từ chối replay FAIL |
| Cùng fee transaction +5000 gửi hai lần | payout1055000 | payout1060000 |
| Active Warehouse, payload Manager | success=false, state không đổi | success=true |

Đây là kết quả thực thi bổ sung, không suy ra từ tổng 101 test cũ. Không có browser UAT baseline mới trước sửa.

## Sau sửa — function và integration

`npx vitest run --reporter=json --outputFile=artifacts/uat/unit-results.json`: **118/118 PASS, 18 file**. [JSON runner](../../artifacts/uat/unit-results.json) có tên test và trạng thái từng test. Test expected inventory/money được ghi độc lập trong fixture acceptance, không lấy output engine làm kỳ vọng.

| Kịch bản | Expected / actual đã assert | Bằng chứng test chạy |
|---|---|---|
| Ba lỗi bàn giao | QC replay bị từ chối, fee1055000 sau replay, spoof bị chặn | `handoverRegression.test.ts`, 3 PASS |
| A/B/C xuyên role | Mọi mốc physical/reserved/QC/available trong flow map; contribution180000/-120000/-180000 | `commerceAcceptance.test.ts`, PASS |
| Ads credit40000 | netAds260000, contribution-80000, ratio3,8461538 | Cùng test fixture PASS |
| Order/SKU/Channel cùng nguồn | Tổng contribution cả ba=-120000 | Fixture test PASS |
| Nhận nhiều đợt / mixed QC | receipt2 rồi1; mixed pass1/fail1; available chỉ tăng lượng đạt | Integration PASS; không ghi dở khi negative/over |
| Serial hoàn không khớp | QC good bị từ chối, QC fail vào damaged, không tăng available | Integration PASS; UI receipt wrong-serial **NOT RUN riêng** |
| Hai credit cùng tiền khác ID / bồi thường | Hai khoản5000 hợp lệ, compensation7000 riêng; sales không đổi | Integration PASS; conflict replay bị chặn |
| Hai shop tranh cùng SKU | Chỉ một reserve khi available1; available0 | Promise concurrency mô phỏng PASS; không chứng minh DB/cross-tab concurrency |
| Unmapped → map → retry | Hold trước mapping; 3 đơn duy nhất, reserve1 sau retry | Integration PASS |
| Event cũ / trùng | Không đổi JSON snapshot; không kéo delivered về failed | Integration PASS |
| Partial multi-line | Refund1000000, sales còn1000000, COGS400000, dòng SECOND vẫn physical4 | Integration PASS |
| PO partial / MAC | Nhận1 rồi3 từ initial10×600000; physical14, MAC685714,285714; over bị từ chối | Integration PASS |
| Sai quyền / scope | Payload role, CRUD, generic mutate, thiếu user, Viewer, Admin tiền, tenant/shop/kho bị chặn | Integration PASS |
| Transaction lỗi giữa chừng / quota | Snapshot trước=sau, không commit audit/tồn dở | Integration injection PASS |
| Account/RPC | Tạo profile+membership thật, suspend thật, email lạ không Owner, RPC lạ và QC lỗi trả error | Integration PASS |
| Assignee và đề xuất | Lịch sử2 lần đổi còn đủ; proposal accepted được Growth thấy | Integration PASS; assignment UI **NOT RUN riêng** |

## Browser UAT chính

Chạy thật bằng Puppeteer/Chromium trên Vite localhost, UI tạo dữ liệu và thực hiện command. Script chỉ đọc localStorage/DOM để xác minh; không gọi store để làm thay UI.

**14 nhóm kiểm chứng PASS** trong [ui-results.json](../../artifacts/uat/ui-results.json); file có expected/actual, user/role, timestamp và HEAD + workingTree flag.

| Role / luồng UI | Expected | Actual / evidence |
|---|---|---|
| Owner nạp RAM-X | physical10, reserved0, available10 | [01.png](../../artifacts/uat/01.png), JSON checkpoint |
| Admin retry khi disconnected | Không nhập đơn, báo cần kết nối | JSON actual orders0; reconnect rồi nhập A/B/C |
| Manager giữ A/B/C | 10/3/0/7 | [03.png](../../artifacts/uat/03.png) |
| Kho scan sai, pack, giao A/C | Sai SKU bị chặn; 8/1/0/7; queue chỉ còn B | [04.png](../../artifacts/uat/04.png), DOM task count1 |
| Drilldown đơn B | Drawer mở đúng B | JSON: specific B document |
| Manager yêu cầu hủy B khi packed | Kho dừng xuất; sau kết quả hủy 8/0/0/8, vẫn tốn pack/Ads | [06.png](../../artifacts/uat/06.png) và JSON checkpoint |
| A delivered; C failed | Failed chưa làm hàng về | JSON 8/0/0/8 |
| Kho nhận C → reload → QC | 9/0/1/8 rồi 9/0/0/9; không còn việc kho | Các checkpoint JSON, ảnh đánh số trong artifacts/uat |
| Manager nguồn phí và đối soát | Phí A100000/B0/C60000; tiền ở queue cho tới khi chốt | Script thực thi từng order |
| Growth shop/kỳ và tiền | Sales1000000, Ads300000, contribution-120000, ratio3,3333, nguồn10 | [growth-before-credit.png](../../artifacts/uat/growth-before-credit.png) |
| Growth kỳ trống | Không fallback dữ liệu | JSON “No data”; select tháng trước |
| Growth → Manager | Đề xuất có số liệu, Manager accepted, lưu trạng thái | JSON và state/UI assertions |
| Late Ads credit | net260000, contribution-80000, ratio3,8462; reload còn đúng | [growth-after-credit.png](../../artifacts/uat/growth-after-credit.png) |
| Modal phí +5000, mở/lưu lại; Owner kiểm lại | payout905000, một adjustment; input mở lại=0 | [fee-reopen.png](../../artifacts/uat/fee-reopen.png), JSON expected/actual |
| Warehouse deep link phí / 390px | Route denied, không overflow ngang viewport | [mobile-warehouse.png](../../artifacts/uat/mobile-warehouse.png), JSON |

Một nhóm runner có thể bao gồm nhiều thao tác/assertion; không dùng số nhóm như số lượng nghiệp vụ đã phủ hết.

## Browser UAT edge

**8 nhóm PASS**: [ui-edge-results.json](../../artifacts/uat/ui-edge-results.json), ảnh `edge-1.png`…`edge-8.png`.

1. Warehouse báo thiếu hộp có bằng chứng → Manager bỏ hold sau xử lý; scan serial sai vẫn bị chặn (fulfillment còn allocated).
2. Serial đúng → nhặt/pack; nhãn in preview chứa tracking `MULTILINE-TRACK` và RAM-X×2. Chỉ kiểm nội dung nhãn demo, không thử máy in vật lý.
3. Manager tạo RMA chỉ RAM×2 trong đơn RAM×2+SECOND×1; trạng thái đơn vẫn delivered, tiền chưa tự refund.
4. Warehouse nhận1/QC pass1 → reload → nhận1/QC fail1. Physical RAM10, available9, damaged1; SECOND vẫn physical4. Hai receipt riêng.
5. Manager ghi xử lý chênh lệch; nguồn refund2000000. Đơn vẫn delivered, payment partially_paid, sales còn1000000.
6. Owner cấp Warehouse kho South → không thấy task hoặc tồn RAM ở North. Đây là scope UI, không đổi payload thay UI.
7. Khôi phục scope; PO UI nhận1 → status partial, physical11.
8. UI thử nhận4 khi còn3 → lỗi; nhận3 → status received, physical14, MAC làm tròn hiển thị685714.

## Gate khác và trạng thái chưa thực thi

- Typecheck PASS: [log](../../artifacts/uat/typecheck.txt).
- Build Windows PASS: [log](../../artifacts/uat/build.txt); còn warning chunk >500kB.
- `git diff --check` PASS.
- **NOT RUN:** Linux build hiện tại; backend thật/OAuth/sàn thật; thao tác đồng thời hai tab; toàn bộ mobile form; browser riêng cho replay event cũ, payload spoofing, đổi assignee và user CRUD (đã có integration tương ứng).
- **DEFERRED, ẩn UI:** modules trong `OPTIONAL_PAGES`. Không gắn PASS cho các ca UAT cũ 64 case chưa chạy lại. Không dùng test tổng để thay nghiệm thu các module này.
