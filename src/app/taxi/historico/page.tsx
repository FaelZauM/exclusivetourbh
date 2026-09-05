"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { ProgressBar } from "../components/ProgressBar"
import type { Ride, User } from "../lib/types"

export default function HistoricoPage() {
  const { user } = useAuth()
  const [rides, setRides] = useState<Ride[]>([])
  const [drivers, setDrivers] = useState<User[]>([])
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
      .order("ride_date", { ascending: false })

    setRides(data || [])

    const { data: driversData } = await getSupabase()
      .from("users")
      .select("*")
      .eq("role", "driver")

    setDrivers(driversData || [])
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

  function getDriverName(userId: string): string {
    if (user?.id === userId) return "Você"
    const driver = drivers.find((d) => d.id === userId)
    return driver?.nome || "Desconhecido"
  }

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

          {rides.length === 0 ? (
            <p className="text-center text-taxi-gray-500 py-8">
              Nenhuma corrida registrada neste mês.
            </p>
          ) : (
            <div className="space-y-2">
              {rides.map((ride) => (
                <div
                  key={ride.id}
                  className="p-4 bg-white border border-taxi-gray-200 rounded-xl"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{ride.category}</span>
                        <span className="text-xs text-taxi-gray-500">
                          {ride.type === "own" ? "Própria" : "Passada"}
                        </span>
                        {ride.user_id !== user?.id && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            👤 {getDriverName(ride.user_id)}
                          </span>
                        )}
                      </div>
                      {ride.passenger_name && (
                        <p className="text-sm text-taxi-gray-500 mt-1">
                          Passageiro: {ride.passenger_name}
                        </p>
                      )}
                      {(ride.start_location || ride.end_location) && (
                        <p className="text-sm text-taxi-gray-500">
                          {ride.start_location} → {ride.end_location}
                        </p>
                      )}
                      <p className="text-xs text-taxi-gray-500 mt-1">
                        {new Date(ride.ride_date).toLocaleDateString("pt-BR")} {new Date(ride.ride_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-taxi-success">R$ {getEarnings(ride).toFixed(2)}</p>
                      {ride.commission && !ride.received_with_client && (
                        <p className="text-xs text-taxi-gray-500">
                          Total: R$ {ride.value.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}
