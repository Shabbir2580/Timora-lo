import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"

interface SectionHeaderProps {
  title: string
  subtitle?: string
  href?: string
  hrefLabel?: string
}

export function SectionHeader({ title, subtitle, href, hrefLabel = "View all" }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-balance text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {hrefLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  )
}

export function Section({ children }: { children: ReactNode }) {
  return <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</section>
}
