# Gym Platform — Proyecto Final Programación Comercial

Sistema tipo Smart Fit con uso nacional e internacional, validación de planes/paquetes,
accesos exclusivos por sede, descuentos automáticos y cancelación con penalización.

Para la arquitectura completa, la tecnología elegida y el reparto de fases, ver
[`docs/organizacion-repositorio-equipo.md`](docs/organizacion-repositorio-equipo.md).

---

## ✅ Qué hacer AHORA (semana 0)

### Marco
- [ ] Subir el `docker-compose.yml` (Postgres + PostGIS/pgvector, RabbitMQ, pgAdmin) a `infra/`.
- [ ] Crear `db/init/001_extensions.sql` con `CREATE EXTENSION postgis;` y `CREATE EXTENSION vector;`.
- [ ] Probar que los 3 contenedores levantan con `docker compose up` y documentar los pasos en `README` de `infra/`.
- [ ] Empezar a listar los 15 reportes propuestos en `specs/reporting.md` (nombre, filtros, agregaciones).

### Marvin
- [ ] Crear el repositorio en GitHub bajo la cuenta del equipo.
- [ ] Configurar ramas `main` y `develop` como protegidas (PR obligatorio, al menos 1 aprobación).
- [ ] Configurar `CODEOWNERS` con las áreas de cada quien.
- [ ] Crear el proyecto de GitHub (tablero Kanban) con las fases como columnas.
- [ ] Iniciar el proyecto Maven multi-módulo (`backend/api`, `backend/worker`, `backend/common`) vacío pero compilando.
- [ ] Agregar un workflow básico de GitHub Actions (build + test) sobre `develop`.

### Josue
- [ ] Iniciar el proyecto `frontend/` con React + Vite + TypeScript.
- [ ] Definir la librería de mapas (Leaflet) y hacer una prueba mínima con un mapa y 2-3 marcadores de ejemplo.
- [ ] Empezar el wireframe de las pantallas principales (login, listado de sedes, detalle de sede con amenidades).

### Johan
- [ ] Escribir la spec de negocio (`specs/membership.md`): reglas de planes, vigencia, penalización por cancelación anticipada, condiciones de descuentos automáticos.
- [ ] Proponer el catálogo inicial de planes (nacional, internacional, básico/premium) con sus reglas de acceso a zonas exclusivas.

### Todos juntos (bloqueante, hacerlo primero)
- [ ] Sesión de 1-2 horas para definir el **modelo entidad-relación** completo (usar draw.io o dbdiagram.io) antes de que Marvin empiece las migraciones Flyway.
- [ ] Acordar el estilo de commits (Conventional Commits) y el formato de nombres de ramas (`feature/<modulo>-<descripcion>`).
- [ ] Cada uno crea su archivo `specs/<su-modulo>.md` (aunque sea un borrador) para tener evidencia de desarrollo guiado por especificaciones desde el día 1.
- [ ] Crear `CLAUDE.md` y `AGENTS.md` en la raíz con las convenciones del proyecto (paquetes, estilo, qué puede y no puede tocar el agente).

---

## ⚠️ Importante — no olvidar

- **No hacer vibecoding.** Los commits pueden apoyarse en IA (Claude Code, etc.) pero **debe hacerlos cada estudiante**, entendiendo lo que sube. En la defensa oral es individual y les van a preguntar sobre cualquier parte del código.
- **Nombrar las migraciones Flyway con timestamp**, no con número secuencial (`V20261005_1030__crear_tabla_sede.sql`), para evitar choques cuando dos personas migran a la vez. Avisar en el grupo antes de mergear un cambio de esquema.
- **No usar SQLite** ni bases de datos embebidas: solo PostgreSQL (real, en contenedor o en la nube).
- **Desplegar desde ya**, aunque sea un esqueleto. El PDF dice explícitamente que **los sistemas no desplegados no se revisan**. No dejarlo para el final.
- **Los flujos de RabbitMQ deben estar conectados a una acción real** (registro, pago, cancelación), no ser un ejemplo aislado de "hola mundo con colas".
- **Nada de un solo archivo gigante.** Respetar la separación por módulos y capas desde el primer commit.
- **Cada reporte** (mínimo 15) debe poder exportarse en **Excel y PDF**, con filtros y agregaciones reales, no datos fijos.
- **Historial de Git legible desde la semana 0.** No hacer commits masivos de última hora; el PDF lo penaliza explícitamente.
- **Documentar en el manual técnico a medida que avanzan**, no al final del proyecto.

---

## 📁 Dónde poner cada cosa

| Qué es | Dónde va |
|---|---|
| Docker Compose | `infra/docker-compose.yml` |
| Scripts SQL iniciales / extensiones | `db/init/` |
| Specs por módulo | `specs/<modulo>.md` |
| Diagrama E-R, seeds, vistas de Power BI | `db/` |
| Manual técnico y diagramas de arquitectura | `docs/` |
| Convenciones para agentes de IA | `CLAUDE.md`, `AGENTS.md` (raíz) |
