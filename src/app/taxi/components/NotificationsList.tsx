"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../lib/auth-context"
import { getUserNotifications, markNotificationRead, markAllAsRead } from "../lib/notification-service"
import type { Notification } from "../lib/types"

interface NotificationsListProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationsList({ isOpen, onClose }: NotificationsListProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && isOpen) fetchNotifications()
  }, [user, isOpen])

  async function fetchNotifications() {
    if (!user) return
    setLoading(true)
    const data = await getUserNotifications(user.id)
    setNotifications(data)
    setLoading(false)
  }

  async function handleMarkRead(id: string) {
    await markNotificationRead(id)
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }

  async function handleMarkAllRead() {
    if (!user) return
    await markAllAsRead(user.id)
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
          <div className="flex gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-taxi-primary"
            >
              Marcar todas como lidas
            </button>
            <button onClick={onClose} className="text-taxi-gray-500">
              ✕
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-center text-taxi-gray-500">Carregando...</p>
          ) : notifications.length === 0 ? (
            <p className="text-center text-taxi-gray-500">Nenhuma notificação</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && handleMarkRead(notif.id)}
                  className={`p-3 rounded-xl cursor-pointer ${
                    notif.read ? "bg-gray-50" : "bg-blue-50 border border-blue-200"
                  }`}
                >
                  <p className="font-medium text-sm">{notif.title}</p>
                  <p className="text-xs text-gray-600">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(notif.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
