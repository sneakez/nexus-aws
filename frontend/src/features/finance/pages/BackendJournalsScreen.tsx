import { PageHeader } from '@/components/common/PageHeader';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { journalsService, type BackendLedgerAccount, type BackendJournalDetail } from '@/services/journals.service';
import { formatOrderMoney } from '@/lib/orderFormatting';
import { BackendJournalForm } from '../components/BackendJournalForm';

export function BackendJournalsPage() {
  const { session, activeRole } = useAuth();
  const allowed = activeRole === 'admin' || activeRole === 'manager';
  const token = session?.access_token;
  const [accounts, setAccounts] = useState<BackendLedgerAccount[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [lookup, setLookup] = useState('');
  const [journal, setJournal] = useState<BackendJournalDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setAccounts(null); setCatalogError(null);
    if (!allowed || !token) return () => controller.abort();
    void journalsService.listAccounts(token, controller.signal)
      .then(data => { if (!controller.signal.aborted) setAccounts(data); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setCatalogError(cause instanceof Error ? cause.message : 'Không tải được tài khoản.'); });
    return () => controller.abort();
  }, [allowed, token, revision]);
  async function find(event: FormEvent) {
    event.preventDefault();
    if (!token || !allowed || lock.current) return;
    lock.current = true; setBusy(true); setError(null); setJournal(null);
    try { setJournal(await journalsService.get(lookup.trim(), token)); }
    catch (cause: unknown) { setError(cause instanceof Error ? cause.message : 'Không tìm được bút toán.'); }
    finally { lock.current = false; setBusy(false); }
  }
  if (!allowed) return <div role="alert" className="p-6 text-ink-900">Tài khoản không có quyền xem bút toán.</div>;
  return <section className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8" aria-labelledby="journals-title">
    <PageHeader title={<span id="journals-title">Bút toán kế toán</span>}
      subtitle="Tra cứu chứng từ và ghi bút toán cân bằng Nợ/Có."
      actions={!formOpen && <button type="button" className="btn-primary" onClick={() => setFormOpen(true)}>Tạo bút toán</button>} />
    {catalogError ? <p role="alert" className="text-sm text-red-700">{catalogError} <button type="button" className="underline" onClick={() => setRevision(n => n + 1)}>Tải lại tài khoản</button></p>
      : accounts === null ? <p role="status" className="text-sm text-ink-600">Đang tải tài khoản kế toán…</p>
      : accounts.length === 0 && <p className="text-sm text-amber-900">Chưa có tài khoản kế toán để ghi sổ.</p>}
    {formOpen && <BackendJournalForm accounts={accounts ?? []} onClose={() => setFormOpen(false)} onCreated={value => {
      setJournal(value); setLookup(value.id); setFormOpen(false); setError(null);
    }} />}
    <form onSubmit={event => { void find(event); }} className="space-y-3 rounded-xl border border-ink-200 bg-white p-4 sm:p-6">
      <label className="block text-sm font-medium">Mã bút toán
        <input aria-label="Mã bút toán" required maxLength={36} value={lookup} onChange={e => setLookup(e.target.value)}
          pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
          placeholder="Nhập UUID của bút toán" className="mt-1 w-full rounded-lg border border-ink-300 p-2 font-mono text-sm" />
      </label>
      <button type="submit" disabled={busy} className="btn-secondary">{busy ? 'Đang tra cứu…' : 'Tra cứu bút toán'}</button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>
    {journal && <article className="space-y-4 rounded-xl border border-ink-200 bg-white p-4 sm:p-6" aria-label="Chi tiết bút toán">
      <h2 className="break-words text-lg font-semibold">{journal.entryNumber}</h2>
      <p className="break-all font-mono text-xs text-ink-600">ID: {journal.id}</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-ink-600">Nguồn</dt><dd>{journal.eventSource ?? 'Không có'}</dd></div>
        <div><dt className="text-ink-600">Ngày ghi sổ</dt><dd>{new Date(journal.postedAt).toLocaleString('vi-VN')}</dd></div>
      </dl>
      {journal.referenceId && <p className="break-all text-sm text-ink-600">Tham chiếu: {journal.referenceId}</p>}
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="sr-only">Các dòng Nợ và Có của bút toán</caption>
        <thead><tr className="border-b border-ink-200"><th scope="col" className="py-3 pr-3">Tài khoản</th><th scope="col" className="p-3 text-right">Nợ</th><th scope="col" className="py-3 pl-3 text-right">Có</th></tr></thead>
        <tbody>{journal.lines.map((line, index) => {
          const account = accounts?.find(value => value.id === line.accountId);
          return <tr key={index} className="border-b border-ink-100">
            <th scope="row" className="min-w-40 break-all py-3 pr-3 font-medium">{account ? account.code + ' · ' + account.name : line.accountId}</th>
            <td className="whitespace-nowrap p-3 text-right tabular-nums">{formatOrderMoney(line.debitAmount)}</td>
            <td className="whitespace-nowrap py-3 pl-3 text-right tabular-nums">{formatOrderMoney(line.creditAmount)}</td>
          </tr>;
        })}</tbody>
      </table></div>
    </article>}
  </section>;
}
