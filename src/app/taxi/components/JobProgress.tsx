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
