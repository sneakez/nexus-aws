# Luồng và bàn giao theo role

Ngày 30/10/2026. Các queue sinh từ cùng order/return/fee/source event; không có task manager tách dữ liệu.

## End-to-end theo role

| Role | Đầu vào → thao tác UI → đầu ra | Điều kiện hoàn tất / người nhận tiếp | Happy và edge đã chạy |
|---|---|---|---|
| Owner | Nạp fixture / kiểm scope → xem hàng–tiền–Ads → xem đề xuất và đối soát | Cấu hình lưu; quyết định có trạng thái; tiền được chốt bởi người có quyền | UI nạp fixture, cấu hình scope, mở lại đối soát; invariant/replay có test command |
| Admin | Event đúng shop → sửa trạng thái kết nối demo → retry | Đơn duy nhất trong queue Manager; last sync cập nhật | UI disconnected từ chối retry, reconnect rồi nhập A/B/C; replay idempotent có integration |
| Manager | Đơn nguồn → map nếu hold → giữ tồn/giao kho → theo dõi kho → nhận kết quả sàn → hoàn/khiếu nại/phí | Việc kho kết thúc độc lập; khoản tiền vẫn mở đến khi đối soát | UI hủy lúc đã đóng gói, ngoại lệ kho, partial RMA/refund, phí/credit muộn |
| Warehouse | Queue được giữ tồn → quét SKU/serial → đóng gói → in nhãn demo/bàn giao; hàng về → nhận từng đợt → QC từng lượng | Sau bàn giao mất khỏi queue chuẩn bị; sau nhận đủ/QC hết mất khỏi queue nhận; chênh lệch sang Manager | UI sai SKU/serial bị chặn, mixed QC, nhận hai đợt, PO partial; replay command có regression |
| Growth | Chọn shop/kỳ → xem nguồn/giữ lại/Ads → truy đơn → gửi đề xuất | Owner/Manager thấy đề xuất có dữ liệu, Growth thấy accepted/dismissed | UI số fixture, kỳ trống, đề xuất accepted, Ads credit kỳ sau trên cùng cohort |

## Ma trận handoff

| Người gửi → người nhận | Điều kiện / chứng từ | Người nhận thấy ở đâu | Khi bị chặn | Kết thúc việc này / việc còn mở |
|---|---|---|---|---|
| Admin → Manager | Retry nguồn thành công; khóa `(tenant, shop, channel_order_sn)` | dashboard → `release:<order>` | SKU thiếu mapping vào hold; Manager map/retry nghiệp vụ | Giữ tồn thành công → Warehouse; connector lỗi vẫn Admin xử lý |
| Manager → Warehouse | Shop/kho hợp lệ, không hold/hủy, đủ khả dụng; ledger reservation | `warehouse:<order>`, nhãn nhóm kho, hạn demo | Thiếu tồn không ghi dở; yêu cầu hủy làm kho dừng xuất | Đóng gói chưa kết thúc; chỉ bàn giao mới ra khỏi queue |
| Warehouse → Manager | Bàn giao + mã vận đơn hoặc bằng chứng thiếu/sai/hỏng | `carrier:<order>` hoặc `monitor:<order>` | Manager thấy kho đã giao nhưng sàn chưa nhận; hoặc hold có bằng chứng | Sàn kết luận giao/failed; đối soát vẫn độc lập |
| Warehouse → Manager sau hoàn | Receipt theo kho/dòng/serial; pass/fail; thiếu/hỏng | `discrepancy:<return>` + chi tiết nhận/QC | Cách ly lượng lỗi, không cộng khả dụng; Manager ghi kết quả bằng chứng | Khiếu nại chốt riêng; phí/refund không tự đóng theo QC |
| Manager → Owner/Manager tiền | Nguồn phí/refund/credit hoặc điều chỉnh có ID | `settlement:<order>` / Fee Reconciliation | Chưa có phí là blocked; không tự tạo phí giả | Đối soát mới kết thúc; sự kiện muộn mở lại queue |
| Đơn/đối soát → Growth | Metrics dùng chung fee, actual receipt/QC và Ads | Kết quả theo shop/kỳ; link order | Thiếu Ads/phí được gắn chưa đủ/chưa chốt | Cập nhật ngay sau mutation, không nhập lại |
| Growth → Owner/Manager | Đề xuất gắn order, contribution, Ads, nguồn | `recommendation:<id>` | Đề xuất mở trùng cùng order bị chặn | accepted/dismissed lưu và Growth xem được |

Group queue được phép chưa có assignee; UI ghi **Chưa phân công**. Owner/Manager có thể đổi assignee; `handoffAssignments` giữ toàn bộ lịch sử, không ghi đè lịch sử cũ. Assignment có test integration; UI điều khiển có triển khai nhưng không tính riêng là UAT đã chạy.

Chuyển role hoặc reload vẫn dùng cùng localStorage. UI test đọc localStorage để kiểm tra kết quả, **không gọi store để thay thế thao tác UI**. Mỗi lần chuyển role chọn một demo user khác; không dùng Owner làm hộ Manager/Warehouse/Admin trong chuỗi chính.

## Fixture cốt lõi

A/B/C có giá 1.000.000, vốn 600.000, Ads 100.000/đơn, đóng gói 20.000/đơn. A giao thành công phí 100.000; B đóng gói rồi hủy; C giao thất bại, thực nhận và QC đạt, phí 60.000.

| Mốc | Physical | Reserved | Pending QC | Available |
|---|---:|---:|---:|---:|
| Ban đầu | 10 | 0 | 0 | 10 |
| Giữ A/B/C | 10 | 3 | 0 | 7 |
| Bàn giao A/C | 8 | 1 | 0 | 7 |
| Hủy B hợp lệ | 8 | 0 | 0 | 8 |
| Nhận C | 9 | 0 | 1 | 8 |
| QC C đạt | 9 | 0 | 0 | 9 |

Contribution A/B/C = +180.000/-120.000/-180.000. Tổng -120.000; sales 1.000.000; Ads 300.000; tỷ lệ giữ lại 3,3333. Nguồn attribution giả định 3.000.000 → tỷ lệ nguồn 10. Credit 40.000 → net Ads 260.000, contribution -80.000, tỷ lệ 3,8462.
