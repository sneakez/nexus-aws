import { expect, it } from 'vitest';
import { formatOrderMoney, parseMoneyResponse } from '@/lib/orderFormatting';

it('preserves five decimal places for a large monetary value throughout parsing and display', () => {
  const result = parseMoneyResponse(
    '{"total":999999999999.00001,"note":"\\"total\\": 12","quantity":0.125,"cm3":null}',
    new Set(['total', 'cm3']),
  );
  expect(result).toEqual({ total: '999999999999.00001', note: '"total": 12', quantity: 0.125, cm3: null });
  expect(formatOrderMoney('999999999999.00001')).toBe('999.999.999.999,00001\u00a0₫');
});
