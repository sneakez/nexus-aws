import { useState } from 'react';
import { 
  Boxes, 
  Menu, 
  X, 
  ChevronDown, 
  ArrowRight,
  LogIn,
  Layers,
  Package,
  Truck,
  Calculator
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface PublicHeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function PublicHeader({ currentPath, onNavigate }: PublicHeaderProps) {
  const { session } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false);

  const handleNav = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
    setFeaturesDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#081B2C]/95 backdrop-blur-md border-b border-[#1E647F]/30 text-white transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <div 
          onClick={() => handleNav('/')} 
          className="flex items-center gap-3.5 cursor-pointer group shrink-0"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1E647F] via-[#2D82B7] to-[#27B4A0] flex items-center justify-center shadow-lg shadow-[#1E647F]/40 group-hover:scale-105 transition-transform duration-200">
            <Boxes className="text-white" size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-wood-aqua transition-colors leading-none">
              Nexus<span className="text-[#27B4A0]">OMS</span>
            </span>
            <span className="text-[11px] text-gray-400 mt-1 font-medium tracking-wide">
              Quản Trị Vận Hành Đa Kênh
            </span>
          </div>
        </div>

        {/* Center: Desktop Navigation Links (Visible on desktop 1024px+) */}
        <nav className="hidden lg:flex items-center gap-8 text-[14px] font-medium text-gray-300">
          <button 
            onClick={() => handleNav('/')} 
            className={`hover:text-white transition-colors py-1 ${currentPath === '/' ? 'text-wood-aqua font-semibold' : ''}`}
          >
            Trang chủ
          </button>

          <button 
            onClick={() => handleNav('/solutions')} 
            className={`hover:text-white transition-colors py-1 ${currentPath === '/solutions' ? 'text-wood-aqua font-semibold' : ''}`}
          >
            Giải pháp
          </button>

          {/* Features Menu */}
          <div className="relative">
            <button
              onClick={() => setFeaturesDropdownOpen(!featuresDropdownOpen)}
              onMouseEnter={() => setFeaturesDropdownOpen(true)}
              className="flex items-center gap-1.5 hover:text-white transition-colors py-2"
            >
              <span>Tính năng</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${featuresDropdownOpen ? 'rotate-180 text-wood-aqua' : ''}`} />
            </button>

            {featuresDropdownOpen && (
              <div 
                onMouseLeave={() => setFeaturesDropdownOpen(false)}
                className="absolute top-full -left-6 w-80 bg-[#0C2739] border border-[#1E647F]/50 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in"
              >
                <button
                  onClick={() => handleNav('/features/orders')}
                  className="w-full text-left p-3 rounded-xl hover:bg-[#123A52] flex items-start gap-3 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-[#1E647F]/30 text-wood-aqua group-hover:bg-[#1E647F] group-hover:text-white transition-colors">
                    <Layers size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Đơn hàng đa kênh (OMS)</div>
                    <div className="text-xs text-gray-400">Đồng bộ Shopee, TikTok, Lazada & Website D2C</div>
                  </div>
                </button>

                <button
                  onClick={() => handleNav('/features/inventory')}
                  className="w-full text-left p-3 rounded-xl hover:bg-[#123A52] flex items-start gap-3 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-[#1E647F]/30 text-wood-aqua group-hover:bg-[#1E647F] group-hover:text-white transition-colors">
                    <Package size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Kho vận 5 trạng thái (WMS)</div>
                    <div className="text-xs text-gray-400">Khóa tồn nguyên tử, lô FEFO & vị trí kệ</div>
                  </div>
                </button>

                <button
                  onClick={() => handleNav('/features/fulfillment')}
                  className="w-full text-left p-3 rounded-xl hover:bg-[#123A52] flex items-start gap-3 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-[#1E647F]/30 text-wood-aqua group-hover:bg-[#1E647F] group-hover:text-white transition-colors">
                    <Truck size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Fulfillment & Đóng gói</div>
                    <div className="text-xs text-gray-400">Wave picking, scan-to-pack chống nhầm</div>
                  </div>
                </button>

                <button
                  onClick={() => handleNav('/features/finance')}
                  className="w-full text-left p-3 rounded-xl hover:bg-[#123A52] flex items-start gap-3 transition-colors group"
                >
                  <div className="p-2 rounded-lg bg-[#1E647F]/30 text-wood-aqua group-hover:bg-[#1E647F] group-hover:text-white transition-colors">
                    <Calculator size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">Kế toán sổ kép & Đối soát</div>
                    <div className="text-xs text-gray-400">Bút toán Debit=Credit & Circuit Breaker</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => handleNav('/demo')} 
            className={`hover:text-white transition-colors py-1 ${currentPath === '/demo' ? 'text-wood-aqua font-semibold' : ''}`}
          >
            Bản Demo
          </button>

          <button 
            onClick={() => handleNav('/pricing')} 
            className={`hover:text-white transition-colors py-1 ${currentPath === '/pricing' ? 'text-wood-aqua font-semibold' : ''}`}
          >
            Bảng giá
          </button>

          <button 
            onClick={() => handleNav('/about')} 
            className={`hover:text-white transition-colors py-1 ${currentPath === '/about' ? 'text-wood-aqua font-semibold' : ''}`}
          >
            Về chúng tôi
          </button>
        </nav>

        {/* Right: Actions (Desktop) */}
        <div className="hidden lg:flex items-center gap-4">
          {session ? (
            <button
              onClick={() => handleNav('/app')}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] shadow-lg shadow-[#1E647F]/40 transition-all flex items-center gap-2"
            >
              <span>Vào Bàn Làm Việc</span>
              <ArrowRight size={15} />
            </button>
          ) : (
            <>
              <button
                onClick={() => handleNav('/login')}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
              >
                <LogIn size={15} className="text-wood-aqua" />
                <span>Đăng nhập</span>
              </button>

              <button
                onClick={() => handleNav('/register')}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] shadow-lg shadow-[#27B4A0]/20 transition-all flex items-center gap-1.5"
              >
                <span>Bắt đầu sử dụng</span>
                <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="lg:hidden flex items-center gap-3">
          <button
            onClick={() => handleNav('/login')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-200 border border-[#1E647F]"
          >
            Đăng nhập
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0C2739] border-b border-[#1E647F]/40 px-5 pt-4 pb-8 space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-2 pb-4 border-b border-gray-800 text-sm">
            <button onClick={() => handleNav('/')} className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-200">
              Trang chủ
            </button>
            <button onClick={() => handleNav('/solutions')} className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-200">
              Giải pháp
            </button>
            <button onClick={() => handleNav('/demo')} className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-wood-aqua font-semibold">
              Bản Demo Sandbox
            </button>
            <button onClick={() => handleNav('/pricing')} className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-200">
              Bảng giá
            </button>
            <button onClick={() => handleNav('/about')} className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-200">
              Về chúng tôi
            </button>
            <button onClick={() => handleNav('/contact')} className="text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-200">
              Liên hệ tư vấn
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3">Tính năng hệ thống</p>
            <button onClick={() => handleNav('/features/orders')} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white">
              • Quản lý đơn hàng đa kênh (OMS)
            </button>
            <button onClick={() => handleNav('/features/inventory')} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white">
              • Kho vận 5 trạng thái (WMS)
            </button>
            <button onClick={() => handleNav('/features/fulfillment')} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white">
              • Fulfillment & Wave Picking
            </button>
            <button onClick={() => handleNav('/features/finance')} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:text-white">
              • Sổ kế toán kép & Đối soát phí sàn
            </button>
          </div>

          <div className="pt-3 border-t border-gray-800 space-y-2.5">
            <button
              onClick={() => handleNav('/login')}
              className="w-full py-3 rounded-xl text-center font-bold text-sm bg-gradient-to-r from-[#1E647F] to-[#27B4A0] text-white flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              <span>Đăng nhập vào Bàn làm việc</span>
            </button>
            <button
              onClick={() => handleNav('/register')}
              className="w-full py-2.5 rounded-xl text-center font-semibold text-xs border border-gray-700 text-gray-300 hover:text-white"
            >
              Khởi tạo tài khoản doanh nghiệp mới
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
