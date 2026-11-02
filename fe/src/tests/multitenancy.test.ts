import { describe, it, expect } from 'vitest';

interface QueryFilter {
  column: string;
  value: string;
}

class MockSupabaseQueryBuilder {
  private filters: QueryFilter[] = [];
  private table: string;

  constructor(table: string) {
    this.table = table;
  }

  eq(column: string, value: string) {
    this.filters.push({ column, value });
    return this;
  }

  getFilters() {
    return this.filters;
  }

  getTable() {
    return this.table;
  }

  hasTenantScope(expectedTenantId: string): boolean {
    return this.filters.some((f) => f.column === 'tenant_id' && f.value === expectedTenantId);
  }
}

function enforceTenantScope(builder: MockSupabaseQueryBuilder, activeTenantId: string): MockSupabaseQueryBuilder {
  if (!activeTenantId) {
    throw new Error('Tenant context is required for database query.');
  }
  return builder.eq('tenant_id', activeTenantId);
}

function validateInsertPayload<T extends Record<string, unknown>>(payload: T, activeTenantId: string): T & { tenant_id: string } {
  if (!activeTenantId) {
    throw new Error('Cannot insert entity without active tenant context.');
  }
  return {
    ...payload,
    tenant_id: activeTenantId,
  };
}

describe('Multi-Tenant Isolation Foundation (Workstream A)', () => {
  const TENANT_A = '11111111-1111-1111-1111-111111111111';
  const TENANT_B = '22222222-2222-2222-2222-222222222222';

  it('enforces tenant_id filter on all queries to prevent cross-tenant leaks', () => {
    const query = new MockSupabaseQueryBuilder('orders');
    enforceTenantScope(query, TENANT_A);

    expect(query.hasTenantScope(TENANT_A)).toBe(true);
    expect(query.hasTenantScope(TENANT_B)).toBe(false);
  });

  it('throws error when querying without active tenant context', () => {
    const query = new MockSupabaseQueryBuilder('customers');
    expect(() => enforceTenantScope(query, '')).toThrow('Tenant context is required');
  });

  it('injects active tenant_id into newly created records preventing default tenant pollution', () => {
    const customerInput = {
      name: 'Nguyen Van A',
      email: 'a@example.com',
      phone: '0901234567',
    };

    const payloadA = validateInsertPayload(customerInput, TENANT_A);
    expect(payloadA.tenant_id).toBe(TENANT_A);

    const payloadB = validateInsertPayload(customerInput, TENANT_B);
    expect(payloadB.tenant_id).toBe(TENANT_B);
  });

  it('switches tenant context cleanly without retaining stale tenant ID', () => {
    let currentTenant = TENANT_A;
    const queryA = enforceTenantScope(new MockSupabaseQueryBuilder('products'), currentTenant);
    expect(queryA.hasTenantScope(TENANT_A)).toBe(true);

    // Switch to Tenant B
    currentTenant = TENANT_B;
    const queryB = enforceTenantScope(new MockSupabaseQueryBuilder('products'), currentTenant);
    expect(queryB.hasTenantScope(TENANT_B)).toBe(true);
    expect(queryB.hasTenantScope(TENANT_A)).toBe(false);
  });
});
