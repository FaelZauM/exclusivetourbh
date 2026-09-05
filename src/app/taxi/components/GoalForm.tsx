"use client"

import { useState } from "react"
import { getSupabase } from "../lib/supabase"

interface GoalFormProps {
  currentGoals: { daily_goal: number; weekly_goal: number } | null
  onSuccess: () => void
}

export function GoalForm({ currentGoals, onSuccess }: GoalFormProps) {
  const [dailyGoal, setDailyGoal] = useState(
    currentGoals?.daily_goal?.toString() || ""
  )
  const [weeklyGoal, setWeeklyGoal] = useState(
    currentGoals?.weekly_goal?.toString() || ""
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (currentGoals) {
      await getSupabase()
        .from("goals")
        .update({
          daily_goal: parseFloat(dailyGoal),
          weekly_goal: parseFloat(weeklyGoal),
          updated_at: new Date().toISOString(),
        })
        .eq("id", "1")
    } else {
      await getSupabase().from("goals").insert({
        id: "1",
        daily_goal: parseFloat(dailyGoal),
        weekly_goal: parseFloat(weeklyGoal),
      })
    }

    setLoading(false)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-taxi-gray-50 rounded-xl">
      <h3 className="font-semibold">Definir Metas</h3>

      <div>
        <label className="block text-sm font-medium mb-1">Meta Diária (R$)</label>
        <input
          type="number"
          step="0.01"
          value={dailyGoal}
          onChange={(e) => setDailyGoal(e.target.value)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Meta Semanal (R$)</label>
        <input
          type="number"
          step="0.01"
          value={weeklyGoal}
          onChange={(e) => setWeeklyGoal(e.target.value)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar Metas"}
      </button>
    </form>
  )
}
