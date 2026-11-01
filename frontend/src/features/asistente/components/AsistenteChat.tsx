import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { MessageCircle, RotateCw, SendHorizontal, X } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import { ApiError } from '@/lib/http'
import { cn } from '@/lib/cn'
import { preguntar } from '../api'
import type { MensajeChat } from '../types'
import { TextoRespuesta } from './TextoRespuesta'

const MAX = 500
const CLAVE_SESION = 'flexpass.asistente.sesion'

const SUGERENCIAS = [
  '¿Qué sedes hay en Guatemala?',
  '¿Qué incluye el plan Black?',
  '¿Cuánto pago si cancelo antes de tiempo?',
]

function leerSesion(): string | null {
  try {
    return sessionStorage.getItem(CLAVE_SESION)
  } catch {
    return null
  }
}

function guardarSesion(id: string) {
  try {
    sessionStorage.setItem(CLAVE_SESION, id)
  } catch {
    // Sin almacenamiento disponible: la conversación sigue funcionando sin recordar la sesión.
  }
}

/**
 * Asistente virtual de las páginas públicas.
 * Cerrado por defecto: solo se abre cuando la persona lo pide.
 * En teléfono ocupa toda la pantalla; en escritorio es un panel sobre la esquina.
 */
export function AsistenteChat() {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [texto, setTexto] = useState('')
  const [sesionId, setSesionId] = useState<string | null>(leerSesion)
  const ultimaPregunta = useRef<string | null>(null)
  const siguienteId = useRef(1)

  const botonRef = useRef<HTMLButtonElement>(null)
  const entradaRef = useRef<HTMLTextAreaElement>(null)
  const finRef = useRef<HTMLDivElement>(null)
  const tituloId = useId()

  const enviar = useMutation({
    mutationFn: (pregunta: string) => preguntar(pregunta, sesionId),
    onSuccess: (r) => {
      setSesionId(r.sesionId)
      guardarSesion(r.sesionId)
      agregar({ rol: 'asistente', texto: r.respuesta, fuentes: r.fuentes })
    },
    onError: (e) => {
      const mensaje =
        e instanceof ApiError ? e.message : 'No se pudo obtener una respuesta. Intenta de nuevo en unos segundos.'
      agregar({ rol: 'asistente', texto: mensaje, error: true })
    },
  })

  function agregar(m: Omit<MensajeChat, 'id'>) {
    setMensajes((prev) => [...prev, { ...m, id: siguienteId.current++ }])
  }

  function mandar(pregunta: string) {
    const limpia = pregunta.trim()
    if (!limpia || enviar.isPending) return
    ultimaPregunta.current = limpia
    agregar({ rol: 'usuario', texto: limpia })
    setTexto('')
    enviar.mutate(limpia)
  }

  function reintentar() {
    if (!ultimaPregunta.current || enviar.isPending) return
    setMensajes((prev) => (prev.at(-1)?.error ? prev.slice(0, -1) : prev))
    enviar.mutate(ultimaPregunta.current)
  }

  const cerrar = () => {
    setAbierto(false)
    requestAnimationFrame(() => botonRef.current?.focus())
  }

  // Al abrir: foco en el campo. Escape cierra.
  useEffect(() => {
    if (!abierto) return
    entradaRef.current?.focus()
    const alPresionar = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') cerrar()
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [abierto])

  // Mantener visible el último mensaje.
  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' })
  }, [mensajes, enviar.isPending, abierto])

  // En teléfono el panel ocupa la pantalla: evitar que la página de fondo se desplace.
  useEffect(() => {
    if (!abierto || !window.matchMedia('(max-width: 639px)').matches) return
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previo
    }
  }, [abierto])

  const alEnviar = (e: FormEvent) => {
    e.preventDefault()
    mandar(texto)
  }

  const alTeclear = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter envía; Shift+Enter hace salto de línea.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      mandar(texto)
    }
  }

  const ultimoEsError = mensajes.at(-1)?.error === true

  return (
    <>
      {!abierto && (
        <button
          ref={botonRef}
          type="button"
          onClick={() => setAbierto(true)}
          className="fixed bottom-5 right-4 z-[1100] inline-flex h-12 items-center gap-2 rounded-full bg-ink px-4 font-medium text-white shadow-[0_6px_20px_rgb(23_32_38/0.25)] transition-colors hover:bg-ink-soft sm:bottom-6 sm:right-6"
          aria-haspopup="dialog"
        >
          <MessageCircle className="size-5" aria-hidden="true" />
          <span>Pregúntanos</span>
        </button>
      )}

      {abierto && (
        <section
          role="dialog"
          aria-labelledby={tituloId}
          className={cn(
            'fixed z-[1100] flex flex-col bg-surface',
            'inset-0 pb-[env(safe-area-inset-bottom)]',
            'sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(36rem,calc(100dvh-7rem))] sm:w-[24rem] sm:rounded-panel sm:border sm:border-line sm:shadow-[0_12px_40px_rgb(23_32_38/0.18)]',
          )}
        >
          <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <h2 id={tituloId} className="text-lg">
                Asistente FlexPass
              </h2>
              <p className="text-sm text-steel">Sedes, planes, cobros y políticas</p>
            </div>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar asistente"
              className="-mr-1 grid size-10 place-items-center rounded-control text-ink-soft hover:bg-chalk"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
            {mensajes.length === 0 ? (
              <div>
                <p className="text-[0.95rem]">
                  Hola. Respondo con la información pública de FlexPass y te digo de dónde la saqué.
                </p>
                <div className="mt-4 flex flex-col items-start gap-2">
                  {SUGERENCIAS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => mandar(s)}
                      className="rounded-full border border-line-strong px-3 py-1.5 text-left text-sm text-ink-soft hover:border-plate-blue hover:text-plate-blue"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ol className="space-y-3">
                {mensajes.map((m) => (
                  <li key={m.id} className={cn('flex', m.rol === 'usuario' ? 'justify-end' : 'justify-start')}>
                    {m.rol === 'usuario' ? (
                      <p className="max-w-[85%] whitespace-pre-wrap rounded-panel rounded-br-sm bg-plate-blue px-3 py-2 text-[0.95rem] text-white">
                        <span className="sr-only">Tú: </span>
                        {m.texto}
                      </p>
                    ) : (
                      <div
                        className={cn(
                          'max-w-[92%] rounded-panel rounded-bl-sm px-3 py-2 text-[0.95rem]',
                          m.error ? 'bg-plate-red-soft text-plate-red' : 'bg-chalk text-ink',
                        )}
                      >
                        <span className="sr-only">Asistente: </span>
                        <TextoRespuesta texto={m.texto} />
                        {m.fuentes && m.fuentes.length > 0 && (
                          <div className="mt-2 border-t border-line pt-2">
                            <p className="text-xs font-medium text-steel">Fuentes</p>
                            <ol className="mt-1 space-y-0.5 text-xs text-steel">
                              {m.fuentes.map((f) => (
                                <li key={f.numero} className="flex gap-1.5">
                                  <span className="font-semibold text-plate-blue">{f.numero}</span>
                                  <span>
                                    {f.titulo}
                                    {f.seccion && <span className="text-steel/80">: {f.seccion}</span>}
                                  </span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
                {enviar.isPending && (
                  <li className="flex items-center gap-2 text-sm text-steel" role="status">
                    <Spinner className="size-4" />
                    Buscando la respuesta…
                  </li>
                )}
              </ol>
            )}
            {ultimoEsError && !enviar.isPending && (
              <button
                type="button"
                onClick={reintentar}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-plate-blue hover:underline"
              >
                <RotateCw className="size-4" aria-hidden="true" />
                Reintentar
              </button>
            )}
            <div ref={finRef} />
          </div>

          <form onSubmit={alEnviar} className="border-t border-line px-3 pb-3 pt-2">
            <div className="flex items-end gap-2">
              <label htmlFor={`${tituloId}-entrada`} className="sr-only">
                Escribe tu pregunta
              </label>
              <textarea
                id={`${tituloId}-entrada`}
                ref={entradaRef}
                value={texto}
                onChange={(e) => setTexto(e.target.value.slice(0, MAX))}
                onKeyDown={alTeclear}
                rows={1}
                placeholder="Escribe tu pregunta"
                className="max-h-32 min-h-11 flex-1 resize-none rounded-control border border-line-strong bg-surface px-3 py-2.5 text-base leading-snug placeholder:text-steel/70 focus:border-plate-blue focus:outline-none focus:ring-2 focus:ring-plate-blue/20 [field-sizing:content]"
              />
              <button
                type="submit"
                disabled={!texto.trim() || enviar.isPending}
                aria-label="Enviar pregunta"
                className="grid size-11 shrink-0 place-items-center rounded-control bg-plate-blue text-white hover:bg-plate-blue-dark disabled:opacity-50"
              >
                <SendHorizontal className="size-5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-1.5 flex justify-between gap-3 text-xs text-steel">
              <span>No escribas datos personales ni de tarjetas.</span>
              {texto.length > MAX - 80 && (
                <span className="tabular-nums">
                  {texto.length}/{MAX}
                </span>
              )}
            </p>
          </form>
        </section>
      )}
    </>
  )
}
