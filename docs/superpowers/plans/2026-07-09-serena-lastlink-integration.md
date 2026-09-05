# Serena + Lastlink Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Serena with Lastlink payment gateway using Cloudflare Workers for webhook validation, token management, and email delivery.

**Architecture:** Cloudflare Worker receives webhooks from Lastlink, generates access tokens stored in Cloudflare KV, sends magic-link emails via Cloudflare Email Service. Serena (Next.js static export) gets a new `/acessar` page that validates tokens client-side via the Worker.

**Tech Stack:** Cloudflare Workers, Cloudflare KV, Cloudflare Email Service, Cloudflare DNS, Lastlink webhooks, Next.js 16 (static export)

## Global Constraints

- DNS migrar para Cloudflare (nameservers já atualizados, aguardar propagação)
- Next.js `output: "export"` — sem API routes, sem SSR
- Token de acesso = UUID v4
- Preço Mensal: R$ 15,90 | Anual: R$ 159
- Domínio: serenamedita.com.br
- HostGator mantém hospedagem do site estático
- Cloudflare Workers no plano Free (100k req/dia)
- Cloudflare KV: 1GB, namespace `SERENA_ACCESS`

---

### Task 1: Criar Cloudflare Worker — Webhook Handler

**Files:**
- Create: `workers/serena-api/src/index.ts` (Worker principal)
- Create: `workers/serena-api/wrangler.jsonc` (config)
- Create: `workers/serena-api/package.json`

**Interfaces:**
- Consumes: POST do webhook Lastlink (JSON payload)
- Produces: `access:${token}` entries in KV, `event:${eventId}` idempotency keys

- [ ] **Step 1: Create Worker project scaffold**

```bash
mkdir -p /Users/iamregis/Documents/Serena/workers/serena-api/src
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "serena-api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240701.0",
    "typescript": "^5.5.0",
    "wrangler": "^3.60.0"
  }
}
```

- [ ] **Step 3: Write wrangler.jsonc**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "serena-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-07-09",
  "observability": {
    "enabled": true
  },
  "kv_namespaces": [
    {
      "binding": "SERENA_ACCESS",
      "id": "SERENA_ACCESS"
    }
  ],
  "send_email": [
    {
      "name": "SERENA_EMAIL"
    }
  ],
  "vars": {
    "FROM_EMAIL": "serena@serenamedita.com.br",
    "FROM_NAME": "Serena",
    "SITE_URL": "https://serenamedita.com.br",
    "APP_URL": "https://serenamedita.com.br/app"
  }
}
```

- [ ] **Step 4: Write Worker index.ts — webhook receiver**

```typescript
export interface Env {
  SERENA_ACCESS: KVNamespace
  SERENA_EMAIL: SendEmail
  FROM_EMAIL: string
  FROM_NAME: string
  SITE_URL: string
  APP_URL: string
}

interface LastlinkEvent {
  Id: string
  IsTest: boolean
  Event: string
  CreatedAt: string
  Data: {
    Products?: Array<{ Id?: string; Name: string; Price?: number }>
    Buyer: {
      Id: string
      Email: string
      Name: string
      PhoneNumber: string
      Document: string
    }
    Purchase?: {
      PaymentId: string
      Recurrency: number
      PaymentDate: string
      OriginalPrice: { Value: number }
      Price: { Value: number }
      Payment?: { NumberOfInstallments: number; PaymentMethod: string }
    }
    Subscriptions?: { Id: string; ProductId: string }[]
    Offer: { Id: string; Name: string; Url: string }
  }
}

function generateToken(): string {
  const hex = "0123456789abcdef"
  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return hex[v]
  })
  return uuid
}

function getPlanDuration(price: number): number {
  // 15.90 = mensal (31 dias), 159 = anual (366 dias)
  if (price >= 150) return 366 * 24 * 60 * 60
  return 31 * 24 * 60 * 60
}

function getPlanName(price: number): string {
  if (price >= 150) return "anual"
  return "mensal"
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 })
    }

    const payload: LastlinkEvent = await request.json()

    // Ignorar eventos de teste
    if (payload.IsTest === true) {
      return new Response("Test event ignored", { status: 200 })
    }

    // Idempotência: checar se evento já foi processado
    const eventKey = `event:${payload.Id}`
    const alreadyProcessed = await env.SERENA_ACCESS.get(eventKey)
    if (alreadyProcessed) {
      return new Response("Already processed", { status: 200 })
    }

    switch (payload.Event) {
      case "Purchase_Order_Confirmed": {
        const buyer = payload.Data.Buyer
        const purchase = payload.Data.Purchase
        const subscriptions = payload.Data.Subscriptions

        if (!purchase || !subscriptions || subscriptions.length === 0) {
          return new Response("Missing purchase or subscription data", { status: 400 })
        }

        const price = purchase.Price.Value
        const token = generateToken()
        const ttl = getPlanDuration(price)
        const planName = getPlanName(price)
        const subscriptionId = subscriptions[0].Id
        const now = new Date().toISOString()
        const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()

        const accessData = {
          email: buyer.Email,
          nome: buyer.Name,
          plano: planName,
          value: price,
          expiresAt,
          subscriptionId,
          createdAt: now,
        }

        // Salvar token de acesso
        await env.SERENA_ACCESS.put(`access:${token}`, JSON.stringify(accessData), {
          expirationTtl: ttl,
        })

        // Mapear email → token
        await env.SERENA_ACCESS.put(`email:${buyer.Email}:token`, token, {
          expirationTtl: ttl,
        })

        // Mapear subscriptionId → token
        await env.SERENA_ACCESS.put(`subscription:${subscriptionId}`, token, {
          expirationTtl: ttl + 30 * 24 * 60 * 60, // 30 dias extra
        })

        // Marcar evento como processado (7 dias)
        await env.SERENA_ACCESS.put(eventKey, "1", { expirationTtl: 7 * 24 * 60 * 60 })

        // Enviar e-mail de acesso
        const magicLink = `${env.SITE_URL}/acessar?token=${token}`
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 0 auto; padding: 32px 24px; }
    .header { text-align: center; margin-bottom: 24px; }
    .card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { color: #5b4636; font-size: 22px; margin: 0 0 12px; }
    p { color: #6b5a4a; font-size: 15px; line-height: 1.5; margin: 0 0 16px; }
    .btn { display: inline-block; background: #9caf84; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 16px; font-weight: 600; }
    .footer { margin-top: 24px; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>Bem-vinda ao Serena 🧘</h1>
      <p>Olá ${buyer.Name}, sua assinatura foi confirmada com sucesso!</p>
      <p>Clique no botão abaixo para acessar o app e começar sua jornada de mindfulness:</p>
      <p style="text-align: center;">
        <a href="${magicLink}" class="btn">Acessar Serena</a>
      </p>
    </div>
    <div class="footer">
      <p>Serena — Mindfulness para o seu dia</p>
      <p>Este é um email automático, por favor não responda.</p>
    </div>
  </div>
</body>
</html>`

        await env.SERENA_EMAIL.send({
          to: buyer.Email,
          from: `${env.FROM_NAME} <${env.FROM_EMAIL}>`,
          subject: "Seu acesso ao Serena está liberado! 🧘",
          html: emailHtml,
        })

        return new Response("OK", { status: 200 })
      }

      case "Subscription_Canceled":
      case "Subscription_Expired": {
        const subscriptions = payload.Data.Subscriptions
        if (!subscriptions || subscriptions.length === 0) {
          return new Response("Missing subscription data", { status: 400 })
        }
        const subId = subscriptions[0].Id
        const token = await env.SERENA_ACCESS.get(`subscription:${subId}`)
        if (token) {
          await env.SERENA_ACCESS.delete(`access:${token}`)
          await env.SERENA_ACCESS.delete(`subscription:${subId}`)
          // email:${email}:token fica para expirar naturalmente
        }
        await env.SERENA_ACCESS.put(eventKey, "1", { expirationTtl: 7 * 24 * 60 * 60 })
        return new Response("Access removed", { status: 200 })
      }

      case "Recurrent_Payment": {
        const purchase = payload.Data.Purchase
        const subscriptions = payload.Data.Subscriptions
        if (!purchase || !subscriptions || subscriptions.length === 0) {
          return new Response("Missing data", { status: 400 })
        }

        const subId = subscriptions[0].Id
        const token = await env.SERENA_ACCESS.get(`subscription:${subId}`)
        if (token) {
          const existing = await env.SERENA_ACCESS.get(`access:${token}`)
          if (existing) {
            const data = JSON.parse(existing)
            const price = purchase.Price.Value
            const ttl = getPlanDuration(price)
            data.plano = getPlanName(price)
            data.expiresAt = new Date(Date.now() + ttl * 1000).toISOString()
            await env.SERENA_ACCESS.put(`access:${token}`, JSON.stringify(data), {
              expirationTtl: ttl,
            })
          }
        }
        await env.SERENA_ACCESS.put(eventKey, "1", { expirationTtl: 7 * 24 * 60 * 60 })
        return new Response("Subscription renewed", { status: 200 })
      }

      default:
        return new Response("Unhandled event", { status: 200 })
    }
  },
}
```

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/iamregis/Documents/Serena/workers/serena-api && npm install && npx tsc --noEmit
```

Expected: typecheck passes

- [ ] **Step 6: Commit**

```bash
git add workers/
git commit -m "feat: add Cloudflare Worker for Lastlink webhook handling"
```

---

### Task 2: Criar Cloudflare Worker — Validação de Token

**Files:**
- Modify: `workers/serena-api/src/index.ts` (adicionar GET route)

**Interfaces:**
- Consumes: `GET /validate?token=xyz`
- Produces: `{ valid: boolean, nome?: string, email?: string, plano?: string, expiresAt?: string, expired?: boolean }`

- [ ] **Step 1: Add validation endpoint before the webhook POST handler**

Adicione esta função validateToken e modifique o fetch handler:

```typescript
async function handleValidation(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const token = url.searchParams.get("token")

  if (!token) {
    return new Response(JSON.stringify({ valid: false, error: "Token não fornecido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const accessData = await env.SERENA_ACCESS.get(`access:${token}`)
  if (!accessData) {
    return new Response(JSON.stringify({ valid: false, error: "Token inválido ou expirado" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const data = JSON.parse(accessData)
  const now = Date.now()
  const expiresAt = new Date(data.expiresAt).getTime()

  return new Response(
    JSON.stringify({
      valid: now < expiresAt,
      expired: now >= expiresAt,
      nome: data.nome,
      email: data.email,
      plano: data.plano,
      expiresAt: data.expiresAt,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  )
}
```

E modifique o início do `fetch`:

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Rota de validação (GET)
    if (request.method === "GET" && url.pathname === "/validate") {
      return handleValidation(request, env)
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 })
    }

    // ... resto igual
  },
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/iamregis/Documents/Serena/workers/serena-api && npx tsc --noEmit
```

Expected: typecheck passes

- [ ] **Step 3: Commit**

```bash
git add workers/
git commit -m "feat: add token validation endpoint to Worker"
```

---

### Task 3: Criar Página /acessar no Serena

**Files:**
- Create: `src/app/acessar/page.tsx`
- Create: `src/lib/auth.ts` (função de validação)

**Interfaces:**
- Consumes: Worker endpoint `https://api.serenamedita.com.br/validate?token=xyz`
- Produces: sessionStorage `serena_token`, `serena_user`

- [ ] **Step 1: Create lib/auth.ts**

```typescript
const API_URL = "https://api.serenamedita.com.br"

export interface SessionData {
  token: string
  email: string
  nome: string
  plano: string
  expiresAt: string
}

export function getSession(): SessionData | null {
  if (typeof window === "undefined") return null
  try {
    const token = sessionStorage.getItem("serena_token")
    const email = sessionStorage.getItem("serena_email")
    const nome = sessionStorage.getItem("serena_nome")
    const plano = sessionStorage.getItem("serena_plano")
    const expiresAt = sessionStorage.getItem("serena_expires_at")
    if (!token || !email || !nome || !plano || !expiresAt) return null
    return { token, email, nome, plano, expiresAt }
  } catch {
    return null
  }
}

export function saveSession(data: SessionData): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem("serena_token", data.token)
  sessionStorage.setItem("serena_email", data.email)
  sessionStorage.setItem("serena_nome", data.nome)
  sessionStorage.setItem("serena_plano", data.plano)
  sessionStorage.setItem("serena_expires_at", data.expiresAt)
}

export function clearSession(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem("serena_token")
  sessionStorage.removeItem("serena_email")
  sessionStorage.removeItem("serena_nome")
  sessionStorage.removeItem("serena_plano")
  sessionStorage.removeItem("serena_expires_at")
}

export async function validateToken(token: string): Promise<{
  valid: boolean
  expired?: boolean
  nome?: string
  email?: string
  plano?: string
  expiresAt?: string
  error?: string
}> {
  try {
    const res = await fetch(`${API_URL}/validate?token=${encodeURIComponent(token)}`)
    return await res.json()
  } catch {
    return { valid: false, error: "Erro de conexão com o servidor" }
  }
}
```

- [ ] **Step 2: Create /acessar page**

```typescript
"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { validateToken, saveSession } from "@/lib/auth"

function AcessarContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"validating" | "valid" | "invalid" | "expired">("validating")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) {
      setStatus("invalid")
      setMessage("Link de acesso não encontrado. Verifique o link no seu e-mail.")
      return
    }

    validateToken(token).then((result) => {
      if (result.valid && !result.expired && result.email && result.plano && result.expiresAt) {
        saveSession({
          token,
          email: result.email,
          nome: result.nome || "",
          plano: result.plano,
          expiresAt: result.expiresAt,
        })
        setStatus("valid")
        setTimeout(() => router.push("/app"), 1500)
      } else if (result.expired) {
        setStatus("expired")
        setMessage("Seu acesso expirou. Renove sua assinatura para continuar.")
      } else {
        setStatus("invalid")
        setMessage(result.error || "Link inválido. Verifique seu e-mail.")
      }
    })
  }, [searchParams, router])

  if (status === "validating") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-folha border-t-transparent" />
          <p className="mt-4 text-marrom">Validando seu acesso...</p>
        </div>
      </div>
    )
  }

  if (status === "valid") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-4xl">🧘</p>
          <h1 className="mt-4 text-2xl font-bold text-terra">Acesso liberado!</h1>
          <p className="mt-2 text-marrom">Redirecionando para o Serena...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-4xl">{status === "expired" ? "⏰" : "🔗"}</p>
        <h1 className="mt-4 text-2xl font-bold text-terra">
          {status === "expired" ? "Acesso expirado" : "Link inválido"}
        </h1>
        <p className="mt-2 text-marrom">{message}</p>
        <a
          href="/"
          className="mt-6 inline-block rounded-xl bg-folha px-6 py-3 font-semibold text-white transition hover:bg-folha/90"
        >
          Voltar para o início
        </a>
      </div>
    </div>
  )
}

export default function AcessarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-folha border-t-transparent" />
        </div>
      }
    >
      <AcessarContent />
    </Suspense>
  )
}
```

- [ ] **Step 3: Proteger páginas do app (adicionar verificação no app/layout.tsx)**

```typescript
"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getSession } from "@/lib/auth"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.replace("/")
      return
    }

    const expiresAt = new Date(session.expiresAt).getTime()
    if (Date.now() > expiresAt) {
      sessionStorage.clear()
      router.replace("/")
      return
    }

    setChecked(true)
  }, [pathname, router])

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-folha border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
```

- [ ] **Step 4: Deploy local — build para verificar erros**

```bash
cd /Users/iamregis/Documents/Serena && npm run build
```

Expected: build succeeds, static export generates `out/acessar/index.html`

- [ ] **Step 5: Commit**

```bash
git add src/app/acessar/ src/lib/ src/app/app/layout.tsx
git commit -m "feat: add /acessar page with token validation and session management"
```

---

### Task 4: Configurar Lastlink — Produto + Ofertas + Webhook

**Files:** (configuração no painel Lastlink — sem código)

**Ações no painel Lastlink (https://lastlink.com):**

1. Criar produto "Serena Premium"
2. Criar oferta Mensal: R$ 15,90, assinatura recorrente mensal
3. Criar oferta Anual: R$ 159, assinatura recorrente anual (com desconto de ~17%)
4. Na oferta, ir em Integrações → Lastlink Webhook → Ativar
5. Adicionar webhook com URL: `https://api.serenamedita.com.br/webhook`
6. Selecionar eventos: Purchase_Order_Confirmed, Subscription_Canceled, Subscription_Expired, Recurrent_Payment, Payment_Refund, Payment_Chargeback
7. Salvar

---

### Task 5: Configurar Cloudflare — DNS + Worker + Email

**Files:** (configuração no painel Cloudflare — sem código)

**Passos no Cloudflare Dashboard:**

1. **DNS**: Adicionar registros:
   - `A @ IP_DO_HOSTGATOR` (DNS only — sem proxy laranja)
   - `CNAME www serenamedita.com.br` (DNS only)
   - `CNAME api serena-api.seu-subdomain.workers.dev` (Proxied — laranja)

2. **Workers & Pages:** Criar Worker com nome `serena-api`, fazer deploy via wrangler

3. **Email Service:** Verificar domínio `serenamedita.com.br` (DKIM/DMARC automático)

4. **Rota do Worker:** Configurar rota `api.serenamedita.com.br/*` → `serena-api`

5. **KV:** Criar namespace `SERENA_ACCESS` e atualizar `id` no `wrangler.jsonc`

- [ ] **Step 1: Fazer deploy do Worker**

```bash
cd /Users/iamregis/Documents/Serena/workers/serena-api
npx wrangler deploy
```

Expected: Worker deployed, URL: `serena-api.seu-subdomain.workers.dev`

- [ ] **Step 2: Configurar KV namespace + Email binding via dashboard**

Criar KV `SERENA_ACCESS`, copiar ID. Atualizar `r2` no wrangler.jsonc com o ID real.

Em Settings → Workers & Routes, adicionar rota `api.serenamedita.com.br/*`

- [ ] **Step 3: Deploy novamente com binding correto**

```bash
npx wrangler deploy
```

- [ ] **Step 4: Commit**

```bash
git add workers/serena-api/wrangler.jsonc
git commit -m "chore: configure Cloudflare Worker bindings and deploy"
```

---

### Task 6: Deploy Final do Serena + Teste

- [ ] **Step 1: Build + upload FTP**

```bash
cd /Users/iamregis/Documents/Serena && npm run build
# Upload out/ para serenamedita.com.br (via FTP OpenCode ou cPanel)
```

- [ ] **Step 2: Testar fluxo completo**
   - Criar compra teste no Lastlink (modo teste)
   - Verificar se Worker recebe webhook
   - Verificar se e-mail chega com link mágico
   - Clicar no link → página /acessar → redireciona para /app
   - Verificar conteúdo protegido no /app
   - Cancelar assinatura no Lastlink → verificar acesso removido

- [ ] **Step 3: Testar renovação**
   - Simular pagamento recorrente no Lastlink
   - Verificar se Worker estende TTL do token