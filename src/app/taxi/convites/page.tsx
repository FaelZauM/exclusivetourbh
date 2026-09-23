"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"
import { useAuth } from "../lib/auth-context"
import { useToast } from "../lib/toast-context"
import type { DriverInvitation, User } from "../lib/types"

export default function ConvitesPage() {
  const { user } = useAuth()
  const [invitations, setInvitations] = useState<DriverInvitation[]>([])
  const [owners, setOwners] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    if (user) {
      fetchInvitations()
    }
  }, [user])

  async function fetchInvitations() {
    if (!user) return

    const { data: invitationsData } = await getSupabase()
      .from("driver_invitations")
      .select("*")
      .eq("email", user.email)
      .order("created_at", { ascending: false })

    setInvitations(invitationsData || [])

    if (invitationsData && invitationsData.length > 0) {
      const ownerIds = invitationsData.map((inv) => inv.owner_id)
      const { data: ownersData } = await getSupabase()
        .from("users")
        .select("*")
        .in("id", ownerIds)

      setOwners(ownersData || [])
    }

    setLoading(false)
  }

  async function handleAcceptInvitation(invitationId: string) {
    if (!user) return

    try {
      const { error: inviteError } = await getSupabase()
        .from("driver_invitations")
        .update({ status: "accepted" })
        .eq("id", invitationId)

      if (inviteError) throw new Error(`Failed to accept invitation: ${inviteError.message}`)

      const { error: roleError } = await getSupabase()
        .from("users")
        .update({ role: "driver" })
        .eq("id", user.id)

      if (roleError) throw new Error(`Failed to update role: ${roleError.message}`)

      showToast("Convite aceito! Voce agora e um motorista.", "success")
      fetchInvitations()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao aceitar convite"
      showToast(msg, "error")
    }
  }

  async function handleRejectInvitation(invitationId: string) {
    await getSupabase()
      .from("driver_invitations")
      .update({ status: "expired" })
      .eq("id", invitationId)

    fetchInvitations()
  }

  function getOwnerName(ownerId: string) {
    const owner = owners.find((o) => o.id === ownerId)
    return owner?.nome || "Proprietário"
  }

  if (loading) {
    return (
      <main className="p-4">
        <p className="text-center text-taxi-gray-500">Carregando...</p>
      </main>
    )
  }

  const pendingInvitations = invitations.filter((inv) => inv.status === "pending")
  const acceptedInvitations = invitations.filter((inv) => inv.status === "accepted")

  return (
    <main className="p-4">
      <h2 className="text-xl font-bold mb-6">Convites</h2>

      {pendingInvitations.length === 0 && acceptedInvitations.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-taxi-gray-500">Nenhum convite recebido.</p>
          <p className="text-sm text-taxi-gray-500 mt-2">
            Aguarde um proprietário enviar um convite para você.
          </p>
        </div>
      ) : (
        <>
          {pendingInvitations.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Pendentes</h3>
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="p-4 bg-taxi-gray-50 rounded-xl"
                  >
                    <p className="font-medium mb-1">
                      Convite de {getOwnerName(invitation.owner_id)}
                    </p>
                    <p className="text-sm text-taxi-gray-500 mb-3">
                      Enviado em {new Date(invitation.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptInvitation(invitation.id)}
                        className="flex-1 py-2 bg-taxi-success text-white font-medium rounded-xl hover:bg-opacity-90"
                      >
                        Aceitar
                      </button>
                      <button
                        onClick={() => handleRejectInvitation(invitation.id)}
                        className="flex-1 py-2 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600"
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {acceptedInvitations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Aceitos</h3>
              <div className="space-y-3">
                {acceptedInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="p-4 bg-white border border-taxi-gray-200 rounded-xl"
                  >
                    <p className="font-medium">
                      {getOwnerName(invitation.owner_id)}
                    </p>
                    <p className="text-sm text-taxi-gray-500">
                      Aceito em {new Date(invitation.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
