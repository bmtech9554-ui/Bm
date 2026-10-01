export default function Amount({ value, compact = false }: { value: number; compact?: boolean }) {
  return <span className={compact ? "amount compact" : "amount"}>{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</span>;
}
