import { useState } from 'react';
import { 
  ShoppingCart, 
  CheckCircle2, 
  Lock, 
  CheckSquare, 
  Barcode, 
  Truck, 
  Calculator 
} from 'lucide-react';

export function RealWorkflowSection({ onNavigate }: { onNavigate?: (path: string) => void } = {}) {
  const [activeStep, setActiveStep] = useState<number>(2); // Default to Step 3: Giữ tồn

  const steps = [
    {
      id: 0,
      label: 'Khách Đặt Hàng',
      actor: 'Khách Hàng / Sàn TMĐT',
      icon: ShoppingCart,
      title: 'Đơn Hàng Khởi Tạo Từ Đa Sàn',
      desc: 'Khách hàng đặt hàng qua Shopee, TikTok Shop, Lazada hoặc Website D2C. Webhook gửi tín hiệu về cổng tích hợp của NexusOMS.',
      actionDetail: 'Webhook Ingestion với mã định danh Idempotency Key duy nhất.',
      systemState: 'Status: Pending (Chờ xác nhận)',
      ledgerImpact: 'Chưa phát sinh bút toán tài chính.',
      stockImpact: 'Chưa trừ tồn kho (Đang chờ xử lý giao dịch).'
    },
    {
      id: 1,
      label: 'Xác Nhận',
      actor: 'Động Cơ Định Tuyến OMS',
      icon: CheckCircle2,
      title: 'Kiểm Tra Chống Trùng & Định Tuyến Kho',
      desc: 'Hệ thống kiểm tra Idempotency Key để đảm bảo không nhận đơn trùng, sau đó phân tích địa chỉ nhận hàng để chọn kho gần nhất.',
      actionDetail: 'Chống duplicate webhook 100%, gán kho xuất hàng tối ưu phí ship.',
      systemState: 'Status: Processing (Đã duyệt định tuyến)',
      ledgerImpact: 'Khởi tạo bản ghi quản lý đơn hàng.',
      stockImpact: 'Kiểm tra sẵn sàng: Physical stock >= Order quantity.'
    },
    {
      id: 2,
      label: 'Giữ Tồn Kho',
      actor: 'PostgreSQL Atomic Engine',
      icon: Lock,
      title: 'Khóa Tồn Kho Nguyên Tử (Atomic Lock)',
      desc: 'Hàm RPC place_order_atomic thực thi trong một transaction duy nhất: khóa hàng bằng SELECT FOR UPDATE, chuyển hàng từ Available sang Reserved.',
      actionDetail: 'Available stock giảm đi, Reserved stock tăng lên tương ứng.',
      systemState: 'Status: Stock Reserved (Đã khóa giữ chỗ an toàn)',
      ledgerImpact: 'Ghi nhật ký biến động tồn kho (Stock Ledger Append-Only).',
      stockImpact: 'Available = Physical - Reserved. Tuyệt đối không bán âm.'
    },
    {
      id: 3,
      label: 'Picking (Nhặt)',
      actor: 'Nhân Viên Kho Bãi (WMS)',
      icon: CheckSquare,
      title: 'Gom Nhặt Hàng Thông Minh (Wave Picking)',
      desc: 'Thuật toán tự động gom các đơn có sản phẩm tương đồng thành một lộ trình nhặt hàng tối ưu, nhân viên di chuyển một vòng lấy đủ hàng.',
      actionDetail: 'In danh sách nhặt hàng (Pick List) theo vị trí Kệ/Bin chi tiết.',
      systemState: 'Status: Wave Picking (Đang lấy hàng tại kệ)',
      ledgerImpact: 'Hàng rời kệ, sẵn sàng đưa về bàn đóng gói.',
      stockImpact: 'Vị trí Bin được cập nhật số lượng thực tế.'
    },
    {
      id: 4,
      label: 'Packing (Đóng)',
      actor: 'Bộ Phận Đóng Gói',
      icon: Barcode,
      title: 'Quét Mã Scan-to-Pack Chống Nhầm',
      desc: 'Trước khi đóng thùng, nhân viên quét mã vạch sản phẩm. Hệ thống đối chiếu chính xác với đơn hàng và tự động in tem vận chuyển.',
      actionDetail: 'Quét đúng sản phẩm mới cho phép in tem vận đơn bàn giao.',
      systemState: 'Status: Packed (Đã đóng gói & dán tem vận đơn)',
      ledgerImpact: 'Ghi nhận chi phí bao bì, nhãn vận chuyển.',
      stockImpact: 'Hàng đã đóng thùng niêm phong chờ bàn giao.'
    },
    {
      id: 5,
      label: 'Giao Hàng',
      actor: 'Đơn Vị Vận Chuyển (3PL)',
      icon: Truck,
      title: 'Bàn Giao Vận Chuyển & Giảm Tồn Vật Lý',
      desc: 'Bàn giao bưu kiện cho GHN, GHTK, Viettel Post, SPX. Trạng thái tồn kho Physical chính thức được trừ đi vì hàng đã rời kho.',
      actionDetail: 'Physical stock giảm đi, Reserved stock giảm đi tương ứng.',
      systemState: 'Status: Shipped / In-Transit (Đang vận chuyển đến khách)',
      ledgerImpact: 'Nợ TK 632 (Giá vốn) / Có TK 156 (Tồn kho vật lý).',
      stockImpact: 'Physical và Reserved đều trừ đi số lượng đã xuất kho.'
    },
    {
      id: 6,
      label: 'Đối Soát',
      actor: 'Kế Toán & Ban Giám Đốc',
      icon: Calculator,
      title: 'Đối Soát Phí Sàn & Hạch Toán Sổ Kép',
      desc: 'Khi khách nhận hàng thành công, hệ thống tự sinh bút toán kép chuẩn mực kế toán (Debit = Credit) và đối soát chi tiết từng đồng hoa hồng sàn.',
      actionDetail: 'Tự động hạch toán Nợ 131 (Phải thu sàn) = Có 511 (Doanh thu).',
      systemState: 'Status: Completed & Balanced (Hoàn tất giao dịch)',
      ledgerImpact: 'Bút toán cân đối 100%, sẵn sàng báo cáo thuế.',
      stockImpact: 'Chu kỳ giao dịch hoàn tất, số liệu đồng bộ toàn diện.'
    }
  ];

  const current = steps[activeStep];

  return (
    <section className="py-24 bg-[#081B2C] text-white border-b border-[#1E647F]/30 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-wood-aqua bg-[#123A52] px-3.5 py-1.5 rounded-full border border-[#1E647F]/50">
            QUY TRÌNH THỰC TẾ
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-4 mb-4">
            Hành Trình Đơn Hàng Từ Lúc Đặt Đến Khi Quyết Toán
          </h2>
          <p className="text-base text-gray-300 leading-relaxed">
            Mỗi giai đoạn được tự động hóa chuẩn xác, kiểm soát tồn kho ở cấp cơ sở dữ liệu và bảo đảm dòng tiền minh bạch. 
            Bấm chọn từng bước bên dưới để xem chi tiết.
          </p>
        </div>

        {/* 7-Step Interactive Pipeline Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-10">
          {steps.map((st) => {
            const Icon = st.icon;
            const isSelected = activeStep === st.id;
            const isPassed = activeStep > st.id;
            return (
              <button
                key={st.id}
                onClick={() => setActiveStep(st.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-[#123A52] border-wood-aqua shadow-lg shadow-[#27B4A0]/20 scale-102 ring-2 ring-wood-aqua/40' 
                    : isPassed
                    ? 'bg-[#0C2739] border-[#1E647F]/40 hover:border-gray-600'
                    : 'bg-[#081B2C] border-gray-800 hover:border-gray-700 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[11px] font-bold font-mono ${isSelected ? 'text-wood-aqua' : 'text-gray-400'}`}>
                    0{st.id + 1}
                  </span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-wood-aqua text-[#081B2C]' : 'bg-[#081B2C] text-gray-400'
                  }`}>
                    <Icon size={14} />
                  </div>
                </div>
                <div>
                  <div className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {st.label}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate mt-0.5">{st.actor}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Step Detailed Inspection Panel */}
        <div className="max-w-4xl mx-auto rounded-3xl bg-[#0C2739] border border-[#1E647F]/60 p-8 shadow-2xl transition-all duration-300">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            
            {/* Left: Step Description (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-wood-aqua">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>GIAI ĐOẠN 0{current.id + 1}: {current.actor.toUpperCase()}</span>
              </div>

              <h3 className="text-2xl font-bold text-white tracking-tight">
                {current.title}
              </h3>

              <p className="text-sm text-gray-300 leading-relaxed">
                {current.desc}
              </p>

              <div className="space-y-2.5 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-[#081B2C] border border-gray-800">
                  <span className="text-gray-400 font-medium">Thao tác nghiệp vụ: </span>
                  <span className="text-white font-semibold">{current.actionDetail}</span>
                </div>
              </div>
            </div>

            {/* Right: State & Ledger Visual Card (5 cols) */}
            <div className="md:col-span-5 space-y-3 font-mono text-xs">
              <div className="p-4 rounded-2xl bg-[#081B2C] border border-gray-800 space-y-3 shadow-inner">
                <div className="text-gray-400 pb-2 border-b border-gray-800 font-bold flex items-center justify-between font-sans">
                  <span>Trạng Thái Dữ Liệu</span>
                  <span className="text-wood-aqua text-[11px]">PostgreSQL ACID</span>
                </div>

                <div>
                  <div className="text-[11px] text-gray-400">Trạng thái đơn:</div>
                  <div className="text-emerald-400 font-bold mt-0.5">{current.systemState}</div>
                </div>

                <div>
                  <div className="text-[11px] text-gray-400">Tác động tồn kho:</div>
                  <div className="text-cyan-300 mt-0.5">{current.stockImpact}</div>
                </div>

                <div>
                  <div className="text-[11px] text-gray-400">Hạch toán kế toán:</div>
                  <div className="text-amber-300 mt-0.5">{current.ledgerImpact}</div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
