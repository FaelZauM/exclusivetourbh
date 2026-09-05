"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { ProgressBar } from "../components/ProgressBar"
import type { Ride } from "../lib/types"

interface WeekData {
  week: number
  label: string
  rides: Ride[]
  total: number
}

export default function HistoricoPage() {
  const { user } = useAuth()
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    if (user) {
      fetchRides()
    }
  }, [user, selectedMonth, selectedYear])

  async function fetchRides() {
    if (!user) return

    const startDate = new Date(selectedYear, selectedMonth - 1, 1)
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59)

    const { data } = await getSupabase()
      .from("rides")
      .select("*")
      .eq("user_id", user.id)
      .gte("ride_date", startDate.toISOString())
      .lte("ride_date", endDate.toISOString())
      .order("ride_date", { ascending: true })

    setRides(data || [])
    setLoading(false)
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

  function getWeeksInMonth(year: number, month: number): WeekData[] {
    const weeks: WeekData[] = []
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)

    let currentWeek = 1
    let weekStart = new Date(firstDay)
    let weekEnd = new Date(firstDay)
    weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()))

    while (weekStart <= lastDay) {
      if (weekEnd > lastDay) {
        weekEnd = new Date(lastDay)
      }

      const weekRides = rides.filter((ride) => {
        const rideDate = new Date(ride.ride_date)
        return rideDate >= weekStart && rideDate <= weekEnd
      })

      const weekTotal = weekRides.reduce((sum, ride) => sum + getEarnings(ride), 0)

      weeks.push({
        week: currentWeek,
        label: `${weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} - ${weekEnd.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`,
        rides: weekRides,
        total: weekTotal,
      })

      weekStart = new Date(weekEnd)
      weekStart.setDate(weekStart.getDate() + 1)
      weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      currentWeek++
    }

    return weeks
  }

  const weeks = getWeeksInMonth(selectedYear, selectedMonth)
  const monthTotal = rides.reduce((sum, ride) => sum + getEarnings(ride), 0)
  const monthGoal = 2000

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ]

  const years = [2025, 2026, 2027]

  return (
    <main className="p-4">
      <h2 className="text-xl font-bold mb-6">Histórico</h2>

      <div className="flex gap-2 mb-6">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="flex-1 px-4 py-3 border border-taxi-gray-200 rounded-xl"
        >
          {monthNames.map((name, index) => (
            <option key={index} value={index + 1}>{name}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="w-24 px-4 py-3 border border-taxi-gray-200 rounded-xl"
        >
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-center text-taxi-gray-500">Carregando...</p>
      ) : (
        <>
          <div className="mb-6">
            <ProgressBar
              current={monthTotal}
              goal={monthGoal}
              label="Meta do Mês"
            />
            <div className="p-4 bg-taxi-gray-50 rounded-xl mt-2">
              <p className="text-sm text-taxi-gray-500">Total do Mês</p>
              <p className="text-2xl font-bold text-taxi-success">
                R$ {monthTotal.toFixed(2)}
              </p>
              <p className="text-xs text-taxi-gray-500 mt-1">
                {rides.length} corridas registradas
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {weeks.map((week) => (
              <div key={week.week} className="p-4 bg-white border border-taxi-gray-200 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Semana {week.week}</h3>
                  <p className="font-bold text-taxi-success">R$ {week.total.toFixed(2)}</p>
                </div>
                <p className="text-xs text-taxi-gray-500 mb-2">{week.label}</p>
                <p className="text-xs text-taxi-gray-500">
                  {week.rides.length} corridas
                </p>
              </div>
            ))}
          </div>

          {rides.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Todas as Corridas</h3>
              <div className="space-y-2">
                {rides.map((ride) => (
                  <div
                    key={ride.id}
                    className="p-3 bg-white border border-taxi-gray-200 rounded-xl flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{ride.category}</p>
                      <p className="text-xs text-taxi-gray-500">
                        {new Date(ride.ride_date).toLocaleDateString("pt-BR")} {new Date(ride.ride_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <p className="font-bold text-taxi-success">R$ {getEarnings(ride).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
