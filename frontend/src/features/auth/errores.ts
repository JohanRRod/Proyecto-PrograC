/** Traduce los mensajes de Supabase Auth a algo que el usuario entienda y pueda resolver. */
export function mensajeAuth(error: unknown): string {
  const texto = error instanceof Error ? error.message : String(error ?? '')
  const t = texto.toLowerCase()

  if (t.includes('invalid login credentials')) return 'El correo o la contraseña no coinciden.'
  if (t.includes('email not confirmed')) return 'Confirma tu correo con el enlace que te enviamos antes de ingresar.'
  if (t.includes('rate limit') || t.includes('too many')) return 'Hiciste demasiados intentos. Espera un minuto y vuelve a probar.'
  if (t.includes('password should be at least')) return 'La contraseña debe tener al menos 8 caracteres.'
  if (t.includes('same password') || t.includes('different from the old')) return 'Usa una contraseña distinta a la anterior.'
  if (t.includes('failed to fetch') || t.includes('network')) return 'No hay conexión. Revisa tu internet e intenta de nuevo.'
  if (t.includes('expired') || t.includes('invalid')) return 'El enlace expiró o ya se usó. Pide uno nuevo.'
  return texto || 'No se pudo completar la operación.'
}
