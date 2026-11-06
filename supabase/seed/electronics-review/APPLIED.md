# Kết quả nhập dữ liệu điện tử

Ngày 06/11/2026. Đích Supabase chung kvljwzakehjrdxkqpqmw.

Đã thay dữ liệu nghiệp vụ cũ trong một transaction và nhập 50 sản phẩm, 17 thương hiệu, 3 kho, 9 bin, 150 dòng tồn, 40 khách, 4 tài khoản kênh, 200 mapping, 100 đơn, 189 dòng hàng, 109 khoản phí và 8 yêu cầu trả.

Có 313 dòng lịch sử trạng thái, 189 reservation, 244 inventory receipts, 451 biến động kho và 191 order operation receipts. Tồn thực tế, lượng giữ và tổng tiền được đối chiếu trước commit.

Tài khoản Auth/profiles và một bút toán hiện có được bảo toàn. Snapshot profiles, journal_entries và journal_lines bằng nhau trước/sau transaction.

Backup cục bộ trước khi thay dữ liệu nằm ngoài Git, chứa 21 file dữ liệu nghiệp vụ JSON, counts.json, protected.json và restore.sql. Đã khôi phục thử bản backup trước đó vào PostgreSQL riêng, đối chiếu đủ số lượng của 21 bảng, rồi thử nhập seed và kiểm tra các bất biến thành công.

Đường dẫn backup cuối cùng trên máy này
C:\Users\Admin\AppData\Local\NexusOMS\backups\supabase-before-electronics-20261106-164158

Frontend http://localhost:5175 đang dùng API http://localhost:5156. API được chạy với DataTarget Shared.

Dữ liệu này là bộ mẫu ngành điện tử đã duyệt. Các giá vốn, giá bán và giao dịch dùng để demo. Thuế mẫu bằng 0. Khi dùng cho hoạt động thật, thay bằng dữ liệu cửa hàng.

Các file CSV là đầu vào đọc hiểu. seed.sql chứa liên kết UUID, snapshot giá vốn, lịch sử, reservation, receipts và audit. Công cụ backend/tools/NexusOMS.ElectronicsSeed thực hiện kiểm tra đích, sao lưu, bảo toàn profiles/journals và transaction thay dữ liệu.