"use client"

import { useState } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"

interface FuelFormProps {
  onSuccess: () => void
}

export function FuelForm({ onSuccess }: FuelFormProps) {
  const { user } = useAuth()
  const [liters, setLiters] = useState("")
  const [totalValue, setTotalValue] = useState("")
  const [kmStart, setKmStart] = useState("")
  const [kmEnd, setKmEnd] = useState("")
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    const { error } = await getSupabase().from("fuel").insert({
      user_id: user.id,
      fuel_date: new Date(fuelDate + "T12:00:00").toISOString(),
      liters: liters ? parseFloat(liters) : null,
      total_value: parseFloat(totalValue),
      km_start: kmStart ? parseFloat(kmStart) : null,
      km_end: kmEnd ? parseFloat(kmEnd) : null,
    })

    setLoading(false)

    if (!error) {
      onSuccess()
      resetForm()
    }
  }

  function resetForm() {
    setLiters("")
    setTotalValue("")
    setKmStart("")
    setKmEnd("")
    setFuelDate(new Date().toISOString().split("T")[0])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-taxi-gray-50 rounded-xl">
      <h3 className="font-semibold">Registrar Combustível</h3>

      <div>
        <label className="block text-sm font-medium mb-1">Data</label>
        <input
          type="date"
          value={fuelDate}
          onChange={(e) => setFuelDate(e.target.value)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Valor Total (R$)</label>
        <input
          type="number"
          step="0.01"
          value={totalValue}
          onChange={(e) => setTotalValue(e.target.value)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Litros (opcional)</label>
        <input
          type="number"
          step="0.01"
          value={liters}
          onChange={(e) => setLiters(e.target.value)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">KM Início</label>
          <input
            type="number"
            step="0.01"
            value={kmStart}
            onChange={(e) => setKmStart(e.target.value)}
            className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">KM Fim</label>
          <input
            type="number"
            step="0.01"
            value={kmEnd}
            onChange={(e) => setKmEnd(e.target.value)}
            className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          />
        </div>
      </div>

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
