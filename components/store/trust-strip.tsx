
import {
  Headphones,
  SearchCheck,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
} from "lucide-react"

const items = [
  {
    icon: SearchCheck,
    title: "Explore thoughtfully",
    description: "Discover products across our collection.",
  },
  {
    icon: ShoppingBag,
    title: "Easy to browse",
    description: "Find details to help you choose.",
  },
  {
    icon: ShieldCheck,
    title: "Shop informed",
    description: "Review product information before ordering.",
  },
  {
    icon: Headphones,
    title: "Customer support",
    description: "Get in touch when you need assistance.",
  },
  {
    icon: Sparkles,
    title: "A considered collection",
    description: "Style, utility and everyday essentials.",
  },
]

export function TrustStrip() {
  return (
    <section
      aria-label="The Timora shopping experience"
      className="border-y border-[#c9a96e]/20 bg-[#11110f]"
    >
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-px bg-[#302c24] sm:grid-cols-3 lg:grid-cols-5">
        {items.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex min-h-28 items-start gap-3 bg-[#11110f] px-4 py-5 sm:min-h-32 sm:items-center sm:px-5 lg:px-6"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[#c9a96e]/25 bg-[#c9a96e]/5 text-[#d8bc88]">
              <Icon className="size-[18px]" aria-hidden="true" />
            </span>

            <div className="min-w-0">
              <h2 className="text-xs font-medium leading-5 text-[#f5f1e8] sm:text-sm">
                {title}
              </h2>
              <p className="mt-1 text-[10px] leading-5 text-[#b0aaa0] sm:text-xs">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
