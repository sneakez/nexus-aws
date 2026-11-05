import { useRef, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { ApiError } from '@/services/apiClient';
import { journalsService, journalCents, formatJournalCents,
  type BackendJournalRequest, type BackendJournalDetail, type BackendLedgerAccount } from '@/services/journals.service';

interface DraftLine { rowId: string; accountId: string; side: 'debit' | 'credit'; amount: string }
const fresh = (side: 'debit' | 'credit'): DraftLine => ({ rowId: crypto.randomUUID(), accountId: '', side, amount: '' });
const inputClass = 'mt-1 w-full rounded-lg border border-ink-300 bg-white p-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-teal-600';
function restore(key: string): BackendJournalRequest | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null') as BackendJournalRequest | null;
    return value && typeof value.id === 'string' && typeof value.entryNumber === 'string' && typeof value.eventSource === 'string'
      && (value.referenceId === null || typeof value.referenceId === 'string')
      && Array.isArray(value.lines) && value.lines.length >= 2
      && value.lines.every(line => line && typeof line.accountId === 'string'
        && Number.isFinite(line.debitAmount) && Number.isFinite(line.creditAmount)) ? value : null;
  } catch { return null; }
}
export function BackendJournalForm({ accounts, onCreated, onClose }: {
  accounts: BackendLedgerAccount[]; onCreated: (value: BackendJournalDetail) => void; onClose: () => void;
}) {
  const { session } = useAuth();
  const key = 'nexus-pending-journal:' + session?.user.id;
  const [pending, setPending] = useState<BackendJournalRequest | null>(() => restore(key));
  const [entryNumber, setEntryNumber] = useState(pending?.entryNumber ?? 'MANUAL-' + crypto.randomUUID().slice(0, 8).toUpperCase());
  const [source, setSource] = useState(pending?.eventSource ?? 'manual');
  const [reference, setReference] = useState(pending?.referenceId ?? '');
  const [lines, setLines] = useState<DraftLine[]>(() => pending ? pending.lines.map(line => ({
    rowId: crypto.randomUUID(), accountId: line.accountId, side: line.debitAmount > 0 ? 'debit' : 'credit',
    amount: String(line.debitAmount || line.creditAmount),
  })) : [fresh('debit'), fresh('credit')]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const totals = lines.reduce((sum, line) => {
    const amount = journalCents(line.amount);
    if (amount === null || amount <= BigInt(0)) sum.valid = false;
    else sum[line.side] += amount;
    return sum;
  }, { debit: BigInt(0), credit: BigInt(0), valid: true });
  const balanced = totals.valid && totals.debit === totals.credit;
  function update(rowId: string, change: Partial<DraftLine>) {
    setLines(current => current.map(line => line.rowId === rowId ? { ...line, ...change } : line)); setError(null);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!session || lock.current) return;
    setError(null);
    if (!pending && (!entryNumber.trim() || !source.trim() || !balanced)) {
      setError('Nhập số chứng từ, nguồn phát sinh và số tiền dương ở mỗi dòng; tổng Nợ phải bằng tổng Có.');
      formRef.current?.querySelector<HTMLInputElement>('input')?.focus(); return;
    }
    const request: BackendJournalRequest = pending ?? { id: crypto.randomUUID(), entryNumber: entryNumber.trim(),
      eventSource: source.trim().toLowerCase(), referenceId: reference.trim() || null,
      lines: lines.map(line => ({ accountId: line.accountId,
        debitAmount: line.side === 'debit' ? Number(line.amount) : 0,
        creditAmount: line.side === 'credit' ? Number(line.amount) : 0 })) };
    lock.current = true; setBusy(true);
    let sent = false;
    try {
      sessionStorage.setItem(key, JSON.stringify(request)); setPending(request); sent = true;
      const result = await journalsService.create(request, session.access_token);
      sessionStorage.removeItem(key); setPending(null); onCreated(result);
    } catch (cause: unknown) {
      if (!sent) { setError('Không lưu được yêu cầu. Chưa gửi bút toán.'); return; }
      const rejected = cause instanceof ApiError && [400, 404, 409, 422].includes(cause.status);
      if (rejected) { sessionStorage.removeItem(key); setPending(null); }
      setError(rejected && cause instanceof Error ? cause.message
        : 'Chưa xác nhận được kết quả ghi sổ. Giữ nguyên ID và nội dung để kiểm tra lại an toàn.');
    } finally { lock.current = false; setBusy(false); }
  }
  return <form ref={formRef} onSubmit={event => { void submit(event); }} className="space-y-5 rounded-xl border border-ink-200 bg-white p-4 sm:p-6" aria-label="Tạo bút toán">
    <h2 className="text-lg font-semibold text-ink-900">Tạo bút toán</h2>
    <p className="text-sm text-ink-600">Mỗi dòng ghi Nợ hoặc Có. Kiểm tra tài khoản và số tiền trước khi ghi sổ.</p>
    {pending && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Có bút toán chưa rõ kết quả. Nội dung được giữ nguyên để gửi lại cùng ID.</p>}
    <fieldset disabled={busy || !!pending} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Số chứng từ<input aria-label="Số chứng từ" required maxLength={120} value={entryNumber} onChange={e => setEntryNumber(e.target.value)} className={inputClass} /></label>
        <label className="text-sm font-medium">Nguồn phát sinh<input aria-label="Nguồn phát sinh" required maxLength={60} value={source} onChange={e => setSource(e.target.value)} className={inputClass} /></label>
      </div>
      <label className="block text-sm font-medium">Mã tham chiếu (không bắt buộc)
        <input aria-label="Mã tham chiếu" maxLength={36} pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
          value={reference} onChange={e => setReference(e.target.value)} placeholder="UUID của đối tượng liên quan" className={inputClass} />
      </label>
      <div className="space-y-4">{lines.map((line, index) => <fieldset key={line.rowId} className="rounded-lg border border-ink-200 p-3">
        <legend className="px-1 text-sm font-semibold">Dòng {index + 1}</legend>
        <label className="block text-sm">Tài khoản<select required aria-label={'Tài khoản dòng ' + (index + 1)} value={line.accountId} onChange={e => update(line.rowId, { accountId: e.target.value })} className={inputClass}>
          <option value="">Chọn tài khoản</option>
          {accounts.map(account => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
        </select></label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-sm">Bên ghi<select aria-label={'Bên dòng ' + (index + 1)} value={line.side} onChange={e => update(line.rowId, { side: e.target.value as 'debit' | 'credit' })} className={inputClass}>
            <option value="debit">Nợ</option><option value="credit">Có</option>
          </select></label>
          <label className="text-sm">Số tiền<input required type="number" min="0.01" max="999999999999.99" step="0.01" aria-label={'Số tiền dòng ' + (index + 1)}
            value={line.amount} onChange={e => update(line.rowId, { amount: e.target.value })} className={inputClass} /></label>
        </div>
        {lines.length > 2 && <button type="button" className="mt-3 inline-flex items-center gap-1 text-sm text-red-700" onClick={() => setLines(current => current.filter(item => item.rowId !== line.rowId))}><Trash2 size={14} aria-hidden="true" />Xóa dòng {index + 1}</button>}
      </fieldset>)}</div>
      <button type="button" disabled={lines.length >= 100} className="btn-secondary inline-flex items-center gap-2" onClick={() => setLines(current => [...current, fresh('debit')])}><Plus size={14} aria-hidden="true" />Thêm dòng</button>
    </fieldset>
    <div className="rounded-lg bg-ink-50 p-4 text-sm" aria-label="Tổng bút toán">
      <p className="flex justify-between gap-3"><span>Tổng Nợ</span><strong>{formatJournalCents(totals.debit)}</strong></p>
      <p className="mt-2 flex justify-between gap-3"><span>Tổng Có</span><strong>{formatJournalCents(totals.credit)}</strong></p>
      <p className={'mt-2 font-medium ' + (balanced ? 'text-teal-800' : 'text-amber-900')}>{balanced ? 'Đã cân bằng' : 'Chưa đủ dòng tiền hợp lệ hoặc chưa cân bằng'}</p>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex flex-wrap gap-3">
      <button type="submit" disabled={busy || (!accounts.length && !pending)} className="btn-primary disabled:opacity-50">{busy ? 'Đang ghi…' : pending ? 'Kiểm tra lại bút toán' : 'Ghi sổ bút toán'}</button>
      <button type="button" disabled={busy} onClick={onClose} className="btn-secondary">{pending ? 'Đóng, giữ yêu cầu' : 'Hủy biểu mẫu'}</button>
    </div>
  </form>;
}
