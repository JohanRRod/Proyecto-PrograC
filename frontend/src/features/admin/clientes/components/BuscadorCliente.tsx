import { useId, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { EstadoBadge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { useClientes } from '../hooks'
import { nombreCompleto, type Cliente } from '../types'

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const MAX_RESULTADOS = 6

interface Props {
  valor: Cliente | null
  onElegir: (cliente: Cliente | null) => void
}

/** Busca por nombre, correo o documento entre los clientes registrados y deja elegir uno. */
export function BuscadorCliente({ valor, onElegir }: Props) {
  const clientes = useClientes()
  const [texto, setTexto] = useState('')
  const inputId = useId()

  const resultados = useMemo(() => {
    const q = normalizar(texto.trim())
    if (q.length < 2) return []
    return (clientes.data ?? [])
      .filter(
        (c) =>
          normalizar(nombreCompleto(c)).includes(q) ||
          normalizar(c.email).includes(q) ||
          normalizar(c.documentoIdentidad ?? '').includes(q),
      )
      .slice(0, MAX_RESULTADOS)
  }, [clientes.data, texto])

  if (valor) {
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-soft">Cliente</p>
        <div className="flex items-center justify-between gap-3 rounded-control border border-line-strong bg-surface px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate font-medium">{nombreCompleto(valor)}</p>
            <p className="truncate text-sm text-steel">{valor.documentoIdentidad}</p>
          </div>
          <div className="flex items-center gap-2">
            <EstadoBadge estado={valor.estado} />
            <button
              type="button"
              onClick={() => {
                onElegir(null)
                setTexto('')
              }}
              aria-label="Cambiar cliente"
              className="grid size-8 place-items-center rounded-control text-ink-soft hover:bg-chalk"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-soft">
        Cliente
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-steel" aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nombre, correo o documento"
          autoComplete="off"
          className="h-11 w-full rounded-control border border-line-strong bg-surface pl-9 pr-3 text-base placeholder:text-steel/70 focus:border-plate-blue focus:outline-none focus:ring-2 focus:ring-plate-blue/20"
        />
      </div>

      {clientes.isPending && texto.trim().length >= 2 && (
        <p className="mt-2 flex items-center gap-2 text-sm text-steel">
          <Spinner className="size-4" /> Cargando clientes…
        </p>
      )}
      {texto.trim().length >= 2 && !clientes.isPending && (
        <ul className="mt-2 divide-y divide-line rounded-control border border-line" aria-label="Resultados">
          {resultados.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-steel">Ningún cliente coincide.</li>
          ) : (
            resultados.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onElegir(c)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-chalk"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{nombreCompleto(c)}</span>
                    <span className="block truncate text-sm text-steel">
                      {c.documentoIdentidad}, {c.email}
                    </span>
                  </span>
                  <EstadoBadge estado={c.estado} />
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
