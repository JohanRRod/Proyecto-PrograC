# FlexPass — Frontend

React + Vite + TypeScript + Tailwind. Especificación en [`../specs/frontend.md`](../specs/frontend.md).

## Arrancar en local

```bash
cd frontend
npm install
cp .env.example .env.local   # en PowerShell: Copy-Item .env.example .env.local
npm run dev                  # http://localhost:5173
```

En `.env.local` van la URL de la API y la URL + publishable key de Supabase
(Supabase → Project Settings → API). Nunca la `service_role`.

El backend debe estar corriendo en `http://localhost:8080` para que carguen las sedes y planes.
Vite reenvía `/api` a ese puerto, así que en local no hace falta configurar CORS.
Sin variables de Supabase, las páginas públicas funcionan pero no se puede iniciar sesión.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga |
| `npm run build` | Revisión de tipos y build de producción en `dist/` |
| `npm run lint` | oxlint |
| `npm run preview` | Sirve `dist/` para probar el build |

## Estructura

```
src/
├─ app/          providers, router (páginas cargadas bajo demanda), QueryClient
├─ config/       variables de entorno
├─ lib/          cliente HTTP con JWT, Supabase, formato de fechas y moneda
├─ components/   ui/ (botones, estados, insignias) y layout/ (shell público y privado)
└─ features/     auth, catalog (mapa y planes), member (pase y pagos), admin
```
