import { BackendOrderReturns } from './BackendOrderReturns';
import { BackendOrderFinance } from './BackendOrderFinance';
import { BackendOrderActions } from './BackendOrderActions';
import { BackendOrderHistory } from './BackendOrderHistory';
import { useOrderDialogFocus } from './useOrderDialogFocus';
import { useEffect, useRef, useState } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { useAuth } from '@/providers/AuthProvider';
import { backendOrderStatuses, getBackendOrder, type BackendOrderDetail } from '@/lib/backendOrders';
import { formatDate } from '@/lib/utils';
import { formatOrderMoney as formatCurrency } from '@/lib/orderFormatting';

export function BackendOrderDetailDrawer({ orderId, onClose, onChanged }: { orderId: string; onClose: () => void; onChanged?: () => void }) {
  const { session, activeRole } = useAuth();
  const token = session?.access_token;
  const canViewCost = activeRole === 'admin' || activeRole === 'manager';
  const [order, setOrder] = useState<BackendOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const heading = useRef<HTMLDivElement>(null);
  useOrderDialogFocus(heading);
  useEffect(() => {
    const controller = new AbortController();
    setOrder(null);
    setError(null);
    if (!token) { setError('Vui lòng đăng nhập lại.'); return () => controller.abort(); }
    void getBackendOrder(orderId, token, controller.signal)
      .then(data => { if (!controller.signal.aborted) setOrder(data); })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tải được đơn.');
      });
    return () => controller.abort();
  }, [orderId, token, revision]);
  return <Drawer open onClose={onClose} title={order?.orderNumber ?? 'Chi tiết đơn hàng'}
    footer={<button type="button" onClick={onClose} className="btn-secondary">Đóng chi tiết</button>}>
    <div ref={heading} tabIndex={-1} className="space-y-5 outline-none">
      {notice && <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900">{notice}</p>}
      {error ? <div role="alert" className="text-red-700"><p>{error}</p>
        <button type="button" className="mt-2 underline" onClick={() => setRevision(n => n + 1)}>Thử lại</button></div>
        : !order ? <p role="status">Đang tải chi tiết…</p> : <>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-ink-600">Trạng thái</dt><dd className="mt-1 font-semibold">{backendOrderStatuses[order.status] ?? order.status}</dd></div>
            <div><dt className="text-ink-600">Ngày tạo</dt><dd className="mt-1">{formatDate(order.createdAt)}</dd></div>
          </dl>
          <p className="text-sm"><span className="text-ink-600">Khách hàng </span>
            <strong>{order.customerName ?? (order.customerId ? 'Khách hàng đã liên kết' : 'Khách vãng lai')}</strong>
          </p>
          <h3 className="font-semibold text-ink-900">Sản phẩm ({order.items.length})</h3>
          <ul className="divide-y divide-ink-100">
            {order.items.map(item => <li key={item.id} className="space-y-2 py-4 text-sm">
              <div className="flex justify-between gap-4"><div className="min-w-0">
                <p className="break-words font-medium text-ink-900">{item.productName}</p>
                {item.productSku && <p className="break-all text-xs text-ink-600">{item.productSku}</p>}
              </div><strong className="shrink-0 tabular-nums">{formatCurrency(item.lineTotal)}</strong></div>
              <p className="text-ink-600">{item.quantity.toLocaleString('vi-VN', { maximumFractionDigits: 3 })} × {formatCurrency(item.unitPrice)}</p>
              {canViewCost && <p className="text-ink-600">Giá vốn đơn vị: {item.unitCost === null ? 'Chưa có giá vốn' : formatCurrency(item.unitCost)}</p>}
            </li>)}
          </ul>
          <dl className="space-y-3 border-t border-ink-200 pt-4 text-sm">
            {[['Tiền hàng', order.subtotal], ['Thuế', order.tax], ['Phí giao hàng', order.shippingFee], ['Tổng tiền', order.total]].map(([label, amount]) =>
              <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-semibold tabular-nums">{formatCurrency(amount)}</dd></div>)}
          </dl>
          <BackendOrderActions key={order.id} order={order} onUpdated={message => {
            setNotice(message); setRevision(n => n + 1); onChanged?.();
          }} />
          <BackendOrderReturns key={order.id} order={order} />
          {canViewCost && <BackendOrderFinance key={order.id} orderId={order.id} />}
          <BackendOrderHistory orderId={order.id} revision={revision} />
        </>}
    </div>
  </Drawer>;
}
