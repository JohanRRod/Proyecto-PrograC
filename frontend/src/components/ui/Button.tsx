import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { clasesBoton, type Tamano, type Variante } from './botonEstilos'
import { Spinner } from './Spinner'

type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  tamano?: Tamano
  cargando?: boolean
  icono?: ReactNode
}

export function Button({
  variante,
  tamano,
  cargando = false,
  icono,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: BotonProps) {
  return (
    <button
      type={type}
      className={clasesBoton(variante, tamano, className)}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...props}
    >
      {cargando ? <Spinner className="size-4" /> : icono}
      {children}
    </button>
  )
}

type BotonLinkProps = LinkProps & { variante?: Variante; tamano?: Tamano; icono?: ReactNode }

export function ButtonLink({ variante, tamano, icono, className, children, ...props }: BotonLinkProps) {
  return (
    <Link className={clasesBoton(variante, tamano, typeof className === 'string' ? className : undefined)} {...props}>
      {icono}
      {children}
    </Link>
  )
}
