"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { RideForm } from "../components/RideForm"
import { RideList } from "../components/RideList"
import type { Ride } from "../lib/types"

export default function RidesPage() {
  const { user } = useAuth()
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchRides()
    }
  }, [user])

  async function fetchRides() {
    if (!user) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data } = await getSupabase()
      .from("rides")
      .select("*")
      .eq("user_id", user.id)
      .gte("ride_date", today.toISOString())
      .order("ride_date", { ascending: false })

    setRides(data || [])
    setLoading(false)
  }

  async function handleDelete(id: string) {
    await getSupabase().from("rides").delete().eq("id", id)
    fetchRides()
  }

  function getEarnings(ride: Ride): number {
    if (ride.type === "passed" && ride.commission) {
      return ride.commission
    }
    return ride.value
  }

  const totalValue = rides.reduce((sum, ride) => sum + getEarnings(ride), 0)

  return (
    <main className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Corridas de Hoje</h2>
        <div className="p-4 bg-taxi-gray-50 rounded-xl">
          <p className="text-sm text-taxi-gray-500">Total</p>
          <p className="text-2xl font-bold text-taxi-success">
            R$ {totalValue.toFixed(2)}
          </p>
        </div>
      </div>

      <RideForm onSuccess={fetchRides} />

      <div className="mt-6">
        {loading ? (
          <p className="text-center text-taxi-gray-500">Carregando...</p>
        ) : (
          <RideList rides={rides} onDelete={handleDelete} />
        )}
      </div>
    </main>
  )
}