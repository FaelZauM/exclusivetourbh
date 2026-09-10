"use client"

import { Inter } from "next/font/google"
import { AuthProvider, useAuth } from "./lib/auth-context"
import { ThemeProvider } from "./lib/theme-context"
import { Header } from "./components/Header"
import { BottomNav } from "./components/BottomNav"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"
import { getSupabase } from "./lib/supabase"
import { checkAndSendNotifications } from "./lib/notification-service"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isPending } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const publicPages = ["/taxi/auth", "/taxi/cadastro"]
  const isPublicPage = publicPages.includes(pathname)

  useEffect(() => {
    if (!loading && !user && !isPublicPage) {
      router.push("/taxi/auth")
    }
  }, [user, loading, pathname, router, isPublicPage])

  useEffect(() => {
    if (!user) return
    
    // Check immediately
    checkAndSendNotifications()
    
    // Check every 5 minutes
    const interval = setInterval(() => {
      checkAndSendNotifications()
    }, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-taxi-gray-500">Carregando...</p>
      </div>
    )
  }

  if (!user && !isPublicPage) {
    return null
  }

  if (isPending && !isPublicPage) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-2xl mb-4">⏳</p>
          <h2 className="text-xl font-bold mb-2">Conta pendente</h2>
          <p className="text-taxi-gray-500 mb-4">
            Sua conta está aguardando aprovação do administrador.
          </p>
          <button
            onClick={() => {
              getSupabase().auth.signOut()
              router.push("/taxi/auth")
            }}
            className="px-6 py-2 bg-taxi-primary text-white rounded-xl"
          >
            Sair
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-16">
      {!isPublicPage && <Header />}
      {children}
      {!isPublicPage && <BottomNav />}
    </div>
  )
}

export default function TaxiLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              if (localStorage.getItem('theme-dark') === 'true') {
                document.documentElement.classList.add('dark')
              }
            } catch (e) {}
          `
        }} />
      </head>
      <body className="font-inter bg-white dark:bg-gray-900 text-taxi-gray-900 dark:text-gray-100 antialiased transition-colors">
        <ThemeProvider>
          <AuthProvider>
            <AuthGuard>{children}</AuthGuard>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
