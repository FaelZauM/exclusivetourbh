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
  const [adminCommission, setAdminCommission] = useState(0)
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

    if (user.role === "admin") {
      const { data: carsData } = await getSupabase()
        .from("driver_cars")
        .select("driver_id")
        .eq("owner_id", user.id)
        .eq("active", true)

      if (carsData && carsData.length > 0) {
        const driverIds = carsData.map((c) => c.driver_id)
        const { data: driverRides } = await getSupabase()
          .from("rides")
          .select("value, commission, type, received_with_client")
          .in("user_id", driverIds)
          .eq("type", "passed")
          .eq("added_by_admin", true)
          .gte("ride_date", today.toISOString())

        if (driverRides) {
          const totalCommission = driverRides.reduce((sum, ride) => {
            if (ride.received_with_client) return sum
            if (ride.commission) {
              return sum + (ride.value - ride.commission)
            }
            return sum
          }, 0)
          setAdminCommission(totalCommission)
        }
      }
    }

    setLoading(false)
  }

  async function handleDelete(id: string) {
    await getSupabase().from("rides").delete().eq("id", id)
    fetchRides()
  }

  function getEarnings(ride: Ride): number {
    if (ride.received_with_client) {
      return 0
    }
    if (ride.type === "passed" && ride.commission) {
      return ride.commission
    }
    return ride.value
  }

  const totalValue = rides.reduce((sum, ride) => sum + getEarnings(ride), 0)
  const totalWithCommission = totalValue + adminCommission

  return (
    <main className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Corridas de Hoje</h2>
        <div className="p-4 bg-taxi-gray-50 rounded-xl">
          <p className="text-sm text-taxi-gray-500">Total</p>
          <p className="text-2xl font-bold text-taxi-success">
            R$ {totalWithCommission.toFixed(2)}
          </p>
          {user?.role === "admin" && adminCommission > 0 && (
            <p className="text-xs text-taxi-gray-500 mt-1">
              Inclui R$ {adminCommission.toFixed(2)} de comissões
            </p>
          )}
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
