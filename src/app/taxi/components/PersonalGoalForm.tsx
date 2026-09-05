"use client"

import { useState } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"

interface PersonalGoalFormProps {
  currentGoal: number | null
  onSuccess: () => void
}

export function PersonalGoalForm({ currentGoal, onSuccess }: PersonalGoalFormProps) {
  const { user } = useAuth()
  const [personalGoal, setPersonalGoal] = useState(currentGoal?.toString() || "")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setSuccess(false)

    const { data: existing } = await getSupabase()
      .from("driver_goals")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)

    if (existing && existing.length > 0) {
      await getSupabase()
        .from("driver_goals")
        .update({
          personal_goal: parseFloat(personalGoal),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing[0].id)
    } else {
      await getSupabase().from("driver_goals").insert({
        user_id: user.id,
        personal_goal: parseFloat(personalGoal),
      })
    }

    setLoading(false)
    setSuccess(true)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-taxi-gray-50 rounded-xl">
      <h3 className="font-semibold">Minha Meta Pessoal</h3>
      
      <div>
        <label className="block text-sm font-medium mb-1">Meta Pessoal (R$)</label>
        <input
          type="number"
          step="0.01"
          value={personalGoal}
          onChange={(e) => setPersonalGoal(e.target.value)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          required
        />
      </div>

      {success && (
        <p className="text-taxi-success text-sm">Meta atualizada!</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar Meta"}
      </button>
    </form>
  )
}
