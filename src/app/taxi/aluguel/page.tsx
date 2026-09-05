"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { ProgressBar } from "../components/ProgressBar"
import type { User, DriverCar, RentalGoal, Ride } from "../lib/types"

export default function AluguelPage() {
  const { user } = useAuth()
  const [myCars, setMyCars] = useState<DriverCar[]>([])
  const [drivers, setDrivers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [selectedCar, setSelectedCar] = useState<string | null>(null)
  const [rentalGoal, setRentalGoal] = useState<RentalGoal | null>(null)
  const [carRides, setCarRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddCar, setShowAddCar] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  // Form states
  const [inviteEmail, setInviteEmail] = useState("")
  const [carModel, setCarModel] = useState("")
  const [licensePlate, setLicensePlate] = useState("")
  const [carType, setCarType] = useState<"executive" | "taxi">("executive")
  const [selectedDriverId, setSelectedDriverId] = useState("")
  const [startDay, setStartDay] = useState("15")
  const [endDay, setEndDay] = useState("14")
  const [goalValue, setGoalValue] = useState("")

  // Ride form states
  const [showAddRide, setShowAddRide] = useState(false)
  const [rideCategory, setRideCategory] = useState<"app" | "taximeter" | "cooperative" | "private" | "invoiced">("app")
  const [rideValue, setRideValue] = useState("")
  const [rideCommission, setRideCommission] = useState("")
  const [rideDriverName, setRideDriverName] = useState("")

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  useEffect(() => {
    if (selectedCar) {
      fetchCarData()
    }
  }, [selectedCar])

  async function fetchData() {
    if (!user) return

    const { data: carsData } = await getSupabase()
      .from("driver_cars")
      .select("*")
      .eq("owner_id", user.id)
      .eq("active", true)

    setMyCars(carsData || [])

    const { data: driversData } = await getSupabase()
      .from("users")
      .select("*")
      .eq("role", "driver")

    setDrivers(driversData || [])

    const { data: invitationsData } = await getSupabase()
      .from("driver_invitations")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })

    setInvitations(invitationsData || [])
    setLoading(false)
  }

  async function fetchCarData() {
    if (!selectedCar) return

    const car = myCars.find((c) => c.id === selectedCar)
    if (!car) return

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const { data: goalData } = await getSupabase()
      .from("rental_goals")
      .select("*")
      .eq("driver_id", car.driver_id)
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
      setGoalValue("")
    }

    const { data: ridesData } = await getSupabase()
      .from("rides")
      .select("*")
      .eq("user_id", car.driver_id)
      .order("ride_date", { ascending: false })

    setCarRides(ridesData || [])
  }

  async function handleInviteDriver(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    await getSupabase().from("driver_invitations").insert({
      owner_id: user.id,
      email: inviteEmail,
    })

    setInviteEmail("")
    setShowInvite(false)
    alert("Convite enviado! O motorista receberá um email para criar conta.")
  }

  async function handleAddCar(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !selectedDriverId) return

    await getSupabase().from("driver_cars").insert({
      owner_id: user.id,
      driver_id: selectedDriverId,
      car_model: carModel,
      license_plate: licensePlate.toUpperCase(),
      car_type: carType,
    })

    setCarModel("")
    setLicensePlate("")
    setSelectedDriverId("")
    setShowAddCar(false)
    fetchData()
  }

  async function handleSaveGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCar) return

    const car = myCars.find((c) => c.id === selectedCar)
    if (!car) return

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
        driver_id: car.driver_id,
        start_day: parseInt(startDay),
        end_day: parseInt(endDay),
        goal_value: parseFloat(goalValue),
        month,
        year,
      })
    }

    fetchCarData()
  }

  async function handleRemoveCar(carId: string) {
    if (!confirm("Tem certeza que deseja remover este carro?")) return

    await getSupabase()
      .from("driver_cars")
      .update({ active: false })
      .eq("id", carId)

    setSelectedCar(null)
    fetchData()
  }

  async function handleAddRideForDriver(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCar) return

    const car = myCars.find((c) => c.id === selectedCar)
    if (!car) return

    const { error } = await getSupabase().from("rides").insert({
      user_id: car.driver_id,
      type: "passed",
      category: rideCategory,
      value: parseFloat(rideValue),
      commission: rideCommission ? parseFloat(rideCommission) : null,
      driver_name: rideDriverName || null,
      ride_date: new Date().toISOString(),
      added_by_admin: true,
    })

    if (!error) {
      setRideValue("")
      setRideCommission("")
      setRideDriverName("")
      setShowAddRide(false)
      fetchCarData()
    }
  }

  if (user?.role !== "admin") {
    return (
      <main className="p-4">
        <p className="text-center text-taxi-gray-500">Acesso restrito a administradores.</p>
      </main>
    )
  }

  const selectedCarData = myCars.find((c) => c.id === selectedCar)
  
  function getEarnings(ride: any): number {
    if (ride.type === "passed" && ride.commission) {
      return ride.value - ride.commission
    }
    return ride.value
  }
  
  const totalRides = carRides.reduce((sum, ride) => sum + getEarnings(ride), 0)

  return (
    <main className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Aluguel</h2>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="text-sm text-taxi-primary font-medium"
        >
          {showInvite ? "Cancelar" : "+ Convidar"}
        </button>
      </div>

      {showInvite && (
        <form onSubmit={handleInviteDriver} className="space-y-4 p-4 bg-taxi-gray-50 rounded-xl mb-6">
          <h3 className="font-semibold">Convidar Motorista</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Email do Motorista</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
              placeholder="motorista@email.com"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark"
          >
            Enviar Convite
          </button>
        </form>
      )}

      {invitations.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Convites Enviados</h3>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 bg-white border border-taxi-gray-200 rounded-xl"
              >
                <div>
                  <p className="font-medium text-sm">{inv.email}</p>
                  <p className="text-xs text-taxi-gray-500">
                    {new Date(inv.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    inv.status === "accepted"
                      ? "bg-green-100 text-green-800"
                      : inv.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {inv.status === "accepted"
                    ? "✓ Aceito"
                    : inv.status === "pending"
                    ? "Pendente"
                    : "Expirado"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-center text-taxi-gray-500">Carregando...</p>
      ) : (
        <>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Meus Carros</h3>
              <button
                onClick={() => setShowAddCar(!showAddCar)}
                className="text-sm text-taxi-primary font-medium"
              >
                {showAddCar ? "Cancelar" : "+ Novo Carro"}
              </button>
            </div>

            {showAddCar && (
              <form onSubmit={handleAddCar} className="space-y-4 p-4 bg-taxi-gray-50 rounded-xl mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Motorista</label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                    required
                  >
                    <option value="">Selecione o motorista</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Modelo do Carro</label>
                  <input
                    type="text"
                    value={carModel}
                    onChange={(e) => setCarModel(e.target.value)}
                    className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                    placeholder="Ex: Corolla Gli"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Placa</label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                    placeholder="Ex: AAA0A00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCarType("executive")}
                      className={`flex-1 py-3 rounded-xl font-medium ${
                        carType === "executive"
                          ? "bg-gray-800 text-white"
                          : "bg-white border border-taxi-gray-200"
                      }`}
                    >
                      🚗 Executivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setCarType("taxi")}
                      className={`flex-1 py-3 rounded-xl font-medium ${
                        carType === "taxi"
                          ? "bg-yellow-400 text-gray-900"
                          : "bg-white border border-taxi-gray-200"
                      }`}
                    >
                      🚕 Táxi
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-taxi-success text-white font-medium rounded-xl hover:bg-opacity-90"
                >
                  Adicionar Carro
                </button>
              </form>
            )}

            {myCars.length === 0 ? (
              <p className="text-center text-taxi-gray-500 py-4">Nenhum carro cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {myCars.map((car) => {
                  const driver = drivers.find((d) => d.id === car.driver_id)
                  return (
                    <button
                      key={car.id}
                      onClick={() => setSelectedCar(car.id === selectedCar ? null : car.id)}
                      className={`w-full p-4 rounded-xl text-left flex items-center gap-3 ${
                        selectedCar === car.id
                          ? "bg-taxi-primary text-white"
                          : "bg-white border border-taxi-gray-200"
                      }`}
                    >
                      <span className="text-2xl">
                        {car.car_type === "executive" ? "🚗" : "🚕"}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold">{car.car_model}</p>
                        <p className="text-sm opacity-75">{car.license_plate} • {driver?.nome}</p>
                      </div>
                      <span className="text-sm opacity-75">
                        {car.car_type === "executive" ? "Executivo" : "Táxi"}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {selectedCarData && (
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
                  <h3 className="font-semibold">Corridas do Período</h3>
                  <button
                    onClick={() => setShowAddRide(!showAddRide)}
                    className="text-sm text-taxi-primary font-medium"
                  >
                    {showAddRide ? "Cancelar" : "+ Nova Corrida"}
                  </button>
                </div>

                {showAddRide && (
                  <form onSubmit={handleAddRideForDriver} className="space-y-4 p-4 bg-taxi-gray-50 rounded-xl mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Categoria</label>
                      <select
                        value={rideCategory}
                        onChange={(e) => setRideCategory(e.target.value as any)}
                        className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                        required
                      >
                        <option value="app">App (Uber, 99, InDrive)</option>
                        <option value="taximeter">Taxímetro</option>
                        <option value="cooperative">Cooperativa</option>
                        <option value="private">Particular</option>
                        <option value="invoiced">Faturado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Valor Total (R$)</label>
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
                      <label className="block text-sm font-medium mb-1">Valor do Motorista (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={rideCommission}
                        onChange={(e) => setRideCommission(e.target.value)}
                        className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                        required
                      />
                      <p className="text-xs text-taxi-gray-500 mt-1">
                        Sua comissão: R$ {rideValue && rideCommission ? (parseFloat(rideValue) - parseFloat(rideCommission)).toFixed(2) : "0.00"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Motorista (opcional)</label>
                      <input
                        type="text"
                        value={rideDriverName}
                        onChange={(e) => setRideDriverName(e.target.value)}
                        className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-taxi-success text-white font-medium rounded-xl hover:bg-opacity-90"
                    >
                      Adicionar Corrida
                    </button>
                  </form>
                )}

                {carRides.length === 0 ? (
                  <p className="text-center text-taxi-gray-500 py-4">Nenhuma corrida registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {carRides.map((ride) => (
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
                        <div className="text-right">
                          <p className="font-bold text-taxi-success">R$ {ride.commission?.toFixed(2) || ride.value.toFixed(2)}</p>
                          {ride.commission && (
                            <p className="text-xs text-taxi-gray-500">
                              Total: R$ {ride.value.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleRemoveCar(selectedCar!)}
                className="w-full py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600"
              >
                Remover Carro
              </button>
            </>
          )}
        </>
      )}
    </main>
  )
}
