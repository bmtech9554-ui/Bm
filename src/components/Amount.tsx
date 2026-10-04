export function formatUsdt(value: string): string {
  const [whole, fraction = '000000'] = value.split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + fraction;
}
export default function Amount({ value, compact = false }: { value: string; compact?: boolean }) {
  return <span className={compact ? 'amount compact' : 'amount'}>{formatUsdt(value)} USDT</span>;
}
