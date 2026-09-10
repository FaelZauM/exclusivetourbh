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
