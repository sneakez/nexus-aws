import { omsStore as mockStore } from '@/stores/omsStore';
import { useAuth } from '@/providers/AuthProvider';

// Channel SKU mapping belongs to the Catalog domain.
import { hasPermission } from '@/lib/permissions';
import { useEffect, useMemo, useState } from 'react';
import { Link2, Plus, Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import { FullPageSpinner, Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/card';
import { CHANNEL_LABELS, CHANNEL_COLORS } from '@/lib/utils';
import type { ChannelSkuMapping, Product, Channel } from '@/types';

interface ChannelMappingPageProps {
  search: string;
}

interface MappingRow extends ChannelSkuMapping {
  internal_product?: Product;
}

const CHANNELS: Channel[] = ['website', 'shopee', 'tiktok', 'lazada', 'other_digital'];

export function ChannelMappingPage({ search }: ChannelMappingPageProps) {
  const toast = useToast();
  const { activeRole } = useAuth();
  const [, revise] = useState(0);
  const heldOrders = mockStore.getOrders().filter(o => o.hold_reason === 'SKU chưa map');
  const [mappings, setMappings] = useState<MappingRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string>('all');

  async function load() {
    setLoading(true);
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase
        .from('channel_sku_mappings')
        .select('*, internal_product:products(*)')
        .order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('name'),
    ]);
    setMappings((m ?? []) as MappingRow[]);
    setProducts(p ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return mappings.filter((m) => {
      if (channelFilter !== 'all' && m.channel !== channelFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          m.channel_sku_id.toLowerCase().includes(q) ||
          m.internal_product?.name.toLowerCase().includes(q) ||
          m.internal_product?.sku.toLowerCase().includes(q) ||
          m.channel_product_id?.toLowerCase().includes(q) ||
          (m.channel || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [mappings, search, channelFilter]);

  async function handleDelete(mapping: ChannelSkuMapping) {
    const { error } = await supabase
      .from('channel_sku_mappings')
      .delete()
      .eq('id', mapping.id);
    if (error) {
      toast('Không thể xóa ánh xạ: ' + error.message, 'error');
      return;
    }
    toast('Đã xóa ánh xạ', 'success');
    load();
  }

  if (loading) return <FullPageSpinner label="Đang tải ánh xạ SKU..." />;

  const byChannel = CHANNELS.map((ch) => ({
    channel: ch,
    count: mappings.filter((m) => m.channel === ch).length,
  }));

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900 tracking-tight">Ánh Xạ SKU Theo Kênh</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            {mappings.length} ánh xạ · liên kết SKU nội bộ với SKU trên sàn
          </p>
        </div>
        <button disabled={!hasPermission(activeRole, 'orders:manage')} onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Thêm ánh xạ
        </button>
      </div>

      {heldOrders.length > 0 && <section className="card p-4 space-y-3"><h2 className="font-semibold">Đơn chờ ánh xạ SKU</h2>{heldOrders.map(o => <div key={o.id} className="flex flex-wrap gap-3 items-center"><a className="text-blue-700 underline" href={`/app?page=orders&order=${o.id}`}>{o.order_number}</a>{hasPermission(activeRole, 'orders:manage') && <button className="btn-secondary" onClick={() => { const r = mockStore.resolveOrderMapping(o.id); toast(r.success ? 'Đã map SKU danh mục của đơn; Vận hành có thể giao kho' : r.error || 'Không thể map', r.success ? 'success' : 'error'); revise(n => n + 1); load(); }}>Xác nhận mapping SKU đã có</button>}</div>)}</section>}
      {/* Channel summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {byChannel.map(({ channel, count }) => (
          <Card key={channel} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn('badge', CHANNEL_COLORS[channel])}>
                {CHANNEL_LABELS[channel]}
              </span>
            </div>
            <p className="text-2xl font-bold text-ink-900 tabular-nums">{count}</p>
            <p className="text-xs text-ink-400">SKU đã ánh xạ</p>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <FilterPill active={channelFilter === 'all'} onClick={() => setChannelFilter('all')}>
          Tất cả kênh
        </FilterPill>
        {CHANNELS.map((ch) => (
          <FilterPill
            key={ch}
            active={channelFilter === ch}
            onClick={() => setChannelFilter(ch)}
          >
            {CHANNEL_LABELS[ch]}
          </FilterPill>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Link2}
            title={search || channelFilter !== 'all' ? 'Không có ánh xạ phù hợp' : 'Chưa có ánh xạ SKU'}
            description={
              search || channelFilter !== 'all'
                ? 'Hãy đổi từ khóa hoặc bộ lọc kênh'
                : 'Liên kết SKU nội bộ với SKU trên từng sàn để đồng bộ đơn hàng'
            }
            action={
              !search && channelFilter === 'all' && (
                <button onClick={() => setShowForm(true)} className="btn-primary">
                  <Plus size={16} /> Thêm ánh xạ
                </button>
              )
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden hover:shadow-lg hover:shadow-ink-200/40 transition-shadow duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/80 text-ink-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold">Sản phẩm nội bộ</th>
                  <th className="text-left px-5 py-3.5 font-semibold">SKU nội bộ</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Kênh</th>
                  <th className="text-left px-5 py-3.5 font-semibold">SKU trên sàn</th>
                  <th className="text-left px-5 py-3.5 font-semibold">Shop / Mã sản phẩm</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-ink-50/50 transition-colors group">
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink-900">
                        {m.internal_product?.name ?? '—'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <code className="text-xs font-mono text-ink-600 bg-ink-100 px-2 py-0.5 rounded">
                        {m.internal_product?.sku ?? '—'}
                      </code>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('badge', CHANNEL_COLORS[m.channel as Channel])}>
                        {CHANNEL_LABELS[m.channel as Channel]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <code className="text-xs font-mono font-semibold text-ink-700">
                        {m.channel_sku_id}
                      </code>
                    </td>
                    <td className="px-5 py-4 text-ink-500">
                      {m.channel_shop_id || m.channel_product_id ? (
                        <div className="flex flex-col gap-0.5">
                          {m.channel_shop_id && (
                            <span className="text-xs">Shop: {m.channel_shop_id}</span>
                          )}
                          {m.channel_product_id && (
                            <span className="text-xs flex items-center gap-1">
                              <ExternalLink size={11} /> {m.channel_product_id}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <button
                        onClick={() => handleDelete(m)}
                        className="p-1.5 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <MappingFormModal
        open={showForm}
        products={products}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          load();
          setShowForm(false);
        }}
      />
    </div>
  );
}

interface FormProps {
  open: boolean;
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}

function MappingFormModal({ open, products, onClose, onSaved }: FormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    channel: 'website' as Channel,
    channel_sku_id: '',
    internal_product_id: '',
    channel_shop_id: '',
    channel_product_id: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        channel: 'website',
        channel_sku_id: '',
        internal_product_id: products[0]?.id ?? '',
        channel_shop_id: '',
        channel_product_id: '',
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!form.internal_product_id) {
      toast('Hãy chọn sản phẩm nội bộ', 'error');
      return;
    }
    if (!form.channel_sku_id.trim()) {
      toast('Hãy nhập SKU trên sàn', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('channel_sku_mappings').insert({
      channel: form.channel,
      channel_sku_id: form.channel_sku_id.trim(),
      internal_product_id: form.internal_product_id,
      channel_shop_id: form.channel_shop_id.trim() || null,
      channel_product_id: form.channel_product_id.trim() || null,
    });
    if (error) {
      toast(
        error.code === '23505'
          ? 'SKU này đã được ánh xạ trên kênh đã chọn'
          : 'Không thể tạo ánh xạ: ' + error.message,
        'error'
      );
      setSaving(false);
      return;
    }
    toast('Đã tạo ánh xạ', 'success');
    setSaving(false);
    onSaved();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm Ánh Xạ SKU"
      subtitle="Liên kết sản phẩm nội bộ với SKU trên một kênh bán"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">
            Hủy
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving && <Spinner size={16} />}
            Tạo ánh xạ
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Sản phẩm nội bộ *</label>
          <select
            value={form.internal_product_id}
            onChange={(e) => setForm({ ...form, internal_product_id: e.target.value })}
            className="input"
          >
            <option value="">Chọn sản phẩm...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Kênh bán *</label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((ch) => (
              <button
                key={ch}
                onClick={() => setForm({ ...form, channel: ch })}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all',
                  form.channel === ch
                    ? CHANNEL_COLORS[ch] + ' border-current'
                    : 'border-ink-200 text-ink-500 hover:bg-ink-50'
                )}
              >
                {CHANNEL_LABELS[ch]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">SKU trên sàn *</label>
          <input
            value={form.channel_sku_id}
            onChange={(e) => setForm({ ...form, channel_sku_id: e.target.value })}
            placeholder="VD: SHOPEE-SKU-001"
            className="input font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Mã shop trên sàn</label>
            <input
              value={form.channel_shop_id}
              onChange={(e) => setForm({ ...form, channel_shop_id: e.target.value })}
              placeholder="Không bắt buộc"
              className="input"
            />
          </div>
          <div>
            <label className="label">Mã sản phẩm trên sàn</label>
            <input
              value={form.channel_product_id}
              onChange={(e) => setForm({ ...form, channel_product_id: e.target.value })}
              placeholder="Không bắt buộc"
              className="input"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200',
        active
          ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
          : 'bg-white border-ink-200 text-ink-600 hover:bg-ink-50 hover:border-ink-300'
      )}
    >
      {children}
    </button>
  );
}
