"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { useToast } from "../lib/toast-context"
import { RideForm } from "../components/RideForm"
import { RideList } from "../components/RideList"
import { ProgressBar } from "../components/ProgressBar"
import { KmTracker } from "../components/KmTracker"
import { ScheduledRideForm } from "../components/ScheduledRideForm"
import { ScheduledRidesList } from "../components/ScheduledRidesList"
import { ListSkeleton, StatsSkeleton } from "../components/Skeleton"
import type { Ride, User, Goal, DriverGoal } from "../lib/types"

export default function RidesPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [rides, setRides] = useState<Ride[]>([])
  const [drivers, setDrivers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dailyGoal, setDailyGoal] = useState(200)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchRides = useCallback(async () => {
    if (!user) return

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      let allRides: Ride[] = []

      if (user.role === "admin") {
        const { data: myRides, error: myErr } = await getSupabase()
          .from("rides")
          .select("*")
          .eq("user_id", user.id)
          .gte("ride_date", today.toISOString())
          .lt("ride_date", tomorrow.toISOString())
          .order("ride_date", { ascending: false })

        if (myErr) throw myErr
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
            .lt("ride_date", tomorrow.toISOString())
            .order("ride_date", { ascending: false })

          if (driverRides) {
            allRides = [...allRides, ...driverRides]
          }
        }
      } else {
        const { data: myRides, error: myErr } = await getSupabase()
          .from("rides")
          .select("*")
          .eq("user_id", user.id)
          .gte("ride_date", today.toISOString())
          .lt("ride_date", tomorrow.toISOString())
          .order("ride_date", { ascending: false })

        if (myErr) throw myErr
        allRides = myRides || []
      }

      allRides.sort((a, b) => new Date(b.ride_date).getTime() - new Date(a.ride_date).getTime())
      setRides(allRides)
      setError(null)
    } catch (err) {
      setError("Erro ao carregar corridas")
      showToast("Erro ao carregar corridas", "error")
    } finally {
      setLoading(false)
    }
  }, [user, showToast])

  const fetchGoal = useCallback(async () => {
    if (!user) return

    try {
      if (user.role === "admin") {
        const { data } = await getSupabase()
          .from("goals")
          .select("*")
          .limit(1)
          .single()

        if (data) setDailyGoal(data.daily_goal)
      } else {
        const { data } = await getSupabase()
          .from("driver_goals")
          .select("*")
          .eq("user_id", user.id)
          .single()

        if (data) setDailyGoal(data.personal_goal)
      }
    } catch {
      // Silent fail for goals
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchRides()
      fetchGoal()
    }
  }, [user, fetchRides, fetchGoal])

  async function handleDelete(id: string) {
    // Optimistic remove
    const prev = rides
    setRides((r) => r.filter((x) => x.id !== id))

    const { error } = await getSupabase().from("rides").delete().eq("id", id)
    if (error) {
      setRides(prev)
      showToast("Erro ao excluir corrida", "error")
    } else {
      showToast("Corrida excluída", "success")
    }
  }

  function getEarnings(ride: Ride): number {
    if (ride.received_with_client) return 0
    if (ride.type === "passed" && ride.commission) {
      if (ride.user_id === user?.id) return ride.value - ride.commission
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
    .filter((r) => r.user_id === user?.id && !r.added_by_admin)
    .reduce((sum, ride) => sum + getEarnings(ride), 0)

  const totalDrivers = rides
    .filter((r) => r.user_id !== user?.id)
    .reduce((sum, ride) => sum + getAdminCommission(ride), 0)

  const totalWithCommission = totalOwn + totalDrivers

  return (
    <main className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Corridas de Hoje</h2>
        {loading ? (
          <StatsSkeleton />
        ) : (
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
        )}
      </div>

      <div className="mb-6">
        <ProgressBar
          current={totalWithCommission}
          goal={dailyGoal}
          label="Meta Diária"
        />
      </div>

      <div className="mb-6">
        <KmTracker />
      </div>

      <ScheduledRidesList refreshKey={refreshKey} />

      <div className="mb-6">
        <ScheduledRideForm 
          onSuccess={() => setRefreshKey(k => k + 1)} 
        />
      </div>

      <RideForm onSuccess={fetchRides} />

      <div className="mt-6">
        {loading ? (
          <ListSkeleton count={3} />
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-3">{error}</p>
            <button
              onClick={() => { setLoading(true); fetchRides() }}
              className="px-4 py-2 bg-taxi-primary text-white rounded-xl text-sm"
            >
              Tentar novamente
            </button>
          </div>
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
