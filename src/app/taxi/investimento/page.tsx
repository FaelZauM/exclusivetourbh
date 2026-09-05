"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { FuelForm } from "../components/FuelForm"
import { FuelPriceForm } from "../components/FuelPriceForm"
import { KmTracker } from "../components/KmTracker"
import type { Fuel } from "../lib/types"

export default function InvestmentPage() {
  const { user } = useAuth()
  const [totalSaved, setTotalSaved] = useState(0)
  const [recentFuel, setRecentFuel] = useState<Fuel[]>([])
  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  async function fetchData() {
    if (!user) return

    const { data: rides } = await getSupabase()
      .from("rides")
      .select("value")
      .eq("user_id", user.id)
      .eq("type", "own")

    const total = rides?.reduce((sum, ride) => sum + ride.value * 0.1, 0) || 0
    setTotalSaved(total)

    const { data: fuel } = await getSupabase()
      .from("fuel")
      .select("*")
      .eq("user_id", user.id)
      .order("fuel_date", { ascending: false })
      .limit(5)

    setRecentFuel(fuel || [])
  }

  return (
    <main className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Investimento</h2>
        <div className="p-4 bg-taxi-gray-50 rounded-xl">
          <p className="text-sm text-taxi-gray-500">Total Guardado (10%)</p>
          <p className="text-2xl font-bold text-taxi-success">
            R$ {totalSaved.toFixed(2)}
          </p>
        </div>
      </div>

      <KmTracker />

      <div className="mt-6 space-y-4">
        <FuelForm onSuccess={fetchData} />
        <FuelPriceForm onSuccess={fetchData} />
      </div>

      {recentFuel.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-3">Últimos Registros</h3>
          <div className="space-y-2">
            {recentFuel.map((fuel) => (
              <div
                key={fuel.id}
                className="p-3 bg-white border border-taxi-gray-200 rounded-xl text-sm"
              >
                <p className="font-medium">
                  R$ {fuel.total_value.toFixed(2)}
                  {fuel.liters && ` • ${fuel.liters}L`}
                </p>
                <p className="text-taxi-gray-500">
                  {new Date(fuel.fuel_date).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
