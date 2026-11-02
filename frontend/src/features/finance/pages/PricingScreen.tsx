import { ShopPricingAssumptions } from '../components/ShopPricingAssumptions';
import type { PricingAssumptions } from '@/mock/finance';
import React, { useState } from 'react';
import { Calculator, Sparkles, Tag, ShieldCheck, HelpCircle } from 'lucide-react';
import { PricingWaterfallSimulator } from '@/components/charts/PricingWaterfallSimulator';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { omsStore as mockStore } from '@/stores/omsStore';

export function PricingIntelligencePage() {
  const products = mockStore.getProducts();

  const [assumptions,setAssumptions] = useState<PricingAssumptions | null>(null);
  const [selectedProduct, setSelectedProduct] = useState(products[0] || null);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Máy Tính Định Giá & Ngưỡng An Toàn
            </h1>
            <span className="badge bg-purple-100 text-purple-800 border-purple-300 text-xs font-bold">
              Dynamic Break-even & Max Discount Simulator
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Tính toán giá hòa vốn, giá bán mục tiêu và hạn mức chiết khấu an toàn cho từng sản phẩm.
          </p>
        </div>

        {/* Product selector */}
        {products.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-500 font-medium">Chọn sản phẩm mẫu:</span>
            <select
              value={selectedProduct?.id}
              onChange={(e) => {
                const p = products.find(prod => prod.id === e.target.value);
                if (p) setSelectedProduct(p);
              }}
              className="input text-xs py-1.5 px-3 bg-white border border-ink-200 font-semibold text-ink-800"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Simulator Widget */}
      <AnalyticsCard
        title={`Công Cụ Mô Phỏng Giá Bán & Phí Sàn Cho: ${selectedProduct?.name || 'Sản Phẩm'}`}
        subtitle="Kéo thả các thanh trượt để quan sát ngay lập tức biến động của Lãi gộp CM1, Đóng góp CM2 và Lợi nhuận sau Ads CM3"
        sourceType="SIMULATED"
      >
        <ShopPricingAssumptions onChange={setAssumptions}/>
        <PricingWaterfallSimulator
          key={`${selectedProduct?.id}:${JSON.stringify(assumptions)}`}
          lowMarginPercent={assumptions?.low_margin_percent ?? 10}
          initialValues={{
            basePrice: selectedProduct?.price ?? 0,
            cogs: selectedProduct?.moving_avg_cost ?? selectedProduct?.cost_price ?? selectedProduct?.cost ?? 0,
            marketplaceFeePercent: assumptions?.commission_percent ?? 0,
            paymentFeePercent: assumptions?.payment_percent ?? 0,
            packagingFulfillmentCost: assumptions?.packaging ?? 0,
            allocatedMarketingPercent: assumptions?.ads_percent ?? 0,
            targetCm2Percent: 35.0,
            voucherDiscountAmount: assumptions?.seller_voucher ?? 0,
            configuredTaxPercent: assumptions?.configured_tax_percent ?? 0, taxIncludedInFees: assumptions?.tax_included_in_fees ?? false
          }}
        />
      </AnalyticsCard>

      {/* Methodology & Safety Guardrails */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-ink-50 border border-ink-200 space-y-1.5">
          <span className="font-bold text-ink-900 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" /> 1. Giá Hòa Vốn (Break-even Price)
          </span>
          <p className="text-ink-600 leading-relaxed">
            Công thức: Price = (COGS + Fulfillment) / (1 - (Phí Sàn + Thanh Toán)). Bán dưới mức giá này sẽ trực tiếp gây lỗ biên CM2 trên mỗi chiếc bán ra.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-ink-50 border border-ink-200 space-y-1.5">
          <span className="font-bold text-ink-900 flex items-center gap-1.5">
            <Sparkles size={14} className="text-brand-600" /> 2. Giá Bán Đề Xuất (Target Margin)
          </span>
          <p className="text-ink-600 leading-relaxed">
            Tự động tính toán giá niêm yết cần thiết để đảm bảo sau khi trừ toàn bộ chi phí biến đổi, doanh nghiệp vẫn giữ được tỷ lệ CM2 mong muốn (mặc định 35%).
          </p>
        </div>

        <div className="p-4 rounded-xl bg-ink-50 border border-ink-200 space-y-1.5">
          <span className="font-bold text-ink-900 flex items-center gap-1.5">
            <Tag size={14} className="text-purple-600" /> 3. Ngưỡng Voucher Tối Đa (Safety Cap)
          </span>
          <p className="text-ink-600 leading-relaxed">
            Mức giảm giá tối đa doanh nghiệp có thể tài trợ trên sàn trước khi giá thực thu chạm vào giá hòa vốn. Ngăn chặn triệt để tình trạng "càng bán nhiều càng lỗ".
          </p>
        </div>
      </div>
    </div>
  );
}
