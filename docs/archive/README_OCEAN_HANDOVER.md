# Noxus-V3 / NexusOMS — Ocean prototype

React/TypeScript, dữ liệu mock bền qua reload. UI gốc được phục hồi trên nhánh `codex/restore-ocean-role-flows`; dashboard và các trang xử lý chuyên biệt được giữ riêng. Công việc & bàn giao chỉ là danh sách link đến chứng từ.

> Phần triển khai mới sau `9a143e9`: [vận hành, tiền và công nợ mock](docs/implementation/OPERATIONS_MONEY_RESULTS.md), [quy tắc số liệu/quyền](docs/implementation/OPERATIONS_MONEY_CONTRACT.md). Báo cáo Ocean restore bên dưới là baseline lịch sử; kết quả source mới xem evidence `artifacts/operations-money`.

## Chạy app

```powershell
npm ls --depth=0
# Chỉ npm ci khi dependencies thiếu hoặc lệch package-lock.json.
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Mở http://127.0.0.1:5174/app. Mặc định dùng mock, không cần backend/OAuth/credentials thật. Đăng nhập dùng nút điền nhanh: owner@nexusoms.io, admin@nexusoms.io, manager@nexusoms.io, kho@nexusoms.io, growth@nexusoms.io. Mật khẩu mock không được xác thực, nút điền sẵn `demo`. Email lạ không tự thành Owner. Menu tài khoản cuối sidebar đổi demo user; menu dài có vùng cuộn, màn hình hẹp dùng nút ba gạch.

## Thử role và bàn giao trên các trang gốc

1. Owner → Mô phỏng → Nạp fixture RAM-X (có xác nhận thay dữ liệu demo). Nút Nạp ca nhiều dòng dùng cho serial, nhận nhiều đợt/mixed QC và PO. Scope tài khoản nằm ở Cấu hình.
2. Admin → Nhật ký đồng bộ → event A → Kết nối lại shop demo → Retry A/B/C. Đơn được chuyển cho Vận hành, không sinh trùng khi retry.
3. Manager → Đơn hàng → mở drawer từng đơn → Giữ tồn & giao kho, Phân công kho. Khi SKU chưa map: xử lý ở Ánh xạ SKU. Yêu cầu hủy dừng kho; lý do/kết quả nguồn quyết định hủy, từ chối hoặc rút.
4. Warehouse → Xử lý đơn → Đơn đã giao nhóm Kho → mở drawer → kiểm RAM-X, nhặt, đóng gói, nhập vận đơn, bàn giao A/C; để B packed để thử hủy. Ca nhiều dòng cần RAM-X và SERIAL-SECOND.
5. Manager → drawer Đơn hàng → Kết quả sàn mô phỏng & giao dịch tiền: A giao thành công, C giao thất bại. Kho không tự kết luận giao thành công.
6. Warehouse → Đổi trả → mở hồ sơ C → nhập lượng nhận từng dòng → Lưu thực nhận → nhập QC đạt/lỗi → Lưu kết quả QC. Manager xử lý phần thiếu, claim và mở lại hàng đến muộn ngay trong hồ sơ; tiền độc lập với hàng.
7. Manager → Đơn hàng ghi phí nguồn A100000/B0/C60000 → Đối soát phí → lưu. Refund/Ads credit dùng mã sự kiện riêng; giao dịch đến trễ cập nhật báo cáo. Điều chỉnh/bồi thường ở modal phí có mã giao dịch, lý do và actor.
8. Growth → Hiệu quả Ads → xem dữ liệu cùng engine, gửi đề xuất; Manager tiếp nhận tại báo cáo đó. Đổi scope rồi reload để kiểm tra giới hạn đọc.

Fixture A/B/C: available cuối9, sales1000000, Ads300000, contribution-120000. Ads credit C40000 → netAds260000 và contribution-80000. Bồi thường tách sales.

## Kiểm chứng

Giữ server local chạy trước các script browser:

```powershell
npm test
npm run typecheck
npm run build
npm run test:ui          # Luồng liên role qua các trang gốc
npm run test:ui:edges    # RMA, QC, refund/phí, PO, scope, mobile
npm run test:ui:followup # Từng menu/trang theo role và ảnh UI
npm run test:ui:login    # Đăng nhập/reload/đăng xuất 5 tài khoản demo
npm run test:ui:money    # Tiền sàn, nợ PO, ngoại lệ, scope, pricing và kỳ trống
```

Các script `commerce-ui-uat/edges/followup.mjs` cũ được giữ như lịch sử cho UI WorkQueue trước đây; npm scripts hiện trỏ sang các bài Ocean, không dùng kết quả cũ để kết luận UI mới. Puppeteer/Chromium đã có trên máy kiểm thử; không cài lại khi không cần. Launcher hỗ trợ UAT_CHROMIUM_PATH; các script Ocean dùng localhost:5174. Script login hỗ trợ UAT_BASE_URL và UAT_OUTPUT_DIR. Dữ liệu kiểm thử được tạo qua UI, localStorage chỉ đọc để assert nghiệp vụ.

Login dùng `chrome-headless-shell` đã cài cùng Puppeteer: unified Chrome 156 headless trên Windows kiểm thử không chuyển input sau reload. Bài login kiểm 5 role tuần tự trên cùng browser/page, cả chuột và Space, reload sau đăng nhập và sau logout. `UAT_LOGIN_BROWSER=chrome` dùng để đối chứng chế độ còn lỗi, không coi kết quả shell là PASS của chế độ đó. [Điều tra](docs/audit/LOGIN_UAT_INVESTIGATION.md). Sinh tổng hợp từ evidence bằng `node scripts/ocean-gate-summary.mjs`: [GATE_SUMMARY](docs/audit/GATE_SUMMARY.md).

[Báo cáo phục hồi, kết quả thực chạy và ảnh trước/sau](docs/audit/OCEAN_RESTORE_RESULTS.md). [Đối chiếu quyền và đề xuất Viewer/Finance/CS](docs/audit/OCEAN_ROLE_REVIEW.md). Các báo cáo audit/ZIP trước đó giữ nguyên làm lịch sử, không mô tả trạng thái UI mới nhất.

## Mốc bảo toàn công việc

- Nền UI đã xác minh: tree b891421, giữ các sửa typecheck của f801f38 và engine nghiệp vụ hiện tại.
- Backup trước phục hồi: codex/backup-before-ocean-restore-20261031, commit c52cf87.
- Nhánh kiểm toán riêng: codex/restore-ocean-role-flows; không merge main hoặc deploy.
- Viewer/Finance/CS chưa bị thay cơ cấu thêm trong lần này; xem bảng quyền riêng.

Các màn hình nâng cao được mở lại, không đồng nghĩa mọi thao tác của mọi module đã nghiệm thu. Backend/sàn thật, concurrency, exchange/warranty, full Maker/Checker và mọi chính sách sàn nằm ngoài bằng chứng hiện có; xem báo cáo cho ca cụ thể.

## Tiền / công nợ mock và fixture biệt lập

`VITE_DATA_MODE=mock` là mặc định trong source. Không cần Supabase thật hoặc secrets. Môi trường đã có dependencies/Chrome/headless-shell; kiểm `npm ls --depth=0` trước khi cài. Không ghi key thật vào Git.

Owner → Mô phỏng → **Nạp fixture tiền & công nợ** chỉ trong profile Guest/Incognito riêng. Tài khoản mock đầu kỳ200.000; hai đơn cùng shop1.000.000 +500.000. Đi theo luồng Admin nhập → Manager giao Kho → Kho bàn giao → nguồn giao → Manager đối soát → Dòng tiền lập batch/ghi chứng từ thực nhận → Growth đề xuất → Manager/Owner kiểm tra. PO nhận từng phần tạo nợ, chứng từ chi mới giảm tiền/nợ. Các nút không rút/chuyển tiền hoặc gửi yêu cầu NCC thật.

Không nạp fixture/reset/xóa localStorage tại browser demo đang dùng. UAT Puppeteer tạo browser/profile tạm; không dùng userDataDir của người dùng. Unit/integration chạy state in-memory. RAM-X vẫn riêng, giữ nguyên expected cũ.

Bài Ocean hỗ trợ `UAT_OUTPUT_DIR`; core/edge/menu và money dùng localhost:5174. Để chạy core/edge/menu bằng binary shell có sẵn trên máy Windows kiểm thử, dùng `$env:UAT_BROWSER_MODE='shell'` trước lệnh. Login và money chọn shell mặc định. Login còn hỗ trợ UAT_BASE_URL/UAT_LOGIN_BROWSER; launcher có UAT_CHROMIUM_PATH để trỏ binary đã cài. Không dùng kết quả shell nhận PASS cho unified Chrome khác chế độ.

Trang Order/SKU/Channel/Marketing có bộ chọn kỳ đơn theo ngày VN; dashboard chọn cùng kỳ để đối chiếu. Cash Working Capital là số dư hiện tại theo chứng từ, không đồng nhất với kỳ doanh thu. Ngoại lệ/assignee nằm trên drawer đơn/hoàn; WorkQueue chỉ link. Quy tắc, giá trị expected, checklist thủ công, kết quả PASS/FAIL/NOT RUN và phần chưa hỗ trợ nằm trong báo cáo mới.
