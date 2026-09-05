"use client"

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider, useAuth } from "./lib/auth-context"
import { Header } from "./components/Header"
import { BottomNav } from "./components/BottomNav"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user && pathname !== "/taxi/auth") {
      router.push("/taxi/auth")
    }
  }, [user, loading, pathname, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-taxi-gray-500">Carregando...</p>
      </div>
    )
  }

  if (!user && pathname !== "/taxi/auth") {
    return null
  }

  return (
    <div className="min-h-screen pb-16">
      {pathname !== "/taxi/auth" && <Header />}
      {children}
      {pathname !== "/taxi/auth" && <BottomNav />}
    </div>
  )
}

export default function TaxiLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable}`}>
      <body className="font-inter bg-white text-taxi-gray-900 antialiased">
        <AuthProvider>
          <AuthGuard>{children}</AuthGuard>
        </AuthProvider>
      </body>
    </html>
  )
}
