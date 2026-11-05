import { apiClient } from './apiClient';

export interface BackendLedgerAccount { id: string; code: string; name: string; }
export interface BackendJournalLine { accountId: string; debitAmount: number; creditAmount: number; }
export interface BackendJournalRequest { id: string; entryNumber: string; eventSource: string; referenceId: string | null; lines: BackendJournalLine[]; }
export interface BackendJournalDetail extends Omit<BackendJournalRequest, 'eventSource'> { eventSource: string | null; postedAt: string; }
const obj = (value: unknown) => { if (!value || typeof value !== 'object') throw new Error('Dữ liệu bút toán không hợp lệ.'); return value as Record<string, unknown>; };
const str = (value: unknown) => { if (typeof value !== 'string') throw new Error('Dữ liệu văn bản không hợp lệ.'); return value; };
const money = (value: unknown) => { if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Số tiền không hợp lệ.'); return value; };
function detail(value: unknown): BackendJournalDetail { const data = obj(value); if (!Array.isArray(data.lines)) throw new Error('Dòng bút toán không hợp lệ.'); return { id: str(data.id), entryNumber: str(data.entryNumber), eventSource: data.eventSource === null ? null : str(data.eventSource), referenceId: data.referenceId === null ? null : str(data.referenceId), postedAt: str(data.postedAt), lines: data.lines.map(value => { const line = obj(value); return { accountId: str(line.accountId), debitAmount: money(line.debitAmount), creditAmount: money(line.creditAmount) }; }) }; }

export const journalsService = {
  async listAccounts(token: string, signal?: AbortSignal): Promise<BackendLedgerAccount[]> {
    const data = await apiClient.get<unknown>('/api/v1/ledger-accounts', token, signal);
    if (!Array.isArray(data)) throw new Error('Danh mục tài khoản không hợp lệ.');
    return data.map(value => { const account = obj(value); return { id: str(account.id), code: str(account.code), name: str(account.name) }; });
  },
  get: async (id: string, token: string) => detail(await apiClient.get('/api/v1/journals/' + encodeURIComponent(id), token)),
  async create(body: BackendJournalRequest, token: string) { const result = detail(await apiClient.post('/api/v1/journals', token, body)); if (result.id !== body.id) throw new Error('Chưa xác nhận được kết quả bút toán.'); return result; },
};
export function journalCents(value: string): bigint | null { if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(value)) return null; const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0')); }
export function formatJournalCents(value: bigint): string { const whole = (value / BigInt(100)).toLocaleString('vi-VN'); const fraction = String(value % BigInt(100)).padStart(2, '0').replace(/0+$/, ''); return whole + (fraction ? ',' + fraction : '') + ' ₫'; }
