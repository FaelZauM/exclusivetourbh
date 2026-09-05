"use client"

import { useState } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import type { RideCategory, RideType } from "../lib/types"

interface RideFormProps {
  onSuccess: () => void
}

export function RideForm({ onSuccess }: RideFormProps) {
  const { user } = useAuth()
  const [type, setType] = useState<RideType>("own")
  const [category, setCategory] = useState<RideCategory>("app")
  const [value, setValue] = useState("")
  const [commission, setCommission] = useState("")
  const [driverName, setDriverName] = useState("")
  const [passengerName, setPassengerName] = useState("")
  const [dispatcherName, setDispatcherName] = useState("")
  const [startLocation, setStartLocation] = useState("")
  const [endLocation, setEndLocation] = useState("")
  const [loading, setLoading] = useState(false)

  const showLocations = ["cooperative", "private", "invoiced", "passed"].includes(category)
  const showCommission = type === "passed"
  const showDispatcher = category === "cooperative"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    const { error } = await getSupabase().from("rides").insert({
      user_id: user.id,
      type,
      category,
      value: parseFloat(value),
      commission: showCommission && commission ? parseFloat(commission) : null,
      driver_name: showCommission ? driverName : null,
      passenger_name: passengerName || null,
      dispatcher_name: showDispatcher ? dispatcherName : null,
      start_location: showLocations ? startLocation : null,
      end_location: showLocations ? endLocation : null,
      ride_date: new Date().toISOString(),
    })

    setLoading(false)

    if (!error) {
      onSuccess()
      resetForm()
    }
  }

  function resetForm() {
    setType("own")
    setCategory("app")
    setValue("")
    setCommission("")
    setDriverName("")
    setPassengerName("")
    setDispatcherName("")
    setStartLocation("")
    setEndLocation("")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-taxi-gray-50 rounded-xl">
      <h3 className="font-semibold">Nova Corrida</h3>
      
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("own")}
          className={`flex-1 py-2 rounded-lg ${
            type === "own" ? "bg-taxi-primary text-white" : "bg-white border border-taxi-gray-200"
          }`}
        >
          Própria
        </button>
        <button
          type="button"
          onClick={() => setType("passed")}
          className={`flex-1 py-2 rounded-lg ${
            type === "passed" ? "bg-taxi-primary text-white" : "bg-white border border-taxi-gray-200"
          }`}
        >
          Passada
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Categoria</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as RideCategory)}
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
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          required
        />
      </div>

      {showCommission && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Motorista</label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Valor do Motorista (R$)</label>
            <input
              type="number"
              step="0.01"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
              required
            />
            <p className="text-xs text-taxi-gray-500 mt-1">
              Sua comissão: R$ {value && commission ? (parseFloat(value) - parseFloat(commission)).toFixed(2) : "0.00"}
            </p>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Passageiro (opcional)</label>
        <input
          type="text"
          value={passengerName}
          onChange={(e) => setPassengerName(e.target.value)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
        />
      </div>

      {showDispatcher && (
        <div>
          <label className="block text-sm font-medium mb-1">Quem mandou a corrida</label>
          <input
            type="text"
            value={dispatcherName}
            onChange={(e) => setDispatcherName(e.target.value)}
            className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          />
        </div>
      )}

      {showLocations && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Início</label>
            <input
              type="text"
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
              className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Destino</label>
            <input
              type="text"
              value={endLocation}
              onChange={(e) => setEndLocation(e.target.value)}
              className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
            />
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar"}
      </button>
    </form>
  )
}