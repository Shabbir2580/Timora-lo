export function formatINR(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`
}

export function discountPercent(price: number, mrp: number): number {
  if (!mrp || mrp <= price) return 0
  return Math.round(((mrp - price) / mrp) * 100)
}
