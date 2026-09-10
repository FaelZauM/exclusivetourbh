"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { ExpenseForm } from "../components/ExpenseForm"
import type { Expense, RentalRate } from "../lib/types"

interface FuelEntry {
  id: string
  user_id: string
  fuel_date: string
  total_value: number
  liters: number | null
  price_per_liter: number | null
  source?: string
}

export default function GastosPage() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editLoading, setEditLoading] = useState(false)
  const [rentalRate, setRentalRate] = useState<RentalRate | null>(null)
  const [dailyRate, setDailyRate] = useState("")
  const [savingRate, setSavingRate] = useState(false)

  useEffect(() => {
    if (user) {
      fetchExpenses()
      fetchFuelEntries()
      fetchRentalRate()
    }
  }, [user])

  async function fetchExpenses() {
    if (!user) return

    setLoading(true)
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const { data } = await getSupabase()
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("expense_date", startDate.toISOString())
      .lte("expense_date", endDate.toISOString())
      .order("expense_date", { ascending: false })

    setExpenses(data || [])
    setLoading(false)
  }

  async function fetchFuelEntries() {
    if (!user) return

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const prefix = `${year}-${month}`

    const { data } = await getSupabase()
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .eq("category", "fuel")
      .like("expense_date", `${prefix}%`)
      .order("expense_date", { ascending: false })
    setFuelEntries((data || []).map(e => ({
      id: e.id,
      user_id: e.user_id,
      fuel_date: e.expense_date,
      total_value: e.value,
      liters: null,
      price_per_liter: null,
    })))
  }

  async function fetchRentalRate() {
    if (!user) return

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const { data } = await getSupabase()
      .from("rental_rates")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", year)
      .limit(1)

    if (data && data.length > 0) {
      setRentalRate(data[0])
      setDailyRate(data[0].daily_rate.toString())
    } else {
      setRentalRate(null)
      setDailyRate("")
    }
  }

  async function saveRentalRate() {
    if (!user || !dailyRate) return

    setSavingRate(true)
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const rate = parseFloat(dailyRate)

    if (rentalRate) {
      const { error } = await getSupabase()
        .from("rental_rates")
        .update({ daily_rate: rate })
        .eq("id", rentalRate.id)

      if (!error) {
        setRentalRate({ ...rentalRate, daily_rate: rate })
      }
    } else {
      const { data, error } = await getSupabase()
        .from("rental_rates")
        .insert({
          user_id: user.id,
          daily_rate: rate,
          month,
          year,
        })
        .select()
        .single()

      if (!error && data) {
        setRentalRate(data)
      }
    }

    setSavingRate(false)
  }

  function getDaysInMonth(): number {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  }

  function getCurrentDay(): number {
    return new Date().getDate()
  }

  const totalRent = rentalRate ? rentalRate.daily_rate * getDaysInMonth() : 0
  const rentPaid = rentalRate ? rentalRate.daily_rate * getCurrentDay() : 0

  function startEdit(expense: Expense) {
    setEditingExpense(expense)
    setEditValue(expense.value.toString())
    setEditDescription(expense.description || "")
  }

  function cancelEdit() {
    setEditingExpense(null)
  }

  async function saveEdit() {
    if (!editingExpense) return
    setEditLoading(true)

    const { error } = await getSupabase()
      .from("expenses")
      .update({
        value: parseFloat(editValue),
        description: editDescription || null,
      })
      .eq("id", editingExpense.id)

    setEditLoading(false)

    if (!error) {
      setEditingExpense(null)
      fetchExpenses()
    }
  }

  async function deleteExpense(id: string) {
    const { error } = await getSupabase().from("expenses").delete().eq("id", id)
    if (!error) fetchExpenses()
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.value, 0)
  const totalFuel = fuelEntries.reduce((sum, fuel) => sum + fuel.total_value, 0)
  const totalAllExpenses = totalExpenses + totalFuel

  const categoryLabels: Record<string, string> = {
    fuel: "Combustível",
    wash: "Lavagem",
    food: "Alimentação",
    maintenance: "Manutenção",
    other: "Outros",
  }

  const categoryIcons: Record<string, string> = {
    fuel: "⛽",
    wash: "🚕",
    food: "🍔",
    maintenance: "🔧",
    other: "📦",
  }

  return (
    <main className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Gastos</h2>
        <div className="p-4 bg-taxi-gray-50 rounded-xl">
          <p className="text-sm text-taxi-gray-500">Total do Mês</p>
          <p className="text-2xl font-bold text-taxi-danger">
            R$ {totalAllExpenses.toFixed(2)}
          </p>
          <p className="text-xs text-taxi-gray-500 mt-1">
            {expenses.length + fuelEntries.length} gastos registrados
          </p>
        </div>
      </div>

      {/* Diária de Aluguel */}
      <div className="mb-6 p-4 bg-white border border-taxi-gray-200 rounded-xl">
        <h3 className="font-semibold mb-3">🚕 Diária de Aluguel</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="number"
            step="0.01"
            value={dailyRate}
            onChange={(e) => setDailyRate(e.target.value)}
            placeholder="Valor da diária (R$)"
            className="flex-1 px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
          />
          <button
            onClick={saveRentalRate}
            disabled={savingRate || !dailyRate}
            className="px-4 py-2 bg-taxi-primary text-white text-sm font-medium rounded-lg"
          >
            {savingRate ? "..." : "Salvar"}
          </button>
        </div>
        {rentalRate && (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-taxi-gray-500">Diária:</span>
              <span className="font-medium">R$ {rentalRate.daily_rate.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-taxi-gray-500">Dias no mês:</span>
              <span className="font-medium">{getDaysInMonth()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-taxi-gray-500">Total do mês:</span>
              <span className="font-bold text-taxi-danger">R$ {totalRent.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-taxi-gray-100 pt-1 mt-1">
              <span className="text-taxi-gray-500">Até hoje ({getCurrentDay()} dias):</span>
              <span className="font-medium text-orange-600">R$ {rentPaid.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <ExpenseForm onSuccess={() => { fetchExpenses(); fetchFuelEntries() }} />
      </div>

      {loading ? (
        <p className="text-center text-taxi-gray-500">Carregando...</p>
      ) : expenses.length === 0 && fuelEntries.length === 0 ? (
        <p className="text-center text-taxi-gray-500 py-8">
          Nenhum gasto registrado este mês.
        </p>
      ) : (
        <div className="space-y-2">
          {fuelEntries.map((fuel) => (
            <div
              key={fuel.id}
              className="p-4 bg-white border border-taxi-gray-200 rounded-xl"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⛽</span>
                  <div>
                    <p className="font-medium">Combustível</p>
                    {fuel.liters && (
                      <p className="text-sm text-taxi-gray-500">
                        {fuel.liters}L {fuel.price_per_liter && `@ R$${fuel.price_per_liter}/L`}
                      </p>
                    )}
                    <p className="text-xs text-taxi-gray-500">
                      {new Date(fuel.fuel_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <p className="font-bold text-taxi-danger">
                  R$ {fuel.total_value.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="p-4 bg-white border border-taxi-gray-200 rounded-xl"
            >
              {editingExpense?.id === expense.id ? (
                <div className="space-y-3">
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
                  <div>
                    <label className="text-xs text-taxi-gray-500">Descrição</label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                    />
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
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-taxi-danger">
                      R$ {expense.value.toFixed(2)}
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(expense)}
                        className="p-2 text-taxi-gray-500 hover:text-taxi-primary"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteExpense(expense.id)}
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
          ))}
        </div>
      )}
    </main>
  )
}
