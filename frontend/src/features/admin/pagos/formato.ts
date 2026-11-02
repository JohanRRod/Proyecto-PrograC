import { TIPOS_CUENTA, type MetodoPago } from './types'

/** "Tarjeta de débito Banrural •••• 4417" */
export const describirMetodo = (m: MetodoPago) =>
  `${TIPOS_CUENTA[m.tipo_cuenta] ?? m.tipo_cuenta} ${m.banco_emisor} •••• ${m.ultimos_cuatro_digitos}`
