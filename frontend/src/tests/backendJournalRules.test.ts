import { describe, expect, it } from 'vitest';
import { journalCents, formatJournalCents } from '@/lib/backendJournals';
import { getAllowedPagesForRole } from '@/lib/permissions';

describe('Journal monetary boundaries', () => {
  it('balances fractional input without floating-point addition', () => {
    expect(journalCents('0.1')! + journalCents('0.2')!).toBe(journalCents('0.3'));
  });
  it('keeps totals exact above the safe integer limit of Number', () => {
    const total = journalCents('999999999999.99')! * BigInt(100);
    expect(total > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(formatJournalCents(total)).toBe('99.999.999.999.999 ₫');
  });
  it('rejects excess precision, negative and oversized amounts', () => {
    for (const amount of ['0.001', '-1', '1000000000000', 'Infinity']) expect(journalCents(amount)).toBeNull();
  });
});
describe('Backend role page access', () => {
  it('excludes the journal page from the live workspace', () => {
    expect(getAllowedPagesForRole('manager', true)).not.toContain('cashWorkingCapital');
    expect(getAllowedPagesForRole('admin', true)).not.toContain('cashWorkingCapital');
  });
  it('denies warehouse and unverified roles financial access', () => {
    expect(getAllowedPagesForRole('warehouse', true)).not.toContain('cashWorkingCapital');
    expect(getAllowedPagesForRole(null, true)).toEqual([]);
    expect(getAllowedPagesForRole('owner', true)).toEqual([]);
  });
  it('preserves the existing demo admin policy', () => {
    expect(getAllowedPagesForRole('admin')).toEqual([]);
  });
});
