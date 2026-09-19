"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { useToast } from "../lib/toast-context"
import type { ScheduledRide } from "../lib/types"

interface ScheduledRidesListProps {
  refreshKey?: number
}

export function ScheduledRidesList({ refreshKey }: ScheduledRidesListProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [rides, setRides] = useState<ScheduledRide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) fetchScheduledRides()
  }, [user, refreshKey])

  async function fetchScheduledRides() {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await getSupabase()
        .from("scheduled_rides")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["scheduled", "notified"])
        .order("scheduled_date", { ascending: true })

      if (error) throw error
      setRides(data || [])
      setError(null)
    } catch {
      setError("Erro ao carregar agendamentos")
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancelar este agendamento?")) return

    const prev = rides
    setRides((r) => r.filter((x) => x.id !== id))

    const { error } = await getSupabase()
      .from("scheduled_rides")
      .update({ status: "cancelled" })
      .eq("id", id)

    if (error) {
      setRides(prev)
      showToast("Erro ao cancelar agendamento", "error")
    } else {
      showToast("Agendamento cancelado", "success")
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const categoryLabels: Record<string, string> = {
    cooperative: "Cooperativa",
    private: "Particular",
    invoiced: "Faturado",
  }

  if (loading) {
    return (
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Agendamentos</h3>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 bg-white border border-taxi-gray-200 rounded-xl animate-pulse">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Agendamentos</h3>
        <div className="text-center py-4">
          <p className="text-red-500 text-sm mb-2">{error}</p>
          <button
            onClick={fetchScheduledRides}
            className="text-sm text-taxi-primary"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (rides.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-3">Agendamentos</h3>
      <div className="space-y-2">
        {rides.map((ride) => (
          <div
            key={ride.id}
            className="p-3 bg-white border border-taxi-gray-200 rounded-xl"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">
                  {formatDate(ride.scheduled_date)}
                </p>
                <p className="text-xs text-taxi-gray-500">
                  {categoryLabels[ride.category]} • R$ {ride.value.toFixed(2)}
                </p>
                {ride.passenger_name && (
                  <p className="text-xs text-taxi-gray-500">
                    Passageiro: {ride.passenger_name}
                  </p>
                )}
                {ride.status === "notified" && (
                  <span className="text-xs text-green-600">Notificado</span>
                )}
              </div>
              <button
                onClick={() => handleCancel(ride.id)}
                className="text-xs text-red-500 hover:text-red-700"
                aria-label={`Cancelar agendamento de ${ride.passenger_name || ride.category}`}
              >
                Cancelar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
