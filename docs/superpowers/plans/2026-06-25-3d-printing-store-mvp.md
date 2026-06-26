# Loja de Impressão 3D - Plano de Implementação (MVP)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MVP de e-commerce para venda de produtos impressos em 3D sob demanda, com catálogo de ~10 produtos, carrinho, frete Correios e pagamento via gateway brasileiro.

**Architecture:** Next.js 14 App Router + Server Actions. Dados mockados em JSON para produtos. Carrinho em localStorage + cookies. Frete via API Correios. Pagamento via Mercado Pago/InfinitePay com webhook. Deploy no Vercel.

**Tech Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide React, Zod, Mercado Pago SDK / InfinitePay API

## Global Constraints

- Produtos físicos APENAS (sem arquivos digitais)
- Variação apenas de cor, mesmo preço
- Produção sob demanda (prazo de produção exibido no produto)
- Frete via Correios (PAC/Sedex)
- Gateway de pagamento: Mercado Pago ou InfinitePay
- ~10 produtos no lançamento
- Categorias simples
- Deploy: Vercel

---

## Estrutura de Arquivos

```
src/
  app/
    layout.tsx                # Layout raiz com Header + Footer
    page.tsx                  # Home
    globals.css               # Estilos globais + Tailwind
    catalogo/
      page.tsx                # Catálogo com filtro por categoria
    produto/
      [slug]/
        page.tsx              # Página do produto
    carrinho/
      page.tsx                # Carrinho full page
    checkout/
      page.tsx                # Checkout com formulário e pagamento
      confirmacao/
        page.tsx              # Página de confirmação pós-pagamento
    admin/
      page.tsx                # Lista de pedidos (MVP sem auth)
    api/
      calcular-frete/
        route.ts              # POST - calcula frete por CEP
      webhook/
        route.ts              # POST - recebe confirmação de pagamento
  components/
    Header.tsx                # Logo, navegação, carrinho badge
    Footer.tsx                # Links, contato, redes sociais
    HeroSection.tsx           # Hero da home
    HowItWorks.tsx            # Seção "Como Funciona"
    ProductCard.tsx           # Card de produto no grid
    ColorSelector.tsx         # Bolinhas de seleção de cor
    CepCalculator.tsx         # Input CEP + resultado frete
    CartProvider.tsx          # Context + Provider do carrinho
    CartItem.tsx              # Item individual no carrinho
    CartResume.tsx            # Subtotal, frete, total
    CheckoutForm.tsx          # Formulário de dados + endereço
    OrderSummary.tsx          # Resumo do pedido no checkout
  data/
    products.ts               # Mock: ~10 produtos
    categories.ts             # Mock: categorias
  lib/
    correios.ts               # Funções de consulta Correios
    frete.ts                  # Lógica de cálculo de frete
    payment.ts                # Integração com gateway
    utils.ts                  # Utilitários (formatar moeda, etc.)
  types/
    index.ts                  # Tipos compartilhados
```

---

### Task 1: Setup do Projeto + Tipos + Dados Mockados

**Files:**
- Create: `src/types/index.ts`
- Create: `src/data/categories.ts`
- Create: `src/data/products.ts`
- Create: `src/lib/utils.ts`
- Create: Next.js project scaffold

**Interfaces:**
- Consumes: nothing
- Produces: `types/index.ts` exports `Product`, `Category`, `CartItem`, `Order`, `ShippingOption` types. `data/products.ts` exports `products` array. `data/categories.ts` exports `categories` array.

- [ ] **Step 1: Inicializar Next.js + Tailwind**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

- [ ] **Step 2: Escrever os tipos em `src/types/index.ts`**

```typescript
export type ProductColor = {
  name: string
  hex: string
  imageUrl: string
}

export type Product = {
  id: string
  slug: string
  name: string
  description: string
  category: string
  material: string
  dimensions: string
  weight: number
  basePrice: number
  colors: ProductColor[]
  images: string[]
  estimatedDays: number
}

export type Category = {
  id: string
  name: string
  slug: string
  imageUrl: string
}

export type CartItem = {
  productId: string
  slug: string
  name: string
  color: ProductColor
  quantity: number
  unitPrice: number
  imageUrl: string
}

export type ShippingOption = {
  name: string
  service: "PAC" | "Sedex"
  price: number
  days: number
}

export type OrderStatus = "pending" | "confirmed" | "in_production" | "shipped" | "delivered"

export type Order = {
  id: string
  items: CartItem[]
  customer: {
    name: string
    email: string
    phone: string
  }
  address: {
    cep: string
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
  }
  shipping: ShippingOption
  subtotal: number
  total: number
  status: OrderStatus
  trackingCode?: string
  createdAt: string
}
```

- [ ] **Step 3: Escrever `src/lib/utils.ts`**

```typescript
export function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}
```

- [ ] **Step 4: Escrever dados mockados de categorias em `src/data/categories.ts`**

```typescript
import { Category } from "@/types"

export const categories: Category[] = [
  { id: "decoracao", name: "Decoração", slug: "decoracao", imageUrl: "/images/categories/decoracao.jpg" },
  { id: "utilitarios", name: "Utilitários", slug: "utilitarios", imageUrl: "/images/categories/utilitarios.jpg" },
  { id: "brinquedos", name: "Brinquedos", slug: "brinquedos", imageUrl: "/images/categories/brinquedos.jpg" },
  { id: "acessorios", name: "Acessórios", slug: "acessorios", imageUrl: "/images/categories/acessorios.jpg" },
]
```

- [ ] **Step 5: Escrever dados mockados de produtos em `src/data/products.ts`**

```typescript
import { Product } from "@/types"

export const products: Product[] = [
  {
    id: "vaso-geometrico",
    slug: "vaso-geometrico",
    name: "Vaso Geométrico",
    description: "Vaso decorativo com design geométrico moderno. Perfeito para suculentas e pequenas plantas. Impresso em PLA de alta qualidade com acabamento liso.",
    category: "decoracao",
    material: "PLA",
    dimensions: "10 × 10 × 12 cm",
    weight: 80,
    basePrice: 4500,
    colors: [
      { name: "Preto", hex: "#1a1a1a", imageUrl: "/images/products/vaso-preto.jpg" },
      { name: "Branco", hex: "#f5f5f5", imageUrl: "/images/products/vaso-branco.jpg" },
      { name: "Terracota", hex: "#c26546", imageUrl: "/images/products/vaso-terracota.jpg" },
    ],
    images: ["/images/products/vaso-1.jpg", "/images/products/vaso-2.jpg"],
    estimatedDays: 5,
  },
  {
    id: "suporte-celular",
    slug: "suporte-celular",
    name: "Suporte para Celular",
    description: "Suporte articulado para celular. Ajustável e compacto, ideal para mesa de escritório ou cabeceira.",
    category: "utilitarios",
    material: "PLA",
    dimensions: "8 × 6 × 12 cm",
    weight: 45,
    basePrice: 3500,
    colors: [
      { name: "Preto", hex: "#1a1a1a", imageUrl: "/images/products/suporte-preto.jpg" },
      { name: "Cinza", hex: "#6b7280", imageUrl: "/images/products/suporte-cinza.jpg" },
      { name: "Azul", hex: "#2563eb", imageUrl: "/images/products/suporte-azul.jpg" },
    ],
    images: ["/images/products/suporte-1.jpg"],
    estimatedDays: 3,
  },
  {
    id: "cabo-org",
    slug: "cabo-org",
    name: "Organizador de Cabos",
    description: "Organizador de cabos modular com 3 canais. Mantém sua mesa organizada sem bagunça.",
    category: "utilitarios",
    material: "PLA",
    dimensions: "15 × 5 × 3 cm",
    weight: 35,
    basePrice: 2500,
    colors: [
      { name: "Preto", hex: "#1a1a1a", imageUrl: "/images/products/cabo-preto.jpg" },
      { name: "Branco", hex: "#f5f5f5", imageUrl: "/images/products/cabo-branco.jpg" },
    ],
    images: ["/images/products/cabo-1.jpg"],
    estimatedDays: 3,
  },
  {
    id: "dinossauro",
    slug: "dinossauro",
    name: "Dinossauro Articulado",
    description: "Miniatura de dinossauro com articulações móveis. Brinquedo colecionável impresso em PLA resistente.",
    category: "brinquedos",
    material: "PLA",
    dimensions: "8 × 4 × 6 cm",
    weight: 30,
    basePrice: 2990,
    colors: [
      { name: "Verde", hex: "#16a34a", imageUrl: "/images/products/dino-verde.jpg" },
      { name: "Laranja", hex: "#ea580c", imageUrl: "/images/products/dino-laranja.jpg" },
      { name: "Azul", hex: "#2563eb", imageUrl: "/images/products/dino-azul.jpg" },
    ],
    images: ["/images/products/dino-1.jpg", "/images/products/dino-2.jpg"],
    estimatedDays: 4,
  },
  {
    id: "porta-canetas",
    slug: "porta-canetas",
    name: "Porta Canetas Modular",
    description: "Porta canetas modular que pode ser conectado a outras unidades. Expanda conforme sua necessidade.",
    category: "utilitarios",
    material: "PLA",
    dimensions: "10 × 10 × 10 cm",
    weight: 60,
    basePrice: 3990,
    colors: [
      { name: "Preto", hex: "#1a1a1a", imageUrl: "/images/products/porta-preto.jpg" },
      { name: "Cinza", hex: "#6b7280", imageUrl: "/images/products/porta-cinza.jpg" },
      { name: "Vermelho", hex: "#dc2626", imageUrl: "/images/products/porta-vermelho.jpg" },
    ],
    images: ["/images/products/porta-1.jpg"],
    estimatedDays: 5,
  },
  {
    id: "colar-infinito",
    slug: "colar-infinito",
    name: "Colar Símbolo do Infinito",
    description: "Colar com pingente em formato de infinito. Design elegante disponível em várias cores. Acabamento liso e resistente.",
    category: "acessorios",
    material: "Resina",
    dimensions: "3 × 2 cm (pingente), 45 cm (corrente)",
    weight: 12,
    basePrice: 4990,
    colors: [
      { name: "Branco", hex: "#f5f5f5", imageUrl: "/images/products/colar-branco.jpg" },
      { name: "Rosa", hex: "#ec4899", imageUrl: "/images/products/colar-rosa.jpg" },
      { name: "Preto", hex: "#1a1a1a", imageUrl: "/images/products/colar-preto.jpg" },
    ],
    images: ["/images/products/colar-1.jpg", "/images/products/colar-2.jpg"],
    estimatedDays: 5,
  },
]
```

- [ ] **Step 6: Verificar se compila**

```bash
npm run build
```
Expected: Build succeeds. Warnings about unused imports are OK, errors are not.

---

### Task 2: Layout + Header + Footer

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Create: `src/components/Header.tsx`
- Create: `src/components/Footer.tsx`

**Interfaces:**
- Consumes: `categories` from `@/data/categories`, `CartProvider` (not yet created, will use basic state)
- Produces: Header with navigation + cart badge. Footer with links.

- [ ] **Step 1: Escrever `src/components/Header.tsx`**

```tsx
"use client"

import Link from "next/link"
import { ShoppingBag, Menu, X } from "lucide-react"
import { useState } from "react"
import { categories } from "@/data/categories"

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const cartCount = 0 // será substituído pelo CartProvider

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold tracking-tight">
          🖨️ 3DPrint Store
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            Home
          </Link>
          {categories.slice(0, 4).map((cat) => (
            <Link
              key={cat.id}
              href={`/catalogo?categoria=${cat.slug}`}
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              {cat.name}
            </Link>
          ))}
          <Link href="/catalogo" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            Todos
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/carrinho" className="relative">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[10px] text-white">
                {cartCount}
              </span>
            )}
          </Link>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t md:hidden">
          <nav className="flex flex-col px-4 py-3">
            <Link href="/" className="py-2 text-sm font-medium" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/catalogo?categoria=${cat.slug}`}
                className="py-2 text-sm font-medium"
                onClick={() => setMenuOpen(false)}
              >
                {cat.name}
              </Link>
            ))}
            <Link href="/catalogo" className="py-2 text-sm font-medium" onClick={() => setMenuOpen(false)}>
              Todos os Produtos
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 2: Escrever `src/components/Footer.tsx`**

```tsx
import { Instagram, MessageCircle } from "lucide-react"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              3DPrint Store
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Impressão 3D sob demanda. Produtos exclusivos feitos com tecnologia e cuidado.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Links
            </h3>
            <ul className="mt-2 space-y-1">
              <li>
                <Link href="/catalogo" className="text-sm text-gray-600 hover:text-gray-900">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link href="/carrinho" className="text-sm text-gray-600 hover:text-gray-900">
                  Carrinho
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900">
              Contato
            </h3>
            <div className="mt-2 flex gap-3">
              <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900">
                <MessageCircle className="h-5 w-5" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} 3DPrint Store. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 3: Modificar `src/app/globals.css`** - Adicionar importação do Tailwind (já deve estar no scaffold)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Modificar `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "3DPrint Store - Impressão 3D Sob Demanda",
  description: "Produtos impressos em 3D sob demanda. Decoração, utilitários, brinquedos e acessórios.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Verificar que compila e renderiza**

```bash
npm run build
```
Expected: Build succeeds.

---

### Task 3: CartProvider (Estado Global do Carrinho)

**Files:**
- Create: `src/context/CartContext.tsx`
- Modify: `src/app/layout.tsx` (adicionar provider)
- Modify: `src/components/Header.tsx` (usar contador real)

**Interfaces:**
- Consumes: `CartItem` from `@/types`, `Product` from `@/types`
- Produces: `CartContext` with `items`, `addItem`, `removeItem`, `updateQuantity`, `clearCart`, `subtotal`

- [ ] **Step 1: Criar diretório de context**

```bash
mkdir -p src/context
```

- [ ] **Step 2: Escrever `src/context/CartContext.tsx`**

```tsx
"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { CartItem, Product, ProductColor } from "@/types"

type CartContextType = {
  items: CartItem[]
  addItem: (product: Product, color: ProductColor, quantity?: number) => void
  removeItem: (productId: string, colorName: string) => void
  updateQuantity: (productId: string, colorName: string, quantity: number) => void
  clearCart: () => void
  itemCount: number
  subtotal: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = useCallback((product: Product, color: ProductColor, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && item.color.name === color.name
      )
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id && item.color.name === color.name
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          color,
          quantity,
          unitPrice: product.basePrice,
          imageUrl: product.images[0] ?? color.imageUrl,
        },
      ]
    })
  }, [])

  const removeItem = useCallback((productId: string, colorName: string) => {
    setItems((prev) => prev.filter((item) => !(item.productId === productId && item.color.name === colorName)))
  }, [])

  const updateQuantity = useCallback((productId: string, colorName: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId, colorName)
      return
    }
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId && item.color.name === colorName
          ? { ...item, quantity }
          : item
      )
    )
  }, [removeItem])

  const clearCart = useCallback(() => setItems([]), [])

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
```

- [ ] **Step 3: Modificar `src/app/layout.tsx`** - Adicionar CartProvider

```tsx
import { CartProvider } from "@/context/CartContext"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <CartProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Modificar `src/components/Header.tsx`** - Usar contador real

Substituir `const cartCount = 0` por:
```tsx
const { itemCount } = useCart()
```
E adicionar import: `import { useCart } from "@/context/CartContext"`

- [ ] **Step 5: Build**

```bash
npm run build
```
Expected: Build succeeds.

---

### Task 4: Home Page

**Files:**
- Create: `src/components/HeroSection.tsx`
- Create: `src/components/HowItWorks.tsx`
- Create: `src/components/ProductCard.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `products` from `@/data/products`, `categories` from `@/data/categories`, `useCart` from `@/context/CartContext`
- Produces: Home page fully rendered

- [ ] **Step 1: Escrever `src/components/HeroSection.tsx`**

```tsx
import Link from "next/link"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Impressão 3D
            <br />
            <span className="text-blue-400">Sob Medida</span>
          </h1>
          <p className="mt-4 text-lg text-gray-300">
            Produtos exclusivos impressos em 3D sob encomenda. Do design à sua mão, com qualidade artesanal e tecnologia de ponta.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/catalogo"
              className="rounded-lg bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
            >
              Ver Catálogo
            </Link>
            <Link
              href="#como-funciona"
              className="rounded-lg border border-gray-500 px-6 py-3 text-sm font-semibold text-gray-200 transition hover:border-gray-400 hover:text-white"
            >
              Como Funciona
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Escrever `src/components/HowItWorks.tsx`**

```tsx
import { PackageSearch, ShoppingCart, Truck } from "lucide-react"

const steps = [
  {
    icon: ShoppingCart,
    title: "Escolha",
    description: "Navegue pelo catálogo, escolha seu produto e a cor ideal.",
  },
  {
    icon: PackageSearch,
    title: "Produzimos",
    description: "Imprimimos sob encomenda com cuidado e qualidade.",
  },
  {
    icon: Truck,
    title: "Receba",
    description: "Enviamos pelos Correios direto para você.",
  },
]

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Como Funciona
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-gray-600">
          Simples e transparente. Veja como é fácil ter seu produto impresso em 3D.
        </p>

        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <step.icon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mt-4 text-sm font-bold text-blue-600">PASSO {index + 1}</div>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Escrever `src/components/ProductCard.tsx`**

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { ShoppingBag } from "lucide-react"
import type { Product, ProductColor } from "@/types"
import { formatPrice } from "@/lib/utils"
import { useCart } from "@/context/CartContext"

type Props = {
  product: Product
}

export function ProductCard({ product }: Props) {
  const { addItem } = useCart()
  const [selectedColor, setSelectedColor] = useState<ProductColor>(product.colors[0])

  return (
    <div className="group rounded-lg border bg-white transition hover:shadow-md">
      <Link href={`/produto/${product.slug}`} className="block aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.images[0] ?? "/placeholder.svg"}
          alt={product.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="p-4">
        <p className="text-xs uppercase tracking-wider text-gray-500">{product.material}</p>
        <Link href={`/produto/${product.slug}`}>
          <h3 className="mt-1 font-semibold text-gray-900 hover:text-blue-600">{product.name}</h3>
        </Link>
        <p className="mt-1 text-lg font-bold text-gray-900">{formatPrice(product.basePrice)}</p>

        <div className="mt-3 flex items-center gap-1">
          {product.colors.map((color) => (
            <button
              key={color.name}
              onClick={() => setSelectedColor(color)}
              className={`h-5 w-5 rounded-full border-2 transition ${
                selectedColor.name === color.name ? "border-gray-900" : "border-transparent"
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
        </div>

        <button
          onClick={() => addItem(product, selectedColor)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          <ShoppingBag className="h-4 w-4" />
          Adicionar
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Modificar `src/app/page.tsx`**

```tsx
import Link from "next/link"
import { HeroSection } from "@/components/HeroSection"
import { HowItWorks } from "@/components/HowItWorks"
import { ProductCard } from "@/components/ProductCard"
import { products } from "@/data/products"
import { categories } from "@/data/categories"

export default function HomePage() {
  const featured = products.slice(0, 3)

  return (
    <>
      <HeroSection />
      <HowItWorks />

      {/* Categorias */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Categorias</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/catalogo?categoria=${cat.slug}`}
                className="group relative flex h-40 items-center justify-center overflow-hidden rounded-lg bg-gray-200"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="relative z-10 text-lg font-bold text-white">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Destaques */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Destaques</h2>
            <Link href="/catalogo" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Ver Todos →
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
```

- [ ] **Step 5: Build**

```bash
npm run build
```
Expected: Build succeeds.

---

### Task 5: Catálogo + Filtro por Categoria

**Files:**
- Create: `src/components/ProductGrid.tsx`
- Modify: `src/app/catalogo/page.tsx`

**Interfaces:**
- Consumes: `products` from `@/data/products`, `categories` from `@/data/categories`, `ProductCard` component
- Produces: Catalog page with category filter

- [ ] **Step 1: Escrever `src/components/ProductGrid.tsx`**

```tsx
import type { Product } from "@/types"
import { ProductCard } from "./ProductCard"

type Props = {
  products: Product[]
}

export function ProductGrid({ products }: Props) {
  if (products.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        Nenhum produto encontrado nesta categoria.
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Criar `src/app/catalogo/page.tsx`**

```tsx
"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { products } from "@/data/products"
import { categories } from "@/data/categories"
import { ProductGrid } from "@/components/ProductGrid"

export default function CatalogPage() {
  const searchParams = useSearchParams()
  const activeCategory = searchParams.get("categoria")

  const filtered = activeCategory
    ? products.filter((p) => p.category === activeCategory)
    : products

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Catálogo</h1>
      <p className="mt-2 text-gray-600">
        {filtered.length} produto{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Filtro por categoria */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/catalogo"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            !activeCategory ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Todos
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/catalogo?categoria=${cat.slug}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeCategory === cat.slug ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <ProductGrid products={filtered} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build**

```bash
npm run build
```
Expected: Build succeeds.

---

### Task 6: Página do Produto

**Files:**
- Create: `src/components/ColorSelector.tsx`
- Create: `src/components/CepCalculator.tsx`
- Create: `src/app/produto/[slug]/page.tsx`

**Interfaces:**
- Consumes: `products` from `@/data/products`, `useCart` from `@/context/CartContext`
- Produces: Product detail page with gallery, color selector, CEP calculator

- [ ] **Step 1: Escrever `src/components/ColorSelector.tsx`**

```tsx
import type { ProductColor } from "@/types"

type Props = {
  colors: ProductColor[]
  selected: ProductColor
  onChange: (color: ProductColor) => void
}

export function ColorSelector({ colors, selected, onChange }: Props) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-900">
        Cor: <span className="text-gray-600">{selected.name}</span>
      </p>
      <div className="mt-2 flex gap-2">
        {colors.map((color) => (
          <button
            key={color.name}
            onClick={() => onChange(color)}
            className={`h-8 w-8 rounded-full border-2 transition ${
              selected.name === color.name ? "border-gray-900 ring-2 ring-gray-900 ring-offset-2" : "border-gray-300"
            }`}
            style={{ backgroundColor: color.hex }}
            title={color.name}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Escrever `src/components/CepCalculator.tsx`**

```tsx
"use client"

import { useState } from "react"
import { Search, Loader2 } from "lucide-react"
import type { ShippingOption } from "@/types"
import { formatPrice } from "@/lib/utils"

type Props = {
  productWeight: number
}

export function CepCalculator({ productWeight }: Props) {
  const [cep, setCep] = useState("")
  const [options, setOptions] = useState<ShippingOption[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleCalculate() => {
    const cleanCep = cep.replace(/\D/g, "")
    if (cleanCep.length !== 8) {
      setError("CEP inválido. Digite 8 dígitos.")
      return
    }

    setLoading(true)
    setError("")
    setOptions(null)

    try {
      const res = await fetch("/api/calcular-frete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: cleanCep, weight: productWeight }),
      })

      if (!res.ok) throw new Error("Erro ao calcular frete")

      const data = await res.json()
      setOptions(data)
    } catch {
      setError("Não foi possível calcular o frete. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm font-medium text-gray-900">Calcular Frete</p>

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          placeholder="00000-000"
          value={cep}
          onChange={(e) => setCep(e.target.value.replace(/\D/g, "").slice(0, 8))}
          className="w-32 rounded-lg border px-3 py-2 text-sm"
          maxLength={8}
        />
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Calcular
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {options && options.length > 0 && (
        <div className="mt-3 space-y-2">
          {options.map((opt) => (
            <div key={opt.service} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm">
              <span className="font-medium">{opt.name}</span>
              <span className="text-gray-600">
                até {opt.days} dia{opt.days !== 1 ? "s" : ""} - {formatPrice(opt.price)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Criar `src/app/produto/[slug]/page.tsx`**

```tsx
"use client"

import { useState } from "react"
import { useParams, notFound } from "next/navigation"
import { ShoppingBag, Clock, Ruler, Weight } from "lucide-react"
import { products } from "@/data/products"
import type { ProductColor } from "@/types"
import { formatPrice } from "@/lib/utils"
import { useCart } from "@/context/CartContext"
import { ColorSelector } from "@/components/ColorSelector"
import { CepCalculator } from "@/components/CepCalculator"

export default function ProductPage() {
  const params = useParams()
  const { addItem } = useCart()

  const product = products.find((p) => p.slug === params.slug)
  if (!product) notFound()

  const [selectedColor, setSelectedColor] = useState<ProductColor>(product.colors[0])
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Galeria */}
        <div>
          <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
            <img
              src={product.images[selectedImage] ?? "/placeholder.svg"}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
                    selectedImage === idx ? "border-gray-900" : "border-gray-200"
                  }`}
                >
                  <img src={img ?? "/placeholder.svg"} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-sm uppercase tracking-wider text-gray-500">{product.category}</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">{product.name}</h1>
          <p className="mt-2 text-3xl font-bold text-gray-900">{formatPrice(product.basePrice)}</p>

          <p className="mt-4 text-gray-600">{product.description}</p>

          {/* Especificações */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <Ruler className="mx-auto h-5 w-5 text-gray-500" />
              <p className="mt-1 text-xs text-gray-900">{product.dimensions}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <Weight className="mx-auto h-5 w-5 text-gray-500" />
              <p className="mt-1 text-xs text-gray-900">{product.weight}g</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <Clock className="mx-auto h-5 w-5 text-gray-500" />
              <p className="mt-1 text-xs text-gray-900">{product.estimatedDays} dias</p>
            </div>
          </div>

          {/* Material badge */}
          <div className="mt-4">
            <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
              {product.material}
            </span>
          </div>

          {/* Cor */}
          <div className="mt-6">
            <ColorSelector colors={product.colors} selected={selectedColor} onChange={setSelectedColor} />
          </div>

          {/* Quantidade */}
          <div className="mt-6">
            <p className="text-sm font-medium text-gray-900">Quantidade</p>
            <div className="mt-1 flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="rounded-lg border px-3 py-1.5 text-lg hover:bg-gray-50"
              >
                −
              </button>
              <span className="w-10 text-center text-lg font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="rounded-lg border px-3 py-1.5 text-lg hover:bg-gray-50"
              >
                +
              </button>
            </div>
          </div>

          {/* Frete */}
          <div className="mt-6">
            <CepCalculator productWeight={product.weight * quantity} />
          </div>

          {/* Comprar */}
          <button
            onClick={() => {
              addItem(product, selectedColor, quantity)
              setQuantity(1)
            }}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white transition hover:bg-gray-800"
          >
            <ShoppingBag className="h-5 w-5" />
            Adicionar ao Carrinho
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Build**

```bash
npm run build
```
Expected: Build succeeds.

---

### Task 7: Carrinho

**Files:**
- Create: `src/components/CartItem.tsx`
- Create: `src/components/CartResume.tsx`
- Modify: `src/app/carrinho/page.tsx`

**Interfaces:**
- Consumes: `useCart` from `@/context/CartContext`, `CepCalculator` component
- Produces: Cart page with items, quantities, frete calculation, total

- [ ] **Step 1: Escrever `src/components/CartItem.tsx`**

```tsx
import { Minus, Plus, Trash2 } from "lucide-react"
import type { CartItem as CartItemType } from "@/types"
import { formatPrice } from "@/lib/utils"
import { useCart } from "@/context/CartContext"

type Props = {
  item: CartItemType
}

export function CartItem({ item }: Props) {
  const { updateQuantity, removeItem } = useCart()

  return (
    <div className="flex gap-4 border-b py-4">
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
        <img src={item.imageUrl ?? "/placeholder.svg"} alt={item.name} className="h-full w-full object-cover" />
      </div>

      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
          <p className="text-xs text-gray-500">Cor: {item.color.name}</p>
          <p className="mt-1 text-sm font-semibold">{formatPrice(item.unitPrice)}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateQuantity(item.productId, item.color.name, item.quantity - 1)}
              className="rounded border px-1.5 py-0.5 text-sm hover:bg-gray-50"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-6 text-center text-sm">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.productId, item.color.name, item.quantity + 1)}
              className="rounded border px-1.5 py-0.5 text-sm hover:bg-gray-50"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <button
            onClick={() => removeItem(item.productId, item.color.name)}
            className="text-gray-400 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Escrever `src/components/CartResume.tsx`**

```tsx
"use client"

import { useState, useEffect, use } from "react"
import type { ShippingOption } from "@/types"
import { formatPrice } from "@/lib/utils"
import { useCart } from "@/context/CartContext"
import Link from "next/link"

export function CartResume() {
  const [shipping, setShipping] = useState<ShippingOption | null>(null)
  const [cep, setCep] = useState("")
  const [loading, setLoading] = useState(false)
  const { subtotal, items } = useCart()

  useEffect(() => {
    setShipping(null)
  }, [items])

  async function handleCalculate() {
    const cleanCep = cep.replace(/\D/g, "")
    if (cleanCep.length !== 8 || items.length === 0) return

    setLoading(true)
    try {
      const totalWeight = items.reduce((sum, item) => sum + 80 * item.quantity, 0)
      const res = await fetch("/api/calcular-frete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: cleanCep, weight: totalWeight }),
      })
      const data = await res.json()
      setShipping(data[0] ?? null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const total = subtotal + (shipping?.price ?? 0)

  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-semibold text-gray-900">Resumo</h2>

      {/* CEP */}
      <div className="mt-4">
        <label className="text-sm font-medium text-gray-700">Calcular frete</label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            placeholder="00000-000"
            value={cep}
            onChange={(e) => setCep(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "..." : "OK"}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Frete</span>
          <span className="font-medium">
            {shipping ? `${shipping.name} - ${formatPrice(shipping.price)}` : "Calcular"}
          </span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-bold">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      <Link
        href={items.length > 0 ? "/checkout" : "#"}
        className={`mt-6 flex w-full items-center justify-center rounded-lg px-6 py-3 text-base font-semibold ${
          items.length > 0 ? "bg-blue-600 text-white hover:bg-blue-700" : "cursor-not-allowed bg-gray-200 text-gray-500"
        }`}
      >
        Finalizar Pedido
      </Link>
    </div>
  )
}
```

Wait, this has a bug - CartResume uses `use` incorrectly. Let me fix this. Actually, the component doesn't import or use `use` from React, so remove that import. Let me re-do this properly.

Let me fix CartResume - no `use` import needed.

- [ ] **Step 2 (fixed): Escrever `src/components/CartResume.tsx`**

```tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { ShippingOption } from "@/types"
import { formatPrice } from "@/lib/utils"
import { useCart } from "@/context/CartContext"

export function CartResume() {
  const [shipping, setShipping] = useState<ShippingOption | null>(null)
  const [cep, setCep] = useState("")
  const [loading, setLoading] = useState(false)
  const { subtotal, items } = useCart()

  useEffect(() => {
    setShipping(null)
  }, [items])

  async function handleCalculate() {
    const cleanCep = cep.replace(/\D/g, "")
    if (cleanCep.length !== 8 || items.length === 0) return

    setLoading(true)
    try {
      const totalWeight = items.reduce((sum, item) => sum + 80 * item.quantity, 0)
      const res = await fetch("/api/calcular-frete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: cleanCep, weight: totalWeight }),
      })
      const data = await res.json()
      setShipping(data[0] ?? null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const total = subtotal + (shipping?.price ?? 0)

  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-semibold text-gray-900">Resumo</h2>

      <div className="mt-4">
        <label className="text-sm font-medium text-gray-700">Calcular frete</label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            placeholder="00000-000"
            value={cep}
            onChange={(e) => setCep(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "..." : "OK"}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Frete</span>
          <span className="font-medium">
            {shipping ? `${shipping.name} - ${formatPrice(shipping.price)}` : "Calcular"}
          </span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-bold">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      <Link
        href={items.length > 0 ? "/checkout" : "#"}
        className={`mt-6 flex w-full items-center justify-center rounded-lg px-6 py-3 text-base font-semibold ${
          items.length > 0
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "cursor-not-allowed bg-gray-200 text-gray-500"
        }`}
      >
        Finalizar Pedido
      </Link>
    </div>
  )
}
```

- [ ] **Step 3: Escrever `src/app/carrinho/page.tsx`**

```tsx
"use client"

import Link from "next/link"
import { ShoppingBag } from "lucide-react"
import { useCart } from "@/context/CartContext"
import { CartItem } from "@/components/CartItem"
import { CartResume } from "@/components/CartResume"

export default function CartPage() {
  const { items, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Carrinho Vazio</h1>
        <p className="mt-2 text-gray-600">Adicione produtos ao carrinho para continuar.</p>
        <Link
          href="/catalogo"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Ver Catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Carrinho</h1>
        <button onClick={clearCart} className="text-sm text-red-600 hover:text-red-500">
          Limpar Carrinho
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {items.map((item) => (
            <CartItem key={`${item.productId}-${item.color.name}`} item={item} />
          ))}
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <CartResume />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Build**

```bash
npm run build
```
Expected: Build succeeds.

---

### Task 8: API de Frete + CEP (Correios)

**Files:**
- Create: `src/lib/correios.ts`
- Create: `src/app/api/calcular-frete/route.ts`

**Interfaces:**
- Consumes: nothing
- Produces: POST `/api/calcular-frete` returning `ShippingOption[]`

- [ ] **Step 1: Escrever `src/lib/correios.ts`**

```typescript
import type { ShippingOption } from "@/types"

type CalcularFreteParams = {
  cepOrigem: string
  cepDestino: string
  peso: number
}

export async function calcularFrete(params: CalcularFreteParams): Promise<ShippingOption[]> {
  // TODO: Substituir pela integração real com a API dos Correios (Sigep Web)
  // Por enquanto, retorna simulação baseada nos primeiros dígitos do CEP

  const { cepDestino, peso } = params
  const firstDigit = Number.parseInt(cepDestino[0], 10)

  // Simulação: regiões mais distantes = mais caro e demorado
  const basePrice = 1500 + firstDigit * 200
  const pacDays = 5 + firstDigit
  const sedexDays = 2 + Math.floor(firstDigit / 2)

  const pesoKg = peso / 1000
  const weightMultiplier = Math.max(1, pesoKg * 2)

  return [
    {
      name: "PAC",
      service: "PAC",
      price: Math.round(basePrice * weightMultiplier),
      days: pacDays,
    },
    {
      name: "Sedex",
      service: "Sedex",
      price: Math.round(basePrice * 2 * weightMultiplier),
      days: sedexDays,
    },
  ]
}
```

- [ ] **Step 2: Escrever `src/app/api/calcular-frete/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { calcularFrete } from "@/lib/correios"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { cep, weight } = body

    if (!cep || typeof cep !== "string" || cep.length !== 8) {
      return NextResponse.json({ error: "CEP inválido" }, { status: 400 })
    }

    if (!weight || typeof weight !== "number" || weight <= 0) {
      return NextResponse.json({ error: "Peso inválido" }, { status: 400 })
    }

    const options = await calcularFrete({
      cepOrigem: "01001000", // CEP de origem fixo (alterar conforme endereço real)
      cepDestino: cep,
      peso: weight,
    })

    return NextResponse.json(options)
  } catch {
    return NextResponse.json({ error: "Erro ao calcular frete" }, { status: 500 })
  }
}
```

- [ ] **Step 3: Testar a API**

```bash
curl -X POST http://localhost:3000/api/calcular-frete \
  -H "Content-Type: application/json" \
  -d '{"cep": "01311000", "weight": 200}'
```
Expected: JSON array with PAC and Sedex options.

- [ ] **Step 4: Build**

```bash
npm run build
```
Expected: Build succeeds.

---

### Task 9: Checkout + Formulário + ViaCEP

**Files:**
- Create: `src/components/CheckoutForm.tsx`
- Create: `src/components/OrderSummary.tsx`
- Create: `src/app/checkout/page.tsx`

**Interfaces:**
- Consumes: `useCart` from `@/context/CartContext`, `CartResume` data
- Produces: Checkout page with form, ViaCEP auto-fill, order summary

- [ ] **Step 1: Escrever `src/components/CheckoutForm.tsx`**

```tsx
"use client"

import { useState, useCallback } from "react"

type FormData = {
  name: string
  email: string
  phone: string
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  observation: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

type Props = {
  onSubmit: (data: FormData) => void
  loading?: boolean
}

export function CheckoutForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<FormData>({
    name: "", email: "", phone: "", cep: "",
    street: "", number: "", complement: "",
    neighborhood: "", city: "", state: "",
    observation: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [buscandoCep, setBuscandoCep] = useState(false)

  const handleCepBlur = useCallback(async () => {
    const clean = form.cep.replace(/\D/g, "")
    if (clean.length !== 8) return

    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          street: data.logradouro ?? "",
          neighborhood: data.bairro ?? "",
          city: data.localidade ?? "",
          state: data.uf ?? "",
        }))
      }
    } catch {
      // silent
    } finally {
      setBuscandoCep(false)
    }
  }, [form.cep])

  function validate(): boolean {
    const newErrors: FormErrors = {}
    if (!form.name.trim()) newErrors.name = "Nome é obrigatório"
    if (!form.email.includes("@")) newErrors.email = "E-mail inválido"
    if (form.phone.replace(/\D/g, "").length < 10) newErrors.phone = "Telefone inválido"
    if (form.cep.replace(/\D/g, "").length !== 8) newErrors.cep = "CEP inválido"
    if (!form.street.trim()) newErrors.street = "Rua é obrigatória"
    if (!form.number.trim()) newErrors.number = "Número é obrigatório"
    if (!form.city.trim()) newErrors.city = "Cidade é obrigatória"
    if (!form.state.trim()) newErrors.state = "Estado é obrigatório"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) onSubmit(form)
  }

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900">Dados Pessoais</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">Nome completo</label>
            <input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">E-mail</label>
            <input
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Telefone / WhatsApp</label>
            <input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900">Endereço de Entrega</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-gray-700">CEP</label>
            <input
              value={form.cep}
              onChange={(e) => updateField("cep", e.target.value.replace(/\D/g, "").slice(0, 8))}
              onBlur={handleCepBlur}
              placeholder="00000-000"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
            {buscandoCep && <p className="mt-1 text-xs text-gray-500">Buscando endereço...</p>}
            {errors.cep && <p className="mt-1 text-xs text-red-600">{errors.cep}</p>}
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div>
            <label className="text-sm font-medium text-gray-700">Rua</label>
            <input
              value={form.street}
              onChange={(e) => updateField("street", e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
            {errors.street && <p className="mt-1 text-xs text-red-600">{errors.street}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Número</label>
            <input
              value={form.number}
              onChange={(e) => updateField("number", e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
            {errors.number && <p className="mt-1 text-xs text-red-600">{errors.number}</p>}
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Complemento</label>
            <input
              value={form.complement}
              onChange={(e) => updateField("complement", e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Bairro</label>
            <input
              value={form.neighborhood}
              onChange={(e) => updateField("neighborhood", e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Cidade</label>
              <input
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
              {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">UF</label>
              <input
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
                maxLength={2}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
              {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700">Observação do pedido</label>
          <textarea
            value={form.observation}
            onChange={(e) => updateField("observation", e.target.value)}
            rows={2}
            placeholder="Alguma instrução especial para o pedido?"
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Processando..." : "Ir para Pagamento"}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Escrever `src/components/OrderSummary.tsx`**

```tsx
import { useCart } from "@/context/CartContext"
import { formatPrice } from "@/lib/utils"

type Props = {
  shippingPrice?: number
  shippingName?: string
}

export function OrderSummary({ shippingPrice, shippingName }: Props) {
  const { items, subtotal } = useCart()
  const total = subtotal + (shippingPrice ?? 0)

  return (
    <div className="rounded-lg border p-6">
      <h2 className="text-lg font-semibold text-gray-900">Resumo do Pedido</h2>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={`${item.productId}-${item.color.name}`} className="flex gap-3 text-sm">
            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-100">
              <img src={item.imageUrl ?? "/placeholder.svg"} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{item.name}</p>
              <p className="text-gray-500">Cor: {item.color.name} | Qtd: {item.quantity}</p>
              <p className="font-medium">{formatPrice(item.unitPrice * item.quantity)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1 border-t pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Frete</span>
          <span>{shippingName ? `${shippingName} - ${formatPrice(shippingPrice ?? 0)}` : "A calcular"}</span>
        </div>
        <div className="flex justify-between border-t pt-1 text-base font-bold">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Escrever `src/app/checkout/page.tsx`**

```tsx
"use client"

import { useCart } from "@/context/CartContext"
import { CheckoutForm } from "@/components/CheckoutForm"
import { OrderSummary } from "@/components/OrderSummary"
import Link from "next/link"
import { ShoppingBag } from "lucide-react"

export default function CheckoutPage() {
  const { items } = useCart()

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Carrinho Vazio</h1>
        <p className="mt-2 text-gray-600">Adicione produtos antes de finalizar o pedido.</p>
        <Link
          href="/catalogo"
          className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Ver Catálogo
        </Link>
      </div>
    )
  }

  function handleSubmit(data: any) {
    console.log("Dados do formulário:", data)
    // TODO: Integrar com gateway de pagamento (Task 10)
    // Por ora: redirecionar para página de sucesso simulada
    window.location.href = "/checkout/confirmacao"
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Finalizar Pedido</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <CheckoutForm onSubmit={handleSubmit} />
        <div className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Criar `src/app/checkout/confirmacao/page.tsx`**

```tsx
import Link from "next/link"
import { CheckCircle } from "lucide-react"

export default function ConfirmationPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:px-8">
      <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
      <h1 className="mt-4 text-3xl font-bold text-gray-900">Pedido Confirmado!</h1>
      <p className="mt-3 text-lg text-gray-600">
        Recebemos seu pedido e entraremos em contato para confirmar os detalhes.
      </p>
      <p className="mt-2 text-sm text-gray-500">
        O prazo de produção é de até 5 dias úteis, mais o prazo de envio dos Correios.
      </p>

      <Link
        href="/catalogo"
        className="mt-8 inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Continuar Comprando
      </Link>
    </div>
  )
}
```

- [ ] **Step 5: Build**

```bash
npm run build
```
Expected: Build succeeds.

---

### Task 10: Integração com Gateway de Pagamento

**Files:**
- Create: `src/lib/payment.ts`
- Create: `src/app/api/webhook/route.ts`
- Create: `src/app/api/criar-pagamento/route.ts`
- Modify: `src/app/checkout/page.tsx`

**Interfaces:**
- Consumes: checkout form data + cart data
- Produces: Payment link/redirect, webhook handler

- [ ] **Step 1: Escrever `src/lib/payment.ts`**

```typescript
import type { Order } from "@/types"

export type PaymentResponse = {
  url: string
  paymentId: string
}

/**
 * Cria um pagamento no gateway.
 * 
 * TODO: Substituir pela integração real com Mercado Pago ou InfinitePay.
 * 
 * Mercado Pago: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/reference
 * InfinitePay: https://developers.infinitepay.io/
 */
export async function createPayment(order: Order): Promise<PaymentResponse> {
  // Simulação: retorna um link fictício
  return {
    url: `/checkout/confirmacao?order=${order.id}`,
    paymentId: `pay_${order.id}`,
  }
}

export async function verifyPayment(paymentId: string): Promise<{ status: "approved" | "pending" | "rejected" }> {
  // Simulação
  return { status: "approved" }
}
```

- [ ] **Step 2: Escrever `src/app/api/criar-pagamento/route.ts`**

```typescript
import { NextResponse } from "next/server"
import { createPayment } from "@/lib/payment"
import { generateId } from "@/lib/utils"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, customer, address, shipping, subtotal, total } = body

    const order: any = {
      id: generateId(),
      items,
      customer,
      address,
      shipping,
      subtotal,
      total,
      status: "pending",
      createdAt: new Date().toISOString(),
    }

    const payment = await createPayment(order)

    return NextResponse.json({ ...payment, orderId: order.id })
  } catch {
    return NextResponse.json({ error: "Erro ao criar pagamento" }, { status: 500 })
  }
}
```

- [ ] **Step 3: Escrever `src/app/api/webhook/route.ts`**

```typescript
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // TODO: Validar assinatura HMAC do gateway
    // const signature = request.headers.get("x-signature")
    // verifyHmac(body, signature)

    const { type, data } = body

    if (type === "payment.approved" || type === "payment.created") {
      // TODO: Atualizar status do pedido no banco
      // await updateOrderStatus(data.reference_id, "confirmed")
      console.log(`Pagamento aprovado: ${data.id}`)
    }

    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 })
  }
}
```

- [ ] **Step 4: Modificar `src/app/checkout/page.tsx`** - Conectar formulário ao pagamento

Substituir a função `handleSubmit`:

```tsx
const [loading, setLoading] = useState(false)
const { items, subtotal, clearCart } = useCart()

async function handleSubmit(data: any) {
  setLoading(true)
  try {
    const res = await fetch("/api/criar-pagamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        customer: {
          name: data.name,
          email: data.email,
          phone: data.phone,
        },
        address: {
          cep: data.cep,
          street: data.street,
          number: data.number,
          complement: data.complement,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
        },
        shipping: {
          name: "PAC",
          service: "PAC",
          price: 0,
          days: 5,
        },
        subtotal,
        total: subtotal,
      }),
    })

    const payment = await res.json()
    clearCart()
    window.location.href = payment.url
  } catch (err) {
    console.error(err)
    alert("Erro ao processar pagamento. Tente novamente.")
  } finally {
    setLoading(false)
  }
}
```

- [ ] **Step 5: Build**

```bash
npm run build
```
Expected: Build succeeds.

---

### Task 11: Admin (Lista de Pedidos)

**Files:**
- Create: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: nothing (pedidos mockados por enquanto)
- Produces: Admin page with order list and status management

- [ ] **Step 1: Criar `src/app/admin/page.tsx`**

```tsx
"use client"

import { useState } from "react"
import type { Order, OrderStatus } from "@/types"
import { formatPrice } from "@/lib/utils"

// Dados mockados para demonstração
const mockOrders: Order[] = [
  {
    id: "abc123",
    items: [
      {
        productId: "vaso-geometrico",
        slug: "vaso-geometrico",
        name: "Vaso Geométrico",
        color: { name: "Preto", hex: "#1a1a1a", imageUrl: "" },
        quantity: 2,
        unitPrice: 4500,
        imageUrl: "",
      },
    ],
    customer: { name: "João Silva", email: "joao@email.com", phone: "(11) 99999-9999" },
    address: { cep: "01311000", street: "Av. Paulista", number: "1000", neighborhood: "Bela Vista", city: "São Paulo", state: "SP" },
    shipping: { name: "PAC", service: "PAC", price: 1500, days: 5 },
    subtotal: 9000,
    total: 10500,
    status: "pending",
    createdAt: "2026-06-25T10:00:00Z",
  },
  {
    id: "def456",
    items: [
      {
        productId: "dinossauro",
        slug: "dinossauro",
        name: "Dinossauro Articulado",
        color: { name: "Verde", hex: "#16a34a", imageUrl: "" },
        quantity: 1,
        unitPrice: 2990,
        imageUrl: "",
      },
    ],
    customer: { name: "Maria Santos", email: "maria@email.com", phone: "(11) 98888-8888" },
    address: { cep: "04547000", street: "Rua Funchal", number: "500", neighborhood: "Vila Olímpia", city: "São Paulo", state: "SP" },
    shipping: { name: "Sedex", service: "Sedex", price: 3000, days: 2 },
    subtotal: 2990,
    total: 5990,
    status: "confirmed",
    createdAt: "2026-06-24T15:30:00Z",
  },
]

const statusOptions: OrderStatus[] = ["pending", "confirmed", "in_production", "shipped", "delivered"]

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  in_production: "Em Produção",
  shipped: "Enviado",
  delivered: "Entregue",
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>(mockOrders)
  const [trackingInput, setTrackingInput] = useState<Record<string, string>>({})

  function updateStatus(orderId: string, status: OrderStatus) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)))
  }

  function updateTracking(orderId: string) {
    const code = trackingInput[orderId]
    if (!code) return
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, trackingCode: code, status: "shipped" } : o)))
    setTrackingInput((prev) => ({ ...prev, [orderId]: "" }))
  }

  function statusColor(status: OrderStatus): string {
    const colors: Record<OrderStatus, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      in_production: "bg-purple-100 text-purple-800",
      shipped: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
    }
    return colors[status]
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Admin - Pedidos</h1>
      <p className="mt-1 text-sm text-gray-600">Gerencie os pedidos da loja.</p>

      <div className="mt-8 space-y-4">
        {orders.length === 0 && <p className="text-gray-500">Nenhum pedido ainda.</p>}

        {orders.map((order) => (
          <div key={order.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Pedido #{order.id} - {order.customer.name}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(order.createdAt).toLocaleString("pt-BR")} | {order.items.length} item(ns)
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(order.status)}`}>
                {statusLabels[order.status]}
              </span>
            </div>

            <div className="mt-2 text-xs text-gray-600">
              {order.items.map((item) => (
                <span key={item.productId}>
                  {item.name} (x{item.quantity}) - {item.color.name}
                </span>
              ))}
            </div>

            <div className="mt-2 text-sm font-semibold">
              Total: {formatPrice(order.total)}
              {order.trackingCode && <span className="ml-3 text-gray-500">Rastreio: {order.trackingCode}</span>}
            </div>

            {/* Actions */}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
              <select
                value={order.status}
                onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                className="rounded border px-2 py-1 text-xs"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>

              {order.status !== "delivered" && (
                <div className="flex items-center gap-1">
                  <input
                    placeholder="Código de rastreio"
                    value={trackingInput[order.id] ?? ""}
                    onChange={(e) =>
                      setTrackingInput((prev) => ({ ...prev, [order.id]: e.target.value }))
                    }
                    className="w-40 rounded border px-2 py-1 text-xs"
                  />
                  <button
                    onClick={() => updateTracking(order.id)}
                    className="rounded bg-gray-900 px-2 py-1 text-xs text-white hover:bg-gray-800"
                  >
                    Enviar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: Build succeeds.

---

### Task 12: Placeholder Images + Ajustes Finais

**Files:**
- Create: `public/placeholder.svg`
- Create: `public/images/` estrutura de diretórios

**Interfaces:**
- Consumes: nothing (assets)
- Produces: Placeholder images for dev

- [ ] **Step 1: Criar estrutura de diretórios de imagens**

```bash
mkdir -p public/images/products public/images/categories
```

- [ ] **Step 2: Criar `public/placeholder.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" fill="none" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#f3f4f6"/>
  <path d="M160 160h80v80h-80z" fill="#d1d5db"/>
  <path d="M180 180h40v40h-40z" fill="#9ca3af"/>
  <text x="200" y="220" text-anchor="middle" fill="#6b7280" font-size="14">3D Print</text>
</svg>
```

- [ ] **Step 3: Build final**

```bash
npm run build
```
Expected: Build succeeds without errors.

---

### Task 13: README + Instruções de Deploy

**Files:**
- Create: `README.md` (se não existir)

- [ ] **Step 1: Verificar se README existe, se não, criar**

```bash
ls README.md 2>/dev/null || echo "# 3DPrint Store

Loja virtual para venda de produtos impressos em 3D sob demanda.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Lucide React

## Desenvolvimento

\`\`\`bash
npm install
npm run dev
\`\`\`

## Deploy no Vercel

\`\`\`bash
npx vercel
\`\`\`

## Próximos passos (pós-MVP)

- Integração real com API dos Correios
- Integração real com gateway de pagamento
- Autenticação (NextAuth)
- Área do cliente
- Upload de imagens dos produtos" > README.md
```

- [ ] **Step 2: Build final**

```bash
npm run build
```
Expected: Build succeeds.
