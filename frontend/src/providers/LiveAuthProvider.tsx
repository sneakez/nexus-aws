/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole, Tenant, TenantMembership, TenantRole } from '@/types';
import { sessionService } from '@/services/session.service';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  authError: string | null;
  sessionNotice: string | null;
  memberships: TenantMembership[];
  activeTenant: Tenant | null;
  activeRole: TenantRole | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; user: User | null }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  switchTenant: (id: string) => void;
  switchRole: (role: TenantRole) => void;
  createTenantOnboarding: (name: string, slug?: string) => Promise<{ tenant: Tenant | null; error: string | null }>;
  reloadUser: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_STARTED_AT_KEY = 'nexusoms.auth.startedAt';
const SESSION_LAST_ACTIVE_AT_KEY = 'nexusoms.auth.lastActiveAt';
const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_WRITE_INTERVAL_MS = 15 * 1000;
const SESSION_CHECK_INTERVAL_MS = 30 * 1000;

export function isSessionPolicyExpired(now: number, startedAt: number, lastActiveAt: number) {
  return now - startedAt >= SESSION_MAX_AGE_MS
    || now - lastActiveAt >= SESSION_IDLE_TIMEOUT_MS;
}

function clearSessionClock() {
  localStorage.removeItem(SESSION_STARTED_AT_KEY);
  localStorage.removeItem(SESSION_LAST_ACTIVE_AT_KEY);
}

function getOrCreateSessionClock(now: number) {
  const storedStartedAt = Number(localStorage.getItem(SESSION_STARTED_AT_KEY));
  const storedLastActiveAt = Number(localStorage.getItem(SESSION_LAST_ACTIVE_AT_KEY));
  const startedAt = Number.isFinite(storedStartedAt) && storedStartedAt > 0 && storedStartedAt <= now
    ? storedStartedAt : now;
  const lastActiveAt = Number.isFinite(storedLastActiveAt)
    && storedLastActiveAt >= startedAt && storedLastActiveAt <= now
    ? storedLastActiveAt : now;
  localStorage.setItem(SESSION_STARTED_AT_KEY, String(startedAt));
  localStorage.setItem(SESSION_LAST_ACTIVE_AT_KEY, String(lastActiveAt));
  return { startedAt, lastActiveAt };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const verifiedSession = useRef<Session | null>(null);
  const revision = useRef(0);
  const request = useRef<AbortController | null>(null);
  const expiring = useRef(false);

  const expireSession = useCallback(async () => {
    if (expiring.current) return;
    expiring.current = true;
    revision.current++;
    request.current?.abort();
    verifiedSession.current = null;
    clearSessionClock();
    setSession(null);
    setProfile(null);
    setLoading(false);
    setAuthError(null);
    setSessionNotice('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    await supabase.auth.signOut({ scope: 'local' });
  }, []);

  const applySession = useCallback(async (next: Session | null) => {
    const current = ++revision.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const sameUser = next !== null && verifiedSession.current?.user.id === next.user.id;
    if (!sameUser) {
      verifiedSession.current = null;
      setLoading(true);
      setSession(null);
      setProfile(null);
    }
    setAuthError(null);
    try {
      if (!next) return;
      const now = Date.now();
      const clock = getOrCreateSessionClock(now);
      if (isSessionPolicyExpired(now, clock.startedAt, clock.lastActiveAt)) {
        await expireSession();
        return;
      }
      const verified = await sessionService.me(next.access_token, controller.signal);
      if (verified.userId !== next.user.id) throw new Error('Tài khoản không khớp phiên đăng nhập.');
      if (controller.signal.aborted || current !== revision.current) return;
      const role = verified.roles.includes('admin') ? 'admin'
        : verified.roles.includes('manager') ? 'manager' : 'warehouse';
      const fullName = next.user.user_metadata?.full_name;
      setProfile({
        id: next.user.id,
        email: next.user.email ?? '',
        full_name: typeof fullName === 'string' && fullName.trim() ? fullName : next.user.email ?? 'Tài khoản',
        role, is_active: true,
        created_at: next.user.created_at,
        updated_at: next.user.updated_at ?? next.user.created_at,
      });
      verifiedSession.current = next;
      setSession(next);
    } catch (cause) {
      if (!controller.signal.aborted && current === revision.current) {
        verifiedSession.current = null;
        setSession(null);
        setProfile(null);
        setAuthError(cause instanceof Error ? cause.message : 'Không xác thực được tài khoản.');
      }
    } finally {
      if (!controller.signal.aborted && current === revision.current) setLoading(false);
    }
  }, [expireSession]);

  useEffect(() => {
    let disposed = false;
    let eventReceived = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      eventReceived = true;
      const current = verifiedSession.current;
      if (next && current?.user.id === next.user.id
        && current.access_token === next.access_token
        && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) return;
      revision.current++;
      request.current?.abort();
      if (!next || next.user.id !== current?.user.id) {
        verifiedSession.current = null;
        setSession(null);
        setProfile(null);
        setLoading(true);
      }
      // Supabase auth callbacks run under its session lock.
      clearTimeout(timer);
      timer = setTimeout(() => { if (!disposed) void applySession(next); }, 0);
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (disposed || eventReceived) return;
      if (error) {
        setAuthError('Không khôi phục được phiên đăng nhập.');
        setLoading(false);
      } else void applySession(data.session);
    }).catch(() => {
      if (!disposed && !eventReceived) {
        setAuthError('Không khôi phục được phiên đăng nhập.');
        setLoading(false);
      }
    });
    return () => {
      disposed = true;
      request.current?.abort();
      clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, [applySession]);

  useEffect(() => {
    if (!session) return;
    let lastPersistedAt = Number(localStorage.getItem(SESSION_LAST_ACTIVE_AT_KEY)) || Date.now();

    const checkExpiry = () => {
      const now = Date.now();
      const clock = getOrCreateSessionClock(now);
      if (isSessionPolicyExpired(now, clock.startedAt, clock.lastActiveAt)) void expireSession();
    };
    const recordActivity = () => {
      const now = Date.now();
      const clock = getOrCreateSessionClock(now);
      if (isSessionPolicyExpired(now, clock.startedAt, clock.lastActiveAt)) {
        void expireSession();
        return;
      }
      if (now - lastPersistedAt < ACTIVITY_WRITE_INTERVAL_MS) return;
      lastPersistedAt = now;
      localStorage.setItem(SESSION_LAST_ACTIVE_AT_KEY, String(now));
    };
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') checkExpiry();
    };
    const activityEvents: Array<keyof WindowEventMap> = ['click', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => window.addEventListener(event, recordActivity, { passive: true }));
    document.addEventListener('visibilitychange', checkWhenVisible);
    const timer = window.setInterval(checkExpiry, SESSION_CHECK_INTERVAL_MS);
    checkExpiry();
    return () => {
      activityEvents.forEach(event => window.removeEventListener(event, recordActivity));
      document.removeEventListener('visibilitychange', checkWhenVisible);
      window.clearInterval(timer);
    };
  }, [expireSession, session]);

  async function reloadUser() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      await applySession(null);
      setAuthError('Không khôi phục được phiên đăng nhập.');
      return;
    }
    await applySession(data.session);
  }
  async function signIn(email: string, password: string) {
    expiring.current = false;
    clearSessionClock();
    setSessionNotice(null);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (!error) getOrCreateSessionClock(Date.now());
    return { error: error?.message ?? null };
  }
  async function signOut() {
    expiring.current = false;
    clearSessionClock();
    setSessionNotice(null);
    await applySession(null);
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) setAuthError('Không xóa được phiên đăng nhập. Vui lòng thử lại.');
  }
  async function resetPasswordForEmail(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/login',
    });
    return { error: error?.message ?? null };
  }
  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  }
  return <AuthContext.Provider value={{
    session, user: session?.user ?? null, profile, loading, authError, sessionNotice,
    memberships: [], activeTenant: null, activeRole: profile?.role ?? null,
    signIn, signOut, resetPasswordForEmail, updatePassword, reloadUser,
    signUp: async () => ({ error: 'Liên hệ quản trị viên để cấp tài khoản.', user: null }),
    switchTenant: () => {}, switchRole: () => {},
    createTenantOnboarding: async () => ({ tenant: null, error: 'Tổ chức do quản trị viên cấu hình.' }),
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

export function useRole() {
  const { profile, activeRole } = useAuth();
  const isAdmin = activeRole === 'admin';
  const isManager = activeRole === 'manager' || isAdmin;
  return {
    role: (profile?.role ?? null) as UserRole | null, tenantRole: activeRole,
    isAdmin, isManager, isWarehouse: activeRole === 'warehouse',
    isFinance: isManager, isGrowth: isAdmin, isViewer: !activeRole,
    canDelete: isAdmin, canManageFinance: isManager,
    canManageSettings: isAdmin, canManageUsers: isAdmin,
  };
}
