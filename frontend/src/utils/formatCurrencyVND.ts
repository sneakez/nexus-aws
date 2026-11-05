const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 5,
});

export function formatCurrencyVND(value: number) {
  return vndFormatter.format(value);
}
