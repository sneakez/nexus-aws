import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { omsStore as mockStore } from '@/stores/omsStore';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';

export type MoneyAction = { kind: 'batch' | 'account' | 'receipt' | 'payment' | 'terms'; id?: string };
const today = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
export function MoneyDialog({ action, onClose }: { action: MoneyAction; onClose: () => void }) {
  const toast = useToast(), f = mockStore.getFinanceOverview();
  const [id, setId] = useState(''), [amount, setAmount] = useState(''), [date, setDate] = useState(today()), [reference, setReference] = useState(''), [reason, setReason] = useState('');
  const [accountId, setAccountId] = useState(f.accounts[0]?.id || ''), [selected, setSelected] = useState<string[]>([]), [confirmed, setConfirmed] = useState(false), [error, setError] = useState('');
  const batch = f.settlements.find(b => b.id === action.id), payable = f.payables.find(p => p.id === action.id);
  const titles = { batch: 'Lập đợt thanh toán sàn mô phỏng', account: 'Khai báo tài khoản demo', receipt: 'Ghi nhận tiền sàn thực nhận', payment: 'Ghi chứng từ trả nhà cung cấp', terms: 'Hạn trả / gia hạn công nợ mô phỏng' };
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = action.kind === 'batch' ? mockStore.createSettlementBatch({ id, orderIds: selected, expectedDate: date || null }) : action.kind === 'account' ? mockStore.createCashAccount({ id, name: reference, opening_balance: Number(amount), opening_date: date, opening_reference: reason }) : action.kind === 'receipt' ? mockStore.recordSettlementReceipt({ id, batchId: action.id!, accountId, amount: Number(amount), date, reference, discrepancyReason: reason }) : action.kind === 'payment' ? mockStore.recordSupplierPayment({ id, payableId: action.id!, accountId, amount: Number(amount), date, reference }) : mockStore.updatePayableTerms({ id, payableId: action.id!, dueDate: date, reason, confirmSimulation: confirmed });
    if (!result.success) { setError(result.error || 'Không thể lưu'); toast(result.error || 'Không thể lưu', 'error'); return; }
    toast('Đã lưu chứng từ mô phỏng; không chuyển/rút tiền hoặc liên hệ NCC thật.', 'success'); onClose();
  }
  const input = (label: string, value: string, setter: (v: string) => void, type = 'text', required = true) => <label className="block text-sm space-y-1">{label}<input aria-label={label} className="input w-full" type={type} value={value} onChange={e => setter(e.target.value)} required={required}/></label>;
  return <Modal open title={titles[action.kind]} onClose={onClose} size="lg">
    <form onSubmit={submit} className="space-y-3" data-testid="money-form">
      <p className="text-xs text-slate-500">Dữ liệu demo. Chứng từ thu/chi làm thay đổi số dư; trạng thái giao hoặc đối soát không tự làm đổi tiền.</p>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {batch && <div className="text-sm">{batch.id} · {batch.status}<br/>Dự kiến gốc {formatCurrency(batch.original_expected)}; điều chỉnh {formatCurrency(batch.adjustment)}; hiện tại {formatCurrency(batch.current_expected)}; thực nhận {formatCurrency(batch.received)}; còn {formatCurrency(batch.remaining)}<div className="flex flex-wrap gap-2">{batch.order_ids.map(id => <a className="text-sky-700 underline" key={id} href={`?page=orders&order=${id}`}>{id}</a>)}</div></div>}
      {batch && batch.remaining<=0 && <p className="text-xs text-amber-800">Đợt đã nhận đủ hoặc có chênh lệch âm cần xử lý. Lịch sử thu giữ nguyên; không tự trừ tiền. Chưa hỗ trợ chứng từ thu hồi/chuyển trả sàn, không ghi nhận thêm tiền vào đợt này.</p>}
      {payable && <p className="text-sm">{payable.supplier_name} · PO {payable.po_id} · Ghi nợ {formatCurrency(payable.accrued)} · Đã trả {formatCurrency(payable.paid)} · Còn {formatCurrency(payable.remaining)} · {payable.status}</p>}
      {input('Mã chứng từ', id, setId)}
      {input(action.kind === 'terms' ? 'Ngày hạn trả đề xuất' : action.kind === 'batch' ? 'Ngày dự kiến nhận (có thể trống)' : 'Ngày chứng từ', date, setDate, 'date', action.kind !== 'batch')}
      {action.kind === 'batch' && <fieldset className="max-h-48 overflow-y-auto space-y-2"><legend className="text-sm">Chọn đơn cùng shop/kênh chưa thuộc đợt khác</legend>{!f.eligibleOrders.length && <p>Chưa có đơn đủ điều kiện.</p>}{f.eligibleOrders.map(o => <label className="flex gap-2 text-sm" key={o.id}><input type="checkbox" aria-label={`Chọn đơn ${o.id}`} checked={selected.includes(o.id)} onChange={e => setSelected(e.target.checked ? [...selected, o.id] : selected.filter(id => id !== o.id))}/>{o.order_number} · {o.shop_id} · {formatCurrency(o.expected)}</label>)}</fieldset>}
      {['receipt', 'payment'].includes(action.kind) && <label className="block text-sm">Tài khoản nhận/chi<select aria-label="Tài khoản nhận/chi" className="input w-full" value={accountId} onChange={e => setAccountId(e.target.value)} required><option value="">Chọn tài khoản</option>{f.accounts.map(a => <option key={a.id} value={a.id}>{a.name} · {formatCurrency(a.balance)}</option>)}</select></label>}
      {['receipt', 'payment', 'account'].includes(action.kind) && input(action.kind === 'account' ? 'Số dư đầu kỳ mô phỏng' : 'Số tiền chứng từ', amount, setAmount, 'number')}
      {action.kind !== 'batch' && action.kind !== 'terms' && input(action.kind === 'account' ? 'Tên tài khoản demo' : 'Nguồn tham chiếu', reference, setReference)}
      {action.kind !== 'payment' && action.kind !== 'batch' && input(action.kind === 'account' ? 'Nguồn số dư đầu kỳ' : 'Lý do / chênh lệch', reason, setReason, 'text', action.kind !== 'receipt')}
      {action.kind === 'terms' && <label className="flex gap-2 text-sm"><input type="checkbox" aria-label="Xác nhận mô phỏng hạn trả" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>Xác nhận mô phỏng hạn mới (không phải NCC thật đã chấp thuận). Bỏ chọn chỉ lưu đề nghị, chưa đổi hạn.</label>}
      <button className="btn-primary" type="submit">Lưu chứng từ mô phỏng</button>
      {(batch || payable) && <details><summary className="text-sm cursor-pointer">Chứng từ và lịch sử</summary><div className="text-xs space-y-2 mt-2">{[...(batch?.receipts || []), ...(payable?.payments || [])].map(d => <p key={d.id}>{d.id} · {d.date} · {formatCurrency(d.amount)} · {d.account_id} · {d.reference} · actor {d.actor_id}</p>)}{(batch?.history || payable?.history || []).map((h, i) => <p key={i}>{h.at} · {h.actor_id} · {h.action} · {h.note}</p>)}</div></details>}
    </form>
  </Modal>;
}
