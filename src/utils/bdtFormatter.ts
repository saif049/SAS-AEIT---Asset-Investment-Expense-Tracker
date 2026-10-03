/**
 * Bangladeshi Taka (BDT) Currency Formatter
 * Supports South Asian numbering system (Crore, Lakh, Thousand)
 * Example: 1234567.5 -> ৳ 12,34,567.50
 */

export function formatBDT(value: number | string | null | undefined, showSymbol: boolean = true): string {
  if (value === null || value === undefined || value === '') {
    return showSymbol ? '৳ 0.00' : '0.00';
  }

  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(num)) {
    return showSymbol ? '৳ 0.00' : '0.00';
  }

  const isNegative = num < 0;
  const absNum = Math.abs(num);
  const parts = absNum.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // South Asian formatting: last 3 digits, then groups of 2 digits
  let result = '';
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    result = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  } else {
    result = integerPart;
  }

  const formatted = `${result}.${decimalPart}`;
  const sign = isNegative ? '-' : '';

  return showSymbol ? `${sign}৳ ${formatted}` : `${sign}${formatted}`;
}

export function formatBDTShort(value: number): string {
  if (Math.abs(value) >= 10000000) {
    return `৳ ${(value / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(value) >= 100000) {
    return `৳ ${(value / 100000).toFixed(2)} L`;
  }
  if (Math.abs(value) >= 1000) {
    return `৳ ${(value / 1000).toFixed(1)}k`;
  }
  return `৳ ${value.toFixed(0)}`;
}

export function parseBDTInput(input: string): number {
  if (!input) return 0;
  const clean = input.replace(/[৳,\s]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatRawNumericInput(input: string): string {
  // Strips non-digits except single decimal point, formats integer portion
  const clean = input.replace(/[^\d.]/g, '');
  const parts = clean.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  return clean;
}
