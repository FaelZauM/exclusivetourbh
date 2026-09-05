"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { ExpenseForm } from "../components/ExpenseForm"
import type { Expense } from "../lib/types"

export default function GastosPage() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editLoading, setEditLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchExpenses()
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

  const categoryLabels: Record<string, string> = {
    fuel: "Combustível",
    wash: "Lavagem",
    food: "Alimentação",
    maintenance: "Manutenção",
    other: "Outros",
  }

  const categoryIcons: Record<string, string> = {
    fuel: "⛽",
    wash: "🚗",
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
            R$ {totalExpenses.toFixed(2)}
          </p>
          <p className="text-xs text-taxi-gray-500 mt-1">
            {expenses.length} gastos registrados
          </p>
        </div>
      </div>

      <div className="mb-6">
        <ExpenseForm onSuccess={fetchExpenses} />
      </div>

      {loading ? (
        <p className="text-center text-taxi-gray-500">Carregando...</p>
      ) : expenses.length === 0 ? (
        <p className="text-center text-taxi-gray-500 py-8">
          Nenhum gasto registrado este mês.
        </p>
      ) : (
        <div className="space-y-2">
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
