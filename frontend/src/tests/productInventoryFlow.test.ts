import { afterEach, describe, expect, it, vi } from 'vitest';
import { workspaceService } from '@/services/workspace.service';

describe('Product initial inventory API flow', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns the product id then sends the initial receipt to the selected warehouse', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'product-1', sku: 'SKU-001' }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'transaction-1' }), { status: 201, headers: { 'Content-Type': 'application/json' } }));

    const product = await workspaceService.createProduct({ sku: 'SKU-001', name: 'Sản phẩm' }, 'token');
    await workspaceService.receiveInventory({ warehouseId: 'warehouse-1', productId: product.id, quantity: 10, idempotencyKey: 'initial-stock-1' }, 'token');

    expect(product.id).toBe('product-1');
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api.example.com/api/v1/products', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.example.com/api/v1/inventory/receipts', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ warehouseId: 'warehouse-1', productId: 'product-1', quantity: 10, idempotencyKey: 'initial-stock-1' }),
    }));
  });
});
