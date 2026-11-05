import { LoginPage } from '@/features/auth';
import { useAuth } from '@/providers/AuthProvider';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { AppShell } from '../layout/LiveAppShell';
import { useAppRouter } from './useAppRouter';
export function AppRouter() {
  const { path, navigate } = useAppRouter();

const {
  session,
  loading,
  activeRole,
  authError,
  signOut,
} = useAuth();
  if (loading) return <FullPageSpinner label="Đang khởi tạo hệ thống..." />;
  if (authError) {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
        <h1 className="text-lg font-semibold">Không thể xác thực tài khoản</h1>
        <p role="alert" className="mt-2 text-sm text-red-700">
          {authError}
        </p>
        <button
          type="button"
          onClick={() => { void signOut(); }}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-white"
        >
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
  if (path === '/' || path === '/login') {
    if (session) {
      navigate('/app', true);
      return null;
    }
    return <LoginPage onNavigate={next => navigate(next === '/login' ? '/login' : '/app')} />;
  }

  if (path.startsWith('/app')) {
    if (!session) return <LoginPage onNavigate={next => navigate(next === '/login' ? '/login' : '/app')} />;
    if (!activeRole) {
      return (
        <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
          <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">Chưa có workspace MVP</h1>
            <p className="mt-2 text-sm text-slate-600">Tài khoản cần được gán vào một workspace trước khi sử dụng prototype.</p>
          </div>
        </div>
      );
    }
    return <AppShell />;
  }

  navigate('/app', true);
  return null;
}
