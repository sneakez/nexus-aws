import { useState } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight,
  Sliders,
  Sparkles
} from 'lucide-react';

interface OperationalBenefitsSectionProps {
  onNavigate: (path: string) => void;
}

export function OperationalBenefitsSection({ onNavigate }: OperationalBenefitsSectionProps) {
  const [dailyOrders, setDailyOrders] = useState<number>(1200);

  // Realistic operational impacts based on volume
  const wavesPerDay = Math.ceil(dailyOrders / 80);
  const estimatedHoursSaved = Math.round((dailyOrders * 0.03) * 30);

  return (
    <section className="py-24 bg-[#F4F8FA] text-[#081B2C] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#D9E3E8] text-xs font-semibold text-[#123A52] shadow-sm mb-4">
            <Sparkles size={14} className="text-[#27B4A0]" />
            HIỆU QUẢ VẬN HÀNH THỰC TẾ
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#081B2C] tracking-tight mb-4">
            Giải Quyết Tận Gốc Các Điểm Nghẽn Kho Vận
          </h2>
          <p className="text-base sm:text-lg text-[#4A6070] leading-relaxed">
            Thay vì chấp nhận thất thoát và sai sót như một phần của chi phí kinh doanh, NexusOMS chuẩn hóa quy trình để mọi mắt xích hoạt động nhịp nhàng.
          </p>
        </div>

        {/* 3 Core Value Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {/* Card 1 */}
          <div className="bg-white rounded-3xl p-8 border border-[#D9E3E8] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#E8F3F7] flex items-center justify-center text-[#1E647F] mb-6">
                <ShieldCheck size={28} />
              </div>
              <span className="text-xs font-mono font-bold text-[#1E647F] uppercase tracking-wider block mb-2">01. BẢO VỆ TỒN KHO</span>
              <h3 className="text-xl font-bold text-[#081B2C] mb-3">
                Chống Bán Âm & Hủy Đơn Do Lệch Kho
              </h3>
              <p className="text-sm text-[#4A6070] leading-relaxed mb-6">
                Khi nhiều kênh bán cùng dồn đơn vào giờ cao điểm, hệ thống khóa số lượng tồn tại chỗ trước khi cho phép xác nhận. Không còn nỗi lo thiếu hàng giao dẫn đến bị sàn TMĐT phạt điểm hay hủy đơn hàng loạt.
              </p>
            </div>
            <ul className="space-y-2.5 text-xs text-[#304B5D] pt-4 border-t border-[#E8F0F4]">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#27B4A0] flex-shrink-0" />
                <span>Khóa tồn tự động ngay khi webhook ghi nhận đơn</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#27B4A0] flex-shrink-0" />
                <span>Hoàn tồn chính xác 100% khi đơn bị khách hủy</span>
              </li>
            </ul>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-3xl p-8 border border-[#D9E3E8] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#E8F3F7] flex items-center justify-center text-[#1E647F] mb-6">
                <Clock size={28} />
              </div>
              <span className="text-xs font-mono font-bold text-[#1E647F] uppercase tracking-wider block mb-2">02. TỐC ĐỘ XỬ LÝ</span>
              <h3 className="text-xl font-bold text-[#081B2C] mb-3">
                Đóng Gói Nhanh Hơn & Không Nhầm Lẫn
              </h3>
              <p className="text-sm text-[#4A6070] leading-relaxed mb-6">
                Gom các đơn có cùng sản phẩm thành từng đợt nhặt hàng tập trung để nhân viên không phải chạy lòng vòng trong kho. Cơ chế quét mã vạch trước khi in phiếu giao đảm bảo đóng đúng màu, đúng size.
              </p>
            </div>
            <ul className="space-y-2.5 text-xs text-[#304B5D] pt-4 border-t border-[#E8F0F4]">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#27B4A0] flex-shrink-0" />
                <span>Gom sóng nhặt hàng (Wave Picking) theo vị trí kệ</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#27B4A0] flex-shrink-0" />
                <span>Quét mã xác thực loại bỏ hoàn toàn việc giao nhầm</span>
              </li>
            </ul>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-3xl p-8 border border-[#D9E3E8] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#E8F3F7] flex items-center justify-center text-[#1E647F] mb-6">
                <TrendingUp size={28} />
              </div>
              <span className="text-xs font-mono font-bold text-[#1E647F] uppercase tracking-wider block mb-2">03. MINH BẠCH TÀI CHÍNH</span>
              <h3 className="text-xl font-bold text-[#081B2C] mb-3">
                Kiểm Soát Lợi Nhuận Thực & Đối Soát Sàn
              </h3>
              <p className="text-sm text-[#4A6070] leading-relaxed mb-6">
                Tự động đối chiếu dòng tiền thu về từ sàn thương mại điện tử với doanh thu và phí dịch vụ phát sinh. Phát hiện ngay các đơn hàng bị cấu hình sai chiết khấu hoặc thất thoát cước vận chuyển.
              </p>
            </div>
            <ul className="space-y-2.5 text-xs text-[#304B5D] pt-4 border-t border-[#E8F0F4]">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#27B4A0] flex-shrink-0" />
                <span>Bút toán kép cân bằng Nợ/Có cho từng giao dịch</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-[#27B4A0] flex-shrink-0" />
                <span>Cảnh báo tức thời nếu đơn hàng phát sinh lỗ</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Realistic Volume & Impact Estimator */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#D9E3E8] shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Slider */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#1E647F] uppercase tracking-wider">
                <Sliders size={16} /> Ước tính theo quy mô đơn hàng của bạn
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#081B2C] leading-snug">
                Quy Trình Chuẩn Hóa Theo Từng Mức Sản Lượng
              </h3>
              <p className="text-sm text-[#4A6070] leading-relaxed">
                Kéo thanh trượt để chọn sản lượng đơn hàng trung bình mỗi ngày của gian hàng và xem cách thức vận hành tối ưu tương ứng:
              </p>

              {/* Range Control */}
              <div className="pt-2">
                <div className="flex justify-between items-center text-sm font-semibold text-[#081B2C] mb-2">
                  <span>Sản lượng đơn hàng:</span>
                  <span className="text-lg font-bold text-[#1E647F]">
                    {dailyOrders.toLocaleString('vi-VN')} đơn / ngày
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={10000}
                  step={100}
                  value={dailyOrders}
                  onChange={(e) => setDailyOrders(Number(e.target.value))}
                  className="w-full h-2.5 bg-[#E8F0F4] rounded-lg appearance-none cursor-pointer accent-[#27B4A0]"
                />
                <div className="flex justify-between text-xs text-[#7A90A0] mt-1.5 font-sans">
                  <span>100 đơn</span>
                  <span>2.500 đơn</span>
                  <span>5.000 đơn</span>
                  <span>10.000 đơn/ngày</span>
                </div>
              </div>
            </div>

            {/* Right Column: Key Operational Metrics */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#F4F8FA] border border-[#E0EBF0]">
                <div className="text-xs text-[#5E7688] font-medium">Đợt gom sóng (Wave)</div>
                <div className="text-3xl font-extrabold text-[#081B2C] mt-1.5">~{wavesPerDay} đợt</div>
                <div className="text-[11px] text-[#7A90A0] mt-1">Gom 80 đơn / lượt nhặt</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#F4F8FA] border border-[#E0EBF0]">
                <div className="text-xs text-[#5E7688] font-medium">Thời gian tiết kiệm</div>
                <div className="text-3xl font-extrabold text-[#1E647F] mt-1.5">~{estimatedHoursSaved}h</div>
                <div className="text-[11px] text-[#7A90A0] mt-1">mỗi tháng tại khu vực kho</div>
              </div>

              <div className="p-5 rounded-2xl bg-[#F4F8FA] border border-[#E0EBF0] sm:col-span-2">
                <div className="text-xs text-[#5E7688] font-medium">Khuyến nghị phương án vận hành:</div>
                <div className="text-sm font-bold text-[#081B2C] mt-1">
                  {dailyOrders < 500 && 'Sử dụng mô hình Nhặt đơn lẻ kết hợp Quét mã xác thực đóng gói.'}
                  {dailyOrders >= 500 && dailyOrders < 2000 && 'Áp dụng Gom sóng (Wave Picking) 2 giờ/lần kết hợp bàn giao theo ca cho đơn vị vận chuyển.'}
                  {dailyOrders >= 2000 && 'Vận hành phân bổ Bin/Shelf đa kho phân tán, quét mã băng chuyền và hạch toán tự động theo thời gian thực.'}
                </div>
                <button
                  onClick={() => onNavigate('/solutions')}
                  className="mt-3 text-xs font-semibold text-[#1E647F] hover:text-[#081B2C] inline-flex items-center gap-1"
                >
                  Xem giải pháp phù hợp với mô hình của bạn <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
