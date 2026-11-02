import { Layers, Package, Calculator, ArrowRight, Check } from 'lucide-react';

interface ProductOverviewSectionProps {
  onNavigate: (path: string) => void;
}

export function ProductOverviewSection({ onNavigate }: ProductOverviewSectionProps) {
  const pillars = [
    {
      icon: Layers,
      title: 'Đơn Hàng Đa Kênh (OMS)',
      subtitle: 'Hợp nhất Shopee, TikTok, Lazada & Website D2C',
      desc: 'Tập trung mọi đơn hàng vào một giao diện điều phối duy nhất. Tự động nhận diện và chặn trùng lặp đơn từ webhook sàn TMĐT.',
      points: [
        'Khử trùng lặp đơn bằng Idempotency Key',
        'Tự động định tuyến kho xuất hàng tối ưu phí ship',
        'Cơ chế hủy đơn và hoàn tồn an toàn một lần'
      ],
      link: '/features/orders',
      accentColor: 'text-[#1E647F]'
    },
    {
      icon: Package,
      title: 'Kho Vận 5 Trạng Thái (WMS)',
      subtitle: 'Physical, Reserved, Available, Unavailable, Incoming',
      desc: 'Định nghĩa chính xác số lượng hàng hóa saleable, ngăn chặn hoàn toàn rủi ro bán âm đa sàn trong các sự kiện Mega Sale.',
      points: [
        'Khóa tồn nguyên tử ở cấp cơ sở dữ liệu',
        'Quản lý theo lô sản xuất FEFO & Serial/IMEI',
        'Sắp xếp hàng hóa theo tọa độ Aisle - Rack - Shelf - Bin'
      ],
      link: '/features/inventory',
      accentColor: 'text-[#27B4A0]'
    },
    {
      icon: Calculator,
      title: 'Tài Chính & Sổ Kép',
      subtitle: 'Hạch toán tự động chuẩn mực kế toán',
      desc: 'Mỗi giao dịch đơn hàng số và nhập kho tự động sinh bút toán kép Debit = Credit cân bằng, đối soát chi tiết hoa hồng sàn.',
      points: [
        'Kiểm tra cân đối tổng Nợ == tổng Có',
        'Đối soát chi phí sàn, phí vận chuyển và công nợ',
        'Margin Circuit Breaker cảnh báo khi biên lợi nhuận âm'
      ],
      link: '/features/finance',
      accentColor: 'text-emerald-600'
    }
  ];

  return (
    <section className="py-24 bg-[#F4F8FA] text-[#18252E] border-y border-[#D9E3E8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1E647F] bg-[#EBF1F5] px-3.5 py-1.5 rounded-full border border-[#D9E3E8]">
            HỆ SINH THÁI ĐỒNG BỘ
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#081B2C] tracking-tight mt-4 mb-4">
            3 Khối Vận Hành Cốt Lõi Được Hợp Nhất Hoàn Toàn
          </h2>
          <p className="text-base text-[#566E7D] leading-relaxed">
            Xóa bỏ sự phân mảnh dữ liệu giữa bộ phận kinh doanh, nhân viên kho bãi và kế toán tài chính. 
            Một nguồn dữ liệu tin cậy duy nhất cho toàn bộ doanh nghiệp.
          </p>
        </div>

        {/* 3 Elevated Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div 
                key={idx}
                className="rounded-2xl bg-white border border-[#D9E3E8] p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:border-[#B0C2CC]"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#EBF1F5] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                    <Icon size={24} className={p.accentColor} />
                  </div>

                  <h3 className="text-xl font-bold text-[#081B2C] mb-1">{p.title}</h3>
                  <div className="text-xs font-semibold text-[#566E7D] mb-4">{p.subtitle}</div>
                  
                  <p className="text-sm text-[#566E7D] leading-relaxed mb-6">
                    {p.desc}
                  </p>

                  <div className="space-y-3 pt-4 border-t border-[#EBF1F5]">
                    {p.points.map((pt, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-[#3D525F]">
                        <Check size={15} className="text-[#27B4A0] mt-0.5 shrink-0" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-[#EBF1F5]">
                  <button
                    onClick={() => onNavigate(p.link)}
                    className="text-xs font-bold text-[#1E647F] hover:text-[#081B2C] inline-flex items-center gap-1.5 transition-colors group-hover:underline"
                  >
                    <span>Khám phá chi tiết</span>
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
