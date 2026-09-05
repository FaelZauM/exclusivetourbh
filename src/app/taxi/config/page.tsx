"use client"

import { useState } from "react"
import { useAuth } from "../lib/auth-context"
import { getSupabase } from "../lib/supabase"

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const [nome, setNome] = useState(user?.nome || "")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

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
