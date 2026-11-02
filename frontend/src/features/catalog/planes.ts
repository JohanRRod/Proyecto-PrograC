import type { Plan } from './types'

export type NivelPlan = 'smart' | 'nacional' | 'black'

/**
 * Nivel del plan según sus permisos (ver spec §6).
 * El color sigue el código de los discos olímpicos: verde, azul y tinta.
 */
export function nivelPlan(plan: Pick<Plan, 'permite_amenidades_vip' | 'permite_acceso_nacional'>): NivelPlan {
  if (plan.permite_amenidades_vip) return 'black'
  if (plan.permite_acceso_nacional) return 'nacional'
  return 'smart'
}

export const estiloNivel: Record<NivelPlan, { banda: string; texto: string; suave: string; etiqueta: string }> = {
  smart: { banda: 'bg-plate-green', texto: 'text-plate-green', suave: 'bg-plate-green-soft', etiqueta: 'Smart' },
  nacional: { banda: 'bg-plate-blue', texto: 'text-plate-blue', suave: 'bg-plate-blue-soft', etiqueta: 'Nacional' },
  black: { banda: 'bg-ink', texto: 'text-ink', suave: 'bg-ink/5', etiqueta: 'Black' },
}

export interface Beneficio {
  texto: string
  incluido: boolean
}

export function beneficiosPlan(plan: Plan): Beneficio[] {
  return [
    { texto: 'Tu sede base', incluido: true },
    { texto: 'Todas las sedes de tu país', incluido: plan.permite_acceso_nacional },
    { texto: 'Sedes en otros países', incluido: plan.permite_acceso_internacional },
    { texto: 'Zonas Black: sauna, hidromasaje y bronceado', incluido: plan.permite_amenidades_vip },
    {
      texto:
        plan.invitados_mensuales_gratis > 0
          ? `${plan.invitados_mensuales_gratis} ${plan.invitados_mensuales_gratis === 1 ? 'invitado' : 'invitados'} gratis al mes`
          : 'Invitados gratis',
      incluido: plan.invitados_mensuales_gratis > 0,
    },
  ]
}

/**
 * Un plan por nombre (el de menor id). La tabla puede tener filas repetidas
 * por cargas duplicadas de datos; al contratar solo se ofrece una opción por plan.
 */
export function planesUnicos(planes: Plan[]): Plan[] {
  const porNombre = new Map<string, Plan>()
  for (const p of [...planes].sort((a, b) => a.id - b.id)) {
    if (!porNombre.has(p.nombre)) porNombre.set(p.nombre, p)
  }
  return [...porNombre.values()].sort((a, b) => Number(a.precio_mensual) - Number(b.precio_mensual))
}
