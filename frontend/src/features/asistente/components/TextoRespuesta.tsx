import { Fragment, type ReactNode } from 'react'

/**
 * Muestra el texto del asistente con el Markdown mínimo que usa el modelo
 * (párrafos, viñetas y **negritas**) y convierte las citas [n] en marcas visibles.
 * No usa HTML crudo: todo se arma como elementos de React.
 */
export function TextoRespuesta({ texto }: { texto: string }) {
  const bloques: ReactNode[] = []
  let lista: string[] = []

  const cerrarLista = () => {
    if (lista.length === 0) return
    bloques.push(
      <ul key={`ul-${bloques.length}`} className="my-1.5 list-disc space-y-1 pl-5">
        {lista.map((item, i) => (
          <li key={i}>{enLinea(item)}</li>
        ))}
      </ul>,
    )
    lista = []
  }

  for (const linea of texto.split('\n')) {
    const t = linea.trim()
    // El asistente no debe mandar código; si llegara un bloque, se ocultan las marcas ```.
    if (t.startsWith('```')) continue
    const vineta = /^[*-]\s+(.*)$/.exec(t)
    if (vineta) {
      lista.push(vineta[1])
      continue
    }
    cerrarLista()
    if (t !== '') {
      bloques.push(
        <p key={`p-${bloques.length}`} className="my-1.5 first:mt-0 last:mb-0">
          {enLinea(t)}
        </p>,
      )
    }
  }
  cerrarLista()

  return <>{bloques}</>
}

function enLinea(texto: string): ReactNode[] {
  // Separa **negritas** y citas [n] conservando el resto del texto.
  // Citas como [2] o agrupadas como [1, 4].
  return texto.split(/(\*\*[^*]+\*\*|\[\d{1,2}(?:\s*,\s*\d{1,2})*\])/g).map((parte, i) => {
    if (/^\*\*[^*]+\*\*$/.test(parte)) return <strong key={i}>{parte.slice(2, -2)}</strong>
    const cita = /^\[([\d,\s]+)\]$/.exec(parte)
    if (cita) {
      return (
        <Fragment key={i}>
          {cita[1].split(',').map((n) => (
            <sup
              key={n}
              className="ml-0.5 inline-grid min-w-4 place-items-center rounded-sm bg-plate-blue-soft px-1 text-[0.7rem] font-semibold text-plate-blue"
              aria-label={`fuente ${n.trim()}`}
            >
              {n.trim()}
            </sup>
          ))}
        </Fragment>
      )
    }
    return <Fragment key={i}>{parte}</Fragment>
  })
}
