# Serena — Mindfulness App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PWA mindfulness app (Serena) for women 40-55 with meditation, breathing, content trilhas, journaling, and WhatsApp/Lastlink integration.

**Architecture:** Next.js 16 static export PWA alongside existing ExclusiveTour BH site. Routes under `/serena/*`. All data fetched client-side via Supabase (auth, DB, storage). Payments via Lastlink webhooks. Audio generated via ElevenLabs TTS.

**Tech Stack:** Next.js 16.2.9 (static export), Tailwind CSS v4, React 19.2, Supabase, Lastlink, ElevenLabs, Nunito font

## Global Constraints

- Static export only (`output: "export"`) — no server actions, no SSR for protected routes, no cookies/headers
- All browser APIs (`window`, `localStorage`, `navigator`) only in `useEffect` or client components
- Route params are Promises — must `await` everywhere
- Turbopack as default bundler (no custom webpack)
- `next lint` removed — use `eslint` directly
- Nunito font via Google Fonts
- Design tokens from spec: Folha `#8CAF8C`, Florescer `#D4A5A5`, Terra `#6B5E4A`, Névoa `#F5F2ED`, Branco `#FFFFFF`, Marrom `#3D322B`, CTA `#9B7B6B`

---

### Task 1: Project Structure & Design System

**Files:**
- Create: `src/app/serena/layout.tsx`
- Create: `src/app/serena/page.tsx`
- Create: `src/app/serena/globals.css`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Nothing (foundation task)
- Produces: Route group `serena/` with its own layout, landing page placeholder, CSS variables for Serena design system

- [ ] **Step 1: Add Serena CSS variables to globals.css**

Modify `src/app/globals.css` to add the Serena palette alongside existing ExclusiveTour tokens:

```css
@theme {
  /* existing ExclusiveTour tokens... */
  
  /* Serena tokens */
  --color-folha: #8CAF8C;
  --color-florescer: #D4A5A5;
  --color-terra: #6B5E4A;
  --color-nevoa: #F5F2ED;
  --color-branco: #FFFFFF;
  --color-marrom: #3D322B;
  --color-cta: #9B7B6B;
  --color-marrom-soft: #5A4E40;
}
```

- [ ] **Step 2: Create Serena layout with Nunito font**

Create `src/app/serena/layout.tsx`:

```tsx
import type { Metadata } from "next"
import { Nunito } from "next/font/google"

const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
})

export const metadata: Metadata = {
  title: "Serena | Mindfulness para o seu dia",
  description:
    "5 minutos por dia para você recarregar. Meditação guiada, respiração, journaling e conteúdo de mindfulness para mulheres.",
  metadataBase: new URL("https://exclusivetourbh.com.br"),
  openGraph: {
    title: "Serena — Mindfulness para o seu dia",
    description: "5 minutos por dia para você recarregar. Meditação guiada, respiração e mais.",
    locale: "pt_BR",
    type: "website",
  },
}

export default function SerenaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${nunito.variable}`}>
      <body className="font-nunito bg-white text-marrom antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Create Serena landing placeholder**

Create `src/app/serena/page.tsx`:

```tsx
export default function SerenaLanding() {
  return (
    <main className="min-h-screen">
      <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-bold text-terra">Em breve</h1>
        <p className="mt-4 text-lg text-marrom">Serena — seu momento de paz</p>
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Create utility components directory**

Create folder structure:
```
src/app/serena/
  app/           (PWA pages — auth required)
  components/    (Serena-specific shared components)
  lib/           (Supabase client, utils)
```

```bash
mkdir -p src/app/serena/app src/app/serena/components src/app/serena/lib
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds, `out/serena/index.html` is generated.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(serena): project structure and design system"
```

---

### Task 2: Supabase Client & Database Schema

**Files:**
- Create: `src/app/serena/lib/supabase.ts`
- Create: `src/app/serena/lib/db-schema.sql`
- Create: `src/app/serena/lib/types.ts`

**Interfaces:**
- Consumes: task 1
- Produces: Supabase client singleton, TypeScript types, SQL schema for all app tables

- [ ] **Step 1: Define TypeScript types**

Create `src/app/serena/lib/types.ts`:

```ts
export interface UserProfile {
  id: string
  email: string
  name: string
  moment_do_dia: "morning" | "afternoon" | "night" | null
  onboarded: boolean
  trial_ends_at: string | null
  is_subscribed: boolean
  created_at: string
}

export interface Meditation {
  id: string
  title: string
  description: string
  category: "morning" | "pause" | "night"
  duration_min: number
  audio_url: string
  image_url: string | null
  sort_order: number
  active: boolean
}

export interface BreathingExercise {
  id: string
  name: string
  description: string
  pattern_name: "box" | "478" | "diaphragmatic"
  duration_min: number
  sort_order: number
}

export interface Trilha {
  id: string
  title: string
  description: string
  image_url: string | null
  sort_order: number
}

export interface TrilhaAula {
  id: string
  trilha_id: string
  title: string
  content_md: string
  audio_url: string | null
  sort_order: number
}

export interface UserTrilhaProgress {
  id: string
  user_id: string
  trilha_id: string
  completed_aulas: number
  total_aulas: number
  completed: boolean
}

export interface JournalEntry {
  id: string
  user_id: string
  prompt: string
  content: string
  created_at: string
}

export interface UserMeditationLog {
  id: string
  user_id: string
  meditation_id: string
  completed_at: string
  duration_seconds: number
}
```

- [ ] **Step 2: Create Supabase client**

Create `src/app/serena/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Add `.env.local` variables (document in README or a separate `.env.example`):
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 3: Create SQL schema**

Create `src/app/serena/lib/db-schema.sql` (for reference / manual Supabase setup):

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  moment_do_dia TEXT CHECK (moment_do_dia IN ('morning', 'afternoon', 'night')),
  onboarded BOOLEAN DEFAULT FALSE,
  trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  is_subscribed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meditations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('morning', 'pause', 'night')),
  duration_min INTEGER NOT NULL,
  audio_url TEXT NOT NULL,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE breathing_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  pattern_name TEXT NOT NULL CHECK (pattern_name IN ('box', '478', 'diaphragmatic')),
  duration_min INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE trilhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE trilha_aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trilha_id UUID NOT NULL REFERENCES trilhas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_md TEXT NOT NULL,
  audio_url TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE user_trilha_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  trilha_id UUID NOT NULL REFERENCES trilhas(id) ON DELETE CASCADE,
  completed_aulas INTEGER DEFAULT 0,
  total_aulas INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, trilha_id)
);

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_meditation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  meditation_id UUID NOT NULL REFERENCES meditations(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds INTEGER NOT NULL
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trilha_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_meditation_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = id);
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(serena): supabase client, types, and schema"
```

---

### Task 3: PWA Manifest & Service Worker

**Files:**
- Create: `src/app/serena/manifest.ts`
- Create: `public/serena-sw.js`
- Modify: `src/app/serena/layout.tsx`

**Interfaces:**
- Consumes: task 1
- Produces: PWA manifest, service worker registration

- [ ] **Step 1: Create manifest**

Create `src/app/serena/manifest.ts`:

```ts
import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Serena — Mindfulness para o seu dia",
    short_name: "Serena",
    description: "5 minutos por dia para você recarregar",
    start_url: "/serena/app",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#8CAF8C",
    icons: [
      { src: "/serena/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/serena/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
```

- [ ] **Step 2: Create service worker**

Create `public/serena-sw.js`:

```js
const CACHE = "serena-v1"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        "/serena/app",
        "/serena/app/meditar",
        "/serena/app/trilhas",
      ])
    )
  )
})

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()))
        }
        return response
      })
      return cached || fetchPromise
    })
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
})
```

- [ ] **Step 3: Register service worker in layout**

Add to `src/app/serena/layout.tsx` inside `<body>`:

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/serena-sw.js', {
          scope: '/serena/',
          updateViaCache: 'none'
        })
      }
    `,
  }}
/>
```

- [ ] **Step 4: Generate placeholder icons**

```bash
mkdir -p public/serena
# Create simple SVG placeholder icons (replace with real icons later)
cat > public/serena/icon-192.png << 'EOF'
# Placeholder — replace with real icon
EOF
```

Note: Actual icons should be designed and exported. For now create minimal 1x1 pixel PNGs using a script or external tool.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds, manifest is generated at `/serena/manifest.webmanifest`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(serena): PWA manifest and service worker"
```

---

### Task 4: Authentication (Sign Up / Login)

**Files:**
- Create: `src/app/serena/app/layout.tsx`
- Create: `src/app/serena/app/page.tsx`
- Create: `src/app/serena/components/AuthForm.tsx`
- Create: `src/app/serena/lib/auth-context.tsx`
- Create: `src/app/serena/app/auth/page.tsx`

**Interfaces:**
- Consumes: tasks 1, 2
- Produces: Auth flow (signup/login), auth context provider, protected app layout

- [ ] **Step 1: Create auth context**

Create `src/app/serena/lib/auth-context.tsx`:

```tsx
"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase } from "./supabase"
import type { User } from "@supabase/supabase-js"
import type { UserProfile } from "./types"

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, name: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single()
    setProfile(data)
  }

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  async function signUp(email: string, password: string, name: string): Promise<string | null> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) return error.message

    if (data.user) {
      await supabase.from("user_profiles").insert({
        id: data.user.id,
        email,
        name,
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
    }
    return null
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
```

- [ ] **Step 2: Create AuthForm component**

Create `src/app/serena/components/AuthForm.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useAuth } from "@/app/serena/lib/auth-context"
import { useRouter } from "next/navigation"

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const err = isLogin
      ? await signIn(email, password)
      : await signUp(email, password, name)

    if (err) {
      setError(err)
      setLoading(false)
    } else {
      router.push("/serena/app/onboarding")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm mx-auto">
      <h2 className="text-2xl font-bold text-terra">
        {isLogin ? "Entrar" : "Criar conta"}
      </h2>
      <p className="text-sm text-marrom">
        {isLogin
          ? "Bem-vinda de volta"
          : "7 dias grátis — cancele quando quiser"}
      </p>

      {!isLogin && (
        <input
          type="text"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded-xl bg-nevoa px-4 py-3 text-marrom placeholder:text-marrom/50 outline-none focus:ring-2 focus:ring-folha"
        />
      )}

      <input
        type="email"
        placeholder="Seu email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="rounded-xl bg-nevoa px-4 py-3 text-marrom placeholder:text-marrom/50 outline-none focus:ring-2 focus:ring-folha"
      />

      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
        className="rounded-xl bg-nevoa px-4 py-3 text-marrom placeholder:text-marrom/50 outline-none focus:ring-2 focus:ring-folha"
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-cta px-6 py-3 font-semibold text-white transition hover:bg-marrom-soft disabled:opacity-50"
      >
        {loading ? "Aguarde..." : isLogin ? "Entrar" : "Começar grátis"}
      </button>

      <button
        type="button"
        onClick={() => setIsLogin(!isLogin)}
        className="text-sm text-folha underline"
      >
        {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
      </button>
    </form>
  )
}
```

- [ ] **Step 3: Create auth page**

Create `src/app/serena/app/auth/page.tsx`:

```tsx
import { AuthForm } from "@/app/serena/components/AuthForm"

export default function AuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <AuthForm />
    </div>
  )
}
```

- [ ] **Step 4: Create app layout with auth protection**

Create `src/app/serena/app/layout.tsx`:

```tsx
"use client"

import { AuthProvider, useAuth } from "@/app/serena/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, type ReactNode } from "react"

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user && pathname !== "/serena/app/auth") {
      router.push("/serena/app/auth")
    }
  }, [user, loading, router, pathname])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-folha" />
      </div>
    )
  }

  if (!user && pathname !== "/serena/app/auth") return null

  return <>{children}</>
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>{children}</AuthGuard>
    </AuthProvider>
  )
}
```

- [ ] **Step 5: Create app dashboard placeholder**

Create `src/app/serena/app/page.tsx`:

```tsx
"use client"

import { useAuth } from "@/app/serena/lib/auth-context"

export default function AppDashboard() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-2xl font-bold text-terra">Olá, {user?.user_metadata?.name ?? "bem-vinda"}</h1>
      <button onClick={signOut} className="mt-4 text-sm text-marrom underline">
        Sair
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds, app routes are generated.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(serena): authentication flow with Supabase"
```

---

### Task 5: Onboarding Flow

**Files:**
- Create: `src/app/serena/app/onboarding/page.tsx`
- Create: `src/app/serena/components/OnboardingScreen.tsx`

**Interfaces:**
- Consumes: tasks 2, 4 (useAuth, supabase client)
- Produces: Onboarding page that sets `moment_do_dia` and `onboarded = true`

- [ ] **Step 1: Create OnboardingScreen component**

Create `src/app/serena/components/OnboardingScreen.tsx`:

```tsx
"use client"

import { useState } from "react"
import { supabase } from "@/app/serena/lib/supabase"
import { useAuth } from "@/app/serena/lib/auth-context"
import { useRouter } from "next/navigation"

const momentos = [
  { id: "morning", label: "Manhã", emoji: "☀️", desc: "Começar o dia com calma" },
  { id: "afternoon", label: "Tarde", emoji: "🌤️", desc: "Uma pausa no meio do dia" },
  { id: "night", label: "Noite", emoji: "🌙", desc: "Relaxar antes de dormir" },
] as const

export function OnboardingScreen() {
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  async function handleContinue() {
    if (!selected || !user) return
    setSaving(true)

    await supabase
      .from("user_profiles")
      .update({ moment_do_dia: selected, onboarded: true })
      .eq("id", user.id)

    router.push("/serena/app")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-terra">Qual seu melhor momento?</h1>
        <p className="mt-2 text-marrom">Escolha quando você quer seus lembretes</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {momentos.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelected(m.id)}
            className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition ${
              selected === m.id
                ? "border-folha bg-folha/10"
                : "border-nevoa bg-nevoa hover:border-folha/50"
            }`}
          >
            <span className="text-2xl">{m.emoji}</span>
            <div>
              <p className="font-semibold text-terra">{m.label}</p>
              <p className="text-sm text-marrom">{m.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={handleContinue}
        disabled={!selected || saving}
        className="rounded-xl bg-cta px-8 py-3 font-semibold text-white transition hover:bg-marrom-soft disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Continuar"}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create onboarding page**

Create `src/app/serena/app/onboarding/page.tsx`:

```tsx
import { OnboardingScreen } from "@/app/serena/components/OnboardingScreen"

export default function OnboardingPage() {
  return <OnboardingScreen />
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(serena): onboarding flow"
```

---

### Task 6: Home Dashboard

**Files:**
- Create: `src/app/serena/components/HomeDashboard.tsx`
- Create: `src/app/serena/components/BottomNav.tsx`
- Create: `src/app/serena/components/DailyPrompt.tsx`
- Modify: `src/app/serena/app/page.tsx` (replace placeholder)
- Create: `src/app/serena/app/meditar/page.tsx`
- Create: `src/app/serena/app/trilhas/page.tsx`
- Create: `src/app/serena/app/perfil/page.tsx`

**Interfaces:**
- Consumes: tasks 4, 5 (auth, types, supabase)
- Produces: Full dashboard with greeting, CTA, quick options, trilhas progress, bottom nav

- [ ] **Step 1: Create BottomNav component**

Create `src/app/serena/components/BottomNav.tsx`:

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/serena/app", label: "Início", emoji: "🏠" },
  { href: "/serena/app/meditar", label: "Meditar", emoji: "🧘" },
  { href: "/serena/app/trilhas", label: "Trilhas", emoji: "📖" },
  { href: "/serena/app/perfil", label: "Perfil", emoji: "👤" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-nevoa bg-white px-4 py-3">
      {links.map((link) => {
        const active = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex flex-col items-center gap-1 text-xs ${
              active ? "text-terra font-semibold" : "text-cta"
            }`}
          >
            <span className="text-lg">{link.emoji}</span>
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Create DailyPrompt component**

Create `src/app/serena/components/DailyPrompt.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/app/serena/lib/supabase"
import { useAuth } from "@/app/serena/lib/auth-context"

const prompts = [
  "Como você está se sentindo agora?",
  "O que te trouxe paz hoje?",
  "Pelo que você é grata neste momento?",
  "O que você precisa deixar ir?",
  "Que palavras você gostaria de ouvir hoje?",
]

export function DailyPrompt() {
  const [prompt] = useState(() => prompts[new Date().getDate() % prompts.length])
  const [response, setResponse] = useState("")
  const [saved, setSaved] = useState(false)
  const { user } = useAuth()

  async function handleSave() {
    if (!user || !response.trim()) return
    await supabase.from("journal_entries").insert({
      user_id: user.id,
      prompt,
      content: response,
    })
    setSaved(true)
  }

  return (
    <div className="rounded-xl bg-folha p-4">
      <p className="text-sm text-white/80">📝 Journaling</p>
      <p className="mt-1 font-medium text-white">{prompt}</p>
      {!saved ? (
        <div className="mt-2 flex gap-2">
          <input
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Escreva aqui..."
            className="flex-1 rounded-lg bg-white/20 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none"
          />
          <button
            onClick={handleSave}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-folha"
          >
            Salvar
          </button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-white/70">✨ Salvo!</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create HomeDashboard component**

Create `src/app/serena/components/HomeDashboard.tsx`:

```tsx
"use client"

import { useAuth } from "@/app/serena/lib/auth-context"
import { DailyPrompt } from "./DailyPrompt"
import { useEffect, useState } from "react"
import { supabase } from "@/app/serena/lib/supabase"
import type { Trilha, UserTrilhaProgress } from "@/app/serena/lib/types"

export function HomeDashboard() {
  const { user, profile } = useAuth()
  const [trilhas, setTrilhas] = useState<(Trilha & { progress?: UserTrilhaProgress })[]>([])

  useEffect(() => {
    async function loadTrilhas() {
      const { data: all } = await supabase.from("trilhas").select("*").order("sort_order")
      if (!all) return

      const { data: progress } = await supabase
        .from("user_trilha_progress")
        .select("*")
        .eq("user_id", user?.id ?? "")

      const merged = all.map((t) => ({
        ...t,
        progress: progress?.find((p) => p.trilha_id === t.id),
      }))
      setTrilhas(merged)
    }
    loadTrilhas()
  }, [user])

  function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return "Bom dia"
    if (h < 18) return "Boa tarde"
    return "Boa noite"
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Header */}
      <div className="rounded-2xl bg-nevoa p-5">
        <h1 className="text-2xl font-bold text-terra">
          {getGreeting()}, {profile?.name?.split(" ")[0] ?? "bem-vinda"}
        </h1>
        <p className="mt-1 text-marrom">5 minutos para você recomeçar.</p>
      </div>

      {/* CTA */}
      <a
        href="/serena/app/meditar"
        className="flex items-center gap-3 rounded-2xl bg-cta p-5 text-white transition hover:bg-marrom-soft"
      >
        <span className="text-2xl">☀️</span>
        <div>
          <p className="font-semibold">Meditação da Manhã</p>
          <p className="text-sm text-white/70">5 minutos</p>
        </div>
      </a>

      {/* Quick Options */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-terra">Comece agora</p>

        <a
          href="/serena/app/meditar"
          className="flex items-center gap-3 rounded-xl bg-nevoa p-4"
        >
          <span className="text-lg">🌬️</span>
          <span className="text-marrom font-medium">Respiração Guiada</span>
          <span className="ml-auto text-sm text-cta">3 min</span>
        </a>

        <DailyPrompt />

        {trilhas.slice(0, 2).map((t) => (
          <a
            key={t.id}
            href="/serena/app/trilhas"
            className="flex items-center gap-3 rounded-xl bg-nevoa p-4"
          >
            <span className="text-sm text-folha">
              {"●".repeat(t.progress?.completed_aulas ?? 0)}
              {"○".repeat((t.progress?.total_aulas ?? 5) - (t.progress?.completed_aulas ?? 0))}
            </span>
            <span className="flex-1 text-marrom font-medium">{t.title}</span>
            <span className="text-sm text-cta">
              {t.progress?.completed_aulas ?? 0}/{t.progress?.total_aulas ?? 5}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update app dashboard page**

Replace content of `src/app/serena/app/page.tsx`:

```tsx
"use client"

import { useAuth } from "@/app/serena/lib/auth-context"
import { HomeDashboard } from "@/app/serena/components/HomeDashboard"
import { BottomNav } from "@/app/serena/components/BottomNav"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AppDashboard() {
  const { profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && profile && !profile.onboarded) {
      router.push("/serena/app/onboarding")
    }
  }, [profile, loading, router])

  if (loading || !profile) return null

  return (
    <div className="mx-auto max-w-md px-5 pt-6">
      <HomeDashboard />
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 5: Create placeholder pages**

Create `src/app/serena/app/meditar/page.tsx`:

```tsx
"use client"

import { BottomNav } from "@/app/serena/components/BottomNav"

export default function MeditarPage() {
  return (
    <div className="mx-auto max-w-md px-5 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-terra">Meditar</h1>
      <p className="mt-2 text-marrom">Em breve — meditações guiadas.</p>
      <BottomNav />
    </div>
  )
}
```

Create `src/app/serena/app/trilhas/page.tsx`:

```tsx
"use client"

import { BottomNav } from "@/app/serena/components/BottomNav"

export default function TrilhasPage() {
  return (
    <div className="mx-auto max-w-md px-5 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-terra">Trilhas</h1>
      <p className="mt-2 text-marrom">Em breve — trilhas de conteúdo.</p>
      <BottomNav />
    </div>
  )
}
```

Create `src/app/serena/app/perfil/page.tsx`:

```tsx
"use client"

import { useAuth } from "@/app/serena/lib/auth-context"
import { BottomNav } from "@/app/serena/components/BottomNav"
import { useRouter } from "next/navigation"

export default function PerfilPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push("/serena")
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-terra">Perfil</h1>
      <p className="mt-1 text-marrom">{user?.email}</p>

      <div className="mt-8 flex flex-col gap-3">
        <div className="rounded-xl bg-nevoa p-4">
          <p className="text-sm text-marrom">Assinatura</p>
          <p className="font-semibold text-terra">Trial ativo</p>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-xl border border-red-300 px-4 py-3 text-sm text-red-500"
        >
          Sair
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(serena): home dashboard and app shell"
```

---

### Task 7: Meditation Player

**Files:**
- Create: `src/app/serena/components/MeditationPlayer.tsx`
- Create: `src/app/serena/components/MeditationList.tsx`
- Modify: `src/app/serena/app/meditar/page.tsx`

**Interfaces:**
- Consumes: tasks 2, 4 (supabase, types, auth)
- Produces: Meditation list screen + audio player with timer

- [ ] **Step 1: Create MeditationList component**

Create `src/app/serena/components/MeditationList.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/app/serena/lib/supabase"
import type { Meditation } from "@/app/serena/lib/types"

const categories = [
  { id: "morning", label: "Manhã", emoji: "☀️" },
  { id: "pause", label: "Pausa", emoji: "🌤️" },
  { id: "night", label: "Noite", emoji: "🌙" },
] as const

export function MeditationList({ onSelect }: { onSelect: (m: Meditation) => void }) {
  const [meditations, setMeditations] = useState<Meditation[]>([])
  const [activeCat, setActiveCat] = useState<string>("morning")

  useEffect(() => {
    supabase
      .from("meditations")
      .select("*")
      .eq("category", activeCat)
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => setMeditations(data ?? []))
  }, [activeCat])

  return (
    <div>
      {/* Category tabs */}
      <div className="flex gap-2 mb-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeCat === cat.id
                ? "bg-folha text-white"
                : "bg-nevoa text-marrom"
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Meditation list */}
      <div className="flex flex-col gap-3">
        {meditations.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            className="flex items-center gap-3 rounded-xl bg-nevoa p-4 text-left transition hover:bg-nevoa/80"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-folha/20 text-lg">
              🎧
            </div>
            <div className="flex-1">
              <p className="font-medium text-terra">{m.title}</p>
              <p className="text-sm text-marrom">{m.duration_min} min</p>
            </div>
          </button>
        ))}
        {meditations.length === 0 && (
          <p className="text-center text-marrom">Nenhuma meditação disponível ainda.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create MeditationPlayer component**

Create `src/app/serena/components/MeditationPlayer.tsx`:

```tsx
"use client"

import { useState, useRef, useEffect } from "react"
import type { Meditation } from "@/app/serena/lib/types"
import { supabase } from "@/app/serena/lib/supabase"
import { useAuth } from "@/app/serena/lib/auth-context"

export function MeditationPlayer({
  meditation,
  onBack,
}: {
  meditation: Meditation
  onBack: () => void
}) {
  const [playing, setPlaying] = useState(false)
  const [timeLeft, setTimeLeft] = useState(meditation.duration_min * 60)
  const [completed, setCompleted] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const { user } = useAuth()

  useEffect(() => {
    if (meditation.audio_url) {
      const audio = new Audio(meditation.audio_url)
      audioRef.current = audio
      audio.addEventListener("canplaythrough", () => setAudioReady(true))
      audio.load()
    }

    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [meditation.audio_url])

  function togglePlay() {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      clearInterval(timerRef.current)
    } else {
      audioRef.current.play()
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current)
            setPlaying(false)
            setCompleted(true)
            saveLog()
            return 0
          }
          return t - 1
        })
      }, 1000)
    }
    setPlaying(!playing)
  }

  async function saveLog() {
    if (!user) return
    await supabase.from("user_meditation_log").insert({
      user_id: user.id,
      meditation_id: meditation.id,
      duration_seconds: meditation.duration_min * 60,
    })
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className="flex flex-col items-center gap-6 pt-8">
      <button onClick={onBack} className="self-start text-sm text-marrom underline">
        ← Voltar
      </button>

      {completed ? (
        <div className="flex flex-col items-center gap-4">
          <span className="text-6xl">🧘</span>
          <h2 className="text-xl font-bold text-terra">Meditação concluída</h2>
          <p className="text-marrom">Que tal registrar como se sente?</p>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-bold text-terra">{meditation.title}</h2>

          {/* Timer circle */}
          <div className="flex h-48 w-48 items-center justify-center rounded-full bg-nevoa">
            <div className="text-center">
              <p className="text-4xl font-bold text-terra">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </p>
              <p className="text-sm text-marrom">restantes</p>
            </div>
          </div>

          <button
            onClick={togglePlay}
            disabled={!audioReady}
            className="rounded-full bg-cta px-10 py-4 text-lg text-white transition hover:bg-marrom-soft disabled:opacity-50"
          >
            {!audioReady ? "Carregando..." : playing ? "⏸ Pausar" : "▶ Meditar"}
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Update meditar page**

Modify `src/app/serena/app/meditar/page.tsx`:

```tsx
"use client"

import { useState } from "react"
import { MeditationList } from "@/app/serena/components/MeditationList"
import { MeditationPlayer } from "@/app/serena/components/MeditationPlayer"
import { BottomNav } from "@/app/serena/components/BottomNav"
import type { Meditation } from "@/app/serena/lib/types"

export default function MeditarPage() {
  const [active, setActive] = useState<Meditation | null>(null)

  return (
    <div className="mx-auto max-w-md px-5 pt-6 pb-24">
      {active ? (
        <MeditationPlayer meditation={active} onBack={() => setActive(null)} />
      ) : (
        <>
          <h1 className="mb-6 text-2xl font-bold text-terra">Meditar</h1>
          <MeditationList onSelect={setActive} />
        </>
      )}
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(serena): meditation player with audio and timer"
```

---

### Task 8: Breathing Tool

**Files:**
- Create: `src/app/serena/components/BreathingExercise.tsx`
- Create: `src/app/serena/app/respirar/page.tsx`
- Modify: `src/app/serena/components/BottomNav.tsx` (add breathing link)

**Interfaces:**
- Consumes: tasks 2, 4 (supabase, types, auth)
- Produces: Breathing exercise screen with animated circle and timer

- [ ] **Step 1: Create BreathingExercise component**

Create `src/app/serena/components/BreathingExercise.tsx`:

```tsx
"use client"

import { useState, useEffect, useRef } from "react"

interface Pattern {
  name: string
  label: string
  description: string
  cycles: { phase: string; duration: number; instruction: string }[]
}

const patterns: Pattern[] = [
  {
    name: "box",
    label: "Respiração Caixa",
    description: "Inspire, segure, expire, segure — 4 segundos cada",
    cycles: [
      { phase: "inhale", duration: 4, instruction: "Inspire" },
      { phase: "hold", duration: 4, instruction: "Segure" },
      { phase: "exhale", duration: 4, instruction: "Expire" },
      { phase: "hold", duration: 4, instruction: "Segure" },
    ],
  },
  {
    name: "478",
    label: "4-7-8",
    description: "Inspire por 4, segure por 7, expire por 8",
    cycles: [
      { phase: "inhale", duration: 4, instruction: "Inspire" },
      { phase: "hold", duration: 7, instruction: "Segure" },
      { phase: "exhale", duration: 8, instruction: "Expire" },
    ],
  },
]

export function BreathingExercise() {
  const [activePattern, setActivePattern] = useState<Pattern | null>(null)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  function start(pattern: Pattern) {
    setActivePattern(pattern)
    setPhaseIndex(0)
    setCountdown(pattern.cycles[0].duration)
    setRunning(true)
  }

  useEffect(() => {
    if (!running || !activePattern) return

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          const nextIndex = (phaseIndex + 1) % activePattern.cycles.length
          setPhaseIndex(nextIndex)
          return activePattern.cycles[nextIndex].duration
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [running, activePattern, phaseIndex])

  function stop() {
    setRunning(false)
    clearInterval(intervalRef.current)
    setActivePattern(null)
  }

  const phase = activePattern?.cycles[phaseIndex]
  const scale = phase?.phase === "inhale" ? 1 + (countdown / (phase?.duration ?? 1)) * 0.5
    : phase?.phase === "exhale" ? 0.5 + (countdown / (phase?.duration ?? 1)) * 0.5
    : 1

  if (!activePattern) {
    return (
      <div className="flex flex-col gap-3">
        {patterns.map((p) => (
          <button
            key={p.name}
            onClick={() => start(p)}
            className="rounded-xl bg-nevoa p-4 text-left transition hover:bg-nevoa/80"
          >
            <p className="font-medium text-terra">{p.label}</p>
            <p className="text-sm text-marrom">{p.description}</p>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8 pt-8">
      <button onClick={stop} className="self-start text-sm text-marrom underline">
        ← Escolher outro
      </button>

      <h2 className="text-xl font-bold text-terra">{activePattern.label}</h2>

      <div
        className="flex h-48 w-48 items-center justify-center rounded-full transition-all duration-1000"
        style={{
          transform: `scale(${scale})`,
          backgroundColor: phase?.phase === "inhale" ? "#8CAF8C"
            : phase?.phase === "exhale" ? "#D4A5A5"
            : "#F5F2ED",
        }}
      >
        <div className="text-center">
          <p className="text-5xl font-bold text-white">{countdown}</p>
          <p className="mt-1 text-sm font-medium text-white/80">
            {phase?.instruction}
          </p>
        </div>
      </div>

      <button
        onClick={stop}
        className="rounded-xl bg-cta px-8 py-3 text-white"
      >
        Parar
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create breathing page**

Create `src/app/serena/app/respirar/page.tsx`:

```tsx
"use client"

import { BreathingExercise } from "@/app/serena/components/BreathingExercise"
import { BottomNav } from "@/app/serena/components/BottomNav"

export default function RespirarPage() {
  return (
    <div className="mx-auto max-w-md px-5 pt-6 pb-24">
      <h1 className="mb-6 text-2xl font-bold text-terra">Respiração</h1>
      <BreathingExercise />
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 3: Update BottomNav**

Modify `src/app/serena/components/BottomNav.tsx` to include breathing:

```tsx
const links = [
  { href: "/serena/app", label: "Início", emoji: "🏠" },
  { href: "/serena/app/respirar", label: "Respirar", emoji: "🌬️" },
  { href: "/serena/app/meditar", label: "Meditar", emoji: "🧘" },
  { href: "/serena/app/perfil", label: "Perfil", emoji: "👤" },
]
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(serena): breathing exercise tool"
```

---

### Task 9: Content Trilhas

**Files:**
- Create: `src/app/serena/components/TrilhaList.tsx`
- Create: `src/app/serena/components/TrilhaPlayer.tsx`
- Modify: `src/app/serena/app/trilhas/page.tsx`

**Interfaces:**
- Consumes: tasks 2, 4 (supabase, types, auth)
- Produces: Trilha list with progress + aula reader with audio TTS

- [ ] **Step 1: Create TrilhaList component**

Create `src/app/serena/components/TrilhaList.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/app/serena/lib/supabase"
import { useAuth } from "@/app/serena/lib/auth-context"
import type { Trilha, TrilhaAula, UserTrilhaProgress } from "@/app/serena/lib/types"

export function TrilhaList({ onSelect }: { onSelect: (trilhaId: string, aula: TrilhaAula) => void }) {
  const [trilhas, setTrilhas] = useState<(Trilha & { progress?: UserTrilhaProgress })[]>([])
  const { user } = useAuth()

  useEffect(() => {
    async function load() {
      const { data: all } = await supabase.from("trilhas").select("*").order("sort_order")
      if (!all) return

      const { data: progress } = await supabase
        .from("user_trilha_progress")
        .select("*")
        .eq("user_id", user?.id ?? "")

      setTrilhas(
        all.map((t) => ({
          ...t,
          progress: progress?.find((p) => p.trilha_id === t.id),
        }))
      )
    }
    load()
  }, [user])

  async function handleClick(trilha: Trilha) {
    const { data: aulas } = await supabase
      .from("trilha_aulas")
      .select("*")
      .eq("trilha_id", trilha.id)
      .order("sort_order")
      .limit(1)

    if (aulas?.[0]) {
      onSelect(trilha.id, aulas[0])
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {trilhas.map((t) => (
        <button
          key={t.id}
          onClick={() => handleClick(t)}
          className="rounded-xl bg-nevoa p-4 text-left transition hover:bg-nevoa/80"
        >
          <p className="font-medium text-terra">{t.title}</p>
          <p className="text-sm text-marrom">{t.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-white">
              <div
                className="h-1.5 rounded-full bg-folha transition-all"
                style={{
                  width: `${((t.progress?.completed_aulas ?? 0) / (t.progress?.total_aulas ?? 5)) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs text-cta">
              {t.progress?.completed_aulas ?? 0}/{t.progress?.total_aulas ?? 5}
            </span>
          </div>
        </button>
      ))}
      {trilhas.length === 0 && (
        <p className="text-center text-marrom">Nenhuma trilha disponível ainda.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create TrilhaPlayer component**

Create `src/app/serena/components/TrilhaPlayer.tsx`:

```tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/app/serena/lib/supabase"
import { useAuth } from "@/app/serena/lib/auth-context"
import type { TrilhaAula } from "@/app/serena/lib/types"

export function TrilhaPlayer({
  trilhaId,
  initialAula,
  onBack,
}: {
  trilhaId: string
  initialAula: TrilhaAula
  onBack: () => void
}) {
  const [aula, setAula] = useState(initialAula)
  const [aulas, setAulas] = useState<TrilhaAula[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    supabase
      .from("trilha_aulas")
      .select("*")
      .eq("trilha_id", trilhaId)
      .order("sort_order")
      .then(({ data }) => setAulas(data ?? []))
  }, [trilhaId])

  useEffect(() => {
    if (aula.audio_url) {
      audioRef.current?.pause()
      const audio = new Audio(aula.audio_url)
      audioRef.current = audio
      setPlaying(false)
    }
  }, [aula])

  function toggleAudio() {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  function goToAula(index: number) {
    if (aulas[index]) {
      setAula(aulas[index])
      setCurrentIndex(index)
    }
  }

  async function completeAula() {
    if (!user) return
    const { data: progress } = await supabase
      .from("user_trilha_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("trilha_id", trilhaId)
      .single()

    if (progress) {
      const newCompleted = Math.max(progress.completed_aulas, currentIndex + 1)
      await supabase
        .from("user_trilha_progress")
        .update({
          completed_aulas: newCompleted,
          completed: newCompleted >= progress.total_aulas,
        })
        .eq("id", progress.id)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={onBack} className="self-start text-sm text-marrom underline">
        ← Todas as trilhas
      </button>

      <h2 className="text-xl font-bold text-terra">{aula.title}</h2>

      {aula.audio_url && (
        <button
          onClick={toggleAudio}
          className="self-start rounded-full bg-folha px-6 py-2 text-sm font-medium text-white"
        >
          {playing ? "⏸ Pausar" : "🎧 Ouvir"}
        </button>
      )}

      <div className="prose prose-sm max-w-none text-marrom">
        {aula.content_md.split("\n").map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => goToAula(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="rounded-lg bg-nevoa px-4 py-2 text-sm text-marrom disabled:opacity-30"
        >
          ← Anterior
        </button>

        <button
          onClick={() => {
            completeAula()
            goToAula(currentIndex + 1)
          }}
          disabled={currentIndex >= aulas.length - 1}
          className="rounded-lg bg-cta px-4 py-2 text-sm text-white disabled:opacity-30"
        >
          Completar → Próxima
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update trilhas page**

Modify `src/app/serena/app/trilhas/page.tsx`:

```tsx
"use client"

import { useState } from "react"
import { TrilhaList } from "@/app/serena/components/TrilhaList"
import { TrilhaPlayer } from "@/app/serena/components/TrilhaPlayer"
import { BottomNav } from "@/app/serena/components/BottomNav"
import type { TrilhaAula } from "@/app/serena/lib/types"

export default function TrilhasPage() {
  const [active, setActive] = useState<{ trilhaId: string; aula: TrilhaAula } | null>(null)

  return (
    <div className="mx-auto max-w-md px-5 pt-6 pb-24">
      <h1 className="mb-6 text-2xl font-bold text-terra">Trilhas</h1>
      {active ? (
        <TrilhaPlayer
          trilhaId={active.trilhaId}
          initialAula={active.aula}
          onBack={() => setActive(null)}
        />
      ) : (
        <TrilhaList onSelect={(trilhaId, aula) => setActive({ trilhaId, aula })} />
      )}
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 4: Seed initial content data**

Create a seed script or migration note. For now, document the seed data to insert into Supabase:

```sql
INSERT INTO trilhas (title, description, sort_order) VALUES
  ('Começando a Meditar', 'Aprenda os fundamentos da meditação em 5 aulas', 1),
  ('Sono Reparador', 'Técnicas para dormir melhor e acordar revigorada', 2),
  ('Ansiedade', 'Ferramentas práticas para lidar com a ansiedade do dia a dia', 3);

INSERT INTO trilha_aulas (trilha_id, title, content_md, sort_order)
SELECT t.id, 'O que é mindfulness?', 'Mindfulness é a prática de estar presente no momento atual, sem julgamento. Nesta aula, vamos explorar o básico.', 1
FROM trilhas t WHERE t.title = 'Começando a Meditar';
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(serena): content trilhas with progress tracking"
```

---

### Task 10: Journaling

**Files:**
- Create: `src/app/serena/components/JournalHistory.tsx`
- Create: `src/app/serena/app/journal/page.tsx`
- Modify: `src/app/serena/components/BottomNav.tsx` (replace Trilhas with Journal in bottom nav)

**Interfaces:**
- Consumes: tasks 2, 4 (supabase, types, auth)
- Produces: Daily prompt + journal entry + history view

- [ ] **Step 1: Create JournalHistory component**

Create `src/app/serena/components/JournalHistory.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/app/serena/lib/supabase"
import { useAuth } from "@/app/serena/lib/auth-context"
import type { JournalEntry } from "@/app/serena/lib/types"

export function JournalHistory() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setEntries(data ?? []))
  }, [user])

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-xl bg-nevoa p-4">
          <p className="text-xs text-marrom/60">
            {new Date(entry.created_at).toLocaleDateString("pt-BR")}
          </p>
          <p className="mt-1 text-sm font-medium text-terra">{entry.prompt}</p>
          <p className="mt-1 text-sm text-marrom">{entry.content}</p>
        </div>
      ))}
      {entries.length === 0 && (
        <p className="text-center text-marrom">Nenhuma entrada ainda. Escreva algo hoje!</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create journal page**

Create `src/app/serena/app/journal/page.tsx`:

```tsx
"use client"

import { DailyPrompt } from "@/app/serena/components/DailyPrompt"
import { JournalHistory } from "@/app/serena/components/JournalHistory"
import { BottomNav } from "@/app/serena/components/BottomNav"

export default function JournalPage() {
  return (
    <div className="mx-auto max-w-md px-5 pt-6 pb-24">
      <h1 className="mb-6 text-2xl font-bold text-terra">Journaling</h1>
      <div className="mb-8">
        <DailyPrompt />
      </div>
      <h2 className="mb-3 text-lg font-semibold text-terra">Histórico</h2>
      <JournalHistory />
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 3: Update BottomNav to include Journal**

Modify BottomNav. Navigate between 5 tabs is tight. Best approach: keep 4 tabs but add journal as secondary page accessible from dashboard, or replace Trilhas with Journal. Given the spec, Journaling is a key feature. Let's keep BottomNav as: Início, Respirar, Meditar, Perfil — and add Journal access from the HomeDashboard (it's already there as DailyPrompt). The full journal history gets its own route.

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(serena): journaling with history"
```

---

### Task 11: Landing Page & Lead Magnet

**Files:**
- Create: `src/app/serena/components/LandingHero.tsx`
- Create: `src/app/serena/components/LandingBenefits.tsx`
- Create: `src/app/serena/components/LandingCTA.tsx`
- Modify: `src/app/serena/page.tsx` (replace placeholder)

**Interfaces:**
- Consumes: task 1 (design tokens)
- Produces: Marketing landing page for Serena with lead magnet signup form

- [ ] **Step 1: Create LandingHero component**

Create `src/app/serena/components/LandingHero.tsx`:

```tsx
export function LandingHero() {
  return (
    <section className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold text-terra md:text-5xl">
        Serena
      </h1>
      <p className="mt-4 text-lg text-marrom max-w-md">
        5 minutos por dia para você recarregar. Meditação, respiração e mindfulness — feitos para a sua rotina.
      </p>

      <form
        action="https://api.whatsapp.com/send?phone=5531984816915&text=Quero%20minhas%20medita%C3%A7%C3%B5es%20gratuitas"
        className="mt-8 flex w-full max-w-sm flex-col gap-3"
      >
        <input
          type="text"
          placeholder="Seu nome"
          className="rounded-xl bg-nevoa px-4 py-3 text-marrom placeholder:text-marrom/50 outline-none"
        />
        <input
          type="email"
          placeholder="Seu melhor email"
          className="rounded-xl bg-nevoa px-4 py-3 text-marrom placeholder:text-marrom/50 outline-none"
        />
        <button
          type="submit"
          className="rounded-xl bg-cta px-6 py-3 font-semibold text-white transition hover:bg-marrom-soft"
        >
          Quero meditações grátis
        </button>
      </form>

      <p className="mt-4 text-xs text-marrom/60">
        🎁 Grátis • 5 meditações guiadas • Envio imediato
      </p>
    </section>
  )
}
```

- [ ] **Step 2: Create LandingBenefits component**

Create `src/app/serena/components/LandingBenefits.tsx`:

```tsx
const benefits = [
  { emoji: "🧘", title: "Meditação Guiada", desc: "Áudios de 5 a 15 minutos para encaixar no seu dia" },
  { emoji: "🌬️", title: "Respiração Consciente", desc: "Exercícios para acalmar a mente em qualquer lugar" },
  { emoji: "📖", title: "Trilhas de Conteúdo", desc: "Aprenda mindfulness no seu ritmo, com texto e áudio" },
  { emoji: "📝", title: "Journaling Diário", desc: "Um prompt por dia para se reconectar com você" },
  { emoji: "💚", title: "Feito para Mulheres 40+", desc: "Conteúdo pensado para sua fase de vida" },
]

export function LandingBenefits() {
  return (
    <section className="px-6 py-20">
      <h2 className="text-center text-2xl font-bold text-terra">
        O que você encontra no Serena
      </h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 max-w-lg mx-auto">
        {benefits.map((b) => (
          <div key={b.title} className="rounded-xl bg-nevoa p-5">
            <span className="text-2xl">{b.emoji}</span>
            <h3 className="mt-2 font-semibold text-terra">{b.title}</h3>
            <p className="mt-1 text-sm text-marrom">{b.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Create LandingCTA component**

Create `src/app/serena/components/LandingCTA.tsx`:

```tsx
import Link from "next/link"

export function LandingCTA() {
  return (
    <section className="px-6 py-20 text-center">
      <div className="rounded-2xl bg-folha p-8 max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-white">
          Experimente grátis por 7 dias
        </h2>
        <p className="mt-2 text-white/80">Sem compromisso. Cancele quando quiser.</p>
        <Link
          href="/serena/app/auth"
          className="mt-6 inline-block rounded-xl bg-white px-8 py-3 font-semibold text-folha transition hover:bg-white/90"
        >
          Começar agora
        </Link>
        <p className="mt-3 text-sm text-white/60">Depois apenas R$ 29,90/mês</p>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Update landing page**

Modify `src/app/serena/page.tsx`:

```tsx
import { LandingHero } from "./components/LandingHero"
import { LandingBenefits } from "./components/LandingBenefits"
import { LandingCTA } from "./components/LandingCTA"

export default function SerenaLanding() {
  return (
    <main className="min-h-screen">
      <LandingHero />
      <LandingBenefits />
      <LandingCTA />
    </main>
  )
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds, landing page works.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(serena): landing page and lead magnet"
```

---

### Task 12: Lastlink Payment Integration

**Files:**
- Create: `src/app/serena/lib/lastlink.ts`
- Create: `src/app/serena/app/checkout/page.tsx`
- Modify: `src/app/serena/app/perfil/page.tsx`
- Modify: `next.config.ts` (add redirect rule if needed — not possible with static export)

**Interfaces:**
- Consumes: tasks 2, 4 (auth, supabase)
- Produces: Lastlink checkout redirect, subscription status display

- [ ] **Step 1: Create Lastlink helper**

Create `src/app/serena/lib/lastlink.ts`:

```ts
const LASTLINK_API_URL = process.env.NEXT_PUBLIC_LASTLINK_API_URL
const LASTLINK_PUBLIC_KEY = process.env.NEXT_PUBLIC_LASTLINK_PUBLIC_KEY

export interface LastlinkPlan {
  id: string
  name: string
  value: number
  period: "monthly" | "yearly"
}

export const plans: LastlinkPlan[] = [
  { id: "plan_mensal", name: "Mensal", value: 2990, period: "monthly" },
  { id: "plan_anual", name: "Anual", value: 24900, period: "yearly" },
]

export function createCheckoutUrl(planId: string, userId: string, userEmail: string): string {
  // Lastlink checkout URL structure — adjust based on actual Lastlink API docs
  const base = LASTLINK_API_URL ?? "https://checkout.lastlink.com.br"
  const params = new URLSearchParams({
    plan_id: planId,
    customer_id: userId,
    customer_email: userEmail,
    public_key: LASTLINK_PUBLIC_KEY ?? "",
  })
  return `${base}/checkout?${params.toString()}`
}
```

- [ ] **Step 2: Create checkout page**

Create `src/app/serena/app/checkout/page.tsx`:

```tsx
"use client"

import { useAuth } from "@/app/serena/lib/auth-context"
import { plans, createCheckoutUrl } from "@/app/serena/lib/lastlink"

export default function CheckoutPage() {
  const { user } = useAuth()

  function handleSelect(plan: (typeof plans)[0]) {
    if (!user) return
    const url = createCheckoutUrl(plan.id, user.id, user.email ?? "")
    window.open(url, "_blank")
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-6">
      <h1 className="text-2xl font-bold text-terra">Escolha seu plano</h1>
      <p className="mt-1 text-marrom">7 dias grátis, cancele quando quiser</p>

      <div className="mt-6 flex flex-col gap-4">
        <div className="rounded-xl border-2 border-folha bg-folha/5 p-5">
          <p className="text-xl font-bold text-terra">Mensal</p>
          <p className="text-3xl font-bold text-marrom mt-1">R$ 29,90</p>
          <p className="text-sm text-marrom/60">por mês</p>
          <button
            onClick={() => handleSelect(plans[0])}
            className="mt-4 w-full rounded-xl bg-cta px-6 py-3 font-semibold text-white"
          >
            Assinar Mensal
          </button>
        </div>

        <div className="rounded-xl border-2 border-terra bg-nevoa p-5">
          <p className="text-xl font-bold text-terra">Anual</p>
          <p className="text-3xl font-bold text-marrom mt-1">R$ 249</p>
          <p className="text-sm text-marrom/60">R$ 20,75/mês • Economize 30%</p>
          <button
            onClick={() => handleSelect(plans[1])}
            className="mt-4 w-full rounded-xl bg-cta px-6 py-3 font-semibold text-white"
          >
            Assinar Anual
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update perfil page with subscription status**

Modify `src/app/serena/app/perfil/page.tsx` to show subscription status and link to checkout:

```tsx
"use client"

import { useAuth } from "@/app/serena/lib/auth-context"
import { BottomNav } from "@/app/serena/components/BottomNav"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function PerfilPage() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push("/serena")
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-terra">Perfil</h1>
      <p className="mt-1 text-marrom">{user?.email}</p>

      <div className="mt-8 flex flex-col gap-3">
        <div className="rounded-xl bg-nevoa p-4">
          <p className="text-sm text-marrom">Assinatura</p>
          {profile?.is_subscribed ? (
            <p className="font-semibold text-folha">Ativa ✅</p>
          ) : (
            <div>
              <p className="font-semibold text-terra">
                Trial até {new Date(profile?.trial_ends_at ?? "").toLocaleDateString("pt-BR")}
              </p>
              <Link
                href="/serena/app/checkout"
                className="mt-2 inline-block text-sm text-folha underline"
              >
                Assinar agora
              </Link>
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="rounded-xl border border-red-300 px-4 py-3 text-sm text-red-500"
        >
          Sair
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Document Lastlink webhook setup**

Create a reference note in `src/app/serena/lib/lastlink-webhook-setup.md` with instructions for configuring the Lastlink webhook to call a Supabase Edge Function (or external endpoint) to update `user_profiles.is_subscribed` when payment is confirmed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(serena): lastlink payment integration"
```

---

### Task 13: WhatsApp Integration

**Files:**
- Create: `src/app/serena/lib/whatsapp.ts`
- Modify: `src/app/serena/components/LandingHero.tsx` (lead magnet flow)

**Interfaces:**
- Consumes: task 11 (landing page)
- Produces: WhatsApp deep link helpers, reminder link generation

- [ ] **Step 1: Create WhatsApp helper**

Create `src/app/serena/lib/whatsapp.ts`:

```ts
const WHATSAPP_NUMBER = "5531984816915"

export function createWhatsAppLink(message: string): string {
  return `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`
}

export const leadMagnetMessage =
  "Quero minhas 5 meditações guiadas gratuitas! 🧘"

export const dailyReminderMessages = [
  "🌤️ Bom dia! Que tal 5 minutinhos de meditação hoje? 🧘",
  "☀️ Tire um momento para você agora. Respire. 😮‍💨",
  "🌙 Boa noite. Que tal uma meditação para relaxar?",
]

export function getDailyReminder(): string {
  const day = new Date().getDate()
  return dailyReminderMessages[day % dailyReminderMessages.length]
}
```

- [ ] **Step 2: Update landing page to use WhatsApp for lead capture**

Modify the form in `LandingHero.tsx` to send to WhatsApp:

```tsx
const WHATSAPP_URL = createWhatsAppLink(leadMagnetMessage)
```

And use it as the form action — or better, as a direct link button.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(serena): whatsapp integration with lead magnet"
```

---

### Task 14: Admin — Seed Content & ElevenLabs Audio

**Files:**
- Create: `scripts/seed-serena-content.ts`
- Create: `scripts/generate-audio.ts`
- Create: `src/app/serena/lib/seed-content.sql` (comprehensive seed data)

**Interfaces:**
- Consumes: tasks 2 (schema)
- Produces: Seed data for meditations, trilhas, breathing exercises; audio generation script

- [ ] **Step 1: Create comprehensive seed SQL**

Write seed data for all content tables:

```sql
-- Meditations
INSERT INTO meditations (title, description, category, duration_min, sort_order) VALUES
  ('Despertar Suave', 'Comece o dia com presença e gratidão', 'morning', 5, 1),
  ('Energia da Manhã', 'Ative sua energia com uma meditação dinâmica', 'morning', 10, 2),
  ('Pausa do Meio-dia', 'Recarregue as energias na metade do dia', 'pause', 5, 1),
  ('Respiração e Foco', 'Recupere o foco com respiração consciente', 'pause', 10, 2),
  ('Relaxamento Noturno', 'Libere as tensões do dia', 'night', 10, 1),
  ('Sono Profundo', 'Prepare-se para uma noite de sono reparador', 'night', 15, 2);

-- Breathing exercises  
INSERT INTO breathing_exercises (name, description, pattern_name, duration_min, sort_order) VALUES
  ('Respiração Caixa', 'Inspire, segure, expire, segure — 4 segundos cada', 'box', 5, 1),
  ('4-7-8 Relaxante', 'Inspire 4s, segure 7s, expire 8s — o clássico do Dr. Weil', '478', 5, 2),
  ('Respiração Diafragmática', 'Respire com o abdômen para ativar o relaxamento', 'diaphragmatic', 5, 3);

-- Trilhas
INSERT INTO trilhas (title, description, sort_order) VALUES
  ('Começando a Meditar', 'Aprenda os fundamentos da meditação mindfulness em 5 aulas práticas', 1),
  ('Sono Reparador', 'Técnicas baseadas em ciência para melhorar seu sono', 2),
  ('Ansiedade não te define', 'Ferramentas práticas para lidar com a ansiedade', 3),
  ('Autocuidado sem Culpa', 'Porque cuidar de você também é cuidar de quem você ama', 4);

-- Trilha 1 aulas
INSERT INTO trilha_aulas (trilha_id, title, content_md, sort_order)
SELECT t.id, 'O que é mindfulness?', 'Mindfulness é a prática de prestar atenção no momento presente, intencionalmente e sem julgamento.\n\nNão se trata de esvaziar a mente, mas sim de escolher onde colocar sua atenção.\n\nNesta aula, vamos experimentar 2 minutos de atenção plena na respiração.', 1
FROM trilhas t WHERE t.title = 'Começando a Meditar';
```

- [ ] **Step 2: Create audio generation script reference**

Document how to generate audio via ElevenLabs for each meditation and trilha aula. The script should:
1. Fetch all content needing audio
2. Call ElevenLabs TTS API for each
3. Upload to Supabase Storage
4. Update the `audio_url` field

```ts
// Pseudocode for scripts/generate-audio.ts
// 1. Read all meditations from DB
// 2. For each, call ElevenLabs API:
//    POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
//    Body: { text: "meditation script...", model_id: "eleven_multilingual_v2" }
// 3. Upload resulting audio to Supabase Storage bucket "audio"
// 4. Update meditation.audio_url with the public URL
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(serena): seed data and audio generation scripts"
```
