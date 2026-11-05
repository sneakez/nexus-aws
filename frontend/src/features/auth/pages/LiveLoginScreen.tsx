import { useState } from 'react';
import { Boxes, LogIn, Eye, EyeOff } from 'lucide-react';

// Authentication feature screen.
import { useAuth } from '@/providers/AuthProvider';




interface LoginPageProps {
  onNavigate?: (path: string) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError);
      } else {
        handleNav('/app');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đăng nhập được. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  const handleNav = (p: string) => {
    if (onNavigate) {
      onNavigate(p);
    } else if (typeof window !== 'undefined') {
      window.location.href = p;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#081B2C] relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-[#1E647F]/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-[#27B4A0]/15 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md mx-4 py-8">
        <div className="text-center mb-8">
          <div
            onClick={() => handleNav('/')}
            className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E647F] to-[#27B4A0] items-center justify-center shadow-lg shadow-[#1E647F]/50 mb-3 cursor-pointer"
          >
            <Boxes size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Nexus<span className="text-[#27B4A0]">OMS</span></h1>
          <p className="text-xs text-gray-400 mt-1">Prototype vận hành thương mại đa kênh FCAJ</p>
        </div>

        <div className="bg-[#0C2739] border border-[#1E647F]/50 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-2">
              <LogIn size={18} className="text-wood-aqua" />
              <h2 className="text-base font-bold text-white">Đăng nhập tài khoản</h2>
            </div>
          </div>

          {error && (
            <div role="alert" className="mb-4 rounded-xl bg-rose-950/60 border border-rose-800/80 px-4 py-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-gray-300 mb-1.5">Email làm việc</label>
              <input
                id="login-email"
                autoComplete="username"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@congty.vn"
                className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-wood-aqua"
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-xs font-medium text-gray-300">Mật khẩu</label>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  autoComplete="current-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-[#081B2C] border border-[#1E647F]/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-wood-aqua pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#10B981] shadow-lg shadow-[#27B4A0]/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập vào Hệ thống'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
