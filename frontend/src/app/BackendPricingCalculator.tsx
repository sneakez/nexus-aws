import { useState } from 'react';
import { formatJournalCents, journalCents } from '@/services/journals.service';

export function BackendPricingCalculator() {
  const [cost, setCost] = useState('');
  const [fees, setFees] = useState('0');
  const [margin, setMargin] = useState('0');
  const parse = (value: string) => journalCents(value.trim().replace(',', '.'));
  const amount = parse(cost);
  const feePoints = parse(fees);
  const marginPoints = parse(margin);
  const base = BigInt(10000);
  const denominator = feePoints !== null && marginPoints !== null ? base - feePoints - marginPoints : null;
  const minimum = amount !== null && denominator !== null && denominator > 0
    ? (amount * base + denominator - BigInt(1)) / denominator
    : null;
  return <section className="grid items-start gap-4 lg:grid-cols-2">
    <div className="card space-y-4 p-4 sm:p-6">
    <h2 className="font-semibold text-ink-900">Chi phí và tỷ lệ mục tiêu</h2>
    <p className="text-sm text-ink-600">Tính giá bán từ chi phí mỗi đơn vị, phí theo tỷ lệ và biên lợi nhuận mục tiêu.</p>
    <label className="block text-sm font-medium">Chi phí mỗi đơn vị (₫)
      <input value={cost} inputMode="decimal" onChange={event => setCost(event.target.value)} className="mt-1 block w-full rounded-lg border p-2" />
    </label>
    <label className="block text-sm font-medium">Phí trên giá bán (%)
      <input value={fees} inputMode="decimal" onChange={event => setFees(event.target.value)} className="mt-1 block w-full rounded-lg border p-2" />
    </label>
    <label className="block text-sm font-medium">Biên lợi nhuận mục tiêu (%)
      <input value={margin} inputMode="decimal" onChange={event => setMargin(event.target.value)} className="mt-1 block w-full rounded-lg border p-2" />
    </label>
    </div>
    <div className="card space-y-3 p-4 sm:p-6">
    <h2 className="font-semibold text-ink-900">Kết quả định giá</h2>
    <p role="status" className="rounded-lg bg-ink-50 p-4">
      {minimum === null
        ? 'Nhập các giá trị không âm có tối đa 2 chữ số thập phân. Tổng tỷ lệ phải dưới 100%.'
        : <>Giá bán tối thiểu theo bước 0,01 ₫ <strong>{formatJournalCents(minimum)}</strong></>}
    </p>
    </div>
  </section>;
}
