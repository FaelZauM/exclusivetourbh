"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { ProgressBar } from "../components/ProgressBar"
import type { Ride, User, Fuel, RideCategory } from "../lib/types"

function getCategoryLabel(category: RideCategory): string {
  const labels: Record<RideCategory, string> = {
    app: "App",
    taximeter: "Taxímetro",
    cooperative: "Cooperativa",
    private: "Particular",
    invoiced: "Faturado",
  }
  return labels[category] || category
}

export default function HistoricoPage() {
  const { user } = useAuth()
  const [rides, setRides] = useState<Ride[]>([])
  const [drivers, setDrivers] = useState<User[]>([])
  const [fuelExpenses, setFuelExpenses] = useState<Fuel[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [typeFilter, setTypeFilter] = useState<"all" | "own" | "passed">("all")

  useEffect(() => {
    if (user) {
      fetchRides()
    }
  }, [user, selectedMonth, selectedYear])

  async function fetchRides() {
    if (!user) return

    setLoading(true)
    const startDate = new Date(selectedYear, selectedMonth - 1, 1)
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59)

    const { data: myRides } = await getSupabase()
      .from("rides")
      .select("*")
      .eq("user_id", user.id)
      .gte("ride_date", startDate.toISOString())
      .lte("ride_date", endDate.toISOString())
      .order("ride_date", { ascending: false })

    let allRides = myRides || []

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
          .select("*")
          .in("user_id", driverIds)
          .gte("ride_date", startDate.toISOString())
          .lte("ride_date", endDate.toISOString())
          .order("ride_date", { ascending: false })

        if (driverRides) {
          allRides = [...allRides, ...driverRides]
        }
      }

      const { data: fuel } = await getSupabase()
        .from("fuel")
        .select("*")
        .eq("user_id", user.id)
        .gte("fuel_date", startDate.toISOString())
        .lte("fuel_date", endDate.toISOString())
        .order("fuel_date", { ascending: false })

      setFuelExpenses(fuel || [])
    }

    allRides.sort((a, b) => new Date(b.ride_date).getTime() - new Date(a.ride_date).getTime())
    setRides(allRides)

    const { data: driversData } = await getSupabase()
      .from("users")
      .select("*")
      .eq("role", "driver")

    setDrivers(driversData || [])
    setLoading(false)
  }

  async function togglePaidToDriver(ride: Ride) {
    await getSupabase()
      .from("rides")
      .update({ paid_to_driver: !ride.paid_to_driver })
      .eq("id", ride.id)

    setRides((prev) =>
      prev.map((r) => (r.id === ride.id ? { ...r, paid_to_driver: !r.paid_to_driver } : r))
    )
  }

  function getEarnings(ride: Ride): number {
    if (ride.received_with_client) return 0
    if (ride.type === "passed" && ride.commission) {
      if (ride.user_id === user?.id) {
        return ride.value - ride.commission
      }
      return ride.commission
    }
    return ride.value
  }

  function getRepassedValue(ride: Ride): number {
    if (ride.type === "passed" && ride.commission) {
      if (ride.user_id === user?.id) {
        return ride.commission
      }
    }
    return 0
  }

  function getDriverName(userId: string): string {
    if (user?.id === userId) return "Você"
    const driver = drivers.find((d) => d.id === userId)
    return driver?.nome || "Desconhecido"
  }

  const filteredRides = rides.filter((r) => {
    if (typeFilter === "own") return r.user_id === user?.id
    if (typeFilter === "passed") return r.user_id !== user?.id || r.type === "passed"
    return true
  })

  const faturamentoBruto = filteredRides.reduce((sum, ride) => {
    if (ride.received_with_client) return sum
    return sum + ride.value
  }, 0)

  const faturamentoLiquido = filteredRides.reduce((sum, ride) => {
    return sum + getEarnings(ride)
  }, 0)

  const totalGasolina = fuelExpenses.reduce((sum, f) => sum + f.total_value, 0)
  const faturamentoLiquidoPosGasolina = faturamentoLiquido - totalGasolina

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ]

  const years = [2025, 2026, 2027]

  return (
    <main className="p-4">
      <h2 className="text-xl font-bold mb-6">Histórico</h2>

      <div className="flex gap-2 mb-4">
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

      <div className="flex gap-2 mb-6">
        {([
          ["all", "Todas"],
          ["own", "Próprias"],
          ["passed", "Passadas"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTypeFilter(value)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              typeFilter === value
                ? "bg-taxi-gray-900 text-white"
                : "bg-taxi-gray-100 text-taxi-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-taxi-gray-500">Carregando...</p>
      ) : (
        <>
          <div className="mb-6">
            <ProgressBar
              current={faturamentoLiquidoPosGasolina}
              goal={2000}
              label="Meta do Mês"
            />
            <div className="p-4 bg-taxi-gray-50 rounded-xl mt-2 space-y-3">
              <div>
                <p className="text-sm text-taxi-gray-500">Faturamento Bruto</p>
                <p className="text-xl font-bold text-taxi-gray-700">
                  R$ {faturamentoBruto.toFixed(2)}
                </p>
              </div>
              <div className="border-t border-taxi-gray-200 pt-3">
                <p className="text-sm text-taxi-gray-500">Faturamento Líquido</p>
                <p className="text-xl font-bold text-taxi-success">
                  R$ {faturamentoLiquido.toFixed(2)}
                </p>
              </div>
              {user?.role === "admin" && totalGasolina > 0 && (
                <div className="border-t border-taxi-gray-200 pt-3">
                  <p className="text-sm text-taxi-gray-500">(-) Gasolina</p>
                  <p className="text-xl font-bold text-taxi-danger">
                    R$ {totalGasolina.toFixed(2)}
                  </p>
                </div>
              )}
              {user?.role === "admin" && totalGasolina > 0 && (
                <div className="border-t border-taxi-gray-200 pt-3">
                  <p className="text-sm text-taxi-gray-500">Líquido pós-gasolina</p>
                  <p className="text-2xl font-bold text-taxi-success">
                    R$ {faturamentoLiquidoPosGasolina.toFixed(2)}
                  </p>
                </div>
              )}
              <p className="text-xs text-taxi-gray-500">
                {filteredRides.length} corridas{fuelExpenses.length > 0 && ` • ${fuelExpenses.length} abastecimentos`}
              </p>
            </div>
          </div>

          {filteredRides.length === 0 ? (
            <p className="text-center text-taxi-gray-500 py-8">
              Nenhuma corrida registrada.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredRides.map((ride) => {
                const repassed = getRepassedValue(ride)
                return (
                  <div
                    key={ride.id}
                    className="p-4 bg-white border border-taxi-gray-200 rounded-xl"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{getCategoryLabel(ride.category)}</span>
                          <span className="text-xs text-taxi-gray-500">
                            {ride.type === "own" ? "Particular" : "Passada"}
                          </span>
                          {ride.user_id !== user?.id && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              👤 {getDriverName(ride.user_id)}
                            </span>
                          )}
                        </div>
                        {ride.company_name && (
                          <p className="text-sm text-taxi-gray-500 mt-1">
                            Empresa: {ride.company_name}
                          </p>
                        )}
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
                        {repassed > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => togglePaidToDriver(ride)}
                              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                                ride.paid_to_driver
                                  ? "bg-taxi-success text-white border-taxi-success"
                                  : "bg-white text-taxi-gray-600 border-taxi-gray-300"
                              }`}
                            >
                              {ride.paid_to_driver ? "Pago ao motorista" : "Marcar como pago"}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-taxi-success">R$ {getEarnings(ride).toFixed(2)}</p>
                        {ride.commission && !ride.received_with_client && (
                          <p className="text-xs text-taxi-gray-500">
                            Total: R$ {ride.value.toFixed(2)}
                          </p>
                        )}
                        {repassed > 0 && (
                          <p className="text-xs text-taxi-orange font-medium">
                            Repassou: R$ {repassed.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </main>
  )
}
