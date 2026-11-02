import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  Package,
  Boxes,
  FileCheck2,
  DollarSign,
  ShieldCheck,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/cn';

export interface WorkflowStep {
  id: string;
  label: string;
  sublabel?: string;
  status: 'completed' | 'active' | 'pending' | 'blocked';
  timestamp?: string;
  note?: string;
}

interface WorkflowStepVisualizerProps {
  title?: string;
  workflowType: 'order_lifecycle' | 'rma_lifecycle' | 'po_lifecycle';
  currentStatus: string;
  rmaBranch?: string;
  customSteps?: WorkflowStep[];
  onActionClick?: (actionId: string) => void;
  actionButton?: {
    label: string;
    actionId: string;
    variant?: 'primary' | 'secondary' | 'warning';
  };
  className?: string;
}

export function WorkflowStepVisualizer({
  title,
  workflowType,
  currentStatus,
  rmaBranch,
  customSteps,
  onActionClick,
  actionButton,
  className
}: WorkflowStepVisualizerProps) {
  // Generate steps based on workflow type and branch if customSteps is not provided
  const steps: WorkflowStep[] = customSteps || getWorkflowSteps(workflowType, currentStatus, rmaBranch);
  const resolvedTitle = title || getWorkflowTitle(workflowType, rmaBranch);

  return (
    <div className={cn('p-3.5 sm:p-4 rounded-xl bg-ink-900 text-white border border-ink-800 shadow-sm space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
          <h4 className="text-xs sm:text-sm font-bold text-ink-100 uppercase tracking-wide">
            {resolvedTitle}
          </h4>
        </div>

        {actionButton && onActionClick && (
          <button
            onClick={() => onActionClick(actionButton.actionId)}
            className="btn btn-primary text-xs py-1 px-2.5 flex items-center gap-1 shadow-sm font-medium"
          >
            <span>{actionButton.label}</span>
            <ArrowRight size={12} />
          </button>
        )}
      </div>

      {/* Horizontal Stepper (Desktop/Tablet) with dynamic columns */}
      <div
        className="hidden md:grid gap-2 pt-1"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((step, idx) => {
          const isCompleted = step.status === 'completed';
          const isActive = step.status === 'active';
          const isBlocked = step.status === 'blocked';

          return (
            <div key={step.id} className="relative flex flex-col space-y-1.5">
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute top-3 left-1/2 w-full h-0.5 -z-0 transition-colors',
                    isCompleted ? 'bg-emerald-500' : 'bg-ink-800'
                  )}
                />
              )}

              {/* Step Icon Node */}
              <div className="relative z-10 flex items-center justify-center">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs',
                    isCompleted && 'bg-emerald-500 text-white shadow-emerald-500/20',
                    isActive && 'bg-brand-500 text-white ring-4 ring-brand-500/20 shadow-brand-500/30',
                    isBlocked && 'bg-rose-500 text-white ring-4 ring-rose-500/20',
                    step.status === 'pending' && 'bg-ink-800 text-ink-400 border border-ink-700'
                  )}
                >
                  {isCompleted ? <CheckCircle2 size={12} /> : idx + 1}
                </div>
              </div>

              {/* Step Text */}
              <div className="text-center pt-0.5">
                <span
                  className={cn(
                    'block text-[11px] font-bold leading-tight truncate',
                    isActive && 'text-brand-300 font-extrabold',
                    isCompleted && 'text-ink-200',
                    step.status === 'pending' && 'text-ink-400'
                  )}
                  title={step.label}
                >
                  {step.label}
                </span>
                {step.sublabel && (
                  <span className="block text-[9px] text-ink-400 truncate mt-0.5 font-mono">
                    {step.sublabel}
                  </span>
                )}
                {step.timestamp && (
                  <span className="block text-[8px] text-ink-400 font-mono mt-0.5">
                    {step.timestamp}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact Horizontal Scroll for Mobile */}
      <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
        {steps.map((step, idx) => {
          const isCompleted = step.status === 'completed';
          const isActive = step.status === 'active';

          return (
            <div
              key={step.id}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all',
                isActive && 'bg-brand-950 border-brand-500 text-brand-300 font-bold',
                isCompleted && 'bg-emerald-950/70 border-emerald-800 text-emerald-300',
                step.status === 'pending' && 'bg-ink-800/80 border-ink-700 text-ink-400'
              )}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-ink-900 shrink-0 font-bold">
                {isCompleted ? '✓' : idx + 1}
              </span>
              <span className="truncate max-w-[110px]">{step.label}</span>
              {idx < steps.length - 1 && <ChevronRight size={12} className="text-ink-400 ml-0.5" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getWorkflowTitle(type: 'order_lifecycle' | 'rma_lifecycle' | 'po_lifecycle', rmaBranch?: string): string {
  switch (type) {
    case 'order_lifecycle':
      return 'Tiến Trình 6 Chặng Vận Hành Đơn Hàng & POD Gate';
    case 'rma_lifecycle': {
      if (rmaBranch === 'returnless_refund') return 'Tiến Trình Hoàn Tiền Không Thu Hồi (Bỏ Qua Nhận Kho & QC)';
      if (rmaBranch === 'exchange') return 'Tiến Trình Đổi Hàng Mới & Xuất Đơn Bù Thay Thế';
      if (rmaBranch === 'warranty') return 'Tiến Trình Bảo Hành / Sửa Chữa Thiết Bị Kỹ Thuật';
      if (rmaBranch === 'transit_damage') return 'Tiến Trình Xử Lý Hàng Vỡ Vận Chuyển & Khiếu Nại Bưu Tá';
      return 'Tiến Trình Đổi Trả RMA Tiêu Chuẩn & Kiểm Định QC (Maker/Checker)';
    }
    case 'po_lifecycle':
      return 'Tiến Trình Mua Hàng PO & Kiểm Định Nhập Kho Dock';
  }
}

function getWorkflowSteps(
  type: 'order_lifecycle' | 'rma_lifecycle' | 'po_lifecycle',
  status: string,
  rmaBranch?: string
): WorkflowStep[] {
  if (type === 'order_lifecycle') {
    const s = status.toLowerCase();
    const isPlaced = true;
    const isReserved = ['processing', 'picking', 'picked', 'shipped', 'delivered'].includes(s);
    const isPicked = ['picking', 'picked', 'shipped', 'delivered'].includes(s);
    const isDispatched = ['shipped', 'delivered'].includes(s);
    const isDelivered = s === 'delivered';
    const isSettled = s === 'delivered';

    return [
      { id: 'placed', label: '1. Đặt Đơn', sublabel: 'Khách xác nhận', status: isPlaced ? (isReserved ? 'completed' : 'active') : 'pending' },
      { id: 'reserved', label: '2. Giữ Tồn', sublabel: 'Khóa Sellable', status: isReserved ? (isPicked ? 'completed' : 'active') : 'pending' },
      { id: 'picking', label: '3. Pick/Pack', sublabel: 'Nhặt & đóng gói', status: isPicked ? (isDispatched ? 'completed' : 'active') : 'pending' },
      { id: 'shipped', label: '4. Bàn Giao', sublabel: 'Giao bưu tá', status: isDispatched ? (isDelivered ? 'completed' : 'active') : 'pending' },
      { id: 'delivered', label: '5. Ký POD', sublabel: 'Giao thành công', status: isDelivered ? (isSettled ? 'completed' : 'active') : 'pending' },
      { id: 'settled', label: '6. Đối Soát', sublabel: 'Ghi nhận Có 511', status: isSettled ? 'completed' : 'pending' }
    ];
  }

  if (type === 'rma_lifecycle') {
    const s = status.toLowerCase();
    const branch = rmaBranch || 'refund';

    // 1. Returnless Refund: Skip receiving and QC
    if (branch === 'returnless_refund') {
      const isApproved = ['approved', 'qc_passed', 'refunded'].includes(s);
      const isRefunded = s === 'refunded';

      return [
        { id: 'req', label: '1. Yêu Cầu', sublabel: 'Khách tạo RMA', status: 'completed' },
        { id: 'waive', label: '2. Miễn Thu Hồi', sublabel: '⚡ Bỏ qua kho & QC', status: 'completed' },
        { id: 'appr', label: '3. Phê Duyệt', sublabel: 'Maker/Checker', status: isApproved ? (isRefunded ? 'completed' : 'active') : 'active' },
        { id: 'ref', label: '4. Hoàn Tiền Ngay', sublabel: 'Không đợi kiện về', status: isRefunded ? 'completed' : 'pending' }
      ];
    }

    // 2. Exchange: Replace with new item
    if (branch === 'exchange') {
      const isReceived = ['received', 'quality_check', 'qc_passed', 'qc_failed', 'refunded'].includes(s);
      const isQC = ['quality_check', 'qc_passed', 'qc_failed', 'refunded'].includes(s);
      const isApproved = ['qc_passed', 'refunded'].includes(s);
      const isDispatched = s === 'refunded';

      return [
        { id: 'req', label: '1. Đổi Hàng', sublabel: 'Khách chọn mẫu', status: 'completed' },
        { id: 'recv', label: '2. Thu Hồi Kiện', sublabel: 'Bưu tá lấy hàng', status: isReceived ? (isQC ? 'completed' : 'active') : 'pending' },
        { id: 'qc', label: '3. Kiểm Định QC', sublabel: 'Đạt điều kiện đổi', status: isQC ? (isApproved ? 'completed' : 'active') : 'pending' },
        { id: 'appr', label: '4. Duyệt Xuất Đổi', sublabel: 'Lệnh xuất hàng bù', status: isApproved ? (isDispatched ? 'completed' : 'active') : 'pending' },
        { id: 'disp', label: '5. Giao Hàng Mới', sublabel: 'Tạo đơn bù mới', status: isDispatched ? 'completed' : 'pending' }
      ];
    }

    // 3. Warranty / Repair
    if (branch === 'warranty') {
      const isReceived = ['received', 'quality_check', 'qc_passed', 'qc_failed', 'refunded'].includes(s);
      const isQC = ['quality_check', 'qc_passed', 'qc_failed', 'refunded'].includes(s);
      const isRepaired = ['qc_passed', 'refunded'].includes(s);
      const isCompleted = s === 'refunded';

      return [
        { id: 'req', label: '1. Tiếp Nhận BH', sublabel: 'Ghi nhận Serial', status: 'completed' },
        { id: 'recv', label: '2. Nhận Thiết Bị', sublabel: 'Kiểm tra ngoại quan', status: isReceived ? (isQC ? 'completed' : 'active') : 'pending' },
        { id: 'diag', label: '3. Giám Định Lỗi', sublabel: 'Kỹ thuật test lỗi', status: isQC ? (isRepaired ? 'completed' : 'active') : 'pending' },
        { id: 'repair', label: '4. Sửa Chữa', sublabel: 'Linh kiện chính hãng', status: isRepaired ? (isCompleted ? 'completed' : 'active') : 'pending' },
        { id: 'handover', label: '5. Bàn Giao Khách', sublabel: 'Xuất trả kèm bảo hành', status: isCompleted ? 'completed' : 'pending' }
      ];
    }

    // 4. Transit Damage (Scrap)
    if (branch === 'transit_damage') {
      const isClaimed = true;
      const isScrapped = ['received', 'quality_check', 'qc_passed', 'qc_failed', 'refunded'].includes(s);
      const isApproved = ['qc_passed', 'qc_failed', 'refunded'].includes(s);
      const isSettled = s === 'refunded';

      return [
        { id: 'req', label: '1. Báo Hỏng Ship', sublabel: 'Kiện vỡ khi giao', status: 'completed' },
        { id: 'courier', label: '2. Biên Bản Bưu Tá', sublabel: 'Xác nhận ĐVVC', status: isClaimed ? (isScrapped ? 'completed' : 'active') : 'pending' },
        { id: 'scrap', label: '3. Kho Damaged', sublabel: 'Cách ly phế phẩm', status: isScrapped ? (isApproved ? 'completed' : 'active') : 'pending' },
        { id: 'appr', label: '4. Duyệt Bồi Thường', sublabel: 'Hồ sơ bảo hiểm sàn', status: isApproved ? (isSettled ? 'completed' : 'active') : 'pending' },
        { id: 'ref', label: '5. Chi Bồi Hoàn', sublabel: 'Hoàn tiền khách', status: isSettled ? 'completed' : 'pending' }
      ];
    }

    // 5. Standard Refund (Default)
    const isReceived = ['received', 'quality_check', 'qc_passed', 'qc_failed', 'refunded'].includes(s);
    const isQC = ['quality_check', 'qc_passed', 'qc_failed', 'refunded'].includes(s);
    const isApproved = ['qc_passed', 'refunded'].includes(s);
    const isRefunded = s === 'refunded';

    return [
      { id: 'req', label: '1. Yêu Cầu Hoàn', sublabel: 'Khách tạo RMA', status: 'completed' },
      { id: 'recv', label: '2. Nhận Hàng Kho', sublabel: 'Kiện về dock', status: isReceived ? (isQC ? 'completed' : 'active') : 'pending' },
      { id: 'qc', label: '3. Kiểm Định QC', sublabel: 'Restock / Scrap', status: isQC ? (isApproved ? 'completed' : 'active') : 'pending' },
      { id: 'appr', label: '4. Phê Duyệt', sublabel: 'Maker/Checker', status: isApproved ? (isRefunded ? 'completed' : 'active') : 'pending' },
      { id: 'ref', label: '5. Quyết Toán Tiền', sublabel: 'Ghi Có 111/112', status: isRefunded ? 'completed' : 'pending' }
    ];
  }

  // PO Lifecycle
  return [
    { id: 'po_draft', label: '1. Tạo PO', sublabel: 'Dự thảo đặt hàng', status: 'completed' },
    { id: 'po_appr', label: '2. Phê Duyệt', sublabel: 'Ký gửi NCC', status: 'completed' },
    { id: 'po_transit', label: '3. Vận Chuyển', sublabel: 'Incoming Stock', status: 'completed' },
    { id: 'po_dock', label: '4. Cập Bến', sublabel: 'Pending QC Dock', status: 'completed' },
    { id: 'po_qc', label: '5. Kiểm Định', sublabel: 'QC Inbound', status: 'active' },
    { id: 'po_shelf', label: '6. Lên Kệ', sublabel: 'Tồn Sellable', status: 'pending' }
  ];
}
