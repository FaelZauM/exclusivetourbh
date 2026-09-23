"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "../lib/auth-context"
import { useToast } from "../lib/toast-context"
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from "../lib/notification-service"
import type { Notification } from "../lib/types"

interface NotificationsListProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationsList({ isOpen, onClose }: NotificationsListProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEscape)
    closeRef.current?.focus()
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  useEffect(() => {
    if (user && isOpen) fetchNotifications()
  }, [user, isOpen])

  async function fetchNotifications() {
    if (!user) return
    setLoading(true)
    try {
      const data = await getUserNotifications(user.id)
      setNotifications(data)
      setError(null)
    } catch {
      setError("Erro ao carregar notificações")
      showToast("Erro ao carregar notificações", "error")
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await markNotificationRead(id)
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ))
    } catch {
      showToast("Erro ao marcar notificação", "error")
    }
  }

  async function handleMarkAllRead() {
    if (!user) return
    try {
      await markAllNotificationsRead(user.id)
      setNotifications(notifications.map(n => ({ ...n, read: true })))
      showToast("Todas marcadas como lidas", "success")
    } catch {
      showToast("Erro ao marcar notificações", "error")
    }
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Notificações"
    >
      <div className="bg-white rounded-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
          <div className="flex gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-taxi-primary hover:text-taxi-primary-dark"
            >
              Marcar todas como lidas
            </button>
            <button
              ref={closeRef}
              onClick={onClose}
              className="text-taxi-gray-500 hover:text-taxi-gray-700 p-1"
              aria-label="Fechar notificações"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-xl bg-gray-50 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-3">{error}</p>
              <button
                onClick={fetchNotifications}
                className="px-4 py-2 bg-taxi-primary text-white rounded-xl text-sm"
              >
                Tentar novamente
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center text-taxi-gray-500">Nenhuma notificação</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && handleMarkRead(notif.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      if (!notif.read) handleMarkRead(notif.id)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`p-3 rounded-xl cursor-pointer transition-colors ${
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
