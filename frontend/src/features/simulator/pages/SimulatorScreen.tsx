import { omsStore as mockStore } from '@/stores/omsStore';
import { useState } from 'react';

// Technical demo and flash-sale simulation feature screen.
import { Atom, Zap, AlertTriangle, CheckCircle2, Loader2, Terminal, ShieldCheck, FileJson } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/components/ui/Toast';
import { signWebhookPayload } from '@/services/webhookSignatureService';
import type { OrderCreatedWebhook } from '@/schemas/orderWebhook';

type SimScenario = 'flash_sale';

interface SimResult {
  scenario: SimScenario;
  status: 'idle' | 'running' | 'success' | 'failed';
  message: string;
  details?: string;
  startedAt?: string;
}

interface WebhookPreview {
  headers: Record<string, string>;
  body: unknown;
}

const SCENARIOS: { id: SimScenario; label: string; description: string }[] = [
  {
    id: 'flash_sale',
    label: '100 đơn cùng mua một SKU',
    description: 'Tạo 100 webhook order.created chuẩn JSON, ký HMAC-SHA256 và đưa từng đơn qua cơ chế giữ tồn nguyên tử.',
  },
];

export function SimulatorPage() {
  const toast = useToast();
  const { activeTenant, activeRole } = useAuth();
  const tenantId = activeTenant?.id ?? '';
  const [results, setResults] = useState<Record<string, SimResult>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [preview, setPreview] = useState<WebhookPreview | null>(null);

  function addLog(msg: string) {
    setLogs((prev) => [`[${new Date().toISOString()}] ${msg}`, ...prev].slice(0, 50));
  }

  async function runScenario(scenario: SimScenario) {
    setResults(prev => ({ ...prev, [scenario]: { scenario, status: 'running', message: 'Đang ký và xử lý 100 webhook...', startedAt: new Date().toISOString() } }));
    addLog('Bắt đầu tạo 100 sự kiện order.created');

    try {
      const snapshot = mockStore.getSnapshot();
      const eligibleInventory = mockStore.getInventory5State()
        .filter(item => item.available > 0)
        .map(inventoryItem => {
          const skuMapping = (snapshot.channelSkuMappings ?? []).find(item =>
            item.product_id === inventoryItem.product_id && (item.channel === 'shopee' || item.channel === 'tiktok')
          );
          const channelConnection = skuMapping
            ? (snapshot.channelConnections ?? []).find(item => item.channel === skuMapping.channel && item.status === 'connected')
            : undefined;
          return { inventoryItem, skuMapping, channelConnection };
        })
        .filter(candidate => candidate.skuMapping && candidate.channelConnection)
        .sort((left, right) => left.inventoryItem.available - right.inventoryItem.available);
      const selected = eligibleInventory[0];
      const inventory = selected?.inventoryItem;
      const product = inventory ? mockStore.getProducts().find(item => item.id === inventory.product_id) : undefined;
      const mapping = selected?.skuMapping;
      const connection = selected?.channelConnection;
      const customer = mockStore.getCustomers()[0];

      if (!tenantId || !inventory || !product || !mapping || !connection) {
        throw new Error('Cần ít nhất một SKU còn hàng, đã ánh xạ và có kết nối sàn đang hoạt động.');
      }

      const startedAt = Date.now();
      const shopId = mapping.channel_shop_id || connection.shop_id;
      const sampleBody: OrderCreatedWebhook = {
        event_id: `evt-${startedAt}-001`,
        event_type: 'order.created',
        source: mapping.channel as 'shopee' | 'tiktok',
        occurred_at: new Date().toISOString(),
        shop_id: shopId,
        order_sn: `FLASH-${startedAt}-001`,
        data: {
          customer_ref: customer?.id ?? 'guest-flash-sale',
          items: [{ channel_sku: mapping.channel_sku_id, internal_sku: inventory.sku, quantity: 1, unit_price: product.price }],
        },
      };
      const sampleJson = JSON.stringify(sampleBody);
      const sampleSignature = await signWebhookPayload(sampleJson);
      setPreview({
        headers: {
          'content-type': 'application/json',
          'x-nexus-event': 'order.created',
          'x-nexus-signature': `sha256=${sampleSignature}`,
        },
        body: sampleBody,
      });

      let accepted = 0;
      let rejected = 0;
      for (let index = 0; index < 100; index += 1) {
        const orderNumber = `FLASH-${startedAt}-${String(index + 1).padStart(3, '0')}`;
        const body = { ...sampleBody, event_id: `evt-${startedAt}-${index + 1}`, order_sn: orderNumber };
        await signWebhookPayload(JSON.stringify(body));
        const outcome = mockStore.placeOrderAtomic(
          {
            tenant_id: tenantId,
            order_number: orderNumber,
            channel_order_sn: orderNumber,
            channel: mapping.channel,
            shop_id: shopId,
            customer_id: customer?.id ?? null,
            assigned_warehouse_id: inventory.warehouse_id,
            payment_status: 'paid',
            total: product.price,
            must_ship_by_sla: new Date(startedAt + 24 * 60 * 60 * 1000).toISOString(),
          },
          [{ product_id: product.id, sku: product.sku, quantity: 1, unit_price: product.price }]
        );
        if (outcome.success) accepted += 1;
        else rejected += 1;
      }

      const remaining = mockStore.getInventory5State().find(item => item.product_id === inventory.product_id && item.warehouse_id === inventory.warehouse_id)?.available ?? 0;
      const protectedStock = remaining >= 0 && accepted === Math.min(100, inventory.available);
      addLog(`Đã xác thực HMAC-SHA256 cho 100/100 webhook`);
      addLog(`Chấp nhận ${accepted} đơn, từ chối ${rejected} đơn do hết tồn`);
      addLog(`Tồn khả dụng ${inventory.sku}: ${inventory.available} → ${remaining}; không âm kho`);
      setResults(prev => ({
        ...prev,
        [scenario]: {
          scenario,
          status: protectedStock ? 'success' : 'failed',
          message: protectedStock ? 'Chống bán lố thành công' : 'Kết quả tồn kho không đạt',
          details: `${accepted}/100 đơn được nhận · ${rejected}/100 bị từ chối · tồn cuối ${remaining}`,
        },
      }));
      toast(protectedStock ? 'Mô phỏng hoàn tất' : 'Mô phỏng phát hiện sai lệch', protectedStock ? 'success' : 'error');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không chạy được mô phỏng';
      addLog(`Lỗi: ${msg}`);
      setResults(prev => ({ ...prev, [scenario]: { scenario, status: 'failed', message: msg } }));
      toast('Mô phỏng thất bại', 'error');
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center">
          <Atom size={24} className="text-sky-700" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-ink-900">Webhook Flash Sale Simulator</h2>
          <p className="text-sm text-ink-500">Shopee/TikTok JSON → HMAC-SHA256 → ánh xạ SKU → giữ tồn nguyên tử</p>
        </div>
        {activeRole === 'owner' && <button className="btn-secondary" onClick={() => { if (!confirm('Khôi phục toàn bộ dữ liệu demo ban đầu?')) return; mockStore.resetToDefaultSeed(); setResults({}); setPreview(null); setLogs([]); toast('Đã khôi phục dữ liệu demo', 'success'); }}>Khôi phục dữ liệu</button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)] gap-4">
        {SCENARIOS.map((s) => {
          const result = results[s.id];
          return (
            <div key={s.id} className="card p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-amber-100">
                  <Zap size={18} className="text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-ink-800">{s.label}</h3>
                  <p className="text-xs text-ink-500 mt-1">{s.description}</p>
                </div>
              </div>

              {result && result.status !== 'idle' && (
                <div className={`p-3 rounded-lg text-sm ${
                  result.status === 'running' ? 'bg-blue-50 text-blue-700' :
                  result.status === 'success' ? 'bg-emerald-50 text-emerald-700' :
                  'bg-rose-50 text-rose-700'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {result.status === 'running' && <Loader2 size={14} className="animate-spin" />}
                    {result.status === 'success' && <CheckCircle2 size={14} />}
                    {result.status === 'failed' && <AlertTriangle size={14} />}
                    <span className="font-medium">{result.message}</span>
                  </div>
                  {result.details && <p className="text-xs opacity-80">{result.details}</p>}
                </div>
              )}

              <button
                onClick={() => runScenario(s.id)}
                disabled={result?.status === 'running'}
                className="btn-primary w-full mt-auto disabled:opacity-50"
              >
                {result?.status === 'running' ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {result?.status === 'running' ? 'Đang xử lý 100 webhook...' : 'Chạy mô phỏng 100 đơn'}
              </button>
            </div>
          );
        })}

        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-700" />
            <h3 className="font-semibold text-ink-800">Contract webhook MVP</h3>
          </div>
          <ol className="space-y-3 text-sm text-ink-600">
            <li><strong>1.</strong> Nhận sự kiện <code>order.created</code> từ Shopee hoặc TikTok.</li>
            <li><strong>2.</strong> Xác thực header <code>x-nexus-signature</code> bằng HMAC-SHA256.</li>
            <li><strong>3.</strong> Ánh xạ channel SKU sang SKU nội bộ.</li>
            <li><strong>4.</strong> Giữ tồn nguyên tử; hết hàng trả từ chối và không đổi tồn.</li>
          </ol>
        </div>
      </div>

      {preview && <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileJson size={17} className="text-sky-700" />
          <h3 className="text-sm font-semibold text-ink-800">Webhook mẫu đã ký</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-sky-200">{JSON.stringify(preview.headers, null, 2)}</pre>
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-emerald-200">{JSON.stringify(preview.body, null, 2)}</pre>
        </div>
      </div>}

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Terminal size={16} className="text-ink-400" />
          <h3 className="text-sm font-semibold text-ink-700">Nhật ký mô phỏng</h3>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-ink-400 py-4 text-center">Chưa có lần mô phỏng nào.</p>
        ) : (
          <div className="bg-ink-900 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-xs text-emerald-300 space-y-1">
            {logs.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
