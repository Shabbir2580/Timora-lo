import Link from "next/link"
import Image from "next/image"
import type { Category } from "@/lib/data"

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4 text-center transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-secondary">
        <Image
          src={category.image || "/placeholder.svg"}
          alt={category.name}
          width={160}
          height={160}
          className="size-4/5 object-contain transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{category.name}</p>
        <p className="text-xs text-muted-foreground">{category.productCount} products</p>
      </div>
    </Link>
  )
}
