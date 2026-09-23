export interface User {
  id: string
  email: string
  nome: string
  role: "admin" | "driver" | "user" | "developer"
  status?: "pending" | "approved" | "rejected"
  created_at: string
}

export interface Ride {
  id: string
  user_id: string
  type: RideType
  category: RideCategory
  car_type?: "executivo" | "taxi" | null
  value: number
  commission?: number
  driver_name?: string
  passenger_name?: string
  company_name?: string
  dispatcher_name?: string
  start_location?: string
  end_location?: string
  ride_date: string
  created_at: string
  received_with_client?: boolean
  paid_to_driver?: boolean
  added_by_admin?: boolean
}

export interface Fuel {
  id: string
  user_id: string
  fuel_date: string
  liters?: number
  total_value: number
  price_per_liter?: number
  km_start?: number
  km_end?: number
  created_at: string
}

export interface FuelPrice {
  id: string
  price_per_liter: number
  recorded_date: string
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  category: "fuel" | "wash" | "food" | "maintenance" | "other"
  value: number
  description?: string
  expense_date: string
  created_at: string
}

export interface Goal {
  id: string
  daily_goal: number
  weekly_goal: number
  updated_at: string
}

export interface DriverGoal {
  id: string
  user_id: string
  personal_goal: number
  updated_at: string
}

export interface RentalGoal {
  id: string
  driver_id: string
  start_day: number
  end_day: number
  goal_value: number
  month: number
  year: number
  created_at: string
}

export interface DriverCar {
  id: string
  owner_id: string
  driver_id: string
  car_model: string
  license_plate: string
  car_type: "executive" | "taxi"
  active: boolean
  created_at: string
}

export interface DriverInvitation {
  id: string
  owner_id: string
  email: string
  status: "pending" | "accepted" | "expired"
  created_at: string
}

export type RideCategory = "app" | "taximeter" | "cooperative" | "private" | "invoiced"
export type RideType = "own" | "passed"

export interface RentalRate {
  id: string
  user_id: string
  daily_rate: number
  month: number
  year: number
  created_at: string
}

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