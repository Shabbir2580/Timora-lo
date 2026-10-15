"use client"

import { useEffect, useState } from "react"

export function GoldCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100, visible: false })

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)")
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (!finePointer.matches || reducedMotion.matches) return

    let frame = 0
    const move = (event: PointerEvent) => {
      if (frame) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        setPosition({ x: event.clientX, y: event.clientY, visible: true })
      })
    }
    const leave = () => setPosition((current) => ({ ...current, visible: false }))
    window.addEventListener("pointermove", move, { passive: true })
    document.addEventListener("pointerleave", leave)

    return () => {
      window.removeEventListener("pointermove", move)
      document.removeEventListener("pointerleave", leave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className={`timora-cursor-ring ${position.visible ? "is-visible" : ""}`}
      style={{ left: position.x, top: position.y }}
    />
  )
}
