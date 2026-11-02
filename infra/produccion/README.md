# Despliegue de FlexPass

Todo el sistema queda en **un solo dominio**, por ejemplo `https://flexpass.TU_DOMINIO`:

```
Navegador ──► Cloudflare (HTTPS) ──► túnel ──► Raspberry Pi
                                                 ├─ web   nginx: la app de React y /api → api
                                                 ├─ api   Spring Boot ──► Supabase (base de datos y Auth)
                                                 └─ rabbitmq
```

- **No se abre ningún puerto del router**: `cloudflared` sale desde la Pi hacia Cloudflare.
  Funciona aunque el proveedor de internet use CGNAT.
- Como la app y la API están en el mismo dominio, el navegador no necesita CORS.
- Los contenedores tienen límite de memoria y no montan carpetas de la Pi, así que no tocan el
  resto de lo que corre en ella (por ejemplo, el NAS).

## 1. Preparar la Pi (una sola vez)

1. Docker y el plugin de Compose instalados (`docker compose version` debe responder).
2. Clonar el repositorio:
   ```bash
   git clone https://github.com/JohanRRod/Proyecto-PrograC.git ~/flexpass
   cd ~/flexpass/infra/produccion
   cp .env.example .env
   nano .env
   ```
   Para clonar un repo privado hace falta un token de GitHub de solo lectura
   (*Settings → Developer settings → Fine-grained tokens*, con acceso de lectura a este repo).
3. Llenar `.env` con los mismos valores del `.env` de desarrollo, más:
   - `RABBITMQ_USER` y `RABBITMQ_PASSWORD`: inventados; RabbitMQ corre en la misma Pi.
   - `SUPABASE_REDIRECT_URL`: `https://flexpass.TU_DOMINIO/auth/callback`.
   - `TUNNEL_TOKEN`: del paso 2.

## 2. Crear el túnel en Cloudflare

1. En el panel de Cloudflare: **Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared**.
2. Nombre: `flexpass`. Copia el **token** que aparece en el comando de instalación (la parte larga
   después de `--token`) y pégalo en `TUNNEL_TOKEN` del `.env`. No hace falta instalar nada más:
   el contenedor `cloudflared` ya viene en el compose.
3. En **Public Hostnames → Add a public hostname**:
   - Subdomain: `flexpass` · Domain: tu dominio
   - Service: **HTTP** · URL: `web:80`

   Cloudflare crea el registro DNS y el certificado HTTPS solo.

## 3. Configurar Supabase Auth

En Supabase: **Authentication → URL Configuration**

- **Site URL**: `https://flexpass.TU_DOMINIO`
- **Redirect URLs**: agregar `https://flexpass.TU_DOMINIO/auth/callback`
  (dejar también la de `http://localhost:5173/auth/callback` para seguir desarrollando).

## 4. Levantar

```bash
cd ~/flexpass/infra/produccion
docker compose up -d --build
docker compose ps
docker compose logs -f api      # Ctrl+C para salir; debe terminar en "Started FitpassApplication"
```

La primera vez tarda varios minutos porque compila el backend y el frontend en la Pi.
Luego abre `https://flexpass.TU_DOMINIO`.

## Actualizar después de un merge a main

```bash
cd ~/flexpass && git pull
cd infra/produccion && docker compose up -d --build
```

## Problemas comunes

| Síntoma | Causa probable |
|---|---|
| Error 1033 de Cloudflare | El contenedor `cloudflared` no está corriendo o el token está mal: `docker compose logs cloudflared` |
| Error 502 en `/api/...` | El backend todavía está arrancando o falló: `docker compose logs api` |
| La invitación por correo lleva a `localhost` | Falta `SUPABASE_REDIRECT_URL` en `.env` o la URL en Supabase Auth |
| `too many connections` en la base | Se juntaron muchas conexiones al pooler de Supabase; reiniciar `api` |
