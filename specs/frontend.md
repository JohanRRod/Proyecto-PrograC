# Spec — Frontend FlexPass

Responsable: Josué Vásquez. Estado: en construcción (fase base).

## 1. Objetivo

Interfaz web de FlexPass para tres públicos:

| Público | Qué necesita |
|---|---|
| Visitante (sin sesión) | Ver dónde están las sedes, qué amenidades tiene cada una y qué planes existen. |
| Miembro (`MIEMBRO`) | Ver su pase (plan, estado, permanencia, próximo cobro) y su historial de pagos. |
| Administrador (`ADMIN`) | Administrar el catálogo, clientes, membresías y descargar reportes. |

Debe funcionar igual de bien en computadora y en teléfono, sin pasos innecesarios ni avisos intrusivos.

## 2. Stack

| Necesidad | Herramienta | Motivo |
|---|---|---|
| Build | Vite 8 + TypeScript | Plantilla oficial, tipado estricto contra los DTO del backend |
| UI | React 19 + Tailwind CSS 4 | Componentes pequeños, estilos con tokens en un solo lugar |
| Rutas | React Router | Rutas anidadas por layout y por rol |
| Datos remotos | TanStack Query | Caché, reintentos y estados de carga/error uniformes |
| Autenticación | `@supabase/supabase-js` | El backend valida el JWT de Supabase |
| Mapa | Leaflet + react-leaflet + OpenStreetMap | Gratis, sin tarjeta, suficiente para marcadores |
| Formularios | react-hook-form + zod | Validación en cliente con los mismos límites del backend |
| Iconos | lucide-react | |

## 3. Arquitectura

Organización por funcionalidad (feature-based). Cada carpeta de `features/` contiene su
`api.ts` (llamadas HTTP), `types.ts` (DTO tal cual los devuelve el backend), `hooks.ts`
(TanStack Query) y sus componentes/páginas.

```
frontend/src/
├─ app/          # providers, router, layouts raíz
├─ config/       # lectura y validación de variables de entorno
├─ lib/          # cliente HTTP, Supabase, formato de fechas/moneda
├─ components/   # ui/ (botones, estados) y layout/ (shell público y privado)
└─ features/
   ├─ auth/      # sesión, perfil (/auth/me), login, invitaciones, guards
   ├─ catalog/   # países, sedes, amenidades, planes (público)
   ├─ member/    # pase y pagos del miembro (/api/mi/**)
   ├─ asistente/ # chat del agente de IA y documentos del RAG
   └─ admin/     # panel administrativo
```

Reglas:

1. Los componentes nunca llaman `fetch` directo: usan los hooks de su feature, que usan `lib/http.ts`.
2. `lib/http.ts` agrega `Authorization: Bearer <token>` con el token vigente de Supabase y convierte
   las respuestas de error (`{ error }` o `{ mensaje, errores }`) en un `ApiError` con `status` y mensaje legible.
3. El rol que decide qué se muestra viene de `GET /api/auth/me`, nunca del JWT ni de `localStorage`.
   La seguridad real está en el backend; el frontend solo evita mostrar lo que el usuario no puede usar.
4. Un `401` cierra la sesión local y manda a `/ingresar`. Un `403` muestra "sin permisos" en la vista.
5. No se usan claves `service_role` ni secretos en el frontend: solo URL y publishable key de Supabase.

## 4. Rutas

| Ruta | Acceso | Contenido |
|---|---|---|
| `/` | Público | Mapa y listado de sedes con filtro por país |
| `/sedes/:id` | Público | Mismo mapa con la sede seleccionada y sus amenidades |
| `/planes` | Público | Comparación de planes |
| `/ingresar` | Público | Inicio de sesión con correo y contraseña |
| `/auth/callback` | Público | Destino del correo de invitación: el miembro crea su contraseña |
| `/mi` | `MIEMBRO` | Pase: membresía vigente, beneficios del plan, próximo cobro |
| `/mi/pagos` | `MIEMBRO` | Historial de cobros, períodos y métodos de pago |
| `/admin` | `ADMIN` | Inicio del panel administrativo y documentos del asistente |
| `/admin/recepcion` | `ADMIN` | Registrar entradas: sede (recordada en el equipo), cliente y zona opcional; resultado permitido o rechazado con el motivo, e historial del cliente |
| `/admin/clientes` | `ADMIN` | Lista con búsqueda (nombre, correo, documento) y filtro por estado |
| `/admin/clientes/nuevo` | `ADMIN` | Registrar cliente |
| `/admin/clientes/:id` | `ADMIN` | Detalle, invitar a la app, dar de baja; membresía (contratar, cobrar mensualidad, cancelar con penalización) y pagos (métodos e historial) |
| `/admin/clientes/:id/editar` | `ADMIN` | Editar datos; documento y sede base no se pueden cambiar |
| `/admin/catalogo/sedes` | `ADMIN` | Sedes con búsqueda y filtros por país y estado |
| `/admin/catalogo/sedes/nueva` | `ADMIN` | Crear sede; la ubicación se marca en el mapa (clic o arrastrar el marcador) |
| `/admin/catalogo/sedes/:id` | `ADMIN` | Editar o desactivar la sede y administrar sus amenidades (cupo, horario especial, disponible) |
| `/admin/catalogo/planes` | `ADMIN` | Planes: crear, editar, desactivar y reactivar, con vista previa del nivel |
| `/admin/catalogo/amenidades` | `ADMIN` | Amenidades: crear y editar, marcar si son exclusivas Black |
| `/admin/reportes` | `ADMIN` | Los 15 reportes por categoría: filtros por fechas y sede, vista previa con totales y descarga en Excel y PDF. El reporte y los filtros quedan en la URL (`?r=&desde=&hasta=&sede=`) |
| `*` | Público | Página no encontrada |

En el teléfono caben cinco pestañas abajo; si el área tiene más secciones, la quinta es "Más" y abre el resto.

Después de iniciar sesión se redirige según el rol: `ADMIN` → `/admin`, `MIEMBRO` → `/mi`.

## 5. Endpoints consumidos en esta fase

| Endpoint | Uso |
|---|---|
| `GET /api/catalogo/paises` | Filtro por país |
| `GET /api/catalogo/sucursales` | Marcadores y listado |
| `GET /api/catalogo/sucursales/{id}/amenidades` | Detalle de sede |
| `GET /api/catalogo/planes` | Página de planes y nombre del plan del miembro |
| `GET /api/auth/me` | Rol y cliente del usuario autenticado |
| `GET /api/mi/membresias` | Pase del miembro |
| `GET /api/mi/pagos/historial` | Cobros del miembro |
| `GET /api/mi/pagos/periodos` | Períodos PAGADO/PENDIENTE |
| `GET /api/mi/pagos/metodos` | Métodos de pago registrados |
| `GET/POST/PUT/DELETE /api/clientes` | Sección Clientes del admin (DELETE marca al cliente como INACTIVO) |
| `POST /api/auth/miembros/invitar` | Botón "Invitar a la app" |
| `POST /api/accesos/checkin`, `GET /api/accesos/historial/{id}` | Recepción e historial de accesos (también en el detalle del cliente) |
| `GET /api/membresias/cliente/{id}`, `POST /api/membresias` | Membresía del cliente y "Contratar plan" |
| `POST /api/membresias/{id}/cancelacion` | "Cancelar membresía": registra la solicitud y calcula la penalización |
| `GET /api/pagos/metodos/cliente/{id}`, `POST /api/pagos/metodos` | Métodos de pago del cliente |
| `GET /api/pagos/historial/cliente/{id}`, `POST /api/pagos/cobros` | Cobros; cobro manual de mensualidad y de la penalización de cancelación |
| `GET/POST/PUT/DELETE /api/sucursales` | Catálogo de sedes del admin (incluye inactivas; DELETE desactiva) |
| `GET/POST/PUT/DELETE /api/planes` | Catálogo de planes del admin (incluye inactivos; DELETE desactiva, PUT con `activo: true` reactiva) |
| `GET/POST/PUT /api/amenidades` | Catálogo de amenidades |
| `GET/POST/PUT /api/sucursales/{id}/amenidades` | Amenidades asignadas a una sede |
| `GET /api/reportes` | Lista de reportes (código, título, descripción, categoría y filtros que acepta) |
| `GET /api/reportes/{codigo}` | Vista previa: columnas con su tipo, filas, totales y filtros aplicados |
| `GET /api/reportes/{codigo}/excel`, `GET /api/reportes/{codigo}/pdf` | Descargas. Los tres aceptan `desde`, `hasta` (yyyy-MM-dd) y `sucursalId`, todos opcionales |
| `POST /api/ia/chat` | Asistente virtual (público, botón flotante en las páginas públicas) |
| `GET /api/ia/documentos` | Documentos del RAG en el panel admin |
| `POST /api/ia/ingesta` | Botón "Recargar documentos" en el panel admin |

### Asistente virtual

- Botón "Pregúntanos" fijo abajo a la derecha en las páginas públicas; cerrado por defecto, nunca se abre solo.
- En teléfono el chat ocupa la pantalla completa; en escritorio es un panel de 24 rem.
- Muestra la respuesta con viñetas, negritas y citas `[n]` como marcas; debajo, la lista de fuentes citadas.
- Enter envía, Shift+Enter hace salto de línea, Escape cierra. Límite de 500 caracteres.
- La sesión del chat se recuerda en `sessionStorage` (solo durante la pestaña).
- El crédito de OpenStreetMap del mapa se movió arriba a la derecha para que el botón no lo tape.

## 6. Reglas de presentación

- Moneda: quetzales (`GTQ`), formato `Q 1,234.00`. Fechas: `es-GT`, por ejemplo `15 nov 2026`.
- Color por plan (inspirado en los discos olímpicos): Smart = verde, Nacional = azul, Black = tinta.
  El nivel se deduce de las banderas del plan: `permite_amenidades_vip` → Black,
  `permite_acceso_nacional` → Nacional, si no → Smart.
- Amenidades con `requiere_plan_vip` se marcan como "Solo plan Black".
- Estados: ACTIVA/EXITOSO/PAGADO en verde, PENDIENTE/SUSPENDIDA en amarillo, RECHAZADO/CANCELADA/MOROSO en rojo.
- Toda vista que carga datos tiene tres estados explícitos: cargando, vacío (con la acción siguiente) y error
  (qué pasó y cómo resolverlo).

## 7. Pendiente del backend para siguientes fases

Necesario para que el miembro pueda operar por sí mismo (hoy solo puede consultar):

- `GET /api/mi/clases` y `POST /api/mi/reservas` (hoy `/api/clases` y `/api/reservas` son solo ADMIN).
- `POST /api/mi/membresias/{id}/cancelacion` con vista previa de la penalización.
- `GET /api/mi/accesos`.
- CORS: incluir `PATCH` (ya está en la rama `parte-johan`) y el dominio de producción, y exponer
  `Content-Disposition` para que las descargas de reportes conserven el nombre del archivo en producción.
