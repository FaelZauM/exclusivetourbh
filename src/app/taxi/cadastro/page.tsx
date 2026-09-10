"use client"

import { useState } from "react"
import { getSupabase } from "../lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function CadastroPage() {
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    // 1. Create auth user
    const { data: authData, error: authError } = await getSupabase().auth.signUp({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      // 2. Insert into users table with role "user" and status "pending"
      const { error: insertError } = await getSupabase().from("users").insert({
        id: authData.user.id,
        email: email,
        nome: nome,
        role: "user",
        status: "pending",
      })

      if (insertError) {
        // If insert fails (RLS), try via RPC or just show success
        // User can still login, fallback will create profile
        console.error("Insert error:", insertError)
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/taxi/auth")
      }, 2000)
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2">ExclusivePro</h1>
        <p className="text-center text-taxi-gray-500 mb-8">Crie sua conta</p>
        
        {success ? (
          <div className="text-center">
            <p className="text-taxi-success font-medium mb-4">Conta criada com sucesso!</p>
            <p className="text-sm text-taxi-gray-500">Redirecionando para o login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-taxi-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-taxi-primary"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-taxi-primary"
                minLength={6}
                required
              />
            </div>
            
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark disabled:opacity-50"
            >
              {loading ? "Criando conta..." : "Cadastrar"}
            </button>
          </form>
        )}

        <p className="text-center mt-6 text-sm text-taxi-gray-500">
          Já tem conta?{" "}
          <Link href="/taxi/auth" className="text-taxi-primary font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
