import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CirclePlay, LoaderCircle, Radio, X } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
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
type ProcessRun = { stage: number; active: number | null; completed: number[]; failed: boolean };

const channelName: Record<string, string> = { shopee: 'Shopee', tiktok_shop: 'TikTok Shop', lazada: 'Lazada', website_d2c: 'Website' };
const stages = [
  { eventType: 'order.created', title: 'Tạo đơn & giữ tồn', detail: 'Nhận đơn từ sàn, đối chiếu SKU và giữ tồn kho.' },
  { eventType: 'order.confirmed', title: 'Xác nhận đơn', detail: 'Đơn chuyển sang Đã xác nhận.' },
  { eventType: 'order.processing', title: 'Chuẩn bị hàng', detail: 'Đơn chuyển sang Đang chuẩn bị.' },
  { eventType: 'order.shipped', title: 'Xuất kho & vận chuyển', detail: 'Tồn thực tế và tồn đang giữ cùng giảm khi hàng rời kho.' },
  { eventType: 'order.delivered', title: 'Giao thành công', detail: 'Đơn hoàn tất và số liệu doanh thu theo kênh được cập nhật.' },
] as const;
const stageProcesses = [
  ['Gửi đơn từ kênh bán', 'Đối chiếu SKU kênh', 'Kiểm tra tồn khả dụng', 'Tạo đơn và giữ tồn'],
  ['Gửi cập nhật xác nhận', 'Kiểm tra đơn đang chờ xác nhận', 'Cập nhật trạng thái đơn'],
  ['Gửi yêu cầu chuẩn bị hàng', 'Kiểm tra đơn đã xác nhận', 'Cập nhật trạng thái đơn'],
  ['Gửi xác nhận xuất kho', 'Ghi nhận xuất kho', 'Cập nhật trạng thái vận chuyển'],
  ['Gửi xác nhận giao hàng', 'Hoàn tất đơn hàng', 'Cập nhật doanh thu theo kênh'],
] as const;
const storageKey = 'nexus-webhook-simulation-v1';
const wait = (milliseconds: number) => new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));

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
  const queryClient = useQueryClient();
  const [persisted] = useState(readPersistedSimulation);
  const [connectionId, setConnectionId] = useState(persisted.connectionId);
  const [warehouseId, setWarehouseId] = useState(persisted.warehouseId);
  const [lines, setLines] = useState<Line[]>(persisted.lines);
  const [selectedSku, setSelectedSku] = useState('');
  const [scenario, setScenario] = useState<Scenario | null>(persisted.scenario);
  const [sending, setSending] = useState(false);
  const [processRun, setProcessRun] = useState<ProcessRun | null>(null);
  const [error, setError] = useState('');

  const catalog = useQuery({ queryKey: ['workspace', session?.user.id, 'simulator-catalog'], enabled: Boolean(token), queryFn: async ({ signal }) => {
    const [channels, warehouseRows] = await Promise.all([channelsService.list(token!, signal), workspaceService.listWarehouses(token!, signal)]);
    return { connections: (channels as Connection[]).filter(item => item.status === 'connected'), warehouses: warehouseRows as Warehouse[] };
  } });
  const mappingQuery = useQuery({ queryKey: ['workspace', session?.user.id, 'mappings', connectionId], enabled: Boolean(token && connectionId), queryFn: ({ signal }) => channelsService.listMappings(connectionId, token!, signal) as Promise<Mapping[]> });
  const connections = catalog.data?.connections ?? [];
  const warehouses = catalog.data?.warehouses ?? [];
  const mappings = mappingQuery.data ?? [];
  const loading = catalog.isLoading || mappingQuery.isLoading;

  useEffect(() => {
    if (!catalog.data) return;
    setConnectionId(current => current || catalog.data.connections[0]?.id || '');
    setWarehouseId(current => current || catalog.data.warehouses[0]?.id || '');
  }, [catalog.data]);

  useEffect(() => {
    if (catalog.error) setError(catalog.error instanceof Error ? catalog.error.message : 'Không tải được cấu hình.');
    if (mappingQuery.error) setError(mappingQuery.error instanceof Error ? mappingQuery.error.message : 'Không tải được ánh xạ SKU.');
  }, [catalog.error, mappingQuery.error]);

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
    const channelSku = selectedSku.trim().toUpperCase(); const quantity = Number(data.get('quantity')); const unitPrice = Number(data.get('unitPrice'));
    if (!channelSku || quantity <= 0 || !Number.isFinite(quantity) || unitPrice < 0 || !Number.isFinite(unitPrice)) { setError('Chọn SKU, nhập số lượng dương và đơn giá hợp lệ.'); return; }
    if (lines.some(line => line.channelSku === channelSku)) { setError('SKU này đã có trong đơn mô phỏng.'); return; }
    setLines(value => [...value, { id: crypto.randomUUID(), channelSku, quantity, unitPrice }]); setSelectedSku(''); setError(''); event.currentTarget.reset();
  }

  async function advance() {
    if (!token || sending || (!scenario && !ready)) return;
    const step = scenario?.step ?? 0; const externalOrderId = scenario?.externalOrderId ?? `FLASH-${Date.now()}`;
    setSending(true); setError(''); setProcessRun({ stage: step, active: 0, completed: [], failed: false });
    try {
      await wait(220);
      const result = await webhookSimulatorService.dispatch(connectionId, { eventId: `demo-${externalOrderId}-${step}-${crypto.randomUUID()}`, eventType: stages[step].eventType, externalOrderId, warehouseId, tax: 0, shippingFee: 0, items: preview.map(line => ({ channelSku: line.channelSku, quantity: line.quantity, unitPrice: line.unitPrice })) }, token) as { orderId?: string };
      const process = stageProcesses[step];
      for (let phase = 1; phase < process.length; phase += 1) {
        setProcessRun({ stage: step, active: phase, completed: Array.from({ length: phase }, (_, index) => index), failed: false });
        await wait(220);
      }
      setProcessRun({ stage: step, active: null, completed: process.map((_, index) => index), failed: false });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders', session?.user.id] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', session?.user.id] }),
        queryClient.invalidateQueries({ queryKey: ['returns', session?.user.id] }),
      ]);
      setScenario({ externalOrderId, orderId: result.orderId ?? scenario?.orderId, step: step + 1 });
    } catch (cause) { setProcessRun(current => current ? { ...current, active: null, failed: true } : current); setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : 'Không thể xử lý webhook.'); }
    finally { setSending(false); }
  }

  const completed = scenario?.step === stages.length;
  function reset() { sessionStorage.removeItem(storageKey); setScenario(null); setLines([]); setProcessRun(null); setError(''); }
  return <aside className={'fixed inset-y-0 right-0 z-[80] flex w-full max-w-2xl flex-col border-l border-ink-200 bg-[#f6fafb] shadow-2xl transition-transform duration-300 ' + (open ? 'translate-x-0' : 'translate-x-full')} aria-hidden={!open} aria-label="Bảng điều khiển mô phỏng webhook">
    <header className="flex items-center justify-between border-b border-ink-200 bg-white px-5 py-4"><div><h2 className="font-semibold text-ink-950">Mô phỏng Flash Sale</h2><p className="mt-0.5 text-xs text-ink-600">Bấm từng bước để mô phỏng webhook thực tế.</p></div><button type="button" className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" onClick={onClose} aria-label="Đóng mô phỏng"><X size={20} /></button></header>
    <div className="flex-1 space-y-4 overflow-y-auto p-5"><section className="rounded-xl border border-ink-200 bg-white p-4"><div className="relative grid grid-cols-5 gap-1" aria-label="Tiến trình xử lý webhook"><span className="absolute left-[10%] right-[10%] top-3 h-1 rounded bg-ink-100" aria-hidden="true"/><span className="absolute left-[10%] top-3 h-1 rounded bg-emerald-500 transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(80, ((scenario?.step ?? 0) / (stages.length - 1)) * 80))}%` }} aria-hidden="true"/>{stages.map((stage, index) => { const step = scenario?.step ?? 0; const done = step > index; const active = !completed && step === index; return <div key={stage.eventType} className="relative z-10 flex flex-col items-center text-center"><span className={'grid size-7 place-items-center rounded-full border-2 text-xs font-bold transition ' + (done ? 'border-emerald-600 bg-emerald-600 text-white' : active ? 'border-brand-700 bg-brand-700 text-white shadow-lg shadow-brand-700/25' : 'border-ink-200 bg-white text-ink-500')}>{done ? <Check size={15} /> : index + 1}</span><p className={'mt-2 hidden text-xs font-semibold leading-4 sm:block ' + (active ? 'text-brand-800' : done ? 'text-emerald-800' : 'text-ink-600')}>{stage.title}</p></div>; })}</div><div className="mt-4 rounded-lg bg-brand-50 px-3 py-2"><p className="text-sm font-semibold text-brand-900">{completed ? 'Đã hoàn tất' : current.title}</p><p className="mt-0.5 text-xs leading-5 text-brand-800">{completed ? 'Đơn đã đi hết luồng webhook. Bạn có thể tạo kịch bản mới.' : current.detail}</p>{sending && <div className="mt-2 h-1 overflow-hidden rounded bg-brand-100"><span className="block h-full w-1/2 animate-pulse rounded bg-brand-600" /></div>}</div></section>
      {processRun && <section className={'rounded-xl border p-4 ' + (processRun.failed ? 'border-rose-200 bg-rose-50' : 'border-brand-100 bg-white')} aria-live="polite"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-ink-900">{stages[processRun.stage].title}</h3><span className={'text-xs font-medium ' + (processRun.failed ? 'text-rose-700' : processRun.active === null ? 'text-emerald-700' : 'text-brand-700')}>{processRun.failed ? 'Chưa hoàn tất' : processRun.active === null ? 'Đã hoàn tất' : 'Đang xử lý'}</span></div><ol className="space-y-2">{stageProcesses[processRun.stage].map((label, index) => { const done = processRun.completed.includes(index); const active = processRun.active === index; return <li key={label} className="flex items-center gap-2 text-sm"><span className={'grid size-5 shrink-0 place-items-center rounded-full ' + (done ? 'bg-emerald-600 text-white' : active ? 'bg-brand-700 text-white' : 'bg-ink-100 text-ink-500')}>{done ? <Check size={13} /> : active ? <LoaderCircle size={13} className="animate-spin" /> : index + 1}</span><span className={done ? 'text-ink-700' : active ? 'font-medium text-ink-900' : 'text-ink-500'}>{label}</span></li>; })}</ol></section>}
      {!scenario && <><section className="grid gap-3 rounded-xl border border-ink-200 bg-white p-4 sm:grid-cols-2"><label className="text-sm font-medium">Tài khoản kênh<SearchableSelect value={connectionId} onChange={value => { setConnectionId(value); setLines([]); setSelectedSku(''); }} options={connections.map(item => ({ value: item.id, label: (channelName[item.type] ?? item.type) + ' · ' + item.accountName }))} placeholder="Chọn tài khoản" ariaLabel="Chọn tài khoản kênh" searchPlaceholder="Tìm tài khoản kênh..." /></label><label className="text-sm font-medium">Kho xuất<SearchableSelect value={warehouseId} onChange={setWarehouseId} options={warehouses.map(item => ({ value: item.id, label: item.code + ' · ' + item.name }))} placeholder="Chọn kho" ariaLabel="Chọn kho xuất" searchPlaceholder="Tìm mã hoặc tên kho..." /></label></section>
      <section className="rounded-xl border border-ink-200 bg-white p-4"><h3 className="font-semibold">Sản phẩm trong đơn mô phỏng</h3><form className="mt-3 grid gap-2 sm:grid-cols-[1.7fr_0.8fr_0.9fr_auto]" onSubmit={addLine}><SearchableSelect value={selectedSku} onChange={setSelectedSku} disabled={!mappings.length} options={mappings.map(item => ({ value: item.channelSku, label: item.channelSku + ' · ' + item.productName, disabled: lines.some(line => line.channelSku === item.channelSku) }))} placeholder="Chọn SKU đã ánh xạ" ariaLabel="Chọn SKU đã ánh xạ" searchPlaceholder="Tìm SKU hoặc tên sản phẩm..." /><input required name="quantity" type="number" min="0.001" step="0.001" placeholder="Số lượng" className="input"/><input required name="unitPrice" type="number" min="0" step="0.01" placeholder="Đơn giá" className="input"/><button className="btn-secondary" type="submit">Thêm</button></form>{!mappings.length && connectionId && <p className="mt-2 text-xs text-amber-700">Tài khoản này chưa có ánh xạ SKU.</p>}<ul className="mt-3 divide-y divide-ink-100">{preview.map(line => <li key={line.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate"><b>{line.channelSku}</b> · {line.mapping?.productName}</span><span className="shrink-0">{line.quantity} × {line.unitPrice.toLocaleString('vi-VN')} ₫ <button className="ml-2 text-red-700" type="button" onClick={() => setLines(value => value.filter(item => item.id !== line.id))}>Bỏ</button></span></li>)}</ul></section></>}
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
