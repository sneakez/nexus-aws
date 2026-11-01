import { EconomicsPeriod, type EconomicsPeriodValue } from '@/components/charts/EconomicsPeriod';
import { mockStore } from '@/mock/store';
import { useAuth } from '@/providers/AuthProvider';
import { hasPermission } from '@/lib/permissions';
import { useState, useMemo } from 'react';
import {
  Target,
  TrendingUp,
  DollarSign,
  Sparkles,
  BarChart3,
  LineChart as LineChartIcon,
  Table as TableIcon,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  Layers,
  FileSpreadsheet,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { analyticsService } from '@/analytics/analyticsService';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { KPICard } from '@/components/charts/KPICard';
import { PageHeader } from '@/components/common/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { exportMarketingCampaignsToExcel } from '@/lib/export';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/cn';

type ReportViewMode = 'table' | 'trend' | 'bar';

export function MarketingAnalyticsPage() {
  const toast = useToast();
  const { activeRole } = useAuth();
  const [, revise] = useState(0);
  const recommendations = mockStore.getGrowthRecommendations();
  const act = (fn: () => { success: boolean; error?: string }) => { try { const r = fn(); toast(r.success ? 'Đã bàn giao quyết định' : r.error || 'Không thể lưu', r.success ? 'success' : 'error'); revise(n => n + 1); } catch (e) { toast((e as Error).message, 'error'); } };
  const [period,setPeriod]=useState<EconomicsPeriodValue>('all');
  const campaigns = analyticsService.getMarketingPerformance(period === 'all' ? undefined : period);

  // Active view mode: Table, Trend Line, Bar
  const [viewMode, setViewMode] = useState<ReportViewMode>('table');

  // Channel filter
  const [channelFilter, setChannelFilter] = useState<string>('all');

  // Meta-style Export Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState<'table' | 'trend' | 'bar'>('table');
  const [reportNote, setReportNote] = useState('');

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    if (channelFilter === 'all') return campaigns;
    return campaigns.filter((c) => c.channel === channelFilter || c.platform.toLowerCase().includes(channelFilter));
  }, [campaigns, channelFilter]);

  // Aggregated KPIs
  const grossAdSpend = filteredCampaigns.reduce((sum, c) => sum + c.adSpend, 0);
  const adsCredit = filteredCampaigns.reduce((sum,c) => sum + (c.adsCredit || 0),0);
  const totalAdSpend = grossAdSpend - adsCredit;
  const totalAttributedRevenue = filteredCampaigns.reduce((sum, c) => sum + c.attributedRevenue, 0);
  const blendedRoas = totalAdSpend > 0 ? totalAttributedRevenue / totalAdSpend : 0;
  const totalCmAfterAds = filteredCampaigns.reduce((sum, c) => sum + c.cmAfterAds, 0);

  // Trend line chart data (Daily ROAS vs CPA progression)
  const trendData = useMemo(() => {
    return [
      { date: '24/10', roas: 4.8, cpa: 68000, spend: 1100000, revenue: 5280000 },
      { date: '25/10', roas: 5.2, cpa: 62000, spend: 1350000, revenue: 7020000 },
      { date: '26/10', roas: 4.6, cpa: 74000, spend: 1500000, revenue: 6900000 },
      { date: '27/10', roas: 3.9, cpa: 82000, spend: 1700000, revenue: 6630000 },
      { date: '28/10', roas: 4.2, cpa: 79000, spend: 1400000, revenue: 5880000 },
      { date: '29/10', roas: 3.4, cpa: 94000, spend: 1800000, revenue: 6120000 },
      { date: '30/10', roas: 4.1, cpa: 76000, spend: 1650000, revenue: 6765000 },
    ];
  }, []);

  // Bar comparison dataset
  const barData = useMemo(() => {
    return filteredCampaigns.map((c) => ({
      shortName: c.name.length > 22 ? c.name.slice(0, 20) + '...' : c.name,
      fullName: c.name,
      platform: c.platform,
      adSpend: c.adSpend,
      attributedRevenue: c.attributedRevenue,
      roas: c.roas,
      ratioAvailable: (c.netSpend ?? c.adSpend) > 0,
      cmAfterAds: c.cmAfterAds,
      cpa: Math.round(c.cpa),
    }));
  }, [filteredCampaigns]);

  // Execute export
  function handleConfirmExport() {
    exportMarketingCampaignsToExcel(filteredCampaigns);
    setShowExportModal(false);
    toast(
      selectedExportFormat === 'table'
        ? '✓ Đã xuất Bảng Tổng Hợp Chiến Dịch Ads (Excel/CSV) thành công!'
        : selectedExportFormat === 'trend'
        ? '✓ Đã xuất dữ liệu Đường Xu Hướng ROAS & CPA (Excel/CSV) thành công!'
        : '✓ Đã xuất dữ liệu So Sánh Cột Chiến Dịch Ads (Excel/CSV) thành công!',
      'success'
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up font-sans">
      <EconomicsPeriod value={period} onChange={setPeriod}/>
      {/* 1. Header & Quick Export CTA */}
      <PageHeader
        icon={Target}
        title="Marketing Analytics & Hiệu Quả Quảng Cáo (Doanh thu / Ads)"
        subtitle={`Nguồn mock, chưa attribution campaign. Gross Ads ${formatCurrency(grossAdSpend)} − credit ${formatCurrency(adsCredit)} = net ${formatCurrency(totalAdSpend)}.`}
        badge={
          <span className="badge bg-purple-50 text-purple-800 border-purple-200 text-xs font-semibold">
            Attribution &amp; CM3
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowExportModal(true)}
              className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
            >
              <Download size={14} />
              <span>Tạo &amp; Xuất Báo Cáo Ads</span>
            </button>
          </div>
        }
      />

      {/* 2. Top Metric Strip (4 High-level KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          title="Chi Phí Ads Net"
          value={formatCurrency(totalAdSpend)}
          subtitle="Gross spend − Ads credit · dữ liệu shop demo"
          icon={DollarSign}
        />
        <KPICard
          title="Doanh Thu Net Giữ Lại"
          value={formatCurrency(totalAttributedRevenue)}
          subtitle="Tổng net của đơn trong nhóm shop; chưa attribution"
          sourceType="ESTIMATED"
          highlight
          icon={TrendingUp}
        />
        <KPICard
          title="Doanh thu giữ lại / Ads net"
          value={totalAdSpend > 0 ? `${blendedRoas.toFixed(2)}x` : 'Chưa đủ dữ liệu'}
          subtitle="Net doanh thu / (gross Ads − credit); chưa attribution"
          badge={totalAdSpend > 0 ? 'Chưa có attribution campaign' : 'Chưa đủ dữ liệu'}
          sourceType="ESTIMATED"
          highlight
          icon={Target}
        />
        <KPICard
          title="Lợi Nhuận Ròng Sau Ads (CM3)"
          value={formatCurrency(totalCmAfterAds)}
          subtitle="Doanh thu - COGS - Phí sàn - Ad Spend"
          sourceType="ESTIMATED"
          icon={Sparkles}
          highlight
        />
      </div>

      {/* 3. Report View Mode Switcher (Meta Ads Style: Bảng · Đường · Cột) */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3.5">
        {/* Left: 3 Report View Options */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'text-xs font-semibold px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer',
              viewMode === 'table'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <TableIcon size={14} className={viewMode === 'table' ? 'text-brand-600' : 'text-slate-400'} />
            <span>Bảng tổng hợp</span>
          </button>

          <button
            onClick={() => setViewMode('trend')}
            className={cn(
              'text-xs font-semibold px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer',
              viewMode === 'trend'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <LineChartIcon size={14} className={viewMode === 'trend' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Biểu đồ đường xu hướng</span>
          </button>

          <button
            onClick={() => setViewMode('bar')}
            className={cn(
              'text-xs font-semibold px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer',
              viewMode === 'bar'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <BarChart3 size={14} className={viewMode === 'bar' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>Biểu đồ cột so sánh</span>
          </button>
        </div>

        {/* Right: Platform Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <Filter size={13} className="text-slate-400" />
            Nền tảng:
          </span>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
          >
            <option value="all">Tất cả nền tảng ({campaigns.length})</option>
            <option value="website">Facebook / Meta Ads</option>
            <option value="tiktok">TikTok Ads / KOC</option>
            <option value="shopee">Shopee In-App Search</option>
          </select>
        </div>
      </div>

      {/* 4. DYNAMIC VIEW: BẢNG TỔNG HỢP / ĐƯỜNG XU HƯỚNG / BIỂU ĐỒ CỘT */}

      {/* MODE 1: BẢNG TỔNG HỢP */}
      {viewMode === 'table' && (
        <AnalyticsCard
          title="Bảng Hiệu Quả Nhóm Shop · chưa attribution campaign"
          subtitle="Net doanh thu, gross/credit/net Ads và CM3 từ đơn nguồn. CPC chưa có impressions/clicks. Không coi tổng shop là attributed revenue."
          formulaExplanation="Tỷ lệ = doanh thu net đơn đã giao / (gross Ads − credit); CM3 trừ chi phí thực, bồi thường tách khỏi sales"
        >
          <div className="overflow-x-auto pt-1">
            <table className="w-full text-xs min-w-[880px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider bg-slate-50/70">
                  <th className="py-2.5 px-3 text-left font-semibold">Nhóm Shop</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Nền Tảng</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Ngân Sách Ads</th>
                  <th className="py-2.5 px-3 text-right font-semibold">CPC (₫)</th>
                  <th className="py-2.5 px-3 text-right font-semibold">CPA (Chi Phí/Đơn)</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Doanh Thu Thuần</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-brand-900">Net doanh thu / Ads net</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-emerald-800">Lợi Nhuận Sau Ads</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Đánh Giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredCampaigns.map((c) => {
                  const isLoss = c.cmAfterAds < 0;
                  return (
                    <tr key={c.campaignId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900 block">{c.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Nguồn: {c.channel.toUpperCase()} • [{c.attributionType}]
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">{c.platform}</td>
                      <td className="py-3 px-3 text-right font-medium">{formatCurrency(c.netSpend ?? c.adSpend)}<small className="block text-slate-500">Gross {formatCurrency(c.adSpend)} · Credit {formatCurrency(c.adsCredit || 0)}</small></td>
                      <td className="py-3 px-3 text-right text-slate-600">{formatCurrency(c.cpc)}</td>
                      <td className="py-3 px-3 text-right text-slate-600">{formatCurrency(Math.round(c.cpa))}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(c.attributedRevenue)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-brand-900">{(c.netSpend ?? c.adSpend) > 0 ? `${c.roas.toFixed(2)}x` : 'Chưa đủ dữ liệu'}</td>
                      <td className="py-3 px-3 text-right font-bold">
                        <span className={cn(isLoss ? 'text-rose-600' : 'text-emerald-600')}>
                          {formatCurrency(c.cmAfterAds)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={cn(
                            'badge text-[10px] font-bold border px-2 py-0.5 rounded-md text-center inline-block',
                            c.status === 'PROFITABLE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : c.status === 'OPTIMIZING'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          )}
                        >
                          {c.status === 'INSUFFICIENT_DATA' ? 'Chưa đủ dữ liệu' : c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AnalyticsCard>
      )}

      {/* MODE 2: BIỂU ĐỒ ĐƯỜNG XU HƯỚNG */}
      {viewMode === 'trend' && (
        <AnalyticsCard
          title="MINH HỌA · Biểu Đồ Đường Xu Hướng: Diễn Biến Doanh thu / Ads &amp; CPA Theo Thời Gian"
          subtitle="So sánh dữ liệu theo ngày để khám phá xu hướng đốt tiền và hiệu quả chuyển đổi đơn hàng"
          formulaExplanation="MINH HỌA ngày; không phải dữ liệu attribution. Bảng dùng net doanh thu / Ads net."
          sourceType="SIMULATED"
          action={
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-4 h-0.5 bg-indigo-600 inline-block" /> ROAS (Lần)
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                <span className="w-4 h-0.5 bg-amber-500 inline-block" /> CPA Chi Phí/Đơn (₫)
              </span>
            </div>
          }
        >
          <div className="w-full h-[340px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#CBD5E1' }} />
                <YAxis
                  yAxisId="roas"
                  domain={[0, 8]}
                  tickFormatter={(v) => `${v}x`}
                  tick={{ fontSize: 11, fill: '#6366F1' }}
                  axisLine={{ stroke: '#6366F1' }}
                />
                <YAxis
                  yAxisId="cpa"
                  orientation="right"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: '#F59E0B' }}
                  axisLine={{ stroke: '#F59E0B' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = trendData.find((item) => item.date === label);
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                        <p className="font-bold text-brand-300 border-b border-slate-700 pb-1">Ngày {label}</p>
                        <p className="flex justify-between gap-4">
                          <span className="text-slate-400">Net doanh thu / Ads net:</span>
                          <span className="text-indigo-400 font-bold">{d?.roas}x</span>
                        </p>
                        <p className="flex justify-between gap-4">
                          <span className="text-slate-400">CPA (Chi phí/đơn):</span>
                          <span className="text-amber-400 font-bold">{formatCurrency(d?.cpa ?? 0)}</span>
                        </p>
                        <p className="flex justify-between gap-4">
                          <span className="text-slate-400">Ngân sách Ads:</span>
                          <span className="text-slate-300">{formatCurrency(d?.spend ?? 0)}</span>
                        </p>
                      </div>
                    );
                  }}
                />
                {/* Break-even ROAS benchmark */}
                <ReferenceLine
                  yAxisId="roas"
                  y={3.0}
                  stroke="#10B981"
                  strokeDasharray="4 4"
                  label={{ value: 'Hòa vốn (3.0x)', fill: '#10B981', fontSize: 10, fontWeight: 700 }}
                />
                <Line
                  yAxisId="roas"
                  type="monotone"
                  dataKey="roas"
                  name="ROAS"
                  stroke="#6366F1"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#6366F1' }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  yAxisId="cpa"
                  type="monotone"
                  dataKey="cpa"
                  name="CPA"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ r: 3, fill: '#F59E0B' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsCard>
      )}

      {/* MODE 3: BIỂU ĐỒ CỘT SO SÁNH */}
      {viewMode === 'bar' && (
        <AnalyticsCard
          title="Biểu Đồ Cột: So Sánh Ngân Sách Ads vs Doanh Thu Phân Bổ Theo Từng Chiến Dịch"
          subtitle="So sánh các số liệu khác nhau theo từng phần chia nhỏ để phát hiện chiến dịch sinh lời cao nhất"
          formulaExplanation="Cột xanh: gross Ads; cột tím: net doanh thu shop (chưa attribution); tỷ lệ dùng Ads net"
          sourceType="ESTIMATED"
        >
          <div className="w-full h-[360px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="shortName"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={{ stroke: '#CBD5E1' }}
                  interval={0}
                />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={{ stroke: '#CBD5E1' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0]?.payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 max-w-xs">
                        <p className="font-bold text-brand-300 border-b border-slate-700 pb-1">{item.fullName}</p>
                        <p className="text-slate-400 text-[11px]">Nền tảng: {item.platform}</p>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ngân sách Ads:</span>
                          <span className="text-emerald-400 font-bold">{formatCurrency(item.adSpend)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Net doanh thu shop:</span>
                          <span className="text-indigo-400 font-bold">{formatCurrency(item.attributedRevenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Net doanh thu / Ads net:</span>
                          <span className="text-amber-300 font-bold">{item.ratioAvailable ? `${item.roas}x` : 'Chưa đủ dữ liệu'}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-700">
                          <span className="text-slate-400">Lợi nhuận sau Ads:</span>
                          <span className={cn('font-bold', item.cmAfterAds < 0 ? 'text-rose-400' : 'text-emerald-400')}>
                            {formatCurrency(item.cmAfterAds)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="adSpend" name="Ngân sách Ads" fill="#10B981" radius={[4, 4, 0, 0]} barSize={22} />
                <Bar dataKey="attributedRevenue" name="Doanh thu mang về" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnalyticsCard>
      )}

      {/* 5. MODAL TẠO & XUẤT BÁO CÁO (CHUẨN FORM FACEBOOK / META ADS) */}
      <p className="text-xs text-slate-500">Nguồn demo: số shop từ cùng engine đơn hàng, chưa có attribution chiến dịch. Biểu đồ ngày là dữ liệu minh họa, không dùng để kết luận ROAS thực tế.</p>
      <section className="card p-4 space-y-3" data-testid="growth-handoffs"><h2 className="font-semibold">Đề xuất & quyết định vận hành</h2>
        {activeRole === 'growth' && mockStore.getOrders().map(o => <button key={o.id} className="btn-secondary mr-2" data-recommend-order={o.id} onClick={() => act(() => mockStore.createGrowthRecommendation(o.id, 'Rà soát Ads / hủy hoàn từ báo cáo'))}>Đề xuất rà soát {o.order_number}</button>)}
        {recommendations.map(r => <div key={r.id} className="text-sm border-t pt-2">{r.status} · {r.reason}{hasPermission(activeRole, 'orders:manage') && r.status === 'open' && <><button className="btn-secondary ml-2" onClick={() => act(() => mockStore.resolveGrowthRecommendation(r.id, 'accepted'))}>Tiếp nhận đề xuất</button><button className="btn-secondary ml-2" onClick={() => act(() => mockStore.resolveGrowthRecommendation(r.id, 'dismissed'))}>Không triển khai</button></>}</div>)}
      </section>
      <Modal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Tạo Báo Cáo Hiệu Quả Quảng Cáo & ROAS"
      >
        <div className="p-4 sm:p-5 space-y-4 text-xs font-sans">
          <p className="text-slate-500 leading-relaxed">
            Chọn định dạng bố cục báo cáo bạn muốn xem hoặc tải về máy (Hỗ trợ định dạng Excel/CSV tiêu chuẩn).
          </p>

          {/* Option 1: Bảng tổng hợp */}
          <div
            onClick={() => setSelectedExportFormat('table')}
            className={cn(
              'p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5',
              selectedExportFormat === 'table'
                ? 'border-brand-600 bg-brand-50/40 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            )}
          >
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
              <TableIcon size={20} className="text-slate-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">Bảng tổng hợp</h4>
                <input
                  type="radio"
                  name="report_format"
                  checked={selectedExportFormat === 'table'}
                  onChange={() => setSelectedExportFormat('table')}
                  className="w-4 h-4 text-brand-600 cursor-pointer"
                />
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Phân chia và nhóm dữ liệu để tìm ra thông tin chi tiết có ý nghĩa.
              </p>
            </div>
          </div>

          {/* Option 2: Biểu đồ về đường xu hướng */}
          <div
            onClick={() => setSelectedExportFormat('trend')}
            className={cn(
              'p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5',
              selectedExportFormat === 'trend'
                ? 'border-brand-600 bg-brand-50/40 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            )}
          >
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
              <LineChartIcon size={20} className="text-slate-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">Biểu đồ về đường xu hướng</h4>
                <input
                  type="radio"
                  name="report_format"
                  checked={selectedExportFormat === 'trend'}
                  onChange={() => setSelectedExportFormat('trend')}
                  className="w-4 h-4 text-brand-600 cursor-pointer"
                />
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                So sánh dữ liệu theo thời gian để khám phá xu hướng Doanh thu / Ads &amp; CPA.
              </p>
            </div>
          </div>

          {/* Option 3: Biểu đồ cột */}
          <div
            onClick={() => setSelectedExportFormat('bar')}
            className={cn(
              'p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5',
              selectedExportFormat === 'bar'
                ? 'border-brand-600 bg-brand-50/40 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            )}
          >
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
              <BarChart3 size={20} className="text-slate-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">Biểu đồ cột</h4>
                <input
                  type="radio"
                  name="report_format"
                  checked={selectedExportFormat === 'bar'}
                  onChange={() => setSelectedExportFormat('bar')}
                  className="w-4 h-4 text-brand-600 cursor-pointer"
                />
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                So sánh các số liệu khác nhau theo từng phần chia nhỏ nền tảng.
              </p>
            </div>
          </div>

          {/* Meta AI Prompt Input box */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Báo cáo của bạn nên hiển thị những gì?
              </label>
              <span className="text-[10px] text-slate-400">Không bắt buộc • Meta AI</span>
            </div>
            <input
              type="text"
              placeholder="Ví dụ: Hiệu quả của chiến dịch và nhóm quảng cáo so với tháng trước"
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              onClick={() => setShowExportModal(false)}
              className="btn-secondary text-xs px-3.5 py-2"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmExport}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm"
            >
              <Download size={14} />
              <span>Tiếp tục &amp; Xuất Excel</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
