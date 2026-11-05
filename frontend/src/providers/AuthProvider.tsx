/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isMockMode } from '@/lib/config';
import { omsStore } from '@/stores/omsStore';
import type { Profile, UserRole, Tenant, TenantMembership, TenantRole } from '@/types';
import { getBackendSession } from '@/lib/backendSession';
interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  authError: string | null;
  memberships: TenantMembership[];
  activeTenant: Tenant | null;
  activeRole: TenantRole | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; user: User | null }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  switchTenant: (tenantId: string) => void;
  switchRole: (role: TenantRole) => void;
  createTenantOnboarding: (name: string, slug?: string) => Promise<{ tenant: Tenant | null; error: string | null }>;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACTIVE_TENANT_KEY = 'nexus_active_tenant';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [activeRole, setActiveRole] = useState<TenantRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  // Sync mock store state when in mock mode
  const syncFromMockStore = useCallback(() => {
    if (!isMockMode()) return;
    const snap = omsStore.getSnapshot();
    const currTenant = omsStore.getActiveTenant();
    const currRole = omsStore.getActiveRole();

    setActiveTenant(currTenant);
    setActiveRole(currRole);
    setMemberships(snap.memberships);

    const activeProfile = snap.profiles.find(p => p.id === snap.activeUserId);
    const isMvpRole = (['owner', 'manager', 'warehouse'] as TenantRole[]).includes(currRole);
    if (!activeProfile || !omsStore.getExecutionContext() || !isMvpRole) {
      setProfile(null);
      setSession(null);
      setLoading(false);
      return;
    }
    setProfile(activeProfile);

    setSession({
      user: {
        id: activeProfile.id,
        email: activeProfile.email,
        app_metadata: {},
        user_metadata: { full_name: activeProfile?.full_name },
        aud: 'authenticated',
        created_at: new Date().toISOString()
      },
      access_token: 'mock-token',
      expires_at: 9999999999,
      token_type: 'bearer',
      refresh_token: 'mock-refresh'
    } as unknown as Session);

    setLoading(false);
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    if (isMockMode()) {
      syncFromMockStore();
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) {
      setProfile(null);
    } else {
      setProfile(data as Profile);
    }
  }, [syncFromMockStore]);

  const loadMemberships = useCallback(async (userId: string) => {
  if (isMockMode()) {
    syncFromMockStore();
    return;
  }

  // Backend hiện dùng một tổ chức, không có tenant memberships.
  setMemberships([]);
  setActiveTenant(null);
  setActiveRole(null);
  localStorage.removeItem(ACTIVE_TENANT_KEY);

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    throw new Error('Không tìm thấy phiên đăng nhập hợp lệ.');
  }

  const backendSession = await getBackendSession(
    data.session.access_token,
  );

  if (backendSession.userId !== userId) {
    throw new Error('Tài khoản backend không khớp phiên đăng nhập.');
  }

  const role = backendSession.roles.includes('admin')
    ? 'admin'
    : backendSession.roles.includes('manager')
      ? 'manager'
      : 'warehouse';

  setActiveRole(role);
}, [syncFromMockStore]);

  const reloadUser = useCallback(async () => {
    if (isMockMode()) {
      syncFromMockStore();
      return;
    }
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session) {
      await Promise.all([
        loadProfile(data.session.user.id),
        loadMemberships(data.session.user.id),
      ]);
    }
  }, [loadProfile, loadMemberships, syncFromMockStore]);

  useEffect(() => {
  if (isMockMode()) {
    syncFromMockStore();

    return omsStore.subscribe((event) => {
      if (
        event?.topic === 'ROLE_SWITCHED'
        || event?.topic === 'DATABASE_RESET'
      ) {
        syncFromMockStore();
      }
    });
  }

  let disposed = false;
  let revision = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clearIdentity() {
    setSession(null);
    setProfile(null);
    setMemberships([]);
    setActiveTenant(null);
    setActiveRole(null);
    localStorage.removeItem(ACTIVE_TENANT_KEY);
  }

  async function applySession(
    nextSession: Session | null,
    currentRevision: number,
  ) {
    if (disposed || currentRevision !== revision) return;

    setLoading(true);
    setAuthError(null);
    clearIdentity();

    if (!nextSession) {
      setLoading(false);
      return;
    }

    try {
      const backendSession = await getBackendSession(
        nextSession.access_token,
      );

      if (backendSession.userId !== nextSession.user.id) {
        throw new Error('Tài khoản backend không khớp phiên đăng nhập.');
      }

      const { data: nextProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', nextSession.user.id)
        .maybeSingle();

      if (error) {
        throw new Error('Không tải được hồ sơ tài khoản.');
      }

      if (!nextProfile || nextProfile.is_active !== true) {
        throw new Error('Tài khoản chưa được kích hoạt hoặc đã bị khóa.');
      }

      if (disposed || currentRevision !== revision) return;

      const role = backendSession.roles.includes('admin')
        ? 'admin'
        : backendSession.roles.includes('manager')
          ? 'manager'
          : 'warehouse';

      setProfile({ ...nextProfile, role } as Profile);
      setActiveRole(role);
      setSession(nextSession);
    } catch (error) {
      if (disposed || currentRevision !== revision) return;

      clearIdentity();
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Không xác thực được quyền tài khoản.',
      );
    } finally {
      if (!disposed && currentRevision === revision) {
        setLoading(false);
      }
    }
  }

  const initialRevision = revision;

  const { data: subscription } = supabase.auth.onAuthStateChange(
    (_event, nextSession) => {
      const currentRevision = ++revision;

      clearTimeout(timer);
      clearIdentity();
      setLoading(true);

      timer = setTimeout(() => {
        void applySession(nextSession, currentRevision);
      }, 0);
    },
  );

  void supabase.auth.getSession().then(({ data, error }) => {
    if (disposed || revision !== initialRevision) return;

    if (error) {
      clearIdentity();
      setAuthError('Không khôi phục được phiên đăng nhập.');
      setLoading(false);
      return;
    }

    void applySession(data.session, initialRevision);
  }).catch(() => {
    if (disposed || revision !== initialRevision) return;

    clearIdentity();
    setAuthError('Không khôi phục được phiên đăng nhập.');
    setLoading(false);
  });

  return () => {
    disposed = true;
    revision++;
    clearTimeout(timer);
    subscription.subscription.unsubscribe();
  };
}, [syncFromMockStore]);

  async function signIn(email: string, password: string) {
    if (isMockMode()) {
      const result = omsStore.signInDemoUser(email);
      if (!result.success) return { error: result.error || 'Không đăng nhập được tài khoản demo' };
      syncFromMockStore();
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signUp(email: string, password: string, fullName: string) {
    if (isMockMode()) {
      omsStore.setActiveRole('owner');
      syncFromMockStore();
      return {
        error: null,
        user: { id: `usr_${Date.now()}`, email } as unknown as User
      };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message, user: null };
    return { error: null, user: data.user };
  }

  async function resetPasswordForEmail(email: string) {
    if (isMockMode()) {
      return { error: null };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function updatePassword(newPassword: string) {
    if (isMockMode()) {
      return { error: null };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return { error: null };
  }

  function switchTenant(tenantId: string) {
    if (isMockMode()) {
      omsStore.setActiveTenant(tenantId);
      syncFromMockStore();
      return;
    }
    const target = memberships.find((m) => m.tenant_id === tenantId);
    if (!target) return;
    setActiveTenant(target.tenant ?? null);
    localStorage.setItem(ACTIVE_TENANT_KEY, tenantId);
  }

  function switchRole(role: TenantRole) {
    if (isMockMode()) {
      omsStore.setActiveRole(role);
      syncFromMockStore();
    }
  }

  async function signOut() {
    if (isMockMode()) {
      omsStore.signOutDemoUser();
      setSession(null);
      setProfile(null);
      setActiveTenant(null);
      return;
    }
    await supabase.auth.signOut();
  }

  async function createTenantOnboarding(name: string, slug?: string) {
    if (isMockMode()) {
      const newTenant: Tenant = {
        id: `tenant_${Date.now()}`,
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      omsStore.setActiveTenant(newTenant.id);
      syncFromMockStore();
      return { tenant: newTenant, error: null };
    }

    try {
      if (!session) return { tenant: null, error: 'Chua dang nhap' };

      const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert({ name, slug: finalSlug })
        .select()
        .single();

      if (tenantError) return { tenant: null, error: tenantError.message };

      const { error: membershipError } = await supabase
        .from('tenant_memberships')
        .insert({
          tenant_id: tenantData.id,
          user_id: session.user.id,
          role: 'owner',
          status: 'active',
        });

      if (membershipError) return { tenant: null, error: membershipError.message };

      await loadMemberships(session.user.id);
      setActiveTenant(tenantData as Tenant);
      localStorage.setItem(ACTIVE_TENANT_KEY, tenantData.id);
      return { tenant: tenantData as Tenant, error: null };
    } catch (err: unknown) {
      return { tenant: null, error: (err as Error).message || 'Loi tao to chuc' };
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        authError,
        memberships,
        activeTenant,
        activeRole,
        signIn,
        signUp,
        signOut,
        resetPasswordForEmail,
        updatePassword,
        switchTenant,
        switchRole,
        createTenantOnboarding,
        reloadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useRole(): {
  role: UserRole | null;
  tenantRole: TenantRole | null;
  isAdmin: boolean;
  isManager: boolean;
  isWarehouse: boolean;
  isFinance: boolean;
  isGrowth: boolean;
  isViewer: boolean;
  canDelete: boolean;
  canManageFinance: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
} {
  const { profile, activeRole } = useAuth();
  const role = profile?.role ?? null;
  const tenantRole = activeRole;
  const isAdmin = tenantRole === 'owner' || tenantRole === 'admin';
  const isManager = tenantRole === 'manager' || isAdmin;
  const isWarehouse = tenantRole === 'warehouse';
  const isFinance = tenantRole === 'finance' || isAdmin;
  const isGrowth = tenantRole === 'growth' || isAdmin;
  const isViewer = tenantRole === 'viewer';

  return {
    role,
    tenantRole,
    isAdmin,
    isManager,
    isWarehouse,
    isFinance,
    isGrowth,
    isViewer,
    canDelete: tenantRole === 'owner',
    canManageFinance: isFinance || isManager,
    canManageSettings: isAdmin,
    canManageUsers: isAdmin,
  };
}
