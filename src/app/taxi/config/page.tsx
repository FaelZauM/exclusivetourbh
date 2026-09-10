"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "../lib/auth-context"
import { useTheme } from "../lib/theme-context"
import { getSupabase } from "../lib/supabase"
import { importAllNotionData } from "../lib/notion-service"

const NOTION_PAGE_ID = "2c3a6544942080c4b94fd6fc11ed9e15"

export default function SettingsPage() {
  const { user, signOut, refreshUser } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [nome, setNome] = useState(user?.nome || "")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const [dailyGoal, setDailyGoal] = useState("200")
  const [weeklyGoal, setWeeklyGoal] = useState("1000")
  const [goalsLoading, setGoalsLoading] = useState(false)
  const [goalsSuccess, setGoalsSuccess] = useState(false)

  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

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

    await getSupabase()
      .from("users")
      .update({ nome })
      .eq("id", user.id)

    await refreshUser()

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

  async function handleImportNotion() {
    if (!user) return
    
    setImporting(true)
    setImportResult(null)
    
    try {
      const result = await importAllNotionData(NOTION_PAGE_ID, user.id)
      setImportResult(
        `✅ Importação concluída!\n` +
        `📊 ${result.ridesImported} corridas importadas\n` +
        `⛽ ${result.expensesImported} abastecimentos importados`
      )
    } catch (error) {
      setImportResult("❌ Erro ao importar dados do Notion")
      console.error("Import error:", error)
    }
    
    setImporting(false)
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

      {/* Dark Mode Toggle */}
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
              className="w-full py-3 bg-taxi-success text-white font-medium rounded-xl hover:bg-opacity-90 disabled:opacity-50"
            >
              {goalsLoading ? "Salvando..." : "Salvar Metas"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-8">
        {user?.role === "admin" && (
          <div className="mb-4">
            <h3 className="font-semibold mb-4">Importar do Notion</h3>
            <p className="text-sm text-taxi-gray-500 mb-3">
              Importe seu histórico de corridas do Notion para o app.
            </p>
            <button
              onClick={handleImportNotion}
              disabled={importing}
              className="w-full py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 disabled:opacity-50"
            >
              {importing ? "Importando..." : "📥 Importar do Notion"}
            </button>
            {importResult && (
              <pre className="mt-3 p-3 bg-taxi-gray-50 rounded-xl text-sm whitespace-pre-wrap">
                {importResult}
              </pre>
            )}
          </div>
        )}

        <Link
          href="/taxi/convites"
          className="block w-full py-3 bg-taxi-gray-100 text-taxi-gray-700 font-medium rounded-xl text-center hover:bg-taxi-gray-200 mb-3"
        >
          📩 Convites
        </Link>
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
