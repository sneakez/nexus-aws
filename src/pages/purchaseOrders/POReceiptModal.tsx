import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { mockStore } from '@/mock/store';

export function POReceiptModal({ poId, onClose, onSaved }: { poId: string; onClose: () => void; onSaved: () => void }) {
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [receiptId,setReceiptId]=useState<string>(crypto.randomUUID());
  const [error, setError] = useState('');
  const items = mockStore.getSnapshot().purchaseOrderItems?.filter(i => i.po_id === poId) || [];
  return <Modal open onClose={onClose} title="Nhận PO theo đợt thực tế"><div className="space-y-4 text-sm">
    <label className="block">Mã đợt nhận PO<input aria-label="Mã đợt nhận PO" className="input w-full" value={receiptId} onChange={e=>setReceiptId(e.target.value)}/></label>
    {items.map(i => <label className="block" key={i.id}>{mockStore.getProducts().find(p => p.id === i.product_id)?.sku} · còn {i.quantity - i.received_qty}
      <input aria-label={`Nhận PO ${i.id}`} type="number" min="0" value={quantities[i.id] || ''} onChange={e => setQuantities({ ...quantities, [i.id]: e.target.value })} className="border rounded p-2 w-full"/>
    </label>)}
    <p role="alert" className="text-rose-700">{error}</p><p className="text-slate-600">Demo nhận hàng đạt kiểm đếm: cộng tồn khả dụng và cập nhật MAC. Các đợt sau chỉ nhận lượng còn thiếu. Ghi nợ NCC bằng giá trị nhận thực tế; không tự chi tiền.</p>
    <button className="btn-primary" onClick={() => { const result = mockStore.receivePurchaseOrder(poId, items.map(i => ({ item_id: i.id, qty: Number(quantities[i.id] || 0) })),receiptId); if (!result.success) setError(result.error || 'Không nhận được PO'); else onSaved(); }}>Lưu đợt nhận PO</button>
  </div></Modal>;
}
