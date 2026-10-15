import { ShieldCheck, Truck, RotateCcw, Headphones } from "lucide-react"

const reasons = [
  {
    icon: ShieldCheck,
    title: "Only genuine products",
    body: "Every item is sourced from verified suppliers and ships with a genuine GST invoice.",
  },
  {
    icon: Truck,
    title: "Delivery you can plan around",
    body: "See an exact delivery date before you buy — no vague estimates.",
  },
  {
    icon: RotateCcw,
    title: "Returns without the runaround",
    body: "7-day returns on eligible items for damaged, wrong or defective products.",
  },
  {
    icon: Headphones,
    title: "Real support",
    body: "Track orders, raise a ticket and get clear answers from the Timora team.",
  },
]

export function WhyTimora() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h2 className="mb-5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        Why shop with Timora
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reasons.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-lg border border-border bg-card p-5">
            <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
