"use client"

import pdfMake from "pdfmake/build/pdfmake"
import pdfFonts from "pdfmake/build/vfs_fonts"
import type { TDocumentDefinitions } from "pdfmake/interfaces"
import Papa from "papaparse"
import type { Ride, Expense, Fuel, User } from "./types"

// Register fonts
if (typeof window !== "undefined") {
  pdfMake.addVirtualFileSystem(pdfFonts)
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

function getCategoryLabelPtBr(category: string): string {
  const labels: Record<string, string> = {
    app: "App",
    taximeter: "Taxímetro",
    cooperative: "Cooperativa",
    private: "Particular",
    invoiced: "Faturado",
  }
  return labels[category] || category
}

function getExpenseCategoryLabelPtBr(category: string): string {
  const labels: Record<string, string> = {
    fuel: "Combustível",
    wash: "Lavagem",
    food: "Alimentação",
    maintenance: "Manutenção",
    other: "Outros",
    km_tracking: "Rastreamento KM",
  }
  return labels[category] || category
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
  
  // Gasolina vem da tabela fuels E dos gastos com category "fuel"
  const totalFromFuels = fuels.reduce((sum, f) => sum + f.total_value, 0)
  const totalFromExpenses = expenses
    .filter((e) => e.category === "fuel")
    .reduce((sum, e) => sum + e.value, 0)
  const totalGasolina = totalFromFuels + totalFromExpenses
  
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
              getCategoryLabelPtBr(ride.category),
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
                    getExpenseCategoryLabelPtBr(expense.category),
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
      Categoria: getCategoryLabelPtBr(ride.category),
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
      Categoria: getExpenseCategoryLabelPtBr(expense.category),
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
