"use client"

import { useState, useEffect, useCallback } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { useToast } from "../lib/toast-context"
import { RideForm } from "../components/RideForm"
import { RideList } from "../components/RideList"
import { ProgressBar } from "../components/ProgressBar"
import { KmTracker } from "../components/KmTracker"
import { ListSkeleton, StatsSkeleton } from "../components/Skeleton"
import type { Ride, User } from "../lib/types"

export default function RidesPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [rides, setRides] = useState<Ride[]>([])
  const [drivers, setDrivers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dailyGoal, setDailyGoal] = useState(200)

  const fetchRides = useCallback(async () => {
    if (!user) return

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todayStr = today.toISOString()
      const tomorrowStr = tomorrow.toISOString()

      if (user.role === "admin") {
        // Batch: fetch cars + my rides + goals in parallel
        const [carsResult, myRidesResult, goalResult] = await Promise.all([
          getSupabase()
            .from("driver_cars")
            .select("driver_id")
            .eq("owner_id", user.id)
            .eq("active", true),
          getSupabase()
            .from("rides")
            .select("id,user_id,type,category,car_type,value,commission,driver_name,passenger_name,company_name,ride_date,added_by_admin,received_with_client,paid_to_driver,created_at")
            .eq("user_id", user.id)
            .gte("ride_date", todayStr)
            .lt("ride_date", tomorrowStr)
            .order("ride_date", { ascending: false }),
          user.role === "admin"
            ? getSupabase().from("goals").select("daily_goal").limit(1).single()
            : getSupabase().from("driver_goals").select("personal_goal").eq("user_id", user.id).single(),
        ])

        if (myRidesResult.error) throw myRidesResult.error

        let allRides: Ride[] = myRidesResult.data || []

        const carsData = carsResult.data
        if (goalResult.data) {
          if (user.role === "admin") {
            setDailyGoal((goalResult.data as { daily_goal: number }).daily_goal)
          } else {
            setDailyGoal((goalResult.data as { personal_goal: number }).personal_goal)
          }
        }

        // If admin has drivers, fetch their rides + names in parallel
        if (carsData && carsData.length > 0) {
          const driverIds = carsData.map((c) => c.driver_id)

          const [driversResult, driverRidesResult] = await Promise.all([
            getSupabase()
              .from("users")
              .select("id,nome,email,role,created_at")
              .in("id", driverIds),
            getSupabase()
              .from("rides")
              .select("id,user_id,type,category,car_type,value,commission,driver_name,passenger_name,company_name,ride_date,added_by_admin,received_with_client,paid_to_driver,created_at")
              .in("user_id", driverIds)
              .gte("ride_date", todayStr)
              .lt("ride_date", tomorrowStr)
              .order("ride_date", { ascending: false }),
          ])

          setDrivers(driversResult.data || [])

          if (driverRidesResult.data) {
            allRides = [...allRides, ...driverRidesResult.data]
          }
        } else {
          setDrivers([])
        }

        allRides.sort((a, b) => new Date(b.ride_date).getTime() - new Date(a.ride_date).getTime())
        setRides(allRides)
      } else {
        // Non-admin: single query
        const { data, error } = await getSupabase()
          .from("rides")
          .select("id,user_id,type,category,car_type,value,commission,driver_name,passenger_name,company_name,ride_date,added_by_admin,received_with_client,paid_to_driver,created_at")
          .eq("user_id", user.id)
          .gte("ride_date", todayStr)
          .lt("ride_date", tomorrowStr)
          .order("ride_date", { ascending: false })

        if (error) throw error
        setRides(data || [])

        // Fetch personal goal
        const { data: goalData } = await getSupabase()
          .from("driver_goals")
          .select("personal_goal")
          .eq("user_id", user.id)
          .single()

        if (goalData) setDailyGoal(goalData.personal_goal)
      }

      setError(null)
    } catch (err) {
      setError("Erro ao carregar corridas")
      showToast("Erro ao carregar corridas", "error")
    } finally {
      setLoading(false)
    }
  }, [user, showToast])

  useEffect(() => {
    if (user) fetchRides()
  }, [user, fetchRides])

  async function handleDelete(id: string) {
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
