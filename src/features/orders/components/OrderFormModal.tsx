import { useEffect, useState } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';

// Order creation component owned by the Orders feature.
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import type {
  Customer,
  Product,
  OrderItemInput,
  OrderStatus,
  PaymentStatus,
} from '@/types';

interface OrderFormModalProps {
  open?: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onSuccess?: () => void;
}

interface LineItem extends OrderItemInput {
  id: string;
}

const TAX_RATE = 0.10;
const SHIPPING_DEFAULT = 30000;

export function OrderFormModal({ open = true, onClose, onSaved, onSuccess }: OrderFormModalProps) {
  const toast = useToast();
  const { activeTenant } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [shipping, setShipping] = useState(SHIPPING_DEFAULT);

  useEffect(() => {
    if (!open) return;
    resetForm();
    Promise.all([
      supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', activeTenant!.id)
        .eq('status', 'active')
        .order('name'),
      supabase.from('products').select('*').eq('tenant_id', activeTenant!.id).eq('status', 'active').order('name'),
    ]).then(([cRes, pRes]) => {
      setCustomers(cRes.data ?? []);
      setProducts(pRes.data ?? []);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTenant?.id]);

  function resetForm() {
    setCustomerId('');
    setStatus('pending');
    setPaymentStatus('unpaid');
    setPaymentMethod('credit_card');
    setShippingAddress('');
    setNotes('');
    setItems([]);
    setProductSearch('');
    setDiscount(0);
    setShipping(SHIPPING_DEFAULT);
    setLoading(true);
  }

  const subtotal = items.reduce((sum, i) => sum + i.line_total, 0);
  const tax = subtotal * TAX_RATE;
  const total = Math.max(subtotal + tax + shipping - discount, 0);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  function addProduct(product: Product) {
    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      updateQty(existing.id, existing.quantity + 1);
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        quantity: 1,
        unit_price: Number(product.price),
        line_total: Number(product.price),
      },
    ]);
  }

  function updateQty(itemId: string, qty: number) {
    if (qty < 1) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, quantity: qty, line_total: qty * i.unit_price }
          : i
      )
    );
  }

  function updatePrice(itemId: string, price: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, unit_price: price, line_total: i.quantity * price }
          : i
      )
    );
  }

  function removeItem(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  async function handleSave() {
    if (!customerId) {
      toast('Vui lòng chọn khách hàng', 'error');
      return;
    }
    if (items.length === 0) {
      toast('Thêm ít nhất một sản phẩm vào đơn hàng', 'error');
      return;
    }
    const invalidQty = items.find((i) => i.quantity <= 0);
    if (invalidQty) {
      toast('Số lượng sản phẩm phải lớn hơn 0', 'error');
      return;
    }
    const invalidPrice = items.find((i) => i.unit_price < 0);
    if (invalidPrice) {
      toast('Giá sản phẩm không được âm', 'error');
      return;
    }

    setSaving(true);

    if (!activeTenant?.id) {
      toast('Vui long chon workspace', 'error');
      setSaving(false);
      return;
    }

    const { data: orderNumberData } = await supabase.rpc('next_order_number');
    const orderNumber = orderNumberData ?? `ORD-${Date.now()}`;
    const idempotencyKey = `idemp_${activeTenant.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const payloadItems = items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      product_sku: i.product_sku,
      quantity: i.quantity,
      unit_price: i.unit_price,
      line_total: i.line_total,
    }));

    const { error: atomicError } = await supabase.rpc('place_order_atomic', {
      p_tenant_id: activeTenant.id,
      p_customer_id: customerId,
      p_order_number: orderNumber,
      p_items: payloadItems,
      p_subtotal: subtotal,
      p_tax: tax,
      p_shipping: shipping,
      p_discount: discount,
      p_total: total,
      p_payment_status: paymentStatus,
      p_payment_method: paymentMethod,
      p_shipping_address: shippingAddress || null,
      p_notes: notes || null,
      p_idempotency_key: idempotencyKey,
    });

    if (atomicError) {
      if (atomicError.code === '42883') {
        toast('Lỗi hệ thống: RPC place_order_atomic chưa được cấu hình trên database. Thao tác ghi bị chặn để bảo vệ an toàn tồn kho.', 'error');
      } else {
        toast('Tạo đơn thất bại: ' + atomicError.message, 'error');
      }
      setSaving(false);
      return;
    }

    toast(`Don hang ${orderNumber} da tao thanh cong`, 'success');
    setSaving(false);
    if (onSaved) onSaved(); if (onSuccess) onSuccess();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tạo đơn hàng mới"
      subtitle="Chọn khách hàng và thêm sản phẩm để tạo đơn"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Hủy</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? <Spinner size={16} /> : null}
            Tạo đơn
          </button>
        </>
      }
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size={28} />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Customer + status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Khách hàng *</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="input"
              >
                <option value="">Chọn khách hàng...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `· ${c.company}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Trạng thái đơn</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="input"
              >
                <option value="pending">Chờ xử lý</option>
                <option value="processing">Đang xử lý</option>
                <option value="shipped">Đã giao</option>
                <option value="delivered">Đã nhận</option>
                <option value="cancelled">Đã hủy</option>
                <option value="refunded">Đã hoàn tiền</option>
              </select>
            </div>
            <div>
              <label className="label">Trạng thái thanh toán</label>
              <select
                value={paymentStatus}
                onChange={(e) =>
                  setPaymentStatus(e.target.value as PaymentStatus)
                }
                className="input"
              >
                <option value="unpaid">Chưa thanh toán</option>
                <option value="paid">Đã thanh toán</option>
                <option value="partially_paid">Thanh toán một phần</option>
                <option value="refunded">Đã hoàn tiền</option>
              </select>
            </div>
            <div>
              <label className="label">Phương thức thanh toán</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="input"
              >
                <option value="credit_card">Thẻ tín dụng</option>
                <option value="debit_card">Thẻ ghi nợ</option>
                <option value="paypal">PayPal</option>
                <option value="bank_transfer">Chuyển khoản</option>
                <option value="cash">Tiền mặt</option>
                <option value="check">Séc</option>
              </select>
            </div>
          </div>

          {/* Product picker */}
          <div>
            <label className="label">Thêm sản phẩm</label>
            <div className="relative mb-3">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Tìm sản phẩm theo tên hoặc SKU..."
                className="input pl-9"
              />
            </div>
            {productSearch && (
              <div className="border border-ink-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-ink-100">
                {filteredProducts.length === 0 ? (
                  <p className="text-sm text-ink-400 p-4 text-center">
                    Không tìm thấy sản phẩm
                  </p>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        addProduct(p);
                        setProductSearch('');
                      }}
                      className="w-full flex items-center justify-between p-3 hover:bg-ink-50 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink-800">
                          {p.name}
                        </p>
                        <p className="text-xs text-ink-400">
                          {p.sku} · con {p.stock}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink-700">
                          {formatCurrency(Number(p.price))}
                        </span>
                        <Plus size={16} className="text-brand-600" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Line items */}
          {items.length > 0 && (
            <div className="border border-ink-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">
                      San pham
                    </th>
                    <th className="text-center px-4 py-2.5 font-semibold w-20">
                      SL
                    </th>
                    <th className="text-right px-4 py-2.5 font-semibold w-28">
                      Don gia
                    </th>
                    <th className="text-right px-4 py-2.5 font-semibold w-28">
                      Thanh tien
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-ink-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink-800">
                          {item.product_name}
                        </p>
                        <p className="text-xs text-ink-400">{item.product_sku}</p>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateQty(item.id, parseInt(e.target.value) || 1)
                          }
                          className="w-16 text-center rounded-md border border-ink-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) =>
                            updatePrice(
                              item.id,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-24 text-right rounded-md border border-ink-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-ink-800 tabular-nums">
                        {formatCurrency(item.line_total)}
                      </td>
                      <td className="px-2 py-3">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-ink-400 hover:text-rose-600 transition-colors p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals + extras */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="label">Địa chỉ giao hàng</label>
                <textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  rows={2}
                  placeholder="So nha, duong, phuong, quan, TP"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Ghi chu</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ghi chu noi bo..."
                  className="input"
                />
              </div>
            </div>
            <div className="bg-ink-50 rounded-lg p-4 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">Tạm tính</span>
                <span className="font-medium text-ink-800 tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">VAT (10%)</span>
                <span className="font-medium text-ink-800 tabular-nums">
                  {formatCurrency(tax)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">Phi van chuyen</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="1000"
                    value={shipping}
                    onChange={(e) =>
                      setShipping(parseFloat(e.target.value) || 0)
                    }
                    className="w-20 text-right rounded-md border border-ink-200 px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">Giảm giá</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="1000"
                    value={discount}
                    onChange={(e) =>
                      setDiscount(parseFloat(e.target.value) || 0)
                    }
                    className="w-20 text-right rounded-md border border-ink-200 px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>
              <div className="border-t border-ink-200 pt-2.5 flex items-center justify-between">
                <span className="text-base font-semibold text-ink-900">
                  Tong cong
                </span>
                <span className="text-lg font-bold text-ink-900 tabular-nums">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
