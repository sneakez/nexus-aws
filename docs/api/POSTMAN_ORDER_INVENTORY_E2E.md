# Postman E2E: Order - Inventory

Tài liệu này là checklist test sau khi Dev 2 public API tạo/chuyển trạng thái Order. Không tự đoán URL cho các endpoint Dev 2 chưa mở.

## Environment

```text
baseUrl=http://localhost:5145
accessToken=<Supabase JWT>
brandId=
productId=
warehouseId=
connectionId=
```

Mọi request nghiệp vụ gửi header:

```http
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

## Setup một lần

1. Tạo Brand, Product, Warehouse.
2. Nhập 10 sản phẩm vào kho:

```http
POST {{baseUrl}}/api/v1/inventory/receipts
```

```json
{
  "warehouseId": "{{warehouseId}}",
  "productId": "{{productId}}",
  "quantity": 10,
  "idempotencyKey": "setup-receipt-001"
}
```

3. Tạo Channel Connection và SKU Mapping để `channelSku` map được sang `productId`.
4. Kiểm tra baseline:

```http
GET {{baseUrl}}/api/v1/inventory?warehouseId={{warehouseId}}&productId={{productId}}
```

Kỳ vọng: `stock = 10`, `reserved = 0`, `available = 10`.

## Test sau khi API tạo Order được mở

Dev 2 cần công bố URL tạo Order. Request body dự kiến từ `CreateOrderRequest` là:

```json
{
  "idempotencyKey": "order-e2e-001",
  "orderNumber": "E2E-ORDER-001",
  "customerId": null,
  "warehouseId": "{{warehouseId}}",
  "tax": 0,
  "shippingFee": 0,
  "items": [
    {
      "productId": "{{productId}}",
      "quantity": 2,
      "unitPrice": 100000
    }
  ]
}
```

Sau khi Order confirmed + Reserve thành công, gọi lại `GET /api/v1/inventory`.

| Field | Kỳ vọng |
| --- | ---: |
| `stock` | 10 |
| `reserved` | 2 |
| `available` | 8 |

## Acceptance bắt buộc

| Case | Thao tác | Kỳ vọng |
| --- | --- | --- |
| Idempotency | Gửi lại cùng request `order-e2e-001` | Không có Order/reserve/stock transaction mới |
| Key conflict | Cùng key, quantity khác | `409 Conflict`; tồn không đổi |
| Thiếu tồn | Tạo đơn quantity 11 | Không có Order, `reserved` vẫn 0 |
| Cancel | Huỷ Order đang reserved | `reserved` giảm về 0, `stock` vẫn 10 |
| Ship | Xác nhận đơn 2 rồi xuất kho | `stock = 8`, `reserved = 0`, `available = 8` |
| Return | Kho xác nhận nhận hoàn 1 | `stock = 9`; không restock hai lần với cùng key |
| Concurrency | Gửi đồng thời hai Order quantity 8 với stock 10 | Chỉ một Order thành công; `available` không âm |

## Điều kiện chạy thật

- Merge migration `20261104020000_add_inventory_reservations.sql` vào `main` rồi mới chạy `npx supabase@latest db push --linked`.
- Dev 2 phải gọi `IInventoryContract` trong cùng transaction tạo/chuyển trạng thái Order.
- Chưa có các điều kiện trên thì chỉ test được receipt/adjustment thủ công, chưa test được reserve/release/commit.
