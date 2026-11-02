import { describe, it, expect } from 'vitest';

interface InventoryItemState {
  product_id: string;
  sku: string;
  physical_qty: number;
  reserved_qty: number;
  available_qty: number;
}

function verifyInventoryIntegrity(items: InventoryItemState[]): {
  isConsistent: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const item of items) {
    if (item.available_qty < 0) {
      errors.push(`SKU ${item.sku}: available_qty is negative (${item.available_qty})`);
    }
    if (item.physical_qty < 0) {
      errors.push(`SKU ${item.sku}: physical_qty is negative (${item.physical_qty})`);
    }
    if (item.reserved_qty < 0) {
      errors.push(`SKU ${item.sku}: reserved_qty is negative (${item.reserved_qty})`);
    }
    if (item.physical_qty < item.reserved_qty) {
      errors.push(`SKU ${item.sku}: physical_qty (${item.physical_qty}) is less than reserved_qty (${item.reserved_qty})`);
    }
    if (item.available_qty !== (item.physical_qty - item.reserved_qty)) {
      errors.push(`SKU ${item.sku}: available_qty (${item.available_qty}) does not match physical - reserved (${item.physical_qty - item.reserved_qty})`);
    }
  }

  return {
    isConsistent: errors.length === 0,
    errors,
  };
}

describe('V5 Inventory Consistency Verification', () => {
  it('passes on perfectly balanced inventory items', () => {
    const items: InventoryItemState[] = [
      { product_id: '1', sku: 'SKU-01', physical_qty: 100, reserved_qty: 20, available_qty: 80 },
      { product_id: '2', sku: 'SKU-02', physical_qty: 50, reserved_qty: 50, available_qty: 0 },
      { product_id: '3', sku: 'SKU-03', physical_qty: 0, reserved_qty: 0, available_qty: 0 },
    ];

    const result = verifyInventoryIntegrity(items);
    expect(result.isConsistent).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('detects negative available stock (overselling violation)', () => {
    const items: InventoryItemState[] = [
      { product_id: '1', sku: 'SKU-BAD', physical_qty: 10, reserved_qty: 15, available_qty: -5 },
    ];

    const result = verifyInventoryIntegrity(items);
    expect(result.isConsistent).toBe(false);
    expect(result.errors.some(e => e.includes('available_qty is negative'))).toBe(true);
    expect(result.errors.some(e => e.includes('physical_qty (10) is less than reserved_qty (15)'))).toBe(true);
  });

  it('detects equation mismatch between physical, reserved, and available', () => {
    const items: InventoryItemState[] = [
      { product_id: '1', sku: 'SKU-DRIFT', physical_qty: 100, reserved_qty: 20, available_qty: 70 }, // Should be 80
    ];

    const result = verifyInventoryIntegrity(items);
    expect(result.isConsistent).toBe(false);
    expect(result.errors.some(e => e.includes('does not match physical - reserved'))).toBe(true);
  });
});
