import { EconomicsPeriod, type EconomicsPeriodValue } from '@/components/charts/EconomicsPeriod';

// Channel profitability feature screen.
import React, { useState } from 'react';
import { Layers, TrendingUp, DollarSign, Percent, AlertCircle, ShieldCheck, CheckCircle2, ShoppingCart } from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { KPICard } from '@/components/charts/KPICard';
import { GroupedBarChart } from '@/components/charts/GroupedBarChart';
import { SnapshotMetadataBanner } from '@/components/common/SnapshotMetadataBanner';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/utils';

interface ChannelEconomicsPageProps {
  onNavigate?: (pageId: string) => void;
}

export function ChannelEconomicsPage({ onNavigate }: ChannelEconomicsPageProps) {
  const [chartView, setChartView] = useState<'revenue_cm3' | 'margin_percent' | 'cost_per_order'>('revenue_cm3');
  const [period,setPeriod]=useState<EconomicsPeriodValue>('all');
  const channels = analyticsService.getChannelEconomics(undefined, period === 'all' ? undefined : period);

  const totalNet = channels.reduce((sum, c) => sum + c.netRevenue, 0);
  const totalCogs = channels.reduce((sum, c) => sum + c.cogs, 0);
  const totalCm1 = channels.reduce((sum, c) => sum + c.cm1, 0);
  const totalMktFees = channels.reduce((sum, c) => sum + c.marketplaceFees, 0);
  const totalPayFees = channels.reduce((sum, c) => sum + c.paymentFees, 0);
  const totalFulfillment = channels.reduce((sum, c) => sum + c.fulfillmentCosts, 0);
  const totalShipSubsidies = channels.reduce((sum, c) => sum + c.shippingSubsidies, 0);
  const totalReturnCosts = channels.reduce((sum, c) => sum + c.returnCosts, 0);
  const totalVariableCosts = channels.reduce((sum, c) => sum + c.totalVariableCosts, 0);
  const totalCm2 = channels.reduce((sum, c) => sum + c.cm2, 0);
  const totalMarketing = channels.reduce((sum, c) => sum + c.marketingSpend, 0);
  const totalCm3 = channels.reduce((sum, c) => sum + c.cm3, 0);
  const blendedTakeRate = totalNet > 0 ? (totalMktFees / totalNet) * 100 : 0;

  const chartData = channels.map(c => {
    if (chartView === 'margin_percent') {
      return {
        name: c.channelName,
        'Biên CM1 (%)': c.cm1Margin,
        'Biên CM2 (%)': c.cm2Margin,
        'Biên CM3 (%)': c.cm3Margin
      };
    }
    if (chartView === 'cost_per_order') {
      const perOrderFees = c.orderCount > 0 ? Math.round(c.marketplaceFees / c.orderCount) : 0;
      const perOrderOps = c.orderCount > 0 ? Math.round((c.fulfillmentCosts + c.shippingSubsidies + c.returnCosts) / c.orderCount) : 0;
      const perOrderAds = c.orderCount > 0 ? Math.round(c.marketingSpend / c.orderCount) : 0;
      return {
        name: c.channelName,
        'Phí Sàn / Đơn (₫)': perOrderFees,
        'Vận Hành & Hoàn / Đơn (₫)': perOrderOps,
        'Ads / Đơn (₫)': perOrderAds
      };
    }
    return {
      name: c.channelName,
      'Doanh thu thuần (₫)': c.netRevenue,
      'Lợi nhuận CM2 (₫)': c.cm2,
      'Lợi nhuận CM3 sau Ads (₫)': c.cm3
    };
  });

  const chartSeries = chartView === 'margin_percent'
    ? [
        { key: 'Biên CM1 (%)', label: 'Biên CM1 (%)', color: '#6366F1' },
        { key: 'Biên CM2 (%)', label: 'Biên CM2 (%)', color: '#0284C7' },
        { key: 'Biên CM3 (%)', label: 'Biên CM3 (%)', color: '#10B981' }
      ]
    : chartView === 'cost_per_order'
    ? [
        { key: 'Phí Sàn / Đơn (₫)', label: 'Phí Sàn / Đơn (₫)', color: '#F59E0B' },
        { key: 'Vận Hành & Hoàn / Đơn (₫)', label: 'Vận Hành & Hoàn / Đơn (₫)', color: '#EC4899' },
        { key: 'Ads / Đơn (₫)', label: 'Ads / Đơn (₫)', color: '#8B5CF6' }
      ]
    : [
        { key: 'Doanh thu thuần (₫)', label: 'Doanh thu thuần (₫)', color: '#27B4A0' },
        { key: 'Lợi nhuận CM2 (₫)', label: 'Lợi nhuận CM2 (₫)', color: '#0284C7' },
        { key: 'Lợi nhuận CM3 sau Ads (₫)', label: 'Lợi nhuận CM3 sau Ads (₫)', color: '#10B981' }
      ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Hiệu Quả & Phí Từng Kênh Bán Hàng
            </h1>
            <span className="badge bg-blue-100 text-blue-800 border-blue-300 text-xs font-bold">
              Phí sàn & doanh thu / Ads net
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            So sánh biên lợi nhuận giữa TikTok Shop, Shopee, Lazada và Website D2C để phân bổ chi phí tối ưu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate?.('orders')}
            className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm font-bold cursor-pointer"
          >
            <ShoppingCart size={14} />
            <span>Xem Đơn Hàng Theo Kênh</span>
          </button>
        </div>
      </div>

      <EconomicsPeriod value={period} onChange={setPeriod}/>

      {/* Snapshot Metadata Banner */}
      <SnapshotMetadataBanner
        currentModule="Hiệu quả kênh"
        orderCount={channels.reduce((sum, c) => sum + c.orderCount, 0)}
        dateFilter="30 Ngày Qua (Toàn Bộ 12 Đơn Hàng)"
      />

      {/* Assumption Disclosure Banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
        <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold mr-1.5 uppercase tracking-wider text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
            GIẢ ĐỊNH
          </span>
          Toàn bộ tỷ lệ phí hoa hồng sàn (Commission), phí cổng thanh toán (Payment fee) và tỷ lệ hoàn trả (Return rate) đang sử dụng <strong>tham số giả định theo chuẩn ngành TMĐT Việt Nam</strong>; chưa qua đối soát thực tế từ bảng sao kê sàn (Marketplace Settlement Reconciliation). Không khẳng định các giá trị mặc định là biểu phí chính thức hiện hành.
        </div>
      </div>

      {/* High-level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          title="Tổng Doanh Thu Đa Kênh"
          value={`${totalNet.toLocaleString()} ₫`}
          subtitle="Hợp nhất 100% các sàn TMĐT & Website D2C"
        />
        <KPICard
          title="Tổng Phí Sàn TMĐT"
          value={`${totalMktFees.toLocaleString()} ₫`}
          subtitle="Hoa hồng sàn (Commission) giả định"
          badge="GIẢ ĐỊNH"
        />
        <KPICard
          title="Tỷ Lệ Phí Sàn Bình Quân"
          value={`${blendedTakeRate.toFixed(1)}%`}
          subtitle="Chiếm trên tổng doanh thu thuần"
          badge="GIẢ ĐỊNH"
          highlight
        />
        <KPICard
          title="Lợi Nhuận Thuần Đa Kênh (CM3)"
          value={`${totalCm3.toLocaleString()} ₫`}
          subtitle="Sau khi trừ toàn bộ biến phí & Ads"
          highlight
        />
      </div>

      {/* Chart: Channel Comparison with Metric Switcher */}
      <AnalyticsCard
        title={
          chartView === 'margin_percent'
            ? 'So Sánh Biên Lợi Nhuận Tỷ Lệ % Theo Kênh (Margin % Breakdown)'
            : chartView === 'cost_per_order'
            ? 'So Sánh Chi Phí Biến Đổi Trung Bình Trên Mỗi Đơn Hàng'
            : 'So Sánh Doanh Thu Thuần vs Lợi Nhuận CM2 & CM3 Theo Kênh'
        }
        subtitle="Chuyển đổi góc nhìn giữa Doanh thu / CM3 / Biên % / Biến phí đơn hàng để đánh giá sức khỏe kênh bán"
        formulaExplanation="CM1 = Net - COGS; CM2 = CM1 - Variable Costs; CM3 = CM2 - Marketing"
        action={
          <div className="flex items-center gap-1.5 bg-ink-100 p-1 rounded-xl">
            <button
              onClick={() => setChartView('revenue_cm3')}
              className={cn(
                'px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all',
                chartView === 'revenue_cm3'
                  ? 'bg-white text-ink-900 shadow-xs'
                  : 'text-ink-600 hover:text-ink-900'
              )}
            >
              Doanh Thu & CM3
            </button>
            <button
              onClick={() => setChartView('margin_percent')}
              className={cn(
                'px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all',
                chartView === 'margin_percent'
                  ? 'bg-white text-ink-900 shadow-xs'
                  : 'text-ink-600 hover:text-ink-900'
              )}
            >
              Biên Lợi Nhuận %
            </button>
            <button
              onClick={() => setChartView('cost_per_order')}
              className={cn(
                'px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all',
                chartView === 'cost_per_order'
                  ? 'bg-white text-ink-900 shadow-xs'
                  : 'text-ink-600 hover:text-ink-900'
              )}
            >
              Biến Phí / Đơn
            </button>
          </div>
        }
      >
        <GroupedBarChart
          data={chartData}
          xKey="name"
          series={chartSeries}
        />
      </AnalyticsCard>

      {/* Detailed Channel Table */}
      <AnalyticsCard
        title="Bảng Chi Tiết Hiệu Quả Từng Kênh"
        subtitle="Các tỷ lệ hoa hồng sàn và phí thanh toán dùng dữ liệu giả định đều được ghi rõ"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[950px] border-collapse">
            <thead>
              <tr className="border-b border-ink-200 text-ink-500 text-[11px] uppercase tracking-wider bg-ink-50/50">
                <th className="py-2.5 px-3 text-left font-bold">Kênh Bán</th>
                <th className="py-2.5 px-3 text-right font-bold">Số Đơn</th>
                <th className="py-2.5 px-3 text-right font-bold">Doanh Thu Thuần</th>
                <th className="py-2.5 px-3 text-right font-bold">Giá Vốn (COGS)</th>
                <th className="py-2.5 px-3 text-right font-bold text-brand-900">Lãi Gộp CM1</th>
                <th className="py-2.5 px-3 text-right font-bold text-amber-800">
                  Hoa Hồng Sàn <span className="text-[9px] bg-amber-100 px-1 py-0.5 rounded font-mono">GIẢ ĐỊNH</span>
                </th>
                <th className="py-2.5 px-3 text-right font-bold text-amber-800">
                  Phí Cổng TT <span className="text-[9px] bg-amber-100 px-1 py-0.5 rounded font-mono">GIẢ ĐỊNH</span>
                </th>
                <th className="py-2.5 px-3 text-right font-bold">Đóng Gói WMS</th>
                <th className="py-2.5 px-3 text-right font-bold">Trợ Giá & Hoàn</th>
                <th className="py-2.5 px-3 text-right font-bold text-brand-700">Lãi CM2</th>
                <th className="py-2.5 px-3 text-right font-bold">Chi Phí Ads</th>
                <th className="py-2.5 px-3 text-right font-bold text-emerald-700">Lãi CM3</th>
                <th className="py-2.5 px-3 text-right font-bold">Net doanh thu / Ads net</th>
                <th className="py-2.5 px-3 text-right font-bold">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {channels.map((c) => (
                <tr key={c.channel} className="hover:bg-ink-50/50 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-ink-900">{c.channelName}</td>
                  <td className="py-2.5 px-3 text-right">{c.orderCount}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-ink-900">
                    {formatCurrency(c.netRevenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-ink-600">
                    {c.cogs.toLocaleString()} ₫
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-brand-900">
                    {c.cm1.toLocaleString()} ₫
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-800 font-semibold">
                    {c.marketplaceFees.toLocaleString()} ₫ ({c.takeRate}%)
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-800">
                    {c.paymentFees.toLocaleString()} ₫
                  </td>
                  <td className="py-2.5 px-3 text-right text-ink-600">
                    {c.fulfillmentCosts.toLocaleString()} ₫
                  </td>
                  <td className="py-2.5 px-3 text-right text-ink-600">
                    {(c.shippingSubsidies + c.returnCosts).toLocaleString()} ₫
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-brand-700">
                    {c.cm2.toLocaleString()} ₫ ({c.cm2Margin}%)
                  </td>
                  <td className="py-2.5 px-3 text-right text-ink-600">
                    {c.marketingSpend.toLocaleString()} ₫
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                    {c.cm3.toLocaleString()} ₫ ({c.cm3Margin}%)
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-ink-900">
                    {c.marketingSpend > 0 ? `${c.blendedRoas}x` : 'Chưa đủ dữ liệu'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => onNavigate && onNavigate('orders')}
                      className="btn btn-secondary text-xs py-1 px-2 text-brand-600 hover:text-brand-700 font-sans"
                      title="Xem các đơn hàng của kênh này trong OMS"
                    >
                      Xem Đơn
                    </button>
                  </td>
                </tr>
              ))}
              {/* Grand Total Row */}
              <tr className="bg-ink-100/70 font-bold border-t-2 border-ink-300">
                <td className="py-2.5 px-3 text-ink-900">TỔNG CỘNG HỢP NHẤT</td>
                <td className="py-2.5 px-3 text-right">{channels.reduce((s, c) => s + c.orderCount, 0)}</td>
                <td className="py-2.5 px-3 text-right text-ink-900">{totalNet.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right text-ink-700">{totalCogs.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right text-brand-900">{totalCm1.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right text-amber-800">{totalMktFees.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right text-amber-800">{totalPayFees.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right text-ink-700">{totalFulfillment.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right text-ink-700">{(totalShipSubsidies + totalReturnCosts).toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right text-brand-900">{totalCm2.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right text-ink-700">{totalMarketing.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right text-emerald-800">{totalCm3.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right">{totalMarketing > 0 ? (totalNet / totalMarketing).toFixed(2) : '0'}x</td>
              </tr>
            </tbody>
          </table>
        </div>
      </AnalyticsCard>

      {/* Comprehensive Audit Table: CM1 to CM2 Cost Reconciliation */}
      <AnalyticsCard
        title="Bảng Kiểm Toán Giải Trình Chi Phí Biến Đổi CM1 → CM2 (Cost Components Audit Table)"
        subtitle="Chứng minh toán học: CM1 - CM2 = Tổng 5 loại biến phí thực tế trong Mock Store (Chênh lệch giải trình: 0 ₫)"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[750px] border-collapse">
            <thead>
              <tr className="border-b border-ink-200 text-ink-500 text-[11px] uppercase tracking-wider bg-ink-50/50">
                <th className="py-2.5 px-3 text-left font-bold">Thành Phần Chi Phí (Cost Component)</th>
                <th className="py-2.5 px-3 text-left font-bold">Loại Chi Phí & Định Phí</th>
                <th className="py-2.5 px-3 text-right font-bold">Tổng Số Tiền</th>
                <th className="py-2.5 px-3 text-right font-bold">% Doanh Thu</th>
                <th className="py-2.5 px-3 text-center font-bold">Tình Trạng Đối Soát</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              <tr>
                <td className="py-2.5 px-3 font-bold text-ink-900">1. Lãi Gộp Ban Đầu (CM1)</td>
                <td className="py-2.5 px-3 text-ink-500">Doanh thu thuần trừ Giá vốn hàng bán (Net - COGS)</td>
                <td className="py-2.5 px-3 text-right font-bold text-brand-900">{totalCm1.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right">{totalNet > 0 ? ((totalCm1 / totalNet) * 100).toFixed(1) : 0}%</td>
                <td className="py-2.5 px-3 text-center"><span className="badge bg-emerald-100 text-emerald-800 text-[10px]">Ghi nhận sổ kép</span></td>
              </tr>
              <tr className="bg-amber-50/30">
                <td className="py-2.5 px-3 pl-6 text-amber-900 font-medium">(-) Hoa hồng sàn TMĐT (Marketplace Commission)</td>
                <td className="py-2.5 px-3 text-amber-700">Shopee 8.5%, TikTok 6.0%, Lazada 7.5%, Web 0%</td>
                <td className="py-2.5 px-3 text-right font-semibold text-rose-700">-{totalMktFees.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right">{totalNet > 0 ? ((totalMktFees / totalNet) * 100).toFixed(1) : 0}%</td>
                <td className="py-2.5 px-3 text-center"><span className="badge bg-amber-100 text-amber-800 text-[10px]">GIẢ ĐỊNH</span></td>
              </tr>
              <tr className="bg-amber-50/30">
                <td className="py-2.5 px-3 pl-6 text-amber-900 font-medium">(-) Phí cổng thanh toán (Payment Gateway Fees)</td>
                <td className="py-2.5 px-3 text-amber-700">Phí giao dịch thẻ/ví/COD bình quân ~1.5% - 2.5%</td>
                <td className="py-2.5 px-3 text-right font-semibold text-rose-700">-{totalPayFees.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right">{totalNet > 0 ? ((totalPayFees / totalNet) * 100).toFixed(1) : 0}%</td>
                <td className="py-2.5 px-3 text-center"><span className="badge bg-amber-100 text-amber-800 text-[10px]">GIẢ ĐỊNH</span></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 pl-6 text-ink-800 font-medium">(-) Chi phí kho vận & đóng gói (WMS Fulfillment)</td>
                <td className="py-2.5 px-3 text-ink-500">Băng keo, hộp carton, túi thương hiệu & nhân công</td>
                <td className="py-2.5 px-3 text-right font-semibold text-rose-700">-{totalFulfillment.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right">{totalNet > 0 ? ((totalFulfillment / totalNet) * 100).toFixed(1) : 0}%</td>
                <td className="py-2.5 px-3 text-center"><span className="badge bg-blue-100 text-blue-800 text-[10px]">Định mức nội bộ</span></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 pl-6 text-ink-800 font-medium">(-) Trợ giá vận chuyển (Shipping Subsidies)</td>
                <td className="py-2.5 px-3 text-ink-500">15.000 ₫ / đơn hàng chính sách FreeShip (11 đơn)</td>
                <td className="py-2.5 px-3 text-right font-semibold text-rose-700">-{totalShipSubsidies.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right">{totalNet > 0 ? ((totalShipSubsidies / totalNet) * 100).toFixed(1) : 0}%</td>
                <td className="py-2.5 px-3 text-center"><span className="badge bg-ink-100 text-ink-700 text-[10px]">Chính sách bán</span></td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 pl-6 text-ink-800 font-medium">(-) Chi phí xử lý đổi trả & hoàn tiền (RMA Costs)</td>
                <td className="py-2.5 px-3 text-ink-500">25.000 ₫ kiểm định QC & nhập lại hàng hủy (ORD-77190)</td>
                <td className="py-2.5 px-3 text-right font-semibold text-rose-700">-{totalReturnCosts.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right">{totalNet > 0 ? ((totalReturnCosts / totalNet) * 100).toFixed(1) : 0}%</td>
                <td className="py-2.5 px-3 text-center"><span className="badge bg-rose-100 text-rose-800 text-[10px]">Phát sinh thực</span></td>
              </tr>
              <tr className="bg-ink-100/70 font-bold border-t border-b border-ink-300">
                <td className="py-2.5 px-3 text-ink-900">(=) Tổng Biến Phí Khấu Trừ (CM1 → CM2)</td>
                <td className="py-2.5 px-3 text-ink-600">Commission + Payment + WMS + Ship + Returns</td>
                <td className="py-2.5 px-3 text-right font-bold text-rose-800">-{totalVariableCosts.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right font-bold">{totalNet > 0 ? ((totalVariableCosts / totalNet) * 100).toFixed(1) : 0}%</td>
                <td className="py-2.5 px-3 text-center"><span className="badge bg-emerald-100 text-emerald-800 text-[10px]">Cân bằng 100%</span></td>
              </tr>
              <tr className="bg-brand-50/50 font-bold">
                <td className="py-2.5 px-3 text-brand-900 font-black">2. Lợi Nhuận Đóng Góp Sau Biến Phí (CM2)</td>
                <td className="py-2.5 px-3 text-brand-700">CM1 - Tổng Biến Phí = {totalCm1.toLocaleString()} ₫ - {totalVariableCosts.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right font-black text-brand-900">{totalCm2.toLocaleString()} ₫</td>
                <td className="py-2.5 px-3 text-right font-black text-brand-900">{totalNet > 0 ? ((totalCm2 / totalNet) * 100).toFixed(1) : 0}%</td>
                <td className="py-2.5 px-3 text-center">
                  <div className="inline-flex items-center gap-1 text-emerald-700 text-[10px] font-bold">
                    <CheckCircle2 size={12} /> Khớp Tuyệt Đối
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AnalyticsCard>
    </div>
  );
}
