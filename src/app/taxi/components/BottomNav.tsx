"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "../lib/auth-context"

const navItems = [
  { href: "/taxi/corridas", label: "Corridas", icon: "🚗" },
  { href: "/taxi/gastos", label: "Gastos", icon: "💸" },
  { href: "/taxi/historico", label: "Histórico", icon: "📊" },
  { href: "/taxi/config", label: "Config", icon: "⚙️" },
]

const adminNavItems = [
  { href: "/taxi/aluguel", label: "Aluguel", icon: "🔑" },
]

const driverNavItems = [
  { href: "/taxi/aluguel", label: "Aluguel", icon: "🔑" },
]

const developerNavItems = [
  { href: "/taxi/dev", label: "Dev", icon: "🛠️" },
]

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  let items = navItems
  if (user?.role === "developer") {
    items = [...navItems, ...developerNavItems]
  } else if (user?.role === "admin") {
    items = [...navItems, ...adminNavItems]
  } else if (user?.role === "driver") {
    items = [...navItems, ...driverNavItems]
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-taxi-gray-200 dark:border-gray-700 px-4 py-2 z-50">
      <div className="flex justify-around">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center py-2 px-3 rounded-lg ${
              pathname === item.href
                ? "text-taxi-primary"
                : "text-taxi-gray-500 dark:text-gray-400"
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
