"use client"

import { useAuth } from "../lib/auth-context"

export function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="sticky top-0 bg-white border-b border-taxi-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">ExclusivePro</h1>
          {user && (
            <p className="text-xs text-taxi-gray-500">{user.nome}</p>
          )}
        </div>
        <button
          onClick={signOut}
          className="text-sm text-taxi-gray-500 hover:text-taxi-gray-900"
        >
          Sair
        </button>
      </div>
    </header>
  )
}
