import { useState } from 'react';
import { 
  Layers, 
  Package, 
  Truck, 
  Calculator, 
  CheckCircle2, 
  ArrowRight,
  Clock,
  Scan,
  ShieldCheck,
  TrendingUp,
  Tag
} from 'lucide-react';

interface WorkspaceShowcaseSectionProps {
  onNavigate: (path: string) => void;
}

export function WorkspaceShowcaseSection({ onNavigate }: WorkspaceShowcaseSectionProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'fulfillment' | 'finance'>('orders');

  return (
    <section className="py-24 bg-[#081B2C] relative overflow-hidden border-t border-[#1E647F]/40">
      {/* Subtle Glow Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-gradient-to-tr from-[#1E647F]/15 via-[#27B4A0]/10 to-transparent rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123A52]/80 border border-[#1E647F]/60 text-xs font-semibold text-wood-aqua mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#27B4A0]" />
            BÀN LÀM VIỆC THỰC TẾ
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-4">
            Trải Nghiệm Trực Quan Không Gian Quản Trị
          </h2>
          <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
            Giao diện chuẩn hóa quy trình cho từng vai trò vận hành — từ nhân viên nhặt hàng, trưởng kho đến kế toán đối soát.
          </p>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
          {[
            { id: 'orders', label: '1. Đơn Hàng Đa Sàn (OMS)', icon: Layers },
            { id: 'inventory', label: '2. Tồn Kho 5 Trạng Thái (WMS)', icon: Package },
            { id: 'fulfillment', label: '3. Wave Picking & Scan-Pack', icon: Truck },
            { id: 'finance', label: '4. Kế Toán Sổ Kép & Đối Soát', icon: Calculator }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#1E647F] to-[#27B4A0] text-white shadow-lg shadow-[#27B4A0]/25' 
                    : 'bg-[#0C2739]/90 text-gray-300 hover:text-white hover:bg-[#123A52] border border-[#1E647F]/40'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-white' : 'text-wood-aqua'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Orders Showcase */}
        {activeTab === 'orders' && (
          <div className="rounded-3xl bg-[#0C2739] border border-[#1E647F]/60 p-6 sm:p-8 lg:p-10 shadow-2xl">
            {/* Window Topbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-mono text-gray-400 pl-2">nexusoms.app/orders</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Đồng bộ Real-Time 3 Sàn
                </span>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 my-5 text-xs">
              <span className="px-3 py-1.5 rounded-xl font-bold bg-[#1E647F] text-white">Tất cả (1,248)</span>
              <span className="px-3 py-1.5 rounded-xl font-semibold bg-[#081B2C] text-gray-300 border border-gray-800">Chờ xác nhận (18)</span>
              <span className="px-3 py-1.5 rounded-xl font-semibold bg-[#081B2C] text-emerald-300 border border-emerald-800/50">Đã khóa tồn (42)</span>
              <span className="px-3 py-1.5 rounded-xl font-semibold bg-[#081B2C] text-cyan-300 border border-cyan-800/50">Đang đóng gói (85)</span>
              <span className="px-3 py-1.5 rounded-xl font-semibold bg-[#081B2C] text-gray-400 border border-gray-800">Đang giao hàng (310)</span>
            </div>

            {/* Orders Table Mockup */}
            <div className="overflow-x-auto rounded-2xl border border-gray-800/80 bg-[#081B2C]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 font-semibold bg-[#081B2C]/90">
                    <th className="py-3.5 px-4">Mã đơn hàng</th>
                    <th className="py-3.5 px-4">Kênh bán</th>
                    <th className="py-3.5 px-4">Khách hàng</th>
                    <th className="py-3.5 px-4">Sản phẩm</th>
                    <th className="py-3.5 px-4 text-right">Tổng tiền</th>
                    <th className="py-3.5 px-4 text-center">Khóa tồn</th>
                    <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-sans">
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">#SPX-90214</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">Shopee</span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-200">Hoàng Minh Tâm</td>
                    <td className="py-3.5 px-4 text-gray-300">Tai nghe ANC Nexus Pro (x1)</td>
                    <td className="py-3.5 px-4 text-right font-bold text-white">1.250.000 ₫</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Đã khóa</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">Đang đóng gói</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">#TT-44812</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">TikTok Shop</span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-200">Lê Thu Hà</td>
                    <td className="py-3.5 px-4 text-gray-300">Bình Giữ Nhiệt Titan 1000ml (x2)</td>
                    <td className="py-3.5 px-4 text-right font-bold text-white">780.000 ₫</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Đã khóa</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">Chờ nhặt hàng</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">#LZD-10924</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">Lazada</span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-200">Nguyễn Văn Bình</td>
                    <td className="py-3.5 px-4 text-gray-300">Bàn phím cơ Silent Wave (x1)</td>
                    <td className="py-3.5 px-4 text-right font-bold text-white">1.890.000 ₫</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Đã khóa</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Đã giao vận chuyển</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bottom highlight row */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-300 pt-4 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-wood-aqua" />
                <span>Cơ chế Idempotency Key bảo đảm mỗi đơn chỉ được xử lý một lần duy nhất.</span>
              </div>
              <button 
                onClick={() => onNavigate('/features/orders')}
                className="font-semibold text-wood-aqua hover:underline inline-flex items-center gap-1"
              >
                Khám phá đầy đủ phân hệ Quản lý Đơn hàng <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Inventory Showcase */}
        {activeTab === 'inventory' && (
          <div className="rounded-3xl bg-[#0C2739] border border-[#1E647F]/60 p-6 sm:p-8 lg:p-10 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-800">
              <div>
                <h3 className="text-base font-bold text-white">Quản Trị Tồn Kho 5 Trạng Thái & Dự Báo Stock Runway</h3>
                <p className="text-xs text-gray-400 mt-1">Phân định rõ ràng giữa lượng hàng vật lý tại kho và lượng hàng an toàn mở bán trên sàn.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-mono bg-[#081B2C] text-wood-aqua border border-[#1E647F]/50">
                  Available = Physical - Reserved
                </span>
              </div>
            </div>

            {/* 5 States Counter Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-6">
              <div className="p-3.5 rounded-2xl bg-[#081B2C] border border-gray-800 text-center">
                <div className="text-[11px] text-gray-400">1. Physical (Kệ kho)</div>
                <div className="text-xl font-extrabold text-white mt-1">1,420</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Kiểm kê thực tế</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#081B2C] border border-amber-900/50 text-center">
                <div className="text-[11px] text-amber-300">2. Reserved (Đã khóa)</div>
                <div className="text-xl font-extrabold text-amber-400 mt-1">315</div>
                <div className="text-[10px] text-amber-500 mt-0.5">Đơn đang chờ đóng</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#081B2C] border border-emerald-900/50 text-center">
                <div className="text-[11px] text-emerald-300">3. Available (Mở bán)</div>
                <div className="text-xl font-extrabold text-emerald-400 mt-1">1,105</div>
                <div className="text-[10px] text-emerald-500 mt-0.5">Đẩy lên sàn TMĐT</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#081B2C] border border-cyan-900/50 text-center">
                <div className="text-[11px] text-cyan-300">4. In-Transit (Sắp về)</div>
                <div className="text-xl font-extrabold text-cyan-400 mt-1">500</div>
                <div className="text-[10px] text-cyan-500 mt-0.5">Đang vận chuyển từ NCC</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#081B2C] border border-rose-900/50 text-center col-span-2 sm:col-span-1">
                <div className="text-[11px] text-rose-300">5. Damaged (Lỗi/Hỏng)</div>
                <div className="text-xl font-extrabold text-rose-400 mt-1">12</div>
                <div className="text-[10px] text-rose-500 mt-0.5">Chờ tiêu hủy / đổi trả</div>
              </div>
            </div>

            {/* SKU Runway Table */}
            <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-[#081B2C]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 font-semibold">
                    <th className="py-3 px-4">SKU / Tên sản phẩm</th>
                    <th className="py-3 px-4 text-center">Physical</th>
                    <th className="py-3 px-4 text-center">Reserved</th>
                    <th className="py-3 px-4 text-center">Available</th>
                    <th className="py-3 px-4 text-center">Vận tốc bán</th>
                    <th className="py-3 px-4 text-center">Runway còn lại</th>
                    <th className="py-3 px-4 text-center">Trạng thái kho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-sans">
                  <tr>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">Tai nghe Bluetooth ANC Nexus Pro</div>
                      <code className="text-[11px] text-gray-400 font-mono">NX-AIR-PRO</code>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-white">250</td>
                    <td className="py-3 px-4 text-center font-bold text-amber-400">45</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-400 text-sm">205</td>
                    <td className="py-3 px-4 text-center text-gray-300">12 cái / ngày</td>
                    <td className="py-3 px-4 text-center font-bold text-cyan-300">17 ngày</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        Khỏe mạnh
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">Bình Giữ Nhiệt Titan 1000ml</div>
                      <code className="text-[11px] text-gray-400 font-mono">NX-TITAN-1L</code>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-white">40</td>
                    <td className="py-3 px-4 text-center font-bold text-amber-400">22</td>
                    <td className="py-3 px-4 text-center font-bold text-amber-400 text-sm">18</td>
                    <td className="py-3 px-4 text-center text-gray-300">6 cái / ngày</td>
                    <td className="py-3 px-4 text-center font-bold text-amber-300">3 ngày</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        Cần nhập thêm
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-300 pt-4 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-wood-aqua" />
                <span>Quản lý hạn sử dụng FEFO, quản lý số lô (Lot / Serial) chuẩn hóa theo từng vị trí kệ.</span>
              </div>
              <button 
                onClick={() => onNavigate('/features/inventory')}
                className="font-semibold text-wood-aqua hover:underline inline-flex items-center gap-1"
              >
                Khám phá đầy đủ phân hệ Tồn kho <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Fulfillment Showcase */}
        {activeTab === 'fulfillment' && (
          <div className="rounded-3xl bg-[#0C2739] border border-[#1E647F]/60 p-6 sm:p-8 lg:p-10 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-800">
              <div>
                <h3 className="text-base font-bold text-white">Fulfillment Tốc Độ: Wave Picking & Scan-to-Pack</h3>
                <p className="text-xs text-gray-400 mt-1">Gom sóng nhặt hàng giảm thời gian di chuyển, quét mã vạch kiểm tra loại bỏ nhầm hàng.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
                  <Clock size={13} />
                  SLA Bàn Giao: Còn 02h 15m
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
              {/* Wave Picking Box */}
              <div className="p-5 rounded-2xl bg-[#081B2C] border border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-wood-aqua uppercase tracking-wider flex items-center gap-1.5">
                    <Truck size={14} /> Đợt Nhặt Hàng Đang Chạy: Wave #W-410
                  </span>
                  <span className="text-xs text-emerald-400 font-bold">85% Hoàn tất</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-800 mb-4 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#1E647F] to-[#27B4A0] rounded-full" style={{ width: '85%' }} />
                </div>
                <div className="space-y-2 text-xs text-gray-300">
                  <div className="p-2.5 rounded-xl bg-[#0C2739] border border-gray-800 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">Vị trí: A-02-B-04</div>
                      <div className="text-[11px] text-gray-400">Tai nghe ANC Nexus Pro (Gom 42 cái)</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400">Đã nhặt xong</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0C2739] border border-gray-800 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">Vị trí: B-01-A-12</div>
                      <div className="text-[11px] text-gray-400">Bàn phím cơ Silent Wave (Gom 18 cái)</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300">Đang lấy</span>
                  </div>
                </div>
              </div>

              {/* Scan-to-Pack Box */}
              <div className="p-5 rounded-2xl bg-[#081B2C] border border-gray-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-wood-aqua uppercase tracking-wider flex items-center gap-1.5">
                      <Scan size={14} /> Kiểm Tra Đóng Gói (Scan-to-Pack)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Bắt buộc quét mã
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-black/40 border border-gray-800/80 mb-3 text-xs">
                    <div className="text-gray-400 mb-1">Mã vận đơn quét: <span className="text-white font-bold">SPX902148921VN</span></div>
                    <div className="text-gray-400 mb-1">Mã vạch sản phẩm: <span className="text-emerald-400 font-bold">8938501239014</span></div>
                    <div className="text-emerald-400 flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-800 text-[11px]">
                      <CheckCircle2 size={13} /> Khớp đơn hàng 100% — Tự động in tem vận chuyển
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  Tem vận chuyển của GHN, GHTK, Viettel Post, SPX được in ngay khi quét đúng sản phẩm cuối cùng.
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-300 pt-4 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Quy trình đóng gói quét mã loại bỏ hoàn toàn các lỗi đóng nhầm mã màu hoặc sai kích cỡ.</span>
              </div>
              <button 
                onClick={() => onNavigate('/features/fulfillment')}
                className="font-semibold text-wood-aqua hover:underline inline-flex items-center gap-1"
              >
                Khám phá phân hệ Fulfillment <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Finance Showcase */}
        {activeTab === 'finance' && (
          <div className="rounded-3xl bg-[#0C2739] border border-[#1E647F]/60 p-6 sm:p-8 lg:p-10 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-800">
              <div>
                <h3 className="text-base font-bold text-white">Kế Toán Sổ Kép & Đối Soát Doanh Thu Đa Kênh</h3>
                <p className="text-xs text-gray-400 mt-1">Tự động sinh bút toán kép theo thời gian thực. Đối soát chênh lệch phí sàn và phí ship chi tiết.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  Tổng Nợ = Tổng Có (100% Cân Đối)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
              {/* Balanced Journal Mockup */}
              <div className="p-5 rounded-2xl bg-[#081B2C] border border-gray-800 font-mono text-xs">
                <div className="text-xs font-bold text-wood-aqua pb-2 mb-3 border-b border-gray-800 font-sans flex items-center gap-1.5">
                  <Calculator size={14} /> Bút Toán Bán Hàng #JE-89021
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-emerald-400">
                    <span>NỢ TK 131 (Phải thu sàn Shopee):</span>
                    <span className="font-bold">1.150.000 ₫</span>
                  </div>
                  <div className="flex justify-between items-center text-amber-400">
                    <span>NỢ TK 641 (Chi phí hoa hồng & thanh toán):</span>
                    <span className="font-bold">100.000 ₫</span>
                  </div>
                  <div className="flex justify-between items-center text-cyan-400">
                    <span>CÓ TK 511 (Doanh thu bán lẻ):</span>
                    <span className="font-bold">1.250.000 ₫</span>
                  </div>
                  <div className="pt-3 border-t border-gray-800 flex justify-between items-center text-white font-sans text-xs">
                    <span>Trạng thái kiểm tra cân đối:</span>
                    <span className="text-emerald-400 font-bold">CÂN ĐỐI 100%</span>
                  </div>
                </div>
              </div>

              {/* Reconciliation & Circuit Breaker */}
              <div className="p-5 rounded-2xl bg-[#081B2C] border border-gray-800 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-wood-aqua pb-2 mb-3 border-b border-gray-800 flex items-center gap-1.5">
                    <TrendingUp size={14} /> Đối Soát Doanh Thu & Bảo Vệ Biên Lợi Nhuận
                  </div>
                  <div className="space-y-2.5 text-xs text-gray-300">
                    <div className="p-2.5 rounded-xl bg-[#0C2739] border border-gray-800 flex justify-between items-center">
                      <span>Tiền sàn quyết toán thực tế:</span>
                      <span className="font-bold text-white">48.250.000 ₫</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0C2739] border border-gray-800 flex justify-between items-center">
                      <span>Phí trừ sàn (Commission + Payment fee):</span>
                      <span className="font-bold text-amber-400">4.120.000 ₫</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0C2739] border border-emerald-900/50 flex justify-between items-center">
                      <span>Lợi nhuận ròng sau chi phí:</span>
                      <span className="font-bold text-emerald-400">14.850.000 ₫</span>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-gray-400 pt-3">
                  Tích hợp Circuit Breaker cảnh báo tức thì khi xuất hiện đơn hàng có biên lợi nhuận âm.
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-300 pt-4 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>Dữ liệu kế toán sẵn sàng đồng bộ sang phần mềm MISA, Fast, Bravo qua định dạng chuẩn.</span>
              </div>
              <button 
                onClick={() => onNavigate('/features/finance')}
                className="font-semibold text-wood-aqua hover:underline inline-flex items-center gap-1"
              >
                Khám phá phân hệ Tài chính <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
