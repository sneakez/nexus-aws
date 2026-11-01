/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isMockMode } from '@/lib/config';
import { omsStore } from '@/stores/omsStore';
import type { Profile, UserRole, Tenant, TenantMembership, TenantRole } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
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
  const [activeRole, setActiveRole] = useState<TenantRole | null>('owner');
  const [loading, setLoading] = useState(true);

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
    const { data, error } = await supabase
      .from('tenant_memberships')
      .select('*, tenant:tenants(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      setMemberships([]);
      setActiveTenant(null);
      return;
    }

    const mships = data as unknown as TenantMembership[];
    setMemberships(mships);

    const savedTenantId = localStorage.getItem(ACTIVE_TENANT_KEY);
    const saved = savedTenantId
      ? mships.find((m) => m.tenant_id === savedTenantId)
      : null;
    const target = saved ?? mships[0];
    setActiveTenant(target?.tenant ?? null);
    if (target?.tenant_id) {
      localStorage.setItem(ACTIVE_TENANT_KEY, target.tenant_id);
    }
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
      const unsub = omsStore.subscribe((event) => {
        if (event?.topic === 'ROLE_SWITCHED' || event?.topic === 'DATABASE_RESET') {
          syncFromMockStore();
        }
      });
      return unsub;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        Promise.all([
          loadProfile(data.session.user.id),
          loadMemberships(data.session.user.id),
        ]).finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch(() => {
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) {
        (async () => {
          await Promise.all([
            loadProfile(sess.user.id),
            loadMemberships(sess.user.id),
          ]);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setMemberships([]);
        setActiveTenant(null);
        localStorage.removeItem(ACTIVE_TENANT_KEY);
        setLoading(false);
      }
    });

    return () => { sub.subscription.unsubscribe(); };
  }, [loadProfile, loadMemberships, syncFromMockStore]);

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
