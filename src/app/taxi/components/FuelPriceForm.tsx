"use client"

import { useState } from "react"
import { getSupabase } from "../lib/supabase"

interface FuelPriceFormProps {
  onSuccess: () => void
}

export function FuelPriceForm({ onSuccess }: FuelPriceFormProps) {
  const [pricePerLiter, setPricePerLiter] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await getSupabase().from("fuel_price").insert({
      price_per_liter: parseFloat(pricePerLiter),
      recorded_date: new Date().toISOString(),
    })

    setLoading(false)

    if (!error) {
      onSuccess()
      setPricePerLiter("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-taxi-gray-50 rounded-xl">
      <h3 className="font-semibold">Preço do Combustível</h3>

      <div>
        <label className="block text-sm font-medium mb-1">Preço por Litro (R$)</label>
        <input
          type="number"
          step="0.01"
          value={pricePerLiter}
          onChange={(e) => setPricePerLiter(e.target.value)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          required
        />
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
