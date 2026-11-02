export type CommerceChannel = 'shopee' | 'tiktok';

export interface OrderCreatedWebhook {
  event_id: string;
  event_type: 'order.created';
  source: CommerceChannel;
  occurred_at: string;
  shop_id: string;
  order_sn: string;
  data: {
    customer_ref: string;
    items: Array<{
      channel_sku: string;
      internal_sku: string;
      quantity: number;
      unit_price: number;
    }>;
  };
}

export function isOrderCreatedWebhook(value: unknown): value is OrderCreatedWebhook {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<OrderCreatedWebhook>;
  return event.event_type === 'order.created'
    && typeof event.event_id === 'string'
    && typeof event.order_sn === 'string'
    && (event.source === 'shopee' || event.source === 'tiktok')
    && Array.isArray(event.data?.items)
    && event.data.items.length > 0;
}
