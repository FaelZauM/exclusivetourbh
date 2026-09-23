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
