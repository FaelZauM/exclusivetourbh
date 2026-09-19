"use client"

import { useState } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { useToast } from "../lib/toast-context"

interface ExpenseFormProps {
  onSuccess: () => void
}

type ExpenseCategory = "fuel" | "wash" | "food" | "maintenance" | "other"

const categories: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: "fuel", label: "Combustível", icon: "⛽" },
  { value: "wash", label: "Lavagem", icon: "🚕" },
  { value: "food", label: "Alimentação", icon: "🍔" },
  { value: "maintenance", label: "Manutenção", icon: "🔧" },
  { value: "other", label: "Outros", icon: "📦" },
]

export function ExpenseForm({ onSuccess }: ExpenseFormProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [category, setCategory] = useState<ExpenseCategory>("fuel")
  const [value, setValue] = useState("")
  const [pricePerLiter, setPricePerLiter] = useState("")
  const [description, setDescription] = useState("")
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    let result
    if (category === "fuel") {
      const totalVal = parseFloat(value)
      const priceVal = pricePerLiter ? parseFloat(pricePerLiter) : null
      const litersVal = priceVal && totalVal ? totalVal / priceVal : null
      result = await getSupabase().from("expenses").insert({
        user_id: user.id,
        category: "fuel",
        value: totalVal,
        description: pricePerLiter ? `${litersVal?.toFixed(2)}L @ R$${pricePerLiter}/L` : null,
        expense_date: new Date(expenseDate + "T12:00:00").toISOString(),
      })
    } else {
      result = await getSupabase().from("expenses").insert({
        user_id: user.id,
        category,
        value: parseFloat(value),
        description: description || null,
        expense_date: new Date(expenseDate + "T12:00:00").toISOString(),
      })
    }

    setLoading(false)

    if (result.error) {
      showToast("Erro ao salvar gasto", "error")
    } else {
      showToast("Gasto salvo!", "success")
      onSuccess()
      resetForm()
    }
  }

  function resetForm() {
    setCategory("fuel")
    setValue("")
    setPricePerLiter("")
    setDescription("")
    setExpenseDate(new Date().toISOString().split("T")[0])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-taxi-gray-50 rounded-xl">
      <h3 className="font-semibold">Novo Gasto</h3>

      <div>
        <label className="block text-sm font-medium mb-2">Categoria</label>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              aria-pressed={category === cat.value}
              className={`flex flex-col items-center p-3 rounded-xl transition-colors ${
                category === cat.value
                  ? "bg-taxi-primary text-white"
                  : "bg-white border border-taxi-gray-200"
              }`}
            >
              <span className="text-xl mb-1">{cat.icon}</span>
              <span className="text-xs">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Data</label>
        <input
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          required
        />
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

      {category === "fuel" && (
        <div>
          <label className="block text-sm font-medium mb-1">Preço por litro (R$)</label>
          <input
            type="number"
            step="0.01"
            value={pricePerLiter}
            onChange={(e) => setPricePerLiter(e.target.value)}
            className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
            placeholder="Ex: 5.89"
          />
          {pricePerLiter && value && (
            <p className="text-xs text-taxi-gray-500 mt-1">
              ≈ {(parseFloat(value) / parseFloat(pricePerLiter)).toFixed(2)} litros
            </p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Descrição (opcional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          placeholder="Ex: troca de óleo"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Salvando...
          </span>
        ) : "Salvar"}
      </button>
    </form>
  )
}
