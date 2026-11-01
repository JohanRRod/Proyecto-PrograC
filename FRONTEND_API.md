# FitPass — Guía de integración Frontend y Backend

## 1. Descripción

FitPass es una plataforma de gestión de gimnasios desarrollada con Spring Boot y PostgreSQL, con autenticación mediante Supabase Auth.

Este documento describe cómo conectar el frontend desarrollado en React y Tailwind CSS con la API REST de FitPass.

## 2. Tecnologías

**Backend**
- Java 24
- Spring Boot 3.3.13
- PostgreSQL
- Supabase Auth
- RabbitMQ
- Maven

**Frontend**
- React
- Tailwind CSS
- Supabase JavaScript Client

## 3. Configuración local

| Servicio | Dirección |
|---|---|
| Backend | `http://localhost:8080` |
| Frontend (Vite) | `http://localhost:5173` |
| API REST | `http://localhost:8080/api` |

El backend tiene CORS configurado para permitir solicitudes desde `http://localhost:5173`.

## 4. Autenticación

FitPass utiliza JWT emitidos por Supabase Auth.

El frontend debe iniciar sesión mediante Supabase y enviar el token de acceso en las solicitudes protegidas.

**Encabezado requerido:**

```http
Authorization: Bearer <ACCESS_TOKEN>
```

Los roles disponibles son:

- `ADMIN`: acceso a operaciones administrativas.
- `MIEMBRO`: acceso a información personal y operaciones autorizadas.

Los permisos se verifican en el backend, no únicamente en React.

## 5. Obtener el perfil autenticado

**Endpoint:**

```http
GET /api/auth/me
```

**Ejemplo de respuesta:**

```json
{
  "usuarioId": "uuid-del-usuario",
  "clienteId": "uuid-del-cliente",
  "rol": "MIEMBRO"
}
```

El frontend puede utilizar `rol` para determinar qué panel mostrar.

El campo `clienteId` puede ser `null` para perfiles administrativos sin cliente asociado.

## 6. Catálogo público

Estos endpoints permiten consultar información del gimnasio:

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/catalogo/paises` | Listar países |
| GET | `/api/catalogo/planes` | Listar planes activos |
| GET | `/api/catalogo/amenidades` | Listar amenidades |
| GET | `/api/catalogo/sucursales` | Listar sucursales activas |
| GET | `/api/catalogo/sucursales/{id}/amenidades` | Consultar amenidades por sucursal |

No requieren JWT.

## 7. Endpoints del miembro

Requieren un JWT válido con rol `MIEMBRO`.

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/mi/membresias` | Consultar mis membresías |
| GET | `/api/mi/pagos/metodos` | Consultar mis métodos de pago |
| GET | `/api/mi/pagos/historial` | Consultar mi historial de pagos |
| GET | `/api/mi/pagos/periodos` | Consultar mis períodos de facturación |

El backend obtiene la identidad del usuario desde el JWT. React no necesita enviar un `clienteId` para estas consultas.

## 8. Endpoints administrativos

Requieren un JWT válido con rol `ADMIN`.

| Módulo | Ruta base | Funciones |
|---|---|---|
| Clientes | `/api/clientes` | CRUD |
| Planes | `/api/planes` | CRUD |
| Sucursales | `/api/sucursales` | CRUD |
| Membresías | `/api/membresias` | Crear, consultar y solicitar cancelación |
| Pagos | `/api/pagos` | Métodos de pago, cobros e historial |
| Amenidades | `/api/amenidades` | Administración de amenidades |
| Clases | `/api/clases` | Consultar clases y disponibilidad |
| Reservas | `/api/reservas` | Crear, cancelar y consultar reservas |
| Accesos | `/api/accesos` | Check-in e historial |
| Reportes | `/api/reportes` | Consultas y exportaciones |

Para los cuerpos JSON, parámetros y respuestas de cada operación administrativa, consultar los controladores y DTO correspondientes.

## 9. Códigos HTTP

| Código | Significado |
|---|---|
| 200 | Solicitud exitosa |
| 201 | Recurso creado |
| 204 | Operación exitosa sin contenido |
| 400 | Datos inválidos |
| 401 | No autenticado o token inválido |
| 403 | Usuario sin permisos |
| 404 | Recurso no encontrado |
| 409 | Conflicto con un recurso existente |

## 10. Ejemplo de integración con React

```javascript
const API_URL = "http://localhost:8080/api";

export async function obtenerMiPerfil(accessToken) {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}`);
  }

  return response.json();
}
```

El token debe obtenerse de la sesión activa de Supabase Auth.

No se deben incluir contraseñas, claves privadas ni tokens reales en el código fuente.

## 11. Consideraciones de seguridad

- Utilizar HTTPS en producción.
- No utilizar claves `service_role` de Supabase en React.
- Mantener las credenciales del backend en variables de entorno.
- No confiar en el rol almacenado únicamente en el frontend.
- Los endpoints `/api/dev/**` son exclusivamente para desarrollo y no deben exponerse en producción.
- No permitir que un usuario consulte o modifique recursos pertenecientes a otro cliente.

## 12. Funcionalidades pendientes de confirmar para el frontend

Antes de implementar los flujos completos del panel de miembro, confirmar si se requieren endpoints adicionales para:

- Contratar una membresía desde la cuenta del miembro.
- Solicitar la cancelación de su propia membresía.
- Registrar o actualizar métodos de pago propios.
- Consultar clases y realizar reservas como miembro.
- Consultar el historial personal de accesos.

Estas funcionalidades no deben considerarse disponibles para `MIEMBRO` hasta que se implementen y prueben sus rutas correspondientes.

## 13. Estado de integración

- [x] Backend compila correctamente.
- [x] Autenticación JWT implementada.
- [x] Roles `ADMIN` y `MIEMBRO` configurados.
- [x] Endpoint `/api/auth/me` probado.
- [x] Endpoints de consulta del miembro probados.
- [x] CORS local probado mediante solicitud OPTIONS.
- [ ] Integración real desde React.
- [ ] Verificación de flujos completos de miembro.
- [ ] Configuración de CORS para el dominio de producción.
