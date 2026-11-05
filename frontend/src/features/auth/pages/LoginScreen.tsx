import { useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Link2, PackageCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
interface LoginPageProps { onNavigate?: (path: string) => void; }

export function LoginPage({ onNavigate }: LoginPageProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = (path: string) => onNavigate ? onNavigate(path) : window.location.assign(path);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email || !password) { setError('Vui lòng nhập email và mật khẩu.'); return; }
    setLoading(true); setError('');
    try { const result = await signIn(email, password); if (result.error) setError(result.error); else navigate('/app'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không đăng nhập được. Vui lòng thử lại.'); }
    finally { setLoading(false); }
  }

  return <main className="min-h-[100dvh] overflow-hidden bg-[#f4f8f8] text-[#102b3c]">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_12%_8%,rgba(39,180,160,0.20),transparent_30%),radial-gradient(circle_at_78%_0%,rgba(30,100,127,0.18),transparent_28%)]" />
    <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
      <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3 rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-[#1e647f] focus:ring-offset-2"><img src="/branding/nexusoms-shark-transparent.png" alt="Logo cá mập NexusOMS" className="h-9 w-14 object-contain drop-shadow-[0_9px_12px_rgba(8,32,48,0.58)]" /><span><span className="block text-lg font-bold tracking-tight">Nexus<span className="text-[#1e647f]">OMS</span></span><span className="block text-[11px] font-medium text-slate-500">Operations management system</span></span></button>
      <a href="#dang-nhap" className="rounded-lg border border-[#bfd4d8] bg-white/70 px-4 py-2 text-sm font-semibold text-[#174c63] transition hover:border-[#1e647f] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#1e647f]">Đăng nhập</a>
    </header>
    <section className="relative mx-auto grid w-full max-w-7xl gap-10 px-5 pb-14 pt-8 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(23rem,.85fr)] lg:items-center lg:px-10 lg:pb-20 lg:pt-14">
      <div className="max-w-2xl"><p className="mb-5 inline-flex items-center gap-2 rounded-md border border-[#b9d8d4] bg-[#e6f3f0] px-3 py-1.5 text-xs font-semibold text-[#175f62]"><span className="size-1.5 rounded-full bg-[#27b4a0]" />Nền tảng vận hành cho đội bán hàng đa kênh</p><h1 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-[-0.045em] text-[#102b3c] sm:text-5xl lg:text-6xl">Từ đơn sàn đến tồn kho, <span className="text-[#1e647f]">một luồng vận hành rõ ràng.</span></h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">NexusOMS tập trung vào những việc đội vận hành cần nhìn thấy: đơn hàng được đồng bộ, SKU được ánh xạ, tồn kho được giữ chính xác và lợi nhuận được theo dõi theo từng đơn.</p>
        <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">{[[Link2, 'Kết nối sàn', 'Ánh xạ SKU trước khi nhận đơn'], [PackageCheck, 'Kiểm soát tồn', 'Theo dõi tồn thực tế và khả dụng'], [ShieldCheck, 'Vận hành an toàn', 'Giữ tồn trước khi xuất kho']].map(([Icon, title, detail]) => <article key={String(title)} className="rounded-xl border border-[#dce8e9] bg-white/70 p-4 shadow-[0_12px_32px_rgba(21,64,79,0.05)]"><Icon size={19} className="text-[#1e647f]" aria-hidden="true" /><h2 className="mt-3 text-sm font-bold text-[#173c50]">{title as string}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{detail as string}</p></article>)}</div>
        <section className="mt-10 max-w-xl border-l-2 border-[#27b4a0] pl-4" aria-label="Luồng vận hành"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#1e647f]">Luồng vận hành</p><p className="mt-2 text-sm font-medium text-[#315363]">Kết nối sàn <span className="mx-1 text-slate-400">→</span> Ánh xạ SKU <span className="mx-1 text-slate-400">→</span> Webhook <span className="mx-1 text-slate-400">→</span> Giữ tồn <span className="mx-1 text-slate-400">→</span> Theo dõi đơn</p></section>
      </div>
      <section id="dang-nhap" className="rounded-2xl border border-[#d6e4e6] bg-white p-6 shadow-[0_24px_70px_rgba(16,54,75,0.14)] sm:p-8" aria-labelledby="login-title"><div className="flex items-start justify-between gap-4 border-b border-[#e7eff0] pb-5"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#1e647f]">Khu vực làm việc</p><h2 id="login-title" className="mt-2 text-2xl font-bold tracking-tight text-[#102b3c]">Đăng nhập hệ thống</h2></div><span className="grid size-10 place-items-center rounded-xl bg-[#eef7f5] text-[#1e647f]"><ArrowRight size={19} /></span></div><p className="mt-4 text-sm leading-6 text-slate-600">Dùng tài khoản đã được quản trị viên cấp quyền để vào không gian vận hành.</p>{error && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4"><label className="block text-sm font-semibold text-[#25475a]">Email làm việc<input id="login-email" autoComplete="username" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="ban@congty.vn" disabled={loading} className="mt-1.5 w-full rounded-lg border border-[#cbdde0] bg-white px-3.5 py-3 text-sm text-[#102b3c] outline-none transition placeholder:text-slate-400 focus:border-[#1e647f] focus:ring-2 focus:ring-[#1e647f]/15 disabled:bg-slate-50" /></label><label className="block text-sm font-semibold text-[#25475a]">Mật khẩu<span className="relative mt-1.5 block"><input id="login-password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••" disabled={loading} className="w-full rounded-lg border border-[#cbdde0] bg-white px-3.5 py-3 pr-11 text-sm text-[#102b3c] outline-none transition placeholder:text-slate-400 focus:border-[#1e647f] focus:ring-2 focus:ring-[#1e647f]/15 disabled:bg-slate-50" /><button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:text-[#1e647f] focus:outline-none focus:ring-2 focus:ring-[#1e647f]">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label><button type="submit" disabled={loading} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e647f] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_22px_rgba(30,100,127,0.24)] transition hover:-translate-y-0.5 hover:bg-[#174e64] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55">{loading ? 'Đang xác thực…' : <>Vào không gian làm việc <ArrowRight size={17} /></>}</button></form>
      </section>
    </section>
    <footer className="relative mx-auto flex w-full max-w-7xl flex-col gap-2 border-t border-[#d9e6e7] px-5 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><span>© 2026 NexusOMS · MVP vận hành đa kênh</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[#27b4a0]" />Xác thực bằng Supabase</span></footer>
  </main>;
}
