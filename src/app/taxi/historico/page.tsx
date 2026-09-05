"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { ProgressBar } from "../components/ProgressBar"
import type { Ride, User, Fuel, RideCategory, Expense } from "../lib/types"

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
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [typeFilter, setTypeFilter] = useState<"all" | "own" | "passed">("all")
  const [carTypeFilter, setCarTypeFilter] = useState<"all" | "executivo" | "taxi">("all")
  const [expenseFilter, setExpenseFilter] = useState<"all" | "gastos" | "gasolina">("all")
  const [weeklyGoal, setWeeklyGoal] = useState(1000)
  const [monthlyGoal, setMonthlyGoal] = useState(4000)

  const [editingRide, setEditingRide] = useState<Ride | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editCommission, setEditCommission] = useState("")
  const [editPassengerName, setEditPassengerName] = useState("")
  const [editCompanyName, setEditCompanyName] = useState("")
  const [editCarType, setEditCarType] = useState<"executivo" | "taxi">("executivo")
  const [editStartLocation, setEditStartLocation] = useState("")
  const [editEndLocation, setEditEndLocation] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editTime, setEditTime] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchRides()
      fetchGoals()
      fetchExpenses()
    }
  }, [user, selectedMonth, selectedYear])

  async function fetchGoals() {
    if (!user) return

    if (user.role === "admin") {
      const { data } = await getSupabase()
        .from("goals")
        .select("*")
        .limit(1)
        .single()

      if (data) {
        setWeeklyGoal(data.weekly_goal)
        setMonthlyGoal(data.daily_goal * 30)
      }
    } else {
      const { data } = await getSupabase()
        .from("driver_goals")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (data) {
        setWeeklyGoal(data.personal_goal * 5)
        setMonthlyGoal(data.personal_goal * 30)
      }
    }
  }

  async function fetchExpenses() {
    if (!user) return

    const startDate = new Date(selectedYear, selectedMonth - 1, 1)
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59)

    const { data } = await getSupabase()
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("expense_date", startDate.toISOString())
      .lte("expense_date", endDate.toISOString())
      .order("expense_date", { ascending: false })

    setExpenses(data || [])
  }

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

  function startEdit(ride: Ride) {
    setEditingRide(ride)
    setEditValue(ride.value.toString())
    setEditCommission(ride.commission?.toString() || "")
    setEditPassengerName(ride.passenger_name || "")
    setEditCompanyName(ride.company_name || "")
    setEditCarType(ride.car_type || "executivo")
    setEditStartLocation(ride.start_location || "")
    setEditEndLocation(ride.end_location || "")
    const rideDate = new Date(ride.ride_date)
    setEditDate(rideDate.toISOString().split("T")[0])
    setEditTime(rideDate.toTimeString().slice(0, 5))
  }

  function cancelEdit() {
    setEditingRide(null)
  }

  async function saveEdit() {
    if (!editingRide) return
    setEditLoading(true)

    const rideDateTime = editDate && editTime
      ? new Date(`${editDate}T${editTime}`).toISOString()
      : editingRide.ride_date

    const { error } = await getSupabase()
      .from("rides")
      .update({
        value: parseFloat(editValue),
        commission: editCommission ? parseFloat(editCommission) : null,
        car_type: editCarType,
        passenger_name: editPassengerName || null,
        company_name: editCompanyName || null,
        start_location: editStartLocation || null,
        end_location: editEndLocation || null,
        ride_date: rideDateTime,
      })
      .eq("id", editingRide.id)

    setEditLoading(false)

    if (!error) {
      setEditingRide(null)
      fetchRides()
    }
  }

  async function deleteRide(id: string) {
    await getSupabase().from("rides").delete().eq("id", id)
    fetchRides()
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

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const filteredRides = rides.filter((r) => {
    if (typeFilter === "own") {
      if (r.user_id !== user?.id) return false
    }
    if (typeFilter === "passed") {
      if (r.user_id === user?.id && r.type !== "passed") return false
    }
    if (selectedDay !== null) {
      const rideDate = new Date(r.ride_date)
      if (rideDate.getDate() !== selectedDay) return false
    }
    if (typeFilter === "passed" && carTypeFilter !== "all") {
      if (r.car_type !== carTypeFilter) return false
    }
    return true
  })

  const filteredFuelExpenses = fuelExpenses.filter((f) => {
    if (selectedDay !== null) {
      const fuelDate = new Date(f.fuel_date)
      if (fuelDate.getDate() !== selectedDay) return false
    }
    return true
  })

  const filteredExpenses = expenses.filter((e) => {
    if (selectedDay !== null) {
      const expenseDate = new Date(e.expense_date)
      if (expenseDate.getDate() !== selectedDay) return false
    }
    return true
  })

  const faturamentoBruto = filteredRides.reduce((sum, ride) => {
    if (ride.received_with_client) return sum
    return sum + ride.value
  }, 0)

  const faturamentoLiquido = filteredRides.reduce((sum, ride) => {
    return sum + getEarnings(ride)
  }, 0)

  const totalGasolina = typeFilter !== "passed" ? filteredFuelExpenses.reduce((sum, f) => sum + f.total_value, 0) : 0
  const faturamentoLiquidoPosGasolina = faturamentoLiquido - totalGasolina

  const monthlyTotalLiquido = rides.reduce((sum, ride) => sum + getEarnings(ride), 0)
  const monthlyTotalGasolina = typeFilter !== "passed" ? fuelExpenses.reduce((sum, f) => sum + f.total_value, 0) : 0
  const monthlyNet = monthlyTotalLiquido - monthlyTotalGasolina

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const weeklyEarnings = rides
    .filter((r) => new Date(r.ride_date) >= startOfWeek)
    .reduce((sum, ride) => sum + getEarnings(ride), 0)

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
          onChange={(e) => {
            setSelectedMonth(parseInt(e.target.value))
            setSelectedDay(null)
          }}
          className="flex-1 px-4 py-3 border border-taxi-gray-200 rounded-xl"
        >
          {monthNames.map((name, index) => (
            <option key={index} value={index + 1}>{name}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => {
            setSelectedYear(parseInt(e.target.value))
            setSelectedDay(null)
          }}
          className="w-24 px-4 py-3 border border-taxi-gray-200 rounded-xl"
        >
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedDay(null)}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedDay === null
                ? "bg-taxi-gray-900 text-white"
                : "bg-taxi-gray-100 text-taxi-gray-600"
            }`}
          >
            Todos
          </button>
          {daysArray.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedDay === day
                  ? "bg-taxi-gray-900 text-white"
                  : "bg-taxi-gray-100 text-taxi-gray-600"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {([
          ["all", "Todas"],
          ["own", "Próprias"],
          ["passed", "Passadas"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => {
              setTypeFilter(value)
              setCarTypeFilter("all")
            }}
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

      {typeFilter === "passed" && (
        <div className="flex gap-2 mb-6">
          {([
            ["all", "Todos"],
            ["executivo", "Executivo"],
            ["taxi", "Táxi"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setCarTypeFilter(value)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                carTypeFilter === value
                  ? "bg-taxi-success text-white"
                  : "bg-taxi-gray-100 text-taxi-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {([
          ["all", "Todos"],
          ["gasolina", "Gasolina"],
          ["gastos", "Gastos"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setExpenseFilter(value)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              expenseFilter === value
                ? "bg-taxi-orange text-white"
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
          <div className="mb-4">
            <ProgressBar
              current={weeklyEarnings}
              goal={weeklyGoal}
              label="Meta Semanal"
            />
          </div>

          <div className="mb-6">
            <ProgressBar
              current={monthlyNet}
              goal={monthlyGoal}
              label="Meta Mensal"
            />
          </div>

          <div className="mb-6">
            <div className="p-4 bg-taxi-gray-50 rounded-xl space-y-3">
              {typeFilter === "passed" ? (
                <>
                  <div>
                    <p className="text-sm text-taxi-gray-500">Total Passado</p>
                    <p className="text-2xl font-bold text-taxi-success">
                      R$ {faturamentoLiquido.toFixed(2)}
                    </p>
                  </div>
                  {carTypeFilter !== "all" && (
                    <div className="border-t border-taxi-gray-200 pt-3">
                      <p className="text-sm text-taxi-gray-500">
                        {carTypeFilter === "executivo" ? "Executivo" : "Táxi"}
                      </p>
                      <p className="text-xl font-bold text-taxi-gray-700">
                        R$ {filteredRides.reduce((sum, ride) => sum + getEarnings(ride), 0).toFixed(2)}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
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
                </>
              )}
              <p className="text-xs text-taxi-gray-500">
                {filteredRides.length} corridas{filteredFuelExpenses.length > 0 && typeFilter !== "passed" && ` • ${filteredFuelExpenses.length} abastecimentos`}
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
                    {editingRide?.id === ride.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-taxi-gray-500">Valor (R$)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                            />
                          </div>
                          {ride.type === "passed" && (
                            <div>
                              <label className="text-xs text-taxi-gray-500">Comissão (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={editCommission}
                                onChange={(e) => setEditCommission(e.target.value)}
                                className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                              />
                            </div>
                          )}
                        </div>
                        {ride.type === "passed" && (
                          <div>
                            <label className="text-xs text-taxi-gray-500 mb-1 block">Tipo de Carro</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setEditCarType("executivo")}
                                className={`flex-1 py-2 rounded-lg text-sm ${
                                  editCarType === "executivo"
                                    ? "bg-taxi-success text-white"
                                    : "bg-white border border-taxi-gray-200"
                                }`}
                              >
                                Executivo
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditCarType("taxi")}
                                className={`flex-1 py-2 rounded-lg text-sm ${
                                  editCarType === "taxi"
                                    ? "bg-taxi-success text-white"
                                    : "bg-white border border-taxi-gray-200"
                                }`}
                              >
                                Táxi
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-taxi-gray-500">Data</label>
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-taxi-gray-500">Hora</label>
                            <input
                              type="time"
                              value={editTime}
                              onChange={(e) => setEditTime(e.target.value)}
                              className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-taxi-gray-500">Passageiro</label>
                          <input
                            type="text"
                            value={editPassengerName}
                            onChange={(e) => setEditPassengerName(e.target.value)}
                            className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                          />
                        </div>
                        {ride.category === "invoiced" && (
                          <div>
                            <label className="text-xs text-taxi-gray-500">Empresa</label>
                            <input
                              type="text"
                              value={editCompanyName}
                              onChange={(e) => setEditCompanyName(e.target.value)}
                              className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                            />
                          </div>
                        )}
                        {["cooperative", "invoiced"].includes(ride.category) && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-taxi-gray-500">Início</label>
                              <input
                                type="text"
                                value={editStartLocation}
                                onChange={(e) => setEditStartLocation(e.target.value)}
                                className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-taxi-gray-500">Destino</label>
                              <input
                                type="text"
                                value={editEndLocation}
                                onChange={(e) => setEditEndLocation(e.target.value)}
                                className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            disabled={editLoading}
                            className="flex-1 py-2 bg-taxi-success text-white text-sm font-medium rounded-lg"
                          >
                            {editLoading ? "Salvando..." : "Salvar"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex-1 py-2 bg-taxi-gray-200 text-taxi-gray-600 text-sm font-medium rounded-lg"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{getCategoryLabel(ride.category)}</span>
                            <span className="text-xs text-taxi-gray-500">
                              {ride.type === "own" ? "Particular" : "Passada"}
                            </span>
                            {ride.car_type && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                ride.car_type === "executivo" 
                                  ? "bg-purple-100 text-purple-800" 
                                  : "bg-yellow-100 text-yellow-800"
                              }`}>
                                {ride.car_type === "executivo" ? "Executivo" : "Táxi"}
                              </span>
                            )}
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
                          <div className="flex gap-1 mt-2 justify-end">
                            <button
                              onClick={() => startEdit(ride)}
                              className="p-2 text-taxi-gray-500 hover:text-taxi-primary"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => deleteRide(ride.id)}
                              className="p-2 text-taxi-gray-500 hover:text-red-500"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-6">
              <h3 className="font-semibold mb-3">
                {expenseFilter === "gasolina" ? "Abastecimentos" : expenseFilter === "gastos" ? "Gastos" : "Abastecimentos e Gastos"}
              </h3>
              {expenseFilter === "gasolina" || expenseFilter === "all" ? (
                filteredFuelExpenses.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {filteredFuelExpenses.map((fuel) => (
                      <div
                        key={fuel.id}
                        className="p-3 bg-white border border-taxi-gray-200 rounded-xl flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">⛽ Combustível</p>
                          <p className="text-sm text-taxi-gray-500">
                            {new Date(fuel.fuel_date).toLocaleDateString("pt-BR")}
                            {fuel.liters && ` • ${fuel.liters}L`}
                          </p>
                        </div>
                        <p className="font-bold text-taxi-danger">
                          R$ {fuel.total_value.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              ) : null}
              {expenseFilter === "gastos" || expenseFilter === "all" ? (
                filteredExpenses.length > 0 ? (
                  <div className="space-y-2">
                    {filteredExpenses.map((expense) => {
                      const categoryIcons: Record<string, string> = {
                        fuel: "⛽",
                        wash: "🚗",
                        food: "🍔",
                        maintenance: "🔧",
                        other: "📦",
                      }
                      const categoryLabels: Record<string, string> = {
                        fuel: "Combustível",
                        wash: "Lavagem",
                        food: "Alimentação",
                        maintenance: "Manutenção",
                        other: "Outros",
                      }
                      return (
                        <div
                          key={expense.id}
                          className="p-3 bg-white border border-taxi-gray-200 rounded-xl flex justify-between items-center"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {categoryIcons[expense.category] || "📦"}
                            </span>
                            <div>
                              <p className="font-medium">
                                {categoryLabels[expense.category] || expense.category}
                              </p>
                              {expense.description && (
                                <p className="text-sm text-taxi-gray-500">
                                  {expense.description}
                                </p>
                              )}
                              <p className="text-xs text-taxi-gray-500">
                                {new Date(expense.expense_date).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                          </div>
                          <p className="font-bold text-taxi-danger">
                            R$ {expense.value.toFixed(2)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  (expenseFilter === "all" && filteredFuelExpenses.length === 0) && (
                    <p className="text-center text-taxi-gray-500 py-4">
                      Nenhum gasto registrado.
                    </p>
                  )
                )
              ) : null}
              {expenseFilter === "gasolina" && filteredFuelExpenses.length === 0 && (
                <p className="text-center text-taxi-gray-500 py-4">
                  Nenhum abastecimento registrado.
                </p>
              )}
              {expenseFilter === "gastos" && filteredExpenses.length === 0 && (
                <p className="text-center text-taxi-gray-500 py-4">
                  Nenhum gasto registrado.
                </p>
              )}
            </div>
        </>
      )}
    </main>
  )
}
