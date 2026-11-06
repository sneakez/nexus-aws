import { Calculator, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useAuth } from '@/providers/AuthProvider';
import { workspaceService, type ApiRow } from '@/services/workspace.service';

export type PricingInput = { listPrice: number; cost: number; marketplaceFee: number; paymentFee: number; fulfillmentCost: number; advertisingFee: number; targetMargin: number; voucher: number };
type WaterfallRow = { label: string; amount: number; type: 'income' | 'cost' | 'total' };

const initialInput: PricingInput = { listPrice: 500_000, cost: 200_000, marketplaceFee: 8, paymentFee: 2, fulfillmentCost: 18_000, advertisingFee: 8, targetMargin: 35, voucher: 0 };
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const asNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0;
const productLabel = (product: ApiRow) => `${String(product.sku ?? '')} · ${String(product.name ?? '')}`;

export function calculatePricing(input: PricingInput) {
  const feeRate = (input.marketplaceFee + input.paymentFee) / 100;
  const adsRate = input.advertisingFee / 100;
  const effectiveRevenue = Math.max(0, input.listPrice - input.voucher);
  const breakEvenDenominator = 1 - feeRate;
  const targetDenominator = 1 - feeRate - input.targetMargin / 100;
  const adsBreakEvenDenominator = 1 - feeRate - adsRate;
  const breakEven = breakEvenDenominator > 0.000001 ? Math.ceil((input.cost + input.fulfillmentCost) / breakEvenDenominator) : null;
  const breakEvenWithAds = adsBreakEvenDenominator > 0.000001 ? Math.ceil((input.cost + input.fulfillmentCost) / adsBreakEvenDenominator) : null;
  const recommended = targetDenominator > 0.000001 ? Math.ceil((input.cost + input.fulfillmentCost) / targetDenominator) : null;
  const platformFees = Math.round(effectiveRevenue * input.marketplaceFee / 100);
  const paymentFees = Math.round(effectiveRevenue * input.paymentFee / 100);
  const advertisingCost = Math.round(effectiveRevenue * adsRate);
  const cm1 = effectiveRevenue - input.cost;
  const cm2 = cm1 - platformFees - paymentFees - input.fulfillmentCost;
  const cm3 = cm2 - advertisingCost;
  return { effectiveRevenue, breakEven, breakEvenWithAds, recommended, maxDiscount: breakEven === null ? null : Math.max(0, input.listPrice - breakEven), cm1, cm2, cm3, rows: [
    { label: 'Giá niêm yết', amount: input.listPrice, type: 'income' as const }, { label: 'Voucher / giảm giá', amount: -input.voucher, type: 'cost' as const }, { label: 'Doanh thu sau giảm giá', amount: effectiveRevenue, type: 'total' as const }, { label: 'Giá vốn', amount: -input.cost, type: 'cost' as const }, { label: 'Lợi nhuận gộp (CM1)', amount: cm1, type: 'total' as const }, { label: 'Phí sàn và thanh toán', amount: -(platformFees + paymentFees), type: 'cost' as const }, { label: 'Đóng gói và vận hành', amount: -input.fulfillmentCost, type: 'cost' as const }, { label: 'Lợi nhuận sau phí (CM2)', amount: cm2, type: 'total' as const }, { label: 'Chi phí quảng cáo', amount: -advertisingCost, type: 'cost' as const }, { label: 'Lợi nhuận sau quảng cáo (CM3)', amount: cm3, type: 'total' as const },
  ] };
}

function Waterfall({ rows }: { rows: WaterfallRow[] }) {
  const baseline = Math.max(Math.abs(rows[0]?.amount ?? 0), 1);
  return <div className="space-y-2">{rows.map(row => {
    const percent = Math.min(100, Math.round(Math.abs(row.amount) / baseline * 100));
    const color = row.type === 'income' ? 'bg-emerald-500' : row.type === 'cost' ? 'bg-rose-500' : 'bg-brand-700';
    const amountColor = row.type === 'income' ? 'text-emerald-700' : row.type === 'cost' ? 'text-rose-700' : 'text-brand-900';
    return <div key={row.label} className={'grid grid-cols-[minmax(0,1fr)_minmax(5rem,1.2fr)_9rem] items-center gap-3 rounded-lg px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(6rem,1.2fr)_10rem] ' + (row.type === 'total' ? 'border border-ink-200 bg-ink-50 font-semibold' : '')}>
      <span className="min-w-0 break-words text-ink-800">{row.label}</span><div className="h-2.5 overflow-hidden rounded-full bg-ink-100"><div className={'h-full rounded-full transition-[width] duration-300 ' + color} style={{ width: percent + '%' }} /></div><strong className={'whitespace-nowrap text-right tabular-nums ' + amountColor}>{row.amount < 0 ? '−' : row.type === 'income' ? '+' : ''}{money.format(Math.abs(row.amount))}</strong>
    </div>;
  })}</div>;
}

export function BackendPricingCalculator() {
  const { session } = useAuth();
  const token = session?.access_token;
  const productsQuery = useQuery({ queryKey: ['workspace', session?.user.id, 'pricing-products'], enabled: Boolean(token), queryFn: ({ signal }) => workspaceService.listProducts(token!, signal) });
  const products = productsQuery.data ?? [];
  const [productId, setProductId] = useState('');
  const [input, setInput] = useState<PricingInput>(initialInput);
  const selectedProduct = products.find(product => product.id === productId);

  useEffect(() => { if (products.length) setProductId(current => current || products[0].id); }, [products]);
  useEffect(() => {
    if (!selectedProduct) return;
    const cost = asNumber(selectedProduct.costPrice);
    setInput(current => ({ ...current, cost, listPrice: Math.max(current.listPrice, Math.ceil(cost * 1.8 / 1_000) * 1_000) }));
  }, [selectedProduct?.id]);

  const result = useMemo(() => calculatePricing(input), [input]);

  const update = (key: keyof PricingInput, value: string) => setInput(current => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));
  const reset = () => setInput(selectedProduct ? { ...initialInput, cost: asNumber(selectedProduct.costPrice), listPrice: Math.max(initialInput.listPrice, Math.ceil(asNumber(selectedProduct.costPrice) * 1.8 / 1_000) * 1_000) } : initialInput);
  return <section className="space-y-5">
    <div className="card space-y-4 p-4 sm:p-5"><div><h2 className="text-lg font-semibold text-ink-900">Mô phỏng giá bán</h2><p className="mt-1 text-sm text-ink-600">Chọn sản phẩm để lấy giá vốn, rồi điều chỉnh các mức phí dự kiến.</p></div><label className="block text-sm font-medium">Sản phẩm<SearchableSelect value={productId} onChange={setProductId} options={products.map(product => ({ value: product.id, label: productLabel(product) }))} placeholder={productsQuery.isLoading ? 'Đang tải sản phẩm...' : 'Chọn sản phẩm'} disabled={productsQuery.isLoading || !products.length} ariaLabel="Chọn sản phẩm để định giá" searchPlaceholder="Tìm SKU hoặc tên sản phẩm..." /></label></div>
    {productsQuery.error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">Không tải được danh mục sản phẩm.</p>}
    {!productsQuery.isLoading && !products.length && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Chưa có sản phẩm đang hoạt động để định giá.</p>}
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(20rem,3fr)_minmax(0,7fr)]">
      <section className="card space-y-5 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Calculator size={18} className="text-brand-700" /><h3 className="font-semibold text-ink-900">Thông số định giá</h3></div><button type="button" onClick={reset} className="btn-secondary text-xs"><RefreshCw size={14} /> Đặt lại</button></div><div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Giá niêm yết (₫)<input type="number" min="0" step="1000" value={input.listPrice} onChange={event => update('listPrice', event.target.value)} className="input mt-1 w-full" /></label><label className="text-sm font-medium">Giá vốn (₫)<input type="number" min="0" step="1000" value={input.cost} onChange={event => update('cost', event.target.value)} className="input mt-1 w-full" /></label><label className="text-sm font-medium">Phí sàn (%)<input type="number" min="0" max="100" step="0.1" value={input.marketplaceFee} onChange={event => update('marketplaceFee', event.target.value)} className="input mt-1 w-full" /></label><label className="text-sm font-medium">Phí thanh toán (%)<input type="number" min="0" max="100" step="0.1" value={input.paymentFee} onChange={event => update('paymentFee', event.target.value)} className="input mt-1 w-full" /></label><label className="text-sm font-medium">Đóng gói, kho (₫)<input type="number" min="0" step="1000" value={input.fulfillmentCost} onChange={event => update('fulfillmentCost', event.target.value)} className="input mt-1 w-full" /></label><label className="text-sm font-medium">Quảng cáo (%)<input type="number" min="0" max="100" step="0.1" value={input.advertisingFee} onChange={event => update('advertisingFee', event.target.value)} className="input mt-1 w-full" /></label><label className="text-sm font-medium">Voucher giảm giá (₫)<input type="number" min="0" step="1000" value={input.voucher} onChange={event => update('voucher', event.target.value)} className="input mt-1 w-full" /></label><label className="text-sm font-medium">Mục tiêu lợi nhuận sau phí (%)<input type="number" min="0" max="100" step="1" value={input.targetMargin} onChange={event => update('targetMargin', event.target.value)} className="input mt-1 w-full" /></label>
      </div><p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Phí sàn, thanh toán, vận hành và quảng cáo là ước tính cho từng tình huống bán. Hệ thống không tự lấy các mức phí này từ sàn.</p></section>
      <section className="card space-y-5 p-4 sm:p-5"><div><h3 className="font-semibold text-ink-900">Kết quả dự kiến</h3><p className="mt-1 text-sm text-ink-600">Tính trên một sản phẩm, sau voucher và các chi phí đã nhập.</p></div><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-rose-50 p-3"><p className="text-xs text-rose-800">Giá hòa vốn</p><strong className="mt-1 block text-base text-rose-900">{result.breakEven === null ? 'Không hợp lệ' : money.format(result.breakEven)}</strong></div><div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-emerald-800">Giá đề xuất</p><strong className="mt-1 block text-base text-emerald-900">{result.recommended === null ? 'Không hợp lệ' : money.format(result.recommended)}</strong></div><div className="rounded-lg bg-brand-50 p-3"><p className="text-xs text-brand-800">Voucher tối đa</p><strong className="mt-1 block text-base text-brand-900">{result.maxDiscount === null ? '—' : money.format(result.maxDiscount)}</strong></div></div>
        {result.recommended === null && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">Tổng phí và mục tiêu lợi nhuận phải nhỏ hơn 100% để tính giá đề xuất.</p>}
        <div className="grid grid-cols-3 gap-3 text-center text-sm"><div><p className="text-ink-600">CM1</p><strong className={result.cm1 < 0 ? 'text-rose-700' : 'text-emerald-700'}>{money.format(result.cm1)}</strong></div><div><p className="text-ink-600">CM2</p><strong className={result.cm2 < 0 ? 'text-rose-700' : 'text-emerald-700'}>{money.format(result.cm2)}</strong></div><div><p className="text-ink-600">CM3</p><strong className={result.cm3 < 0 ? 'text-rose-700' : 'text-emerald-700'}>{money.format(result.cm3)}</strong></div></div>
        <div className="border-t border-ink-100 pt-4"><div className="mb-3 flex items-center justify-between gap-3"><h4 className="font-semibold text-ink-900">Dòng tiền và chi phí</h4><span className="text-xs text-ink-600">Doanh thu sau giảm: {money.format(result.effectiveRevenue)}</span></div><Waterfall rows={result.rows} /></div><p className="text-xs text-ink-600">Giá hòa vốn sau quảng cáo: <strong>{result.breakEvenWithAds === null ? 'Không hợp lệ' : money.format(result.breakEvenWithAds)}</strong> · Mục tiêu hiện tại: {number.format(input.targetMargin)}%.</p>
      </section>
    </div>
  </section>;
}
