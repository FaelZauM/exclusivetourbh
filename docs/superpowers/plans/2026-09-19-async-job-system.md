# Async Job System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move heavy synchronous operations (Notion import, PDF export, batch notifications) to an async job system with status tracking, retries, and observability.

**Architecture:** Supabase `jobs` table as the queue. A lightweight `JobService` manages creation, polling, and result storage. Heavy operations create a job row, process in the background, and update status. Client polls for completion. Small operations (single inserts, small queries) remain synchronous.

**Tech Stack:** Supabase (PostgreSQL + client), Next.js API routes, pdfmake, PapaParse

## Global Constraints

- Next.js 16 static export (`output: "export"`) — no server-side cron, no Node.js worker processes
- All background work runs client-side via `Promise` + `setTimeout` polling
- Supabase is the only backend — no Redis, no BullMQ, no external job broker
- Roles: `developer` | `admin` | `driver` | `user`
- Toast notifications via `useToast()` hook
- All Supabase queries are client-side (no DataLoader/eager loading)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/app/taxi/lib/job-service.ts` | Job CRUD: create, update, poll, get result |
| `src/app/taxi/components/JobProgress.tsx` | Reusable progress indicator component |
| `src/app/taxi/lib/notification-service.ts` | Refactor to use job system for batch processing |
| `src/app/taxi/lib/export-service.ts` | Refactor PDF generation to yield to main thread |
| `src/app/taxi/lib/notion-service.ts` | Refactor import to use job system |
| `src/app/taxi/config/page.tsx` | Parallelize export data fetch |
| `src/app/taxi/metas/page.tsx` | Parallelize 4 sequential queries |
| `src/app/taxi/investimento/page.tsx` | Add date filter to unbounded query |

---

## Operations Classification

### Move to Job System (heavy, user-initiated, >2s)
1. **Notion Import** — N+1 API calls + sequential upserts (15-45s)
2. **PDF Export** — blocks main thread (1-10s)

### Keep Synchronous (fast, simple)
- Single ride/expense inserts (~100-300ms)
- Auth flow (~300ms)
- Individual page data fetches (already parallelized)
- CSV export (<100ms)

### Refactor In-Place (parallelize, add error handling)
- Notification batch processing (add try/catch, batch inserts)
- Metas page sequential queries (parallelize)
- Investimento unbounded query (add date filter)
- Convites accept (add error handling)

---

### Task 1: Create Job Service

**Files:**
- Create: `src/app/taxi/lib/job-service.ts`

**Interfaces:**
- Consumes: `getSupabase()` from `src/app/taxi/lib/supabase.ts`
- Produces: `JobService` with `createJob`, `updateJob`, `getJob`, `pollJob`, `getJobResult`

**Job States:** `pending` → `running` → `completed` | `failed`

- [ ] **Step 1: Create job-service.ts**

```typescript
import { getSupabase } from "./supabase"

export type JobStatus = "pending" | "running" | "completed" | "failed"
export type JobType = "notion_import" | "pdf_export" | "notification_batch"

export interface Job {
  id: string
  user_id: string
  type: JobType
  status: JobStatus
  progress: number // 0-100
  total_items: number
  processed_items: number
  result: Record<string, unknown> | null
  error: string | null
  created_at: string
  updated_at: string
}

export interface CreateJobInput {
  user_id: string
  type: JobType
  total_items?: number
}

class JobService {
  async createJob(input: CreateJobInput): Promise<Job> {
    const { data, error } = await getSupabase()
      .from("jobs")
      .insert({
        user_id: input.user_id,
        type: input.type,
        status: "pending",
        progress: 0,
        total_items: input.total_items || 0,
        processed_items: 0,
        result: null,
        error: null,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create job: ${error.message}`)
    return data
  }

  async updateJob(
    id: string,
    updates: Partial<Pick<Job, "status" | "progress" | "total_items" | "processed_items" | "result" | "error">>
  ): Promise<void> {
    const { error } = await getSupabase()
      .from("jobs")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) throw new Error(`Failed to update job: ${error.message}`)
  }

  async getJob(id: string): Promise<Job | null> {
    const { data, error } = await getSupabase()
      .from("jobs")
      .select("*")
      .eq("id", id)
      .single()

    if (error) return null
    return data
  }

  async pollJob(
    id: string,
    onProgress?: (job: Job) => void,
    intervalMs = 1000,
    maxAttempts = 300
  ): Promise<Job> {
    let attempts = 0

    return new Promise((resolve, reject) => {
      const check = async () => {
        attempts++
        const job = await this.getJob(id)

        if (!job) {
          reject(new Error("Job not found"))
          return
        }

        onProgress?.(job)

        if (job.status === "completed") {
          resolve(job)
          return
        }

        if (job.status === "failed") {
          reject(new Error(job.error || "Job failed"))
          return
        }

        if (attempts >= maxAttempts) {
          reject(new Error("Job polling timeout"))
          return
        }

        setTimeout(check, intervalMs)
      }

      check()
    })
  }

  async getUserJobs(
    userId: string,
    type?: JobType,
    limit = 10
  ): Promise<Job[]> {
    let query = getSupabase()
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (type) {
      query = query.eq("type", type)
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch jobs: ${error.message}`)
    return data || []
  }
}

export const jobService = new JobService()
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -20`
Expected: Compiles successfully (job-service.ts is standalone, no imports from it yet)

- [ ] **Step 3: Commit**

```bash
git add src/app/taxi/lib/job-service.ts
git commit -m "feat: add job service for async operation tracking"
```

---

### Task 2: Create JobProgress Component

**Files:**
- Create: `src/app/taxi/components/JobProgress.tsx`

**Interfaces:**
- Consumes: `Job` type from `job-service.ts`, `useToast` from `toast-context.tsx`
- Produces: `<JobProgress>` component

- [ ] **Step 1: Create JobProgress.tsx**

```tsx
"use client"

import { useState, useEffect } from "react"
import { jobService, type Job } from "../lib/job-service"
import { useToast } from "../lib/toast-context"

interface JobProgressProps {
  jobId: string
  onComplete?: (job: Job) => void
  onError?: (error: string) => void
  pollIntervalMs?: number
}

export function JobProgress({
  jobId,
  onComplete,
  onError,
  pollIntervalMs = 1500,
}: JobProgressProps) {
  const { showToast } = useToast()
  const [job, setJob] = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const result = await jobService.pollJob(
          jobId,
          (j) => {
            if (!cancelled) setJob(j)
          },
          pollIntervalMs
        )
        if (!cancelled) {
          setJob(result)
          onComplete?.(result)
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Job failed"
          setError(msg)
          onError?.(msg)
        }
      }
    }

    poll()
    return () => { cancelled = true }
  }, [jobId, pollIntervalMs, onComplete, onError])

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
        <p className="text-sm text-red-600 font-medium">Erro</p>
        <p className="text-xs text-red-500 mt-1">{error}</p>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="p-4 bg-taxi-gray-50 rounded-xl">
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-taxi-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-taxi-gray-500">Iniciando...</span>
        </div>
      </div>
    )
  }

  const statusMessages: Record<string, string> = {
    pending: "Na fila...",
    running: job.total_items > 0
      ? `Processando ${job.processed_items}/${job.total_items}...`
      : "Processando...",
    completed: "Concluido!",
    failed: "Falhou",
  }

  return (
    <div className="p-4 bg-taxi-gray-50 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{statusMessages[job.status]}</span>
        {job.status === "running" && (
          <span className="text-xs text-taxi-gray-500">{job.progress}%</span>
        )}
      </div>
      {job.status === "running" && (
        <div className="w-full bg-taxi-gray-200 rounded-full h-2">
          <div
            className="bg-taxi-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      )}
      {job.status === "completed" && (
        <div className="flex items-center gap-2 text-taxi-success">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm">Pronto</span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -20`
Expected: Compiles (component not imported anywhere yet)

- [ ] **Step 3: Commit**

```bash
git add src/app/taxi/components/JobProgress.tsx
git commit -m "feat: add JobProgress component for async job display"
```

---

### Task 3: Create Database Migration for Jobs Table

**Files:**
- Create: `supabase/migrations/20260919000000_create_jobs_table.sql`

**Interfaces:**
- Consumes: Supabase PostgreSQL
- Produces: `jobs` table with RLS policies

- [ ] **Step 1: Create migration file**

```sql
-- Create jobs table for async operation tracking
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('notion_import', 'pdf_export', 'notification_batch')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  total_items INTEGER NOT NULL DEFAULT 0,
  processed_items INTEGER NOT NULL DEFAULT 0,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user's job history
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id, created_at DESC);

-- Index for polling active jobs
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status) WHERE status IN ('pending', 'running');

-- RLS: users can only see their own jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON jobs TO authenticated;
```

- [ ] **Step 2: Apply migration manually**

Since this is a Supabase project without CLI setup, apply via Supabase SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Paste the migration SQL
3. Run the query

- [ ] **Step 3: Verify table exists**

Run a quick test in the browser console or via the app:
```typescript
const { data, error } = await getSupabase().from("jobs").select("*").limit(1)
// Should return empty array, not an error
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260919000000_create_jobs_table.sql
git commit -m "feat: add jobs table migration for async operation tracking"
```

---

### Task 4: Refactor Notion Import to Use Job System

**Files:**
- Modify: `src/app/taxi/lib/notion-service.ts`
- Modify: `src/app/taxi/config/page.tsx` (import trigger)

**Interfaces:**
- Consumes: `jobService` from `job-service.ts`, existing `importAllNotionData` logic
- Produces: `importAllNotionDataAsync()` that creates a job and processes in background

- [ ] **Step 1: Refactor notion-service.ts**

Replace the entire file:

```typescript
import { getSupabase } from "./supabase"
import { jobService } from "./job-service"

interface NotionRide {
  date: string
  value: number
  category: string
  description?: string
  company?: string
  source: string
  notion_id: string
}

interface NotionFuel {
  date: string
  total_value: number
  liters?: number
  price_per_liter?: number
  source: string
  notion_id: string
}

interface NotionImportResult {
  rides: NotionRide[]
  fuel: NotionFuel[]
}

async function fetchNotionData(): Promise<NotionImportResult> {
  const response = await fetch("/api/notion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to fetch Notion data")
  }

  return response.json()
}

async function upsertBatch(
  table: string,
  items: Record<string, unknown>[],
  jobId: string,
  startIndex: number,
  totalItems: number
): Promise<number> {
  let upserted = 0
  const BATCH_SIZE = 20

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const { error } = await getSupabase()
      .from(table)
      .upsert(batch, { onConflict: "notion_id" })

    if (!error) {
      upserted += batch.length
    }

    // Update job progress
    const progress = Math.round(((startIndex + i + batch.length) / totalItems) * 100)
    await jobService.updateJob(jobId, {
      processed_items: startIndex + i + batch.length,
      progress,
    })
  }

  return upserted
}

export async function importAllNotionDataAsync(
  userId: string,
  onProgress?: (jobId: string) => void
): Promise<string> {
  // Create job
  const job = await jobService.createJob({
    user_id: userId,
    type: "notion_import",
    total_items: 0,
  })

  onProgress?.(job.id)

  // Process in background (non-blocking)
  processImport(job.id, userId).catch((err) => {
    console.error("Import failed:", err)
  })

  return job.id
}

async function processImport(jobId: string, userId: string): Promise<void> {
  try {
    await jobService.updateJob(jobId, { status: "running" })

    // Step 1: Fetch from Notion API
    const data = await fetchNotionData()
    const totalItems = data.rides.length + data.fuel.length

    await jobService.updateJob(jobId, { total_items: totalItems })

    // Step 2: Upsert rides in batches
    let processedCount = 0
    if (data.rides.length > 0) {
      const rideRecords = data.rides.map((ride) => ({
        user_id: userId,
        ride_date: ride.date,
        value: ride.value,
        category: ride.category,
        description: ride.description || "",
        company_name: ride.company || "",
        source: ride.source,
        notion_id: ride.notion_id,
        type: "own" as const,
        added_by_admin: false,
        received_with_client: false,
        paid_to_driver: false,
      }))

      const upserted = await upsertBatch("rides", rideRecords, jobId, 0, totalItems)
      processedCount += upserted
    }

    // Step 3: Upsert fuel entries in batches
    if (data.fuel.length > 0) {
      const fuelRecords = data.fuel.map((fuel) => ({
        user_id: userId,
        fuel_date: fuel.date,
        total_value: fuel.total_value,
        liters: fuel.liters || null,
        price_per_liter: fuel.price_per_liter || null,
        source: fuel.source,
        notion_id: fuel.notion_id,
      }))

      const upserted = await upsertBatch("fuel", fuelRecords, jobId, data.rides.length, totalItems)
      processedCount += upserted
    }

    // Step 4: Mark complete
    await jobService.updateJob(jobId, {
      status: "completed",
      progress: 100,
      processed_items: processedCount,
      result: {
        rides_imported: data.rides.length,
        fuel_imported: data.fuel.length,
      },
    })
  } catch (err) {
    await jobService.updateJob(jobId, {
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown error",
    })
  }
}

// Keep synchronous version for small datasets (backward compat)
export async function importAllNotionData(userId: string): Promise<{ rides: number; fuel: number }> {
  const data = await fetchNotionData()

  let ridesImported = 0
  for (const ride of data.rides) {
    const { error } = await getSupabase().from("rides").upsert(
      {
        user_id: userId,
        ride_date: ride.date,
        value: ride.value,
        category: ride.category,
        description: ride.description || "",
        company_name: ride.company || "",
        source: ride.source,
        notion_id: ride.notion_id,
        type: "own",
        added_by_admin: false,
        received_with_client: false,
        paid_to_driver: false,
      },
      { onConflict: "notion_id" }
    )
    if (!error) ridesImported++
  }

  let fuelImported = 0
  for (const fuel of data.fuel) {
    const { error } = await getSupabase().from("fuel").upsert(
      {
        user_id: userId,
        fuel_date: fuel.date,
        total_value: fuel.total_value,
        liters: fuel.liters || null,
        price_per_liter: fuel.price_per_liter || null,
        source: fuel.source,
        notion_id: fuel.notion_id,
      },
      { onConflict: "notion_id" }
    )
    if (!error) fuelImported++
  }

  return { rides: ridesImported, fuel: fuelImported }
}
```

- [ ] **Step 2: Update config/page.tsx to use async import**

Find the Notion import handler in config/page.tsx and update it. The exact location depends on current code, but the pattern is:

```typescript
// OLD: const result = await importAllNotionData(user.id)

// NEW:
import { importAllNotionDataAsync } from "../lib/notion-service"
import { JobProgress } from "../components/JobProgress"

// In the import handler:
const jobId = await importAllNotionDataAsync(user.id)
setImportJobId(jobId)

// In the JSX, show progress when jobId is set:
{importJobId && (
  <JobProgress
    jobId={importJobId}
    onComplete={(job) => {
      setImportJobId(null)
      showToast(`Importado: ${job.result?.rides_imported} corridas, ${job.result?.fuel_imported} abastecimentos`, "success")
      fetchData() // refresh data
    }}
    onError={(err) => {
      setImportJobId(null)
      showToast(`Erro na importacao: ${err}`, "error")
    }}
  />
)}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -30`
Expected: Compiles successfully

- [ ] **Step 4: Commit**

```bash
git add src/app/taxi/lib/notion-service.ts src/app/taxi/config/page.tsx
git commit -m "feat: async Notion import with job tracking and batch upserts"
```

---

### Task 5: Refactor Notification Batch Processing

**Files:**
- Modify: `src/app/taxi/lib/notification-service.ts`

**Interfaces:**
- Consumes: `getSupabase()` from `supabase.ts`
- Produces: `checkAndSendNotifications()` with error handling and batch inserts

- [ ] **Step 1: Rewrite notification-service.ts**

```typescript
import { getSupabase } from "./supabase"

interface ScheduledRide {
  id: string
  user_id: string
  scheduled_date: string
  scheduled_time: string
  passenger_name: string
  category: string
  value?: number
  status: string
}

export async function checkAndSendNotifications(): Promise<{
  notifications_sent: number
  rides_created: number
  errors: string[]
}> {
  const errors: string[] = []
  let notificationsSent = 0
  let ridesCreated = 0

  try {
    // 1. Find scheduled rides that need notifications (upcoming, not yet notified)
    const now = new Date()
    const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000)

    const { data: upcomingRides, error: fetchError } = await getSupabase()
      .from("scheduled_rides")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_date", thirtyMinFromNow.toISOString())
      .gte("scheduled_date", now.toISOString())

    if (fetchError) {
      errors.push(`Failed to fetch upcoming rides: ${fetchError.message}`)
      return { notifications_sent: 0, rides_created: 0, errors }
    }

    // 2. Batch insert notifications (instead of one-by-one)
    if (upcomingRides && upcomingRides.length > 0) {
      const notifications = upcomingRides.map((ride) => ({
        user_id: ride.user_id,
        title: "Corrida agendada em breve",
        message: `Corrida para ${ride.passenger_name} as ${ride.scheduled_time}`,
        type: "scheduled_ride_reminder" as const,
        read: false,
        scheduled_ride_id: ride.id,
      }))

      const { error: notifError } = await getSupabase()
        .from("notifications")
        .insert(notifications)

      if (notifError) {
        errors.push(`Failed to insert notifications: ${notifError.message}`)
      } else {
        notificationsSent = notifications.length
      }

      // Batch update scheduled_rides status
      const rideIds = upcomingRides.map((r) => r.id)
      const { error: updateError } = await getSupabase()
        .from("scheduled_rides")
        .update({ status: "notified" })
        .in("id", rideIds)

      if (updateError) {
        errors.push(`Failed to update ride status: ${updateError.message}`)
      }
    }

    // 3. Find overdue scheduled rides to auto-convert
    const { data: overdueRides, error: overdueError } = await getSupabase()
      .from("scheduled_rides")
      .select("*")
      .in("status", ["scheduled", "notified"])
      .lt("scheduled_date", now.toISOString())

    if (overdueError) {
      errors.push(`Failed to fetch overdue rides: ${overdueError.message}`)
      return { notifications_sent: notificationsSent, rides_created: 0, errors }
    }

    // 4. Batch insert rides (instead of one-by-one)
    if (overdueRides && overdueRides.length > 0) {
      const rideRecords = overdueRides.map((ride) => ({
        user_id: ride.user_id,
        type: "own" as const,
        category: ride.category || "app",
        value: ride.value || 0,
        passenger_name: ride.passenger_name || "",
        ride_date: ride.scheduled_date,
        added_by_admin: false,
        received_with_client: false,
        paid_to_driver: false,
        source: "scheduled_conversion",
      }))

      const { error: rideError } = await getSupabase()
        .from("rides")
        .insert(rideRecords)

      if (rideError) {
        errors.push(`Failed to create rides: ${rideError.message}`)
      } else {
        ridesCreated = rideRecords.length
      }

      // Mark as completed
      const overdueIds = overdueRides.map((r) => r.id)
      const { error: completeError } = await getSupabase()
        .from("scheduled_rides")
        .update({ status: "completed" })
        .in("id", overdueIds)

      if (completeError) {
        errors.push(`Failed to mark rides completed: ${completeError.message}`)
      }
    }

    return { notifications_sent: notificationsSent, rides_created: ridesCreated, errors }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error in notification check"
    errors.push(msg)
    return { notifications_sent: notificationsSent, rides_created: ridesCreated, errors }
  }
}

export async function getUserNotifications(userId: string) {
  const { data, error } = await getSupabase()
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) throw error
  return data || []
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await getSupabase()
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)

  if (error) throw error
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await getSupabase()
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false)

  if (error) throw error
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false)

  if (error) return 0
  return count || 0
}
```

- [ ] **Step 2: Update layout.tsx to handle errors**

In `src/app/taxi/layout.tsx`, update the notification check call:

```typescript
// OLD:
checkAndSendNotifications()

// NEW:
checkAndSendNotifications().then(result => {
  if (result.errors.length > 0) {
    console.warn("Notification check errors:", result.errors)
  }
}).catch(err => {
  console.error("Notification check failed:", err)
})
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -30`
Expected: Compiles successfully

- [ ] **Step 4: Commit**

```bash
git add src/app/taxi/lib/notification-service.ts src/app/taxi/layout.tsx
git commit -m "refactor: batch notification processing with error handling"
```

---

### Task 6: Parallelize Metas Page Queries

**Files:**
- Modify: `src/app/taxi/metas/page.tsx`

**Interfaces:**
- Consumes: `getSupabase()` from `supabase.ts`
- Produces: Parallel queries instead of sequential

- [ ] **Step 1: Find and update fetchData in metas/page.tsx**

Replace the sequential queries with `Promise.all`:

```typescript
// OLD (sequential):
const { data: goals } = await getSupabase().from("goals").select("*").limit(1).single()
const { data: driverGoals } = await getSupabase().from("driver_goals").select("*").eq("user_id", user.id).single()
const { data: todayRides } = await getSupabase().from("rides").select("*").eq("user_id", user.id).gte("ride_date", today.toISOString())
const { data: weekRides } = await getSupabase().from("rides").select("*").eq("user_id", user.id).gte("ride_date", weekStart.toISOString())

// NEW (parallel):
const [goalsResult, driverGoalsResult, todayResult, weekResult] = await Promise.all([
  getSupabase().from("goals").select("id,daily_goal,weekly_goal").limit(1).single(),
  getSupabase().from("driver_goals").select("id,personal_goal").eq("user_id", user.id).single(),
  getSupabase().from("rides").select("id,value,commission,ride_date").eq("user_id", user.id).gte("ride_date", today.toISOString()),
  getSupabase().from("rides").select("id,value,commission,ride_date").eq("user_id", user.id).gte("ride_date", weekStart.toISOString()),
])
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/app/taxi/metas/page.tsx
git commit -m "perf: parallelize metas page queries"
```

---

### Task 7: Fix Investimento Unbounded Query

**Files:**
- Modify: `src/app/taxi/investimento/page.tsx`

**Interfaces:**
- Consumes: `getSupabase()` from `supabase.ts`
- Produces: Bounded query with date filter

- [ ] **Step 1: Add date filter to fetchData**

```typescript
// OLD:
const { data } = await getSupabase()
  .from("rides")
  .select("value, commission")
  .eq("user_id", user.id)
  .eq("type", "own")

// NEW: Only current year's rides
const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString()
const { data } = await getSupabase()
  .from("rides")
  .select("id,value,commission,ride_date")
  .eq("user_id", user.id)
  .eq("type", "own")
  .gte("ride_date", startOfYear)
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/app/taxi/investimento/page.tsx
git commit -m "perf: add date filter to investimento unbounded query"
```

---

### Task 8: Parallelize Export Data Fetch

**Files:**
- Modify: `src/app/taxi/config/page.tsx`

**Interfaces:**
- Consumes: `getSupabase()` from `supabase.ts`
- Produces: Parallel queries in `fetchAllData()`

- [ ] **Step 1: Update fetchAllData to use Promise.all**

```typescript
// OLD (sequential):
const { data: rides } = await getSupabase().from("rides").select("*").eq("user_id", user.id)
const { data: expenses } = await getSupabase().from("expenses").select("*").eq("user_id", user.id)
const { data: users } = await getSupabase().from("users").select("*")

// NEW (parallel):
const [ridesResult, expensesResult, usersResult] = await Promise.all([
  getSupabase().from("rides").select("id,user_id,value,commission,category,type,ride_date,passenger_name,company_name,added_by_admin").eq("user_id", user.id),
  getSupabase().from("expenses").select("id,user_id,value,category,description,expense_date").eq("user_id", user.id),
  getSupabase().from("users").select("id,nome,email"),
])

const rides = ridesResult.data
const expenses = expensesResult.data
const users = usersResult.data
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/app/taxi/config/page.tsx
git commit -m "perf: parallelize export data fetch queries"
```

---

### Task 9: Add Error Handling to Convites

**Files:**
- Modify: `src/app/taxi/convites/page.tsx`

**Interfaces:**
- Consumes: `useToast()` from `toast-context.tsx`
- Produces: try/catch with toast feedback

- [ ] **Step 1: Add error handling to handleAcceptInvitation**

```typescript
async function handleAcceptInvitation(invitationId: string) {
  if (!user) return

  try {
    // Update invitation status
    const { error: inviteError } = await getSupabase()
      .from("driver_invitations")
      .update({ status: "accepted" })
      .eq("id", invitationId)

    if (inviteError) throw new Error(`Failed to accept invitation: ${inviteError.message}`)

    // Update user role
    const { error: roleError } = await getSupabase()
      .from("users")
      .update({ role: "driver" })
      .eq("id", user.id)

    if (roleError) throw new Error(`Failed to update role: ${roleError.message}`)

    showToast("Convite aceito! Voce agora e um motorista.", "success")
    fetchData()
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao aceitar convite"
    showToast(msg, "error")
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add src/app/taxi/convites/page.tsx
git commit -m "fix: add error handling to invitation acceptance"
```

---

### Task 10: Final Build Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build 2>&1`
Expected: All pages compile, TypeScript passes

- [ ] **Step 2: Manual smoke test**

Verify in browser:
1. Notion import shows job progress bar
2. Metas page loads faster (parallel queries)
3. Investimento loads only current year data
4. Export button works (parallel fetch)
5. Notification check runs without console errors

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete async job system with observability"
```

---

## Architecture Decisions

### Why client-side jobs instead of server-side?
- Next.js 16 uses static export (`output: "export"`) — no persistent server process
- No Node.js worker threads or cron available in production (Vercel edge)
- Supabase is the only backend — using its `jobs` table as a lightweight queue

### Why batch inserts instead of one-by-one?
- Supabase supports multi-row `insert()` — reduces N network calls to N/BATCH_SIZE
- Batch size of 20 balances payload size vs. round trips
- Progress tracking still granular per-batch

### Why keep synchronous alternatives?
- CSV export is <100ms — no benefit from async
- Single inserts (rides, expenses) are ~100ms — overhead of job creation not justified
- `importAllNotionData()` kept for backward compat if user prefers sync

### Why polling instead of Supabase realtime?
- Realtime adds connection overhead and complexity
- Polling at 1.5s intervals is simple, predictable, and sufficient for 15-45s jobs
- Realtime subscriptions already caused issues in dev page (cascade re-fetch)
