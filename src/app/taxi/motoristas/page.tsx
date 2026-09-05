"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { ProgressBar } from "../components/ProgressBar"
import type { User, RentalGoal, Ride } from "../lib/types"

export default function MotoristasPage() {
  const { user } = useAuth()
  const [drivers, setDrivers] = useState<User[]>([])
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null)
  const [rentalGoal, setRentalGoal] = useState<RentalGoal | null>(null)
  const [driverRides, setDriverRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddRide, setShowAddRide] = useState(false)

  // Form states
  const [startDay, setStartDay] = useState("15")
  const [endDay, setEndDay] = useState("14")
  const [goalValue, setGoalValue] = useState("")
  const [rideValue, setRideValue] = useState("")
  const [rideCategory, setRideCategory] = useState<"app" | "taximeter" | "cooperative" | "private" | "invoiced">("app")
  const [rideDate, setRideDate] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchDrivers()
    }
  }, [user])

  useEffect(() => {
    if (selectedDriver) {
      fetchDriverData()
    }
  }, [selectedDriver])

  async function fetchDrivers() {
    const { data } = await getSupabase()
      .from("users")
      .select("*")
      .eq("role", "driver")

    setDrivers(data || [])
    setLoading(false)
  }

  async function fetchDriverData() {
    if (!selectedDriver) return

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const { data: goalData } = await getSupabase()
      .from("rental_goals")
      .select("*")
      .eq("driver_id", selectedDriver)
      .eq("month", month)
      .eq("year", year)
      .limit(1)

    if (goalData && goalData.length > 0) {
      setRentalGoal(goalData[0])
      setStartDay(goalData[0].start_day.toString())
      setEndDay(goalData[0].end_day.toString())
      setGoalValue(goalData[0].goal_value.toString())
    } else {
      setRentalGoal(null)
    }

    const { data: ridesData } = await getSupabase()
      .from("rides")
      .select("*")
      .eq("user_id", selectedDriver)
      .order("ride_date", { ascending: false })

    setDriverRides(ridesData || [])
  }

  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDriver) return

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    if (rentalGoal) {
      await getSupabase()
        .from("rental_goals")
        .update({
          start_day: parseInt(startDay),
          end_day: parseInt(endDay),
          goal_value: parseFloat(goalValue),
        })
        .eq("id", rentalGoal.id)
    } else {
      await getSupabase().from("rental_goals").insert({
        driver_id: selectedDriver,
        start_day: parseInt(startDay),
        end_day: parseInt(endDay),
        goal_value: parseFloat(goalValue),
        month,
        year,
      })
    }

    fetchDriverData()
  }

  async function handleAddRide(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDriver) return

    await getSupabase().from("rides").insert({
      user_id: selectedDriver,
      type: "own",
      category: rideCategory,
      value: parseFloat(rideValue),
      ride_date: new Date(rideDate).toISOString(),
    })

    setRideValue("")
    setShowAddRide(false)
    fetchDriverData()
  }

  async function handleDeleteRide(rideId: string) {
    if (!confirm("Tem certeza que deseja excluir esta corrida?")) return

    await getSupabase().from("rides").delete().eq("id", rideId)
    fetchDriverData()
  }

  if (user?.role !== "admin") {
    return (
      <main className="p-4">
        <p className="text-center text-taxi-gray-500">Acesso restrito a administradores.</p>
      </main>
    )
  }

  const totalRides = driverRides.reduce((sum, ride) => sum + ride.value, 0)

  return (
    <main className="p-4">
      <h2 className="text-xl font-bold mb-6">Motoristas</h2>

      {loading ? (
        <p className="text-center text-taxi-gray-500">Carregando...</p>
      ) : (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Selecionar Motorista</label>
            <select
              value={selectedDriver || ""}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
            >
              <option value="">Selecione um motorista</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.nome}
                </option>
              ))}
            </select>
          </div>

          {selectedDriver && (
            <>
              <div className="space-y-4 mb-6">
                <ProgressBar
                  current={totalRides}
                  goal={rentalGoal?.goal_value || 0}
                  label="Meta do Aluguel"
                />
                <div className="p-4 bg-taxi-gray-50 rounded-xl text-sm">
                  <p className="text-taxi-gray-500">
                    Período: Dia {rentalGoal?.start_day || 15} ao {rentalGoal?.end_day || 14}
                  </p>
                  <p className="text-taxi-gray-500">
                    Total registrado: R$ {totalRides.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">Configurar Meta de Aluguel</h3>
                <form onSubmit={handleSaveGoal} className="space-y-4 p-4 bg-taxi-gray-50 rounded-xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Dia início</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={startDay}
                        onChange={(e) => setStartDay(e.target.value)}
                        className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Dia fim</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={endDay}
                        onChange={(e) => setEndDay(e.target.value)}
                        className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Valor do Aluguel (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={goalValue}
                      onChange={(e) => setGoalValue(e.target.value)}
                      className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark"
                  >
                    Salvar Meta
                  </button>
                </form>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Corridas do Motorista</h3>
                  <button
                    onClick={() => setShowAddRide(!showAddRide)}
                    className="text-sm text-taxi-primary font-medium"
                  >
                    {showAddRide ? "Cancelar" : "+ Nova Corrida"}
                  </button>
                </div>

                {showAddRide && (
                  <form onSubmit={handleAddRide} className="space-y-4 p-4 bg-taxi-gray-50 rounded-xl mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Categoria</label>
                      <select
                        value={rideCategory}
                        onChange={(e) => setRideCategory(e.target.value as any)}
                        className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                      >
                        <option value="app">App (Uber, 99, InDrive)</option>
                        <option value="taximeter">Taxímetro</option>
                        <option value="cooperative">Cooperativa</option>
                        <option value="private">Particular</option>
                        <option value="invoiced">Faturado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Valor (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={rideValue}
                        onChange={(e) => setRideValue(e.target.value)}
                        className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Data</label>
                      <input
                        type="date"
                        value={rideDate}
                        onChange={(e) => setRideDate(e.target.value)}
                        className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-taxi-success text-white font-medium rounded-xl hover:bg-opacity-90"
                    >
                      Registrar Corrida
                    </button>
                  </form>
                )}

                {driverRides.length === 0 ? (
                  <p className="text-center text-taxi-gray-500 py-4">Nenhuma corrida registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {driverRides.map((ride) => (
                      <div
                        key={ride.id}
                        className="p-3 bg-white border border-taxi-gray-200 rounded-xl flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">{ride.category}</p>
                          <p className="text-sm text-taxi-gray-500">
                            {new Date(ride.ride_date).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-taxi-success">R$ {ride.value.toFixed(2)}</p>
                          <button
                            onClick={() => handleDeleteRide(ride.id)}
                            className="text-red-500 text-sm"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </main>
  )
}
