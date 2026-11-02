import { useState } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  Shield, 
  Zap, 
  Users, 
  Play, 
  ChevronUp, 
  ChevronDown, 
  Lock,
  X
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { mockStore } from '@/mock/store';
import { DEMO_SCENARIOS, executeScenario } from '@/mock/scenarios/scenarioRunner';
import { useToast } from '@/components/ui/Toast';
import type { TenantRole } from '@/types';
import { ENABLE_FINANCE_ROLE } from '@/lib/permissions';
import type { DemoScenarioId } from '@/mock/types';

export function DemoControlPanel() {
  const toast = useToast();
  const { activeRole, switchRole, activeTenant, switchTenant } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<DemoScenarioId>('SCENARIO_NORMAL_DAY');
  const [isRunning, setIsRunning] = useState(false);

  const roles: Array<{ id: TenantRole; label: string; icon: string; desc: string }> = [
    { id: 'owner', label: 'Owner (Chủ)', icon: '👑', desc: 'Toàn quyền cấu hình' },
    { id: 'admin', label: 'Admin', icon: '⚡', desc: 'Quản trị nhân sự' },
    { id: 'manager', label: 'Manager', icon: '📊', desc: 'Quản lý đơn hàng' },
    { id: 'warehouse', label: 'Thủ Kho', icon: '📦', desc: 'Soạn hàng, đóng gói' },
    { id: 'finance', label: 'Kế Toán', icon: '💰', desc: 'Tài chính & đối soát' },
    { id: 'growth', label: 'Tăng Trưởng', icon: '🚀', desc: 'Marketing & Ads' },
    { id: 'viewer', label: 'Chỉ Xem', icon: '👁️', desc: 'Chỉ đọc số liệu' },
  ];

  const handleRunScenario = async () => {
    setIsRunning(true);
    try {
      const res = await executeScenario(selectedScenario);
      if (res.success) {
        toast(res.message, 'success');
      } else {
        toast(res.message, 'error');
      }
    } catch {
      toast('Lỗi khi thực thi kịch bản mô phỏng', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ dữ liệu mẫu về mặc định ban đầu?')) {
      mockStore.resetToDefaultSeed();
      toast('✓ Đã khôi phục toàn bộ dữ liệu mẫu về mặc định ban đầu!', 'success');
    }
  };

  if (isDismissed) {
    return (
      <button
        onClick={() => setIsDismissed(false)}
        className="fixed bottom-3 right-3 z-40 w-8 h-8 rounded-full bg-[#081B2C]/80 hover:bg-[#081B2C] text-teal-300 border border-teal-500/40 shadow-md flex items-center justify-center transition-all cursor-pointer opacity-70 hover:opacity-100"
        title="Mở bảng kịch bản thử nghiệm"
      >
        <Sparkles size={14} />
      </button>
    );
  }

  return (
    <>
      {/* Mobile Backdrop when open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 font-sans max-w-[calc(100vw-24px)]">
        {/* Floating Trigger Pill */}
        {!isOpen && (
          <div className="flex items-center gap-1 shadow-lg rounded-full bg-[#081B2C]/90 backdrop-blur-md border border-[#27B4A0]/50 p-0.5">
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-white text-xs font-semibold hover:text-[#27B4A0] transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-[#27B4A0] animate-pulse" />
              <span className="tracking-tight text-[11px]">Kịch bản thử nghiệm</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#27B4A0]/20 text-[#27B4A0] text-[9px] font-mono uppercase">
                {activeRole}
              </span>
              <ChevronUp size={13} className="text-slate-400" />
            </button>

            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors mr-1 cursor-pointer"
              title="Ẩn nút thử nghiệm"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Expanded Control Drawer */}
        {isOpen && (
          <div className="w-[calc(100vw-24px)] sm:w-[400px] max-h-[85vh] rounded-2xl bg-[#081B2C] border border-[#1E647F]/80 shadow-2xl text-white overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="p-3.5 bg-gradient-to-r from-[#0C2739] to-[#123A52] border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1E647F] to-[#27B4A0] flex items-center justify-center">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Mô Phỏng Kịch Bản Vận Hành</span>
                  </div>
                  <div className="text-[10px] text-gray-400">Chuyển vai trò & dữ liệu đối soát</div>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ChevronDown size={16} />
              </button>
            </div>

            <div className="p-3.5 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs">
              {/* RBAC Notice */}
              <div className="p-2 rounded-xl bg-[#123A52]/60 border border-[#1E647F]/40 flex items-start gap-2 text-[10px] text-gray-300">
                <Lock size={13} className="text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Phân quyền mô phỏng (RBAC):</strong> Dành cho kiểm thử giao diện và luồng nghiệp vụ.
                </span>
              </div>

              {/* Role Switcher Grid */}
              <div>
                <div className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Users size={12} /> 1. Chuyển vai trò (Role Switcher)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {roles.filter(r => r.id !== 'viewer' && (r.id !== 'finance' || ENABLE_FINANCE_ROLE)).map(r => {
                    const isActive = activeRole === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => switchRole(r.id)}
                        className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#1E647F] border-[#27B4A0] text-white shadow-xs'
                            : 'bg-[#0C2739] border-gray-800 text-gray-300 hover:border-gray-700'
                        }`}
                        title={r.desc}
                      >
                        <div className="text-xs mb-0.5">{r.icon}</div>
                        <div className="font-bold text-[10px] truncate">{r.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Workspace Selector */}
              <div>
                <div className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Shield size={12} /> 2. Không gian doanh nghiệp (Workspace)
                </div>
                <div className="flex gap-1.5">
                  {[
                    { id: 'tenant_flagship', name: 'Flagship Store' },
                    { id: 'tenant_logistics_3pl', name: '3PL Hub' },
                    { id: 'tenant_retail_hanoi', name: 'Chi nhánh HN' },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => switchTenant(t.id)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all truncate cursor-pointer ${
                        activeTenant?.id === t.id
                          ? 'bg-[#123A52] border-[#27B4A0] text-white'
                          : 'bg-[#0C2739] border-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scenario Picker */}
              <div>
                <div className="text-[10px] font-bold text-teal-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Zap size={12} /> 3. Chọn kịch bản nghiệp vụ (12 kịch bản)
                </div>
                <select
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value as DemoScenarioId)}
                  className="w-full p-2 rounded-lg bg-[#0C2739] border border-gray-700 text-white text-xs focus:outline-none focus:border-[#27B4A0] cursor-pointer"
                >
                  {DEMO_SCENARIOS.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                {(() => {
                  const cur = DEMO_SCENARIOS.find(s => s.id === selectedScenario);
                  if (!cur) return null;
                  return (
                    <div className="mt-1.5 p-2 rounded-lg bg-black/40 border border-gray-800 text-[10px] text-gray-300 space-y-1">
                      <p className="text-gray-200">{cur.description}</p>
                      <div className="text-[9px] text-teal-400 pt-1 border-t border-gray-800 flex items-center gap-1">
                        <span>Khuyến nghị vai trò:</span>
                        <strong className="uppercase">{cur.roleRecommended}</strong>
                      </div>
                    </div>
                  );
                })()}

                <button
                  onClick={handleRunScenario}
                  disabled={isRunning}
                  className="w-full mt-2 py-2 rounded-lg font-bold text-xs text-white bg-gradient-to-r from-[#1E647F] to-[#27B4A0] hover:from-[#174E64] hover:to-[#1fa390] transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Play size={13} className="fill-white" />
                  <span>{isRunning ? 'Đang thực thi...' : 'Kích hoạt kịch bản'}</span>
                </button>
              </div>

              {/* Reset to Seed Data */}
              <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                <button
                  onClick={handleReset}
                  className="text-[10px] text-gray-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Khôi phục dữ liệu ban đầu</span>
                </button>

                <span className="text-[9px] text-gray-500 font-mono">
                  Dream Terus
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
