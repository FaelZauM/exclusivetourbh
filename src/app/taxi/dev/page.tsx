"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../lib/auth-context"
import { getSupabase } from "../lib/supabase"
import type { Ride, Expense, Fuel, User, RentalRate } from "../lib/types"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

type Tab = "users" | "rides" | "expenses" | "fuel" | "rent" | "graphics" | "accounts"

export default function DevPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>("users")
  const [users, setUsers] = useState<User[]>([])
  const [rides, setRides] = useState<(Ride & { user_email?: string })[]>([])
  const [expenses, setExpenses] = useState<(Expense & { user_email?: string })[]>([])
  const [fuel, setFuel] = useState<(Fuel & { user_email?: string })[]>([])
  const [rentalRates, setRentalRates] = useState<(RentalRate & { user_email?: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [editingRide, setEditingRide] = useState<Ride | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editingFuel, setEditingFuel] = useState<Fuel | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editUserName, setEditUserName] = useState("")
  const [editUserRole, setEditUserRole] = useState("user")
  const [searchUser, setSearchUser] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [dateStart, setDateStart] = useState("")
  const [dateEnd, setDateEnd] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [valueMin, setValueMin] = useState("")
  const [valueMax, setValueMax] = useState("")

  const fetchData = useCallback(async () => {
    if (!user || user.role !== "developer") return

    const [usersRes, ridesRes, expensesRes, fuelRes, rentalRatesRes] = await Promise.all([
      getSupabase().from("users").select("id,nome,email,role,status,created_at").order("created_at", { ascending: false }),
      getSupabase().from("rides").select("id,user_id,value,commission,ride_date,category,type,added_by_admin,passenger_name,company_name,created_at").order("ride_date", { ascending: false }).limit(200),
      getSupabase().from("expenses").select("id,user_id,value,category,expense_date,created_at").order("expense_date", { ascending: false }).limit(200),
      getSupabase().from("fuel").select("id,user_id,total_value,fuel_date,created_at").order("fuel_date", { ascending: false }).limit(200),
      getSupabase().from("rental_rates").select("id,user_id,daily_rate,month,year,created_at").order("created_at", { ascending: false }),
    ])

    const usersList = usersRes.data || []
    setUsers(usersList)

    const userMap = new Map(usersList.map((u) => [u.id, u.email]))

    setRides((ridesRes.data || []).map((r) => ({ ...r, user_email: userMap.get(r.user_id) || "?" })))
    setExpenses((expensesRes.data || []).map((e) => ({ ...e, user_email: userMap.get(e.user_id) || "?" })))
    setFuel((fuelRes.data || []).map((f) => ({ ...f, user_email: userMap.get(f.user_id) || "?" })))
    setRentalRates((rentalRatesRes.data || []).map((r) => ({ ...r, user_email: userMap.get(r.user_id) || "?" })))
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Real-time subscriptions
  useEffect(() => {
    if (!user || user.role !== "developer") return

    const ridesSub = getSupabase()
      .channel("dev-rides")
      .on("postgres_changes", { event: "*", schema: "public", table: "rides" }, () => fetchData())
      .subscribe()

    const expensesSub = getSupabase()
      .channel("dev-expenses")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => fetchData())
      .subscribe()

    const fuelSub = getSupabase()
      .channel("dev-fuel")
      .on("postgres_changes", { event: "*", schema: "public", table: "fuel" }, () => fetchData())
      .subscribe()

    const rentalRatesSub = getSupabase()
      .channel("dev-rental-rates")
      .on("postgres_changes", { event: "*", schema: "public", table: "rental_rates" }, () => fetchData())
      .subscribe()

    return () => {
      ridesSub.unsubscribe()
      expensesSub.unsubscribe()
      fuelSub.unsubscribe()
      rentalRatesSub.unsubscribe()
    }
  }, [user, fetchData])

  async function handleDeleteRide(id: string) {
    if (!confirm("Excluir esta corrida?")) return
    await getSupabase().from("rides").delete().eq("id", id)
    fetchData()
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm("Excluir este gasto?")) return
    await getSupabase().from("expenses").delete().eq("id", id)
    fetchData()
  }

  async function handleDeleteFuel(id: string) {
    if (!confirm("Excluir este abastecimento?")) return
    await getSupabase().from("fuel").delete().eq("id", id)
    fetchData()
  }

  async function handleDeleteRentalRate(id: string) {
    if (!confirm("Excluir esta diária?")) return
    await getSupabase().from("rental_rates").delete().eq("id", id)
    fetchData()
  }

  async function handleApproveUser(id: string) {
    await getSupabase().from("users").update({ status: "approved" }).eq("id", id)
    fetchData()
  }

  async function handleRejectUser(id: string) {
    await getSupabase().from("users").update({ status: "rejected" }).eq("id", id)
    fetchData()
  }

  async function handleDeleteUser(id: string) {
    if (!confirm("Excluir este usuário?")) return
    await getSupabase().from("users").delete().eq("id", id)
    fetchData()
  }

  async function handleUpdateUserName() {
    if (!editingUser || !editUserName.trim()) return
    await getSupabase().from("users").update({ nome: editUserName.trim(), role: editUserRole }).eq("id", editingUser.id)
    setEditingUser(null)
    fetchData()
  }

  async function handleUpdateRide() {
    if (!editingRide) return
    await getSupabase().from("rides").update({
      value: editingRide.value,
      commission: editingRide.commission,
      category: editingRide.category,
      car_type: editingRide.car_type,
      passenger_name: editingRide.passenger_name,
      driver_name: editingRide.driver_name,
      company_name: editingRide.company_name,
    }).eq("id", editingRide.id)
    setEditingRide(null)
    fetchData()
  }

  async function handleUpdateExpense() {
    if (!editingExpense) return
    await getSupabase().from("expenses").update({
      value: editingExpense.value,
      category: editingExpense.category,
      description: editingExpense.description,
    }).eq("id", editingExpense.id)
    setEditingExpense(null)
    fetchData()
  }

  async function handleUpdateFuel() {
    if (!editingFuel) return
    await getSupabase().from("fuel").update({
      total_value: editingFuel.total_value,
      liters: editingFuel.liters,
    }).eq("id", editingFuel.id)
    setEditingFuel(null)
    fetchData()
  }

  if (user?.role !== "developer") {
    return (
      <main className="p-4">
        <p className="text-center text-red-500">Acesso negado. Conta de desenvolvedor necessária.</p>
      </main>
    )
  }

  const filteredUsers = users.filter((u) =>
    u.email?.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.nome?.toLowerCase().includes(searchUser.toLowerCase())
  )

  const filteredRides = rides.filter((r) => {
    if (selectedUserId && r.user_id !== selectedUserId) return false
    if (searchUser && !r.user_email?.toLowerCase().includes(searchUser.toLowerCase())) return false
    if (dateStart && new Date(r.ride_date) < new Date(dateStart)) return false
    if (dateEnd && new Date(r.ride_date) > new Date(dateEnd + "T23:59:59")) return false
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false
    if (valueMin && r.value < parseFloat(valueMin)) return false
    if (valueMax && r.value > parseFloat(valueMax)) return false
    return true
  })

  const filteredExpenses = expenses.filter((e) => {
    if (selectedUserId && e.user_id !== selectedUserId) return false
    if (searchUser && !e.user_email?.toLowerCase().includes(searchUser.toLowerCase())) return false
    if (dateStart && new Date(e.expense_date) < new Date(dateStart)) return false
    if (dateEnd && new Date(e.expense_date) > new Date(dateEnd + "T23:59:59")) return false
    if (valueMin && e.value < parseFloat(valueMin)) return false
    if (valueMax && e.value > parseFloat(valueMax)) return false
    return true
  })

  const filteredFuel = fuel.filter((f) => {
    if (selectedUserId && f.user_id !== selectedUserId) return false
    if (searchUser && !f.user_email?.toLowerCase().includes(searchUser.toLowerCase())) return false
    if (dateStart && new Date(f.fuel_date) < new Date(dateStart)) return false
    if (dateEnd && new Date(f.fuel_date) > new Date(dateEnd + "T23:59:59")) return false
    if (valueMin && f.total_value < parseFloat(valueMin)) return false
    if (valueMax && f.total_value > parseFloat(valueMax)) return false
    return true
  })

  const filteredRentalRates = rentalRates.filter((r) => {
    if (selectedUserId && r.user_id !== selectedUserId) return false
    if (searchUser && !r.user_email?.toLowerCase().includes(searchUser.toLowerCase())) return false
    if (valueMin && r.daily_rate < parseFloat(valueMin)) return false
    if (valueMax && r.daily_rate > parseFloat(valueMax)) return false
    return true
  })

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "accounts", label: "👤 Contas", count: users.filter((u) => u.status === "pending").length },
    { key: "users", label: "Usuários", count: users.length },
    { key: "rides", label: "Corridas", count: rides.length },
    { key: "expenses", label: "Gastos", count: expenses.length },
    { key: "fuel", label: "Combustível", count: fuel.length },
    { key: "rent", label: "Diárias", count: rentalRates.length },
    { key: "graphics", label: "📊 Gráficos", count: 0 },
  ]

  return (
    <main className="p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">🛠️ Developer Dashboard</h1>
        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">🟢 Tempo Real</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
              tab === t.key
                ? "bg-taxi-primary text-white"
                : "bg-taxi-gray-100 text-taxi-gray-600"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Filtrar por email ou nome..."
        value={searchUser}
        onChange={(e) => { setSearchUser(e.target.value); setSelectedUserId(null) }}
        className="w-full px-4 py-2 border border-taxi-gray-200 rounded-xl mb-2 text-sm"
      />

      {/* User Filter */}
      <select
        value={selectedUserId || ""}
        onChange={(e) => { setSelectedUserId(e.target.value || null); setSearchUser("") }}
        className="w-full px-4 py-2 border border-taxi-gray-200 rounded-xl mb-2 text-sm bg-white"
      >
        <option value="">Todos os usuários</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.nome} ({u.email})</option>
        ))}
      </select>

      {/* Date & Value Filters */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-xs text-taxi-gray-500">Data início</label>
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="w-full px-3 py-2 border border-taxi-gray-200 rounded-xl text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-taxi-gray-500">Data fim</label>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="w-full px-3 py-2 border border-taxi-gray-200 rounded-xl text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <label className="text-xs text-taxi-gray-500">Valor mínimo</label>
          <input
            type="number"
            value={valueMin}
            onChange={(e) => setValueMin(e.target.value)}
            placeholder="R$ 0"
            className="w-full px-3 py-2 border border-taxi-gray-200 rounded-xl text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-taxi-gray-500">Valor máximo</label>
          <input
            type="number"
            value={valueMax}
            onChange={(e) => setValueMax(e.target.value)}
            placeholder="R$ 9999"
            className="w-full px-3 py-2 border border-taxi-gray-200 rounded-xl text-sm"
          />
        </div>
      </div>

      {/* Category Filter (only for rides) */}
      {tab === "rides" && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {(["all", "app", "taximeter", "cooperative", "private", "invoiced"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                categoryFilter === c
                  ? "bg-taxi-primary text-white"
                  : "bg-taxi-gray-100 text-taxi-gray-600"
              }`}
            >
              {c === "all" ? "Todas" : c === "app" ? "App" : c === "taximeter" ? "Taxímetro" : c === "cooperative" ? "Cooperativa" : c === "private" ? "Particular" : "Faturado"}
            </button>
          ))}
        </div>
      )}

      {/* Clear Filters */}
      {(selectedUserId || dateStart || dateEnd || valueMin || valueMax || categoryFilter !== "all") && (
        <button
          onClick={() => {
            setSelectedUserId(null)
            setDateStart("")
            setDateEnd("")
            setValueMin("")
            setValueMax("")
            setCategoryFilter("all")
          }}
          className="w-full py-2 mb-4 text-sm text-taxi-primary font-medium"
        >
          Limpar filtros
        </button>
      )}

      {loading ? (
        <p className="text-center text-taxi-gray-500">Carregando...</p>
      ) : (
        <>
          {/* ACCOUNTS */}
          {tab === "accounts" && (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <p className="text-sm text-orange-800">
                  <strong>{users.filter((u) => u.status === "pending").length}</strong> contas aguardando aprovação
                </p>
              </div>

              {users.filter((u) => u.status === "pending").length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-orange-600">⏳ Pendentes</h3>
                  <div className="space-y-2">
                    {users.filter((u) => u.status === "pending").map((u) => (
                      <div key={u.id} className="p-3 bg-white border border-orange-200 rounded-xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{u.nome}</p>
                            <p className="text-xs text-taxi-gray-500">{u.email}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveUser(u.id)}
                              className="px-3 py-1 bg-taxi-success text-white text-xs rounded-full"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleRejectUser(u.id)}
                              className="px-3 py-1 bg-red-500 text-white text-xs rounded-full"
                            >
                              Rejeitar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">✅ Aprovados</h3>
                <div className="space-y-2">
                  {users.filter((u) => u.status === "approved" || u.status === undefined).map((u) => (
                    <div key={u.id} className="p-3 bg-white border border-taxi-gray-200 rounded-xl">
                      {editingUser?.id === u.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editUserName}
                            onChange={(e) => setEditUserName(e.target.value)}
                            className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                            placeholder="Nome"
                          />
                          <select
                            value={editUserRole}
                            onChange={(e) => setEditUserRole(e.target.value)}
                            className="w-full px-3 py-2 border border-taxi-gray-200 rounded-lg text-sm"
                          >
                            <option value="user">Usuário</option>
                            <option value="driver">Motorista</option>
                            <option value="admin">Admin</option>
                            <option value="developer">Developer</option>
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={handleUpdateUserName}
                              className="flex-1 py-1 bg-taxi-success text-white text-xs rounded-lg"
                            >
                              Salvar
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="flex-1 py-1 bg-taxi-gray-200 text-taxi-gray-600 text-xs rounded-lg"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{u.nome}</p>
                            <p className="text-xs text-taxi-gray-500">{u.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              u.role === "developer" ? "bg-purple-100 text-purple-800" :
                              u.role === "admin" ? "bg-blue-100 text-blue-800" :
                              u.role === "driver" ? "bg-green-100 text-green-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {u.role}
                            </span>
                            <button
                              onClick={() => { setEditingUser(u); setEditUserName(u.nome); setEditUserRole(u.role || "user") }}
                              className="text-xs text-taxi-primary"
                            >
                              Editar
                            </button>
                            {u.role !== "developer" && u.role !== "admin" && (
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="text-xs text-red-500"
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {users.filter((u) => u.status === "rejected").length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-600">❌ Rejeitados</h3>
                  <div className="space-y-2">
                    {users.filter((u) => u.status === "rejected").map((u) => (
                      <div key={u.id} className="p-3 bg-white border border-red-200 rounded-xl opacity-60">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{u.nome}</p>
                            <p className="text-xs text-taxi-gray-500">{u.email}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveUser(u.id)}
                              className="px-3 py-1 bg-taxi-success text-white text-xs rounded-full"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="px-3 py-1 bg-red-500 text-white text-xs rounded-full"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* USERS */}
          {tab === "users" && (
            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div key={u.id} className="p-3 bg-white border border-taxi-gray-200 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{u.nome}</p>
                      <p className="text-xs text-taxi-gray-500">{u.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      u.role === "developer" ? "bg-purple-100 text-purple-800" :
                      u.role === "admin" ? "bg-blue-100 text-blue-800" :
                      u.role === "driver" ? "bg-green-100 text-green-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {u.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* RIDES */}
          {tab === "rides" && (
            <div className="space-y-2">
              {filteredRides.map((r) => (
                <div key={r.id} className="p-3 bg-white border border-taxi-gray-200 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{r.category}</span>
                        {r.car_type && (
                          <span className="text-xs bg-gray-100 px-1 rounded">{r.car_type}</span>
                        )}
                      </div>
                      <p className="text-xs text-taxi-gray-500">
                        {new Date(r.ride_date).toLocaleDateString("pt-BR")} • {r.user_email}
                      </p>
                      {r.driver_name && <p className="text-xs text-taxi-gray-500">Motorista: {r.driver_name}</p>}
                      {r.passenger_name && <p className="text-xs text-taxi-gray-500">Passageiro: {r.passenger_name}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-taxi-success">R$ {r.value.toFixed(2)}</p>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => setEditingRide(r)} className="text-xs text-taxi-primary">Editar</button>
                        <button onClick={() => handleDeleteRide(r.id)} className="text-xs text-red-500">Excluir</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EXPENSES */}
          {tab === "expenses" && (
            <div className="space-y-2">
              {filteredExpenses.map((e) => (
                <div key={e.id} className="p-3 bg-white border border-taxi-gray-200 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{e.category}</p>
                      <p className="text-xs text-taxi-gray-500">
                        {new Date(e.expense_date).toLocaleDateString("pt-BR")} • {e.user_email}
                      </p>
                      {e.description && <p className="text-xs text-taxi-gray-500">{e.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-taxi-danger">R$ {e.value.toFixed(2)}</p>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => setEditingExpense(e)} className="text-xs text-taxi-primary">Editar</button>
                        <button onClick={() => handleDeleteExpense(e.id)} className="text-xs text-red-500">Excluir</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FUEL */}
          {tab === "fuel" && (
            <div className="space-y-2">
              {filteredFuel.map((f) => (
                <div key={f.id} className="p-3 bg-white border border-taxi-gray-200 rounded-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">⛽ Combustível</p>
                      <p className="text-xs text-taxi-gray-500">
                        {new Date(f.fuel_date).toLocaleDateString("pt-BR")} • {f.user_email}
                      </p>
                      {f.liters && <p className="text-xs text-taxi-gray-500">{f.liters}L</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-taxi-danger">R$ {f.total_value.toFixed(2)}</p>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => setEditingFuel(f)} className="text-xs text-taxi-primary">Editar</button>
                        <button onClick={() => handleDeleteFuel(f.id)} className="text-xs text-red-500">Excluir</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* RENT */}
          {tab === "rent" && (
            <div className="space-y-2">
              {filteredRentalRates.map((r) => {
                const now = new Date()
                const daysInMonth = new Date(r.year, r.month, 0).getDate()
                const total = r.daily_rate * daysInMonth
                return (
                  <div key={r.id} className="p-3 bg-white border border-taxi-gray-200 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">🚕 Diária de Aluguel</p>
                        <p className="text-xs text-taxi-gray-500">
                          {r.user_email} • {String(r.month).padStart(2, "0")}/{r.year}
                        </p>
                        <p className="text-xs text-taxi-gray-500">
                          R$ {r.daily_rate.toFixed(2)}/dia × {daysInMonth} dias
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">R$ {total.toFixed(2)}</p>
                        <button onClick={() => handleDeleteRentalRate(r.id)} className="text-xs text-red-500">Excluir</button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {filteredRentalRates.length === 0 && (
                <p className="text-center text-taxi-gray-500 py-4">Nenhuma diária configurada.</p>
              )}
            </div>
          )}

          {/* GRAPHICS */}
          {tab === "graphics" && (
            <div className="space-y-6">
              {/* Earnings by user */}
              <div className="bg-white border border-taxi-gray-200 rounded-xl p-4">
                <h3 className="font-semibold mb-4">💰 Ganhos por Usuário</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(() => {
                    const map = new Map<string, { nome: string; ganhos: number; gastos: number }>()
                    users.forEach((u) => map.set(u.id, { nome: u.nome, ganhos: 0, gastos: 0 }))
                    filteredRides.forEach((r) => {
                      const entry = map.get(r.user_id)
                      if (entry) entry.ganhos += r.value
                    })
                    return Array.from(map.values()).filter((d) => d.ganhos > 0 || d.gastos > 0)
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="ganhos" name="Ganhos" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Expenses by user */}
              <div className="bg-white border border-taxi-gray-200 rounded-xl p-4">
                <h3 className="font-semibold mb-4">💸 Gastos por Usuário</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(() => {
                    const map = new Map<string, { nome: string; gastos: number; combustivel: number; aluguel: number }>()
                    users.forEach((u) => map.set(u.id, { nome: u.nome, gastos: 0, combustivel: 0, aluguel: 0 }))
                    filteredExpenses.forEach((e) => {
                      const entry = map.get(e.user_id)
                      if (entry) entry.gastos += e.value
                    })
                    filteredFuel.forEach((f) => {
                      const entry = map.get(f.user_id)
                      if (entry) entry.combustivel += f.total_value
                    })
                    filteredRentalRates.forEach((r) => {
                      const entry = map.get(r.user_id)
                      if (entry) {
                        const daysInMonth = new Date(r.year, r.month, 0).getDate()
                        entry.aluguel += r.daily_rate * daysInMonth
                      }
                    })
                    return Array.from(map.values()).filter((d) => d.gastos > 0 || d.combustivel > 0 || d.aluguel > 0)
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="gastos" name="Gastos" fill="#ef4444" />
                    <Bar dataKey="combustivel" name="Combustível" fill="#f97316" />
                    <Bar dataKey="aluguel" name="Aluguel" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Profit by user */}
              <div className="bg-white border border-taxi-gray-200 rounded-xl p-4">
                <h3 className="font-semibold mb-4">📈 Lucro por Usuário (Ganhos - Gastos)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(() => {
                    const map = new Map<string, { nome: string; lucro: number }>()
                    users.forEach((u) => map.set(u.id, { nome: u.nome, lucro: 0 }))
                    filteredRides.forEach((r) => {
                      const entry = map.get(r.user_id)
                      if (entry) entry.lucro += r.value
                    })
                    filteredExpenses.forEach((e) => {
                      const entry = map.get(e.user_id)
                      if (entry) entry.lucro -= e.value
                    })
                    filteredFuel.forEach((f) => {
                      const entry = map.get(f.user_id)
                      if (entry) entry.lucro -= f.total_value
                    })
                    filteredRentalRates.forEach((r) => {
                      const entry = map.get(r.user_id)
                      if (entry) {
                        const daysInMonth = new Date(r.year, r.month, 0).getDate()
                        entry.lucro -= r.daily_rate * daysInMonth
                      }
                    })
                    return Array.from(map.values()).filter((d) => d.lucro !== 0)
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="lucro" name="Lucro" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie chart - category distribution */}
              <div className="bg-white border border-taxi-gray-200 rounded-xl p-4">
                <h3 className="font-semibold mb-4">🏷️ Corridas por Categoria</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={(() => {
                        const map = new Map<string, number>()
                        filteredRides.forEach((r) => {
                          map.set(r.category, (map.get(r.category) || 0) + 1)
                        })
                        return Array.from(map.entries()).map(([name, value]) => ({
                          name: name === "app" ? "App" : name === "taximeter" ? "Taxímetro" : name === "cooperative" ? "Cooperativa" : name === "private" ? "Particular" : "Faturado",
                          value
                        }))
                      })()}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444"].map((color, i) => (
                        <Cell key={i} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* EDIT MODALS */}
      {editingRide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm space-y-3">
            <h3 className="font-bold">Editar Corrida</h3>
            <input type="number" value={editingRide.value} onChange={(e) => setEditingRide({ ...editingRide, value: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Valor" />
            <input type="number" value={editingRide.commission || ""} onChange={(e) => setEditingRide({ ...editingRide, commission: parseFloat(e.target.value) || undefined })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Comissão" />
            <input type="text" value={editingRide.driver_name || ""} onChange={(e) => setEditingRide({ ...editingRide, driver_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Motorista" />
            <input type="text" value={editingRide.passenger_name || ""} onChange={(e) => setEditingRide({ ...editingRide, passenger_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Passageiro" />
            <div className="flex gap-2">
              <button onClick={() => setEditingRide(null)} className="flex-1 py-2 bg-taxi-gray-200 rounded-xl text-sm">Cancelar</button>
              <button onClick={handleUpdateRide} className="flex-1 py-2 bg-taxi-primary text-white rounded-xl text-sm">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {editingExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm space-y-3">
            <h3 className="font-bold">Editar Gasto</h3>
            <input type="number" value={editingExpense.value} onChange={(e) => setEditingExpense({ ...editingExpense, value: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Valor" />
            <input type="text" value={editingExpense.description || ""} onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Descrição" />
            <div className="flex gap-2">
              <button onClick={() => setEditingExpense(null)} className="flex-1 py-2 bg-taxi-gray-200 rounded-xl text-sm">Cancelar</button>
              <button onClick={handleUpdateExpense} className="flex-1 py-2 bg-taxi-primary text-white rounded-xl text-sm">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {editingFuel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm space-y-3">
            <h3 className="font-bold">Editar Combustível</h3>
            <input type="number" value={editingFuel.total_value} onChange={(e) => setEditingFuel({ ...editingFuel, total_value: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Valor" />
            <input type="number" value={editingFuel.liters || ""} onChange={(e) => setEditingFuel({ ...editingFuel, liters: parseFloat(e.target.value) || undefined })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Litros" />
            <div className="flex gap-2">
              <button onClick={() => setEditingFuel(null)} className="flex-1 py-2 bg-taxi-gray-200 rounded-xl text-sm">Cancelar</button>
              <button onClick={handleUpdateFuel} className="flex-1 py-2 bg-taxi-primary text-white rounded-xl text-sm">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
