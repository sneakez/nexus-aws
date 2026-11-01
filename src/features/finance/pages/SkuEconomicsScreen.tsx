import { EconomicsPeriod, type EconomicsPeriodValue } from '@/components/charts/EconomicsPeriod';

// SKU portfolio economics feature screen.
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ArrowRight,
  Calculator,
  Boxes,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Download,
  ReceiptText,
  ChevronLeft,
  ChevronRight,
  Tag
} from 'lucide-react';
import { analyticsService } from '@/analytics/analyticsService';
import { omsStore as mockStore } from '@/stores/omsStore';
import type { SkuUnitEconomics } from '@/analytics/types';
import { AnalyticsCard } from '@/components/charts/AnalyticsCard';
import { KPICard } from '@/components/charts/KPICard';
import { ScatterBubbleChart } from '@/components/charts/ScatterBubbleChart';
import { HierarchicalDataGrid, type DataGridColumnGroup } from '@/components/common/HierarchicalDataGrid';
import { Drawer } from '@/components/ui/Drawer';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/cn';

interface SkuEconomicsPageProps {
  onNavigate?: (pageId: string) => void;
}

const RANK_BADGES: Record<string, { label: string; color: string }> = {
  STAR: { label: '🌟 Ngôi Sao (Star)', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  CASH_COW: { label: '🐄 Bò Sữa (Cash Cow)', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  QUESTION_MARK: { label: '❓ Dấu Hỏi (Question)', color: 'bg-blue-100 text-blue-900 border-blue-300' },
  DOG: { label: '⚠️ Chậm (Dog)', color: 'bg-rose-100 text-rose-900 border-rose-300' }
};

export function SkuEconomicsPage({ onNavigate }: SkuEconomicsPageProps) {
  const [selectedRank, setSelectedRank] = useState<string>('all');
  const [drawerSku, setDrawerSku] = useState<SkuUnitEconomics | null>(null);

  const [period,setPeriod]=useState<EconomicsPeriodValue>('all');
  const skus = analyticsService.getSkuEconomics(undefined, period === 'all' ? undefined : period);
  const inv5 = mockStore.getInventory5State();

  const rankCounts = useMemo(() => {
    return {
      all: skus.length,
      STAR: skus.filter(s => s.contributionRank === 'STAR').length,
      CASH_COW: skus.filter(s => s.contributionRank === 'CASH_COW').length,
      QUESTION_MARK: skus.filter(s => s.contributionRank === 'QUESTION_MARK').length,
      DOG: skus.filter(s => s.contributionRank === 'DOG').length
    };
  }, [skus]);

  const filteredSkus = useMemo(() => {
    return skus.filter(s => {
      if (selectedRank !== 'all' && s.contributionRank !== selectedRank) return false;
      return true;
    });
  }, [skus, selectedRank]);

  const totalStockValue = skus.reduce((sum, s) => sum + s.stockValue, 0);
  const totalContribution = skus.reduce((sum, s) => sum + s.totalContribution, 0);
  const avgStockRoi = totalStockValue > 0 ? (totalContribution / totalStockValue) * 100 : 0;

  // Grouped Column Headers
  const columnGroups: DataGridColumnGroup<SkuUnitEconomics>[] = useMemo(() => [
    {
      id: 'grp_sku_identity',
      title: 'SẢN PHẨM & PHÂN HẠNG',
      badge: 'SKU MASTER',
      columns: [
        {
          id: 'sku',
          header: 'Mã SKU & Sản Phẩm',
          sticky: 'left',
          width: '210px',
          sortable: true,
          sortValue: s => s.sku,
          accessor: s => {
            const rank = RANK_BADGES[s.contributionRank] || RANK_BADGES.STAR;
            return (
              <div className="space-y-1">
                <span className="font-bold text-ink-900 block group-hover:text-brand-600 transition-colors">
                  {s.sku}
                </span>
                <span className="text-[11px] text-ink-600 font-sans block truncate max-w-[190px]" title={s.name}>
                  {s.name}
                </span>
                <span className={cn('badge text-[9px] px-1 py-0 font-bold', rank.color)}>
                  {rank.label}
                </span>
              </div>
            );
          }
        }
      ]
    },
    {
      id: 'grp_pricing_costs',
      title: 'GIÁ & CHI PHÍ ĐƠN VỊ',
      badge: 'PRICING',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      columns: [
        {
          id: 'asp',
          header: 'Giá Bán (ASP)',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: s => s.asp,
          accessor: s => <span className="font-bold text-ink-900">{formatCurrency(s.asp)}</span>
        },
        {
          id: 'cogs',
          header: 'Giá Vốn MAC',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: s => s.cogs,
          accessor: s => <span className="text-ink-600">{formatCurrency(s.cogs)}</span>
        },
        {
          id: 'break_even',
          header: 'Giá Hòa Vốn',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: s => s.breakEvenPrice ?? 0,
          accessor: s => (
            <div className="text-right">
              <span className="font-bold text-ink-800 block">{formatCurrency(s.breakEvenPrice)}</span>
              <span className="text-[9px] text-ink-400 font-sans">Sàn+WMS</span>
            </div>
          )
        }
      ]
    },
    {
      id: 'grp_contribution',
      title: 'MARGIN & LỢI NHUẬN ĐÓNG GÓP',
      badge: 'PROFIT',
      badgeColor: 'bg-brand-50 text-brand-800 border-brand-200',
      columns: [
        {
          id: 'cm_unit',
          header: 'Lãi CM / Cái',
          align: 'right',
          width: '110px',
          sortable: true,
          sortValue: s => (s.contributionMarginPerUnit ?? s.cmPerUnit ?? 0),
          accessor: s => (
            <span className={cn('font-bold', (s.contributionMarginPerUnit ?? s.cmPerUnit ?? 0) >= 0 ? 'text-brand-900' : 'text-rose-600')}>
              {formatCurrency(s.contributionMarginPerUnit ?? s.cmPerUnit ?? 0)}
            </span>
          )
        },
        {
          id: 'cm_percent',
          header: 'Biên CM %',
          align: 'right',
          width: '100px',
          sortable: true,
          sortValue: s => s.cmPercent,
          accessor: s => (
            <span className={cn('badge text-[11px] font-bold', s.cmPercent >= 40 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-ink-100 text-ink-700 border-ink-200')}>
              {s.cmPercent.toFixed(1)}%
            </span>
          )
        },
        {
          id: 'total_cm',
          header: 'Tổng Lãi 30D',
          align: 'right',
          width: '120px',
          sortable: true,
          sortValue: s => s.totalContribution,
          accessor: s => <strong className="font-extrabold text-emerald-800">{formatCurrency(s.totalContribution)}</strong>
        }
      ]
    },
    {
      id: 'grp_inventory_metrics',
      title: 'VẬN TỐC & VỐN LƯU KHO',
      badge: 'STOCK & VELOCITY',
      badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      columns: [
        {
          id: 'physical_stock',
          header: 'Tồn Vật Lý',
          align: 'right',
          width: '90px',
          sortable: true,
          sortValue: s => s.physicalStock,
          accessor: s => <span className="font-bold text-ink-900">{s.physicalStock} cái</span>
        },
        {
          id: 'stock_value',
          header: 'Vốn Tồn Kho',
          align: 'right',
          width: '115px',
          sortable: true,
          sortValue: s => s.stockValue,
          accessor: s => <span className="text-ink-700">{formatCurrency(s.stockValue)}</span>
        },
        {
          id: 'dio',
          header: 'Ngày Tồn (DIO)',
          align: 'right',
          width: '100px',
          sortable: true,
          sortValue: s => s.daysOfInventory,
          accessor: s => (
            <span className={cn('badge text-[10px]', s.daysOfInventory > 60 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800')}>
              {s.unitsSold > 0 ? `${s.daysOfInventory} ngày` : 'Chưa đủ lịch sử'}
            </span>
          )
        }
      ]
    },
    {
      id: 'grp_actions',
      title: 'HÀNH ĐỘNG',
      columns: [
        {
          id: 'actions',
          header: 'Thao Tác',
          align: 'right',
          width: '185px',
          accessor: s => (
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDrawerSku(s);
                }}
                className="text-xs py-1 px-2.5 inline-flex items-center gap-1 font-semibold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
                title="Mở bảng trượt bóc tách chi phí & tồn kho SKU"
              >
                <ReceiptText size={12} />
                <span>Xem chi tiết</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onNavigate) onNavigate('pricingCalculator');
                }}
                className="btn btn-secondary text-xs py-1 px-2 text-ink-600 hover:text-ink-900 flex items-center gap-1 cursor-pointer"
                title="Mở bộ tính giá hòa vốn & chiết khấu"
              >
                <Calculator size={11} />
                <span>Giá SIM</span>
              </button>
            </div>
          )
        }
      ]
    }
  ], [onNavigate]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in-up">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-ink-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-ink-900 tracking-tight">
              Lợi Nhuận & Ma Trận Danh Mục SKU
            </h1>
            <span className="badge bg-brand-100 text-brand-800 border-brand-300 text-xs font-bold">
              Ma trận danh mục
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Đánh giá sức khỏe tài chính từng SKU theo biên đóng góp CM, giá hòa vốn và vòng quay vốn lưu kho.
          </p>
        </div>
      </div>

      <EconomicsPeriod value={period} onChange={setPeriod}/>

      {/* LEVEL 1: Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          title="Tổng Giá Trị Hàng Tồn"
          value={formatCurrency(totalStockValue)}
          subtitle="Vốn lưu động đang nằm trong kho"
        />
        <KPICard
          title="Tổng Lãi Gộp CM (30 Ngày)"
          value={formatCurrency(totalContribution)}
          subtitle="Lợi nhuận đóng góp gộp từ tất cả SKU"
          highlight
        />
        <KPICard
          title="Tỷ Suất Sinh Lời Vốn Tồn Kho"
          value={`${avgStockRoi.toFixed(1)}%`}
          subtitle="ROI trên vốn hàng tồn (CM / Stock Value)"
          badge={avgStockRoi >= 25 ? 'HIỆU SUẤT TỐT' : 'CẦN TỐI ƯU'}
        />
        <KPICard
          title="Phân Nhóm Sản Phẩm"
          value={`${rankCounts.STAR} Star • ${rankCounts.CASH_COW} Cow`}
          subtitle={`${rankCounts.QUESTION_MARK} Dấu hỏi • ${rankCounts.DOG} Chậm luân chuyển`}
        />
      </div>

      {/* LEVEL 2: Visual Scatter Matrix (Volume vs Margin) */}
      <AnalyticsCard
        title="Ma Trận Danh Mục Sản Phẩm"
        subtitle="Phân loại 4 nhóm BCG: Ngôi sao (Star), Bò sữa (Cash Cow), Dấu hỏi (Question Mark), Chậm (Dog)"
        badge="MA TRẬN BCG MÔ PHỎNG"
      >
        <div className="space-y-4">
          <div className="w-full">
            <ScatterBubbleChart
              data={filteredSkus}
              height={300}
              filterName={selectedRank !== 'all' ? RANK_BADGES[selectedRank]?.label : undefined}
              onResetFilter={() => setSelectedRank('all')}
              onSelectSku={(skuCode) => {
                const found = skus.find(s => s.sku === skuCode);
                if (found) setDrawerSku(found);
              }}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-ink-100 text-xs">
            <div
              onClick={() => setSelectedRank(selectedRank === 'STAR' ? 'all' : 'STAR')}
              className={cn(
                'p-2.5 rounded-xl border transition-all cursor-pointer',
                selectedRank === 'STAR' ? 'border-amber-400 bg-amber-50/70 shadow-2xs' : 'border-ink-200 bg-white hover:border-ink-300'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900">🌟 Ngôi Sao ({rankCounts.STAR})</span>
                <span className="badge bg-amber-200 text-amber-900 border-amber-300 text-[10px] font-bold">Priority</span>
              </div>
              <p className="text-[11px] text-ink-500 mt-0.5">Biên cao ≥ 30% & Bán chạy. Cần duy trì tồn kho không để đứt hàng.</p>
            </div>

            <div
              onClick={() => setSelectedRank(selectedRank === 'CASH_COW' ? 'all' : 'CASH_COW')}
              className={cn(
                'p-2.5 rounded-xl border transition-all cursor-pointer',
                selectedRank === 'CASH_COW' ? 'border-emerald-400 bg-emerald-50/70 shadow-2xs' : 'border-ink-200 bg-white hover:border-ink-300'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900">🐄 Bò Sữa ({rankCounts.CASH_COW})</span>
                <span className="badge bg-emerald-200 text-emerald-900 border-emerald-300 text-[10px] font-bold">Stable</span>
              </div>
              <p className="text-[11px] text-ink-500 mt-0.5">Doanh số cao, biên ổn định. Nguồn tiền mặt đều đặn cho doanh nghiệp.</p>
            </div>

            <div
              onClick={() => setSelectedRank(selectedRank === 'QUESTION_MARK' ? 'all' : 'QUESTION_MARK')}
              className={cn(
                'p-2.5 rounded-xl border transition-all cursor-pointer',
                selectedRank === 'QUESTION_MARK' ? 'border-blue-400 bg-blue-50/70 shadow-2xs' : 'border-ink-200 bg-white hover:border-ink-300'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900">❓ Dấu Hỏi ({rankCounts.QUESTION_MARK})</span>
                <span className="badge bg-blue-200 text-blue-900 border-blue-300 text-[10px] font-bold">Potential</span>
              </div>
              <p className="text-[11px] text-ink-500 mt-0.5">Biên lãi tốt nhưng sản lượng thấp. Cần đẩy mạnh Ads hoặc tối ưu hiển thị.</p>
            </div>

            <div
              onClick={() => setSelectedRank(selectedRank === 'DOG' ? 'all' : 'DOG')}
              className={cn(
                'p-2.5 rounded-xl border transition-all cursor-pointer',
                selectedRank === 'DOG' ? 'border-rose-400 bg-rose-50/70 shadow-2xs' : 'border-ink-200 bg-white hover:border-ink-300'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-900">⚠️ Chậm ({rankCounts.DOG})</span>
                <span className="badge bg-rose-200 text-rose-900 border-rose-300 text-[10px] font-bold">Risk</span>
              </div>
              <p className="text-[11px] text-ink-500 mt-0.5">Biên thấp, bán chậm, đọng vốn. Cần xả hàng thu hồi tiền mặt.</p>
            </div>
          </div>
        </div>
      </AnalyticsCard>

      {/* LEVEL 3: Granular Data Grid without Inline Jump */}
      <HierarchicalDataGrid
        data={filteredSkus}
        groups={columnGroups}
        rowKey={s => s.sku}
        storageKey="sku_economics"
        selectable
        onRowClick={(sku) => setDrawerSku(sku)}
        bulkActions={(selectedIds, clearSelection) => {
          const selectedItems = filteredSkus.filter(s => selectedIds.includes(s.sku));
          const totalVal = selectedItems.reduce((acc, s) => acc + s.stockValue, 0);
          return (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-300 hidden md:inline">
                Giá trị tồn chọn: {formatCurrency(totalVal)}
              </span>
              <button
                onClick={() => {
                  const csvRows = [
                    ['SKU', 'Tên sản phẩm', 'Phân hạng', 'Giá ASP', 'Giá vốn MAC', 'Lượt bán', 'Doanh thu', 'Lãi gộp CM', 'Giá hòa vốn', 'Giá trị tồn'],
                    ...selectedItems.map(s => [
                      s.sku, s.name, s.contributionRank, s.asp, s.cogs, s.unitsSold, s.totalRevenue, s.cm2, s.breakEvenPrice, s.stockValue
                    ])
                  ];
                  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.map(e => e.join(',')).join('\n');
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', `SKU_Economics_Selected_${Date.now()}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  clearSelection();
                }}
                className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1 cursor-pointer transition-colors text-xs"
              >
                <Download size={13} />
                <span>Xuất Phân Tích SKU</span>
              </button>
            </div>
          );
        }}
        searchPlaceholder="Tìm kiếm mã SKU hoặc tên sản phẩm..."
        searchFilter={(s, q) =>
          s.sku.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q)
        }
        filterControls={
          <select
            value={selectedRank}
            onChange={(e) => setSelectedRank(e.target.value)}
            className="input text-xs py-1.5 px-2.5 bg-white border border-ink-200 cursor-pointer"
          >
            <option value="all">Tất cả phân nhóm ({rankCounts.all})</option>
            <option value="STAR">🌟 Ngôi sao (Star) ({rankCounts.STAR})</option>
            <option value="CASH_COW">🐄 Bò sữa (Cash Cow) ({rankCounts.CASH_COW})</option>
            <option value="QUESTION_MARK">❓ Dấu hỏi (Question Mark) ({rankCounts.QUESTION_MARK})</option>
            <option value="DOG">⚠️ Chậm luân chuyển (Dog) ({rankCounts.DOG})</option>
          </select>
        }
        emptyState={
          <div className="p-8 text-center space-y-3">
            <p className="text-xs text-ink-500 font-medium">
              Không tìm thấy sản phẩm nào thuộc phân nhóm{' '}
              <strong className="text-ink-900">{RANK_BADGES[selectedRank]?.label || selectedRank}</strong>
              {selectedRank === 'STAR' && ' (Tiêu chí: Biên CM ≥ 30% và Sản lượng bán ≥ 10 cái)'}.
            </p>
            <button
              onClick={() => setSelectedRank('all')}
              className="btn btn-secondary text-xs py-1.5 px-3 font-bold text-brand-700 border-brand-300 hover:bg-brand-50 cursor-pointer"
            >
              Xem tất cả SKU ({rankCounts.all})
            </button>
          </div>
        }
        renderMobileCard={(sku) => {
          const rank = RANK_BADGES[sku.contributionRank] || RANK_BADGES.STAR;

          return (
            <div
              onClick={() => setDrawerSku(sku)}
              className="p-3.5 rounded-xl border border-ink-200 bg-white space-y-2.5 shadow-2xs hover:border-brand-300 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-ink-900">{sku.sku}</span>
                <span className={cn('badge text-[9px] px-1 py-0 font-semibold', rank.color)}>
                  {rank.label}
                </span>
              </div>
              <p className="text-xs text-ink-700 font-medium truncate">{sku.name}</p>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-ink-100">
                <div>
                  <span className="text-[10px] text-ink-400 block">Giá bán ASP:</span>
                  <strong>{formatCurrency(sku.asp)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block">Biên CM%:</span>
                  <span className="badge bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                    {sku.cmPercent.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block">Tồn vật lý:</span>
                  <span>{sku.physicalStock} cái</span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-400 block">Tổng lãi 30D:</span>
                  <strong className="text-emerald-800">{formatCurrency(sku.totalContribution)}</strong>
                </div>
              </div>
              <div className="pt-2 border-t border-ink-100 flex items-center justify-between">
                <span className="text-[11px] text-brand-600 font-semibold flex items-center gap-1">
                  <ReceiptText size={12} />
                  <span>Xem Bóc Tách SKU Chi Tiết &rarr;</span>
                </span>
              </div>
            </div>
          );
        }}
      />

      {/* Slide-over Drilldown Drawer (Enterprise Standard Inspection) */}
      <SkuPnLDrawer
        sku={drawerSku}
        skuList={filteredSkus}
        inv5={inv5}
        onClose={() => setDrawerSku(null)}
        onSelectSku={(nextSku) => setDrawerSku(nextSku)}
        onNavigate={onNavigate}
      />
    </div>
  );
}

// =========================================================================
// SLIDE-OVER DRILLDOWN DRAWER: BÓC TÁCH KINH TẾ & TỒN KHO 5 TRẠNG THÁI SKU
// =========================================================================
interface SkuPnLDrawerProps {
  sku: SkuUnitEconomics | null;
  skuList: SkuUnitEconomics[];
  inv5: any[];
  onClose: () => void;
  onSelectSku: (sku: SkuUnitEconomics) => void;
  onNavigate?: (pageId: string) => void;
}

function SkuPnLDrawer({
  sku,
  skuList,
  inv5,
  onClose,
  onSelectSku,
  onNavigate,
}: SkuPnLDrawerProps) {
  const currentIndex = useMemo(() => {
    if (!sku) return -1;
    return skuList.findIndex(s => s.sku === sku.sku);
  }, [sku, skuList]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < skuList.length - 1;

  // Arrow key continuous audit navigation
  useEffect(() => {
    if (!sku) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev) {
        onSelectSku(skuList[currentIndex - 1]);
      } else if (e.key === 'ArrowRight' && hasNext) {
        onSelectSku(skuList[currentIndex + 1]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sku, currentIndex, hasPrev, hasNext, skuList, onSelectSku]);

  if (!sku) return null;

  const inv = inv5.find(i => i.sku === sku.sku);
  const rank = RANK_BADGES[sku.contributionRank] || RANK_BADGES.STAR;

  return (
    <Drawer
      open={Boolean(sku)}
      onClose={onClose}
      title={`Bóc Tách Kinh Tế & Tồn Kho: ${sku.sku}`}
      subtitle={`${sku.name} • Danh mục: ${sku.category}`}
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => hasPrev && onSelectSku(skuList[currentIndex - 1])}
              disabled={!hasPrev}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="SKU trước đó (Phím mũi tên trái ←)"
            >
              <ChevronLeft size={14} />
              <span>SKU trước</span>
            </button>
            <span className="text-xs text-ink-500 font-medium px-1">
              {currentIndex + 1} / {skuList.length}
            </span>
            <button
              onClick={() => hasNext && onSelectSku(skuList[currentIndex + 1])}
              disabled={!hasNext}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="SKU kế tiếp (Phím mũi tên phải →)"
            >
              <span>SKU sau</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <button
            onClick={onClose}
            className="btn btn-primary text-xs py-1.5 px-4 cursor-pointer shadow-xs"
          >
            Đóng bảng
          </button>
        </div>
      }
    >
      <div className="space-y-6 text-xs font-sans">
        {/* 1. Identity Badges & Fast Navigation */}
        <div className="flex items-center justify-between flex-wrap gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 text-sm">
              {sku.sku}
            </span>
            <span className={cn('badge text-[10px] px-2 py-0.5 font-bold border rounded-md', rank.color)}>
              {rank.label}
            </span>
            {sku.barcode && (
              <span className="badge text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md">
                Barcode: {sku.barcode}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onNavigate && (
              <>
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('pricingCalculator');
                  }}
                  className="btn btn-primary text-xs py-1 px-2.5 flex items-center gap-1"
                >
                  <Calculator size={12} />
                  <span>Mô Phỏng Giá</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('inventory');
                  }}
                  className="btn btn-secondary text-xs py-1 px-2.5 text-ink-700 flex items-center gap-1"
                >
                  <Boxes size={12} />
                  <span>Xem Tồn Kho</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 2. 3-Tier Margin Quick Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">Lãi CM / Cái</span>
            <span className={cn(
              'text-lg font-bold block',
              ((sku.contributionMarginPerUnit ?? sku.cmPerUnit ?? 0)) >= 0 ? 'text-brand-900' : 'text-rose-600'
            )}>
              {formatCurrency(sku.contributionMarginPerUnit ?? sku.cmPerUnit ?? 0)}
            </span>
            <span className="text-[10px] text-slate-400">
              Biên CM: <strong className="text-slate-700">{sku.cmPercent.toFixed(1)}%</strong>
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-amber-800 block">Giá Hòa Vốn (Zero CM2)</span>
            <span className="text-lg font-bold text-amber-950 block">
              {formatCurrency(sku.breakEvenPrice)}
            </span>
            <span className="text-[10px] text-amber-700/80">Ngưỡng sàn + chi phí WMS</span>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs space-y-1">
            <span className="text-[11px] font-semibold text-emerald-800 block">Tổng Lãi 30 Ngày</span>
            <span className="text-lg font-bold text-emerald-950 block">
              {formatCurrency(sku.totalContribution)}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">
              Đã bán {sku.unitsSold} cái ({formatCurrency(sku.totalRevenue)})
            </span>
          </div>
        </div>

        {/* 3. Section: Ngưỡng Hòa Vốn & Trí Tuệ Định Giá (Pricing Intelligence) */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <Calculator size={14} className="text-brand-600" />
              <span>Ngưỡng An Toàn & Trí Tuệ Định Giá Bán (Pricing Economics)</span>
            </h3>
            <span className="text-[10px] text-slate-400">Đơn vị: VNĐ</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 text-slate-700">
              <span>Giá niêm yết bán hiện tại (ASP):</span>
              <strong className="text-slate-900">{formatCurrency(sku.asp)}</strong>
            </div>

            <div className="flex items-center justify-between py-1 text-slate-600 bg-slate-50 px-2 rounded">
              <span>Giá vốn hàng bán MAC (Moving Avg Cost):</span>
              <span className="text-rose-700 font-semibold">-{formatCurrency(sku.cogs)}</span>
            </div>

            <div className="flex items-center justify-between py-1 text-slate-600 bg-slate-50 px-2 rounded">
              <span>Phí sàn TMĐT & Chi phí đóng gói WMS ước tính:</span>
              <span className="text-rose-700 font-semibold">
                -{formatCurrency(sku.asp - sku.cogs - (sku.contributionMarginPerUnit ?? sku.cmPerUnit ?? 0))}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 px-2 bg-amber-50 rounded border border-amber-200 text-amber-900 font-bold">
              <span>Giá hòa vốn tuyệt đối (Zero CM2 Floor):</span>
              <span className="text-sm">{formatCurrency(sku.breakEvenPrice)}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 px-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-900 font-bold">
              <span>Mức chiết khấu / Voucher tối đa cho phép:</span>
              <span className="text-sm">
                {formatCurrency(Math.max(0, sku.asp - sku.breakEvenPrice))}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">
              💡 <em>Lưu ý nghiệp vụ:</em> Bất kỳ chiến dịch Flash Sale hoặc trợ giá Voucher vượt quá mức{' '}
              <strong>{formatCurrency(Math.max(0, sku.asp - sku.breakEvenPrice))}</strong> sẽ khiến đơn hàng bị âm lợi nhuận đóng góp biến đổi (CM2 &lt; 0).
            </p>
          </div>
        </div>

        {/* 4. Section: Trạng Thái Tồn Kho 5 Cấp & Vận Tốc Bán */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <Boxes size={14} className="text-brand-600" />
              <span>Hiện Trạng Kho Vận 5 Trạng Thái & Vốn Đọng (Kho Tổng Miền Bắc)</span>
            </h3>
            <span className="text-[10px] text-slate-400">DIO: {sku.daysOfInventory} ngày</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
              <span className="text-[10px] text-emerald-800 font-semibold block mb-0.5">Khả dụng:</span>
              <strong className="text-emerald-900 text-sm">{inv?.sellable ?? sku.physicalStock} cái</strong>
            </div>

            <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200">
              <span className="text-[10px] text-blue-800 font-semibold block mb-0.5">Đang giữ đơn:</span>
              <strong className="text-blue-900 text-sm">{inv?.reserved ?? 0} cái</strong>
            </div>

            <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-200">
              <span className="text-[10px] text-rose-800 font-semibold block mb-0.5">Cách ly QC / Lỗi:</span>
              <strong className="text-rose-900 text-sm">{inv?.unavailable ?? 0} cái</strong>
            </div>

            <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200">
              <span className="text-[10px] text-indigo-800 font-semibold block mb-0.5">Hàng đang về PO:</span>
              <strong className="text-indigo-900 text-sm">{inv?.incoming ?? 0} cái</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Tổng vốn tồn kho:</span>
              <strong className="text-slate-900">{formatCurrency(sku.stockValue)}</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Tốc độ quay vòng (DIO):</span>
              <span className={cn('badge text-[10px] font-bold', sku.daysOfInventory > 60 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800')}>
                {sku.daysOfInventory} ngày tồn
              </span>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
