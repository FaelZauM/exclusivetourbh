"use client"

import { useState } from "react"
import type { Ride, RideCategory } from "../lib/types"
import { getSupabase } from "../lib/supabase"

interface RideListProps {
  rides: Ride[]
  onDelete: (id: string) => void
  onRefresh: () => void
  currentUserId?: string
  drivers?: { id: string; nome: string }[]
}

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

export function RideList({ rides, onDelete, onRefresh, currentUserId, drivers = [] }: RideListProps) {
  const [editingRide, setEditingRide] = useState<Ride | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editCommission, setEditCommission] = useState("")
  const [editPassengerName, setEditPassengerName] = useState("")
  const [editStartLocation, setEditStartLocation] = useState("")
  const [editEndLocation, setEditEndLocation] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editTime, setEditTime] = useState("")
  const [loading, setLoading] = useState(false)

  if (rides.length === 0) {
    return (
      <p className="text-center text-taxi-gray-500 py-8">
        Nenhuma corrida registrada hoje.
      </p>
    )
  }

  function getEarnings(ride: Ride): number {
    if (ride.type === "passed" && ride.commission) {
      if (ride.added_by_admin) {
        return ride.value - ride.commission
      }
      return ride.commission
    }
    return ride.value
  }

  function getDriverName(userId: string): string {
    if (currentUserId === userId) return "Você"
    const driver = drivers.find((d) => d.id === userId)
    return driver?.nome || "Desconhecido"
  }

  function startEditing(ride: Ride) {
    setEditingRide(ride)
    setEditValue(ride.value.toString())
    setEditCommission(ride.commission?.toString() || "")
    setEditPassengerName(ride.passenger_name || "")
    setEditStartLocation(ride.start_location || "")
    setEditEndLocation(ride.end_location || "")
    const rideDate = new Date(ride.ride_date)
    setEditDate(rideDate.toISOString().split("T")[0])
    setEditTime(rideDate.toTimeString().slice(0, 5))
  }

  function cancelEditing() {
    setEditingRide(null)
    setEditValue("")
    setEditCommission("")
    setEditPassengerName("")
    setEditStartLocation("")
    setEditEndLocation("")
    setEditDate("")
    setEditTime("")
  }

  async function saveEditing() {
    if (!editingRide) return
    setLoading(true)

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

    setLoading(false)

    if (!error) {
      cancelEditing()
      onRefresh()
    }
  }

  if (editingRide) {
    return (
      <div className="p-4 bg-taxi-gray-50 rounded-xl space-y-4">
        <h3 className="font-semibold">Editar Corrida</h3>
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
            onClick={saveEditing}
            disabled={loading}
            className="flex-1 py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
          <button
            onClick={cancelEditing}
            className="flex-1 py-3 bg-taxi-gray-200 text-taxi-gray-700 font-medium rounded-xl hover:bg-taxi-gray-300"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rides.map((ride) => (
        <div
          key={ride.id}
          className="p-4 bg-white border border-taxi-gray-200 rounded-xl"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {ride.category === "invoiced" ? `Faturado${ride.company_name ? ` - ${ride.company_name}` : ""}` : getCategoryLabel(ride.category)}
                </span>
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
                {ride.user_id !== currentUserId && (
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
              <p className="text-xs text-taxi-gray-500 mt-1">
                {new Date(ride.ride_date).toLocaleDateString("pt-BR")} {new Date(ride.ride_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
              {ride.start_location && ride.end_location && (
                <p className="text-sm text-taxi-gray-500 mt-1">
                  {ride.start_location} → {ride.end_location}
                </p>
              )}
              {ride.passenger_name && (
                <p className="text-sm text-taxi-gray-500">
                  Passageiro: {ride.passenger_name}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold text-taxi-success">
                R$ {getEarnings(ride).toFixed(2)}
              </p>
              {ride.type === "passed" && ride.commission && !ride.received_with_client && (
                <div className="text-xs text-taxi-gray-500">
                  <p>Total: R$ {ride.value.toFixed(2)}</p>
                  {ride.added_by_admin && (
                    <p>Repassou: R$ {(ride.value - ride.commission).toFixed(2)}</p>
                  )}
                  <p>Comissão: R$ {ride.commission.toFixed(2)}</p>
                </div>
              )}
              <div className="flex gap-2 mt-2 justify-end">
                <button
                  onClick={() => startEditing(ride)}
                  className="text-xs text-taxi-primary font-medium"
                >
                  Editar
                </button>
                <button
                  onClick={() => onDelete(ride.id)}
                  className="text-xs text-red-500"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
