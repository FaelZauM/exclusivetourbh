"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { ProgressBar } from "../components/ProgressBar"
import { GoalForm } from "../components/GoalForm"
import { PersonalGoalForm } from "../components/PersonalGoalForm"
import type { Goal, DriverGoal } from "../lib/types"

export default function GoalsPage() {
  const { user } = useAuth()
  const [goals, setGoals] = useState<Goal | null>(null)
  const [driverGoal, setDriverGoal] = useState<DriverGoal | null>(null)
  const [todayEarnings, setTodayEarnings] = useState(0)
  const [weekEarnings, setWeekEarnings] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  async function fetchData() {
    if (!user) return

    const { data: goalsData } = await getSupabase()
      .from("goals")
      .select("*")
      .limit(1)
      .single()

    setGoals(goalsData)

    const { data: driverGoalData } = await getSupabase()
      .from("driver_goals")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)

    if (driverGoalData && driverGoalData.length > 0) {
      setDriverGoal(driverGoalData[0])
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: todayRides } = await getSupabase()
      .from("rides")
      .select("value")
      .eq("user_id", user.id)
      .eq("type", "own")
      .gte("ride_date", today.toISOString())

    const todayTotal = todayRides?.reduce((sum, ride) => sum + ride.value, 0) || 0
    setTodayEarnings(todayTotal)

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const { data: weekRides } = await getSupabase()
      .from("rides")
      .select("value")
      .eq("user_id", user.id)
      .eq("type", "own")
      .gte("ride_date", weekStart.toISOString())

    const weekTotal = weekRides?.reduce((sum, ride) => sum + ride.value, 0) || 0
    setWeekEarnings(weekTotal)

    setLoading(false)
  }

  if (loading) {
    return (
      <main className="p-4">
        <p className="text-center text-taxi-gray-500">Carregando...</p>
      </main>
    )
  }

  return (
    <main className="p-4">
      <h2 className="text-xl font-bold mb-6">Metas</h2>

      <div className="space-y-4">
        <ProgressBar
          current={todayEarnings}
          goal={goals?.daily_goal || 0}
          label="Meta Diária"
        />
        <ProgressBar
          current={weekEarnings}
          goal={goals?.weekly_goal || 0}
          label="Meta Semanal"
        />
        <ProgressBar
          current={todayEarnings}
          goal={driverGoal?.personal_goal || 0}
          label="Minha Meta Pessoal"
        />
      </div>

      <div className="mt-6">
        <PersonalGoalForm 
          currentGoal={driverGoal?.personal_goal || null} 
          onSuccess={fetchData} 
        />
      </div>

      {user?.role === "admin" && (
        <div className="mt-6">
          <GoalForm currentGoals={goals} onSuccess={fetchData} />
        </div>
      )}
    </main>
  )
}
