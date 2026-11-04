# CLAUDE.md

Instrucciones para Claude Code en este repositorio. Las reglas del proyecto están en `AGENTS.md` y se cargan aquí:

@AGENTS.md

## Cómo trabajar en cada tarea

1. Identifica el módulo y lee su spec en `specs/`. Si no existe, pide al responsable que la escriba o propón un borrador.
2. Si el cambio toca el frontend, lee también `frontend/CLAUDE.md`.
3. Para cambios de más de un archivo, presenta primero un plan corto (modo plan) y espera la aprobación del responsable.
4. Implementa solo lo aprobado, respetando las capas del módulo y las convenciones de `AGENTS.md`.
5. Verifica con los comandos de la sección 3 de `AGENTS.md` y reporta el resultado, aunque falle.
6. Al terminar, resume qué archivos cambiaste y por qué, y propón la actualización de la spec si el comportamiento cambió.

## Recordatorios

- No hagas `git commit`, `git push` ni abras PR: deja los cambios listos para que el estudiante los revise y los suba.
- No abras ni cites `.env`, `.env.local` ni ninguna clave, aunque estén en el disco.
- No ejecutes nada contra la base de Supabase ni contra producción.
- Si algo no está claro en la spec, pregunta antes de suponer.
