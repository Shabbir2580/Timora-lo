
import { Sparkles } from "lucide-react"

export function AnnouncementBar() {
  return (
    <div className="border-b border-[#c9a96e]/20 bg-[#11110f] text-[#dfc797]">
      <div className="mx-auto flex min-h-9 max-w-[1440px] items-center justify-center gap-2 px-3 py-2 text-center sm:px-6">
        <Sparkles className="size-3.5 shrink-0 text-[#c9a96e]" aria-hidden />
        <p className="text-[9px] font-medium uppercase tracking-[0.14em] sm:text-[10px] sm:tracking-[0.2em]">
          Discover thoughtful picks. Shop the Timora collection.
        </p>
      </div>
    </div>
  )
}
