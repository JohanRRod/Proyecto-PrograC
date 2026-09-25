# Organización del repositorio y del equipo

## 1. Estructura del repositorio

```
gym-platform/
├─ backend/                 # Maven multi-módulo
│  ├─ api/                  # API REST (monolito modular)
│  │   └─ src/main/java/.../modules/
│  │       ├─ identity/     # usuarios, roles, JWT
│  │       ├─ catalog/      # países, sedes, amenidades, zonas, planes
│  │       ├─ membership/   # miembros, membresías, cancelación
│  │       ├─ access/       # check-in y validación
│  │       ├─ billing/      # pagos, facturas, descuentos
│  │       ├─ classes/      # clases, reservas, entrenadores
│  │       ├─ reporting/
│  │       ├─ ai/           # agente + RAG
│  │       └─ audit/
│  ├─ worker/               # consumidores RabbitMQ
│  └─ common/               # eventos, DTOs de mensajes compartidos
├─ frontend/                # React + Vite + TS
├─ db/                      # diagrama E-R, seeds, vistas de Power BI, scripts init
├─ infra/                   # docker-compose, nginx, scripts de despliegue
├─ specs/                   # una spec por módulo (.md)
├─ docs/                    # manual técnico, diagramas de arquitectura
├─ CLAUDE.md
├─ AGENTS.md
└─ README.md
```

Cada módulo de `modules/` tiene su propio `controller / service / repository / domain`. Con eso el código de cada persona queda separado y hay muchos menos conflictos de merge.

## 2. Flujo de Git

- **`main`**: protegida, es lo que está desplegado. Solo se entra por PR desde `develop`.
- **`develop`**: integración. Protegida también, con PR obligatorio.
- **`feature/<modulo>-<descripcion>`**: por ejemplo `feature/access-checkin-validation`.
- **Regla de revisión**: todo PR lo aprueba **otra persona** del equipo, idealmente rotando. Así los cuatro conocen todo el código, lo cual les sirve para la defensa individual.
- **Commits** con formato Conventional Commits (`feat(access): valida zona exclusiva en check-in`).
- **GitHub Actions**: compila y corre tests en cada PR, y despliega desde `main`.
- **`CODEOWNERS`**: cada carpeta tiene un responsable que revisa por defecto.
- **Issues y Projects**: un tablero con una tarjeta por tarea. Sirve como evidencia del proceso.

**Detalle clave con Flyway:** si dos personas crean `V5__algo.sql` al mismo tiempo, choca. Usen versiones por timestamp (`V20261005_1030__crear_tabla_sede.sql`) o acuerden que todo cambio de esquema se anuncia en el grupo antes de mergear.

## 3. Reparto del equipo

| Integrante | Área | Fases |
|---|---|---|
| **Johan** | **Núcleo del negocio**: miembros, membresías, accesos, pagos, descuentos automáticos, cancelación con penalización | 5, 6, 7 |
| **Marvin** | **Plataforma**: modelo de BD y Flyway, seguridad JWT, RabbitMQ y worker, auditoría transversal, CI/CD y despliegue | 0, 1, 2, 3, 8, 9 |
| **Josue** | **Frontend y catálogos**: CRUD de sedes, amenidades, zonas y planes, clases y reservas, todas las pantallas y el mapa | 4, 10, 11 |
| **Marco** | **Datos e IA + Docker Compose**: Postgres (PostGIS/pgvector), RabbitMQ y pgAdmin en contenedores, 15 reportes con Excel/PDF, Power BI, agente IA y RAG | 0 (docker), 12, 13, 14 |

**Dependencias que hay que gestionar:**
- **Marco** entrega el Docker Compose al inicio, para que todos tengan Postgres y RabbitMQ corriendo localmente desde la semana 0. Luego sigue con reportes y RAG, para lo cual depende de que haya datos: al principio puede diseñar los 15 reportes, escribir los datos semilla y preparar la ingesta de documentos, y pasar a las consultas reales cuando Johan y Josue avancen.
- **Josue** depende de los endpoints. Acuerden el contrato en OpenAPI (Swagger) antes de programar, y así puede usar datos falsos (mocks) mientras el backend se termina.
- **Johan** depende de la BD y la seguridad de Marvin. Por eso Marvin va primero: las Fases 0 a 3 son lo que desbloquea a los demás.

**Reglas de equipo:**
- Todos escriben la sección del manual técnico de sus módulos, sin dejarlo al final.
- Todos suben commits desde la primera semana. El PDF pide un historial legible y que no se haga a última hora.
- Cada uno debe poder explicar el sistema completo, no solo su parte, porque la defensa oral es individual.

## 4. Primeros pasos (semana 0)

1. **Marco** entrega el `docker-compose.yml` (Postgres + PostGIS/pgvector, RabbitMQ, pgAdmin) para que todos lo levanten localmente.
2. **Marvin** crea el repo, protege las ramas y agrega el CI básico.
3. **Todos juntos** (una sesión de 1-2 horas) definen el modelo E-R en draw.io o dbdiagram.io.
4. **Cada uno** escribe la spec (`specs/<modulo>.md`) de su área y el `CLAUDE.md` inicial con las convenciones.
5. **Marvin** despliega el esqueleto en la nube con un "hello world" conectado a la BD.
