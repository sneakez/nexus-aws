# Đối chiếu role khi phục hồi Ocean UI

Ngày 31/10/2026. Chỉ phục hồi UI và sửa quyền/nút/handoff; không thêm, xóa hoặc bật/tắt role trong lần khôi phục.

## Trạng thái được giữ

Engine, session và scope lấy từ backup `c52cf87`. Bản gốc `b891421` có 7 TenantRole: Owner, Admin, Manager, Warehouse, Finance, Growth, Viewer; không có CS riêng trong type/membership. Backup hiện có 5 role demo hoạt động, Finance bị chặn bởi ENABLE_FINANCE_ROLE=false và Viewer không có quyền. Đây là trạng thái trước lần khôi phục, không phải quyết định cơ cấu role mới của lần này.

| Role | Quyền hiện có / màn hình xử lý | Giới hạn |
|---|---|---|
| Owner | Governance, cấu hình scope/user, xem toàn bộ module được phép, phê duyệt/đối soát theo capability | Vẫn check session và tenant/shop/kho; không là fallback cho tài khoản lạ |
| Admin | Kết nối, retry sự kiện, users/settings/webhooks/audit; xem đơn/tồn/SKU | Không có quyền sửa tồn hoặc tiền/nghiệp vụ đơn chỉ vì là Admin |
| Manager | Đơn, mapping, giao kho/phân công, hủy, ngoại lệ, RMA, claim, đối soát; xem báo cáo | Không kết luận thay kiểm đếm của Kho; quyền luôn check ở command |
| Warehouse | Nhặt/đóng gói/bàn giao, nhập PO, nhận/QC, xem tồn trong scope | Không giao thành công/refund/phí, không tự sửa user/scope |
| Growth | Báo cáo và đề xuất theo đơn/shop trong scope | Không mutate đơn/tồn/tiền; đề xuất ngoài scope không được đọc/resolve |

Dashboard giữ component gốc: Owner/Manager/Growth dùng dashboard kinh doanh, Admin dùng màn hình Đồng bộ gốc, Warehouse dùng dashboard Vận hành gốc. Không dựng dashboard mới, không cấp quyền đọc chỉ số tài chính cho role thiếu analytics:view.

Các module cũ được phục hồi vào menu theo whitelist role, không lọc bằng OPTIONAL_PAGES nữa. Xóa bộ lọc module không mở thêm capability cho role. Deep link ngoài whitelist vẫn báo không có quyền.

## Viewer, Finance và CS: liệt kê và đề xuất, chưa áp dụng

| Role | Bản gốc / hiện tại | Đề xuất để người dùng quyết định |
|---|---|---|
| Viewer | Gốc: orders:view, products:view, inventory:view, analytics:view; đọc dashboard/orders/products/inventory/sales/customer analytics/guide. Hiện tại: quyền và route rỗng, đăng nhập demo bị chặn từ trước backup | Phục hồi quyền đọc theo tenant/shop/kho, không mutation; kiểm thêm export/PII và không tự cấp quyền phê duyệt |
| Finance | Có định nghĩa orders:view, purchasing:view, finance:view/reconcile/adjust/manage, analytics:view, audit:view. Route dự kiến: đơn, P&L, dòng tiền, ledger, phí, margin, doanh thu, audit/Founder/guide. Hiện flag tắt, không đăng nhập được | Nếu cần tách trách nhiệm: bật Finance sau quyết định; giữ đối soát tiền, tách quyền approve khỏi reconcile và chặn tự làm Maker/Checker. Không ghi tồn/kho hoặc đổi trạng thái giao hàng |
| CS | Không có TenantRole hoặc demo membership riêng trong tree đã kiểm tra. Một số mô tả cũ nhắc CSKH, không chứng minh có role chạy được | Có thể giữ nhiệm vụ trong Manager hoặc thiết kế CS sau. Quyền đề xuất: xem đơn được giao, ghi chú/khiếu nại, tạo yêu cầu hủy/RMA; không xác nhận hủy nguồn, hoàn tiền, sửa phí, restock/QC hay quản trị user |

Không bật Finance, phục hồi Viewer, tạo CS, đổi type TenantRole, thêm membership hoặc đổi cơ cấu role trong lần này. Bảng này là đề xuất; không dùng mô tả cũ trong form làm bằng chứng đã triển khai chính sách.

## Điểm xử lý và bàn giao

| Điểm bàn giao | Trang gốc / chứng từ | Người nhận tiếp |
|---|---|---|
| Admin nhập/retry đơn nguồn | Nhật ký đồng bộ → đơn nguồn | Manager tại Đơn hàng |
| Mapping/giữ tồn/phân công | Ánh xạ SKU / drawer Đơn hàng | Warehouse tại Xử lý đơn |
| Kho thiếu/sai/hỏng | Drawer đơn trong Xử lý đơn → bằng chứng chặn | Manager tại Đơn hàng |
| Bàn giao carrier, nhận trạng thái sàn | Kho bàn giao tại Xử lý đơn; kết quả sàn demo tại Đơn hàng | Manager theo dõi giao/RMA/tiền |
| Hoàn vật lý nhiều đợt/QC/thiếu | Bảng và drawer Đổi trả | Manager theo dõi claim; tiền độc lập |
| Phí/điều chỉnh/bồi thường | Đối soát phí, mã giao dịch và actor thật | Growth/Owner đọc cùng engine |
| Growth đề xuất | Hiệu quả Ads → đề xuất có trạng thái | Manager tiếp nhận ngay tại báo cáo đó |

Công việc & bàn giao chỉ hiển thị link đến các trang trên, không chứa form hoặc business mutation. Không dùng Owner thay các bước vận hành của Manager/Kho.
