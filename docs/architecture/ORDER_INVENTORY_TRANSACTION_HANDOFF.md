# Order–Inventory transaction handoff

## Trang thai
- Contract da nhan InventoryTransactionContext.
- Dev 1 da ban giao PostgresInventoryContract va PostgresProductCatalogContract (PR #33).
- Da kiem tra repository huy/xuat voi Inventory that trong Docker lab.
- Da noi reserve vao CreateAsync; da dang ky DI va mo HTTP create/confirm/process/cancel/ship.
- Xem docs/guides/DEV2_NGAY3_4_HOC_LAI.md de hoc lai va demo.
- 66 unit test pass; repository lab va HTTP/Postman da kiem tra catalog/reserve/release/outbound, replay, rollback va concurrency.

## Transaction
- Order mo connection va transaction.
- Inventory dung context.Connection va context.Transaction.
- Inventory khong tu mo connection, commit, rollback hay dispose transaction.
- Order chi commit khi tat ca thao tac thanh cong.
- Loi truoc commit phai rollback Order, Inventory, ledger, audit va idempotency.

## Nghiep vu ton kho
- Reserve: tang reserved, khong doi stock; phai du available.
- Release: giam luong giu con lai cua dung don.
- CommitOutbound: giam stock va reserved cua dung don.
- ReturnInbound: cong stock cho hang tra da duoc duyet nhap.
- Available = stock - reserved.
- Stock va reserved khong am; reserved khong vuot stock.
- Can luu luong giu con lai theo OrderId + ProductId + WarehouseId.

## Idempotency
- reserve:{orderId}:{productId}
- release:{orderId}
- outbound:{orderId}
- return-inbound:{returnReceiptId}:{productId}
- Cung khoa, cung noi dung: tra ket qua cu, khong ghi ton/ledger lan nua.
- Cung khoa, khac noi dung: conflict, khong thay doi du lieu.
- Luu khoa, noi dung va ket qua cung transaction voi thay doi ton.
- Khoa nhap tra phai phan biet tung dot tra, khong chi dung OrderId.

## Dong thoi
- Khoa thao tac truoc khi kiem tra replay.
- Khoa ban ghi ton hoac update co dieu kien de chong oversell.
- Xu ly san pham theo thu tu ProductId thong nhat.
- Release va outbound cung don phai duoc tuan tu hoa.
- Kiem tra trang thai va luong giu con lai de khong tieu thu hai lan.

## Kiem tra tich hop bat buoc
1. Tao Order va reserve cung thanh cong.
2. Thieu ton mot dong: rollback Order va moi reserve truoc do.
3. Audit loi sau reserve: rollback toan bo du lieu va khoa thao tac.
4. Gui lai request: khong tao them don hoac giu ton lan nua.
5. Hai don tranh luong cuoi: chi mot don thanh cong.
6. Huy don: release dung mot lan.
7. Xuat kho: giam stock va reserved dung mot lan.
8. Huy va xuat dong thoi: khong am ton, khong tieu thu giu hang hai lan.

## Phan cong
Dev 1:
- Trien khai IInventoryContract voi transaction duoc truyen vao.
- Bo sung luu luong giu theo don va idempotency neu schema con thieu.
- Trien khai IProductCatalogContract.
- Ban giao class implementation, DI va migration can dung.

Dev 2:
- Noi reserve vao transaction tao don.
- Lam huy va xuat voi transaction chung.
- Chi mo endpoint khi co dependency that.
- Chay cac kiem tra tich hop ben tren.

## Can chot truoc khi mo API
- Chinh sach lam tron tien hien chua chot.
- Migration creation_request moi ap dung trong lab.
