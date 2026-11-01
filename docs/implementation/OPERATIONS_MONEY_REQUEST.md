Tiếp tục dự án Noxus-V3 trên nhánh codex/restore-ocean-role-flows.
Baseline tham chiếu: 9a143e9ef020e586f0ae7b14cd6866488a6c89b8.

MỤC TIÊU

Hoàn thiện prototype để kiểm thử vận hành xuyên role và liên kết:
1. Tài chính: lãi đơn, tiền chờ sàn, tiền thực nhận, công nợ phải trả.
2. Vận hành: đơn, tồn kho, giao hàng, hoàn hàng, cảnh báo.
3. Hệ thống: dữ liệu dùng chung, quyền, người chịu trách nhiệm và bàn giao.

Đọc code thực tế trước khi sửa. Các phát hiện bên dưới là đầu vào cần xác minh,
không được mặc định mọi thứ vẫn giống baseline.

A. RÀNG BUỘC BẮT BUỘC

- Giữ Ocean UI, theme, bố cục, menu, các trang chuyên biệt và đường điều hướng.
- Tận dụng card, bảng, modal/drawer hiện có; chỉ bổ sung trường/thao tác cần thiết.
- Không tự thêm/bỏ role, bật Finance/Viewer, tạo CS hoặc ẩn module.
- WorkQueue chỉ tổng hợp công việc và dẫn đến trang xử lý.
- Giữ toàn bộ sửa engine: replay, transaction rollback, session identity,
  tenant/shop/kho scope, partial receipt/QC/PO, refund/Ads credit đến trễ.
- Kiểm tra Git trước khi sửa, bảo toàn thay đổi hiện có; không reset về baseline.
- Không cài lại dependency nếu môi trường đang đủ và hoạt động.
- Không triển khai backend, OAuth, sàn/carrier/ngân hàng thật.
- Không triển khai thêm ERP kế toán, AI, bộ máy automation hoặc module nâng cao.
- Không merge main hoặc deploy.
- Các số liệu mô phỏng phải ghi rõ; thao tác demo không được thông báo như
  đã rút tiền thật, chuyển tiền thật hoặc được nhà cung cấp chấp thuận.

B. KIỂM TRA VÀ SỬA CÁC ĐIỂM HIỆN CÓ

1. Ads và hiệu quả kinh doanh
- Ads bằng 0: tỷ lệ hiển thị “Chưa đủ dữ liệu”, không NaN/Infinity,
  không tự gắn nhãn Healthy.
- Khi chưa có attribution campaign, dùng tên “Doanh thu giữ lại / Ads”
  hoặc tên đúng với công thức thực tế; không gọi tổng doanh thu shop
  là doanh thu gán thuộc.
- Phân biệt gross spend, Ads credit và net spend.
- Hủy/refund điều chỉnh doanh thu phù hợp; không tự xóa chi phí Ads.
- Compensation không cộng vào doanh thu bán hàng.
- Số liệu order/SKU/channel/dashboard phải giải thích và đối chiếu được
  khi cùng kỳ, scope và định nghĩa.

2. SLA
- KPI và danh sách đơn/wave dùng chung định nghĩa, phạm vi, mốc thời gian.
- Phân biệt sắp quá hạn, đang quá hạn và kết quả bàn giao đúng hạn.
- Wave đã hoàn tất không tiếp tục tăng thời gian quá hạn theo đồng hồ hiện tại.
- Không có dữ liệu đủ để tính thì hiển thị trạng thái phù hợp, không mặc định 100%.

3. Dashboard
- Loại bỏ số tiền fallback và nhận định cố định giả làm kết luận từ dữ liệu.
- Kỳ trống phải có empty state; không tự thay bằng dữ liệu mẫu.
- Phần minh họa còn giữ phải được gắn nhãn ngay tại biểu đồ/card.
- Không thay layout dashboard.

4. Đổi trả
- Kiểm tra nút Maker/Checker, đổi hàng, bảo hành và các thao tác nâng cao.
- Phần chưa hỗ trợ phải có trạng thái/giải thích rõ, không giả thành công.
- Không tự xây đầy đủ những module này trong đợt hiện tại.
- Tiền hoàn và hàng hoàn có trạng thái độc lập.

C. NỐI LUỒNG TIỀN VÀ CÔNG NỢ TRONG MOCK ENGINE

Đây là phần triển khai bổ sung được cho phép, trên các trang hiện có.
Không chỉ đổi local state của component.

1. Khoản phải thu từ sàn và tiền thực nhận
- Nối kết quả đối soát đơn với khoản thanh toán của sàn.
- Phân biệt: dự kiến, đã đối soát/chờ nhận, nhận một phần, đã nhận.
- Một khoản thanh toán có thể liên kết nhiều đơn.
- Chỉ chứng từ xác nhận tiền thực nhận mới làm tăng số dư tài khoản mock.
- Đơn delivered hoặc chốt đối soát không tự tăng tiền khả dụng.
- Theo dõi số tiền dự kiến, điều chỉnh, thực nhận và chênh lệch.
- Mỗi lần nhận tiền có ID, ngày, tài khoản nhận, nguồn tham chiếu,
  người ghi nhận và lịch sử.
- Replay không cộng tiền lần hai; cùng ID khác nội dung phải bị từ chối.
- Phí/refund đến sau khoản tiền đã nhận tạo điều chỉnh cần xử lý;
  không sửa ngược lịch sử nhận tiền hoặc tự trừ tiền hai lần.

2. Công nợ nhà cung cấp
- Liên kết khoản phải trả với PO/chứng từ và nhà cung cấp.
- Ghi rõ quy tắc ghi nhận nợ của prototype; không mặc định tạo PO là đã chi tiền.
- Hỗ trợ hạn trả, trả một phần, trả đủ và khoản quá hạn.
- Nhận hàng và thanh toán là hai nghiệp vụ độc lập.
- Chứng từ thanh toán mới làm giảm tiền và giảm nợ tương ứng.
- Chặn số âm, trả vượt số còn phải trả và ghi trùng.
- Gia hạn công nợ phải ghi ngày mới, lý do và trạng thái xác nhận mô phỏng;
  không mặc định “đã thỏa thuận” chỉ vì bấm nút.

3. Dòng tiền
- Số dư lấy từ số dư đầu kỳ và chứng từ thu/chi trong engine.
- Tiền chờ sàn không tính như tiền đã có thể chi.
- Dự báo lấy từ lịch dự kiến nhận tiền, hạn trả và khoản thu/chi có nguồn.
- Phân biệt dự kiến với thực tế; khoản chưa rõ ngày phải được thể hiện.
- Khi khoản dự kiến đã được thanh toán, không tính lặp vào dự báo.
- Không dùng ngày, burn rate, CCC hoặc nhận định an toàn cố định như dữ liệu thật.
- Reload và đổi role vẫn giữ dữ liệu nhất quán.

4. Phân quyền
- Dùng capability hiện có của Owner/Manager; không thêm role Kế toán.
- Admin không được sửa tiền.
- Warehouse nhận hàng/QC nhưng không ghi nhận tiền về, trả nợ hoặc refund.
- Growth chỉ đọc dữ liệu được phép và gửi đề xuất.
- Kiểm quyền tại command và read scope, không chỉ ẩn nút UI.

D. GIÁ BÁN, TỒN KHO VÀ TRÁCH NHIỆM

1. Giá bán
- Giữ máy tính giá hiện tại.
- Đưa các giả định phí/chi phí về cấu hình rõ theo shop/kênh khi phù hợp.
- Phân biệt giá vốn, phí sàn/thanh toán, voucher người bán chịu,
  đóng gói, Ads và khoản thuế/phí do người dùng cấu hình.
- Không hardcode một mức thuế cho toàn Đông Nam Á.
- Không cộng trùng chi phí đã nằm trong khoản khác.
- Phân biệt mô phỏng trước bán và kết quả thực tế của đơn.
- Cảnh báo biên đóng góp thấp/âm; không tự đổi giá bán trên sàn.

2. Cảnh báo hàng và kênh
- Dùng lịch sử bán/tồn thực trong mock engine để xác định hàng chậm bán
  và tỷ trọng doanh thu theo kênh.
- Các ngưỡng như 14 ngày, 80%, 24 giờ phải cấu hình được,
  không coi là chuẩn bắt buộc.
- Nếu chưa đủ lịch sử thì báo thiếu dữ liệu.
- Cảnh báo có đường dẫn đến SKU/đơn/kênh và dữ liệu giải thích.
- Tỷ trọng doanh thu phải ghi rõ dùng gross hay net và kỳ tính.
- Không dựng thêm module dự báo nâng cao hoặc hệ thống cảnh báo riêng.

3. Trách nhiệm và bàn giao
- Ngoại lệ có người/nhóm phụ trách, hạn xử lý, trạng thái và lịch sử.
- Tận dụng cơ chế assignee/hold/proposal hiện có.
- Phân biệt người phát hiện, người xử lý và người xác nhận kết quả.
- Không tự mở rộng phạm vi dữ liệu của người được phân công.
- KPI liên phòng ban phải truy được về cùng đơn/chứng từ.

Không triển khai “3 quỹ sinh tồn”, chính sách vay vốn, văn hóa doanh nghiệp
hoặc quy tắc pháp lý thành chức năng mới trong đợt này.

E. KIỂM THỬ END TO END QUA OCEAN UI

Luồng chính:
Admin nhập/retry đơn
→ Manager mapping/giữ tồn/phân công
→ Warehouse nhặt/đóng gói/bàn giao
→ nguồn mô phỏng cập nhật kết quả giao
→ Manager đối soát
→ Manager/Owner ghi nhận tiền sàn thực trả
→ Growth xem số liệu/gửi đề xuất
→ Manager tiếp nhận
→ Owner kiểm tra đơn, tồn, lợi nhuận và tiền.

Luồng mua hàng:
Manager/Owner tạo PO theo quyền hiện có
→ Warehouse nhận từng phần
→ theo dõi khoản phải trả theo quy tắc đã công bố
→ Manager/Owner thanh toán từng phần
→ Owner kiểm tra tồn, nợ và tiền.

Mỗi role phải có happy case và ca sai quyền/scope.
Kiểm tra điểm giao giữa các role, không chỉ thao tác riêng từng người.

Các ca bắt buộc:
- Hủy trước bàn giao; yêu cầu hủy bị từ chối/rút lại.
- Giao thất bại chưa tự cộng tồn; Kho thực nhận rồi QC.
- Hoàn một phần/nhiều đợt, QC tốt/hỏng, serial sai.
- Refund không nhận hàng không tạo việc nhận/QC.
- Phí/refund/Ads credit đến trễ và gửi trùng.
- Nhận tiền sàn một phần, nhiều đơn trong một khoản nhận,
  khoản chênh lệch và giao dịch trùng.
- PO nhận từng phần; trả nợ một phần; trả vượt bị chặn;
  gia hạn không làm đổi số dư tiền.
- Đơn có lãi nhưng chưa nhận tiền: tiền khả dụng không tăng.
- Tiền dự kiến đã nhận không bị đếm hai lần.
- Ads bằng 0, kỳ trống, SKU chưa đủ lịch sử.
- KPI SLA khớp danh sách trong cùng phạm vi.
- Reload giữa luồng; sai role/shop/kho; lỗi giữa command không ghi dở.

Giữ fixture RAM-X và các giá trị regression hiện có.
Tạo fixture riêng cho tiền/công nợ, không sửa kỳ vọng cũ để làm test xanh.

Mỗi ca ghi:
ID, role/user, màn hình, điều kiện đầu, thao tác, expected,
actual, người nhận bước tiếp theo và evidence.

Expected tồn/tiền phải tính độc lập trong fixture acceptance.
Không lấy output engine làm expected.
Không dùng số lượt mở menu thay cho nghiệp vụ hoàn tất.
Browser UAT thao tác qua UI; không gọi store để thay thao tác.
DOM/localStorage chỉ đọc để assert.
Chạy fixture trong môi trường biệt lập, không ghi đè dữ liệu demo người dùng.

F. GATE VÀ BÀN GIAO

- Chạy unit/integration phù hợp, typecheck, build.
- Chạy lại browser core/edge và các ca mới liên quan.
- Ghi riêng PASS, FAIL, NOT RUN, chưa hỗ trợ.
- Phân biệt browser, integration và kiểm tra thủ công.
- Không tuyên bố đã có backend thật, DB concurrency hoặc tích hợp sàn thật.
- Chỉ sửa lỗi trong phạm vi trên; vấn đề ngoài phạm vi ghi backlog.

Bàn giao:
1. Bảng trước/sau theo chức năng và file thay đổi.
2. Luồng theo role và các điểm bàn giao.
3. Quy tắc số liệu: tồn, doanh thu, contribution, công nợ, tiền thực nhận.
4. Evidence mới gắn với commit hoặc source manifest đã chạy.
5. Checklist thao tác thủ công để người dùng tự nghiệm thu.
6. Danh sách thiếu sót còn mở, phân biệt lỗi với tính năng chưa triển khai.

Giữ app chạy để người dùng kiểm tra.
Giữ nguyên Ocean UI. Không merge main hoặc deploy.