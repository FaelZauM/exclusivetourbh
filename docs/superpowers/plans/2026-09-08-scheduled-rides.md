# Scheduled Rides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a ride scheduling system with automatic notifications before the scheduled time.

**Architecture:** New `scheduled_rides` table with RLS policies, new `notifications` table for in-app notifications, UI components for scheduling and viewing notifications, and a service layer for notification logic.

**Tech Stack:** Next.js 16, React 19, Supabase (PostgreSQL + RLS), Tailwind CSS v4

## Global Constraints

- Stack: Next.js 16 (static export `output: "export"`), React 19, Supabase, Tailwind CSS v4
- Supabase project: URL `https://hznoclubvewyayiyxnzn.supabase.co`
- Roles: `developer` | `admin` | `driver` | `user`
- Ride categories: `app` | `taximeter` | `cooperative` | `private` | `invoiced`
- Scheduled ride categories: `cooperative` | `private` | `invoiced` (no app/taximeter)
- Notification timing: own = 1 hour before, passed = 15 minutes before
- Permission: Corridas tab = all users, Aluguel tab = owner only (admin)

---

## Task 1: Database Setup

**Files:**
- Create: SQL statements to run in Supabase Dashboard

**Interfaces:**
- Consumes: None
- Produces: `scheduled_rides` table, `notifications` table, RLS policies

- [ ] **Step 1: Create scheduled_rides table**

Run in Supabase Dashboard → SQL Editor:

```sql
CREATE TABLE scheduled_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('own', 'passed')),
  category TEXT NOT NULL CHECK (category IN ('cooperative', 'private', 'invoiced')),
  value DECIMAL(10,2) NOT NULL,
  commission DECIMAL(10,2),
  driver_name TEXT,
  passenger_name TEXT,
  company_name TEXT,
  dispatcher_name TEXT,
  start_location TEXT,
  end_location TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'notified', 'completed', 'cancelled')),
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

- [ ] **Step 2: Enable RLS and create policies for scheduled_rides**

```sql
ALTER TABLE scheduled_rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled rides" ON scheduled_rides
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled rides" ON scheduled_rides
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled rides" ON scheduled_rides
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled rides" ON scheduled_rides
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all scheduled rides" ON scheduled_rides
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'developer'))
  );
```

- [ ] **Step 3: Create notifications table**

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

- [ ] **Step 4: Enable RLS and create policies for notifications**

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);
```

- [ ] **Step 5: Create indexes**

```sql
CREATE INDEX idx_scheduled_rides_status ON scheduled_rides(status);
CREATE INDEX idx_scheduled_rides_date ON scheduled_rides(scheduled_date);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
```

- [ ] **Step 6: Grant permissions**

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON scheduled_rides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON scheduled_rides TO authenticated;
GRANT ALL ON scheduled_rides TO service_role;

GRANT SELECT, INSERT, UPDATE ON notifications TO anon;
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT ALL ON notifications TO service_role;
```

- [ ] **Step 7: Verify tables exist**

Check in Supabase Dashboard → Table Editor that both tables appear with correct columns.

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/app/taxi/lib/types.ts`

**Interfaces:**
- Consumes: None
- Produces: `ScheduledRide`, `Notification` types

- [ ] **Step 1: Read current types.ts**

Read `src/app/taxi/lib/types.ts` to understand existing structure.

- [ ] **Step 2: Add ScheduledRide type**

Add to `src/app/taxi/lib/types.ts`:

```typescript
export interface ScheduledRide {
  id: string
  user_id: string
  type: "own" | "passed"
  category: "cooperative" | "private" | "invoiced"
  value: number
  commission: number | null
  driver_name: string | null
  passenger_name: string | null
  company_name: string | null
  dispatcher_name: string | null
  start_location: string | null
  end_location: string | null
  scheduled_date: string
  status: "scheduled" | "notified" | "completed" | "cancelled"
  notified_at: string | null
  created_at: string
  user_email?: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  created_at: string
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/app/taxi/lib/types.ts
git commit -m "feat: add ScheduledRide and Notification types"
```

---

## Task 3: Notification Service

**Files:**
- Create: `src/app/taxi/lib/notification-service.ts`

**Interfaces:**
- Consumes: `ScheduledRide`, `Notification` types, `getSupabase`
- Produces: `checkAndSendNotifications()`, `getUserNotifications()`, `markNotificationRead()`, `getUnreadCount()`

- [ ] **Step 1: Create notification-service.ts**

Create `src/app/taxi/lib/notification-service.ts`:

```typescript
"use client"

import { getSupabase } from "./supabase"
import type { ScheduledRide, Notification } from "./types"

export async function checkAndSendNotifications(): Promise<number> {
  const now = new Date()
  const ownThreshold = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour
  const passedThreshold = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutes

  const { data: scheduledRides } = await getSupabase()
    .from("scheduled_rides")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_date", ownThreshold.toISOString())

  if (!scheduledRides || scheduledRides.length === 0) return 0

  let notifiedCount = 0

  for (const ride of scheduledRides) {
    const rideDate = new Date(ride.scheduled_date)
    const timeDiff = rideDate.getTime() - now.getTime()
    
    let shouldNotify = false
    let title = ""
    let message = ""

    if (ride.type === "own" && timeDiff <= 60 * 60 * 1000 && timeDiff > 0) {
      shouldNotify = true
      title = "Corrida agendada"
      message = "Seu atendimento começa em 1 hora"
    } else if (ride.type === "passed" && timeDiff <= 15 * 60 * 1000 && timeDiff > 0) {
      shouldNotify = true
      title = "Corrida agendada"
      message = `Nos próximos 15 minutos, o motorista ${ride.driver_name || "definido"} irá realizar o seu atendimento`
    }

    if (shouldNotify) {
      // Create in-app notification
      await getSupabase().from("notifications").insert({
        user_id: ride.user_id,
        title,
        message,
        type: "scheduled_ride",
      })

      // Update ride status
      await getSupabase()
        .from("scheduled_rides")
        .update({ status: "notified", notified_at: now.toISOString() })
        .eq("id", ride.id)

      notifiedCount++
    }
  }

  return notifiedCount
}

export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const { data } = await getSupabase()
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)

  return data || []
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await getSupabase()
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false)

  return count || 0
}

export async function markNotificationRead(id: string): Promise<void> {
  await getSupabase()
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
}

export async function markAllAsRead(userId: string): Promise<void> {
  await getSupabase()
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/taxi/lib/notification-service.ts
git commit -m "feat: add notification service for scheduled rides"
```

---

## Task 4: ScheduledRideForm Component

**Files:**
- Create: `src/app/taxi/components/ScheduledRideForm.tsx`

**Interfaces:**
- Consumes: `useAuth`, `getSupabase`, `ScheduledRide` type
- Produces: `ScheduledRideForm` component

- [ ] **Step 1: Create ScheduledRideForm.tsx**

Create `src/app/taxi/components/ScheduledRideForm.tsx`:

```typescript
"use client"

import { useState } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import type { RideCategory, RideType } from "../lib/types"

interface ScheduledRideFormProps {
  onSuccess: () => void
  type?: RideType
}

export function ScheduledRideForm({ onSuccess, type: defaultType = "own" }: ScheduledRideFormProps) {
  const { user } = useAuth()
  const [type, setType] = useState<RideType>(defaultType)
  const [category, setCategory] = useState<RideCategory>("private")
  const [value, setValue] = useState("")
  const [commission, setCommission] = useState("")
  const [driverName, setDriverName] = useState("")
  const [passengerName, setPassengerName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [dispatcherName, setDispatcherName] = useState("")
  const [startLocation, setStartLocation] = useState("")
  const [endLocation, setEndLocation] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("")
  const [loading, setLoading] = useState(false)

  const showLocations = ["cooperative", "invoiced", "private"].includes(category)
  const showCommission = type === "passed"
  const showDispatcher = category === "cooperative"
  const showCompanyName = category === "invoiced"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !scheduledDate || !scheduledTime) return

    setLoading(true)

    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`).toISOString()

    const { error } = await getSupabase().from("scheduled_rides").insert({
      user_id: user.id,
      type,
      category,
      value: parseFloat(value),
      commission: showCommission && commission ? parseFloat(commission) : null,
      driver_name: showCommission ? driverName : null,
      passenger_name: passengerName || null,
      company_name: showCompanyName ? companyName : null,
      dispatcher_name: showDispatcher ? dispatcherName : null,
      start_location: showLocations ? startLocation : null,
      end_location: showLocations ? endLocation : null,
      scheduled_date: scheduledDateTime,
    })

    setLoading(false)

    if (!error) {
      onSuccess()
      resetForm()
    }
  }

  function resetForm() {
    setType(defaultType)
    setCategory("private")
    setValue("")
    setCommission("")
    setDriverName("")
    setPassengerName("")
    setCompanyName("")
    setDispatcherName("")
    setStartLocation("")
    setEndLocation("")
    setScheduledDate("")
    setScheduledTime("")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-taxi-gray-50 rounded-xl">
      <h3 className="font-semibold">Agendar Corrida</h3>
      
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("own")}
          className={`flex-1 py-2 rounded-lg ${
            type === "own" ? "bg-taxi-primary text-white" : "bg-white border border-taxi-gray-200"
          }`}
        >
          Particular
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
          <option value="cooperative">Cooperativa</option>
          <option value="private">Particular</option>
          <option value="invoiced">Faturado</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Data</label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Hora</label>
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
            required
          />
        </div>
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
            <label className="block text-sm font-medium mb-1">Valor do Motorista (R$)</label>
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

      {showCompanyName && (
        <div>
          <label className="block text-sm font-medium mb-1">Nome da Empresa (opcional)</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-4 py-3 border border-taxi-gray-200 rounded-xl"
          />
        </div>
      )}

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
        {loading ? "Agendando..." : "Agendar Corrida"}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/taxi/components/ScheduledRideForm.tsx
git commit -m "feat: add ScheduledRideForm component"
```

---

## Task 5: ScheduledRidesList Component

**Files:**
- Create: `src/app/taxi/components/ScheduledRidesList.tsx`

**Interfaces:**
- Consumes: `useAuth`, `getSupabase`, `ScheduledRide` type
- Produces: `ScheduledRidesList` component

- [ ] **Step 1: Create ScheduledRidesList.tsx**

Create `src/app/taxi/components/ScheduledRidesList.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import type { ScheduledRide } from "../lib/types"

interface ScheduledRidesListProps {
  refreshKey?: number
}

export function ScheduledRidesList({ refreshKey }: ScheduledRidesListProps) {
  const { user } = useAuth()
  const [rides, setRides] = useState<ScheduledRide[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchScheduledRides()
  }, [user, refreshKey])

  async function fetchScheduledRides() {
    if (!user) return

    setLoading(true)
    const { data } = await getSupabase()
      .from("scheduled_rides")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["scheduled", "notified"])
      .order("scheduled_date", { ascending: true })

    setRides(data || [])
    setLoading(false)
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancelar este agendamento?")) return
    await getSupabase()
      .from("scheduled_rides")
      .update({ status: "cancelled" })
      .eq("id", id)
    fetchScheduledRides()
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const categoryLabels: Record<string, string> = {
    cooperative: "Cooperativa",
    private: "Particular",
    invoiced: "Faturado",
  }

  if (loading) {
    return <p className="text-center text-taxi-gray-500 py-4">Carregando agendamentos...</p>
  }

  if (rides.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-3">📅 Agendamentos</h3>
      <div className="space-y-2">
        {rides.map((ride) => (
          <div
            key={ride.id}
            className="p-3 bg-white border border-taxi-gray-200 rounded-xl"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">
                  {formatDate(ride.scheduled_date)}
                </p>
                <p className="text-xs text-taxi-gray-500">
                  {categoryLabels[ride.category]} • R$ {ride.value.toFixed(2)}
                </p>
                {ride.passenger_name && (
                  <p className="text-xs text-taxi-gray-500">
                    Passageiro: {ride.passenger_name}
                  </p>
                )}
                {ride.status === "notified" && (
                  <span className="text-xs text-taxi-success">Notificado</span>
                )}
              </div>
              <button
                onClick={() => handleCancel(ride.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        ))}
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
git add src/app/taxi/components/ScheduledRidesList.tsx
git commit -m "feat: add ScheduledRidesList component"
```

---

## Task 6: NotificationBadge Component

**Files:**
- Create: `src/app/taxi/components/NotificationBadge.tsx`

**Interfaces:**
- Consumes: `useAuth`, `getUnreadCount` from notification-service
- Produces: `NotificationBadge` component

- [ ] **Step 1: Create NotificationBadge.tsx**

Create `src/app/taxi/components/NotificationBadge.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../lib/auth-context"
import { getUnreadCount } from "../lib/notification-service"

export function NotificationBadge() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (user) {
      fetchCount()
      const interval = setInterval(fetchCount, 30000) // Check every 30s
      return () => clearInterval(interval)
    }
  }, [user])

  async function fetchCount() {
    if (!user) return
    const unreadCount = await getUnreadCount(user.id)
    setCount(unreadCount)
  }

  if (count === 0) return null

  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
      {count > 9 ? "9+" : count}
    </span>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/taxi/components/NotificationBadge.tsx
git commit -m "feat: add NotificationBadge component"
```

---

## Task 7: NotificationsList Component

**Files:**
- Create: `src/app/taxi/components/NotificationsList.tsx`

**Interfaces:**
- Consumes: `useAuth`, notification-service functions
- Produces: `NotificationsList` component

- [ ] **Step 1: Create NotificationsList.tsx**

Create `src/app/taxi/components/NotificationsList.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../lib/auth-context"
import { getUserNotifications, markNotificationRead, markAllAsRead } from "../lib/notification-service"
import type { Notification } from "../lib/types"

interface NotificationsListProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationsList({ isOpen, onClose }: NotificationsListProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user && isOpen) fetchNotifications()
  }, [user, isOpen])

  async function fetchNotifications() {
    if (!user) return
    setLoading(true)
    const data = await getUserNotifications(user.id)
    setNotifications(data)
    setLoading(false)
  }

  async function handleMarkRead(id: string) {
    await markNotificationRead(id)
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }

  async function handleMarkAllRead() {
    if (!user) return
    await markAllAsRead(user.id)
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
          <div className="flex gap-2">
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-taxi-primary"
            >
              Marcar todas como lidas
            </button>
            <button onClick={onClose} className="text-taxi-gray-500">
              ✕
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-center text-taxi-gray-500">Carregando...</p>
          ) : notifications.length === 0 ? (
            <p className="text-center text-taxi-gray-500">Nenhuma notificação</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.read && handleMarkRead(notif.id)}
                  className={`p-3 rounded-xl cursor-pointer ${
                    notif.read ? "bg-taxi-gray-50" : "bg-blue-50 border border-blue-200"
                  }`}
                >
                  <p className="font-medium text-sm">{notif.title}</p>
                  <p className="text-xs text-taxi-gray-600">{notif.message}</p>
                  <p className="text-xs text-taxi-gray-400 mt-1">
                    {formatDate(notif.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
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
git add src/app/taxi/components/NotificationsList.tsx
git commit -m "feat: add NotificationsList component"
```

---

## Task 8: Update Header with Notifications

**Files:**
- Modify: `src/app/taxi/components/Header.tsx`

**Interfaces:**
- Consumes: `NotificationBadge`, `NotificationsList`
- Produces: Updated Header with notification bell

- [ ] **Step 1: Read current Header.tsx**

Read `src/app/taxi/components/Header.tsx` to understand current structure.

- [ ] **Step 2: Update Header.tsx**

Replace `src/app/taxi/components/Header.tsx` with:

```typescript
"use client"

import { useState } from "react"
import { useAuth } from "../lib/auth-context"
import { NotificationBadge } from "./NotificationBadge"
import { NotificationsList } from "./NotificationsList"

export function Header() {
  const { user, signOut } = useAuth()
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <>
      <header className="sticky top-0 bg-white dark:bg-gray-900 border-b border-taxi-gray-200 dark:border-gray-700 px-4 py-3 z-50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg dark:text-white">ExclusivePro</h1>
            {user && (
              <p className="text-xs text-taxi-gray-500 dark:text-gray-400">{user.nome}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative text-taxi-gray-500 hover:text-taxi-gray-900"
            >
              🔔
              <NotificationBadge />
            </button>
            <button
              onClick={signOut}
              className="text-sm text-taxi-gray-500 dark:text-gray-400 hover:text-taxi-gray-900 dark:hover:text-white"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      
      <NotificationsList
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/app/taxi/components/Header.tsx
git commit -m "feat: add notification bell to Header"
```

---

## Task 9: Update Corridas Page

**Files:**
- Modify: `src/app/taxi/corridas/page.tsx`

**Interfaces:**
- Consumes: `ScheduledRideForm`, `ScheduledRidesList`
- Produces: Updated Corridas page with scheduling

- [ ] **Step 1: Read current corridas/page.tsx**

Read `src/app/taxi/corridas/page.tsx` to understand current structure.

- [ ] **Step 2: Update corridas/page.tsx**

Add imports and components to the Corridas page:

```typescript
import { ScheduledRideForm } from "../components/ScheduledRideForm"
import { ScheduledRidesList } from "../components/ScheduledRidesList"
```

Add state for refresh:

```typescript
const [refreshKey, setRefreshKey] = useState(0)
```

Add scheduling section before the ride form:

```tsx
<ScheduledRidesList refreshKey={refreshKey} />

<div className="mb-6">
  <ScheduledRideForm 
    onSuccess={() => setRefreshKey(k => k + 1)} 
  />
</div>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/app/taxi/corridas/page.tsx
git commit -m "feat: add scheduling to Corridas page"
```

---

## Task 10: Update Aluguel Page

**Files:**
- Modify: `src/app/taxi/aluguel/page.tsx`

**Interfaces:**
- Consumes: `ScheduledRideForm`, `ScheduledRidesList`, `useAuth`
- Produces: Updated Aluguel page with scheduling (owner only)

- [ ] **Step 1: Read current aluguel/page.tsx**

Read `src/app/taxi/aluguel/page.tsx` to understand current structure.

- [ ] **Step 2: Update aluguel/page.tsx**

Add imports:

```typescript
import { ScheduledRideForm } from "../components/ScheduledRideForm"
import { ScheduledRidesList } from "../components/ScheduledRidesList"
```

Add state for refresh:

```typescript
const [refreshKey, setRefreshKey] = useState(0)
```

Add scheduling section (only for owner/admin):

```tsx
{user?.role === "admin" && (
  <>
    <ScheduledRidesList refreshKey={refreshKey} />
    
    <div className="mb-6">
      <ScheduledRideForm 
        type="passed"
        onSuccess={() => setRefreshKey(k => k + 1)} 
      />
    </div>
  </>
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/app/taxi/aluguel/page.tsx
git commit -m "feat: add scheduling to Aluguel page (owner only)"
```

---

## Task 11: Add Notification Check Interval

**Files:**
- Modify: `src/app/taxi/layout.tsx`

**Interfaces:**
- Consumes: `checkAndSendNotifications` from notification-service
- Produces: Periodic notification check

- [ ] **Step 1: Read current layout.tsx**

Read `src/app/taxi/layout.tsx` to understand current structure.

- [ ] **Step 2: Add notification check to AuthGuard**

In the `AuthGuard` component, add a useEffect to check notifications periodically:

```typescript
import { checkAndSendNotifications } from "./lib/notification-service"

// Add inside AuthGuard, after the existing useEffects
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
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/app/taxi/layout.tsx
git commit -m "feat: add periodic notification check"
```

---

## Task 12: Final Testing and Deploy

**Files:**
- None (testing and deployment)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Working scheduled rides feature

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: No errors

- [ ] **Step 2: Test locally**

Test the following flows:
1. Login as any user
2. Go to Corridas tab
3. Click "Agendar Corrida"
4. Fill form and submit
5. Verify ride appears in ScheduledRidesList
6. Click notification bell in Header
7. Verify NotificationsList opens
8. Test cancel functionality

- [ ] **Step 3: Deploy to Vercel**

Run: `vercel deploy --prod --yes`

- [ ] **Step 4: Verify in production**

Test all flows in production environment.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete scheduled rides system with notifications"
```
