"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { ProgressBar } from "../components/ProgressBar"
import { ScheduledRideForm } from "../components/ScheduledRideForm"
import { ScheduledRidesList } from "../components/ScheduledRidesList"
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
  const [refreshKey, setRefreshKey] = useState(0)
  const [showAddRide, setShowAddRide] = useState(false)
  const [rideCategory, setRideCategory] = useState<"private" | "invoiced">("private")
  const [rideValue, setRideValue] = useState("")
  const [rideCommission, setRideCommission] = useState("")
  const [rideDriverName, setRideDriverName] = useState("")
  const [ridePassengerName, setRidePassengerName] = useState("")
  const [rideCompanyName, setRideCompanyName] = useState("")
  const [rideReceivedWithClient, setRideReceivedWithClient] = useState(false)
  const [rideStartLocation, setRideStartLocation] = useState("")
  const [rideEndLocation, setRideEndLocation] = useState("")
  const [rideDate, setRideDate] = useState("")
  const [rideTime, setRideTime] = useState("")

  // Edit ride states
  const [editingRide, setEditingRide] = useState<Ride | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editCommission, setEditCommission] = useState("")
  const [editPassengerName, setEditPassengerName] = useState("")
  const [editStartLocation, setEditStartLocation] = useState("")
  const [editEndLocation, setEditEndLocation] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editTime, setEditTime] = useState("")

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

    // Parallel: cars + drivers + invitations
    let carsQuery = getSupabase()
      .from("driver_cars")
      .select("id,owner_id,driver_id,car_model,license_plate,car_type,active,created_at")
      .eq("active", true)

    if (user.role !== "admin") {
      carsQuery = carsQuery.eq("driver_id", user.id)
    }

    const [carsResult, driversResult, invitationsResult] = await Promise.all([
      carsQuery,
      getSupabase()
        .from("users")
        .select("id,nome,email,role,created_at")
        .eq("role", "driver"),
      getSupabase()
        .from("driver_invitations")
        .select("id,email,status,created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
    ])

    setMyCars(carsResult.data || [])
    setDrivers(driversResult.data || [])
    setInvitations(invitationsResult.data || [])
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
      .eq("added_by_admin", true)
      .order("ride_date", { ascending: false })

    const sortedRides = (ridesData || []).sort((a, b) => {
      const dateA = new Date(a.ride_date).getTime()
      const dateB = new Date(b.ride_date).getTime()
      const todayTime = new Date().setHours(0, 0, 0, 0)
      
      const aIsFuture = dateA >= todayTime
      const bIsFuture = dateB >= todayTime
      const aIsToday = dateA >= todayTime && dateA < todayTime + 86400000
      const bIsToday = dateB >= todayTime && dateB < todayTime + 86400000

      if (aIsFuture && !bIsFuture) return -1
      if (!aIsFuture && bIsFuture) return 1
      if (aIsToday && !bIsToday) return -1
      if (!aIsToday && bIsToday) return 1
      
      return dateB - dateA
    })

    setCarRides(sortedRides)
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

    const rideDateTime = rideDate && rideTime 
      ? new Date(`${rideDate}T${rideTime}`).toISOString()
      : new Date().toISOString()

    const { error } = await getSupabase().from("rides").insert({
      user_id: car.driver_id,
      type: "passed",
      category: rideCategory,
      value: parseFloat(rideValue),
      commission: rideReceivedWithClient ? null : (rideCommission ? parseFloat(rideCommission) : null),
      driver_name: rideDriverName || null,
      passenger_name: ridePassengerName || null,
      company_name: rideCategory === "invoiced" ? (rideCompanyName || null) : null,
      start_location: rideStartLocation || null,
      end_location: rideEndLocation || null,
      ride_date: rideDateTime,
      added_by_admin: true,
      received_with_client: rideReceivedWithClient,
    })

    if (!error) {
      setRideValue("")
      setRideCommission("")
      setRideDriverName("")
      setRidePassengerName("")
      setRideStartLocation("")
      setRideEndLocation("")
      setRideDate("")
      setRideTime("")
      setRideReceivedWithClient(false)
      setShowAddRide(false)
      fetchCarData()
    }
  }

  function startEditingRide(ride: Ride) {
    setEditingRide(ride)
    setEditValue(ride.value.toString())
    setEditCommission(ride.commission?.toString() || "")
    setEditPassengerName(ride.passenger_name || "")
    setEditStartLocation(ride.start_location || "")
    setEditEndLocation(ride.end_location || "")
    const rideDateTime = new Date(ride.ride_date)
    setEditDate(rideDateTime.toISOString().split("T")[0])
    setEditTime(rideDateTime.toTimeString().slice(0, 5))
  }

  function cancelEditingRide() {
    setEditingRide(null)
    setEditValue("")
    setEditCommission("")
    setEditPassengerName("")
    setEditStartLocation("")
    setEditEndLocation("")
    setEditDate("")
    setEditTime("")
  }

  async function saveEditingRide() {
    if (!editingRide) return

    const rideDateTime = editDate && editTime 
      ? new Date(`${editDate}T${editTime}`).toISOString()
      : editingRide.ride_date

    const { error } = await getSupabase()
      .from("rides")
      .update({
        value: parseFloat(editValue),
        commission: editCommission ? parseFloat(editCommission) : null,
        passenger_name: editPassengerName || null,
        start_location: editStartLocation || null,
        end_location: editEndLocation || null,
        ride_date: rideDateTime,
      })
      .eq("id", editingRide.id)

    if (!error) {
      cancelEditingRide()
      fetchCarData()
    }
  }

  async function handleDeleteRide(rideId: string) {
    if (!confirm("Tem certeza que deseja excluir esta corrida?")) return
    await getSupabase().from("rides").delete().eq("id", rideId)
    fetchCarData()
  }

  const selectedCarData = myCars.find((c) => c.id === selectedCar)
  
  function getEarnings(ride: any): number {
    if (ride.type === "passed" && ride.commission) {
      if (ride.added_by_admin) {
        if (ride.received_with_client) return ride.value
        if (ride.user_id === user?.id) return ride.commission
        return ride.value - ride.commission
      }
      if (ride.user_id === user?.id) return ride.value - ride.commission
      return ride.commission
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

              {user?.role === "admin" && (
                <>
                  <ScheduledRidesList refreshKey={refreshKey} />

                  <div className="mb-6">
                    <ScheduledRideForm
                      type="passed"
                      onSuccess={() => setRefreshKey(k => k + 1)}
                    />
                  </div>
                </>
              )}

              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">Corridas do Período</h3>
                  {user?.role === "admin" && (
                    <button
                      onClick={() => setShowAddRide(!showAddRide)}
                      className="text-sm text-taxi-primary font-medium"
                    >
                      {showAddRide ? "Cancelar" : "+ Nova Corrida"}
                    </button>
                  )}
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
                        <option value="private">Particular</option>
                        <option value="invoiced">Faturado</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                      <div>
                        <label className="block text-sm font-medium mb-1">Hora</label>
                        <input
                          type="time"
                          value={rideTime}
                          onChange={(e) => setRideTime(e.target.value)}
                          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Origem</label>
                      <input
                        type="text"
                        value={rideStartLocation}
                        onChange={(e) => setRideStartLocation(e.target.value)}
                        className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                        placeholder="Ex: Cajuru"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Destino</label>
                      <input
                        type="text"
                        value={rideEndLocation}
                        onChange={(e) => setRideEndLocation(e.target.value)}
                        className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                        placeholder="Ex: CNF"
                      />
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
                    {!rideReceivedWithClient && (
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
                    )}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="receivedWithClient"
                        checked={rideReceivedWithClient}
                        onChange={(e) => setRideReceivedWithClient(e.target.checked)}
                        className="w-5 h-5"
                      />
                      <label htmlFor="receivedWithClient" className="text-sm font-medium">
                        Recebeu com cliente
                      </label>
                    </div>
                    {rideReceivedWithClient && (
                      <p className="text-xs text-taxi-gray-500">
                        Apenas registrado. Não entra na meta nem no aluguel.
                      </p>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-1">Passageiro (opcional)</label>
                      <input
                        type="text"
                        value={ridePassengerName}
                        onChange={(e) => setRidePassengerName(e.target.value)}
                        className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                      />
                    </div>
                    {rideCategory === "invoiced" && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Nome da Empresa (opcional)</label>
                        <input
                          type="text"
                          value={rideCompanyName}
                          onChange={(e) => setRideCompanyName(e.target.value)}
                          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                          placeholder="Ex: Empresa ABC Ltda"
                        />
                      </div>
                    )}
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
                        className="p-3 bg-white border border-taxi-gray-200 rounded-xl"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">
                              {ride.category === "invoiced" ? `Faturado${ride.company_name ? ` - ${ride.company_name}` : ""}` : ride.category === "private" ? "Particular" : ride.category}
                            </p>
                            {ride.passenger_name && (
                              <p className="text-sm text-taxi-gray-500">
                                Passageiro: {ride.passenger_name}
                              </p>
                            )}
                            {(ride.start_location || ride.end_location) && (
                              <p className="text-sm text-taxi-gray-500">
                                {ride.start_location} → {ride.end_location}
                              </p>
                            )}
                            <p className="text-xs text-taxi-gray-500">
                              {new Date(ride.ride_date).toLocaleDateString("pt-BR")} {new Date(ride.ride_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-taxi-success">R$ {getEarnings(ride).toFixed(2)}</p>
                            {ride.commission && !ride.received_with_client && !ride.added_by_admin && (
                              <p className="text-xs text-taxi-gray-500">
                                Total: R$ {ride.value.toFixed(2)}
                              </p>
                            )}
                            {user?.role === "admin" && (
                            <div className="flex gap-2 mt-2 justify-end">
                              <button
                                onClick={() => startEditingRide(ride)}
                                className="text-xs text-taxi-primary font-medium"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteRide(ride.id)}
                                className="text-xs text-red-500"
                              >
                                Excluir
                              </button>
                            </div>
                            )}
                          </div>
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

      {editingRide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-lg">Editar Corrida</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
              />
            </div>
            {editingRide.type === "passed" && (
              <div>
                <label className="block text-sm font-medium mb-1">Valor do Motorista (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editCommission}
                  onChange={(e) => setEditCommission(e.target.value)}
                  className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Data</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hora</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Origem</label>
              <input
                type="text"
                value={editStartLocation}
                onChange={(e) => setEditStartLocation(e.target.value)}
                className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Destino</label>
              <input
                type="text"
                value={editEndLocation}
                onChange={(e) => setEditEndLocation(e.target.value)}
                className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Passageiro</label>
              <input
                type="text"
                value={editPassengerName}
                onChange={(e) => setEditPassengerName(e.target.value)}
                className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveEditingRide}
                className="flex-1 py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark"
              >
                Salvar
              </button>
              <button
                onClick={cancelEditingRide}
                className="flex-1 py-3 bg-taxi-gray-200 text-taxi-gray-700 font-medium rounded-xl hover:bg-taxi-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
