import React, { useState } from 'react';
import { Calculator, RotateCcw, TrendingUp, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { simulatePricing } from '@/analytics/metricsEngine';
import type { PricingSimulationInput } from '@/analytics/types';
import { WaterfallChart } from './WaterfallChart';
import { cn } from '@/lib/cn';

interface PricingWaterfallSimulatorProps {
  lowMarginPercent?: number;
  initialValues?: Partial<PricingSimulationInput>;
  className?: string;
}

export function PricingWaterfallSimulator({ initialValues, className, lowMarginPercent = 10 }: PricingWaterfallSimulatorProps) {
  const defaultInput: PricingSimulationInput = {
    configuredTaxPercent: initialValues?.configuredTaxPercent ?? 0,
    taxIncludedInFees: initialValues?.taxIncludedInFees ?? false,
    basePrice: initialValues?.basePrice ?? 550000,
    cogs: initialValues?.cogs ?? 220000,
    marketplaceFeePercent: initialValues?.marketplaceFeePercent ?? 9.5,
    paymentFeePercent: initialValues?.paymentFeePercent ?? 2.0,
    packagingFulfillmentCost: initialValues?.packagingFulfillmentCost ?? 18000,
    allocatedMarketingPercent: initialValues?.allocatedMarketingPercent ?? 8.0,
    targetCm2Percent: initialValues?.targetCm2Percent ?? 35.0,
    voucherDiscountAmount: initialValues?.voucherDiscountAmount ?? 30000
  };

  const [input, setInput] = useState<PricingSimulationInput>(defaultInput);

  const result = simulatePricing(input);

  const handleReset = () => {
    setInput(defaultInput);
  };

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-5', className)}>
      <p className="lg:col-span-12 text-xs text-slate-500">Mô phỏng trước bán · thuế/phí tự nhập {input.configuredTaxPercent || 0}% {input.taxIncludedInFees ? '(đã nằm trong phí khác, không cộng lại)' : '(cộng riêng)'}. Không cập nhật giá sàn. {result.simulatedCm3Margin < lowMarginPercent ? `Cảnh báo: CM3 ${result.simulatedCm3Margin.toFixed(1)}% dưới ngưỡng ${lowMarginPercent}%` : 'Đối chiếu đơn thực tế trước quyết định.'}</p>
      {result.valid === false && <p role="alert" className="lg:col-span-12 text-sm text-rose-700">{result.invalidReason}</p>}
      {/* Left Column: Interactive Inputs */}
      <div className="lg:col-span-5 space-y-4 p-4 sm:p-5 rounded-xl bg-ink-50/70 border border-ink-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-brand-600" />
            <h4 className="text-sm font-bold text-ink-900">Thông Số Định Giá Tương Tác</h4>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-ink-500 hover:text-ink-800 flex items-center gap-1"
          >
            <RotateCcw size={12} /> Đặt lại
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="font-semibold text-ink-800 flex justify-between">
              <span>Giá niêm yết (₫):</span>
              <span className="font-bold text-brand-900">{input.basePrice.toLocaleString()} ₫</span>
            </label>
            <input
              type="range"
              min={100000}
              max={2000000}
              step={10000}
              value={input.basePrice}
              onChange={(e) => setInput({ ...input, basePrice: Number(e.target.value) })}
              className="w-full accent-brand-600 mt-1"
            />
          </div>

          <div>
            <label className="font-semibold text-ink-800 flex justify-between">
              <span>Giá vốn hàng bán (COGS):</span>
              <span className="font-bold text-rose-700">{input.cogs.toLocaleString()} ₫</span>
            </label>
            <input
              type="range"
              min={50000}
              max={1000000}
              step={10000}
              value={input.cogs}
              onChange={(e) => setInput({ ...input, cogs: Number(e.target.value) })}
              className="w-full accent-rose-600 mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="font-semibold text-ink-800 block text-[11px]">
                Phí sàn TMĐT (%):
                <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded ml-1 font-mono">GIẢ ĐỊNH</span>
              </label>
              <input
                type="number"
                step={0.5}
                value={input.marketplaceFeePercent}
                onChange={(e) => setInput({ ...input, marketplaceFeePercent: Number(e.target.value) || 0 })}
                className="input text-xs py-1 px-2.5 mt-1 font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-ink-800 block text-[11px]">
                Phí cổng thanh toán (%):
                <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded ml-1 font-mono">GIẢ ĐỊNH</span>
              </label>
              <input
                type="number"
                step={0.5}
                value={input.paymentFeePercent}
                onChange={(e) => setInput({ ...input, paymentFeePercent: Number(e.target.value) || 0 })}
                className="input text-xs py-1 px-2.5 mt-1 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="font-semibold text-ink-800 block text-[11px]">Chi phí đóng gói & kho (₫):</label>
              <input
                type="number"
                step={1000}
                value={input.packagingFulfillmentCost}
                onChange={(e) => setInput({ ...input, packagingFulfillmentCost: Number(e.target.value) || 0 })}
                className="input text-xs py-1 px-2.5 mt-1 font-bold"
              />
            </div>
            <div>
              <label className="font-semibold text-ink-800 block text-[11px]">Voucher giảm giá (₫):</label>
              <input
                type="number"
                step={5000}
                value={input.voucherDiscountAmount}
                onChange={(e) => setInput({ ...input, voucherDiscountAmount: Number(e.target.value) || 0 })}
                className="input text-xs py-1 px-2.5 mt-1 font-bold"
              />
            </div>
          </div>

          <div className="pt-1">
            <label className="font-semibold text-ink-800 flex justify-between text-[11px]">
              <span>Mục tiêu biên lợi nhuận CM2 (%):</span>
              <span className="font-bold text-emerald-700">{input.targetCm2Percent}%</span>
            </label>
            <input
              type="range"
              min={10}
              max={60}
              step={1}
              value={input.targetCm2Percent}
              onChange={(e) => setInput({ ...input, targetCm2Percent: Number(e.target.value) })}
              className="w-full accent-emerald-600 mt-1"
            />
          </div>
        </div>

        {/* Dynamic Key Outputs */}
        <div className="p-3 bg-white rounded-lg border border-ink-200 space-y-2 mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink-600">Giá hòa vốn (Break-even):</span>
            <span className="font-bold text-rose-700">{result.breakEvenPrice.toLocaleString()} ₫</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink-600">Giá bán đề xuất (Target {input.targetCm2Percent}%):</span>
            <span className="font-bold text-emerald-700">{result.recommendedPrice.toLocaleString()} ₫</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-ink-100">
            <span className="font-medium text-ink-600">Mức giảm giá tối đa cho phép:</span>
            <span className="font-bold text-brand-900">{result.maxAllowedDiscount.toLocaleString()} ₫</span>
          </div>
        </div>
      </div>

      {/* Right Column: Waterfall P&L Breakdown */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-sm font-bold text-ink-900">
            Mô Phỏng Thác Dòng Lợi Nhuận (Waterfall Unit Economics)
          </h4>
          <div className="flex items-center gap-2">
            <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              CM2: {result.simulatedCm2Margin}% ({result.simulatedCm2.toLocaleString()} ₫)
            </span>
            <span className="badge bg-blue-100 text-blue-800 text-[10px] font-bold">
              CM3 sau Ads: {result.simulatedCm3Margin}% ({result.simulatedCm3.toLocaleString()} ₫)
            </span>
          </div>
        </div>

        <WaterfallChart data={result.waterfallBreakdown} />
      </div>
    </div>
  );
}
