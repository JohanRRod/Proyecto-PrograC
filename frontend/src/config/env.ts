/**
 * Variables de entorno validadas al arrancar.
 * Si falta alguna, la app lo dice en pantalla en lugar de fallar con errores confusos.
 */
function leer(nombre: keyof ImportMetaEnv): string | null {
  const valor = import.meta.env[nombre]
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null
}

const apiUrl = leer('VITE_API_URL') ?? '/api'
const supabaseUrl = leer('VITE_SUPABASE_URL')
const supabaseKey = leer('VITE_SUPABASE_PUBLISHABLE_KEY')

export const env = {
  apiUrl: apiUrl.replace(/\/+$/, ''),
  supabaseUrl,
  supabaseKey,
} as const

export const faltantes: string[] = [
  !supabaseUrl && 'VITE_SUPABASE_URL',
  !supabaseKey && 'VITE_SUPABASE_PUBLISHABLE_KEY',
].filter((v): v is string => Boolean(v))
