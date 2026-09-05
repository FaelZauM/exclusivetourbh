export interface User {
  id: string
  email: string
  nome: string
  role: "admin" | "driver"
  created_at: string
}

export interface Ride {
  id: string
  user_id: string
  type: "own" | "passed"
  category: "app" | "taximeter" | "cooperative" | "private" | "invoiced"
  value: number
  commission?: number
  driver_name?: string
  passenger_name?: string
  dispatcher_name?: string
  start_location?: string
  end_location?: string
  ride_date: string
  created_at: string
  added_by_admin?: boolean
  received_with_client?: boolean
}

export interface Fuel {
  id: string
  user_id: string
  fuel_date: string
  liters?: number
  total_value: number
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