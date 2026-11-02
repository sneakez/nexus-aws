import { describe, it, expect } from 'vitest';

interface MockOrderItem {
  productId: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

interface MockOrder {
  id: string;
  orderNumber: string;
  tenantId: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  stockRestored: boolean;
  items: MockOrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  idempotencyKey?: string;
}

function calculateOrderTotals(items: MockOrderItem[], taxRate = 0.1, shipping = 30000, discount = 0) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const tax = subtotal * taxRate;
  const total = Math.max(subtotal + tax + shipping - discount, 0);
  return { subtotal, tax, shipping, discount, total };
}

function attemptRestock(order: MockOrder): { canRestock: boolean; reason?: string } {
  if (order.stockRestored) {
    return { canRestock: false, reason: 'Tồn kho đã được hoàn trước đó. Ngăn chặn hoàn tồn hai lần.' };
  }
  if (order.status === 'cancelled' || order.status === 'refunded') {
    return { canRestock: false, reason: 'Đơn hàng đã ở trạng thái hủy/hoàn tiền.' };
  }
  return { canRestock: true };
}

describe('Order & Inventory Transactions (Workstream B)', () => {
  it('calculates order financial totals accurately without rounding errors', () => {
    const items: MockOrderItem[] = [
      { productId: 'p1', sku: 'SKU-1', quantity: 2, unitPrice: 150000 },
      { productId: 'p2', sku: 'SKU-2', quantity: 1, unitPrice: 200000 },
    ];
    const { subtotal, tax, shipping, total } = calculateOrderTotals(items, 0.1, 30000, 50000);
    expect(subtotal).toBe(500000);
    expect(tax).toBe(50000);
    expect(shipping).toBe(30000);
    expect(total).toBe(530000);
  });

  it('prevents double restock when order was already cancelled', () => {
    const order: MockOrder = {
      id: 'ord-123',
      orderNumber: 'ORD-TEST-001',
      tenantId: 'tenant-a',
      status: 'cancelled',
      stockRestored: true,
      items: [{ productId: 'p1', sku: 'SKU-1', quantity: 2, unitPrice: 100000 }],
      subtotal: 200000,
      tax: 20000,
      shipping: 30000,
      discount: 0,
      total: 250000,
    };

    const firstAttempt = attemptRestock(order);
    expect(firstAttempt.canRestock).toBe(false);
    expect(firstAttempt.reason).toContain('Ngăn chặn hoàn tồn hai lần');
  });

  it('allows restock on active order transitioning to cancelled for the first time', () => {
    const order: MockOrder = {
      id: 'ord-456',
      orderNumber: 'ORD-TEST-002',
      tenantId: 'tenant-a',
      status: 'pending',
      stockRestored: false,
      items: [{ productId: 'p1', sku: 'SKU-1', quantity: 2, unitPrice: 100000 }],
      subtotal: 200000,
      tax: 20000,
      shipping: 30000,
      discount: 0,
      total: 250000,
    };

    const attempt = attemptRestock(order);
    expect(attempt.canRestock).toBe(true);

    // After restock, status and flag are updated
    order.status = 'cancelled';
    order.stockRestored = true;

    // Subsequent attempt is blocked
    const secondAttempt = attemptRestock(order);
    expect(secondAttempt.canRestock).toBe(false);
  });

  it('validates idempotency key format to prevent duplicate orders', () => {
    const generateKey = (tenantId: string, orderNumber: string) => `idemp_${tenantId}_${orderNumber}`;
    const key1 = generateKey('tenant-1', 'ORD-001');
    const key2 = generateKey('tenant-1', 'ORD-001');
    const key3 = generateKey('tenant-2', 'ORD-001');

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3); // Tenant scoped idempotency
  });
});
