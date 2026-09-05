"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { getSupabase } from "./supabase"
import type { User } from "./types"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({}),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchUserProfile(userId: string) {
    try {
      const { data, error } = await getSupabase()
        .from("users")
        .select("*")
        .eq("id", userId)
        .single()

      if (error || !data) {
        // User doesn't exist in users table or query failed
        // Create a minimal fallback user from auth data
        const authUser = await getSupabase().auth.getUser()
        if (authUser.data.user) {
          setUser({
            id: authUser.data.user.id,
            email: authUser.data.user.email || "",
            nome: authUser.data.user.email?.split("@")[0] || "Usuário",
            role: "driver",
            created_at: new Date().toISOString(),
          })
        } else {
          setUser(null)
        }
      } else {
        setUser(data)
      }
    } catch (err) {
      // Network error or other unexpected error
      console.error("Error fetching user profile:", err)
      // Try to get basic info from auth
      const authUser = await getSupabase().auth.getUser()
      if (authUser.data.user) {
        setUser({
          id: authUser.data.user.id,
          email: authUser.data.user.email || "",
          nome: authUser.data.user.email?.split("@")[0] || "Usuário",
          role: "driver",
          created_at: new Date().toISOString(),
        })
      } else {
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const sb = getSupabase()
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return {}
  }

  async function signOut() {
    await getSupabase().auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
