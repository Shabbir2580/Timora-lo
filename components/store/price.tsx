import { cn } from "@/lib/utils"
import { formatINR, discountPercent } from "@/lib/format"

interface PriceProps {
  price: number
  mrp?: number
  size?: "sm" | "md" | "lg"
  className?: string
  sale?: boolean
}

const sizes = {
  sm: { now: "text-base", was: "text-xs", off: "text-xs" },
  md: { now: "text-xl", was: "text-sm", off: "text-sm" },
  lg: { now: "text-3xl", was: "text-base", off: "text-sm" },
}

export function Price({ price, mrp, size = "sm", className, sale = false }: PriceProps) {
  const s = sizes[size]
  const off = sale && mrp ? discountPercent(price, mrp) : 0
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className={cn("font-bold tracking-tight text-foreground tabular-nums", s.now)}>
        {formatINR(price)}
      </span>
      {mrp && off > 0 && (
        <>
          <span className={cn("text-muted-foreground line-through tabular-nums", s.was)}>
            {formatINR(mrp)}
          </span>
          <span className={cn("font-semibold text-sale", s.off)}>{off}% OFF</span>
        </>
      )}
    </div>
  )
}
