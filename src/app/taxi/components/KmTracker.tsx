"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"

interface KmTrackerProps {
  onSuccess?: () => void
}

export function KmTracker({ onSuccess }: KmTrackerProps) {
  const { user } = useAuth()
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
      .from("km_tracking")
      .select("id, km_start, km_end")
      .eq("user_id", user.id)
      .eq("tracking_date", today)
      .limit(1)
      .single()

    if (data) {
      setTodayKmId(data.id)
      setKmStart(data.km_start?.toString() || "")
      setKmEnd(data.km_end?.toString() || "")
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

    if (todayKmId) {
      const { error } = await getSupabase()
        .from("km_tracking")
        .update({ km_start: kmStartVal, km_end: kmEndVal })
        .eq("id", todayKmId)

      setLoading(false)
      if (!error) {
        setSuccess(true)
        onSuccess?.()
      }
    } else {
      const { data, error } = await getSupabase()
        .from("km_tracking")
        .insert({
          user_id: user.id,
          tracking_date: today,
          km_start: kmStartVal,
          km_end: kmEndVal,
        })
        .select("id")
        .single()

      setLoading(false)
      if (!error && data) {
        setTodayKmId(data.id)
        setSuccess(true)
        onSuccess?.()
      }
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
        className="w-full py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar KM"}
      </button>
    </form>
  )
}
