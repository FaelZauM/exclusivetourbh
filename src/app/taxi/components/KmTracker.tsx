"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import type { Fuel } from "../lib/types"

export function KmTracker() {
  const { user } = useAuth()
  const [todayFuel, setTodayFuel] = useState<Fuel | null>(null)

  useEffect(() => {
    if (user) {
      fetchTodayFuel()
    }
  }, [user])

  async function fetchTodayFuel() {
    if (!user) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data } = await getSupabase()
      .from("fuel")
      .select("*")
      .eq("user_id", user.id)
      .gte("fuel_date", today.toISOString())
      .order("fuel_date", { ascending: false })
      .limit(1)
      .maybeSingle()

    setTodayFuel(data)
  }

  if (!todayFuel) {
    return null
  }

  const kmRodados = todayFuel.km_end && todayFuel.km_start
    ? todayFuel.km_end - todayFuel.km_start
    : null

  const consumo = kmRodados && todayFuel.liters
    ? (todayFuel.liters / kmRodados).toFixed(2)
    : null

  return (
    <div className="p-4 bg-taxi-gray-50 rounded-xl">
      <h3 className="font-semibold mb-2">KM do Dia</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-taxi-gray-500">KM Início</p>
          <p className="font-medium">{todayFuel.km_start || "-"}</p>
        </div>
        <div>
          <p className="text-taxi-gray-500">KM Fim</p>
          <p className="font-medium">{todayFuel.km_end || "-"}</p>
        </div>
        <div>
          <p className="text-taxi-gray-500">KM Rodados</p>
          <p className="font-medium">{kmRodados || "-"}</p>
        </div>
        <div>
          <p className="text-taxi-gray-500">Consumo (L/km)</p>
          <p className="font-medium">{consumo || "-"}</p>
        </div>
      </div>
    </div>
  )
}
