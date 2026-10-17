"use client"

import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"

const messages = [
  "A little luxury, thoughtfully chosen for every day.",
  "Find your signature piece with Timora.",
  "Explore watches, fragrance, audio and more.",
  "Your next favourite might be just one click away.",
  "Timeless details. Modern essentials. The Timora edit.",
  "Discover something that feels unmistakably you.",
]

export function AnnouncementBar() {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    // Pick a fresh message after hydration so server and client markup always match.
    setMessageIndex(Math.floor(Math.random() * messages.length))
  }, [])

  return (
    <div className="border-b border-[#d4af37]/25 bg-[#11110f] text-[#f5d76e]">
      <div className="mx-auto flex min-h-9 max-w-[1440px] items-center justify-center gap-2 px-3 py-2 text-center sm:px-6">
        <Sparkles className="size-3.5 shrink-0 text-[#d4af37]" aria-hidden="true" />
        <p
          key={messageIndex}
          className="animate-in fade-in duration-300 text-[9px] font-medium uppercase tracking-[0.12em] sm:text-[10px] sm:tracking-[0.2em]"
        >
          {messages[messageIndex]}
        </p>
      </div>
    </div>
  )
}
