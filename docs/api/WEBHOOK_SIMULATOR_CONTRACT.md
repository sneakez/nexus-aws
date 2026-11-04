# NexusOMS webhook simulator contract

Contract này mô tả endpoint fake webhook của backend. Đây chưa phải endpoint public và chưa được Shopee/TikTok xác nhận.

## Request mô phỏng

```http
POST /api/v1/webhooks/simulator/{connectionId}
content-type: application/json
X-Nexus-Signature: sha256=<hex-hmac>
```

Chữ ký được tính bằng HMAC-SHA256 trên đúng raw JSON body với secret riêng của kết nối sàn.

```json
{
  "eventId": "evt_flash_001",
  "eventType": "order.ready_to_ship",
  "externalOrderId": "flash-order-001",
  "warehouseId": "00000000-0000-0000-0000-000000000000",
  "tax": 0,
  "shippingFee": 15000,
  "items": [
    {
      "channelSku": "DEMO-SKU-01",
      "quantity": 1,
      "unitPrice": 199000
    }
  ]
}
```

## Luồng xử lý kỳ vọng

1. Xác minh `x-nexus-signature` trên raw body trước khi parse JSON.
2. Khóa idempotency theo `connectionId + eventId`; cùng event/payload trả lại order cũ, cùng event nhưng payload khác trả `409`.
3. Tra `connectionId + channelSku` trong bảng ánh xạ SKU.
4. Giữ tồn kho bằng một transaction nguyên tử; không cho `available` xuống dưới 0.
5. Ghi delivery log. Lỗi hạ tầng được retry tối đa ba lần bởi worker; lỗi nghiệp vụ không retry.

## Chính sách trạng thái MVP

Đây là quy ước mục tiêu của NexusOMS cho simulator; không thay thế state machine chính thức của Shopee/TikTok. Endpoint v1 hiện chỉ nhận `order.ready_to_ship`, tạo Order ở `pending` và Reserve tồn. `ReturnInbound` chỉ chạy sau khi kho xác nhận đã nhận hàng hoàn, không chạy chỉ vì sàn báo refund.

| Sàn | Status nguồn | NexusOMS | Tác động tồn kho |
| --- | --- | --- | --- |
| Shopee | `UNPAID` | `pending` | Không giữ tồn |
| Shopee | `READY_TO_SHIP` | `pending` (đã reserve) | `Reserve` |
| Shopee | `PROCESSED` | `processing` | Không đổi |
| Shopee | `SHIPPED` | `shipped` | `CommitOutbound` |
| Shopee | `COMPLETED` | `delivered` | Không đổi |
| Shopee | `CANCELLED` | `cancelled` | `Release` nếu đang giữ tồn |
| Shopee | `RRAOC` | tạo return/refund | Chờ nhận hàng + QC rồi mới `ReturnInbound` |
| TikTok | `UNPAID`, `ON_HOLD` | `pending` | Không giữ tồn |
| TikTok | `AWAITING_SHIPMENT` | `pending` (đã reserve) | `Reserve` |
| TikTok | `AWAITING_COLLECTION`, `IN_TRANSIT` | `shipped` | `CommitOutbound` một lần |
| TikTok | `DELIVERED` | `delivered` | Không đổi |
| TikTok | `CANCELLED` | `cancelled` | `Release` nếu đang giữ tồn |
| TikTok | `PARTIALLY_SHIPPING` | chờ xử lý thủ công | MVP chưa hỗ trợ commit theo từng line/package |

## Field Order Detail cần chuẩn hoá

Simulator nhận DTO đã được chuẩn hoá. Khi tích hợp sàn thật, webhook chỉ kích hoạt đồng bộ và backend phải lấy Order Detail rồi chuẩn hoá các field sau trước khi gọi luồng tạo Order:

| NexusOMS | TikTok Order Detail | Shopee Order Detail |
| --- | --- | --- |
| `externalOrderId` | `orders[].id` | `response.order_list[].order_sn` |
| `status` | `orders[].status` | `response.order_list[].order_status` |
| `occurredAt` | `orders[].update_time` | `response.order_list[].update_time` |
| `total` | `orders[].payment.total_amount` | `response.order_list[].total_amount` |
| `shippingFee` | `orders[].payment.shipping_fee` | `response.order_list[].estimated_shipping_fee` |
| `currency` | `orders[].payment.currency` | `response.order_list[].currency` |
| `channelSku` | `orders[].line_items[].seller_sku` | `response.order_list[].item_list[].model_sku` (fallback `item_sku`) |
| `quantity` | mỗi `line_items[]` | mỗi `item_list[].model_quantity_purchased` |
| `unitPrice` | `line_items[].sale_price` | `item_list[].model_discounted_price` |
| `trackingNumber` | `orders[].tracking_number` | `package_list[].package_number` |
| `cancelReason` | `orders[].cancel_reason` | `response.order_list[].cancel_reason` |

Không lưu access token, app secret, địa chỉ/số điện thoại khách thật hay payload nguyên bản có PII vào repository tài liệu.

## Response mục tiêu cho backend

| HTTP | Ý nghĩa |
| --- | --- |
| `202` | Event hợp lệ đã tạo order và reserve stock |
| `200` | Replay cùng payload, trả lại order cũ |
| `400` | Payload, mapping SKU hoặc connection không hợp lệ |
| `401` | Thiếu hoặc sai chữ ký HMAC |
| `409` | Cùng `eventId` nhưng payload khác, hoặc không đủ tồn/trùng dữ liệu |
| `500` | Lỗi hạ tầng tạm thời; worker sẽ retry nếu log được đánh dấu retryable |

## Giới hạn prototype

- Secret trong UI là secret demo, không phải credential thật.
- Không có queue/broker hay DLQ; worker quét trực tiếp bảng `webhook_delivery_logs`.
- Chưa có rate limit hay replay protection theo timestamp.
- Chưa kiểm chứng payload/chữ ký bằng tài liệu chính thức hoặc sandbox của Shopee/TikTok.
