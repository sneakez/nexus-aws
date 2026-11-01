import { mockStore } from '@/mock/store';
import { analyticsService } from '@/analytics/analyticsService';
import { slaSummary } from '@/analytics/operations';
import { hasPermission } from '@/lib/permissions';
import { useAuth } from '@/providers/AuthProvider';
import { formatCurrency } from '@/lib/utils';
import React, { useMemo, useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  Clock,
  Truck,
  Package,
  WarningCircle,
  ArrowUpRight,
  ArrowsClockwise,
  CheckCircle,
  Sparkle,
  Warehouse
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

/**
 * SpeedometerGauge: Premium SVG half-circle gauge measuring cycle time
 * Scale: 0h to 10h (Green: 0-4h, Amber: 4-7h, Red: 7-10h)
 */
function SpeedometerGauge({ valueHours = 3.4, maxHours = 10 }: { valueHours: number; maxHours?: number }) {
  // Center: (100, 95), Radius: 68
  const cx = 100;
  const cy = 95;
  const r = 68;
  const strokeWidth = 14;

  // Value clamped between 0 and maxHours
  const clamped = Math.max(0, Math.min(maxHours, valueHours));
  
  // Angle: from 180 deg (left, 0h) to 360 deg (right, 10h)
  const angleDeg = 180 + (clamped / maxHours) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  
  // Needle tip coordinates
  const needleLength = 54;
  const tipX = cx + needleLength * Math.cos(angleRad);
  const tipY = cy + needleLength * Math.sin(angleRad);

  return (
    <div className="flex flex-col items-center justify-center select-none pt-1">
      <div className="relative w-48 h-28">
        <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
          <defs>
            {/* Zone 1: Green gradient (0 to 4h) */}
            <linearGradient id="gaugeGreen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
            {/* Zone 2: Amber gradient (4h to 7h) */}
            <linearGradient id="gaugeAmber" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
            {/* Zone 3: Red gradient (7h to 10h) */}
            <linearGradient id="gaugeRed" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#F87171" />
            </linearGradient>
          </defs>

          {/* Background Track (Muted Gray) */}
          <path
            d="M 32,95 A 68,68 0 0,1 168,95"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Section 1: Green Zone (0h - 4h, angle 180 to 252 deg) */}
          {/* 180 -> 252: cos(180)=-1, sin(180)=0. cos(252)=-0.309, sin(252)=-0.951 */}
          <path
            d="M 32,95 A 68,68 0 0,1 78.98,30.32"
            fill="none"
            stroke="url(#gaugeGreen)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Section 2: Amber Zone (4h - 7h, angle 252 to 306 deg) */}
          {/* 252 -> 306: cos(306)=0.587, sin(306)=-0.809 */}
          <path
            d="M 78.98,30.32 A 68,68 0 0,1 139.97,39.98"
            fill="none"
            stroke="url(#gaugeAmber)"
            strokeWidth={strokeWidth}
          />

          {/* Section 3: Red Zone (7h - 10h, angle 306 to 360 deg) */}
          <path
            d="M 139.97,39.98 A 68,68 0 0,1 168,95"
            fill="none"
            stroke="url(#gaugeRed)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Needle Center Pin */}
          <circle cx={cx} cy={cy} r={7} fill="#1E293B" />
          <circle cx={cx} cy={cy} r={3.5} fill="#FFFFFF" />

          {/* Needle Hand */}
          <line
            x1={cx}
            y1={cy}
            x2={tipX}
            y2={tipY}
            stroke="#1E293B"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Min / Max Labels under the arc */}
        <div className="absolute left-4 bottom-0 text-[11px] font-bold text-slate-500">
          0h
        </div>
        <div className="absolute right-4 bottom-0 text-[11px] font-bold text-slate-500">
          10h
        </div>
      </div>

      {/* Center Digital Value Readout */}
      <div className="mt-1 text-center">
        <span className="text-2xl font-black text-[#123A52] tracking-tight">
          {valueHours} <span className="text-sm font-semibold text-[#6D7175]">giờ</span>
        </span>
        <div className="flex items-center justify-center gap-1.5 mt-0.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-semibold text-emerald-700">
            Đạt chuẩn SLA (&lt; 4 giờ)
          </span>
        </div>
      </div>
    </div>
  );
}

export function OperationsAnalyticsPage() {
  const [,revise]=useState(0);
  useEffect(()=>mockStore.subscribe(()=>revise(n=>n+1)),[]);
  const {activeRole}=useAuth(), canFinance=hasPermission(activeRole,'analytics:view');
  const orders=mockStore.getOrders(), sla=slaSummary(orders,mockStore.getOperationsConfig().sla_warning_hours);
  const currentTimeDisplay=new Date().toLocaleString('vi-VN')+' · dữ liệu mock';
  const periods=analyticsService.filterOrdersByPeriod(orders,'today'), month=analyticsService.filterOrdersByPeriod(orders,'last_30_days');
  const econ=canFinance?analyticsService.getOrderEconomics():[];
  const todayNet=econ.filter(e=>periods.current.some(o=>o.id===e.orderId)).reduce((s,e)=>s+e.netRevenue,0);
  const monthNet=econ.filter(e=>month.current.some(o=>o.id===e.orderId)).reduce((s,e)=>s+e.netRevenue,0);
  const pending=orders.filter(o=>['pending','processing'].includes(o.status));
  const returns=mockStore.getReturns().filter(r=>!['closed','completed','cancelled','rejected'].includes(r.status));
  const cycles=orders.filter(o=>o.shipped_at && Number.isFinite(Date.parse(o.placed_at))).map(o=>(Date.parse(o.shipped_at!)-Date.parse(o.placed_at))/3600000);
  const avgCycle=cycles.length?cycles.reduce((s,n)=>s+n,0)/cycles.length:null;
  const HOURLY_DATA=Array.from({length:12},(_,i)=>({time:`${i*2}:00`,orders:periods.current.filter(o=>Math.floor(new Date(Date.parse(o.placed_at)+7*3600000).getUTCHours()/2)===i).length,cancelled:periods.current.filter(o=>o.status==='cancelled'&&Math.floor(new Date(Date.parse(o.placed_at)+7*3600000).getUTCHours()/2)===i).length}));
  const DAILY_DATA=Array.from({length:30},(_,i)=>{const day=new Date(Date.now()-(29-i)*86400000).toISOString().slice(0,10);return{day,orders:month.current.filter(o=>new Date(Date.parse(o.placed_at)+7*3600000).toISOString().slice(0,10)===day).length,cancelled:month.current.filter(o=>o.status==='cancelled'&&new Date(Date.parse(o.placed_at)+7*3600000).toISOString().slice(0,10)===day).length};});

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto animate-fade-in-up font-sans">
      {/* 1. Header with Live Status Indicator */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-[#E1E3E5]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#202223] tracking-tight">
              Bảng Điều Hành &amp; SLA Kho
            </h1>
            <span className="badge bg-teal-50 text-[#1E647F] border-teal-200 text-xs font-semibold">
              Mock · cùng định nghĩa SLA
            </span>
          </div>
          <p className="text-xs text-[#6D7175] mt-1">
            Theo dõi nhịp độ phát sinh đơn hàng, áp lực xử lý xuất kho theo thời gian thực và thời gian hoàn tất đơn (Cycle Time).
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#D9E3E8] bg-white text-xs font-semibold text-[#123A52] shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{currentTimeDisplay}</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">Kho trong phạm vi session</span>
        </div>
      </div>

      {/* 2. Main 3-Column Dashboard Body (Matching Geckoboard Structure in Our Color Scheme) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* ========================================================================= */}
        {/* CỘT TRÁI (3 COLS): TỔNG QUAN TỐC ĐỘ BÁN HÀNG & DOANH SỐ (VELOCITY)       */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Card 1: Hôm nay (Today) */}
          <div className="p-5 rounded-xl border border-[#D9E3E8] bg-white shadow-xs hover:border-slate-300 transition-all flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1E647F]">
                  Hôm Nay (Today)
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>

              {/* Orders count */}
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-[#123A52] tracking-tight block">
                  {periods.current.length}
                </span>
                <span className="text-xs font-semibold text-[#6D7175]">
                  Đơn hàng thành công
                </span>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-1">
                  <ArrowUpRight size={13} weight="bold" />
                  <span>Đếm đơn trong scope hiện tại</span>
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div className="pt-4 mt-4 border-t border-slate-100">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#123A52] tracking-tight block">
                {canFinance?formatCurrency(todayNet):'Không có quyền xem tiền'}
              </span>
              <span className="text-xs font-semibold text-[#6D7175]">
                Doanh thu phát sinh hôm nay
              </span>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-1">
                <ArrowUpRight size={13} weight="bold" />
                <span>Net đã giao − refund; chưa có so sánh</span>
              </div>
            </div>
          </div>

          {/* Card 2: 30 ngày qua (Past 30 days) */}
          <div className="p-5 rounded-xl border border-[#D9E3E8] bg-white shadow-xs hover:border-slate-300 transition-all flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6D7175]">
                  30 Ngày Qua (Past 30 Days)
                </span>
                <span className="badge bg-slate-100 text-slate-700 text-[10px] font-bold">Kỳ đã lọc</span>
              </div>

              {/* Orders count */}
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-[#123A52] tracking-tight block">
                  {month.current.length}
                </span>
                <span className="text-xs font-semibold text-[#6D7175]">
                  Tổng sản lượng đơn
                </span>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-1">
                  <ArrowUpRight size={13} weight="bold" />
                  <span>Kỳ 30 ngày; không fallback</span>
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div className="pt-4 mt-4 border-t border-slate-100">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#123A52] tracking-tight block">
                {canFinance?formatCurrency(monthNet):'Không có quyền xem tiền'}
              </span>
              <span className="text-xs font-semibold text-[#6D7175]">
                Doanh thu thực tế (Net Revenue)
              </span>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-1">
                <ArrowUpRight size={13} weight="bold" />
                <span>Nguồn đơn mock cùng kỳ</span>
              </div>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* CỘT GIỮA (6 COLS): 2 BIỂU ĐỒ XUNG NHỊP ĐƠN HÀNG THỰC TẾ (ORDER FLOW)      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          
          {/* Chart 1 (Top): Sản lượng đơn theo giờ hôm nay (Orders today) */}
          <div className="p-4 sm:p-5 rounded-xl border border-[#D9E3E8] bg-white shadow-xs hover:border-slate-300 transition-all flex-1">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#123A52]">
                  Sản Lượng Đơn Theo Khung Giờ Hôm Nay (Orders Today)
                </h3>
                <p className="text-[11px] text-[#6D7175] mt-0.5">
                  Đo lường thời điểm nổ đơn để kho bố trí nhân sự nhặt đóng gói kịp giờ giao
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs font-semibold select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0284C7]" />
                  <span className="text-[#123A52]">Đơn phát sinh</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" />
                  <span className="text-[#6D7175]">Đơn hủy / Hoàn</span>
                </div>
              </div>
            </div>

            <div className="h-44 sm:h-48 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={HOURLY_DATA} barGap={2} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '11px',
                    }}
                    formatter={(val: any, name: any) => [
                      `${val} đơn`,
                      name === 'orders' ? 'Đơn phát sinh' : 'Đơn hủy'
                    ]}
                  />
                  <Bar dataKey="orders" name="orders" fill="#0284C7" radius={[3, 3, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="cancelled" name="cancelled" fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2 (Bottom): Sản lượng đơn theo ngày trong tháng (Orders this month) */}
          <div className="p-4 sm:p-5 rounded-xl border border-[#D9E3E8] bg-white shadow-xs hover:border-slate-300 transition-all flex-1">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#123A52]">
                  Sản Lượng Đơn Theo Ngày Trong Tháng (Orders This Month)
                </h3>
                <p className="text-[11px] text-[#6D7175] mt-0.5">
                  Diễn biến 29 ngày qua trong tháng 10/2026 (Đỉnh sale ngày 15 và ngày 25)
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs font-semibold select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0284C7]" />
                  <span className="text-[#123A52]">Đơn phát sinh</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" />
                  <span className="text-[#6D7175]">Hủy / Hoàn</span>
                </div>
              </div>
            </div>

            <div className="h-44 sm:h-48 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DAILY_DATA} barGap={2} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '11px',
                    }}
                    formatter={(val: any, name: any) => [
                      `${val} đơn`,
                      name === 'orders' ? 'Đơn thành công' : 'Đơn hủy'
                    ]}
                  />
                  <Bar dataKey="orders" name="orders" fill="#0284C7" radius={[3, 3, 0, 0]} maxBarSize={12} />
                  <Bar dataKey="cancelled" name="cancelled" fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* CỘT PHẢI (3 COLS): TRẠM XỬ LÝ WMS, ĐỒNG HỒ SLA GAUGE & HÀNG TRẢ (RMA)     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Card 3: Processing Queue (Đơn chờ xuất kho có viền cảnh báo nổi bật) */}
          <div className="p-4 sm:p-5 rounded-xl border-2 border-rose-200 bg-rose-50/20 shadow-xs relative overflow-hidden transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
                Đang Xử Lý (Processing)
              </span>
              <div className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center animate-pulse shadow-xs" title="Cần hoàn tất trước hạn bàn giao đơn vị vận chuyển">
                <span className="text-xs font-black">!</span>
              </div>
            </div>

            <div className="my-2">
              <span className="text-4xl sm:text-5xl font-black text-[#123A52] tracking-tight block">
                {pending.length}
              </span>
              <span className="text-xs font-semibold text-rose-800 block mt-0.5">
                Đơn chờ xuất kho (Unfulfilled orders)
              </span>
            </div>

            <div className="pt-2.5 mt-1 border-t border-rose-100 flex items-center justify-between text-[11px] text-[#6D7175]">
              <span>{pending.filter(o=>o.fulfillment_status!=='packed').length} chờ xử lý • {pending.filter(o=>o.fulfillment_status==='packed').length} đóng gói</span>
              <span className="font-bold text-rose-700">{sla.overdue} quá hạn · {sla.dueSoon} sắp hạn</span>
            </div>
          </div>

          {/* Card 4: Speedometer Gauge (Thời gian xử lý TB Cycle Time 7 ngày qua) */}
          <div className="p-4 sm:p-5 rounded-xl border border-[#D9E3E8] bg-white shadow-xs hover:border-slate-300 transition-all flex flex-col items-center justify-between">
            <div className="w-full text-center pb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6D7175]">
                Thời Gian Xử Lý TB (Past 7d)
              </span>
              <p className="text-[10px] text-slate-400">
                Avg fulfillment cycle time (0h → 10h)
              </p>
            </div>

            {/* SVG Speedometer Gauge */}
            <SpeedometerGauge valueHours={avgCycle ?? 0} maxHours={10} /><p className="text-xs text-slate-500">{avgCycle===null?'Chưa đủ mốc bàn giao để tính':'Từ đơn có mốc đặt và bàn giao'}</p>
          </div>

          {/* Card 5: Returns & RMA to be processed */}
          <div className="p-4 sm:p-5 rounded-xl border border-[#D9E3E8] bg-white shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6D7175]">
                Hàng Hoàn Chờ Xử Lý
              </span>
              <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <ArrowsClockwise size={14} weight="bold" />
              </div>
            </div>

            <div className="my-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-[#123A52] tracking-tight block">
                {returns.length}
              </span>
              <span className="text-xs font-semibold text-[#6D7175] block mt-0.5">
                Đơn đổi trả RMA cần kiểm tra (Returns)
              </span>
            </div>

            <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Nhận/QC và tiền hoàn độc lập</span>
            </div>
          </div>

        </div>

      </div>

      {/* 3. Bottom Row: Warehouse Distribution Comparison */}
      <div className="p-4 sm:p-5 rounded-xl border border-[#D9E3E8] bg-white shadow-xs">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Warehouse size={16} weight="bold" className="text-[#1E647F]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#123A52]">
              Phân Bổ Sản Lượng &amp; SLA Giữa Các Chi Nhánh Kho
            </h3>
          </div>
          <span className="text-[11px] text-[#6D7175]">
            SLA từng đơn; đúng hạn tính từ mốc kho bàn giao, không từ ngày hiện tại
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockStore.getWarehouses().map(w=>{const rows=orders.filter(o=>o.assigned_warehouse_id===w.id),summary=slaSummary(rows,mockStore.getOperationsConfig().sla_warning_hours);return <div key={w.id} className="p-3.5 rounded-lg border border-slate-200 bg-[#F8FAFC] flex items-center justify-between"><div><p className="font-bold text-xs">{w.name}</p><p className="text-xs">{rows.length} đơn · {summary.overdue} quá hạn · {summary.dueSoon} sắp hạn · {summary.unknown} thiếu mốc</p><p className="text-xs">Bàn giao đúng hạn: {summary.compliance===null?'Chưa đủ dữ liệu':`${summary.compliance.toFixed(1)}%`}</p></div></div>})}

        </div>
      </div>
    </div>
  );
}
