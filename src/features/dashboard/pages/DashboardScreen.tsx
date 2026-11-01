import { hasPermission } from '@/lib/permissions';
import { safeDivide } from '@/analytics/metricsEngine';

// Executive dashboard feature screen.
import { orderSla } from '@/analytics/operations';
import React, { useState, useEffect, useMemo } from 'react';
import {
  CurrencyDollar,
  TrendUp,
  TrendDown,
  Wallet,
  Bank,
  HourglassMedium,
  ShoppingBag,
  ArrowUUpLeft,
  Target,
  Receipt,
  GearSix,
  SlidersHorizontal,
  ArrowsDownUp,
  ArrowRight,
  ChartLineUp,
  Sparkle,
  Info,
  Check,
  X,
  Eye,
  CheckCircle,
  WarningCircle,
  ShieldCheck,
  Package,
  CaretRight
} from '@phosphor-icons/react';
import { analyticsService } from '@/analytics/analyticsService';
import type { TimeDimension, ComparisonDimension } from '@/analytics/types';
import { KPICard } from '@/components/charts/KPICard';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { MetaDateRangePicker } from '@/components/charts/MetaDateRangePicker';
import { LineAreaChart } from '@/components/charts/LineAreaChart';
import { WaterfallChart } from '@/components/charts/WaterfallChart';
import { HeatmapChart } from '@/components/charts/HeatmapChart';
import { omsStore as mockStore } from '@/stores/omsStore';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/utils';

interface ExecutiveAnalyticsDashboardProps {
  onNavigate?: (pageId: string) => void;
}

type PerspectiveTab = 'profit' | 'cashflow' | 'orders' | 'marketing';

type KpiKey =
  | 'netRevenue'
  | 'cm3'
  | 'platformEscrow'
  | 'actualCash'
  | 'orderVolume'
  | 'returnRate'
  | 'marketingRoas'
  | 'aov';

const DEFAULT_KPIS: KpiKey[] = ['netRevenue', 'cm3', 'platformEscrow', 'orderVolume'];
const STORAGE_KEY = 'dream_terus_dashboard_kpis_v2';

export function ExecutiveAnalyticsDashboard({ onNavigate }: ExecutiveAnalyticsDashboardProps) {
  const [, setTick] = useState(0);
  useEffect(() => mockStore.subscribe(() => setTick(t => t + 1)), []);

  const [period, setPeriod] = useState<TimeDimension>('last_30_days');
  const [comparison, setComparison] = useState<ComparisonDimension>('previous_period');
  const [perspective, setPerspective] = useState<PerspectiveTab>('profit');
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [isWaterfallExpanded, setIsWaterfallExpanded] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  // Persistence of active KPIs
  const [activeKpis, setActiveKpis] = useState<KpiKey[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 4) return parsed;
        }
      } catch (e) {
        // Fallback to default
      }
    }
    return DEFAULT_KPIS;
  });

  const saveActiveKpis = (newKeys: KpiKey[]) => {
    setActiveKpis(newKeys);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newKeys));
    }
  };

  // Drag & drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const next = [...activeKpis];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(targetIndex, 0, moved);
    saveActiveKpis(next);
    setDraggedIndex(null);
  };

  // Data fetching
  const data = analyticsService.getExecutiveDashboardData(period, comparison);
  const workingCapital = analyticsService.getWorkingCapitalOverview();

  // Waterfall Data (Streamlined 5-gate milestone vs Detailed 14-item)
  const grossSalesTotal = data.waterfallPnL.find(w => w.name.includes('Gross'))?.amount ?? 0;
  const discountsTotal = Math.abs(data.waterfallPnL.find(w => w.name.includes('Voucher'))?.amount || 0);
  const netRevenueCurr = data.kpis.netRevenue.value;
  const cogsTotal = Math.abs(data.waterfallPnL.find(w => w.name.includes('COGS'))?.amount ?? 0);
  const cm1Curr = data.kpis.cm1.value;
  const cm2Curr = data.kpis.cm2.value;
  const cm3Curr = data.kpis.cm3.value;
  const platformAndWmsCosts = cm1Curr - cm2Curr;
  const marketingTotal = cm2Curr - cm3Curr;

  const streamlinedWaterfall = [
    { name: '1. Doanh thu thuần (Net Sales)', amount: netRevenueCurr, type: 'subtotal' as const, percentageOfRevenue: 100 },
    { name: '2. Giá vốn hàng bán (COGS)', amount: -cogsTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(cogsTotal, netRevenueCurr) * 100 },
    { name: '3. Lãi gộp CM1', amount: cm1Curr, type: 'subtotal' as const, percentageOfRevenue: safeDivide(cm1Curr, netRevenueCurr) * 100 },
    { name: '4. Phí sàn & Vận hành kho (Take Rate + WMS)', amount: -platformAndWmsCosts, type: 'negative' as const, percentageOfRevenue: safeDivide(platformAndWmsCosts, netRevenueCurr) * 100 },
    { name: '5. Lợi nhuận đóng góp CM2', amount: cm2Curr, type: 'subtotal' as const, percentageOfRevenue: safeDivide(cm2Curr, netRevenueCurr) * 100 },
    { name: '6. Chi phí Marketing & Ads', amount: -marketingTotal, type: 'negative' as const, percentageOfRevenue: safeDivide(marketingTotal, netRevenueCurr) * 100 },
    { name: '7. Lợi nhuận sau Ads CM3 (Lãi Ròng)', amount: cm3Curr, type: 'subtotal' as const, percentageOfRevenue: safeDivide(cm3Curr, netRevenueCurr) * 100 }
  ];

  const periodOrders = analyticsService.filterOrdersByPeriod(mockStore.getOrders(), period).current;
  const marketing = analyticsService.getMarketingPerformance(period);
  const netAds = marketing.reduce((sum,c) => sum + (c.netSpend ?? c.adSpend), 0);
  const ratio = netAds > 0 ? netRevenueCurr / netAds : null;
  const money = mockStore.getFinanceOverview();
  const channelConnections = mockStore.getSnapshot().channelConnections ?? [];
  const connectedChannels = channelConnections.filter(connection => connection.status === 'connected').length;
  const activeRole = mockStore.getExecutionContext()?.role;
  const canCash = hasPermission(activeRole, 'finance:view');
  const trendPerspectiveData = data.revenueTrend.map(t => {
    const dayOrders = periodOrders.filter(o => new Date(Date.parse(o.placed_at)+7*3600000).toISOString().slice(0,10) === t.date);
    const dayEcon = analyticsService.getOrderEconomics().filter(e => dayOrders.some(o => o.id === e.orderId));
    const ads = dayEcon.reduce((sum,e) => sum + e.attributedMarketingCosts, 0);
    return { ...t, actualCash: canCash ? money.documents.filter(d => d.date === t.date && d.kind === 'receipt').reduce((sum,d) => sum + d.amount,0) : null,
      pendingEscrow: null, supplierDue: canCash ? money.payables.filter(p => p.due_date === t.date).reduce((sum,p) => sum + p.remaining,0) : null,
      newOrders: dayOrders.length, deliveredSla: dayOrders.filter(o => orderSla(o).status === 'on_time').length,
      returnedOrders: dayOrders.filter(o => o.return_status && o.return_status !== 'none').length,
      adSpend: ads, adRevenue: t.netRevenue, roas: ads > 0 ? t.netRevenue / ads : null };
  });

  // Master KPI Catalog
  const KPI_CATALOG: Record<
    KpiKey,
    {
      title: string;
      value: string;
      subtitle: string;
      badge?: string;
      badgeColor?: string;
      deltaPercent?: number;
      trend?: 'up' | 'down' | 'flat';
      isInverseTrend?: boolean;
      highlight?: boolean;
      icon: any;
      category: string;
    }
  > = {
    netRevenue: {
      title: 'Doanh Thu Thuần Quản Trị',
      value: `${data.kpis.netRevenue.value.toLocaleString()} ₫`,
      subtitle: `Đã giao theo dữ liệu demo: ${(data.kpis.netRevenue.recognizedRevenuePOD ?? 0).toLocaleString()} ₫`,
      badge: 'DỮ LIỆU GIAO HÀNG',
      deltaPercent: data.kpis.netRevenue.deltaPercent,
      trend: data.kpis.netRevenue.trend,
      icon: CurrencyDollar,
      category: 'Tài Chính'
    },
    cm3: {
      title: 'Lợi Nhuận Sau Ads (CM3)',
      value: `${data.kpis.cm3.value.toLocaleString()} ₫`,
      subtitle: `Biên CM3: ${data.kpis.cm3.margin.toFixed(1)}% sau phân bổ Ads`,
      badge: `CM3: ${data.kpis.cm3.margin.toFixed(1)}%`,
      deltaPercent: data.kpis.cm3.deltaPercent,
      trend: data.kpis.cm3.delta >= 0 ? 'up' : 'down',
      highlight: true,
      icon: Sparkle,
      category: 'Lợi Nhuận'
    },
    platformEscrow: {
      title: 'Dòng Tiền Sàn Đang Giữ',
      value: canCash ? `${workingCapital.pendingMarketplaceSettlements.toLocaleString()} ₫` : 'Không có quyền xem tiền',
      subtitle: 'TikTok Shop & Shopee giữ chờ chu kỳ đối soát 7-14 ngày',
      badge: 'CHỜ ĐỐI SOÁT',
      badgeColor: 'bg-amber-50 text-amber-900 border-amber-200',
      highlight: true,
      icon: HourglassMedium,
      category: 'Dòng Tiền'
    },
    actualCash: {
      title: 'Tiền Mặt Khả Dụng',
      value: canCash ? `${workingCapital.availableCash.toLocaleString()} ₫` : 'Không có quyền xem tiền',
      subtitle: 'Số dư từ chứng từ demo, chưa xác nhận ngân hàng',
      badge: 'TIỀN MẶT CÓ SẴN',
      icon: Wallet,
      category: 'Dòng Tiền'
    },
    orderVolume: {
      title: 'Sản Lượng Đơn Hàng',
      value: `${data.kpis.orderVolume.value.toLocaleString()} đơn`,
      subtitle: 'Số lượng đơn phát sinh thành công trong kỳ',
      deltaPercent: data.kpis.orderVolume.deltaPercent,
      trend: data.kpis.orderVolume.trend,
      icon: ShoppingBag,
      category: 'Vận Hành'
    },
    returnRate: {
      title: 'Tỷ Lệ Hoàn Hàng (RTS / RMA)',
      value: `${data.kpis.returnRate.value}%`,
      subtitle: 'Đơn hủy, khách từ chối nhận & đổi trả RMA',
      deltaPercent: data.kpis.returnRate.delta,
      trend: data.kpis.returnRate.delta > 0 ? 'up' : 'down',
      isInverseTrend: true,
      icon: ArrowUUpLeft,
      category: 'Vận Hành'
    },
    marketingRoas: {
      title: 'Doanh thu giữ lại / Ads net',
      value: ratio === null ? 'Chưa đủ dữ liệu' : `${ratio.toFixed(2)}x`,
      subtitle: `Tổng chi phí Ads: ${marketingTotal.toLocaleString()} ₫`,
      badge: 'CHƯA ATTRIBUTION',
      icon: Target,
      category: 'Tăng Trưởng'
    },
    aov: {
      title: 'Giá Trị Trung Bình Đơn (AOV)',
      value: `${data.kpis.aov.value.toLocaleString()} ₫`,
      subtitle: 'Doanh thu bình quân trên mỗi đơn hàng',
      deltaPercent: data.kpis.aov.deltaPercent,
      trend: data.kpis.aov.trend,
      icon: Receipt,
      category: 'Doanh Số'
    }
  };

  // Top Critical Alert
  const criticalInsight = data.decisionInsights.find(i => i.severity === 'CRITICAL') || data.decisionInsights[0] || { title: periodOrders.length ? 'Chưa có cảnh báo đủ bằng chứng trong kỳ; SKU thiếu lịch sử cần kiểm tra riêng.' : 'Không có đơn trong kỳ đã chọn.', financialImpactEstimate: 0, relatedEntityLink: {page:'orders',label:'Kiểm tra đơn nguồn'} };

  if (!canCash) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
        <div className="pb-3 border-b border-[#E1E3E5]">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#202223] tracking-tight">Bảng Điều Hành Kho</h1>
            <span className="badge bg-teal-50 text-[#1E647F] border-teal-200 text-xs font-semibold">Vận hành kho</span>
          </div>
          <p className="text-xs text-[#6D7175] mt-1">Theo dõi khối lượng đơn, đổi trả và SLA xuất kho trong phạm vi được giao.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <KPICard title="Sản Lượng Đơn Hàng" value={`${data.kpis.orderVolume.value.toLocaleString()} đơn`} subtitle="Đơn phát sinh trong kỳ" deltaPercent={data.kpis.orderVolume.deltaPercent} trend={data.kpis.orderVolume.trend} icon={ShoppingBag} />
          <KPICard title="Tỷ Lệ Hoàn Hàng" value={`${data.kpis.returnRate.value}%`} subtitle="Đơn hủy, từ chối nhận và RMA" deltaPercent={data.kpis.returnRate.delta} trend={data.kpis.returnRate.delta > 0 ? 'up' : 'down'} isInverseTrend icon={ArrowUUpLeft} />
          <KPICard title="Kênh Đang Kết Nối" value={`${connectedChannels}/${channelConnections.length}`} subtitle="Kênh có thể nhận luồng đơn" icon={Package} />
        </div>

        <AnalyticsCard title="Xu Hướng Đơn & SLA" subtitle="Đơn mới, bàn giao đúng SLA và đổi trả trong kỳ">
          <LineAreaChart data={trendPerspectiveData} xKey="label" height={270} currency={false} series={[
            { key: 'newOrders', label: 'Đơn mới đặt (đơn)', color: '#1E647F' },
            { key: 'deliveredSla', label: 'Xuất kho đúng SLA (đơn)', color: '#10B981' },
            { key: 'returnedOrders', label: 'Hoàn trả RTS (đơn)', color: '#EF4444' }
          ]} />
          <div className="mt-3 p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between text-xs">
            <span className="text-blue-900">📦 <strong>Vận hành kho:</strong> Ưu tiên các đơn sắp hạn và xử lý trả hàng cần QC.</span>
            <button onClick={() => onNavigate?.('fulfillment')} className="text-xs font-bold text-blue-900 hover:underline shrink-0 ml-2 flex items-center gap-1">
              <span>Mở xử lý đơn</span><ArrowRight size={12} />
            </button>
          </div>
        </AnalyticsCard>

        <AnalyticsCard title="Mật Độ Đơn Hàng Theo Ngày Và Khung Giờ" subtitle="Dùng để bố trí ca kho và chuẩn bị đợt cao điểm">
          <HeatmapChart />
        </AnalyticsCard>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* 1. Header & Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-[#E1E3E5]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#202223] tracking-tight">
              Bảng Điều Hành Kinh Doanh
            </h1>
            <span className="badge bg-teal-50 text-[#1E647F] border-teal-200 text-xs font-semibold">
              Điều hành dành cho {activeRole === 'manager' ? 'Manager' : 'Owner'}
            </span>
          </div>
          <p className="text-xs text-[#6D7175] mt-1">
            Tổng quan thực trạng dòng đóng góp (CM1, CM2, CM3), thanh khoản tiền sàn và cảnh báo điểm nghẽn.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <MetaDateRangePicker
            period={period}
            onPeriodChange={setPeriod}
            comparison={comparison}
            onComparisonChange={setComparison}
          />
        </div>
      </div>

      {/* 2. Executive Alert Strip (1-Line Focused Banner, Expandable) */}
      <div className="bg-white border border-[#E1E3E5] rounded-xl p-3.5 shadow-xs transition-all">
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="badge bg-rose-50 text-rose-800 border-rose-200 text-[10px] font-bold shrink-0">
              QUAN SÁT MOCK
            </span>
            <p className="text-xs font-semibold text-[#202223] truncate">
              {criticalInsight.title}
            </p>
            <span className="text-xs font-bold text-rose-700 shrink-0 hidden md:inline">
              Không dự đoán tác động tiền
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              onClick={() => { if (criticalInsight.relatedEntityLink) window.location.href = `/app?page=${criticalInsight.relatedEntityLink.page}`; }}
              className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
            >
              Mở dữ liệu nguồn
            </button>
            <button
              onClick={() => setShowAllAlerts(!showAllAlerts)}
              className="btn-secondary text-xs py-1.5 px-2.5 text-slate-600 whitespace-nowrap"
            >
              {showAllAlerts ? 'Thu gọn' : `Xem thêm ${Math.max(0,data.decisionInsights.length - 1)} quan sát`}
            </button>
          </div>
        </div>

        {/* Slide-out extra insights */}
        {showAllAlerts && (
          <div className="mt-3 pt-3 border-t border-[#E1E3E5] grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
            {data.decisionInsights
              .filter(i => i.id !== criticalInsight.id)
              .map(ins => (
                <div key={ins.id} className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E1E3E5] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'badge text-[10px] font-bold',
                      ins.severity === 'WARNING' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    )}>
                      {ins.severity}
                    </span>
                    <span className="text-[11px] font-bold text-[#1E647F]">
                      +{ins.financialImpactEstimate?.toLocaleString()} ₫
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#202223]">{ins.title}</p>
                  <p className="text-[11px] text-[#6D7175]">{ins.prescriptive}</p>
                  {ins.relatedEntityLink && (
                    <button
                      onClick={() => { window.location.href = `/app?page=${ins.relatedEntityLink!.page}`; }}
                      className="text-xs font-bold text-[#1E647F] hover:underline pt-1 flex items-center gap-1"
                    >
                      <span>{ins.relatedEntityLink.label}</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 3. Core Health Strip (4 Draggable, Customizable KPI Cards) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1 flex-wrap gap-2.5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#202223] uppercase tracking-wider">
              <ArrowsDownUp size={14} className="text-[#1E647F]" />
              <span>Chỉ Số Trọng Yếu</span>
              <span className="text-[11px] font-normal text-[#6D7175] normal-case ml-1">
                (Kéo thả để sắp xếp vị trí hiển thị)
              </span>
            </div>

            <button
              onClick={() => setShowCustomizeModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D9E3E8] bg-white hover:bg-slate-50 text-xs font-semibold text-[#123A52] shadow-2xs hover:border-[#1E647F] transition-all cursor-pointer group"
              title="Đổi 4 chỉ số hiển thị hoặc chọn từ 8 chỉ số của hệ thống"
            >
              <SlidersHorizontal size={14} className="text-[#1E647F] group-hover:rotate-12 transition-transform" />
              <span>Đổi 4 chỉ số hiển thị</span>
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            Đang hiển thị {activeKpis.length}/8 chỉ số trọng yếu
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {activeKpis.map((kpiKey, index) => {
            const kpi = KPI_CATALOG[kpiKey];
            if (!kpi) return null;

            return (
              <div
                key={kpiKey}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className="cursor-grab active:cursor-grabbing transition-transform"
                title="Kéo thả thẻ này sang vị trí khác để sắp xếp lại"
              >
                <KPICard
                  title={kpi.title}
                  value={kpi.value}
                  subtitle={kpi.subtitle}
                  badge={kpi.badge}
                  deltaPercent={kpi.deltaPercent}
                  trend={kpi.trend}
                  isInverseTrend={kpi.isInverseTrend}
                  highlight={kpi.highlight}
                  icon={kpi.icon}
                  className="hover:border-teal-400 shadow-xs"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Main Analytical Body: Waterfall P&L (Left) + Multi-Perspective Trend Hub (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (5 Cols): Streamlined 5-Gate Waterfall P&L */}
        <AnalyticsCard
          title="Bóc Tách Dòng Lợi Nhuận (Waterfall P&L)"
          subtitle="Doanh thu thuần → Giá vốn COGS → Phí sàn & WMS → Marketing Ads → Lợi nhuận CM3"
          className="lg:col-span-5"
          action={
            <button
              onClick={() => setIsWaterfallExpanded(!isWaterfallExpanded)}
              className="text-xs font-bold text-[#1E647F] hover:text-[#164E65] flex items-center gap-1 cursor-pointer"
            >
              <span>{isWaterfallExpanded ? 'Thu gọn 5 chặng' : 'Xem đủ 14 chi tiết'}</span>
            </button>
          }
        >
          <div className="space-y-3">
            {!periodOrders.length && <p role="status" className="text-sm text-slate-500">Không có đơn trong kỳ đã chọn; không thay bằng dữ liệu mẫu.</p>}
            <WaterfallChart
              data={isWaterfallExpanded ? data.waterfallPnL : streamlinedWaterfall}
            />

            <div className="pt-2 border-t border-[#E1E3E5] flex items-center justify-between text-xs text-[#6D7175]">
              <span>Tỷ lệ giữ lại CM3 sau Ads:</span>
              <strong className="text-emerald-700 font-bold text-sm">
                {(safeDivide(cm3Curr, netRevenueCurr) * 100).toFixed(1)}% Doanh Thu
              </strong>
            </div>
          </div>
        </AnalyticsCard>

        {/* Right Column (7 Cols): Multi-Perspective Business Trend Hub */}
        <div className="lg:col-span-7 bg-white border border-[#E1E3E5] rounded-xl p-5 shadow-xs space-y-4">
          {/* Perspective Switcher Tabs */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-[#E1E3E5]">
            <div>
              <h3 className="text-sm font-bold text-[#202223] tracking-tight">
                Xu Hướng Kinh Doanh Đa Chiều (Multi-Perspective Hub)
              </h3>
              <p className="text-xs text-[#6D7175]">
                Dữ liệu đơn và chứng từ demo trong cùng kỳ; số dư là hiện tại, không phải doanh thu của kỳ.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[#F1F2F3] p-1 rounded-lg">
              <button
                onClick={() => setPerspective('profit')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
                  perspective === 'profit'
                    ? 'bg-white text-[#123A52] shadow-xs font-bold'
                    : 'text-[#6D7175] hover:text-[#202223]'
                )}
              >
                1. Lợi Nhuận
              </button>

              <button
                onClick={() => setPerspective('cashflow')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1',
                  perspective === 'cashflow'
                    ? 'bg-white text-[#123A52] shadow-xs font-bold'
                    : 'text-[#6D7175] hover:text-[#202223]'
                )}
              >
                <span>2. Dòng Tiền</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              </button>

              <button
                onClick={() => setPerspective('orders')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
                  perspective === 'orders'
                    ? 'bg-white text-[#123A52] shadow-xs font-bold'
                    : 'text-[#6D7175] hover:text-[#202223]'
                )}
              >
                3. Đơn & SLA
              </button>

              <button
                onClick={() => setPerspective('marketing')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer',
                  perspective === 'marketing'
                    ? 'bg-white text-[#123A52] shadow-xs font-bold'
                    : 'text-[#6D7175] hover:text-[#202223]'
                )}
              >
                4. Ads & ROAS
              </button>
            </div>
          </div>

          {/* Perspective 1: Profit (P&L Trend) */}
          {perspective === 'profit' && (
            <div className="space-y-3 animate-fade-in">
              <LineAreaChart
                data={trendPerspectiveData}
                xKey="label"
                height={270}
                series={[
                  { key: 'netRevenue', label: 'Doanh thu thuần (₫)', color: '#1E647F' },
                  { key: 'cm2', label: 'Lợi nhuận CM2 (₫)', color: '#0284C7' },
                  { key: 'cm3', label: 'Lợi nhuận CM3 sau Ads (₫)', color: '#10B981' }
                ]}
              />
              <div className="p-2.5 rounded-lg bg-teal-50/60 border border-teal-200/80 flex items-center justify-between text-xs">
                <span className="text-[#123A52]">
                  💡 <strong>Góc nhìn Lợi nhuận:</strong> CM3 từ cùng đơn/chứng từ trong kỳ. Không suy diễn kết quả khi kỳ không có đơn.
                </span>
                <button
                  onClick={() => onNavigate?.('orderEconomics')}
                  className="text-xs font-bold text-[#1E647F] hover:underline shrink-0 ml-2 flex items-center gap-1"
                >
                  <span>Xem P&L</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Perspective 2: Cashflow & Escrow (Tiền Sàn Giữ) */}
          {perspective === 'cashflow' && (
            <div className="space-y-3 animate-fade-in">
              <LineAreaChart
                data={trendPerspectiveData}
                xKey="label"
                height={270}
                series={[
                  { key: 'actualCash', label: 'Tiền về tài khoản (₫)', color: '#10B981' },
                  { key: 'pendingEscrow', label: 'Tiền sàn đang giam (₫)', color: '#F59E0B' },
                  { key: 'supplierDue', label: 'Nợ NCC đến hạn (₫)', color: '#EF4444' }
                ]}
              />
              <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center justify-between text-xs">
                <span className="text-amber-900">
                  ⚠️ <strong>Cảnh báo Dòng tiền:</strong> {canCash ? <>Chờ sàn <strong>{formatCurrency(workingCapital.pendingMarketplaceSettlements)}</strong>; nợ NCC <strong>{formatCurrency(workingCapital.supplierPayables)}</strong>. Tiền về chỉ từ chứng từ xác nhận; không kết luận an toàn theo lịch dự kiến.</> : 'Tài khoản không có quyền xem chứng từ tiền; không dùng số 0 thay cho dữ liệu bị giới hạn.'}
                </span>
                <button
                  onClick={() => onNavigate?.('cashWorkingCapital')}
                  className="text-xs font-bold text-amber-900 hover:underline shrink-0 ml-2 flex items-center gap-1"
                >
                  <span>Quản trị vốn</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Perspective 3: Orders & Warehouse SLA */}
          {perspective === 'orders' && (
            <div className="space-y-3 animate-fade-in">
              <LineAreaChart
                data={trendPerspectiveData}
                xKey="label"
                height={270}
                currency={false}
                series={[
                  { key: 'newOrders', label: 'Đơn mới đặt (đơn)', color: '#1E647F' },
                  { key: 'deliveredSla', label: 'Xuất kho đúng SLA (đơn)', color: '#10B981' },
                  { key: 'returnedOrders', label: 'Hoàn trả RTS (đơn)', color: '#EF4444' }
                ]}
              />
              <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between text-xs">
                <span className="text-blue-900">
                  📦 <strong>Vận hành kho:</strong> Đúng hạn chỉ tính trên đơn có cả SLA và thời điểm bàn giao; chưa bàn giao phân biệt sắp hạn/quá hạn.
                </span>
                <button
                  onClick={() => onNavigate?.('fulfillment')}
                  className="text-xs font-bold text-blue-900 hover:underline shrink-0 ml-2 flex items-center gap-1"
                >
                  <span>Kho vận</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Perspective 4: Marketing & ROAS */}
          {perspective === 'marketing' && (
            <div className="space-y-3 animate-fade-in">
              <LineAreaChart
                data={trendPerspectiveData}
                xKey="label"
                height={270}
                series={[
                  { key: 'adRevenue', label: 'Doanh thu từ Ads (₫)', color: '#1E647F' },
                  { key: 'adSpend', label: 'Chi phí Ads (₫)', color: '#F59E0B' }
                ]}
              />
              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs">
                <span className="text-emerald-900">
                  🎯 <strong>Hiệu quả tiếp thị:</strong> Tỷ lệ doanh thu net / Ads net không phải ROAS chiến dịch. Chưa có attribution campaign; Ads bằng 0 hiển thị thiếu dữ liệu.
                </span>
                <button
                  onClick={() => onNavigate?.('channelEconomics')}
                  className="text-xs font-bold text-emerald-900 hover:underline shrink-0 ml-2 flex items-center gap-1"
                >
                  <span>Hiệu quả kênh</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnalyticsCard
        title="Mật Độ Đơn Hàng Theo Ngày Và Khung Giờ"
        subtitle="Xác định thời điểm đơn tập trung để bố trí ca kho và chuẩn bị cho các đợt cao điểm"
        action={
          <button
            onClick={() => onNavigate?.('channelConnections')}
            className="text-xs font-bold text-[#1E647F] hover:text-[#164E65] flex items-center gap-1"
          >
            <span>{connectedChannels}/{channelConnections.length} kênh đang kết nối</span>
            <ArrowRight size={13} />
          </button>
        }
      >
        <HeatmapChart />
      </AnalyticsCard>

      {/* 5. Bottom Section: Channel Performance Matrix (Clean, High-Contrast Table) */}
      <AnalyticsCard
        title="Hiệu Quả Kinh Doanh & Phí Sàn Theo Từng Kênh"
        subtitle="So sánh doanh thu, tỷ lệ phí sàn, lợi nhuận CM2 và CM3 giữa các sàn TMĐT"
        action={
          <button
            onClick={() => onNavigate?.('channelEconomics')}
            className="text-xs font-bold text-[#1E647F] hover:text-[#164E65] flex items-center gap-1 cursor-pointer"
          >
            <span>Bóc tách chi tiết phí kênh</span>
            <ArrowRight size={13} />
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-[#E1E3E5] text-[#6D7175] text-[11px] font-bold uppercase tracking-wider bg-[#F8FAFC]">
                <th className="py-2.5 px-3.5 text-left">Kênh Bán Hàng</th>
                <th className="py-2.5 px-3 text-right">Số Đơn</th>
                <th className="py-2.5 px-3 text-right">Doanh Thu Thuần</th>
                <th className="py-2.5 px-3 text-right">
                  Phí Sàn & Thuế
                </th>
                <th className="py-2.5 px-3 text-right">Lãi Gộp CM1</th>
                <th className="py-2.5 px-3 text-right">Đóng Góp CM2</th>
                <th className="py-2.5 px-3 text-right font-bold text-emerald-800">CM3 Sau Ads</th>
                <th className="py-2.5 px-3 text-right">Tỷ Lệ Hoàn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E3E5]">
              {data.channelComparison.map((ch) => (
                <tr
                  key={ch.channel}
                  onClick={() => onNavigate?.('channelEconomics')}
                  className="hover:bg-[#F8FAFC] cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-3.5 font-semibold text-[#202223] group-hover:text-[#1E647F] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1E647F]" />
                    <span>{ch.channelName}</span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700">{ch.orderCount}</td>
                  <td className="py-3 px-3 text-right font-semibold text-[#202223]">
                    {ch.netRevenue.toLocaleString()} ₫
                  </td>
                  <td className="py-3 px-3 text-right text-rose-700 font-medium">
                    {ch.marketplaceFees.toLocaleString()} ₫ ({ch.takeRate}%)
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700">
                    {ch.cm1.toLocaleString()} ₫ ({ch.cm1Margin}%)
                  </td>
                  <td className="py-3 px-3 text-right text-[#1E647F] font-semibold">
                    {ch.cm2.toLocaleString()} ₫ ({ch.cm2Margin}%)
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700 font-bold">
                    {ch.cm3.toLocaleString()} ₫ ({ch.cm3Margin}%)
                  </td>
                  <td className="py-3 px-3 text-right text-slate-600">
                    {ch.returnRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AnalyticsCard>

      {/* 6. Customization Modal for Core Health Strip */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#E1E3E5] shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E1E3E5]">
              <div>
                <h3 className="text-base font-bold text-[#202223]">
                  Tùy Biến 4 Chỉ Số Trọng Yếu
                </h3>
                <p className="text-xs text-[#6D7175]">
                  Chọn chính xác 4 chỉ số mà bạn muốn theo dõi ngay khi mở Dashboard
                </p>
              </div>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {(Object.keys(KPI_CATALOG) as KpiKey[]).map(key => {
                const kpi = KPI_CATALOG[key];
                const isSelected = activeKpis.includes(key);

                return (
                  <div
                    key={key}
                    onClick={() => {
                      if (isSelected) {
                        if (activeKpis.length > 1) {
                          saveActiveKpis(activeKpis.filter(k => k !== key));
                        }
                      } else {
                        if (activeKpis.length < 4) {
                          saveActiveKpis([...activeKpis, key]);
                        } else {
                          // Replace the last item
                          const next = [...activeKpis.slice(0, 3), key];
                          saveActiveKpis(next);
                        }
                      }
                    }}
                    className={cn(
                      'p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all',
                      isSelected
                        ? 'border-[#1E647F] bg-teal-50/40 text-[#123A52]'
                        : 'border-[#E1E3E5] hover:bg-slate-50 text-slate-600'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        isSelected ? 'bg-[#1E647F] text-white' : 'bg-slate-100 text-slate-500'
                      )}>
                        <kpi.icon size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#202223]">{kpi.title}</p>
                        <p className="text-[11px] text-[#6D7175]">{kpi.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">{kpi.value}</span>
                      <div className={cn(
                        'w-5 h-5 rounded-md border flex items-center justify-center transition-colors',
                        isSelected
                          ? 'bg-[#1E647F] border-[#1E647F] text-white'
                          : 'border-slate-300 bg-white'
                      )}>
                        {isSelected && <Check size={12} weight="bold" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#E1E3E5]">
              <button
                onClick={() => {
                  saveActiveKpis(DEFAULT_KPIS);
                  setShowCustomizeModal(false);
                }}
                className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
              >
                Đặt lại mặc định
              </button>

              <button
                onClick={() => setShowCustomizeModal(false)}
                className="btn-primary text-xs py-2 px-4 font-semibold"
              >
                Lưu cấu hình ({activeKpis.length}/4 đã chọn)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
