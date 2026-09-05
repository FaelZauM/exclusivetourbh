"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../lib/auth-context"
import { getSupabase } from "../lib/supabase"

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const [nome, setNome] = useState(user?.nome || "")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const [dailyGoal, setDailyGoal] = useState("200")
  const [weeklyGoal, setWeeklyGoal] = useState("1000")
  const [goalsLoading, setGoalsLoading] = useState(false)
  const [goalsSuccess, setGoalsSuccess] = useState(false)

  useEffect(() => {
    if (user?.role === "admin") {
      fetchGoals()
    }
  }, [user])

  async function fetchGoals() {
    const { data } = await getSupabase()
      .from("goals")
      .select("*")
      .limit(1)
      .single()

    if (data) {
      setDailyGoal(data.daily_goal.toString())
      setWeeklyGoal(data.weekly_goal.toString())
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setSuccess(false)

    await getSupabase()
      .from("users")
      .update({ nome })
      .eq("id", user.id)

    setLoading(false)
    setSuccess(true)
  }

  async function handleSaveGoals(e: React.FormEvent) {
    e.preventDefault()
    setGoalsLoading(true)
    setGoalsSuccess(false)

    const { data } = await getSupabase()
      .from("goals")
      .select("id")
      .limit(1)
      .single()

    if (data) {
      await getSupabase()
        .from("goals")
        .update({
          daily_goal: parseFloat(dailyGoal),
          weekly_goal: parseFloat(weeklyGoal),
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
    } else {
      await getSupabase()
        .from("goals")
        .insert({
          daily_goal: parseFloat(dailyGoal),
          weekly_goal: parseFloat(weeklyGoal),
        })
    }

    setGoalsLoading(false)
    setGoalsSuccess(true)
  }

  return (
    <main className="p-4">
      <h2 className="text-xl font-bold mb-6">Configurações</h2>

      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl bg-taxi-gray-50"
          />
        </div>

        {success && (
          <p className="text-taxi-success text-sm">Perfil atualizado!</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </form>

      {user?.role === "admin" && (
        <div className="mt-8">
          <h3 className="font-semibold mb-4">Metas</h3>
          <form onSubmit={handleSaveGoals} className="space-y-4">
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

            {goalsSuccess && (
              <p className="text-taxi-success text-sm">Metas atualizadas!</p>
            )}

            <button
              type="submit"
              disabled={goalsLoading}
              className="w-full py-3 bg-taxi-success text-white font-medium rounded-xl hover:bg-opacity-90 disabled:opacity-50"
            >
              {goalsLoading ? "Salvando..." : "Salvar Metas"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={signOut}
          className="w-full py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600"
        >
          Sair
        </button>
      </div>
    </main>
  )
}
