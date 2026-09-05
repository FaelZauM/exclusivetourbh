"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { RideForm } from "../components/RideForm"
import { RideList } from "../components/RideList"
import type { Ride, User } from "../lib/types"

export default function RidesPage() {
  const { user } = useAuth()
  const [rides, setRides] = useState<Ride[]>([])
  const [drivers, setDrivers] = useState<User[]>([])
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

    let allRides: Ride[] = []

    if (user.role === "admin") {
      const { data: myRides } = await getSupabase()
        .from("rides")
        .select("*")
        .eq("user_id", user.id)
        .gte("ride_date", today.toISOString())
        .order("ride_date", { ascending: false })

      allRides = myRides || []

      const { data: carsData } = await getSupabase()
        .from("driver_cars")
        .select("driver_id")
        .eq("owner_id", user.id)
        .eq("active", true)

      if (carsData && carsData.length > 0) {
        const driverIds = carsData.map((c) => c.driver_id)

        const { data: driversData } = await getSupabase()
          .from("users")
          .select("*")
          .in("id", driverIds)

        setDrivers(driversData || [])

        const { data: driverRides } = await getSupabase()
          .from("rides")
          .select("*")
          .in("user_id", driverIds)
          .gte("ride_date", today.toISOString())
          .order("ride_date", { ascending: false })

        if (driverRides) {
          allRides = [...allRides, ...driverRides]
        }
      }
    } else {
      const { data: myRides } = await getSupabase()
        .from("rides")
        .select("*")
        .eq("user_id", user.id)
        .gte("ride_date", today.toISOString())
        .order("ride_date", { ascending: false })

      allRides = myRides || []
    }

    allRides.sort((a, b) => new Date(b.ride_date).getTime() - new Date(a.ride_date).getTime())
    setRides(allRides)
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

  function getAdminCommission(ride: Ride): number {
    if (ride.received_with_client) return 0
    if (ride.type === "passed" && ride.commission) {
      return ride.value - ride.commission
    }
    return 0
  }

  const totalOwn = rides
    .filter((r) => r.user_id === user?.id)
    .reduce((sum, ride) => sum + getEarnings(ride), 0)

  const totalDrivers = rides
    .filter((r) => r.user_id !== user?.id)
    .reduce((sum, ride) => sum + getAdminCommission(ride), 0)

  const totalWithCommission = totalOwn + totalDrivers

  return (
    <main className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Corridas de Hoje</h2>
        <div className="p-4 bg-taxi-gray-50 rounded-xl">
          <p className="text-sm text-taxi-gray-500">Total</p>
          <p className="text-2xl font-bold text-taxi-success">
            R$ {totalWithCommission.toFixed(2)}
          </p>
          {user?.role === "admin" && totalDrivers > 0 && (
            <p className="text-xs text-taxi-gray-500 mt-1">
              Inclui R$ {totalDrivers.toFixed(2)} de comissões
            </p>
          )}
        </div>
      </div>

      <RideForm onSuccess={fetchRides} />

      <div className="mt-6">
        {loading ? (
          <p className="text-center text-taxi-gray-500">Carregando...</p>
        ) : (
          <RideList 
            rides={rides} 
            onDelete={handleDelete} 
            onRefresh={fetchRides}
            currentUserId={user?.id}
            drivers={drivers}
          />
        )}
      </div>
    </main>
  )
}
