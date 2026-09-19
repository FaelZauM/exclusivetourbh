"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "../lib/auth-context"
import { useTheme } from "../lib/theme-context"
import { useToast } from "../lib/toast-context"
import { getSupabase } from "../lib/supabase"
import { ExportModal } from "../components/ExportModal"
import type { Ride, Expense, User } from "../lib/types"

export default function SettingsPage() {
  const { user, signOut, refreshUser } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { showToast } = useToast()
  const [nome, setNome] = useState(user?.nome || "")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const [dailyGoal, setDailyGoal] = useState("200")
  const [weeklyGoal, setWeeklyGoal] = useState("1000")
  const [goalsLoading, setGoalsLoading] = useState(false)
  const [goalsSuccess, setGoalsSuccess] = useState(false)

  const [showExportModal, setShowExportModal] = useState(false)
  const [allRides, setAllRides] = useState<Ride[]>([])
  const [allExpenses, setAllExpenses] = useState<Expense[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loadingExport, setLoadingExport] = useState(false)

  useEffect(() => {
    if (user) setNome(user.nome || "")
  }, [user])

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

    try {
      const { error } = await getSupabase()
        .from("users")
        .update({ nome })
        .eq("id", user.id)

      if (error) throw error

      await refreshUser()
      setSuccess(true)
      showToast("Perfil atualizado!", "success")
    } catch {
      showToast("Erro ao atualizar perfil", "error")
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveGoals(e: React.FormEvent) {
    e.preventDefault()
    setGoalsLoading(true)
    setGoalsSuccess(false)

    try {
      const { data } = await getSupabase()
        .from("goals")
        .select("id")
        .limit(1)
        .single()

      if (data) {
        const { error } = await getSupabase()
          .from("goals")
          .update({
            daily_goal: parseFloat(dailyGoal),
            weekly_goal: parseFloat(weeklyGoal),
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id)
        if (error) throw error
      } else {
        const { error } = await getSupabase()
          .from("goals")
          .insert({
            daily_goal: parseFloat(dailyGoal),
            weekly_goal: parseFloat(weeklyGoal),
          })
        if (error) throw error
      }

      setGoalsSuccess(true)
      showToast("Metas atualizadas!", "success")
    } catch {
      showToast("Erro ao salvar metas", "error")
    } finally {
      setGoalsLoading(false)
    }
  }

  async function fetchAllData() {
    if (!user) return
    setLoadingExport(true)

    try {
      const { data: ridesData } = await getSupabase()
        .from("rides")
        .select("*")
        .eq("user_id", user.id)

      const { data: expensesData } = await getSupabase()
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)

      const { data: usersData } = await getSupabase()
        .from("users")
        .select("*")

      setAllRides(ridesData || [])
      setAllExpenses(expensesData || [])
      setAllUsers(usersData || [])
      setShowExportModal(true)
    } catch {
      showToast("Erro ao carregar dados para exportação", "error")
    } finally {
      setLoadingExport(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
    } catch {
      showToast("Erro ao sair", "error")
    }
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

      <div className="mt-6 p-4 bg-taxi-gray-50 dark:bg-gray-800 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">🌙 Modo Escuro</p>
            <p className="text-sm text-taxi-gray-500 dark:text-gray-400">
              {isDark ? "Ativado" : "Desativado"}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            role="switch"
            aria-checked={isDark}
            aria-label="Alternar modo escuro"
            className={`relative w-12 h-6 rounded-full transition-colors ${
              isDark ? "bg-taxi-primary" : "bg-taxi-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                isDark ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

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
              className="w-full py-3 bg-taxi-success text-white font-medium rounded-xl hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {goalsLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Salvando...
                </span>
              ) : "Salvar Metas"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-8">
        <div className="mb-4">
          <h3 className="font-semibold mb-4">Exportar Relatórios</h3>
          <p className="text-sm text-taxi-gray-500 mb-3">
            Exporte seus relatórios de corridas e gastos em PDF ou CSV.
          </p>
          <button
            onClick={fetchAllData}
            disabled={loadingExport}
            className="w-full py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loadingExport ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Carregando...
              </span>
            ) : "📄 Exportar Relatório"}
          </button>
        </div>

        <Link
          href="/taxi/convites"
          className="block w-full py-3 bg-taxi-gray-100 text-taxi-gray-700 font-medium rounded-xl text-center hover:bg-taxi-gray-200 mb-3"
        >
          📩 Convites
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors"
        >
          Sair
        </button>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        rides={allRides}
        expenses={allExpenses}
        users={allUsers}
        selectedMonth={new Date().getMonth() + 1}
        selectedYear={new Date().getFullYear()}
      />
    </main>
  )
}
