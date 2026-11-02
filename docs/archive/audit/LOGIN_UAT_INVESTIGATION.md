# Điều tra login UAT — 01/11/2026

Không thay giao diện hoặc handler/session của ứng dụng trong lần đóng gate này. Thay đổi nằm ở runner và cách chờ/assert kết quả thật.

## Phân biệt ứng dụng và script

- Script cũ timeout khi chờ `#login-email` sau reload và Space. Tái hiện được ở Manager và Kho, không phải lỗi membership riêng của Kho. [FAIL gốc](../../artifacts/ocean-restore/login-investigation/original-20261031/ui-login-results.json), [lượt tái hiện](../../artifacts/ocean-restore/login-investigation/baseline/ui-login-results.json).
- [Trace](../../artifacts/ocean-restore/login-investigation/focus-trace/ui-login-results.json): activeElement là nút logout nhưng document chưa có focus, không có key/click vào nút. Chỉ bringToFront/focus emulation, tắt password bubble, page/browser mới, bỏ screenshot hoặc tăng screen đều vẫn có FAIL. Đây là các giả thuyết đã loại, không phải các bản sửa được nghiệm thu.
- [Chẩn đoán Chrome gốc](../../artifacts/ocean-restore/login-investigation/native-input-original-screen.json) và [screen lớn](../../artifacts/ocean-restore/login-investigation/native-input-fixed-screen.json): keyboard, mouse, chờ frame và bật lại input vẫn không tạo được sự kiện logout; DOM click cuối cùng gọi được handler và xóa session. DOM click này chỉ là probe phân loại, **không tính PASS của UAT**.
- [Cùng probe trên headless-shell](../../artifacts/ocean-restore/login-investigation/native-input-shell.json): ngay thao tác Space có keydown/keyup/click `trusted=true`, session bị xóa, form login xuất hiện. Không cần DOM click.

Nguyên nhân trực tiếp của timeout là runner coi việc gửi lệnh input là đã kích hoạt logout, trong khi unified Chrome/156.0.8078.47 headless trên máy Windows này không chuyển input vào trang sau reload. Chưa xác định nguyên nhân nội bộ Chromium. Evidence không chỉ ra handler logout của ứng dụng bị lỗi; lifecycle bằng input thật trên shell được kiểm tra riêng bên dưới.

## Bản sửa được dùng

`launchUatBrowser` nhận tùy chọn headless; mặc định `true` của các bài Ocean khác không đổi. Login dùng `headless: 'shell'` với binary đã có sẵn, không cài dependency. Đây là [chế độ Puppeteer hỗ trợ](https://pptr.dev/guides/headless-modes), không giả sự kiện bằng JavaScript và không đổi store/session để vượt bài kiểm tra.

Runner chờ đúng role và nội dung trang, bringToFront/focus trước bàn phím, rồi kiểm cả form login, workspace biến mất và `activeUserId=null`. Không lấy network-idle làm tín hiệu session đã sẵn sàng. Sau logout lại reload để phát hiện tự đăng nhập trở lại. Trace bắt buộc có click thật `trusted=true` lên đúng nút.

## Kết quả phải đối chiếu JSON

[Kết quả cuối](../../artifacts/ocean-restore/login/ui-login-results.json), [log cuối](../../artifacts/ocean-restore/login-run.log), [lượt shell đầy đủ đầu tiên](../../artifacts/ocean-restore/login-investigation/first-shell-full-pass.json). Bảng kết quả gate được sinh từ các checkpoint trong JSON, không gán PASS bằng tay.

Hai lượt shell đầy đủ liên tiếp đều PASS. [Đối chứng cùng script cuối trên unified Chrome](../../artifacts/ocean-restore/login-investigation/final-script-chrome/ui-login-results.json) vẫn FAIL ở Kho; được giữ là FAIL, không tính vào gate mặc định dùng shell.

<!-- LOGIN_RESULTS_START -->
| Role | Điền nhanh / đúng user | Reload giữ đúng user/role | Logout chuột và Space | Reload sau logout vẫn ở login |
|---|---|---|---|---|
| Owner | PASS | PASS | PASS | PASS |
| Admin | PASS | PASS | PASS | PASS |
| Manager | PASS | PASS | PASS | PASS |
| Warehouse | PASS | PASS | PASS | PASS |
| Growth | PASS | PASS | PASS | PASS |
<!-- LOGIN_RESULTS_END -->

Một browser/page duy nhất chạy tuần tự 10 lifecycle (5 role × 2 cách logout), giữ localStorage xuyên role, không reset session giữa các ca. Thêm ca email cũ không hợp lệ: không được fallback Owner. Ảnh reload/logout của từng role nằm cùng JSON.

## Tái chạy và giới hạn

Giữ app tại localhost:5174, chạy `npm run test:ui:login`. Mặc định ghi `artifacts/ocean-restore/login`; UAT_OUTPUT_DIR đổi nơi ghi, UAT_BASE_URL đổi server. `UAT_LOGIN_BROWSER=chrome` tái kiểm tra unified headless; không dùng kết quả shell để ghi PASS cho chế độ Chrome đó.

Các FAIL cũ còn nguyên trong login-investigation. Chưa nghiệm thu unified headless Chrome 156, browser/version khác, OAuth/backend thật hoặc membership production. Năm tài khoản ở đây là demo mock. Người dùng vẫn cần xác nhận sáu màn hình chính ở app đang chạy.
