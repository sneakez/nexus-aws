import { Boxes, ShieldCheck, Database, CheckCircle2, GitBranch, ArrowUpRight } from 'lucide-react';

interface PublicFooterProps {
  onNavigate: (path: string) => void;
}

export function PublicFooter({ onNavigate }: PublicFooterProps) {
  return (
    <footer className="bg-[#05121E] text-gray-300 border-t border-[#1E647F]/30 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-gray-800">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <div 
              onClick={() => onNavigate('/')} 
              className="flex items-center gap-3 cursor-pointer group w-fit"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E647F] to-[#27B4A0] flex items-center justify-center shadow-lg shadow-[#1E647F]/40">
                <Boxes className="text-white" size={22} />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white group-hover:text-wood-aqua transition-colors">
                Nexus<span className="text-[#27B4A0]">OMS</span>
              </span>
            </div>

            <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
              Động cơ xử lý đơn hàng đa kênh và quản trị kho phân tán chuẩn Enterprise. 
              Kiến trúc PostgreSQL ACID, Row-Level Security đa khách thuê và hạch toán sổ kép tự động.
            </p>

            {/* Astrological & Quality Stamp */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#081B2C] border border-[#1E647F]/40 text-xs text-metal-mist">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Bản mệnh: Tuyền Trung Thủy • Thủy nhị cục • Kim tương sinh</span>
              </div>
            </div>

            {/* Live Reliability Badges */}
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <ShieldCheck size={14} className="text-wood-aqua" />
                <span>RLS Multi-Tenant Enforced</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Database size={14} className="text-wood-aqua" />
                <span>PostgreSQL Atomic RPC</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <CheckCircle2 size={14} className="text-wood-aqua" />
                <span>Double-Entry Balanced</span>
              </div>
            </div>
          </div>

          {/* Solutions Column */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Giải pháp ngành</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => onNavigate('/solutions')} className="hover:text-wood-aqua transition-colors">
                  D2C & Thương hiệu Bán lẻ
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/solutions')} className="hover:text-wood-aqua transition-colors">
                  Thương Hiệu TMĐT Đa Kênh & D2C
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/solutions')} className="hover:text-wood-aqua transition-colors">
                  Kho Tổng & Nhà Phân Phối B2B
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/solutions')} className="hover:text-wood-aqua transition-colors">
                  Mô hình 3PL & Fulfillment Hub
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/solutions')} className="hover:text-wood-aqua transition-colors">
                  Thương Mại Đa Sàn (Multichannel Digital Commerce)
                </button>
              </li>
            </ul>
          </div>

          {/* Features Column */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Tính năng cốt lõi</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => onNavigate('/features/orders')} className="hover:text-wood-aqua transition-colors">
                  Quản lý Đơn hàng (OMS)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/features/inventory')} className="hover:text-wood-aqua transition-colors">
                  Quản lý Kho 5 Trạng Thái
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/features/fulfillment')} className="hover:text-wood-aqua transition-colors">
                  Wave Picking & Đóng gói
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/features/finance')} className="hover:text-wood-aqua transition-colors">
                  Kế toán Sổ kép & Đối soát
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/demo')} className="text-wood-aqua hover:underline inline-flex items-center gap-1">
                  Bản Demo Sandbox <ArrowUpRight size={13} />
                </button>
              </li>
            </ul>
          </div>

          {/* Company & Legal Column */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">NexusOMS V5</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => onNavigate('/about')} className="hover:text-wood-aqua transition-colors">
                  Về chúng tôi & Triết lý
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/pricing')} className="hover:text-wood-aqua transition-colors">
                  Bảng giá & Gói dịch vụ
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/contact')} className="hover:text-wood-aqua transition-colors">
                  Tư vấn & Báo giá tùy chỉnh
                </button>
              </li>
              <li>
                <a 
                  href="https://github.com/ThanhBinhDuongNguyen/Noxus-V3" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="hover:text-wood-aqua inline-flex items-center gap-1 transition-colors"
                >
                  <GitBranch size={13} /> Mã nguồn V5
                </a>
              </li>
              <li>
                <button onClick={() => onNavigate('/login')} className="hover:text-white transition-colors">
                  Đăng nhập Quản trị
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <div>
            © {new Date().getFullYear()} NexusOMS Enterprise. All rights reserved. Vận hành trên nền tảng Antigravity 2.0.
          </div>
          <div className="flex items-center gap-6">
            <span>Bảo mật RLS Cấp Cơ Sở Dữ Liệu</span>
            <span>•</span>
            <span>Chống Bán Âm Nguyên Tử</span>
            <span>•</span>
            <span>Bút Toán Kép Cân Bằng</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
