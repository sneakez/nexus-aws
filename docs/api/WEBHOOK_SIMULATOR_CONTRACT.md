# NexusOMS webhook simulator contract

Contract này mô tả hành vi mà màn hình **Kết nối sàn & Simulator** đang mô phỏng trong frontend. Đây chưa phải endpoint public và chưa được Shopee/TikTok xác nhận.

## Request mô phỏng

```http
POST /webhooks/v1/orders
content-type: application/json
x-nexus-event: order.created
x-nexus-signature: sha256=<hex-hmac>
```

Chữ ký được tính bằng HMAC-SHA256 trên đúng raw JSON body với secret riêng của kết nối sàn.

```json
{
  "event_id": "evt_flash_001",
  "event_type": "order.created",
  "channel": "shopee",
  "shop_id": "shop_demo_01",
  "order_id": "flash-order-001",
  "occurred_at": "2026-11-01T08:00:00.000Z",
  "items": [
    {
      "channel_sku": "DEMO-SKU-01",
      "quantity": 1
    }
  ]
}
```

## Luồng xử lý kỳ vọng

1. Xác minh `x-nexus-signature` trên raw body trước khi parse JSON.
2. Từ chối `event_id` hoặc `order_id` đã xử lý để bảo đảm idempotency.
3. Tra `channel + shop_id + channel_sku` trong bảng ánh xạ SKU.
4. Giữ tồn kho bằng một transaction nguyên tử; không cho `available` xuống dưới 0.
5. Ghi event/audit và trả kết quả ổn định để sàn có thể retry an toàn.

## Response mục tiêu cho backend

| HTTP | Ý nghĩa |
| --- | --- |
| `202` | Event hợp lệ và đã được nhận để xử lý |
| `401` | Thiếu hoặc sai chữ ký HMAC |
| `409` | Event/order trùng, đã được xử lý |
| `422` | Không có SKU mapping hoặc không đủ tồn khả dụng |
| `500` | Lỗi tạm thời; sender có thể retry |

## Giới hạn prototype

- Secret trong UI là secret demo, không phải credential thật.
- 100 webhook được tạo và xử lý hoàn toàn trong trình duyệt.
- Chưa có HTTP server, queue, DLQ, rate limit hay replay protection theo timestamp.
- Chưa kiểm chứng payload/chữ ký bằng tài liệu chính thức hoặc sandbox của Shopee/TikTok.
