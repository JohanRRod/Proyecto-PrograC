import type { ReactNode } from 'react'
import { Brand } from './Brand'

/** Pantalla mínima para login, callbacks y estados de sesión. */
export function PantallaCentrada({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-chalk">
      <header className="px-5 py-5 sm:px-8">
        <Brand />
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
