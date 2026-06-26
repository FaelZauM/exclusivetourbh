"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { WhatsAppButton } from "./WhatsAppButton"

const navLinks = [
  { href: "#servicos", label: "Serviços" },
  { href: "#frota", label: "Frota" },
  { href: "#cobertura", label: "Cobertura" },
  { href: "#contato", label: "Contato" },
]

export function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <a href="#" className="flex items-center gap-3">
          <span className="text-2xl font-extrabold text-ember">Ex</span>
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-extrabold tracking-[0.2em] text-ink">EXCLUSIVE</span>
            <span className="text-xs font-extrabold tracking-[0.2em] text-ink">TOUR BH</span>
          </div>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-silver transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
          <WhatsAppButton />
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <WhatsAppButton iconOnly />
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
          >
            {open ? <X className="h-6 w-6 text-ink" /> : <Menu className="h-6 w-6 text-ink" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-slate bg-canvas transition-all duration-300 md:hidden",
          open ? "max-h-80" : "max-h-0",
        )}
      >
        <nav className="flex flex-col gap-2 px-4 py-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-slate/50"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  )
}
