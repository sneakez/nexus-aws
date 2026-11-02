# Phản biện và sửa đổi đã triển khai

> Báo cáo lịch sử trước phục hồi Ocean. Trạng thái mới nhất: [OCEAN_RESTORE_RESULTS.md](OCEAN_RESTORE_RESULTS.md).
Ngày 30/10/2026. Đây là kết quả kiểm tra lại trên HEAD b70ec98 + working tree, thay thế bảng “28/28 resolved” cũ.

| Phát hiện / bằng chứng | Tác động | Quyết định và code đã triển khai | Kiểm chứng |
|---|---|---|---|
| QC lần hai vẫn success trong regression mới | Cộng tồn lặp | **Sửa**: receipt/QC theo ID và dòng; chỉ chuyển pending QC; kiểm lượng trước commit | 3 regression trước FAIL; sau PASS; mixed/over/negative/replay integration; UI nhận hai đợt |
| Receive cũ khóa cả phiếu và hard-code kho | Không nhận tiếp, sai kho | **Sửa**: receipt nhiều đợt, warehouse từ chứng từ/context; tự tạo dòng tồn đúng kho khi nhận lần đầu | Partial/mixed integration và UI; scope UI |
| Returns UI set received trước command dock | Toast nhận nhưng chưa cộng physical/pending | **Gộp** nhận/QC UI vào hàng chờ chung và gọi business command một lần | UI physical 8→9, available vẫn 8; sau QC available9 |
| Fee +5000 replay thành +10000 | Sai payout/lợi nhuận | **Sửa**: transaction ID, conflict check, lịch sử người/nguồn/lý do; phí âm, credit/bồi thường dương | Replay regression, hai ID cùng tiền, compensation integration |
| Modal không được nối tới nút và giữ số tích lũy cũ | Không có UI điều chỉnh thật / cộng lại khi mở | **Sửa**: nút mở cả phí đã chốt, input mới=0; ID mới theo lần mở | UI +5000, mở/lưu lại payout905000, một adjustment |
| `actorRole` payload thắng active session | Warehouse giả Manager | **Sửa**: session user + membership/capability/scope; bỏ fallback Owner; chặn generic bypass | Spoof/direct/CRUD/scope integration; deep link UI |
| Admin có quyền vận hành/tiền; Viewer/Finance vẫn trong selector | Quyền vượt trách nhiệm | **Sửa/ẩn**: Admin kỹ thuật; Viewer bỏ; Finance flag OFF áp cả context/route | RBAC + command; UI selector/finance deep link |
| Auth mock chọn user từ substring email, adapter luôn Owner | Audit sai người | **Sửa**: đăng nhập email khớp profile, membership hợp lệ; account commands thật; user ID audit thống nhất | Account/unknown login regression; UI nhiều demo user |
| Fee seed trỏ `ord_shopee_01`/`ord_tiktok_01` không tồn tại | Không drilldown đúng đối tượng | **Sửa**: gắn đơn seed thật, giữ scope từ đơn gốc | Fee regression và UI modal/link |
| Sidebar được coi là handoff | Không biết ai nhận và việc nào xong | **Bổ sung**: queue từ trạng thái, link đối tượng, nhóm/assignee/lịch sử, blocked/overdue/unassigned | Queue integration; UI qua 5 role/reload |
| Kho bàn giao đồng thời bị coi carrier accepted | Không truy ngoại lệ cập nhật chậm | **Sửa**: pending_pickup sau warehouse handoff; source accepted riêng | UI nhận nguồn; manager carrier queue |
| Hủy thiếu cảnh báo / có thể xuất sau hủy | Vừa hủy vừa xuất | **Sửa** request cancellation tách kết quả; chặn pick/pack/dispatch; chỉ giải phóng lượng đã giữ | UI packed B dừng xuất; inventory checkpoint |
| Giao thất bại bị suy ra đã hoàn về | Tăng tồn sớm | **Sửa** failed tạo RMA chờ, dock/QC riêng; refund riêng | UI và integration các mốc tồn |
| Báo cáo dùng 8% Ads, campaign/trend cố định; coi có RMA là hoàn vốn | Sai hiệu quả và vốn hàng chưa về | **Sửa/gộp**: commerceMetrics chung; vốn chỉ reverse lượng QC đạt; Ads spend giữ, credit riêng; nguồn/thiếu dữ liệu rõ | Fixture độc lập -120000/-80000; Order/SKU/Channel sums; UI Growth |
| SKU fallback bán ít nhất2 và phí benchmark | SKU lệch P&L | **Sửa**: phân bổ economics đơn theo line value, không tự tạo sales; aggregate tồn nhiều kho | Fixture assert tổng SKU = tổng contribution; gắn nghĩa phân bổ blended |
| PO nhận tất cả, không validation atomic hoặc MAC từng đợt | Vượt nhận, nhận nhầm dòng, lệch MAC | **Sửa**: validate toàn bộ request, create header/items nguyên tử, modal số thực nhận, MAC giữ precision | Integration PO partial/over; UI nhận1+3, reject4, MAC685714,2857 |
| Transfer command nhận lại vào kho nguồn / nhận kho không tồn tại | Sai vị trí tồn | **Sửa engine**, **ẩn UI tùy chọn**: source→in transit→destination thật, lane limit và ID replay | Integration dùng kho Đà Nẵng thật; UI DEFERRED |
| Adapter unknown RPC / journal mock trả success không ghi | Thành công giả | **Sửa**: unsupported RPC trả 42883; QC lỗi được propagate; user command thật; bỏ xác minh hash giả | Regression unknown RPC/QC, account mutations |
| Save storage nuốt lỗi | Reload mất giao dịch vừa báo thành công | **Sửa** persist trước đổi state, lỗi hiện banner và không commit | Inject quota regression; reload UI bình thường |
| Màn hình kế toán/dự báo/OKR/rules nâng cao chưa có bằng chứng hoàn chỉnh | Mở rộng phạm vi và tạo nhầm tưởng đã nghiệm thu | **Ẩn/để optional** qua OPTIONAL_PAGES; giữ code để không viết lại toàn bộ | Route whitelist + danh mục trong acceptance |

Giữ Ocean UI, danh mục sản phẩm, tồn 5 trạng thái, đơn và kết nối hiện có. Không thêm driver dispatch, CS/QC role riêng, backend production, máy quét hay OAuth thật. Không khẳng định module exchange hoạt động: command trả lỗi optional, không báo tạo đơn bù giả.
