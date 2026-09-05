"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { FuelForm } from "../components/FuelForm"
import { FuelPriceForm } from "../components/FuelPriceForm"
import type { Fuel } from "../lib/types"

export default function InvestmentPage() {
  const { user } = useAuth()
  const [totalSaved, setTotalSaved] = useState(0)
  const [recentFuel, setRecentFuel] = useState<Fuel[]>([])
  const [editingFuel, setEditingFuel] = useState<Fuel | null>(null)
  const [editLiters, setEditLiters] = useState("")
  const [editTotalValue, setEditTotalValue] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  async function fetchData() {
    if (!user) return

    const { data: rides } = await getSupabase()
      .from("rides")
      .select("value")
      .eq("user_id", user.id)
      .eq("type", "own")

    const total = rides?.reduce((sum, ride) => sum + ride.value * 0.1, 0) || 0
    setTotalSaved(total)

    const { data: fuel } = await getSupabase()
      .from("fuel")
      .select("*")
      .eq("user_id", user.id)
      .order("fuel_date", { ascending: false })
      .limit(5)

    setRecentFuel(fuel || [])
  }

  function startEdit(fuel: Fuel) {
    setEditingFuel(fuel)
    setEditLiters(fuel.liters?.toString() || "")
    setEditTotalValue(fuel.total_value.toString())
  }

  function cancelEdit() {
    setEditingFuel(null)
  }

  async function saveEdit() {
    if (!editingFuel) return
    setEditLoading(true)

    const { error } = await getSupabase()
      .from("fuel")
      .update({
        liters: editLiters ? parseFloat(editLiters) : null,
        total_value: parseFloat(editTotalValue),
      })
      .eq("id", editingFuel.id)

    setEditLoading(false)

    if (!error) {
      setEditingFuel(null)
      fetchData()
    }
  }

  async function deleteFuel(id: string) {
    const { error } = await getSupabase().from("fuel").delete().eq("id", id)
    if (!error) fetchData()
  }

  return (
    <main className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Investimento</h2>
        <div className="p-4 bg-taxi-gray-50 rounded-xl">
          <p className="text-sm text-taxi-gray-500">Total Guardado (10%)</p>
          <p className="text-2xl font-bold text-taxi-success">
            R$ {totalSaved.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <FuelForm onSuccess={fetchData} />
        <FuelPriceForm onSuccess={fetchData} />
      </div>

      {recentFuel.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-3">Últimos Registros</h3>
          <div className="space-y-2">
            {recentFuel.map((fuel) => (
              <div
                key={fuel.id}
                className="p-3 bg-white border border-taxi-gray-200 rounded-xl text-sm"
              >
                {editingFuel?.id === fuel.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-taxi-gray-500">Valor (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editTotalValue}
                          onChange={(e) => setEditTotalValue(e.target.value)}
                          className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-taxi-gray-500">Litros</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editLiters}
                          onChange={(e) => setEditLiters(e.target.value)}
                          className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                        />
                      </div>
                    </div>
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
                    <div>
                      <p className="font-medium">
                        R$ {fuel.total_value.toFixed(2)}
                        {fuel.liters && ` • ${fuel.liters}L`}
                      </p>
                      <p className="text-taxi-gray-500">
                        {new Date(fuel.fuel_date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(fuel)}
                        className="p-2 text-taxi-gray-500 hover:text-taxi-primary"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteFuel(fuel.id)}
                        className="p-2 text-taxi-gray-500 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
