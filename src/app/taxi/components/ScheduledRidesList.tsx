"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import type { ScheduledRide } from "../lib/types"

interface ScheduledRidesListProps {
  refreshKey?: number
}

export function ScheduledRidesList({ refreshKey }: ScheduledRidesListProps) {
  const { user } = useAuth()
  const [rides, setRides] = useState<ScheduledRide[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchScheduledRides()
  }, [user, refreshKey])

  async function fetchScheduledRides() {
    if (!user) return

    setLoading(true)
    const { data } = await getSupabase()
      .from("scheduled_rides")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["scheduled", "notified"])
      .order("scheduled_date", { ascending: true })

    setRides(data || [])
    setLoading(false)
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancelar este agendamento?")) return
    await getSupabase()
      .from("scheduled_rides")
      .update({ status: "cancelled" })
      .eq("id", id)
    fetchScheduledRides()
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
    return <p className="text-center text-taxi-gray-500 py-4">Carregando agendamentos...</p>
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
