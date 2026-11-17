import { describe, expect, it } from 'vitest';
import { isCancellableOrder, isDemoBatchSafeToCleanup } from '@/app/WebhookSimulatorPage';
import type { BackendOrderSummary } from '@/services/orders.service';

const order = (status: string, hasActiveReservation = true): BackendOrderSummary => ({
  id: 'order-1', orderNumber: 'SHOP-001', status, total: '100000',
  createdAt: '2026-11-16T00:00:00Z', channelConnectionId: 'channel-1', hasActiveReservation,
});

describe('Webhook simulator cancellation branch', () => {
  it.each(['pending', 'confirmed', 'processing'])('allows cancellation from %s', status => {
    expect(isCancellableOrder(order(status))).toBe(true);
  });

  it.each(['shipped', 'delivered', 'cancelled'])('blocks cancellation from %s', status => {
    expect(isCancellableOrder(order(status))).toBe(false);
  });

  it('blocks an order without active inventory reservations', () => {
    expect(isCancellableOrder(order('pending', false))).toBe(false);
  });
});

describe('Webhook simulator batch cleanup guard', () => {
  it('allows cleanup only after every queued order has finished', () => {
    expect(isDemoBatchSafeToCleanup([
      { orderNumber: 'DEMO-01', status: 'processed' },
      { orderNumber: 'DEMO-02', status: 'dispatch_failed' },
      { orderNumber: 'DEMO-03', status: 'timeout' },
    ])).toBe(true);
    expect(isDemoBatchSafeToCleanup([
      { orderNumber: 'DEMO-01', status: 'processed' },
      { orderNumber: 'DEMO-02', status: 'queued' },
    ])).toBe(false);
    expect(isDemoBatchSafeToCleanup([])).toBe(false);
  });
});
