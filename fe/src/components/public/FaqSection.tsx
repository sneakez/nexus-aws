import { useState } from 'react';
import { ChevronDown, HelpCircle, ArrowRight } from 'lucide-react';

interface FaqSectionProps {
  onNavigate: (path: string) => void;
}

export function FaqSection({ onNavigate }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'NexusOMS khác biệt như thế nào so với các phần mềm bán hàng thông thường?',
      a: 'Phần lớn phần mềm bán hàng trên thị trường thực hiện trừ tồn kho theo từng bước rời rạc trên ứng dụng, dễ dẫn đến tình trạng bán âm khi có sự kiện Flash Sale hoặc nhiều sàn cùng đổ đơn. NexusOMS chuyển toàn bộ logic kiểm tra và giữ hàng vào trong cơ sở dữ liệu PostgreSQL dưới dạng giao dịch nguyên tử (Atomic Transaction). Nếu hàng khả dụng không đủ, yêu cầu sẽ lập tức bị từ chối an toàn, ngăn chặn 100% tình trạng bán âm.'
    },
    {
      q: 'Doanh nghiệp có thể quản lý nhiều kho hàng cùng lúc không?',
      a: 'Có. NexusOMS hỗ trợ mô hình đa kho phân tán (Kho tổng, Chi nhánh, Kho ký gửi, Kho 3PL). Đơn hàng từ các kênh bán sẽ được tự động điều hướng về kho còn đủ hàng và gần khách hàng nhất để tối ưu thời gian và chi phí giao vận.'
    },
    {
      q: 'Tính năng kế toán sổ kép (Double-Entry Bookkeeping) mang lại giá trị gì?',
      a: 'Mỗi sự kiện phát sinh như bán hàng, xuất kho hay khấu trừ phí sàn đều tự động sinh ra cặp bút toán Nợ (Debit) và Có (Credit) cân đối. Điều này giúp chủ doanh nghiệp và kế toán dễ dàng đối soát với báo cáo quyết toán của sàn Shopee, TikTok Shop, Lazada mà không mất nhiều ngày tính toán thủ công trên Excel.'
    },
    {
      q: 'Chúng tôi có thể trải nghiệm thử trước khi đưa vào vận hành thật không?',
      a: 'Hoàn toàn được. Bạn có thể truy cập Bản Demo Sandbox trực tiếp trên trình duyệt mà không cần cài đặt hay nhập thông tin thẻ. Bản Demo được nạp sẵn dữ liệu mô phỏng thực tế về đơn hàng, kho bãi và giao dịch đối soát để bạn tự do trải nghiệm.'
    },
    {
      q: 'Thời gian triển khai và chuyển đổi dữ liệu mất bao lâu?',
      a: 'Nhờ cấu trúc dữ liệu chuẩn hóa, doanh nghiệp có thể nhập danh mục sản phẩm, tồn kho ban đầu qua tệp Excel/CSV và kích hoạt kết nối các gian hàng thương mại điện tử chỉ trong vòng 1-2 ngày làm việc.'
    }
  ];

  return (
    <section className="py-24 bg-white text-[#081B2C] border-t border-[#D9E3E8]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F4F8FA] border border-[#D9E3E8] text-xs font-semibold text-[#1E647F] mb-4">
            <HelpCircle size={14} className="text-[#27B4A0]" />
            GIẢI ĐÁP THẮC MẮC
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#081B2C] tracking-tight mb-4">
            Những Câu Hỏi Thường Gặp
          </h2>
          <p className="text-base text-[#4A6070]">
            Những thông tin cần biết trước khi lựa chọn NexusOMS làm nền tảng vận hành cho doanh nghiệp của bạn.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div 
                key={index}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen 
                    ? 'border-[#1E647F] bg-[#F4F8FA] shadow-sm' 
                    : 'border-[#E0EBF0] bg-white hover:border-[#B5CBD7]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full text-left p-6 flex items-center justify-between gap-4 font-bold text-base text-[#081B2C]"
                >
                  <span className="leading-snug">{faq.q}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 flex-shrink-0 ${
                    isOpen ? 'bg-[#1E647F] text-white rotate-180' : 'bg-[#E8F0F4] text-[#4A6070]'
                  }`}>
                    <ChevronDown size={18} />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-[#4A6070] leading-relaxed border-t border-[#E8F0F4] pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Help Box */}
        <div className="mt-12 text-center p-6 rounded-2xl bg-[#F4F8FA] border border-[#E0EBF0] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h4 className="text-sm font-bold text-[#081B2C]">Bạn còn câu hỏi cần tư vấn thêm?</h4>
            <p className="text-xs text-[#5E7688]">Đội ngũ kỹ thuật và chuyên viên vận hành luôn sẵn sàng hỗ trợ.</p>
          </div>
          <button
            onClick={() => onNavigate('/contact')}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#123A52] hover:bg-[#081B2C] transition-colors inline-flex items-center gap-1.5 flex-shrink-0"
          >
            Liên hệ với chúng tôi <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
