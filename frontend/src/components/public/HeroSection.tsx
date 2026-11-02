import { ArrowRight, Play, CheckCircle2, Database } from 'lucide-react';

interface HeroSectionProps {
  onNavigate: (path: string) => void;
}

export function HeroSection({ onNavigate }: HeroSectionProps) {
  return (
    <section className="relative pt-10 pb-20 lg:pt-16 lg:pb-28 overflow-hidden bg-[#081B2C] text-white">
      {/* Background Soft Glows */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[400px] bg-gradient-to-tr from-[#1E647F]/20 via-[#27B4A0]/15 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -top-10 right-0 w-80 h-80 bg-[#123A52]/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Editorial SaaS Copy (5 cols) */}
          <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123A52] border border-[#1E647F]/50 text-xs font-semibold text-wood-aqua tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>MULTICHANNEL DIGITAL OMS + WMS + UNIT ECONOMICS</span>
            </div>

            {/* Benefit Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
              Đơn hàng, tồn kho và dòng tiền. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-wood-aqua via-[#2D82B7] to-emerald-400">
                Một nơi để kiểm soát.
              </span>
            </h1>

            {/* Supporting Copy (Max 2-3 lines) */}
            <p className="text-base text-gray-300 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Hợp nhất đơn hàng từ các sàn TMĐT (Shopee, TikTok Shop, Lazada, D2C), kiểm soát tồn kho phân tán chuẩn 5 trạng thái 
              và tự động hóa Unit Economics đa tầng và kế toán kép.
            </p>

            {/* Two Visible CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <button
                onClick={() => onNavigate('/register')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] shadow-xl shadow-[#27B4A0]/20 transition-all flex items-center justify-center gap-2 group"
              >
                <span>Bắt đầu sử dụng</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('/demo')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-sm text-metal-mist bg-[#123A52]/80 hover:bg-[#123A52] border border-[#1E647F]/60 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Play size={14} className="text-wood-aqua fill-wood-aqua" />
                <span>Trải nghiệm bản Demo</span>
              </button>
            </div>

            {/* Trust Note - No unverified claims */}
            <div className="pt-4 border-t border-gray-800/80">
              <p className="text-xs text-gray-400">
                Thiết kế chuyên sâu cho thương hiệu D2C, các nhà bán lẻ thương mại số đa sàn và đơn vị fulfillment phân tán.
              </p>
            </div>
          </div>

          {/* Right Column: High-Fidelity Large Product Mockup with Layered Depth (7 cols) */}
          <div className="lg:col-span-7 relative">
            <div className="relative rounded-2xl bg-[#0C2739] border border-[#1E647F]/50 shadow-2xl overflow-hidden transition-all duration-300">
              
              {/* Mockup Window Header */}
              <div className="bg-[#081B2C] px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-[11px] text-gray-400 font-mono ml-2">nexusoms.vn/app/orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#123A52] text-wood-aqua border border-[#1E647F]/40">
                    Kho Trung Tâm HCM
                  </span>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>

              {/* Mockup Metric Strip */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-[#081B2C]/50 border-b border-gray-800/80 text-xs">
                <div className="p-3 rounded-xl bg-[#0C2739] border border-gray-800">
                  <span className="text-gray-400 text-[11px]">Đơn mới cần xử lý</span>
                  <div className="text-xl font-bold text-white mt-0.5">142 đơn</div>
                  <span className="text-[10px] text-amber-400">Đã khóa tồn an toàn</span>
                </div>
                <div className="p-3 rounded-xl bg-[#0C2739] border border-gray-800">
                  <span className="text-gray-400 text-[11px]">Tồn khả dụng (Available)</span>
                  <div className="text-xl font-bold text-emerald-400 mt-0.5">1,850 SP</div>
                  <span className="text-[10px] text-gray-400">Đang bán trên các sàn</span>
                </div>
                <div className="p-3 rounded-xl bg-[#0C2739] border border-gray-800">
                  <span className="text-gray-400 text-[11px]">Đang vận chuyển</span>
                  <div className="text-xl font-bold text-cyan-400 mt-0.5">86 đơn</div>
                  <span className="text-[10px] text-gray-400">Bàn giao GHN, SPX</span>
                </div>
              </div>

              {/* Mockup Realistic Orders Table */}
              <div className="p-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-gray-400 border-b border-gray-800">
                    <tr>
                      <th className="pb-2.5 font-medium">Mã Đơn</th>
                      <th className="pb-2.5 font-medium">Kênh</th>
                      <th className="pb-2.5 font-medium">Khách Hàng</th>
                      <th className="pb-2.5 font-medium">Sản Phẩm</th>
                      <th className="pb-2.5 font-medium text-right">Tổng Tiền</th>
                      <th className="pb-2.5 font-medium text-center">Trạng Thái Tồn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    <tr className="hover:bg-[#123A52]/30 transition-colors">
                      <td className="py-2.5 font-mono font-bold text-wood-aqua">ORD-8041</td>
                      <td className="py-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-800/60 font-semibold text-[10px]">
                          Shopee
                        </span>
                      </td>
                      <td className="py-2.5 text-white">Nguyễn Anh Tuấn</td>
                      <td className="py-2.5 text-gray-300">1x Tai nghe Pro</td>
                      <td className="py-2.5 text-right font-bold text-white">1.250.000 ₫</td>
                      <td className="py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 text-[10px] font-semibold">
                          Đã khóa tồn
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#123A52]/30 transition-colors">
                      <td className="py-2.5 font-mono font-bold text-wood-aqua">ORD-8040</td>
                      <td className="py-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-pink-950/60 text-pink-300 border border-pink-800/60 font-semibold text-[10px]">
                          TikTok
                        </span>
                      </td>
                      <td className="py-2.5 text-white">Lê Minh Hoàng</td>
                      <td className="py-2.5 text-gray-300">2x Bình giữ nhiệt Titan</td>
                      <td className="py-2.5 text-right font-bold text-white">780.000 ₫</td>
                      <td className="py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/60 text-[10px] font-semibold">
                          Đang nhặt hàng
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-[#123A52]/30 transition-colors">
                      <td className="py-2.5 font-mono font-bold text-wood-aqua">ORD-8039</td>
                      <td className="py-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60 font-semibold text-[10px]">
                          Lazada
                        </span>
                      </td>
                      <td className="py-2.5 text-white">Trần Mai Linh</td>
                      <td className="py-2.5 text-gray-300">1x Bàn phím Silent</td>
                      <td className="py-2.5 text-right font-bold text-white">2.190.000 ₫</td>
                      <td className="py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 text-[10px] font-semibold">
                          Đã xuất kho
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Layered Floating Accent Badge 1: Atomic Stock Lock */}
            <div className="hidden sm:flex absolute -bottom-5 -left-5 p-3.5 rounded-2xl bg-[#081B2C] border border-[#1E647F] shadow-2xl items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white">Khóa Tồn Nguyên Tử</div>
                <div className="text-gray-400">PostgreSQL ACID Transaction</div>
              </div>
            </div>

            {/* Layered Floating Accent Badge 2: Double-Entry Balanced */}
            <div className="hidden sm:flex absolute -top-4 -right-4 p-3 rounded-xl bg-[#081B2C] border border-[#1E647F] shadow-2xl items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-wood-aqua/20 text-wood-aqua flex items-center justify-center shrink-0">
                <Database size={16} />
              </div>
              <div className="text-[11px]">
                <div className="font-bold text-white">Sổ Kế Toán Kép</div>
                <div className="text-emerald-400">Nợ TK 131 == Có TK 511</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
