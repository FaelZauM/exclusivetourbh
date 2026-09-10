"use client"

import { useState } from "react"
import { useAuth } from "../lib/auth-context"
import { NotificationBadge } from "./NotificationBadge"
import { NotificationsList } from "./NotificationsList"

export function Header() {
  const { user, signOut } = useAuth()
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <>
      <header className="sticky top-0 bg-white dark:bg-gray-900 border-b border-taxi-gray-200 dark:border-gray-700 px-4 py-3 z-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg dark:text-white">ExclusivePro</h1>
            {user && (
              <p className="text-xs text-taxi-gray-500 dark:text-gray-400">{user.nome}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative text-taxi-gray-500 hover:text-taxi-gray-900"
            >
              🔔
              <NotificationBadge />
            </button>
            <button
              onClick={signOut}
              className="text-sm text-taxi-gray-500 dark:text-gray-400 hover:text-taxi-gray-900 dark:hover:text-white"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      
      <NotificationsList
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  )
}
