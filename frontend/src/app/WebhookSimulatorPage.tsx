import { useEffect, useMemo, useState } from 'react';
import { Check, CirclePlay, Radio, X } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { ApiError } from '@/services/apiClient';
import { channelsService } from '@/services/channels.service';
import { webhookSimulatorService } from '@/services/webhookSimulator.service';
import { workspaceService } from '@/services/workspace.service';

type Connection = { id: string; accountName: string; type: string; status: string };
type Warehouse = { id: string; code: string; name: string };
type Mapping = { id: string; channelSku: string; productId: string; productSku: string; productName: string };
type Line = { id: string; channelSku: string; quantity: number; unitPrice: number };
type Scenario = { externalOrderId: string; orderId?: string; step: number };
type PersistedSimulation = { connectionId: string; warehouseId: string; lines: Line[]; scenario: Scenario | null };

const channelName: Record<string, string> = { shopee: 'Shopee', tiktok_shop: 'TikTok Shop', lazada: 'Lazada', website_d2c: 'Website' };
const stages = [
  { eventType: 'order.created', title: 'Tạo đơn & giữ tồn', detail: 'Webhook tạo đơn sàn, đối chiếu SKU và reserve tồn kho.' },
  { eventType: 'order.confirmed', title: 'Xác nhận đơn', detail: 'Đơn chuyển sang Đã xác nhận.' },
  { eventType: 'order.processing', title: 'Chuẩn bị hàng', detail: 'Đơn chuyển sang Đang chuẩn bị.' },
  { eventType: 'order.shipped', title: 'Xuất kho & vận chuyển', detail: 'Tồn thực tế và tồn đang giữ cùng giảm khi hàng rời kho.' },
  { eventType: 'order.delivered', title: 'Giao thành công', detail: 'Đơn hoàn tất và số liệu doanh thu theo kênh được cập nhật.' },
] as const;
const storageKey = 'nexus-webhook-simulation-v1';

function readPersistedSimulation(): PersistedSimulation {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
    if (!value || typeof value !== 'object') throw new Error('empty');
    const saved = value as Partial<PersistedSimulation>;
    return {
      connectionId: typeof saved.connectionId === 'string' ? saved.connectionId : '',
      warehouseId: typeof saved.warehouseId === 'string' ? saved.warehouseId : '',
      lines: Array.isArray(saved.lines) ? saved.lines.filter((line): line is Line => Boolean(line) && typeof line === 'object' && typeof (line as Line).id === 'string' && typeof (line as Line).channelSku === 'string' && typeof (line as Line).quantity === 'number' && typeof (line as Line).unitPrice === 'number') : [],
      scenario: saved.scenario && typeof saved.scenario.externalOrderId === 'string' && typeof saved.scenario.step === 'number' ? saved.scenario : null,
    };
  } catch { return { connectionId: '', warehouseId: '', lines: [], scenario: null }; }
}

function Panel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [persisted] = useState(readPersistedSimulation);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [connectionId, setConnectionId] = useState(persisted.connectionId);
  const [warehouseId, setWarehouseId] = useState(persisted.warehouseId);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [lines, setLines] = useState<Line[]>(persisted.lines);
  const [scenario, setScenario] = useState<Scenario | null>(persisted.scenario);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void Promise.all([channelsService.list(token, controller.signal), workspaceService.listWarehouses(token, controller.signal)])
      .then(([channels, warehouseRows]) => {
        const active = (channels as Connection[]).filter(item => item.status === 'connected');
        const availableWarehouses = warehouseRows as Warehouse[];
        setConnections(active); setWarehouses(availableWarehouses);
        setConnectionId(current => current || active[0]?.id || '');
        setWarehouseId(current => current || availableWarehouses[0]?.id || '');
      }).catch(cause => !controller.signal.aborted && setError(cause instanceof Error ? cause.message : 'Không tải được cấu hình.'))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (!token || !connectionId) { setMappings([]); return; }
    const controller = new AbortController();
    void channelsService.listMappings(connectionId, token, controller.signal).then(data => setMappings(data as Mapping[]))
      .catch(cause => !controller.signal.aborted && setError(cause instanceof Error ? cause.message : 'Không tải được ánh xạ SKU.'));
    return () => controller.abort();
  }, [connectionId, token]);

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify({ connectionId, warehouseId, lines, scenario } satisfies PersistedSimulation));
  }, [connectionId, warehouseId, lines, scenario]);

  const preview = useMemo(() => {
    const bySku = new Map(mappings.map(mapping => [mapping.channelSku.toUpperCase(), mapping]));
    return lines.map(line => ({ ...line, mapping: bySku.get(line.channelSku.toUpperCase()) }));
  }, [lines, mappings]);
  const ready = Boolean(connectionId && warehouseId && preview.length && preview.every(line => line.mapping));
  const current = scenario ? stages[scenario.step] : stages[0];

  function addLine(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const channelSku = String(data.get('channelSku') ?? '').trim().toUpperCase(); const quantity = Number(data.get('quantity')); const unitPrice = Number(data.get('unitPrice'));
    if (!channelSku || quantity <= 0 || !Number.isFinite(quantity) || unitPrice < 0 || !Number.isFinite(unitPrice)) { setError('Chọn SKU, nhập số lượng dương và đơn giá hợp lệ.'); return; }
    if (lines.some(line => line.channelSku === channelSku)) { setError('SKU này đã có trong payload.'); return; }
    setLines(value => [...value, { id: crypto.randomUUID(), channelSku, quantity, unitPrice }]); setError(''); event.currentTarget.reset();
  }

  async function advance() {
    if (!token || sending || (!scenario && !ready)) return;
    const step = scenario?.step ?? 0; const externalOrderId = scenario?.externalOrderId ?? `FLASH-${Date.now()}`;
    setSending(true); setError('');
    try {
      const result = await webhookSimulatorService.dispatch(connectionId, { eventId: `demo-${externalOrderId}-${step}-${crypto.randomUUID()}`, eventType: stages[step].eventType, externalOrderId, warehouseId, tax: 0, shippingFee: 0, items: preview.map(line => ({ channelSku: line.channelSku, quantity: line.quantity, unitPrice: line.unitPrice })) }, token) as { orderId?: string };
      setScenario({ externalOrderId, orderId: result.orderId ?? scenario?.orderId, step: step + 1 });
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : 'Không thể xử lý webhook.'); }
    finally { setSending(false); }
  }

  const completed = scenario?.step === stages.length;
  function reset() { sessionStorage.removeItem(storageKey); setScenario(null); setLines([]); setError(''); }
  return <aside className={'fixed inset-y-0 right-0 z-[80] flex w-full max-w-2xl flex-col border-l border-ink-200 bg-[#f6fafb] shadow-2xl transition-transform duration-300 ' + (open ? 'translate-x-0' : 'translate-x-full')} aria-hidden={!open} aria-label="Bảng điều khiển mô phỏng webhook">
    <header className="flex items-center justify-between border-b border-ink-200 bg-white px-5 py-4"><div><h2 className="font-semibold text-ink-950">Mô phỏng Flash Sale</h2><p className="mt-0.5 text-xs text-ink-600">Bấm từng bước để mô phỏng webhook thực tế.</p></div><button type="button" className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" onClick={onClose} aria-label="Đóng mô phỏng"><X size={20} /></button></header>
    <div className="flex-1 space-y-4 overflow-y-auto p-5"><section className="rounded-xl border border-ink-200 bg-white p-4"><div className="relative grid grid-cols-5 gap-1" aria-label="Tiến trình xử lý webhook"><span className="absolute left-[10%] right-[10%] top-3 h-1 rounded bg-ink-100" aria-hidden="true"/><span className="absolute left-[10%] top-3 h-1 rounded bg-emerald-500 transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(80, ((scenario?.step ?? 0) / (stages.length - 1)) * 80))}%` }} aria-hidden="true"/>{stages.map((stage, index) => { const step = scenario?.step ?? 0; const done = step > index; const active = !completed && step === index; return <div key={stage.eventType} className="relative z-10 flex flex-col items-center text-center"><span className={'grid size-7 place-items-center rounded-full border-2 text-xs font-bold transition ' + (done ? 'border-emerald-600 bg-emerald-600 text-white' : active ? 'border-brand-700 bg-brand-700 text-white shadow-lg shadow-brand-700/25' : 'border-ink-200 bg-white text-ink-500')}>{done ? <Check size={15} /> : index + 1}</span><p className={'mt-2 hidden text-xs font-semibold leading-4 sm:block ' + (active ? 'text-brand-800' : done ? 'text-emerald-800' : 'text-ink-600')}>{stage.title}</p></div>; })}</div><div className="mt-4 rounded-lg bg-brand-50 px-3 py-2"><p className="text-sm font-semibold text-brand-900">{completed ? 'Đã hoàn tất' : current.title}</p><p className="mt-0.5 text-xs leading-5 text-brand-800">{completed ? 'Đơn đã đi hết luồng webhook. Bạn có thể tạo kịch bản mới.' : current.detail}</p>{sending && <div className="mt-2 h-1 overflow-hidden rounded bg-brand-100"><span className="block h-full w-1/2 animate-pulse rounded bg-brand-600" /></div>}</div></section>
      {!scenario && <><section className="grid gap-3 rounded-xl border border-ink-200 bg-white p-4 sm:grid-cols-2"><label className="text-sm font-medium">Tài khoản kênh<select className="input mt-1 w-full" value={connectionId} onChange={event => { setConnectionId(event.target.value); setLines([]); }}><option value="">Chọn tài khoản</option>{connections.map(item => <option key={item.id} value={item.id}>{channelName[item.type] ?? item.type} · {item.accountName}</option>)}</select></label><label className="text-sm font-medium">Kho xuất<select className="input mt-1 w-full" value={warehouseId} onChange={event => setWarehouseId(event.target.value)}><option value="">Chọn kho</option>{warehouses.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label></section>
      <section className="rounded-xl border border-ink-200 bg-white p-4"><h3 className="font-semibold">Sản phẩm trong payload</h3><form className="mt-3 grid gap-2 sm:grid-cols-[1.7fr_0.8fr_0.9fr_auto]" onSubmit={addLine}><select required name="channelSku" disabled={!mappings.length} className="input"><option value="">Chọn SKU đã ánh xạ</option>{mappings.map(item => <option key={item.id} value={item.channelSku} disabled={lines.some(line => line.channelSku === item.channelSku)}>{item.channelSku} · {item.productName}</option>)}</select><input required name="quantity" type="number" min="0.001" step="0.001" placeholder="Số lượng" className="input"/><input required name="unitPrice" type="number" min="0" step="0.01" placeholder="Đơn giá" className="input"/><button className="btn-secondary" type="submit">Thêm</button></form>{!mappings.length && connectionId && <p className="mt-2 text-xs text-amber-700">Tài khoản này chưa có ánh xạ SKU.</p>}<ul className="mt-3 divide-y divide-ink-100">{preview.map(line => <li key={line.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate"><b>{line.channelSku}</b> · {line.mapping?.productName}</span><span className="shrink-0">{line.quantity} × {line.unitPrice.toLocaleString('vi-VN')} ₫ <button className="ml-2 text-red-700" type="button" onClick={() => setLines(value => value.filter(item => item.id !== line.id))}>Bỏ</button></span></li>)}</ul></section></>}
      {scenario && <section className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm"><p className="font-semibold text-brand-900">Đơn mô phỏng: {scenario.externalOrderId}</p><p className="mt-1 text-brand-800">{completed ? 'Đã hoàn tất toàn bộ luồng webhook.' : `Sẵn sàng bắn sự kiện: ${current.title}.`}</p>{scenario.orderId && <p className="mt-1 break-all text-xs text-brand-700">ID hệ thống: {scenario.orderId}</p>}</section>}{error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}{loading && <p className="text-sm text-ink-600">Đang tải cấu hình…</p>}</div>
    <footer className="border-t border-ink-200 bg-white p-4"><div className="flex justify-between gap-3">{scenario && <button type="button" className="btn-secondary" onClick={reset}>Tạo kịch bản mới</button>}<button type="button" className="btn-primary ml-auto" disabled={sending || completed || (!scenario && !ready)} onClick={() => { void advance(); }}><Radio size={16} className={sending ? 'animate-pulse' : ''}/>{completed ? 'Đã hoàn tất' : sending ? 'Đang xử lý…' : scenario ? `Bắn: ${current.title}` : 'Bắt đầu: Tạo đơn'}</button></div></footer>
  </aside>;
}

export function WebhookSimulationLauncher() {
  const { activeRole } = useAuth(); const [open, setOpen] = useState(false);
  if (activeRole !== 'admin' && activeRole !== 'manager') return null;
  return <>{open && <button type="button" className="fixed inset-0 z-[70] cursor-default bg-ink-950/20" onClick={() => setOpen(false)} aria-label="Đóng bảng mô phỏng"/>}<Panel open={open} onClose={() => setOpen(false)} /><button type="button" onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-[60] grid size-14 place-items-center rounded-full bg-brand-700 text-white shadow-xl shadow-brand-950/30 transition hover:scale-105 hover:bg-brand-800" aria-label="Mở mô phỏng Flash Sale" title="Mô phỏng Flash Sale"><CirclePlay size={27}/></button></>;
}

export function WebhookSimulatorPage() { return <div className="p-6 text-sm text-ink-600">Dùng nút Mô phỏng Flash Sale ở góc dưới bên phải để chạy kịch bản webhook.</div>; }
