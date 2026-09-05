"use client"

import type { Ride } from "../lib/types"

interface RideListProps {
  rides: Ride[]
  onDelete: (id: string) => void
  isAdmin?: boolean
  currentUserId?: string
  drivers?: { id: string; nome: string }[]
}

export function RideList({ rides, onDelete, isAdmin = false, currentUserId, drivers = [] }: RideListProps) {
  if (rides.length === 0) {
    return (
      <p className="text-center text-taxi-gray-500 py-8">
        Nenhuma corrida registrada hoje.
      </p>
    )
  }

  function getEarnings(ride: Ride): number {
    if (ride.type === "passed" && ride.commission) {
      return ride.commission
    }
    return ride.value
  }

  function getDriverName(userId: string): string {
    if (currentUserId === userId) return "Você"
    const driver = drivers.find((d) => d.id === userId)
    return driver?.nome || "Desconhecido"
  }

  return (
    <div className="space-y-3">
      {rides.map((ride) => (
        <div
          key={ride.id}
          className="p-4 bg-white border border-taxi-gray-200 rounded-xl"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{ride.category}</span>
                <span className="text-xs text-taxi-gray-500">
                  {ride.type === "own" ? "Própria" : "Passada"}
                </span>
                {ride.user_id !== currentUserId && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    👤 {getDriverName(ride.user_id)}
                  </span>
                )}
              </div>
              <p className="text-xs text-taxi-gray-500 mt-1">
                {new Date(ride.ride_date).toLocaleDateString("pt-BR")} {new Date(ride.ride_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
              {ride.start_location && ride.end_location && (
                <p className="text-sm text-taxi-gray-500 mt-1">
                  {ride.start_location} → {ride.end_location}
                </p>
              )}
              {ride.passenger_name && (
                <p className="text-sm text-taxi-gray-500">
                  Passageiro: {ride.passenger_name}
                </p>
              )}
              {ride.driver_name && (
                <p className="text-sm text-taxi-gray-500">
                  Motorista: {ride.driver_name}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold text-taxi-success">
                R$ {getEarnings(ride).toFixed(2)}
              </p>
              {isAdmin && ride.type === "passed" && ride.commission && (
                <p className="text-xs text-taxi-gray-500">
                  Total: R$ {ride.value.toFixed(2)} | Motorista: R$ {ride.commission.toFixed(2)}
                </p>
              )}
              <button
                onClick={() => onDelete(ride.id)}
                className="text-xs text-red-500 mt-2"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}