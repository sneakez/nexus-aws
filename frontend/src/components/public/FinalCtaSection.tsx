import { ArrowRight, Play, CheckCircle2, ShieldCheck } from 'lucide-react';

interface FinalCtaSectionProps {
  onNavigate: (path: string) => void;
}

export function FinalCtaSection({ onNavigate }: FinalCtaSectionProps) {
  return (
    <section className="py-24 bg-gradient-to-b from-[#081B2C] via-[#0C2739] to-[#05121E] text-white relative overflow-hidden border-t border-[#1E647F]/40">
      {/* Background Lighting Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-[#1E647F]/20 via-[#27B4A0]/15 to-transparent rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Subtle Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#123A52]/90 border border-[#1E647F]/60 text-xs font-semibold text-wood-aqua mb-6 shadow-sm">
          <ShieldCheck size={14} className="text-[#27B4A0]" />
          KIẾN TRÚC DOANH NGHIỆP BỀN VỮNG
        </div>

        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-6 max-w-3xl mx-auto">
          Sẵn Sàng Nâng Cấp Hệ Thống Quản Trị Kho Vận & Đơn Hàng?
        </h2>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed mb-10">
          Thiết lập không gian làm việc doanh nghiệp trong vài phút hoặc trực tiếp trải nghiệm bản Demo Sandbox với đầy đủ kịch bản vận hành thực tế.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <button
            onClick={() => onNavigate('/register')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#229987] shadow-xl shadow-[#27B4A0]/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
          >
            <span>Bắt Đầu Sử Dụng Miễn Phí</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onNavigate('/demo')}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl font-semibold text-sm text-metal-mist bg-[#123A52]/80 hover:bg-[#123A52] border border-[#1E647F]/60 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <Play size={16} className="text-wood-aqua fill-wood-aqua" />
            <span>Trải Nghiệm Bản Demo (Sandbox)</span>
          </button>
        </div>

        {/* Reassurance points */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[#27B4A0]" />
            <span>Không yêu cầu thẻ tín dụng</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[#27B4A0]" />
            <span>Khởi tạo workspace trong 2 phút</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[#27B4A0]" />
            <span>Bảo mật dữ liệu cấp cơ sở dữ liệu</span>
          </div>
        </div>
      </div>
    </section>
  );
}
