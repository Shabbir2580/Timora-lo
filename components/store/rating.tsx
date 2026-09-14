import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface RatingProps {
  value: number
  count?: number
  size?: "sm" | "md"
  className?: string
}

export function Rating({ value, count, size = "sm", className }: RatingProps) {
  const dim = size === "sm" ? "size-3.5" : "size-4"
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="inline-flex items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 text-success">
        <Star className={cn(dim, "fill-current")} aria-hidden />
        <span className="text-xs font-semibold tabular-nums">{value.toFixed(1)}</span>
      </span>
      {count !== undefined && (
        <span className="text-xs text-muted-foreground tabular-nums">
          ({count.toLocaleString("en-IN")})
        </span>
      )}
    </div>
  )
}

export function StarBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i < Math.round(value) ? "fill-warning text-warning" : "fill-muted text-muted",
          )}
          aria-hidden
        />
      ))}
    </div>
  )
}
