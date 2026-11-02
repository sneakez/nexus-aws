import { useState, useEffect } from 'react';
import { omsStore as mockStore } from '@/stores/omsStore';
import type { PricingAssumptions } from '@/mock/finance';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/providers/AuthProvider';
import { hasPermission } from '@/lib/permissions';
export function ShopPricingAssumptions({ onChange }: { onChange: (config: PricingAssumptions) => void }) {
  const shops = mockStore.getSnapshot().channelConnections?.filter(c => !mockStore.authorize('products:view', c)) || [];
  const [shop, setShop] = useState(shops[0]?.shop_id || '');
  const initial = (id: string): PricingAssumptions => mockStore.getPricingAssumptions(id) || { shop_id: id, commission_percent: 0, payment_percent: 0, packaging: 0, ads_percent: 0, seller_voucher: 0, configured_tax_percent: 0, tax_included_in_fees: false, low_margin_percent: 10 };
  const [config, setConfig] = useState(initial(shop));
  useEffect(()=>onChange(config),[shop]);
  const toast = useToast(), { activeRole } = useAuth();
  const labels: Array<[keyof PricingAssumptions, string]> = [['commission_percent','Phí sàn (%)'],['payment_percent','Thanh toán (%)'],['packaging','Đóng gói (VND)'],['ads_percent','Ads dự kiến (%)'],['seller_voucher','Voucher người bán chịu (VND)'],['configured_tax_percent','Thuế/phí tự cấu hình (%)'],['low_margin_percent','Cảnh báo CM3 dưới (%)']];
  return <details className="text-sm space-y-3"><summary className="cursor-pointer font-semibold">Giả định mô phỏng theo shop/kênh</summary>
    <p className="text-xs text-slate-500">Chưa lưu cấu hình thì mặc định 0 để tự nhập; không phải biểu phí/thuế áp dụng toàn khu vực. Không đổi giá trên sàn. Kết quả thực tế xem Lợi nhuận đơn.</p>
    <select aria-label="Shop giả định giá" className="input" value={shop} onChange={e => { setShop(e.target.value); const next=initial(e.target.value); setConfig(next); onChange(next); }}>{shops.map(c => <option key={c.id} value={c.shop_id}>{c.shop_id} · {c.channel}</option>)}</select>
    <div className="grid grid-cols-2 gap-3">{labels.map(([key,label]) => <label key={key}>{label}<input aria-label={label} type="number" min="0" className="input w-full" value={Number(config[key])} onChange={e => { const next={...config,[key]:Number(e.target.value)};setConfig(next);onChange(next); }}/></label>)}</div>
    <label className="flex gap-2"><input type="checkbox" checked={config.tax_included_in_fees} onChange={e => {const next={...config,tax_included_in_fees:e.target.checked};setConfig(next);onChange(next);}}/>Thuế/phí cấu hình đã nằm trong phí sàn/thanh toán (không cộng lại)</label>
    <button type="button" disabled={!hasPermission(activeRole,'products:manage') || !shop} className="btn-secondary" onClick={() => { const r=mockStore.savePricingAssumptions(config);toast(r.success?'Đã lưu giả định mock cho shop':r.error || 'Không thể lưu',r.success?'success':'error');if(r.success)onChange(config); }}>Lưu giả định shop</button>
  </details>;
}
