"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { useToast } from "../lib/toast-context"

interface KmTrackerProps {
  onSuccess?: () => void
}

export function KmTracker({ onSuccess }: KmTrackerProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [kmStart, setKmStart] = useState("")
  const [kmEnd, setKmEnd] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [todayKmId, setTodayKmId] = useState<string | null>(null)

  useEffect(() => {
    if (user) fetchTodayKm()
  }, [user])

  async function fetchTodayKm() {
    if (!user) return

    const today = new Date().toISOString().split("T")[0]

    const { data } = await getSupabase()
      .from("expenses")
      .select("id, description")
      .eq("user_id", user.id)
      .eq("category", "km_tracking")
      .gte("expense_date", today)
      .lt("expense_date", today + "T23:59:59")
      .limit(1)
      .single()

    if (data) {
      setTodayKmId(data.id)
      try {
        const desc = JSON.parse(data.description || "{}")
        setKmStart(desc.km_start?.toString() || "")
        setKmEnd(desc.km_end?.toString() || "")
      } catch {
        setKmStart("")
        setKmEnd("")
      }
    } else {
      setTodayKmId(null)
      setKmStart("")
      setKmEnd("")
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setSuccess(false)

    const today = new Date().toISOString().split("T")[0]
    const kmStartVal = kmStart ? parseFloat(kmStart) : null
    const kmEndVal = kmEnd ? parseFloat(kmEnd) : null
    const total = kmStartVal && kmEndVal ? kmEndVal - kmStartVal : 0

    const desc = JSON.stringify({ km_start: kmStartVal, km_end: kmEndVal, total })

    try {
      if (todayKmId) {
        const { error } = await getSupabase()
          .from("expenses")
          .update({ description: desc })
          .eq("id", todayKmId)

        if (error) throw error
      } else {
        const { data, error } = await getSupabase()
          .from("expenses")
          .insert({
            user_id: user.id,
            category: "km_tracking",
            description: desc,
            amount: 0,
            expense_date: today,
          })
          .select("id")
          .single()

        if (error) throw error
        if (data) setTodayKmId(data.id)
      }

      setSuccess(true)
      showToast("KM salvo!", "success")
      onSuccess?.()
    } catch {
      showToast("Erro ao salvar KM", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="p-4 bg-taxi-gray-50 rounded-xl">
      <h3 className="font-semibold mb-3">KM do Dia</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">KM Início</label>
          <input
            type="number"
            step="0.01"
            value={kmStart}
            onChange={(e) => setKmStart(e.target.value)}
            className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
            placeholder="Ex: 10000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">KM Fim</label>
          <input
            type="number"
            step="0.01"
            value={kmEnd}
            onChange={(e) => setKmEnd(e.target.value)}
            className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
            placeholder="Ex: 10150"
          />
        </div>
      </div>

      {kmStart && kmEnd && (
        <p className="text-sm text-taxi-gray-500 mb-3">
          Total: {parseFloat(kmEnd) - parseFloat(kmStart)} km
        </p>
      )}

      {success && (
        <p className="text-taxi-success text-sm mb-3">KM salvo!</p>
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
        ) : "Salvar KM"}
      </button>
    </form>
  )
}
