"use client"

import { useState } from "react"
import { useAuth } from "../lib/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AuthPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { error } = await signIn(email, password)
    if (error) {
      setError(error)
      setLoading(false)
    } else {
      router.push("/taxi/corridas")
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8">ExclusivePro</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-taxi-gray-500">
          Não tem conta?{" "}
          <Link href="/taxi/cadastro" className="text-taxi-primary font-medium hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </main>
  )
}
