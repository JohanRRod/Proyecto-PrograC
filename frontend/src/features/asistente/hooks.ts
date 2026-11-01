import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listarDocumentosRag, recargarDocumentosRag } from './api'

const documentosKey = ['ia', 'documentos'] as const

export const useDocumentosRag = () => useQuery({ queryKey: documentosKey, queryFn: listarDocumentosRag })

export function useRecargarDocumentos() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: recargarDocumentosRag,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentosKey }),
  })
}
