"use client"

import { getSupabase } from "./supabase"
import type { ScheduledRide, Notification } from "./types"

export async function checkAndSendNotifications(): Promise<number> {
  const now = new Date()
  const ownThreshold = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour

  // Buscar agendamentos que precisam de notificação
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

  // Buscar agendamentos que já passaram do horário → criar corrida automaticamente
  const { data: pastRides } = await getSupabase()
    .from("scheduled_rides")
    .select("*")
    .in("status", ["scheduled", "notified"])
    .lte("scheduled_date", now.toISOString())

  if (pastRides && pastRides.length > 0) {
    for (const ride of pastRides) {
      // Criar corrida na tabela rides
      const { error } = await getSupabase().from("rides").insert({
        user_id: ride.user_id,
        type: ride.type,
        category: ride.category,
        value: ride.value,
        commission: ride.commission,
        driver_name: ride.driver_name,
        passenger_name: ride.passenger_name,
        company_name: ride.company_name,
        start_location: ride.start_location,
        end_location: ride.end_location,
        ride_date: ride.scheduled_date,
        paid_to_driver: false,
      })

      if (!error) {
        // Atualizar status do agendamento para completed
        await getSupabase()
          .from("scheduled_rides")
          .update({ status: "completed" })
          .eq("id", ride.id)
      }
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
