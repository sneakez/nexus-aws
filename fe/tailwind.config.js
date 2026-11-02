/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ocean Premium — Nexus Edition
        ocean: {
          deep: '#081B2C',
          midnight: '#123A52',
          teal: '#1E647F',
          jade: '#27B4A0',
          silver: '#D9E3E8',
          pearl: '#F4F8FA',
        },
        water: {
          deep: '#081B2C',      // Biển sâu nguồn cội (Deep Ocean)
          midnight: '#123A52',  // Đêm thẳm tĩnh lặng (Midnight Blue)
          teal: '#1E647F',      // Nước nguồn chuyển động (Ocean Teal)
          cerulean: '#0284C7',  // Sóng biển động lực (Cerulean Blue)
          foam: '#F4F8FA',      // Bọt nước trong trẻo (Pearl White)
          50: '#F0F7FA',
          100: '#DCECF3',
          200: '#BBD9E7',
          300: '#88BDD5',
          400: '#559EBF',
          500: '#3281A3',
          600: '#1E647F',
          700: '#164E65',
          800: '#123A52',
          900: '#0C2839',
          950: '#081B2C',
        },
        metal: {
          mist: '#D9E3E8',      // Sương bạc ánh kim (Silver Mist)
          pearl: '#F8FAFC',     // Trắng ngọc trai thanh khiết (Pearl White)
          platinum: '#E2E8F0',  // Bạch kim sáng
          slate: '#64748B',     // Đá kim loại
          steel: '#334155',     // Thép tôi luyện
        },
        wood: {
          aqua: '#14B8A6',      // Ngọc bích thủy mộc sinh sôi (Jade Aqua)
          emerald: '#10B981',   // Tăng trưởng doanh thu (Growth Emerald)
          leaf: '#059669',      // Tán lá vững bền
        },
        ink: {
          50: 'var(--color-ink-50)',
          100: 'var(--color-ink-100)',
          200: 'var(--color-ink-200)',
          300: 'var(--color-ink-300)',
          400: 'var(--color-ink-400)',
          500: 'var(--color-ink-500)',
          600: 'var(--color-ink-600)',
          700: 'var(--color-ink-700)',
          800: 'var(--color-ink-800)',
          900: 'var(--color-ink-900)',
          950: 'var(--color-ink-950)',
        },
        brand: {
          50: 'var(--brand-50)',
          100: 'var(--brand-100)',
          200: 'var(--brand-200)',
          300: 'var(--brand-300)',
          400: 'var(--brand-400)',
          500: 'var(--brand-500)',
          600: 'var(--brand-600)',
          700: 'var(--brand-700)',
          800: 'var(--brand-800)',
          900: 'var(--brand-900)',
          950: 'var(--brand-950)',
        },
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'ui-monospace', 'monospace'],
        num: ['"JetBrains Mono"', '"Plus Jakarta Sans"', 'ui-monospace', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in': 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'backdrop': 'backdropIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bar-grow': 'barGrow 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
