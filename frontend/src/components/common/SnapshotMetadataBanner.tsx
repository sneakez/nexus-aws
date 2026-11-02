import React, { useState, useRef, useEffect } from 'react';
import { Database, RefreshCw, CheckCircle2, ChevronDown, Info, ShieldCheck, X } from 'lucide-react';
import { mockStore } from '@/mock/store';
import { cn } from '@/lib/cn';

interface SnapshotMetadataBannerProps {
  currentModule: string;
  orderCount?: number;
  dateFilter?: string;
}

export function SnapshotMetadataBanner({
  currentModule,
  orderCount = 12,
  dateFilter = '30 Ngày Qua'
}: SnapshotMetadataBannerProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [revision, setRevision] = useState(mockStore.getStateRevision());
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return mockStore.subscribe(() => {
      setRevision(mockStore.getStateRevision());
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    }
    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopover]);

  const handleConfirmReset = () => {
    setIsResetting(true);
    mockStore.resetToBaseline();
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  return (
    <>
      <div className="py-2 px-3 sm:px-4 rounded-xl bg-ink-900 text-ink-100 border border-ink-800 shadow-xs flex items-center justify-between flex-wrap gap-2 text-xs">
        {/* Left: Summary Essentials */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="badge bg-purple-950 text-purple-300 border-purple-800 text-[10px] font-bold shrink-0">
            DỮ LIỆU ĐỐI SOÁT KIỂM TOÁN
          </span>

          <span className="text-ink-400 hidden sm:inline">•</span>

          <span className="text-ink-300 font-medium text-xs">
            Workspace: <strong className="text-white">tenant_flagship</strong>
          </span>

          <span className="text-ink-400 hidden sm:inline">•</span>

          <span className="text-ink-300 font-medium text-xs">
            Chu kỳ: <strong className="text-amber-300">{dateFilter}</strong> ({orderCount} đơn)
          </span>

          <span className="badge bg-amber-950 text-amber-300 border-amber-800 text-[10px] font-mono font-bold">
            rev {revision}
          </span>
        </div>

        {/* Right: Popover Trigger & Factory Reset */}
        <div className="flex items-center gap-2 relative" ref={popoverRef}>
          {/* Data Details Popover Trigger */}
          <button
            onClick={() => setShowPopover(!showPopover)}
            className="btn btn-secondary text-[11px] py-1 px-2.5 bg-ink-800 hover:bg-ink-700 text-ink-200 border-ink-700 flex items-center gap-1.5 transition-all cursor-pointer font-medium"
            title="Xem chi tiết snapshot và nguồn dữ liệu kiểm toán"
          >
            <Info size={12} className="text-brand-400" />
            <span className="hidden sm:inline">Chi tiết dữ liệu</span>
            <ChevronDown size={11} className={cn('transition-transform', showPopover && 'rotate-180')} />
          </button>

          {/* Details Popover */}
          {showPopover && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-xl bg-[#0F172A] border border-slate-700 shadow-2xl z-50 p-3.5 space-y-2.5 animate-fade-in text-xs font-sans text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                <span className="font-bold text-slate-100 flex items-center gap-1.5">
                  <Database size={13} className="text-brand-400" />
                  Thông Tin Snapshot Kiểm Toán
                </span>
                <span className="badge bg-emerald-950 text-emerald-300 border-emerald-800 text-[9px]">
                  100% MATCH
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px] font-sans">Snapshot ID:</span>
                  <strong className="text-amber-300 break-all">SNAPSHOT-V6.2-20261029-DIGITAL-AUDIT</strong>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-sans">Revision:</span>
                    <strong className="text-white">State rev {revision}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-sans">Seed Version:</span>
                    <strong className="text-white">v6.2.1-clean</strong>
                  </div>
                </div>
                <div className="pt-1">
                  <span className="text-slate-400 block text-[10px] font-sans">Phạm vi kênh bán:</span>
                  <span className="text-cyan-300 font-sans text-xs">Shopee, TikTok Shop, Lazada, D2C Web</span>
                </div>
                <div className="pt-1">
                  <span className="text-slate-400 block text-[10px] font-sans">Mô-đun đang duyệt:</span>
                  <strong className="text-emerald-400 font-sans text-xs">{currentModule}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/80 text-[10px] text-slate-400 flex items-center gap-1.5 font-sans">
                <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                <span>Toàn bộ 12 đơn số liệu đã đối soát cân bằng giữa P&L, Kho và Đối soát kênh.</span>
              </div>
            </div>
          )}

          {/* Factory Reset Button */}
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={isResetting}
            className="btn btn-secondary text-[11px] py-1 px-2.5 bg-ink-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 text-ink-300 border-ink-700 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Khôi phục trạng thái Mock Data về snapshot gốc"
          >
            <RefreshCw size={11} className={isResetting ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Khôi phục ban đầu</span>
            <span className="sm:hidden">Reset</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Factory Reset */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-ink-200 p-5 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <RefreshCw size={20} />
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-ink-900 tracking-tight">Xác nhận khôi phục dữ liệu ban đầu?</h3>
              <p className="text-xs text-ink-500 leading-relaxed">
                Thao tác này sẽ hoàn lại toàn bộ đơn hàng, kho bãi và sổ sách tài chính về trạng thái chuẩn ban đầu.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-100">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn btn-secondary text-xs py-1.5 px-3"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="btn btn-primary text-xs py-1.5 px-3 font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isResetting ? 'Đang khôi phục...' : 'Xác nhận Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
