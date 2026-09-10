# PDF/CSV Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PDF and CSV export functionality to the history page with professional layout and charts.

**Architecture:** Client-side generation using pdfMake for PDF, Chart.js for charts, and PapaParse for CSV. All processing happens in the browser.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, pdfMake, Chart.js, PapaParse

## Global Constraints

- Stack: Next.js 16 (static export `output: "export"`), React 19, Supabase, Tailwind CSS v4
- Supabase project: URL `https://hznoclubvewyayiyxnzn.supabase.co`
- Roles: `developer` | `admin` | `driver` | `user`
- PDF: Professional layout with logo, summary, charts, and detailed tables
- CSV: Two separate files (rides and expenses)
- Language: PT-BR
- Period filter: Current month / Custom (start/end month/year)
- Current filters: Keep existing (own/passed, car type, company, expense type)

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Interfaces:**
- Consumes: None
- Produces: Installed pdfMake, Chart.js, PapaParse

- [ ] **Step 1: Install pdfMake**

Run: `npm install pdfmake`
Expected: Package added to package.json

- [ ] **Step 2: Install Chart.js**

Run: `npm install chart.js`
Expected: Package added to package.json

- [ ] **Step 3: Install PapaParse**

Run: `npm install papaparse`
Expected: Package added to package.json

- [ ] **Step 4: Install type definitions**

Run: `npm install -D @types/papaparse`
Expected: Type definitions added

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add pdfMake, chart.js, papaparse dependencies"
```

---

## Task 2: Export Service

**Files:**
- Create: `src/app/taxi/lib/export-service.ts`

**Interfaces:**
- Consumes: `Ride`, `Expense`, `Fuel`, `User` types
- Produces: `generatePDF()`, `generateCSV()`

- [ ] **Step 1: Create export-service.ts**

Create `src/app/taxi/lib/export-service.ts`:

```typescript
"use client"

import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"
import type { TDocumentDefinitions } from "pdfmake/interfaces"
import Papa from "papaparse"
import type { Ride, Expense, Fuel, User } from "./types"

// Register fonts
if (typeof window !== "undefined") {
  ;(pdfMake as any).vfs = pdfFonts.pdfMake.vfs
}

interface ExportData {
  rides: Ride[]
  expenses: Expense[]
  fuels: Fuel[]
  users: User[]
  period: string
  userName: string
}

interface Summary {
  totalBruto: number
  totalLiquido: number
  totalGasolina: number
  totalLiquidoPosGasolina: number
  totalRides: number
  totalExpenses: number
  totalFuels: number
}

export function calculateSummary(
  rides: Ride[],
  expenses: Expense[],
  fuels: Fuel[],
  userId: string
): Summary {
  const totalBruto = rides.reduce((sum, r) => sum + r.value, 0)
  const totalLiquido = rides.reduce((sum, r) => {
    if (r.type === "passed" && r.commission) {
      if (r.user_id === userId) return sum + r.value - r.commission
      return sum + r.commission
    }
    return sum + r.value
  }, 0)
  const totalGasolina = fuels.reduce((sum, f) => sum + f.total_value, 0)
  const totalLiquidoPosGasolina = totalLiquido - totalGasolina

  return {
    totalBruto,
    totalLiquido,
    totalGasolina,
    totalLiquidoPosGasolina,
    totalRides: rides.length,
    totalExpenses: expenses.length,
    totalFuels: fuels.length,
  }
}

export function generatePDF(data: ExportData): void {
  const summary = calculateSummary(data.rides, data.expenses, data.fuels, data.rides[0]?.user_id || "")

  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    content: [
      // Header
      {
        text: "EXCLUSIVEPRO",
        style: "header",
        alignment: "center",
      },
      {
        text: "Relatório de Corridas",
        style: "subheader",
        alignment: "center",
      },
      {
        text: `Período: ${data.period}`,
        style: "period",
        alignment: "center",
      },
      {
        text: `Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,
        style: "date",
        alignment: "center",
      },
      { text: "\n" },

      // Summary
      {
        text: "RESUMO FINANCEIRO",
        style: "sectionHeader",
      },
      {
        table: {
          widths: ["*", "auto"],
          body: [
            ["Faturamento Bruto", `R$ ${summary.totalBruto.toFixed(2)}`],
            ["Faturamento Líquido", `R$ ${summary.totalLiquido.toFixed(2)}`],
            ["(-) Gasolina", `R$ ${summary.totalGasolina.toFixed(2)}`],
            ["Líquido pós-gasolina", `R$ ${summary.totalLiquidoPosGasolina.toFixed(2)}`],
          ],
        },
        layout: "lightHorizontalLines",
      },
      { text: "\n" },

      // Rides table
      {
        text: "DETALHAMENTO DAS CORRIDAS",
        style: "sectionHeader",
      },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "auto", "auto", "auto", "*"],
          body: [
            ["Data", "Tipo", "Categoria", "Valor", "Motorista", "Passageiro"],
            ...data.rides.map((ride) => [
              new Date(ride.ride_date).toLocaleDateString("pt-BR"),
              ride.type === "own" ? "Própria" : "Passada",
              ride.category,
              `R$ ${ride.value.toFixed(2)}`,
              ride.driver_name || "-",
              ride.passenger_name || "-",
            ]),
          ],
        },
        layout: "lightHorizontalLines",
        fontSize: 8,
      },
      { text: "\n" },

      // Expenses table
      ...(data.expenses.length > 0
        ? [
            {
              text: "GASTOS",
              style: "sectionHeader" as const,
            },
            {
              table: {
                headerRows: 1,
                widths: ["auto", "auto", "*", "auto"],
                body: [
                  ["Data", "Categoria", "Descrição", "Valor"],
                  ...data.expenses.map((expense) => [
                    new Date(expense.expense_date).toLocaleDateString("pt-BR"),
                    expense.category,
                    expense.description || "-",
                    `R$ ${expense.value.toFixed(2)}`,
                  ]),
                ],
              },
              layout: "lightHorizontalLines",
              fontSize: 8,
            },
            { text: "\n" },
          ]
        : []),

      // Fuel table
      ...(data.fuels.length > 0
        ? [
            {
              text: "ABASTECIMENTOS",
              style: "sectionHeader" as const,
            },
            {
              table: {
                headerRows: 1,
                widths: ["auto", "auto", "auto", "auto"],
                body: [
                  ["Data", "Litros", "Preço/L", "Total"],
                  ...data.fuels.map((fuel) => [
                    new Date(fuel.fuel_date).toLocaleDateString("pt-BR"),
                    `${fuel.liters || "-"}`,
                    `R$ ${fuel.price_per_liter?.toFixed(2) || "-"}`,
                    `R$ ${fuel.total_value.toFixed(2)}`,
                  ]),
                ],
              },
              layout: "lightHorizontalLines",
              fontSize: 8,
            },
          ]
        : []),
    ],
    styles: {
      header: {
        fontSize: 24,
        bold: true,
        margin: [0, 0, 0, 10],
      },
      subheader: {
        fontSize: 16,
        margin: [0, 0, 0, 5],
      },
      period: {
        fontSize: 12,
        margin: [0, 0, 0, 5],
      },
      date: {
        fontSize: 10,
        color: "#666",
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5],
      },
    },
  }

  pdfMake.createPdf(docDefinition).download(`relatorio-${data.period.replace(/\s/g, "-")}.pdf`)
}

export function generateCSV(data: ExportData): { rides: string; expenses: string } {
  const ridesCSV = Papa.unparse(
    data.rides.map((ride) => ({
      Data: new Date(ride.ride_date).toLocaleDateString("pt-BR"),
      Tipo: ride.type === "own" ? "Própria" : "Passada",
      Categoria: ride.category,
      Valor: ride.value.toFixed(2),
      Comissão: ride.commission?.toFixed(2) || "",
      Motorista: ride.driver_name || "",
      Passageiro: ride.passenger_name || "",
      Empresa: ride.company_name || "",
      Início: ride.start_location || "",
      Destino: ride.end_location || "",
    }))
  )

  const expensesCSV = Papa.unparse(
    data.expenses.map((expense) => ({
      Data: new Date(expense.expense_date).toLocaleDateString("pt-BR"),
      Categoria: expense.category,
      Descrição: expense.description || "",
      Valor: expense.value.toFixed(2),
    }))
  )

  return { rides: ridesCSV, expenses: expensesCSV }
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/taxi/lib/export-service.ts
git commit -m "feat: add export service for PDF and CSV"
```

---

## Task 3: Export Modal Component

**Files:**
- Create: `src/app/taxi/components/ExportModal.tsx`

**Interfaces:**
- Consumes: `generatePDF`, `generateCSV`, `downloadCSV` from export-service
- Produces: `ExportModal` component

- [ ] **Step 1: Create ExportModal.tsx**

Create `src/app/taxi/components/ExportModal.tsx`:

```typescript
"use client"

import { useState } from "react"
import { generatePDF, generateCSV, downloadCSV } from "../lib/export-service"
import type { Ride, Expense, Fuel, User } from "../lib/types"

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  rides: Ride[]
  expenses: Expense[]
  fuels: Fuel[]
  users: User[]
  selectedMonth: number
  selectedYear: number
}

export function ExportModal({
  isOpen,
  onClose,
  rides,
  expenses,
  fuels,
  users,
  selectedMonth,
  selectedYear,
}: ExportModalProps) {
  const [periodType, setPeriodType] = useState<"current" | "custom">("current")
  const [startMonth, setStartMonth] = useState(selectedMonth)
  const [startYear, setStartYear] = useState(selectedYear)
  const [endMonth, setEndMonth] = useState(selectedMonth)
  const [endYear, setEndYear] = useState(selectedYear)
  const [format, setFormat] = useState<"pdf" | "csv">("pdf")
  const [loading, setLoading] = useState(false)

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ]

  const years = [2025, 2026, 2027]

  function getPeriod(): string {
    if (periodType === "current") {
      return `${monthNames[selectedMonth - 1]} ${selectedYear}`
    }
    return `${monthNames[startMonth - 1]} ${startYear} - ${monthNames[endMonth - 1]} ${endYear}`
  }

  function getFilteredRides(): Ride[] {
    if (periodType === "current") {
      return rides.filter((r) => {
        const d = new Date(r.ride_date)
        return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear
      })
    }

    const startDate = new Date(startYear, startMonth - 1, 1)
    const endDate = new Date(endYear, endMonth, 0, 23, 59, 59)

    return rides.filter((r) => {
      const d = new Date(r.ride_date)
      return d >= startDate && d <= endDate
    })
  }

  function getFilteredExpenses(): Expense[] {
    if (periodType === "current") {
      return expenses.filter((e) => {
        const d = new Date(e.expense_date)
        return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear
      })
    }

    const startDate = new Date(startYear, startMonth - 1, 1)
    const endDate = new Date(endYear, endMonth, 0, 23, 59, 59)

    return expenses.filter((e) => {
      const d = new Date(e.expense_date)
      return d >= startDate && d <= endDate
    })
  }

  function getFilteredFuels(): Fuel[] {
    if (periodType === "current") {
      return fuels.filter((f) => {
        const d = new Date(f.fuel_date)
        return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear
      })
    }

    const startDate = new Date(startYear, startMonth - 1, 1)
    const endDate = new Date(endYear, endMonth, 0, 23, 59, 59)

    return fuels.filter((f) => {
      const d = new Date(f.fuel_date)
      return d >= startDate && d <= endDate
    })
  }

  async function handleExport() {
    setLoading(true)

    const period = getPeriod()
    const filteredRides = getFilteredRides()
    const filteredExpenses = getFilteredExpenses()
    const filteredFuels = getFilteredFuels()

    const exportData = {
      rides: filteredRides,
      expenses: filteredExpenses,
      fuels: filteredFuels,
      users,
      period,
      userName: users[0]?.nome || "Usuário",
    }

    if (format === "pdf") {
      generatePDF(exportData)
    } else {
      const { rides: ridesCSV, expenses: expensesCSV } = generateCSV(exportData)
      downloadCSV(ridesCSV, `corridas-${period.replace(/\s/g, "-")}.csv`)
      downloadCSV(expensesCSV, `gastos-${period.replace(/\s/g, "-")}.csv`)
    }

    setLoading(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-semibold text-lg">Exportar Relatório</h3>
          <button onClick={onClose} className="text-taxi-gray-500">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Period Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Período</label>
            <div className="flex gap-2">
              <button
                onClick={() => setPeriodType("current")}
                className={`flex-1 py-2 rounded-lg text-sm ${
                  periodType === "current"
                    ? "bg-taxi-primary text-white"
                    : "bg-taxi-gray-100 text-taxi-gray-600"
                }`}
              >
                Mês Atual
              </button>
              <button
                onClick={() => setPeriodType("custom")}
                className={`flex-1 py-2 rounded-lg text-sm ${
                  periodType === "custom"
                    ? "bg-taxi-primary text-white"
                    : "bg-taxi-gray-100 text-taxi-gray-600"
                }`}
              >
                Personalizado
              </button>
            </div>
          </div>

          {/* Custom Period */}
          {periodType === "custom" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-taxi-gray-500">Início</label>
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                  >
                    {monthNames.map((name, i) => (
                      <option key={i} value={i + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-taxi-gray-500">&nbsp;</label>
                  <select
                    value={startYear}
                    onChange={(e) => setStartYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-taxi-gray-500">Fim</label>
                  <select
                    value={endMonth}
                    onChange={(e) => setEndMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                  >
                    {monthNames.map((name, i) => (
                      <option key={i} value={i + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-taxi-gray-500">&nbsp;</label>
                  <select
                    value={endYear}
                    onChange={(e) => setEndYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Format */}
          <div>
            <label className="block text-sm font-medium mb-2">Formato</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat("pdf")}
                className={`flex-1 py-2 rounded-lg text-sm ${
                  format === "pdf"
                    ? "bg-taxi-primary text-white"
                    : "bg-taxi-gray-100 text-taxi-gray-600"
                }`}
              >
                PDF
              </button>
              <button
                onClick={() => setFormat("csv")}
                className={`flex-1 py-2 rounded-lg text-sm ${
                  format === "csv"
                    ? "bg-taxi-primary text-white"
                    : "bg-taxi-gray-100 text-taxi-gray-600"
                }`}
              >
                CSV
              </button>
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={loading}
            className="w-full py-3 bg-taxi-primary text-white font-medium rounded-xl hover:bg-taxi-primary-dark disabled:opacity-50"
          >
            {loading ? "Exportando..." : "Exportar"}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/taxi/components/ExportModal.tsx
git commit -m "feat: add ExportModal component"
```

---

## Task 4: Update History Page

**Files:**
- Modify: `src/app/taxi/historico/page.tsx`

**Interfaces:**
- Consumes: `ExportModal` component
- Produces: Updated history page with export button

- [ ] **Step 1: Read current historico/page.tsx**

Read `src/app/taxi/historico/page.tsx` to understand current structure.

- [ ] **Step 2: Add imports**

Add to the top of the file:

```typescript
import { ExportModal } from "../components/ExportModal"
```

- [ ] **Step 3: Add state for export modal**

Add after existing state declarations:

```typescript
const [showExportModal, setShowExportModal] = useState(false)
const [allRides, setAllRides] = useState<Ride[]>([])
const [allExpenses, setAllExpenses] = useState<Expense[]>([])
const [allFuels, setAllFuels] = useState<Fuel[]>([])
const [allUsers, setAllUsers] = useState<User[]>([])
```

- [ ] **Step 4: Fetch all data for export**

Add a new function to fetch all data:

```typescript
async function fetchAllData() {
  if (!user) return

  const { data: ridesData } = await getSupabase()
    .from("rides")
    .select("*")
    .eq("user_id", user.id)

  const { data: expensesData } = await getSupabase()
    .from("expenses")
    .select("*")
    .eq("user_id", user.id)

  const { data: fuelsData } = await getSupabase()
    .from("fuel")
    .select("*")
    .eq("user_id", user.id)

  const { data: usersData } = await getSupabase()
    .from("users")
    .select("*")

  setAllRides(ridesData || [])
  setAllExpenses(expensesData || [])
  setAllFuels(fuelsData || [])
  setAllUsers(usersData || [])
}
```

- [ ] **Step 5: Call fetchAllData on mount**

Add to the existing useEffect:

```typescript
useEffect(() => {
  if (user) {
    fetchRides()
    fetchGoals()
    fetchExpenses()
    fetchRentalRates()
    fetchAllData()
  }
}, [user, selectedMonth, selectedYear])
```

- [ ] **Step 6: Add export button**

Add after the header:

```tsx
<div className="flex justify-between items-center mb-6">
  <h2 className="text-xl font-bold">Histórico</h2>
  <button
    onClick={() => setShowExportModal(true)}
    className="px-4 py-2 bg-taxi-primary text-white text-sm font-medium rounded-xl"
  >
    📄 Exportar
  </button>
</div>
```

- [ ] **Step 7: Add ExportModal**

Add before the closing `</main>` tag:

```tsx
<ExportModal
  isOpen={showExportModal}
  onClose={() => setShowExportModal(false)}
  rides={allRides}
  expenses={allExpenses}
  fuels={allFuels}
  users={allUsers}
  selectedMonth={selectedMonth}
  selectedYear={selectedYear}
/>
```

- [ ] **Step 8: Verify TypeScript compiles**

Run: `npm run build`
Expected: No type errors

- [ ] **Step 9: Commit**

```bash
git add src/app/taxi/historico/page.tsx
git commit -m "feat: add export button to history page"
```

---

## Task 5: Final Testing and Deploy

**Files:**
- None (testing and deployment)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Working PDF/CSV export feature

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 2: Test locally**

Test the following flows:
1. Login as any user
2. Go to Histórico tab
3. Click "Exportar" button
4. Select "Mês Atual" → PDF → Export
5. Verify PDF downloads with correct data
6. Select "Personalizado" → set start/end → CSV → Export
7. Verify CSV downloads with correct data
8. Test with different filters (own/passed, car type, etc)

- [ ] **Step 3: Deploy to Vercel**

Run: `vercel deploy --prod --yes`

- [ ] **Step 4: Verify in production**

Test all flows in production environment.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete PDF/CSV export system"
```
