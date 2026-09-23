import { getSupabase } from "./supabase"

export async function checkAndSendNotifications(): Promise<{
  notifications_sent: number
  rides_created: number
  errors: string[]
}> {
  const errors: string[] = []
  let notificationsSent = 0
  let ridesCreated = 0

  try {
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

      const rideIds = upcomingRides.map((r) => r.id)
      const { error: updateError } = await getSupabase()
        .from("scheduled_rides")
        .update({ status: "notified" })
        .in("id", rideIds)

      if (updateError) {
        errors.push(`Failed to update ride status: ${updateError.message}`)
      }
    }

    const { data: overdueRides, error: overdueError } = await getSupabase()
      .from("scheduled_rides")
      .select("*")
      .in("status", ["scheduled", "notified"])
      .lt("scheduled_date", now.toISOString())

    if (overdueError) {
      errors.push(`Failed to fetch overdue rides: ${overdueError.message}`)
      return { notifications_sent: notificationsSent, rides_created: 0, errors }
    }

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
      }))

      const { error: rideError } = await getSupabase()
        .from("rides")
        .insert(rideRecords)

      if (rideError) {
        errors.push(`Failed to create rides: ${rideError.message}`)
      } else {
        ridesCreated = rideRecords.length
      }

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
