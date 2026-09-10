"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../lib/auth-context"
import { getUnreadCount } from "../lib/notification-service"

export function NotificationBadge() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (user) {
      fetchCount()
      const interval = setInterval(fetchCount, 30000) // Check every 30s
      return () => clearInterval(interval)
    }
  }, [user])

  async function fetchCount() {
    if (!user) return
    const unreadCount = await getUnreadCount(user.id)
    setCount(unreadCount)
  }

  if (count === 0) return null

  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
      {count > 9 ? "9+" : count}
    </span>
  )
}