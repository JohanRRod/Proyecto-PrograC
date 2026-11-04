# AGENTS.md

Guía para los asistentes de programación con IA (Claude Code, OpenCode, Codex o equivalentes) que trabajen en este repositorio.
Léela completa antes de proponer o cambiar cualquier cosa.

## 1. Qué es el proyecto

**FlexPass** es un sistema web para administrar cadenas de gimnasios con varias sedes: catálogo de sedes y planes, clientes y membresías,
control de acceso por QR en recepción, cobros automáticos con penalización por cancelación anticipada, clases y reservas,
más de 15 reportes (Excel y PDF), tablero de Power BI, bitácora de auditoría y un asistente con IA (RAG sobre Gemini).

- Proyecto final de Programación Comercial, Universidad Mesoamericana (2026).
- En producción: https://flexpass.central-gl.com (Raspberry Pi 5 + Cloudflare Tunnel).
- En el código del backend el sistema se llama `fitpass` (paquete `com.fitpass`). Es el mismo sistema.

## 2. Estructura del repositorio

| Ruta | Contenido |
|---|---|
| `backend/api` | API REST: Spring Boot 3.3, Java 21, Maven. Código en `src/main/java/com/fitpass/<modulo>` |
| `backend/api/src/main/resources/rag` | Documentos públicos que usa el asistente (políticas, cobros, accesos, reglamento) |
| `frontend` | React 19 + Vite + TypeScript + Tailwind. Reglas propias en `frontend/CLAUDE.md` |
| `db/init` | Esquema base (`01_schema.sql`) y datos iniciales (`02_seed.sql`) |
| `db/reporting` | Vistas y esquema `reporting` para Power BI, usuario de solo lectura y `FlexPass.pbix` |
| `db/demo` | Scripts para cargar y borrar datos de demostración |
| `infra/docker-compose.yml` | RabbitMQ y pgAdmin para desarrollo |
| `infra/dev-backend.ps1` | Arranca la API en local cargando el `.env` de la raíz |
| `infra/produccion` | Compose de producción (web, api, rabbitmq, cloudflared) y su README |
| `specs` | Especificación de cada módulo (ver sección 7) |
| `.github/workflows/build.yml` | CI: compila y prueba el backend en cada PR a `develop` o `main` |

## 3. Comandos

```bash
# Servicios de desarrollo (RabbitMQ en 5672/15672, pgAdmin en 5050)
docker compose -f infra/docker-compose.yml up -d

# Backend (desde backend/api) — escucha en http://localhost:8080
mvn clean install -DskipTests
mvn test
# En Windows, con las variables del .env (desde la raíz):
powershell -ExecutionPolicy Bypass -File infra\dev-backend.ps1        # agrega -Dev para habilitar /api/dev/**

# Frontend (desde frontend) — http://localhost:5173, /api se redirige a :8080
npm install
npm run dev
npm run build      # tsc -b && vite build
npm run lint       # oxlint
```

Todavía no hay pruebas automatizadas en `backend/api/src/test`; `mvn test` solo confirma que compila.
Antes de entregar un cambio, como mínimo debe pasar `mvn clean install -DskipTests` y, si tocó el frontend, `npm run build` y `npm run lint`.

## 4. Configuración

Las variables viven en `.env` (raíz) y `frontend/.env.local`. **Nunca** se suben al repositorio; las plantillas son `.env.example`.

| Grupo | Variables |
|---|---|
| Base de datos | `DB_URL`, `DB_USER`, `DB_PASSWORD` |
| RabbitMQ | `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USER`, `RABBITMQ_PASSWORD` |
| Supabase | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ADMIN_KEY`, `SUPABASE_REDIRECT_URL` |
| IA | `GEMINI_API_KEY`, `GEMINI_MODEL` (opcional) |
| Producción | `TUNNEL_TOKEN` (solo en `infra/produccion/.env`) |

La configuración de la API está en `backend/api/src/main/resources/application.properties`, con prefijo `fitpass.*`.

## 5. Arquitectura y convenciones del backend

- **Módulos:** `accesos`, `amenidades`, `auditoria`, `auth`, `catalog`, `clientes`, `ia`, `membresias`, `mensajeria`, `pagos`,
  `planes`, `reportes`, `reservas`, `sucursales`, más `common`, `config` y `exceptions`.
- **Capas:** cada módulo separa `controller`, `service`, `repository`, `dto` y `entity`. Los controladores solo reciben y responden;
  la lógica de negocio va en el servicio. Nada de un archivo que lo haga todo.
- **Acceso a datos:** se usan JPA y `JdbcTemplate`. Sigue el estilo que ya use el módulo que tocas.
- **Rutas:** todo vive bajo `/api`. Las del miembro van en `/api/mi/**`; las de prueba en `/api/dev/**`, que no se usan en producción.
- **Seguridad:** el inicio de sesión es de Supabase Auth; la API valida el JWT y usa los roles `ADMIN` y `MIEMBRO`.
  Toda ruta nueva se registra en `config/SecurityConfig.java` con el rol que corresponde. Por defecto, cerrada.
- **Errores:** usa `common/ApiErrors` y `exceptions/GlobalExceptionHandler`; no inventes otro formato de error.
- **Bitácora:** las operaciones que escriben se registran en `logs_sistema` mediante `auditoria/AuditoriaFilter`.
  Si agregas una ruta que crea, cambia o borra datos, agrega su regla en `auditoria/RutaAuditada.java`.
  Los campos con contraseñas, tokens o claves se ocultan solos; no los quites de ese filtro.
- **Mensajería:** los eventos de pago salen por RabbitMQ con patrón *outbox* (`eventos_outbox`) desde `mensajeria`.
  Un flujo nuevo debe responder a una acción real del sistema.
- **Asistente con IA (`ia`):** responde solo sobre información pública de FlexPass y cita los documentos de `resources/rag`.
  Nunca le envíes datos de clientes al modelo. Tiene un límite de mensajes por minuto (`fitpass.ia.mensajes-por-minuto`)
  y registra cada conversación en `logs_agente_ia`.

## 6. Base de datos

- PostgreSQL en Supabase, con PostGIS y pgvector. No hay Flyway: `spring.jpa.hibernate.ddl-auto=none`.
- El esquema de referencia es `db/init/01_schema.sql`. Algunas tablas que usa el código se crearon directo en Supabase y
  todavía no están en ese archivo: `perfiles_usuario`, `eventos_outbox`, `eventos_procesados` y `periodos_facturacion`.
- Cualquier cambio de esquema se acuerda con el equipo antes, se escribe como script SQL en `db/` y se avisa en el grupo.
- Power BI solo lee el esquema `reporting` con el usuario `powerbi_lector`. No le des acceso a otras tablas.

## 7. Desarrollo guiado por especificaciones

Ningún cambio de funcionalidad empieza por el código:

1. **Spec primero.** El responsable escribe o actualiza `specs/<modulo>.md`: objetivo, reglas de negocio, rutas o pantallas,
   datos que se guardan y casos de error.
2. **Leer antes de proponer.** El asistente lee la spec, este archivo y el código del módulo, y propone un plan corto.
   Si algo no está en la spec, pregunta o propone el cambio a la spec; no lo inventa.
3. **Implementar en una rama** `feature/<modulo>-<descripcion>`, solo lo que pide la spec.
4. **Revisión del estudiante.** El responsable revisa el cambio, lo compila, lo prueba y lo entiende lo suficiente para explicarlo en la defensa.
5. **Commit y PR del estudiante.** Si el comportamiento cambió, la spec se actualiza en el mismo PR.

| Spec | Módulo | Responsable |
|---|---|---|
| `specs/frontend.md` | Interfaz web (visitante, miembro y administrador) | Josué Vásquez |
| `specs/ia-agente.md` | Asistente con RAG sobre Gemini y pgvector | Josué Vásquez |

Cada módulo nuevo agrega su spec a esta tabla.

## 8. Lo que el asistente puede y no puede hacer

Puede:

- Leer el código, las specs y la documentación.
- Proponer planes, explicar código, revisar cambios y señalar errores.
- Escribir código en una rama de trabajo cuando el responsable lo pide, siguiendo la spec.
- Correr compilaciones, el lint y las pruebas locales.

No puede:

- Hacer commits, push, merge ni abrir PR. Lo hace cada estudiante (regla del curso: no se permite el vibecoding).
- Leer, mostrar ni modificar `.env`, `.env.local`, tokens o claves. La clave de administrador de Supabase nunca va en el frontend.
- Escribir en la base de datos compartida ni en producción, ni ejecutar scripts de `db/` contra ellas.
- Cambiar el esquema de la base, `SecurityConfig` o la configuración de producción sin que el responsable lo pida.
- Agregar dependencias que no estén anotadas en la spec del módulo.
- Enviar datos personales de clientes a servicios externos, incluido el modelo de IA.

## 9. Git

- Ramas `feature/<modulo>-<descripcion>` desde `main`; los cambios grandes entran por pull request.
- Mensajes de commit y descripciones de PR en español sencillo, que digan qué se hizo
  (por ejemplo: "Agregar la bitácora de operaciones del sistema y del asistente").
- Historial legible: commits pequeños y frecuentes, nada de un commit masivo al final.
- Después de un merge a `main`, producción se actualiza en la Raspberry Pi con `git pull` y
  `docker compose up -d --build` dentro de `infra/produccion`.

## 10. Antes de dar por terminado un cambio

- [ ] Compila (`mvn clean install -DskipTests`) y, si aplica, `npm run build` y `npm run lint` pasan.
- [ ] Las rutas nuevas están en `SecurityConfig` y, si escriben datos, en `RutaAuditada`.
- [ ] La spec del módulo refleja el comportamiento final.
- [ ] No hay claves, `.env` ni datos personales en el cambio.
- [ ] Se le indicó al responsable qué archivos cambiaron y por qué, para que revise y haga el commit.
