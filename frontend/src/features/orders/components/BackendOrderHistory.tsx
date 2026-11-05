import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { ordersService, backendOrderStatuses, type BackendOrderHistoryEntry } from '@/services/orders.service';
import { formatDate } from '@/lib/utils';

export function BackendOrderHistory({ orderId, revision }: { orderId: string; revision: number }) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [entries, setEntries] = useState<BackendOrderHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setEntries(null); setError(null);
    if (!token) { setError('Vui lòng đăng nhập lại.'); return () => controller.abort(); }
    void ordersService.history(orderId, token, controller.signal)
      .then(data => { if (!controller.signal.aborted) setEntries(data); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được lịch sử.'); });
    return () => controller.abort();
  }, [orderId, token, revision, retry]);
  return <section className="space-y-3 border-t border-ink-200 pt-5" aria-label="Lịch sử trạng thái">
    <h3 className="font-semibold text-ink-900">Lịch sử trạng thái</h3>
    {error ? <div role="alert" className="text-sm text-red-700">{error} <button type="button" className="underline" onClick={() => setRetry(n => n + 1)}>Tải lại lịch sử</button></div>
      : !entries ? <p role="status" className="text-sm text-ink-600">Đang tải lịch sử…</p>
      : !entries.length ? <p className="text-sm text-ink-600">Chưa có lịch sử trạng thái.</p>
      : <ol className="space-y-4">{entries.map(entry => <li key={entry.id} className="border-l-2 border-teal-200 pl-3 text-sm">
        <p className="font-medium">{entry.fromStatus ? (backendOrderStatuses[entry.fromStatus] ?? entry.fromStatus) + ' → ' : ''}{backendOrderStatuses[entry.toStatus] ?? entry.toStatus}</p>
        <time dateTime={entry.createdAt} className="text-xs text-ink-600">{formatDate(entry.createdAt)}</time>
        {entry.note && <p className="mt-1 whitespace-pre-wrap break-words text-ink-700">{entry.note}</p>}
      </li>)}</ol>}
  </section>;
}
