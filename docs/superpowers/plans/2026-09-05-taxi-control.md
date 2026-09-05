# Taxi Control — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first app for taxi drivers to register rides, control investments (fuel, km), and track earnings goals.

**Architecture:** Next.js 16 static export alongside existing ExclusiveTour BH site. Routes under `/taxi/*`. All data fetched client-side via Supabase (auth, DB). Mobile-only SPA with bottom tab navigation.

**Tech Stack:** Next.js 16.2.9 (static export), Tailwind CSS v4, React 19.2, Supabase, Inter font

## Global Constraints

- Static export only (`output: "export"`) — no server actions, no SSR for protected routes, no cookies/headers
- All browser APIs (`window`, `localStorage`, `navigator`) only in `useEffect` or client components
- Route params are Promises — must `await` everywhere
- Turbopack as default bundler (no custom webpack)
- `next lint` removed — use `eslint` directly
- Inter font via Google Fonts
- Mobile-only design (no desktop layout)
- Design tokens: Primary `#2563EB`, Success `#10B981`, Warning `#F59E0B`, Gray-900 `#111827`, Gray-500 `#6B7280`, Gray-200 `#E5E7EB`, Gray-50 `#F9FAFB`

---

### Task 1: Project Structure & Design System

**Files:**
- Create: `src/app/taxi/layout.tsx`
- Create: `src/app/taxi/page.tsx`
- Create: `src/app/taxi/globals.css`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Nothing (foundation task)
- Produces: Route group `taxi/` with its own layout, landing page placeholder, CSS variables for Taxi Control design system

- [ ] **Step 1: Add Taxi Control CSS variables to globals.css**

Modify `src/app/globals.css` to add the Taxi Control palette alongside existing ExclusiveTour tokens:

```css
@theme {
  /* existing ExclusiveTour tokens... */
  
  /* Taxi Control tokens */
  --color-taxi-primary: #2563EB;
  --color-taxi-primary-dark: #1D4ED8;
  --color-taxi-success: #10B981;
  --color-taxi-warning: #F59E0B;
  --color-taxi-gray-900: #111827;
  --color-taxi-gray-500: #6B7280;
  --color-taxi-gray-200: #E5E7EB;
  --color-taxi-gray-50: #F9FAFB;
}
```

- [ ] **Step 2: Create Taxi Control layout with Inter font**

Create `src/app/taxi/layout.tsx`:

```tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Taxi Control | Controle de corridas",
  description:
    "Registre corridas, controle investimentos e acompanhe suas metas.",
  metadataBase: new URL("https://exclusivetourbh.com.br"),
  openGraph: {
    title: "Taxi Control — Controle de corridas",
    description: "Registre corridas, controle investimentos e acompanhe suas metas.",
    locale: "pt_BR",
    type: "website",
  },
}

export default function TaxiLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable}`}>
      <body className="font-inter bg-white text-taxi-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Create Taxi Control landing placeholder**

Create `src/app/taxi/page.tsx`:

```tsx
export default function TaxiLanding() {
  return (
    <main className="min-h-screen">
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-bold text-taxi-gray-900">Taxi Control</h1>
        <p className="mt-4 text-lg text-taxi-gray-500">Controle de corridas e investimentos</p>
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Create utility directories**

Create folder structure:
```
src/app/taxi/
  corridas/
  investimento/
  metas/
  config/
  auth/
  components/
  lib/
```

```bash
mkdir -p src/app/taxi/corridas src/app/taxi/investimento src/app/taxi/metas src/app/taxi/config src/app/taxi/auth src/app/taxi/components src/app/taxi/lib
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds, `out/taxi/index.html` is generated.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(taxi): project structure and design system"
```

---

### Task 2: Supabase Client & Database Schema

**Files:**
- Create: `src/app/taxi/lib/supabase.ts`
- Create: `src/app/taxi/lib/db-schema.sql`
- Create: `src/app/taxi/lib/types.ts`

**Interfaces:**
- Consumes: task 1
- Produces: Supabase client singleton, TypeScript types, SQL schema for all app tables

- [ ] **Step 1: Create Supabase client**

Create `src/app/taxi/lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 2: Create database schema**

Create `src/app/taxi/lib/db-schema.sql`:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('admin', 'driver')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rides table
CREATE TABLE rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('own', 'passed')),
  category TEXT NOT NULL CHECK (category IN ('app', 'taximeter', 'cooperative', 'private', 'invoiced')),
  value DECIMAL(10,2) NOT NULL,
  commission DECIMAL(10,2),
  driver_name TEXT,
  passenger_name TEXT,
  dispatcher_name TEXT,
  start_location TEXT,
  end_location TEXT,
  ride_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fuel table
CREATE TABLE fuel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  fuel_date TIMESTAMP WITH TIME ZONE NOT NULL,
  liters DECIMAL(10,2),
  total_value DECIMAL(10,2) NOT NULL,
  km_start DECIMAL(10,2),
  km_end DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fuel price table
CREATE TABLE fuel_price (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_liter DECIMAL(10,2) NOT NULL,
  recorded_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_goal DECIMAL(10,2) NOT NULL DEFAULT 0,
  weekly_goal DECIMAL(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_price ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin can view all users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Rides policies
CREATE POLICY "Drivers can view own rides" ON rides
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all rides" ON rides
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Drivers can insert own rides" ON rides
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can update own rides" ON rides
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Drivers can delete own rides" ON rides
  FOR DELETE USING (auth.uid() = user_id);

-- Fuel policies
CREATE POLICY "Drivers can view own fuel" ON fuel
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all fuel" ON fuel
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Drivers can insert own fuel" ON fuel
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can update own fuel" ON fuel
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Drivers can delete own fuel" ON fuel
  FOR DELETE USING (auth.uid() = user_id);

-- Fuel price policies (everyone can view, admin can manage)
CREATE POLICY "Anyone can view fuel prices" ON fuel_price
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert fuel prices" ON fuel_price
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Goals policies (everyone can view, admin can manage)
CREATE POLICY "Anyone can view goals" ON goals
  FOR SELECT USING (true);

CREATE POLICY "Admin can update goals" ON goals
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can insert goals" ON goals
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

- [ ] **Step 3: Create TypeScript types**

Create `src/app/taxi/lib/types.ts`:

```typescript
export interface User {
  id: string
  email: string
  nome: string
  role: "admin" | "driver"
  created_at: string
}

export interface Ride {
  id: string
  user_id: string
  type: "own" | "passed"
  category: "app" | "taximeter" | "cooperative" | "private" | "invoiced"
  value: number
  commission?: number
  driver_name?: string
  passenger_name?: string
  dispatcher_name?: string
  start_location?: string
  end_location?: string
  ride_date: string
  created_at: string
}

export interface Fuel {
  id: string
  user_id: string
  fuel_date: string
  liters?: number
  total_value: number
  km_start?: number
  km_end?: number
  created_at: string
}

export interface FuelPrice {
  id: string
  price_per_liter: number
  recorded_date: string
  created_at: string
}

export interface Goal {
  id: string
  daily_goal: number
  weekly_goal: number
  updated_at: string
}

export type RideCategory = "app" | "taximeter" | "cooperative" | "private" | "invoiced"
export type RideType = "own" | "passed"
```

- [ ] **Step 4: Add Supabase dependency**

Run: `npm install @supabase/supabase-js`

- [ ] **Step 5: Create .env.local template**

Create `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(taxi): supabase client, types, and schema"
```

---

### Task 3: Auth Context & Login Page

**Files:**
- Create: `src/app/taxi/lib/auth-context.tsx`
- Create: `src/app/taxi/auth/page.tsx`

**Interfaces:**
- Consumes: task 2 (supabase client, types)
- Produces: AuthProvider, useAuth hook, login page

- [ ] **Step 1: Create auth context**

Create `src/app/taxi/lib/auth-context.tsx`:

```tsx
"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "./supabase"
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(userId: string) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()

    setUser(data)
    setLoading(false)
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return {}
  }

  async function signOut() {
    await supabase.auth.signOut()
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
```

- [ ] **Step 2: Create login page**

Create `src/app/taxi/auth/page.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useAuth } from "../lib/auth-context"
import { useRouter } from "next/navigation"

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
        <h1 className="text-2xl font-bold text-center mb-8">Taxi Control</h1>
        
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
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(taxi): auth context and login page"
```

---

### Task 4: Layout with Tabs & Navigation

**Files:**
- Create: `src/app/taxi/components/BottomNav.tsx`
- Create: `src/app/taxi/components/Header.tsx`
- Modify: `src/app/taxi/layout.tsx`

**Interfaces:**
- Consumes: task 3 (auth context)
- Produces: Bottom navigation component, header with user info

- [ ] **Step 1: Create bottom navigation component**

Create `src/app/taxi/components/BottomNav.tsx`:

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { href: "/taxi/corridas", label: "Corridas", icon: "🚗" },
  { href: "/taxi/investimento", label: "Investimento", icon: "💰" },
  { href: "/taxi/metas", label: "Metas", icon: "🎯" },
  { href: "/taxi/config", label: "Config", icon: "⚙️" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-taxi-gray-200 px-4 py-2">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center py-2 px-3 rounded-lg ${
              pathname === item.href
                ? "text-taxi-primary"
                : "text-taxi-gray-500"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Create header component**

Create `src/app/taxi/components/Header.tsx`:

```tsx
"use client"

import { useAuth } from "../lib/auth-context"

export function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="sticky top-0 bg-white border-b border-taxi-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">Taxi Control</h1>
          {user && (
            <p className="text-xs text-taxi-gray-500">{user.nome}</p>
          )}
        </div>
        <button
          onClick={signOut}
          className="text-sm text-taxi-gray-500 hover:text-taxi-gray-900"
        >
          Sair
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Update layout with auth protection and navigation**

Modify `src/app/taxi/layout.tsx`:

```tsx
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
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(taxi): layout with tabs and navigation"
```

---

### Task 5: Rides Page

**Files:**
- Create: `src/app/taxi/corridas/page.tsx`
- Create: `src/app/taxi/components/RideForm.tsx`
- Create: `src/app/taxi/components/RideList.tsx`

**Interfaces:**
- Consumes: tasks 2, 3 (supabase, types, auth)
- Produces: Rides page with form and list

- [ ] **Step 1: Create ride form component**

Create `src/app/taxi/components/RideForm.tsx`:

```tsx
"use client"

import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import type { RideCategory, RideType } from "../lib/types"

interface RideFormProps {
  onSuccess: () => void
}

export function RideForm({ onSuccess }: RideFormProps) {
  const { user } = useAuth()
  const [type, setType] = useState<RideType>("own")
  const [category, setCategory] = useState<RideCategory>("app")
  const [value, setValue] = useState("")
  const [commission, setCommission] = useState("")
  const [driverName, setDriverName] = useState("")
  const [passengerName, setPassengerName] = useState("")
  const [dispatcherName, setDispatcherName] = useState("")
  const [startLocation, setStartLocation] = useState("")
  const [endLocation, setEndLocation] = useState("")
  const [loading, setLoading] = useState(false)

  const showLocations = ["cooperative", "private", "invoiced", "passed"].includes(category)
  const showCommission = type === "passed"
  const showDispatcher = category === "cooperative"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    const { error } = await supabase.from("rides").insert({
      user_id: user.id,
      type,
      category,
      value: parseFloat(value),
      commission: showCommission && commission ? parseFloat(commission) : null,
      driver_name: showCommission ? driverName : null,
      passenger_name: passengerName || null,
      dispatcher_name: showDispatcher ? dispatcherName : null,
      start_location: showLocations ? startLocation : null,
      end_location: showLocations ? endLocation : null,
      ride_date: new Date().toISOString(),
    })

    setLoading(false)

    if (!error) {
      onSuccess()
      resetForm()
    }
  }

  function resetForm() {
    setType("own")
    setCategory("app")
    setValue("")
    setCommission("")
    setDriverName("")
    setPassengerName("")
    setDispatcherName("")
    setStartLocation("")
    setEndLocation("")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-taxi-gray-50 rounded-xl">
      <h3 className="font-semibold">Nova Corrida</h3>
      
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("own")}
          className={`flex-1 py-2 rounded-lg ${
            type === "own" ? "bg-taxi-primary text-white" : "bg-white border border-taxi-gray-200"
          }`}
        >
          Própria
        </button>
        <button
          type="button"
          onClick={() => setType("passed")}
          className={`flex-1 py-2 rounded-lg ${
            type === "passed" ? "bg-taxi-primary text-white" : "bg-white border border-taxi-gray-200"
          }`}
        >
          Passada
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Categoria</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as RideCategory)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
        >
          <option value="app">App (Uber, 99, InDrive)</option>
          <option value="taximeter">Taxímetro</option>
          <option value="cooperative">Cooperativa</option>
          <option value="private">Particular</option>
          <option value="invoiced">Faturado</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Valor (R$)</label>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          required
        />
      </div>

      {showCommission && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Motorista</label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Valor Motorista (R$)</label>
            <input
              type="number"
              step="0.01"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
              required
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Passageiro (opcional)</label>
        <input
          type="text"
          value={passengerName}
          onChange={(e) => setPassengerName(e.target.value)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
        />
      </div>

      {showDispatcher && (
        <div>
          <label className="block text-sm font-medium mb-1">Quem mandou a corrida</label>
          <input
            type="text"
            value={dispatcherName}
            onChange={(e) => setDispatcherName(e.target.value)}
            className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          />
        </div>
      )}

      {showLocations && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Início</label>
            <input
              type="text"
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
              className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Destino</label>
            <input
              type="text"
              value={endLocation}
              onChange={(e) => setEndLocation(e.target.value)}
              className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
            />
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar"}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Create ride list component**

Create `src/app/taxi/components/RideList.tsx`:

```tsx
"use client"

import type { Ride } from "../lib/types"

interface RideListProps {
  rides: Ride[]
  onDelete: (id: string) => void
}

export function RideList({ rides, onDelete }: RideListProps) {
  if (rides.length === 0) {
    return (
      <p className="text-center text-taxi-gray-500 py-8">
        Nenhuma corrida registrada hoje.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {rides.map((ride) => (
        <div
          key={ride.id}
          className="p-4 bg-white border border-taxi-gray-200 rounded-xl"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{ride.category}</span>
                <span className="text-xs text-taxi-gray-500">
                  {ride.type === "own" ? "Própria" : "Passada"}
                </span>
              </div>
              {ride.start_location && ride.end_location && (
                <p className="text-sm text-taxi-gray-500 mt-1">
                  {ride.start_location} → {ride.end_location}
                </p>
              )}
              {ride.passenger_name && (
                <p className="text-sm text-taxi-gray-500">
                  Passageiro: {ride.passenger_name}
                </p>
              )}
              {ride.driver_name && (
                <p className="text-sm text-taxi-gray-500">
                  Motorista: {ride.driver_name}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold text-taxi-success">
                R$ {ride.value.toFixed(2)}
              </p>
              {ride.commission && (
                <p className="text-xs text-taxi-gray-500">
                  Comissão: R$ {ride.commission.toFixed(2)}
                </p>
              )}
              <button
                onClick={() => onDelete(ride.id)}
                className="text-xs text-red-500 mt-2"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create rides page**

Create `src/app/taxi/corridas/page.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { RideForm } from "../components/RideForm"
import { RideList } from "../components/RideList"
import type { Ride } from "../lib/types"

export default function RidesPage() {
  const { user } = useAuth()
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchRides()
    }
  }, [user])

  async function fetchRides() {
    if (!user) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from("rides")
      .select("*")
      .eq("user_id", user.id)
      .gte("ride_date", today.toISOString())
      .order("ride_date", { ascending: false })

    setRides(data || [])
    setLoading(false)
  }

  async function handleDelete(id: string) {
    await supabase.from("rides").delete().eq("id", id)
    fetchRides()
  }

  const totalValue = rides.reduce((sum, ride) => sum + ride.value, 0)

  return (
    <main className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Corridas de Hoje</h2>
        <div className="p-4 bg-taxi-gray-50 rounded-xl">
          <p className="text-sm text-taxi-gray-500">Total</p>
          <p className="text-2xl font-bold text-taxi-success">
            R$ {totalValue.toFixed(2)}
          </p>
        </div>
      </div>

      <RideForm onSuccess={fetchRides} />

      <div className="mt-6">
        {loading ? (
          <p className="text-center text-taxi-gray-500">Carregando...</p>
        ) : (
          <RideList rides={rides} onDelete={handleDelete} />
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(taxi): rides page with form and list"
```

---

### Task 6: Investment Page

**Files:**
- Create: `src/app/taxi/investimento/page.tsx`
- Create: `src/app/taxi/components/FuelForm.tsx`
- Create: `src/app/taxi/components/FuelPriceForm.tsx`
- Create: `src/app/taxi/components/KmTracker.tsx`

**Interfaces:**
- Consumes: tasks 2, 3 (supabase, types, auth)
- Produces: Investment page with fuel, price, and km tracking

- [ ] **Step 1: Create fuel form component**

Create `src/app/taxi/components/FuelForm.tsx`:

```tsx
"use client"

import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"

interface FuelFormProps {
  onSuccess: () => void
}

export function FuelForm({ onSuccess }: FuelFormProps) {
  const { user } = useAuth()
  const [liters, setLiters] = useState("")
  const [totalValue, setTotalValue] = useState("")
  const [kmStart, setKmStart] = useState("")
  const [kmEnd, setKmEnd] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    const { error } = await supabase.from("fuel").insert({
      user_id: user.id,
      fuel_date: new Date().toISOString(),
      liters: liters ? parseFloat(liters) : null,
      total_value: parseFloat(totalValue),
      km_start: kmStart ? parseFloat(kmStart) : null,
      km_end: kmEnd ? parseFloat(kmEnd) : null,
    })

    setLoading(false)

    if (!error) {
      onSuccess()
      resetForm()
    }
  }

  function resetForm() {
    setLiters("")
    setTotalValue("")
    setKmStart("")
    setKmEnd("")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-taxi-gray-50 rounded-xl">
      <h3 className="font-semibold">Registrar Combustível</h3>
      
      <div>
        <label className="block text-sm font-medium mb-1">Valor Total (R$)</label>
        <input
          type="number"
          step="0.01"
          value={totalValue}
          onChange={(e) => setTotalValue(e.target.value)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Litros (opcional)</label>
        <input
          type="number"
          step="0.01"
          value={liters}
          onChange={(e) => setLiters(e.target.value)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">KM Início</label>
          <input
            type="number"
            step="0.01"
            value={kmStart}
            onChange={(e) => setKmStart(e.target.value)}
            className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
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
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar"}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Create fuel price form component**

Create `src/app/taxi/components/FuelPriceForm.tsx`:

```tsx
"use client"

import { useState } from "react"
import { supabase } from "../lib/supabase"

interface FuelPriceFormProps {
  onSuccess: () => void
}

export function FuelPriceForm({ onSuccess }: FuelPriceFormProps) {
  const [pricePerLiter, setPricePerLiter] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.from("fuel_price").insert({
      price_per_liter: parseFloat(pricePerLiter),
      recorded_date: new Date().toISOString(),
    })

    setLoading(false)

    if (!error) {
      onSuccess()
      setPricePerLiter("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-taxi-gray-50 rounded-xl">
      <h3 className="font-semibold">Preço do Combustível</h3>
      
      <div>
        <label className="block text-sm font-medium mb-1">Preço por Litro (R$)</label>
        <input
          type="number"
          step="0.01"
          value={pricePerLiter}
          onChange={(e) => setPricePerLiter(e.target.value)}
          className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar"}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Create km tracker component**

Create `src/app/taxi/components/KmTracker.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"

export function KmTracker() {
  const { user } = useAuth()
  const [todayFuel, setTodayFuel] = useState<any>(null)

  useEffect(() => {
    if (user) {
      fetchTodayFuel()
    }
  }, [user])

  async function fetchTodayFuel() {
    if (!user) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from("fuel")
      .select("*")
      .eq("user_id", user.id)
      .gte("fuel_date", today.toISOString())
      .order("fuel_date", { ascending: false })
      .limit(1)
      .single()

    setTodayFuel(data)
  }

  if (!todayFuel) {
    return null
  }

  const kmRodados = todayFuel.km_end && todayFuel.km_start
    ? todayFuel.km_end - todayFuel.km_start
    : null

  const consumo = kmRodados && todayFuel.liters
    ? (todayFuel.liters / kmRodados).toFixed(2)
    : null

  return (
    <div className="p-4 bg-taxi-gray-50 rounded-xl">
      <h3 className="font-semibold mb-2">KM do Dia</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-taxi-gray-500">KM Início</p>
          <p className="font-medium">{todayFuel.km_start || "-"}</p>
        </div>
        <div>
          <p className="text-taxi-gray-500">KM Fim</p>
          <p className="font-medium">{todayFuel.km_end || "-"}</p>
        </div>
        <div>
          <p className="text-taxi-gray-500">KM Rodados</p>
          <p className="font-medium">{kmRodados || "-"}</p>
        </div>
        <div>
          <p className="text-taxi-gray-500">Consumo (L/km)</p>
          <p className="font-medium">{consumo || "-"}</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create investment page**

Create `src/app/taxi/investimento/page.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { FuelForm } from "../components/FuelForm"
import { FuelPriceForm } from "../components/FuelPriceForm"
import { KmTracker } from "../components/KmTracker"
import type { Fuel } from "../lib/types"

export default function InvestmentPage() {
  const { user } = useAuth()
  const [totalSaved, setTotalSaved] = useState(0)
  const [recentFuel, setRecentFuel] = useState<Fuel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  async function fetchData() {
    if (!user) return

    // Fetch rides for 10% savings
    const { data: rides } = await supabase
      .from("rides")
      .select("value")
      .eq("user_id", user.id)
      .eq("type", "own")

    const total = rides?.reduce((sum, ride) => sum + ride.value * 0.1, 0) || 0
    setTotalSaved(total)

    // Fetch recent fuel
    const { data: fuel } = await supabase
      .from("fuel")
      .select("*")
      .eq("user_id", user.id)
      .order("fuel_date", { ascending: false })
      .limit(5)

    setRecentFuel(fuel || [])
    setLoading(false)
  }

  return (
    <main className="p-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Investimento</h2>
        <div className="p-4 bg-taxi-gray-50 rounded-xl">
          <p className="text-sm text-taxi-gray-500">Total Guardado (10%)</p>
          <p className="text-2xl font-bold text-taxi-success">
            R$ {totalSaved.toFixed(2)}
          </p>
        </div>
      </div>

      <KmTracker />

      <div className="mt-6 space-y-4">
        <FuelForm onSuccess={fetchData} />
        <FuelPriceForm onSuccess={fetchData} />
      </div>

      {recentFuel.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-3">Últimos Registros</h3>
          <div className="space-y-2">
            {recentFuel.map((fuel) => (
              <div
                key={fuel.id}
                className="p-3 bg-white border border-taxi-gray-200 rounded-xl text-sm"
              >
                <p className="font-medium">
                  R$ {fuel.total_value.toFixed(2)}
                  {fuel.liters && ` • ${fuel.liters}L`}
                </p>
                <p className="text-taxi-gray-500">
                  {new Date(fuel.fuel_date).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(taxi): investment page with fuel and km tracking"
```

---

### Task 7: Goals Page

**Files:**
- Create: `src/app/taxi/metas/page.tsx`
- Create: `src/app/taxi/components/GoalForm.tsx`
- Create: `src/app/taxi/components/ProgressBar.tsx`

**Interfaces:**
- Consumes: tasks 2, 3 (supabase, types, auth)
- Produces: Goals page with progress bars and admin form

- [ ] **Step 1: Create progress bar component**

Create `src/app/taxi/components/ProgressBar.tsx`:

```tsx
interface ProgressBarProps {
  current: number
  goal: number
  label: string
}

export function ProgressBar({ current, goal, label }: ProgressBarProps) {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0

  return (
    <div className="p-4 bg-taxi-gray-50 rounded-xl">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-taxi-gray-500">
          {percentage.toFixed(0)}%
        </p>
      </div>
      <div className="w-full h-3 bg-taxi-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-taxi-success transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-sm">
        <p className="text-taxi-gray-500">
          R$ {current.toFixed(2)}
        </p>
        <p className="text-taxi-gray-500">
          Meta: R$ {goal.toFixed(2)}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create goal form component (admin only)**

Create `src/app/taxi/components/GoalForm.tsx`:

```tsx
"use client"

import { useState } from "react"
import { supabase } from "../lib/supabase"

interface GoalFormProps {
  currentGoals: { daily_goal: number; weekly_goal: number } | null
  onSuccess: () => void
}

export function GoalForm({ currentGoals, onSuccess }: GoalFormProps) {
  const [dailyGoal, setDailyGoal] = useState(
    currentGoals?.daily_goal?.toString() || ""
  )
  const [weeklyGoal, setWeeklyGoal] = useState(
    currentGoals?.weekly_goal?.toString() || ""
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (currentGoals) {
      await supabase
        .from("goals")
        .update({
          daily_goal: parseFloat(dailyGoal),
          weekly_goal: parseFloat(weeklyGoal),
          updated_at: new Date().toISOString(),
        })
        .eq("id", "1")
    } else {
      await supabase.from("goals").insert({
        id: "1",
        daily_goal: parseFloat(dailyGoal),
        weekly_goal: parseFloat(weeklyGoal),
      })
    }

    setLoading(false)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-taxi-gray-50 rounded-xl">
      <h3 className="font-semibold">Definir Metas</h3>
      
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

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark disabled:opacity-50"
      >
        {loading ? "Salvando..." : "Salvar Metas"}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Create goals page**

Create `src/app/taxi/metas/page.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { ProgressBar } from "../components/ProgressBar"
import { GoalForm } from "../components/GoalForm"
import type { Goal } from "../lib/types"

export default function GoalsPage() {
  const { user } = useAuth()
  const [goals, setGoals] = useState<Goal | null>(null)
  const [todayEarnings, setTodayEarnings] = useState(0)
  const [weekEarnings, setWeekEarnings] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  async function fetchData() {
    if (!user) return

    // Fetch goals
    const { data: goalsData } = await supabase
      .from("goals")
      .select("*")
      .limit(1)
      .single()

    setGoals(goalsData)

    // Fetch today earnings
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: todayRides } = await supabase
      .from("rides")
      .select("value")
      .eq("user_id", user.id)
      .eq("type", "own")
      .gte("ride_date", today.toISOString())

    const todayTotal = todayRides?.reduce((sum, ride) => sum + ride.value, 0) || 0
    setTodayEarnings(todayTotal)

    // Fetch week earnings
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const { data: weekRides } = await supabase
      .from("rides")
      .select("value")
      .eq("user_id", user.id)
      .eq("type", "own")
      .gte("ride_date", weekStart.toISOString())

    const weekTotal = weekRides?.reduce((sum, ride) => sum + ride.value, 0) || 0
    setWeekEarnings(weekTotal)

    setLoading(false)
  }

  if (loading) {
    return (
      <main className="p-4">
        <p className="text-center text-taxi-gray-500">Carregando...</p>
      </main>
    )
  }

  return (
    <main className="p-4">
      <h2 className="text-xl font-bold mb-6">Metas</h2>

      <div className="space-y-4">
        <ProgressBar
          current={todayEarnings}
          goal={goals?.daily_goal || 0}
          label="Meta Diária"
        />
        <ProgressBar
          current={weekEarnings}
          goal={goals?.weekly_goal || 0}
          label="Meta Semanal"
        />
      </div>

      {user?.role === "admin" && (
        <div className="mt-6">
          <GoalForm currentGoals={goals} onSuccess={fetchData} />
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(taxi): goals page with progress bars"
```

---

### Task 8: Settings Page

**Files:**
- Create: `src/app/taxi/config/page.tsx`

**Interfaces:**
- Consumes: tasks 2, 3 (supabase, types, auth)
- Produces: Settings page with profile and logout

- [ ] **Step 1: Create settings page**

Create `src/app/taxi/config/page.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useAuth } from "../lib/auth-context"
import { supabase } from "../lib/supabase"

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

    await supabase
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(taxi): settings page with profile and logout"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Project structure & design system | layout, page, globals.css |
| 2 | Supabase client & database schema | supabase.ts, db-schema.sql, types.ts |
| 3 | Auth context & login page | auth-context.tsx, auth/page.tsx |
| 4 | Layout with tabs & navigation | BottomNav.tsx, Header.tsx, layout.tsx |
| 5 | Rides page | corridas/page.tsx, RideForm.tsx, RideList.tsx |
| 6 | Investment page | investimento/page.tsx, FuelForm.tsx, FuelPriceForm.tsx, KmTracker.tsx |
| 7 | Goals page | metas/page.tsx, GoalForm.tsx, ProgressBar.tsx |
| 8 | Settings page | config/page.tsx |

---

## Next Steps

After completing all tasks:

1. **Setup Supabase project** — Create tables using the SQL schema
2. **Configure environment variables** — Add `.env.local` with Supabase credentials
3. **Create admin user** — Insert first user with `role = 'admin'` in Supabase
4. **Test the app** — Run `npm run dev` and test all features
5. **Deploy** — Build and upload to HostGator
