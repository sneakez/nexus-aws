import { describe, it, expect } from 'vitest';
import { maskPII, truncateHash } from '@/lib/utils';

describe('Security Utilities & Privacy Guardrails (Workstream D)', () => {
  it('masks sensitive phone numbers with [PHONE] token', () => {
    const raw = 'Customer phone is 0912345678, please call back.';
    const masked = maskPII(raw);
    expect(masked).toContain('[PHONE]');
    expect(masked).not.toContain('0912345678');
  });

  it('masks emails with [EMAIL] token', () => {
    const raw = 'Reach out at support@company.vn for details.';
    const masked = maskPII(raw);
    expect(masked).toContain('[EMAIL]');
    expect(masked).not.toContain('support@company.vn');
  });

  it('truncates SHA-256 hashes cleanly for display without leaking full value', () => {
    const fullHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const truncated = truncateHash(fullHash, 8);
    expect(truncated.length).toBeLessThan(fullHash.length);
    expect(truncated).toContain('...');
    expect(truncated.startsWith('e3b0c442')).toBe(true);
  });

  it('handles null and undefined values gracefully without throwing', () => {
    expect(maskPII(null)).toBe('');
    expect(maskPII(undefined)).toBe('');
    expect(truncateHash('')).toBe('—');
  });
});
