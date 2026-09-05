"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/taxi/corridas", label: "Corridas", icon: "🚗" },
  { href: "/taxi/investimento", label: "Investimento", icon: "💰" },
  { href: "/taxi/metas", label: "Metas", icon: "🎯" },
  { href: "/taxi/config", label: "Config", icon: "⚙️" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-taxi-gray-200 px-4 py-2">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center py-2 px-3 rounded-lg ${
              pathname === item.href
                ? "text-taxi-primary"
                : "text-taxi-gray-500"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
