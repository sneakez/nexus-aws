const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: 'VND', minimumFractionDigits: 0, maximumFractionDigits: 5,
});
const integer = new Intl.NumberFormat('vi-VN');

export function formatOrderMoney(value: number | string): string {
  if (typeof value === 'number') return Number.isFinite(value) ? currency.format(value) : 'Không xác định';
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return 'Không xác định';
  const fraction = match[3]?.replace(/0+$/, '');
  return match[1] + integer.format(BigInt(match[2])) + (fraction ? ',' + fraction : '') + '\u00a0₫';
}

/** Quote selected numeric fields before parsing, preserving their original decimal digits. */
export function parseMoneyResponse(json: string, fields: ReadonlySet<string>): unknown {
  const propertyOrString = /"(?:[^"\\]|\\[\s\S])*"(?:(\s*:\s*)(-?(?:0|[1-9]\d*)(?:\.\d+)?)(?=\s*[,}]))?/g;
  return JSON.parse(json.replace(propertyOrString, (token, separator?: string, amount?: string) => {
    if (separator === undefined || amount === undefined) return token;
    const key = token.slice(0, token.length - separator.length - amount.length);
    return fields.has(JSON.parse(key)) ? key + separator + JSON.stringify(amount) : token;
  }));
}

export function exactMoney(value: unknown): string {
  if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value)) {
    throw new Error('Dữ liệu số tiền không hợp lệ.');
  }
  return value;
}
