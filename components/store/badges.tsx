import { ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ProductBadge } from "@/lib/data"

const badgeStyles: Record<ProductBadge, string> = {
  NEW: "bg-info text-info-foreground",
  SALE: "bg-sale text-white",
  BESTSELLER: "bg-foreground text-background",
  TRENDING: "bg-accent text-accent-foreground",
  "LIMITED STOCK": "bg-warning text-warning-foreground",
}

export function ProductBadgePill({ badge, className }: { badge: ProductBadge; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        badgeStyles[badge],
        className,
      )}
    >
      {badge}
    </span>
  )
}

export function VerifiedBadge({
  className,
  withLabel = true,
}: {
  className?: string
  withLabel?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded text-xs font-medium text-primary",
        className,
      )}
    >
      <ShieldCheck className="size-3.5" aria-hidden />
      {withLabel && "Timora Verified"}
    </span>
  )
}
