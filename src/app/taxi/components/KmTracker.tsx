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
  const [todayKm, setTodayKm] = useState<{ km_start?: number; km_end?: number } | null>(null)

  useEffect(() => {
    if (user) {
      fetchTodayKm()
    }
  }, [user])

  async function fetchTodayKm() {
    if (!user) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data } = await getSupabase()
      .from("fuel")
      .select("km_start, km_end")
      .eq("user_id", user.id)
      .gte("fuel_date", today.toISOString())
      .lt("fuel_date", tomorrow.toISOString())
      .limit(1)
      .single()

    if (data) {
      setTodayKm(data)
      setKmStart(data.km_start?.toString() || "")
      setKmEnd(data.km_end?.toString() || "")
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setSuccess(false)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (todayKm) {
      const { error } = await getSupabase()
        .from("fuel")
        .update({
          km_start: kmStart ? parseFloat(kmStart) : null,
          km_end: kmEnd ? parseFloat(kmEnd) : null,
        })
        .eq("user_id", user.id)
        .gte("fuel_date", today.toISOString())
        .lt("fuel_date", tomorrow.toISOString())

      setLoading(false)
      if (!error) {
        setSuccess(true)
        fetchTodayKm()
        onSuccess?.()
      }
    } else {
      const { error } = await getSupabase().from("fuel").insert({
        user_id: user.id,
        fuel_date: today.toISOString(),
        total_value: 0,
        km_start: kmStart ? parseFloat(kmStart) : null,
        km_end: kmEnd ? parseFloat(kmEnd) : null,
      })

      setLoading(false)
      if (!error) {
        setSuccess(true)
        fetchTodayKm()
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
