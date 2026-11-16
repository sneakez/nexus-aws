import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CirclePlay, LoaderCircle, Radio, X } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/providers/AuthProvider';
import { ApiError } from '@/services/apiClient';
import { channelsService } from '@/services/channels.service';
import { backendOrderStatuses, ordersService, type BackendOrderSummary } from '@/services/orders.service';
import { webhookSimulatorService } from '@/services/webhookSimulator.service';
import { workspaceService } from '@/services/workspace.service';

type Connection = { id: string; accountName: string; type: string; status: string };
type Warehouse = { id: string; code: string; name: string };
type Mapping = { id: string; channelSku: string; productId: string; productSku: string; productName: string };
type Line = { id: string; channelSku: string; quantity: number; unitPrice: number };
type Scenario = { externalOrderId: string; orderId?: string; step: number };
type PersistedSimulation = { connectionId: string; warehouseId: string; lines: Line[]; scenario: Scenario | null };
type ProcessRun = { stage: number; active: number | null; completed: number[]; failed: boolean };
type SimulatorTab = 'lifecycle' | 'cancellation' | 'load';
type CancellationRun = { phase: number; failed: boolean };
type DemoOrderRun = {
  orderNumber: string;
  status: 'sending' | 'queued' | 'processed' | 'dispatch_failed' | 'timeout';
  error?: string;
};

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
const expectedStatus = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'] as const;
const cancellationProcesses = ['Gửi webhook hủy đơn', 'Đưa sự kiện vào hàng đợi', 'Chờ backend xử lý', 'Hủy đơn và hoàn tồn'] as const;
const demoStatusLabel: Record<DemoOrderRun['status'], string> = {
  sending: 'Đang gửi', queued: 'Đang chờ', processed: 'Đã xử lý',
  dispatch_failed: 'Gửi thất bại', timeout: 'Quá thời gian',
};
const storageKey = 'nexus-webhook-simulation-v1';
const wait = (milliseconds: number) => new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));

export const isCancellableOrder = (order: BackendOrderSummary) =>
  ['pending', 'confirmed', 'processing'].includes(order.status);

export const isDemoBatchSafeToCleanup = (orders: DemoOrderRun[]) => orders.length > 0
  && orders.every(order => ['processed', 'dispatch_failed', 'timeout'].includes(order.status));

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
  const { session, activeRole } = useAuth();
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
  const [tab, setTab] = useState<SimulatorTab>('lifecycle');
  const [cancelOrderId, setCancelOrderId] = useState('');
  const [cancellationReason, setCancellationReason] = useState('Khách hủy đơn trên sàn');
  const [cancellationRun, setCancellationRun] = useState<CancellationRun | null>(null);
  const [cancelledExternalOrderId, setCancelledExternalOrderId] = useState('');
  const [batchSize, setBatchSize] = useState(10);
  const [demoBatchId, setDemoBatchId] = useState('');
  const [demoOrders, setDemoOrders] = useState<DemoOrderRun[]>([]);
  const [queueStatus, setQueueStatus] = useState({ mode: 'Direct', available: 0, inFlight: 0, delayed: 0, deadLetter: 0 });
  const [cleanupNotice, setCleanupNotice] = useState('');
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [batchStartedAt, setBatchStartedAt] = useState<number | null>(null);
  const [batchElapsedSeconds, setBatchElapsedSeconds] = useState(0);

  const catalog = useQuery({ queryKey: ['workspace', session?.user.id, 'simulator-catalog'], enabled: Boolean(token), queryFn: async ({ signal }) => {
    const [channels, warehouseRows] = await Promise.all([channelsService.list(token!, signal), workspaceService.listWarehouses(token!, signal)]);
    return { connections: (channels as Connection[]).filter(item => item.status === 'connected'), warehouses: warehouseRows as Warehouse[] };
  } });
  const mappingQuery = useQuery({ queryKey: ['workspace', session?.user.id, 'mappings', connectionId], enabled: Boolean(token && connectionId), queryFn: ({ signal }) => channelsService.listMappings(connectionId, token!, signal) as Promise<Mapping[]> });
  const ordersQuery = useQuery({ queryKey: ['orders', session?.user.id, '', ''], enabled: Boolean(token && tab === 'cancellation'), queryFn: ({ signal }) => ordersService.list(token!, signal) });
  const connections = catalog.data?.connections ?? [];
  const warehouses = catalog.data?.warehouses ?? [];
  const mappings = mappingQuery.data ?? [];
  const cancellableOrders = useMemo(() => (ordersQuery.data ?? []).filter(
    order => order.channelConnectionId === connectionId && isCancellableOrder(order)), [ordersQuery.data, connectionId]);
  const loading = catalog.isLoading || mappingQuery.isLoading;

  useEffect(() => {
    if (!catalog.data) return;
    setConnectionId(current => current || catalog.data.connections[0]?.id || '');
    setWarehouseId(current => current || catalog.data.warehouses[0]?.id || '');
  }, [catalog.data]);

  useEffect(() => {
    if (catalog.error) setError(catalog.error instanceof Error ? catalog.error.message : 'Không tải được cấu hình.');
    if (mappingQuery.error) setError(mappingQuery.error instanceof Error ? mappingQuery.error.message : 'Không tải được ánh xạ SKU.');
    if (ordersQuery.error) setError(ordersQuery.error instanceof Error ? ordersQuery.error.message : 'Không tải được danh sách đơn hàng.');
  }, [catalog.error, mappingQuery.error, ordersQuery.error]);

  useEffect(() => {
    if (tab !== 'cancellation') return;
    setCancelOrderId(current => {
      if (cancellableOrders.some(order => order.id === current)) return current;
      return cancellableOrders.find(order => order.orderNumber === scenario?.externalOrderId)?.id ?? cancellableOrders[0]?.id ?? '';
    });
  }, [tab, scenario?.externalOrderId, cancellableOrders]);

  useEffect(() => {
    if (tab !== 'load' || !token) return;
    void webhookSimulatorService.queueStatus(token)
      .then(setQueueStatus)
      .catch(cause => setError(cause instanceof Error ? cause.message : 'Không đọc được trạng thái hàng đợi.'));
  }, [tab, token]);

  useEffect(() => {
    if (!sending || tab !== 'load' || batchStartedAt === null) return;
    const timer = window.setInterval(() => {
      setBatchElapsedSeconds(Math.floor((Date.now() - batchStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sending, tab, batchStartedAt]);

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify({ connectionId, warehouseId, lines, scenario } satisfies PersistedSimulation));
  }, [connectionId, warehouseId, lines, scenario]);

  const preview = useMemo(() => {
    const bySku = new Map(mappings.map(mapping => [mapping.channelSku.toUpperCase(), mapping]));
    return lines.map(line => ({ ...line, mapping: bySku.get(line.channelSku.toUpperCase()) }));
  }, [lines, mappings]);
  const ready = Boolean(connectionId && warehouseId && preview.length && preview.every(line => line.mapping));
  const current = scenario ? stages[scenario.step] : stages[0];
  const scenarioCancelled = Boolean(scenario && scenario.externalOrderId === cancelledExternalOrderId);

  function addLine(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const channelSku = selectedSku.trim().toUpperCase(); const quantity = Number(data.get('quantity')); const unitPrice = Number(data.get('unitPrice'));
    if (!channelSku || quantity <= 0 || !Number.isFinite(quantity) || unitPrice < 0 || !Number.isFinite(unitPrice)) { setError('Chọn SKU, nhập số lượng dương và đơn giá hợp lệ.'); return; }
    if (lines.some(line => line.channelSku === channelSku)) { setError('SKU này đã có trong đơn mô phỏng.'); return; }
    setLines(value => [...value, { id: crypto.randomUUID(), channelSku, quantity, unitPrice }]); setSelectedSku(''); setError(''); event.currentTarget.reset();
  }

  async function waitForOrderStatus(orderNumber: string, status: string) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const order = (await ordersService.list(token!)).find(item => item.orderNumber === orderNumber);
      if (order?.status === status) return order;
      if (order?.status === 'cancelled' && status !== 'cancelled') throw new Error('Đơn đã bị hủy nên không thể tiếp tục luồng.');
      await wait(1000);
    }
    throw new Error('Quá thời gian chờ backend xử lý webhook. Kiểm tra worker hoặc hàng đợi SQS.');
  }

  async function advance() {
    if (!token || sending || (!scenario && !ready)) return;
    const step = scenario?.step ?? 0; const externalOrderId = scenario?.externalOrderId ?? `FLASH-${Date.now()}`;
    setSending(true); setError(''); setProcessRun({ stage: step, active: 0, completed: [], failed: false });
    try {
      await wait(220);
      const result = await webhookSimulatorService.dispatch(connectionId, { eventId: `demo-${externalOrderId}-${step}-${crypto.randomUUID()}`, eventType: stages[step].eventType, externalOrderId, warehouseId, tax: 0, shippingFee: 0, items: preview.map(line => ({ channelSku: line.channelSku, quantity: line.quantity, unitPrice: line.unitPrice })) }, token);
      const processedOrder = result.status === 'queued' ? await waitForOrderStatus(externalOrderId, expectedStatus[step]) : null;
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
      setScenario({ externalOrderId, orderId: result.orderId ?? processedOrder?.id ?? scenario?.orderId, step: step + 1 });
    } catch (cause) { setProcessRun(current => current ? { ...current, active: null, failed: true } : current); setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : 'Không thể xử lý webhook.'); }
    finally { setSending(false); }
  }

  async function cancelOrder() {
    const order = cancellableOrders.find(item => item.id === cancelOrderId);
    if (!token || !order || sending || !cancellationReason.trim()) return;
    setSending(true); setError(''); setCancellationRun({ phase: 0, failed: false });
    try {
      const result = await webhookSimulatorService.dispatch(connectionId, {
        eventId: `cancel-${order.orderNumber}-${crypto.randomUUID()}`,
        eventType: 'order.cancelled', externalOrderId: order.orderNumber,
        warehouseId: '00000000-0000-0000-0000-000000000000', tax: 0, shippingFee: 0,
        items: null, cancellationReason: cancellationReason.trim(),
      }, token);
      setCancellationRun({ phase: result.status === 'queued' ? 1 : 2, failed: false });
      if (result.status === 'queued') {
        await wait(250);
        setCancellationRun({ phase: 2, failed: false });
        await waitForOrderStatus(order.orderNumber, 'cancelled');
      }
      setCancellationRun({ phase: 3, failed: false });
      setCancelledExternalOrderId(order.orderNumber);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders', session?.user.id] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', session?.user.id] }),
      ]);
    } catch (cause) {
      setCancellationRun(current => ({ phase: current?.phase ?? 0, failed: true }));
      setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : 'Không thể hủy đơn qua webhook.');
    } finally { setSending(false); }
  }

  async function startLoadDemo() {
    if (!token || sending || !ready || batchSize < 5 || batchSize > 50) return;
    const batchId = crypto.randomUUID();
    const prefix = batchId.slice(0, 8).toUpperCase();
    setDemoBatchId(batchId); setCleanupNotice(''); setError(''); setSending(true);
    setBatchStartedAt(Date.now()); setBatchElapsedSeconds(0);
    const initial = Array.from({ length: batchSize }, (_, index) => ({
      orderNumber: `DEMO-${prefix}-${String(index + 1).padStart(2, '0')}`,
      status: 'sending' as const,
    }));
    setDemoOrders(initial);
    try {
      let runs: DemoOrderRun[] = await Promise.all(initial.map(async order => {
        try {
          const result = await webhookSimulatorService.dispatch(connectionId, {
            eventId: `batch-${batchId}-${order.orderNumber}`,
            eventType: 'order.created', externalOrderId: order.orderNumber,
            warehouseId, tax: 0, shippingFee: 0, demoBatchId: batchId,
            items: preview.map(line => ({ channelSku: line.channelSku, quantity: line.quantity, unitPrice: line.unitPrice })),
          }, token);
          const completed = { ...order, status: result.status === 'queued' ? 'queued' as const : 'processed' as const };
          setDemoOrders(current => current.map(item => item.orderNumber === order.orderNumber ? completed : item));
          return completed;
        } catch (cause) {
          const failed = { ...order, status: 'dispatch_failed' as const, error: cause instanceof Error ? cause.message : 'Không gửi được webhook.' };
          setDemoOrders(current => current.map(item => item.orderNumber === order.orderNumber ? failed : item));
          return failed;
        }
      }));
      setDemoOrders(runs);

      for (let attempt = 0; attempt < 60 && runs.some(order => order.status === 'queued'); attempt += 1) {
        const [orders, status] = await Promise.all([
          ordersService.list(token),
          webhookSimulatorService.queueStatus(token),
        ]);
        const created = new Set(orders.map(order => order.orderNumber));
        runs = runs.map(order => order.status === 'queued' && created.has(order.orderNumber)
          ? { ...order, status: 'processed' }
          : order);
        setDemoOrders(runs); setQueueStatus(status);
        if (runs.some(order => order.status === 'queued')) await wait(1000);
      }
      runs = runs.map(order => order.status === 'queued' ? { ...order, status: 'timeout', error: 'Quá thời gian chờ worker.' } : order);
      setDemoOrders(runs);
      setQueueStatus(await webhookSimulatorService.queueStatus(token));
      await queryClient.invalidateQueries({ queryKey: ['orders', session?.user.id] });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : 'Không thể chạy batch demo.');
    } finally { setSending(false); }
  }

  async function cleanupDemoBatch() {
    if (!token || !demoBatchId || (activeRole !== 'admin' && activeRole !== 'manager') || sending) return;
    setSending(true); setCleaning(true); setError(''); setBatchStartedAt(Date.now()); setBatchElapsedSeconds(0);
    try {
      const result = await webhookSimulatorService.cleanupBatch(demoBatchId, token);
      setCleanupNotice(`Đã xóa ${result.deletedOrders} đơn demo và hoàn ${result.releasedReservations} lượt giữ tồn.`);
      setDemoBatchId(''); setDemoOrders([]); setBatchStartedAt(null); setBatchElapsedSeconds(0);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders', session?.user.id] }),
        queryClient.invalidateQueries({ queryKey: ['workspace', session?.user.id] }),
      ]);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : 'Không thể dọn dữ liệu demo.');
    } finally { setCleaning(false); setSending(false); }
  }

  const completed = scenario?.step === stages.length;
  const canCleanupDemo = activeRole === 'admin' || activeRole === 'manager';
  const batchSafeToCleanup = isDemoBatchSafeToCleanup(demoOrders);
  const sentOrders = demoOrders.filter(order => order.status !== 'sending').length;
  const processedOrders = demoOrders.filter(order => order.status === 'processed').length;
  const dispatching = sending && demoOrders.some(order => order.status === 'sending');
  const batchProgress = demoOrders.length === 0 ? 0 : Math.round(
    ((dispatching ? sentOrders : processedOrders) / demoOrders.length) * 100);
  function reset() { sessionStorage.removeItem(storageKey); setScenario(null); setLines([]); setProcessRun(null); setCancellationRun(null); setCancelledExternalOrderId(''); setError(''); }
  return <><aside className={'fixed inset-y-0 right-0 z-[80] flex w-full max-w-2xl flex-col border-l border-ink-200 bg-[#f6fafb] shadow-2xl transition-transform duration-300 ' + (open ? 'translate-x-0' : 'translate-x-full')} aria-hidden={!open} aria-label="Bảng điều khiển mô phỏng webhook">
    <header className="flex items-center justify-between border-b border-ink-200 bg-white px-5 py-4">
      <div><h2 className="font-semibold text-ink-950">Mô phỏng webhook</h2><p className="mt-0.5 text-xs text-ink-600">Chạy vòng đời đơn hoặc mô phỏng hủy đơn từ sàn.</p></div>
      <button type="button" className="rounded-lg p-2 text-ink-500 hover:bg-ink-100" onClick={onClose} aria-label="Đóng mô phỏng"><X size={20} /></button>
    </header>
    <nav className="grid grid-cols-3 border-b border-ink-200 bg-white px-5" aria-label="Chọn kịch bản webhook">
      {([['lifecycle', 'Luồng đơn'], ['cancellation', 'Hủy đơn'], ['load', 'Tải cao / SQS']] as const).map(([value, label]) =>
        <button key={value} type="button" onClick={() => { setTab(value); setError(''); }} className={'border-b-2 px-3 py-3 text-sm font-semibold ' + (tab === value ? 'border-brand-700 text-brand-800' : 'border-transparent text-ink-500 hover:text-ink-800')}>{label}</button>)}
    </nav>
    <div className="flex-1 space-y-4 overflow-y-auto p-5">
      {tab === 'lifecycle' ? <>
        <section className="rounded-xl border border-ink-200 bg-white p-4">
          <div className="relative grid grid-cols-5 gap-1" aria-label="Tiến trình xử lý webhook">
            <span className="absolute left-[10%] right-[10%] top-3 h-1 rounded bg-ink-100" aria-hidden="true"/>
            <span className="absolute left-[10%] top-3 h-1 rounded bg-emerald-500 transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(80, ((scenario?.step ?? 0) / (stages.length - 1)) * 80))}%` }} aria-hidden="true"/>
            {stages.map((stage, index) => { const step = scenario?.step ?? 0; const done = step > index; const active = !completed && !scenarioCancelled && step === index; return <div key={stage.eventType} className="relative z-10 flex flex-col items-center text-center"><span className={'grid size-7 place-items-center rounded-full border-2 text-xs font-bold transition ' + (done ? 'border-emerald-600 bg-emerald-600 text-white' : active ? 'border-brand-700 bg-brand-700 text-white shadow-lg shadow-brand-700/25' : 'border-ink-200 bg-white text-ink-500')}>{done ? <Check size={15} /> : index + 1}</span><p className={'mt-2 hidden text-xs font-semibold leading-4 sm:block ' + (active ? 'text-brand-800' : done ? 'text-emerald-800' : 'text-ink-600')}>{stage.title}</p></div>; })}
          </div>
          <div className="mt-4 rounded-lg bg-brand-50 px-3 py-2"><p className="text-sm font-semibold text-brand-900">{scenarioCancelled ? 'Đơn đã hủy' : completed ? 'Đã hoàn tất' : current.title}</p><p className="mt-0.5 text-xs leading-5 text-brand-800">{scenarioCancelled ? 'Đơn không thể tiếp tục xuất kho hoặc giao hàng.' : completed ? 'Đơn đã đi hết luồng webhook. Bạn có thể tạo kịch bản mới.' : current.detail}</p>{sending && <div className="mt-2 h-1 overflow-hidden rounded bg-brand-100"><span className="block h-full w-1/2 animate-pulse rounded bg-brand-600" /></div>}</div>
        </section>
        {processRun && <section className={'rounded-xl border p-4 ' + (processRun.failed ? 'border-rose-200 bg-rose-50' : 'border-brand-100 bg-white')} aria-live="polite"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-ink-900">{stages[processRun.stage].title}</h3><span className={'text-xs font-medium ' + (processRun.failed ? 'text-rose-700' : processRun.active === null ? 'text-emerald-700' : 'text-brand-700')}>{processRun.failed ? 'Chưa hoàn tất' : processRun.active === null ? 'Đã hoàn tất' : 'Đang xử lý'}</span></div><ol className="space-y-2">{stageProcesses[processRun.stage].map((label, index) => { const done = processRun.completed.includes(index); const active = processRun.active === index; return <li key={label} className="flex items-center gap-2 text-sm"><span className={'grid size-5 shrink-0 place-items-center rounded-full ' + (done ? 'bg-emerald-600 text-white' : active ? 'bg-brand-700 text-white' : 'bg-ink-100 text-ink-500')}>{done ? <Check size={13} /> : active ? <LoaderCircle size={13} className="animate-spin" /> : index + 1}</span><span className={done ? 'text-ink-700' : active ? 'font-medium text-ink-900' : 'text-ink-500'}>{label}</span></li>; })}</ol></section>}
        {!scenario && <><section className="grid gap-3 rounded-xl border border-ink-200 bg-white p-4 sm:grid-cols-2"><label className="text-sm font-medium">Tài khoản kênh<SearchableSelect value={connectionId} onChange={value => { setConnectionId(value); setLines([]); setSelectedSku(''); }} options={connections.map(item => ({ value: item.id, label: (channelName[item.type] ?? item.type) + ' · ' + item.accountName }))} placeholder="Chọn tài khoản" ariaLabel="Chọn tài khoản kênh" searchPlaceholder="Tìm tài khoản kênh..." /></label><label className="text-sm font-medium">Kho xuất<SearchableSelect value={warehouseId} onChange={setWarehouseId} options={warehouses.map(item => ({ value: item.id, label: item.code + ' · ' + item.name }))} placeholder="Chọn kho" ariaLabel="Chọn kho xuất" searchPlaceholder="Tìm mã hoặc tên kho..." /></label></section>
          <section className="rounded-xl border border-ink-200 bg-white p-4"><h3 className="font-semibold">Sản phẩm trong đơn mô phỏng</h3><form className="mt-3 grid gap-2 sm:grid-cols-[1.7fr_0.8fr_0.9fr_auto]" onSubmit={addLine}><SearchableSelect value={selectedSku} onChange={setSelectedSku} disabled={!mappings.length} options={mappings.map(item => ({ value: item.channelSku, label: item.channelSku + ' · ' + item.productName, disabled: lines.some(line => line.channelSku === item.channelSku) }))} placeholder="Chọn SKU đã ánh xạ" ariaLabel="Chọn SKU đã ánh xạ" searchPlaceholder="Tìm SKU hoặc tên sản phẩm..." /><input required name="quantity" type="number" min="0.001" step="0.001" placeholder="Số lượng" className="input"/><input required name="unitPrice" type="number" min="0" step="0.01" placeholder="Đơn giá" className="input"/><button className="btn-secondary" type="submit">Thêm</button></form>{!mappings.length && connectionId && <p className="mt-2 text-xs text-amber-700">Tài khoản này chưa có ánh xạ SKU.</p>}<ul className="mt-3 divide-y divide-ink-100">{preview.map(line => <li key={line.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate"><b>{line.channelSku}</b> · {line.mapping?.productName}</span><span className="shrink-0">{line.quantity} × {line.unitPrice.toLocaleString('vi-VN')} ₫ <button className="ml-2 text-red-700" type="button" onClick={() => setLines(value => value.filter(item => item.id !== line.id))}>Bỏ</button></span></li>)}</ul></section></>}
        {scenario && <section className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm"><p className="font-semibold text-brand-900">Đơn mô phỏng: {scenario.externalOrderId}</p><p className="mt-1 text-brand-800">{scenarioCancelled ? 'Đơn đã được hủy từ sàn.' : completed ? 'Đã hoàn tất toàn bộ luồng webhook.' : `Sẵn sàng bắn sự kiện: ${current.title}.`}</p>{scenario.orderId && <p className="mt-1 break-all text-xs text-brand-700">ID hệ thống: {scenario.orderId}</p>}</section>}
        {loading && <p className="text-sm text-ink-600">Đang tải cấu hình…</p>}
      </> : tab === 'cancellation' ? <>
        <section className="space-y-4 rounded-xl border border-ink-200 bg-white p-4">
          <label className="block text-sm font-medium">Tài khoản kênh<SearchableSelect value={connectionId} onChange={value => { setConnectionId(value); setCancelOrderId(''); setCancellationRun(null); }} options={connections.map(item => ({ value: item.id, label: (channelName[item.type] ?? item.type) + ' · ' + item.accountName }))} placeholder="Chọn tài khoản" ariaLabel="Chọn tài khoản kênh" searchPlaceholder="Tìm tài khoản kênh..." /></label>
          <label className="block text-sm font-medium">Đơn có thể hủy<SearchableSelect value={cancelOrderId} onChange={value => { setCancelOrderId(value); setCancellationRun(null); setError(''); }} disabled={ordersQuery.isLoading || !cancellableOrders.length} options={cancellableOrders.map(order => ({ value: order.id, label: `${order.orderNumber} · ${backendOrderStatuses[order.status] ?? order.status}` }))} placeholder={ordersQuery.isLoading ? 'Đang tải đơn…' : 'Chọn đơn đang chờ xử lý'} ariaLabel="Chọn đơn cần hủy" searchPlaceholder="Tìm mã đơn..." /></label>
          {!ordersQuery.isLoading && !cancellableOrders.length && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Kênh này không có đơn ở trạng thái Chờ xác nhận, Đã xác nhận hoặc Đang chuẩn bị.</p>}
          <label className="block text-sm font-medium">Lý do hủy<textarea className="input mt-1 min-h-24 w-full resize-y" value={cancellationReason} onChange={event => setCancellationReason(event.target.value)} maxLength={500} placeholder="Nhập lý do hủy đơn" /></label>
        </section>
        {cancellationRun && <section className={'rounded-xl border p-4 ' + (cancellationRun.failed ? 'border-rose-200 bg-rose-50' : 'border-brand-100 bg-white')} aria-live="polite"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">Xử lý hủy đơn</h3><span className={'text-xs font-medium ' + (cancellationRun.failed ? 'text-rose-700' : cancellationRun.phase === 3 ? 'text-emerald-700' : 'text-brand-700')}>{cancellationRun.failed ? 'Chưa hoàn tất' : cancellationRun.phase === 3 ? 'Đã hoàn tất' : 'Đang xử lý'}</span></div><ol className="space-y-2">{cancellationProcesses.map((label, index) => { const done = !cancellationRun.failed && (cancellationRun.phase === 3 || index < cancellationRun.phase); const active = !cancellationRun.failed && sending && index === cancellationRun.phase; return <li key={label} className="flex items-center gap-2 text-sm"><span className={'grid size-5 place-items-center rounded-full ' + (done ? 'bg-emerald-600 text-white' : active ? 'bg-brand-700 text-white' : 'bg-ink-100 text-ink-500')}>{done ? <Check size={13}/> : active ? <LoaderCircle size={13} className="animate-spin"/> : index + 1}</span><span className={done ? 'text-ink-700' : active ? 'font-medium text-ink-900' : 'text-ink-500'}>{label}</span></li>; })}</ol></section>}
        {cancelledExternalOrderId && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-semibold">Đã hủy đơn {cancelledExternalOrderId}</p><p className="mt-1">Trạng thái đơn và tồn kho đã được cập nhật.</p></section>}
      </> : <>
        <section className="space-y-4 rounded-xl border border-ink-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Tài khoản kênh<SearchableSelect value={connectionId} onChange={value => { setConnectionId(value); setLines([]); setSelectedSku(''); }} options={connections.map(item => ({ value: item.id, label: (channelName[item.type] ?? item.type) + ' · ' + item.accountName }))} placeholder="Chọn tài khoản" ariaLabel="Chọn tài khoản kênh" searchPlaceholder="Tìm tài khoản kênh..." /></label><label className="text-sm font-medium">Kho xuất<SearchableSelect value={warehouseId} onChange={setWarehouseId} options={warehouses.map(item => ({ value: item.id, label: item.code + ' · ' + item.name }))} placeholder="Chọn kho" ariaLabel="Chọn kho xuất" searchPlaceholder="Tìm mã hoặc tên kho..." /></label></div>
          <div><h3 className="text-sm font-semibold">Sản phẩm cho mỗi đơn</h3><form className="mt-2 grid gap-2 sm:grid-cols-[1.5fr_0.7fr_0.8fr_auto]" onSubmit={addLine}><SearchableSelect value={selectedSku} onChange={setSelectedSku} disabled={!mappings.length || sending} options={mappings.map(item => ({ value: item.channelSku, label: item.channelSku + ' · ' + item.productName, disabled: lines.some(line => line.channelSku === item.channelSku) }))} placeholder="Chọn SKU" ariaLabel="Chọn SKU cho batch" searchPlaceholder="Tìm SKU..."/><input required name="quantity" type="number" min="0.001" step="0.001" defaultValue="1" className="input" aria-label="Số lượng mỗi đơn"/><input required name="unitPrice" type="number" min="0" step="0.01" defaultValue="100000" className="input" aria-label="Đơn giá"/><button className="btn-secondary" type="submit" disabled={sending}>Thêm</button></form><ul className="mt-2 divide-y divide-ink-100">{preview.map(line => <li key={line.id} className="flex items-center justify-between py-2 text-sm"><span>{line.channelSku} · {line.mapping?.productName}</span><span>{line.quantity} × {line.unitPrice.toLocaleString('vi-VN')} ₫ <button type="button" className="ml-2 text-red-700" disabled={sending} onClick={() => setLines(value => value.filter(item => item.id !== line.id))}>Bỏ</button></span></li>)}</ul></div>
          <div className="flex items-end gap-3"><label className="block flex-1 text-sm font-medium">Số đơn trong batch<input className="input mt-1 w-full" type="number" min="5" max="50" value={batchSize} disabled={sending} onChange={event => setBatchSize(Number(event.target.value))}/></label><span className={'mb-1 rounded-full px-3 py-1.5 text-xs font-semibold ' + (queueStatus.mode === 'Sqs' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}>{queueStatus.mode === 'Sqs' ? 'SQS' : 'Direct'}</span></div>
          {queueStatus.mode === 'Direct' && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Chế độ Direct xử lý ngay. Chuyển backend sang SQS để demo hàng đợi bất đồng bộ.</p>}
          {queueStatus.deadLetter > 0 && <p className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-800">Dead-letter queue đang có {queueStatus.deadLetter} message cần kiểm tra.</p>}
          <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">Kho phải đủ tồn cho tổng số lượng của cả batch. Ví dụ 20 đơn × 1 sản phẩm cần ít nhất 20 sản phẩm khả dụng.</p>
        </section>
        {sending && demoOrders.length > 0 && <section className="rounded-xl border border-brand-200 bg-brand-50 p-4" aria-live="polite"><div className="flex items-center gap-3"><LoaderCircle className="shrink-0 animate-spin text-brand-700 motion-reduce:animate-none" size={22}/><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-brand-900">{cleaning ? 'Đang dọn dữ liệu demo…' : dispatching ? `Đang gửi ${sentOrders}/${demoOrders.length} webhook` : `Queue đang xử lý ${processedOrders}/${demoOrders.length} đơn`}</p><span className="text-xs tabular-nums text-brand-700">{batchElapsedSeconds}s</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-100"><span className={'block h-full rounded-full bg-brand-600 motion-reduce:animate-none ' + (cleaning ? 'w-full animate-pulse' : 'transition-[width] duration-300 motion-reduce:transition-none')} style={{ width: cleaning ? undefined : `${batchProgress}%` }}/></div></div></div><p className="mt-2 text-xs text-brand-700">{cleaning ? 'Đang hủy đơn, hoàn tồn và xóa dữ liệu liên quan.' : 'Bạn có thể theo dõi từng đơn bên dưới. Không đóng backend trong lúc worker đang xử lý.'}</p></section>}
        {demoOrders.length > 0 && <section className="rounded-xl border border-ink-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Batch {demoBatchId.slice(0, 8)}</h3><span className="text-xs text-ink-500">{processedOrders}/{demoOrders.length} hoàn tất · {batchElapsedSeconds}s</span></div>{!sending && batchSafeToCleanup && <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800"><Check size={17}/>Batch đã xử lý xong. Có thể kết thúc và dọn dữ liệu.</div>}<div className="max-h-64 divide-y divide-ink-100 overflow-y-auto">{demoOrders.map(order => <div key={order.orderNumber} className="py-2 text-sm"><div className="flex items-center justify-between gap-3"><span className="font-mono text-xs">{order.orderNumber}</span><span className={'flex items-center gap-1.5 text-xs font-semibold ' + (order.status === 'processed' ? 'text-emerald-700' : order.status === 'queued' || order.status === 'sending' ? 'text-brand-700' : 'text-rose-700')}>{(order.status === 'queued' || order.status === 'sending') && <LoaderCircle size={13} className="animate-spin motion-reduce:animate-none"/>}{order.status === 'processed' && <Check size={13}/>} {demoStatusLabel[order.status]}</span></div>{order.error && <p className="mt-1 text-xs leading-5 text-rose-700">{order.error}</p>}</div>)}</div></section>}
        {demoBatchId && !canCleanupDemo && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Tài khoản không có quyền dọn dữ liệu của batch demo.</p>}
        {cleanupNotice && <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{cleanupNotice}</section>}
      </>}
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    </div>
    <footer className="border-t border-ink-200 bg-white p-4">
      {tab === 'lifecycle' ? <div className="flex justify-between gap-3">{scenario && <button type="button" className="btn-secondary" onClick={reset}>Tạo kịch bản mới</button>}<button type="button" className="btn-primary ml-auto" disabled={sending || completed || scenarioCancelled || (!scenario && !ready)} onClick={() => { void advance(); }}><Radio size={16} className={sending ? 'animate-pulse' : ''}/>{scenarioCancelled ? 'Đơn đã hủy' : completed ? 'Đã hoàn tất' : sending ? 'Đang xử lý…' : scenario ? `Bắn: ${current.title}` : 'Bắt đầu: Tạo đơn'}</button></div>
        : tab === 'cancellation' ? <button type="button" className="btn-primary ml-auto" disabled={sending || !cancelOrderId || !cancellationReason.trim()} onClick={() => { void cancelOrder(); }}><Radio size={16} className={sending ? 'animate-pulse' : ''}/>{sending ? 'Đang xử lý…' : 'Bắn webhook hủy đơn'}</button>
          : <div className="flex justify-end gap-3">{demoBatchId && <button type="button" className="btn-secondary" disabled={sending || !batchSafeToCleanup || !canCleanupDemo} onClick={() => setCleanupConfirmOpen(true)}>{cleaning && <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none"/>}{cleaning ? 'Đang dọn dữ liệu…' : 'Kết thúc và dọn dữ liệu'}</button>}<button type="button" className="btn-primary" disabled={sending || !ready || batchSize < 5 || batchSize > 50 || Boolean(demoBatchId)} onClick={() => { void startLoadDemo(); }}>{sending && !cleaning ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none"/> : <Radio size={16}/>} {sending ? cleaning ? 'Chờ dọn dữ liệu' : dispatching ? `Đang gửi ${sentOrders}/${demoOrders.length}` : `Đang xử lý ${processedOrders}/${demoOrders.length}` : 'Bắn đồng thời'}</button></div>}
    </footer>
  </aside><ConfirmDialog open={cleanupConfirmOpen} onClose={() => setCleanupConfirmOpen(false)} onConfirm={() => { void cleanupDemoBatch(); }} title="Kết thúc batch demo?" message={`Hệ thống sẽ hủy và xóa ${processedOrders} đơn demo, đồng thời hoàn lại tồn kho đã giữ.`} confirmLabel="Dọn dữ liệu" /></>;
}

export function WebhookSimulationLauncher() {
  const { activeRole } = useAuth(); const [open, setOpen] = useState(false);
  if (activeRole !== 'admin' && activeRole !== 'manager') return null;
  return <>{open && <button type="button" className="fixed inset-0 z-[70] cursor-default bg-ink-950/20" onClick={() => setOpen(false)} aria-label="Đóng bảng mô phỏng"/>}<Panel open={open} onClose={() => setOpen(false)} /><button type="button" onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-[60] grid size-14 place-items-center rounded-full bg-brand-700 text-white shadow-xl shadow-brand-950/30 transition hover:scale-105 hover:bg-brand-800" aria-label="Mở mô phỏng Flash Sale" title="Mô phỏng Flash Sale"><CirclePlay size={27}/></button></>;
}

export function WebhookSimulatorPage() { return <div className="p-6 text-sm text-ink-600">Dùng nút Mô phỏng Flash Sale ở góc dưới bên phải để chạy kịch bản webhook.</div>; }
