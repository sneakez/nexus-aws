import { omsStore as mockStore } from '@/stores/omsStore';
import { MoneyDialog, type MoneyAction } from '../components/MoneyDialog';
import { useAuth } from '@/providers/AuthProvider';
import { hasPermission } from '@/lib/permissions';
import { useState, useMemo, useEffect } from 'react';
import {
  Wallet,
  DollarSign,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Zap,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  AlertOctagon,
  Calendar,
  Layers,
  Activity,
  Boxes,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
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
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/cn';

export function CashWorkingCapitalPage() {
  const toast = useToast();
  const { activeRole } = useAuth();
  const [, revise] = useState(0);
  useEffect(() => mockStore.subscribe(() => revise(n => n + 1)), []);
  const [action, setAction] = useState<MoneyAction | null>(null);
  const [stressTestMode, setStressTestMode] = useState(false);
  const [activeTableTab, setActiveTableTab] = useState<'settlements' | 'payables'>('settlements');
  const finance = mockStore.getFinanceOverview(stressTestMode ? 7 : 0);
  const wc = analyticsService.getWorkingCapitalOverview();
  const canMoney = hasPermission(activeRole, 'finance:reconcile');
  const settlements = finance.settlements;
  const payables = finance.payables;
  const forecastData = finance.forecast.days;
  const hasScheduledCashMovement = forecastData.some(day => day.inflow !== 0 || day.outflow !== 0);
  const totalTiedUp = wc.inventoryCapital + wc.pendingMarketplaceSettlements;
  const totalWorkingCapital = wc.availableCash + totalTiedUp;
  const lockUpRatio = totalWorkingCapital > 0 ? (totalTiedUp / totalWorkingCapital) * 100 : 0;
  function handleWithdraw(item: typeof settlements[number]) { setAction({ kind: 'receipt', id: item.id }); }
  function handleExtendPayable(item: typeof payables[number]) { setAction({ kind: 'terms', id: item.id }); }

  // Detect minimum cash day in the next 14 days
  const lowestCashDay = useMemo(() => {
    return forecastData.reduce((lowest, curr) =>
      curr.netCash < lowest.netCash ? curr : lowest,
      forecastData[0]
    );
  }, [forecastData]);

  const hasCashRupture = lowestCashDay.netCash < 0;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up font-sans">
      {/* 1. Standard Header */}
      <PageHeader
        icon={Wallet}
        title="Dòng Tiền & Vốn Lưu Động"
        subtitle="Quản trị thanh khoản, kiểm soát 3 van kẹt vốn (Kho · Sàn TMĐT · NCC) & dự báo nguy cơ đứt gãy tiền mặt"
        badge={
          <span className="badge bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-semibold">
            Cảnh báo thanh khoản
          </span>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setStressTestMode(!stressTestMode);
                toast(
                  stressTestMode
                    ? '✓ Đã tắt mô phỏng áp lực: Trở về lịch đối soát chuẩn.'
                    : '⚠️ Đã mô phỏng tình huống sàn TMĐT chậm đối soát 7 ngày!',
                  stressTestMode ? 'info' : 'warning'
                );
              }}
              className={cn(
                'text-xs py-2 px-3.5 rounded-lg font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shadow-xs',
                stressTestMode
                  ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              )}
            >
              <Zap size={14} className={stressTestMode ? 'text-amber-300 animate-pulse' : 'text-amber-500'} />
              <span>{stressTestMode ? 'Tắt mô phỏng áp lực' : 'Mô phỏng sàn chậm 7 ngày'}</span>
            </button>
            <button
              onClick={() => { revise(n => n + 1); toast('Đã đọc lại chứng từ demo; chưa kết nối ngân hàng hoặc sàn thật.', 'info'); }}
              className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw size={14} />
              <span>Làm mới số dư</span>
            </button>
          </div>
        }
      />

      {/* 2. TẦNG 1: RADAR CẢNH BÁO SỚM SỨC KHỎE DÒNG TIỀN (DAILY CASH HEALTH & RUPTURE RADAR) */}
      <div
        className={cn(
          'rounded-xl border p-4 shadow-xs transition-all duration-300',
          hasCashRupture
            ? 'bg-rose-50/90 border-rose-300'
            : stressTestMode
            ? 'bg-amber-50/90 border-amber-300'
            : 'bg-gradient-to-r from-emerald-50/70 via-white to-blue-50/40 border-slate-200'
        )}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Indicator */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5',
                hasCashRupture
                  ? 'bg-rose-100 text-rose-700 border-rose-300 animate-bounce'
                  : stressTestMode
                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-300'
              )}
            >
              {hasCashRupture ? (
                <AlertOctagon size={22} />
              ) : stressTestMode ? (
                <AlertTriangle size={20} />
              ) : (
                <ShieldCheck size={22} />
              )}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  {hasCashRupture
                    ? 'BÁO ĐỘNG ĐỨT GÃY DÒNG TIỀN: Nguy cơ số dư âm tại ngày ' + lowestCashDay.date
                    : stressTestMode
                    ? 'CẢNH BÁO ÁP LỰC THANH KHOẢN: Sàn chậm đối soát gây thắt nghẽn tiền mặt'
                    : 'DỰ KIẾN THEO LỊCH ĐÃ NHẬP · không phải xác nhận an toàn dòng tiền'}
                </h3>
                <span
                  className={cn(
                    'badge text-[11px] font-bold px-2 py-0.5 rounded-md border',
                    hasCashRupture
                      ? 'bg-rose-200 text-rose-900 border-rose-300'
                      : stressTestMode
                      ? 'bg-amber-200 text-amber-900 border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  )}
                >
                  {hasCashRupture
                    ? 'Nguy Cơ Vỡ Đê'
                    : stressTestMode
                    ? 'Đang mô phỏng áp lực'
                    : 'Lịch mô phỏng'}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                {hasCashRupture ? (
                  <span>
                    Dòng tiền bị thiếu hụt <strong>{formatCurrency(Math.abs(lowestCashDay.netCash))}</strong> vào ngày{' '}
                    <strong>{lowestCashDay.date}</strong> theo chứng từ còn phải thu/trả đã có ngày. Khoản chưa rõ ngày được liệt kê riêng, không tự phân bổ.
                  </span>
                ) : (
                  <span>
                    Tổng tiền kẹt ngoài thị trường chiếm <strong>{lockUpRatio.toFixed(1)}%</strong> tổng vốn lưu động (Vốn kho: {formatCurrency(wc.inventoryCapital)}, Tiền sàn giữ: {formatCurrency(wc.pendingMarketplaceSettlements)}). Điểm trũng thanh khoản thấp nhất: <strong>{formatCurrency(lowestCashDay.netCash)}</strong> (ngày {lowestCashDay.date}).
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="bg-white/90 border border-slate-200 rounded-xl px-3.5 py-2 text-center min-w-[120px] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Tỷ Lệ Tiền Bị Kẹt
              </span>
              <span
                className={cn(
                  'text-base font-black font-mono',
                  lockUpRatio > 85 ? 'text-amber-600' : 'text-slate-800'
                )}
              >
                {lockUpRatio.toFixed(1)}%
              </span>
            </div>

            <div className="bg-white/90 border border-slate-200 rounded-xl px-3.5 py-2 text-center min-w-[120px] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Chưa rõ lịch
              </span>
              <span className="text-base font-black font-mono text-emerald-600">
                {finance.forecast.undated.length} khoản
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TẦNG 2: 4 THẺ KPI DÒNG TIỀN CỐT LÕI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          title="Tiền Mặt Khả Dụng"
          value={formatCurrency(wc.availableCash)}
          subtitle="Đầu kỳ + chứng từ thu − chứng từ chi trong dữ liệu demo"
          icon={Wallet}
          highlight
        />
        <KPICard
          title="Vốn Giam Trong Kho"
          value={formatCurrency(wc.inventoryCapital)}
          subtitle="Tồn thực trong scope × giá vốn MAC đã có"
          icon={Boxes}
          badge="Van Tồn Kho (DIO)"
        />
        <KPICard
          title="Công Nợ Sàn Chờ Về"
          value={formatCurrency(wc.pendingMarketplaceSettlements)}
          subtitle="Shopee, TikTok, Lazada đang giữ đối soát"
          badge="Van Đối Soát (DSO)"
          highlight
          icon={Clock}
        />
        <KPICard
          title="Công nợ NCC còn phải trả"
          value={formatCurrency(wc.supplierPayables)}
          subtitle="Theo giá trị hàng PO thực nhận; tiền và hàng độc lập"
          badge="Chứng từ demo"
          sourceType="ESTIMATED"
          icon={ShieldCheck}
          highlight
        />
      </div>

      {/* 4. TẦNG 3: TRỌNG TÂM — BIỂU ĐỒ THỦY TRIỀU DÒNG TIỀN 14 NGÀY (14-DAY CASH TIDE & LIQUIDITY CLIFF) */}
      <AnalyticsCard
        title="Dự Báo Dòng Tiền 14 Ngày"
        subtitle="Dòng tiền vào từ sàn và dòng tiền ra theo nợ đến hạn, giúp phát hiện sớm điểm trũng thanh khoản"
        formulaExplanation="Số dư ngày T = Số dư hôm trước + Tiền sàn nhả về - Tiền PO & Chi phí vận hành"
        sourceType="SIMULATED"
        action={
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" /> Tiền sàn về (+)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block" /> Chi nợ PO (-)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span className="w-4 h-0.5 bg-indigo-600 inline-block" /> Số dư dự kiến
            </span>
          </div>
        }
      >
        {hasScheduledCashMovement ? <div className="w-full h-[320px] pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={forecastData}
              margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="amount"
                tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#CBD5E1' }}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const item = forecastData.find((d) => d.date === label);
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 max-w-xs">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                        <span className="font-bold text-brand-300">
                          {label} ({item?.label})
                        </span>
                        {item?.warning && (
                          <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/40">
                            Chú ý
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tiền sàn về (+):</span>
                        <span className="text-emerald-400 font-bold">
                          +{formatCurrency(item?.inflow ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Chi trả PO/Vận hành (-):</span>
                        <span className="text-rose-400 font-bold">
                          -{formatCurrency(item?.outflow ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-700 font-bold">
                        <span className="text-white">Số dư dự kiến cuối ngày:</span>
                        <span
                          className={cn(
                            'font-mono',
                            (item?.netCash ?? 0) < 0 ? 'text-rose-400' : 'text-indigo-300'
                          )}
                        >
                          {formatCurrency(item?.netCash ?? 0)}
                        </span>
                      </div>
                      {item?.warning && (
                        <p className="text-[10px] text-amber-300 pt-1 leading-tight">{item.warning}</p>
                      )}
                    </div>
                  );
                }}
              />
              {/* Zero Balance Rupture Danger Line */}
              <ReferenceLine
                yAxisId="amount"
                y={0}
                stroke="#E11D48"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: 'Vạch Cạn Tiền (0 ₫)',
                  position: 'insideBottomRight',
                  fill: '#E11D48',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
              {/* Inflow Bars */}
              <Bar
                yAxisId="amount"
                dataKey="inflow"
                name="Tiền Sàn Nhả Về (+)"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
                barSize={14}
              />
              {/* Outflow Bars */}
              <Bar
                yAxisId="amount"
                dataKey="outflow"
                name="Chi Nợ PO & Chi Phí (-)"
                fill="#F43F5E"
                radius={[4, 4, 0, 0]}
                barSize={14}
              />
              {/* Cumulative Net Cash Line */}
              <Line
                yAxisId="amount"
                type="monotone"
                dataKey="netCash"
                name="Số Dư Dự Kiến"
                stroke="#6366F1"
                strokeWidth={3}
                dot={{ r: 3, fill: '#6366F1' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div> : (
          <div className="min-h-36 flex flex-col items-center justify-center text-center px-6 py-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/70">
            <Calendar size={24} className="text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Chưa có dòng tiền đã lên lịch trong 14 ngày tới</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">Ghi nhận ngày dự kiến tiền sàn về hoặc hạn trả nhà cung cấp để biểu đồ dự báo có dữ liệu.</p>
          </div>
        )}
      </AnalyticsCard>

      {/* 5. TẦNG 4: BÓC TÁCH 3 VAN NGHẼN TIỀN & TỦ THUỐC HÀNH ĐỘNG CỨU DÒNG TIỀN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: 3 Cash Valves & Working Capital Gap */}
        <AnalyticsCard
          title="Bóc Tách 3 Điểm Nghẽn & Khoảng Cách Vốn"
          subtitle="Đo lường lượng vốn doanh nghiệp bắt buộc phải tự bù đắp để duy trì chuỗi cung ứng"
          formulaExplanation="Vốn Cần Tài Trợ = (Công Nợ Sàn + Hàng Tồn Kho) - Phải Trả Nhà Cung Cấp"
          sourceType="ESTIMATED"
          className="lg:col-span-6"
        >
          <div className="space-y-3 pt-1 text-xs">
            {/* Valve 1: Inventory */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-bold text-slate-800">1. Vốn tồn thực · chưa đủ dữ liệu DIO</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Vốn nằm trên kệ chờ khách chốt đơn và xuất kho
                </span>
              </div>
              <span className="font-bold text-sm text-slate-900">
                +{formatCurrency(wc.inventoryCapital)}
              </span>
            </div>

            {/* Valve 2: Platform Settlements */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span className="font-bold text-slate-800">2. Phải thu sàn · chưa đủ dữ liệu DSO</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Đã giao thành công nhưng Shopee, TikTok giữ đối soát
                </span>
              </div>
              <span className="font-bold text-sm text-slate-900">
                +{formatCurrency(wc.pendingMarketplaceSettlements)}
              </span>
            </div>

            {/* Valve 3: Supplier Payables */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-bold text-slate-800">3. Nợ PO thực nhận · chưa đủ dữ liệu DPO</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Đòn bẩy vốn được xưởng cho gối đầu thanh toán sau
                </span>
              </div>
              <span className="font-bold text-sm text-emerald-700">
                -{formatCurrency(wc.supplierPayables)}
              </span>
            </div>

            {/* Working Capital Gap Final */}
            <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-brand-950 text-sm block">Khoảng Cách Vốn Cần Tự Tài Trợ:</span>
                <span className="text-[11px] text-brand-800">
                  Lượng tiền mặt bạn phải tự có sẵn để tránh bị đứt gãy
                </span>
              </div>
              <span className="font-black text-base text-brand-900">
                {formatCurrency(wc.workingCapitalGap)}
              </span>
            </div>
          </div>
        </AnalyticsCard>

        {/* Right Column: Cash Liberation Actions (Tủ Thuốc Cứu Dòng Tiền) */}
        <AnalyticsCard
          title="Hành Động Giải Phóng Dòng Tiền"
          subtitle="Các hành động tức thời có thể giải tỏa ngay tiền mặt khi áp lực thanh khoản tăng cao"
          sourceType="ACTUAL"
          className="lg:col-span-6"
        >
          <div className="space-y-3 pt-1 text-xs">
            <p>Chỉ ghi nhận tiền trong dữ liệu demo khi có chứng từ xác nhận. Đơn có lãi hoặc đối soát xong không tự tăng tiền.</p>
            <button disabled={!canMoney} className="btn-primary mr-2" onClick={() => setAction({kind:'batch'})}>Lập đợt tiền sàn</button>
            <button disabled={activeRole !== 'owner'} className="btn-secondary" onClick={() => setAction({kind:'account'})}>Khai báo tài khoản demo</button>
            {!finance.accounts.length && <p>Chưa khai báo số dư đầu kỳ. Không sử dụng số dư mẫu thay thế.</p>}
            {finance.accounts.map(a => <p key={a.id}>{a.name}: {formatCurrency(a.balance)} · đầu kỳ {formatCurrency(a.opening_balance)} ({a.opening_date}, {a.opening_reference})</p>)}
            <p>Nợ PO ghi theo số lượng thực nhận × đơn giá PO. PO cũ thiếu chứng từ ghi nợ chưa được suy diễn thành đã trả hoặc không còn nợ.</p>
            <span className="text-slate-500">Theo dõi PO trong chứng từ công nợ bên dưới</span>
          </div>
        </AnalyticsCard>
      </div>

      {/* 6. TẦNG 5: BẢNG LỊCH TRÌNH 2 CHIỀU (THU TỪ SÀN ⟷ CHI TRẢ PO NHÀ CUNG CẤP) */}
      <AnalyticsCard
        title="Bảng Lịch Trình Đối Soát 2 Chiều: Tiền Sàn Đổ Về (+) vs Đáo Hạn Trả Nợ PO (-)"
        subtitle="Quản lý chi tiết từng đợt giải ngân ví sàn TMĐT song song với các mốc công nợ nhà cung cấp"
        action={
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTableTab('settlements')}
              className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-md transition-colors',
                activeTableTab === 'settlements'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Tiền sàn sắp về ({settlements.length})
            </button>
            <button
              onClick={() => setActiveTableTab('payables')}
              className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-md transition-colors',
                activeTableTab === 'payables'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Đáo hạn trả nợ PO ({payables.length})
            </button>
          </div>
        }
      >
        {activeTableTab === 'settlements' ? (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-xs min-w-[650px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider bg-slate-50/70">
                  <th className="py-2.5 px-3 text-left font-semibold">Mã Đợt &amp; Kênh Bán</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Ngày Đối Soát / Mở Ví</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Số Đơn Hàng</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Số Tiền Giải Ngân</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Trạng Thái Ví</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {!settlements.length && <tr><td colSpan={6} className="p-4 text-slate-500">Chưa lập đợt tiền sàn; không hiển thị đợt mẫu.</td></tr>}
                {settlements.map(s => <tr key={s.id} data-settlement={s.id}>
                  <td className="p-3">{s.id} · {s.channel}<div className="text-xs text-slate-500">{s.shop_id}</div></td>
                  <td className="p-3">{s.expected_date || 'Chưa rõ ngày'}</td><td className="p-3 text-right">{s.order_ids.length} đơn</td>
                  <td className="p-3 text-right">Gốc {formatCurrency(s.original_expected)}<br/>Điều chỉnh {formatCurrency(s.adjustment)}<br/>Dự kiến {formatCurrency(s.current_expected)}<br/>Nhận {formatCurrency(s.received)}<br/>Còn {formatCurrency(s.remaining)}</td>
                  <td className="p-3">{({expected:'Dự kiến / chưa đối soát',reconciled_waiting:'Đã đối soát / chờ nhận',partial:'Nhận một phần',received:'Đã nhận',adjustment_required:'Chênh lệch cần xử lý'})[s.status]}</td>
                  <td className="p-3"><button className="btn-secondary" disabled={!canMoney} onClick={() => handleWithdraw(s)}>Chi tiết / ghi nhận tiền</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-xs min-w-[650px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider bg-slate-50/70">
                  <th className="py-2.5 px-3 text-left font-semibold">Nhà Cung Cấp &amp; Mã PO</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Hạn Thanh Toán (Due Date)</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Số Tiền Phải Trả</th>
                  <th className="py-2.5 px-3 text-center font-semibold">Mức Độ Khẩn</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Thao Tác Dòng Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {!payables.length && <tr><td colSpan={5} className="p-4 text-slate-500">Chưa có nợ từ chứng từ nhận PO mới.</td></tr>}
                {payables.map(p => <tr key={p.id} data-payable={p.id}>
                  <td className="p-3">{p.supplier_name}<br/><span className="text-xs text-slate-500">{p.po_id}</span></td>
                  <td className="p-3">{p.due_date || 'Chưa rõ hạn'}<br/>{p.extension_status === 'requested_simulation' ? `Đề nghị ${p.proposed_due_date} · chưa xác nhận` : p.extension_status === 'confirmed_simulation' ? 'Hạn đã xác nhận mô phỏng' : ''}</td>
                  <td className="p-3 text-right">Ghi nợ {formatCurrency(p.accrued)}<br/>Đã trả {formatCurrency(p.paid)}<br/>Còn {formatCurrency(p.remaining)}</td>
                  <td className="p-3">{p.overdue ? 'Quá hạn' : p.status === 'paid' ? 'Đã trả đủ' : p.status === 'partial' ? 'Trả một phần' : 'Chưa trả'}</td>
                  <td className="p-3 space-y-2"><button disabled={!canMoney} className="btn-secondary" onClick={() => setAction({kind:'payment',id:p.id})}>Ghi trả NCC</button><button disabled={!canMoney} className="btn-secondary" onClick={() => handleExtendPayable(p)}>Hạn trả / đề nghị gia hạn</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </AnalyticsCard>
      <p className="text-xs text-slate-500">Dự báo chỉ gồm số còn lại, đã nhận/trả không tính lặp. Chưa rõ ngày: {finance.forecast.undated.map(e => `${e.id}: +${e.inflow} / −${e.outflow}`).join('; ') || 'Không có'}. Không có lịch thì không kết luận an toàn.</p>
      {action && <MoneyDialog action={action} onClose={() => setAction(null)}/>}
    </div>
  );
}
