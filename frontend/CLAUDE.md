# CLAUDE.md — frontend

Convenciones para agentes de IA (Claude Code, Codex, etc.) que trabajen en `frontend/`.
La especificación funcional está en `../specs/frontend.md`; léela antes de cambiar algo.

## Comandos

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc -b && vite build
npm run lint      # oxlint
```

Variables en `.env.local` (copiar de `.env.example`). Nunca subir `.env.local`.

## Reglas

- TypeScript estricto. Los tipos de respuesta viven en `features/<x>/types.ts` y reflejan
  exactamente el JSON del backend (snake_case en `/catalogo` y `/mi/pagos`, camelCase en DTO de Java).
- Ninguna página llama `fetch`: usa hooks de su feature → `lib/http.ts`.
- Colores, radios y tipografía solo desde los tokens de `src/index.css` (`@theme`). No usar hex sueltos.
- Textos de la interfaz en español, en sentence case, verbos concretos en los botones.
- Cada vista con datos maneja carga, vacío y error con los componentes de `components/ui/StateMessage`.
- Mobile first: probar en 375 px y en 1280 px antes de abrir un PR.
- No agregar dependencias sin anotarlo en la sección Stack de la spec.

## Git

- Ramas `feature/frontend-<descripcion>` desde `main`; PR hacia `main`.
- Commits en Conventional Commits: `feat(frontend): ...`, `fix(frontend): ...`.
- Los commits los hace el integrante responsable después de revisar y entender el cambio.
