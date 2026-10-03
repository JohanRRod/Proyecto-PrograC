# Propuesta técnica — Gym Platform

Sistema tipo Smart Fit con uso nacional e internacional, validación de planes/paquetes,
accesos exclusivos por sede, referencia visual/mapa de sedes y amenidades, descuentos
automáticos y cancelación de membresía con penalización.

---

## 1. Arquitectura

**Monolito modular con capas, más un worker separado para RabbitMQ.**

Se descarta microservicios: implica mucha sobrecarga de despliegue y depuración para un
equipo estudiantil. El monolito modular cumple con "no todo en un archivo", es fácil de
defender oralmente y se puede separar después si hiciera falta.

```
Frontend (React + Mapa)
        │  HTTPS / REST
        ▼
API REST (monolito modular)  ──────►  RabbitMQ  ──────►  Worker (consumidor)
  ├─ Módulo Identidad/Seguridad                            ├─ correos
  ├─ Módulo Sedes/Amenidades/Zonas                         ├─ facturas PDF
  ├─ Módulo Planes/Membresías/Accesos                      └─ penalizaciones
  ├─ Módulo Pagos/Descuentos/Cancelaciones
  ├─ Módulo Clases/Reservas/Entrenadores
  ├─ Módulo Reportería
  ├─ Módulo Agente IA + RAG
  └─ Módulo Auditoría/Logs
        │
        ▼
PostgreSQL (+ PostGIS + pgvector)  ──►  Power BI (vistas de solo lectura)
```

Dentro de cada módulo se usan capas: `controller → service → repository → entity/DTO`.
En los módulos más complejos (Membresías, Agente IA) se puede aplicar arquitectura
hexagonal ligera (puertos y adaptadores) para sumar puntos en la defensa.

---

## 2. Tecnología

**Backend: Java 21 + Spring Boot 3.**

Cumple la restricción del curso (no Node ni FastAPI) y cubre todo lo que pide el proyecto:

| Necesidad | Herramienta |
|---|---|
| API REST | Spring Web |
| Seguridad y roles | Spring Security + JWT |
| Base de datos | Spring Data JPA + Flyway (migraciones versionadas) |
| RabbitMQ | Spring AMQP |
| Tareas programadas (descuentos automáticos) | `@Scheduled` |
| Excel | Apache POI |
| PDF | JasperReports u OpenPDF |
| Agente IA + RAG | Spring AI (o LangChain4j) |
| Documentación de API | springdoc-openapi (Swagger) |

**Frontend:** React + Vite + TypeScript. La restricción de JavaScript del curso aplica al
backend, no al frontend. Para el mapa: **Leaflet + OpenStreetMap** (gratis, sin tarjeta).

**Mensajería:** RabbitMQ (más sencillo que Kafka para este caso).

**IA:** un LLM por API (Claude, OpenAI o Gemini) con *tool calling*, más un modelo de
embeddings para el RAG.

---

## 3. Base de datos

**PostgreSQL 16**, con dos extensiones clave:

- **PostGIS**: consultas geográficas ("gimnasios a 5 km de mí"), para el mapa de sedes.
- **pgvector**: guarda los embeddings del RAG en la misma base de datos, sin necesidad
  de una base vectorial aparte.

Power BI se conecta directo a PostgreSQL mediante un esquema `reporting` con vistas y un
usuario de solo lectura.

**Herramientas de apoyo:**
- DBeaver o pgAdmin para administrar la base.
- dbdiagram.io o draw.io para el diagrama entidad-relación.
- Docker Compose para levantar Postgres y RabbitMQ en local, con el mismo entorno para
  todo el equipo.

---

## 4. Entidades núcleo (12–15 mínimo)

`País`, `Ciudad`, `Sede (Gimnasio)`, `Amenidad`, `SedeAmenidad`, `Zona exclusiva`, `Plan`,
`PlanZonaAcceso`, `Miembro`, `Membresía`, `Pago`, `Factura`, `Descuento/Promoción`,
`DescuentoAplicado`, `Acceso (check-in)`, `Clase`, `Reserva`, `Entrenador`, `Cancelación`,
`Penalización`, `Moneda/TipoCambio`, `Usuario/Rol`.

**Reglas de negocio con complejidad real:**
- **Validación de acceso:** en el check-in se valida que la membresía esté vigente y que
  el plan permita esa sede (nacional o internacional) y esa zona exclusiva.
- **Descuentos automáticos:** un job programado aplica reglas como antigüedad, pago
  anual, cumpleaños o referidos (puede ser simulado).
- **Cancelación con penalización:** si se cancela antes del período mínimo de
  permanencia, se calcula una penalización (por ejemplo, % de los meses restantes) y se
  genera un cargo.

---

## 5. Flujos de RabbitMQ (conectados a acciones reales)

- **Registro de miembro** → cola → correo de bienvenida.
- **Pago confirmado** → cola → generar factura PDF y enviarla.
- **Cancelación de membresía** → cola → calcular penalización, generar el cargo y
  notificar.

Se implementan reintentos y Dead Letter Queue en al menos uno de estos flujos.

---

## 6. Agente de IA + RAG

- **Agente con herramientas:** consulta sedes, horarios, amenidades y planes disponibles
  (solo información pública).
- **RAG:** ingesta de documentos del negocio (términos y condiciones, política de
  cancelación, FAQ, reglamento) → fragmentación → embeddings en pgvector → recuperación
  → respuesta con citas de la fuente.
- **Auditoría:** cada conversación, herramienta invocada y documento citado se guarda en
  tablas (`ai_conversation`, `ai_tool_call`).

---

## 7. Despliegue

Un **VPS con Docker Compose** (Azure for Students, DigitalOcean, Hetzner o similar) que
corra API, worker, RabbitMQ, Postgres y frontend. Alternativa: servicios administrados
(Neon o Supabase para Postgres con pgvector, CloudAMQP con plan gratuito para RabbitMQ).



---

## 8. Orden de trabajo por módulos

| Fase | Qué se hace | Detalle |
|---|---|---|
| 0. Preparación | Repo, entorno, especificaciones | Ramas (`main`, `develop`, `feature/*`), `CLAUDE.md`/`AGENTS.md`, `/specs`, Docker Compose |
| 1. Base de datos | Modelo E-R y migraciones | Diagrama, scripts Flyway, datos semilla (países, sedes, planes) |
| 2. Esqueleto + despliegue | API mínima desplegada | "Hello world" con conexión a BD, corriendo en la nube |
| 3. Seguridad | Usuarios, roles, JWT | Admin, recepción, entrenador, miembro |
| 4. Catálogos | CRUD de sedes, amenidades, zonas, planes | Incluye coordenadas de las sedes (PostGIS) |
| 5. Miembros y membresías | Registro, contratación, validación de planes | Núcleo del negocio |
| 6. Accesos | Check-in con validación por plan, sede y zona | Regla de negocio principal |
| 7. Pagos, descuentos y cancelación | Cobros simulados, descuentos automáticos, penalización | Aquí entra el job programado |
| 8. Mensajería | RabbitMQ conectado a registro, pagos y cancelación | Worker separado |
| 9. Auditoría y logs | Tablas de auditoría del sistema y del agente | Conviene hacerlo transversal desde antes |
| 10. Clases y reservas | CRUD restante hasta completar las entidades | Completa el CRUD |
| 11. Frontend | Pantallas por rol + mapa de sedes con amenidades | Puede avanzar en paralelo desde la fase 4 |
| 12. Reportería | 15 reportes con filtros, exportables a Excel y PDF | Diseñar los reportes desde la fase 1 |
| 13. Power BI | Vistas `reporting` y dashboard | Conexión a Postgres con usuario de solo lectura |
| 14. Agente IA + RAG | Ingesta, recuperación, citas, chat | Necesita que las fases 4 y 5 ya existan |
| 15. Manual técnico y defensa | Documentación y ensayo | Escribir el manual por fase, no al final |

Cada fase es una rama y un pull request: el historial debe ser legible y no hacerse a
última hora.

---

## 9. Recomendaciones para la defensa

- Preparar una demo con datos semilla realistas (sedes en Guatemala, México, Colombia,
  etc.) para mostrar el uso internacional.