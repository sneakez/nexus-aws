import { describe, it, expect } from 'vitest';

interface JournalLineInput {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
}

function validateDoubleEntry(lines: JournalLineInput[]): { isBalanced: boolean; totalDebit: number; totalCredit: number; diff: number } {
  const totalDebit = lines.reduce((sum, l) => sum + (l.debitAmount || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.creditAmount || 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);
  const isBalanced = diff < 0.001 && totalDebit > 0;
  return { isBalanced, totalDebit, totalCredit, diff };
}

describe('Double-Entry Accounting Ledger (Workstream D)', () => {
  it('accepts perfectly balanced journal entries where Total Debit == Total Credit', () => {
    const lines: JournalLineInput[] = [
      { accountId: 'acc-cash', debitAmount: 500000, creditAmount: 0 },
      { accountId: 'acc-revenue', debitAmount: 0, creditAmount: 500000 },
    ];
    const result = validateDoubleEntry(lines);
    expect(result.isBalanced).toBe(true);
    expect(result.totalDebit).toBe(500000);
    expect(result.totalCredit).toBe(500000);
    expect(result.diff).toBe(0);
  });

  it('accepts multi-line split journal entries with equal totals', () => {
    const lines: JournalLineInput[] = [
      { accountId: 'acc-ar', debitAmount: 1100000, creditAmount: 0 },
      { accountId: 'acc-sales', debitAmount: 0, creditAmount: 1000000 },
      { accountId: 'acc-vat', debitAmount: 0, creditAmount: 100000 },
    ];
    const result = validateDoubleEntry(lines);
    expect(result.isBalanced).toBe(true);
    expect(result.totalDebit).toBe(1100000);
    expect(result.totalCredit).toBe(1100000);
  });

  it('rejects imbalanced journal entries', () => {
    const lines: JournalLineInput[] = [
      { accountId: 'acc-cash', debitAmount: 500000, creditAmount: 0 },
      { accountId: 'acc-revenue', debitAmount: 0, creditAmount: 490000 }, // 10k discrepancy
    ];
    const result = validateDoubleEntry(lines);
    expect(result.isBalanced).toBe(false);
    expect(result.diff).toBe(10000);
  });

  it('rejects zero amount journal entry', () => {
    const lines: JournalLineInput[] = [
      { accountId: 'acc-cash', debitAmount: 0, creditAmount: 0 },
      { accountId: 'acc-revenue', debitAmount: 0, creditAmount: 0 },
    ];
    const result = validateDoubleEntry(lines);
    expect(result.isBalanced).toBe(false);
  });
});
