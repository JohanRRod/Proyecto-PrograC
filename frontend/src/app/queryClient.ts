import { QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/http'
import { supabase } from '@/lib/supabase'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Token vencido o revocado: cerrar la sesión local. RequireRole redirige a /ingresar.
      if (error instanceof ApiError && error.status === 401) void supabase?.auth.signOut()
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      // No reintentar errores del cliente (4xx): repetirlos no cambia el resultado.
      retry: (intentos, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return intentos < 2
      },
    },
  },
})
