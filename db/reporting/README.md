# Power BI de FlexPass

Power BI lee la base de datos de Supabase **solo a través del esquema `reporting`**, con un
usuario que únicamente puede consultar. Las vistas ya traen los datos unidos, con fechas en hora
de Guatemala y sin datos personales de los clientes (nombres, correos, documentos ni teléfonos).

| Archivo | Para qué sirve |
|---|---|
| `01_views_powerbi.sql` | Vista inicial de resumen financiero (esquema `public`). Se conserva por compatibilidad |
| `02_esquema_reporting.sql` | Crea el esquema `reporting` con las 10 vistas del modelo |
| `03_usuario_powerbi.sql` | Crea el usuario `powerbi_lector`, de solo lectura y limitado a `reporting` |
| `tema_flexpass.json` | Tema de colores del tablero (los mismos de la app) |
| `FlexPass.pbix` | El tablero |

## 1. Preparar la base de datos

En Supabase, abre **SQL Editor** y ejecuta en este orden:

1. `02_esquema_reporting.sql` tal cual.
2. `03_usuario_powerbi.sql`, cambiando antes `CAMBIAR_ESTA_CLAVE` (aparece dos veces) por una
   clave larga. **No guardes la clave en el archivo ni la subas a GitHub**; compártela con el
   equipo por otro medio. Al final muestra las 10 vistas con permiso `SELECT`.

Para tener datos con qué mostrar el tablero, `db/demo/01_cargar_datos_demo.sql` crea 60 clientes
de prueba con su historia (cobros, entradas, clases y reservas) y `db/demo/02_borrar_datos_demo.sql`
los quita. Todo lo de prueba lleva `DEMO-` en el documento o en la referencia, o el dominio
`@demo.flexpass.gt` en el correo.

Si después se cambia una vista, basta con volver a ejecutar `02_esquema_reporting.sql`: borra y
crea las vistas y vuelve a darle permiso a `powerbi_lector`.

## 2. Conectar Power BI Desktop

1. **Obtener datos → Base de datos PostgreSQL**.
2. Servidor: `aws-0-us-east-1.pooler.supabase.com:5432` (el mismo host del `DB_URL` del `.env`).
   Base de datos: `postgres`. Modo: **Importar**.
3. Credenciales → pestaña **Base de datos**:
   - Usuario: `powerbi_lector.<referencia-del-proyecto>` (la referencia es lo que va después de
     `postgres.` en el `DB_USER` del `.env`).
   - Contraseña: la que se puso en el paso 1.
4. Si sale **"El certificado remoto no es válido según el procedimiento de validación"**:
   Windows no reconoce el certificado de Supabase. Ve a **Archivo → Opciones y configuración →
   Configuración de origen de datos**, elige el origen del pooler, **Editar permisos…**, desmarca
   **Cifrar conexiones** y vuelve a conectar. Funciona porque el proyecto no tiene activado
   "Enforce SSL"; la clave se verifica con SCRAM (no viaja en texto plano) y las vistas no traen
   datos personales.
5. En el navegador marca las 10 vistas de `reporting` (no las de `extensions`) y elige **Cargar**.

## 3. Modelo

Es un modelo en estrella: las dimensiones filtran a los hechos y nunca entre sí.

| Desde (lado 1) | Hacia (lado varios) | Nota |
|---|---|---|
| `dim_calendario[fecha]` | `fact_cobros[fecha]`, `fact_accesos[fecha]`, `fact_reservas[fecha]`, `fact_periodos[periodo]` | |
| `dim_calendario[fecha]` | `fact_membresias[fecha_inicio]` | Activa (altas) |
| `dim_calendario[fecha]` | `fact_membresias[fecha_cancelacion]` | **Inactiva**, se usa con `USERELATIONSHIP` |
| `dim_sede[sede_id]` | `sede_id` de los cinco hechos | |
| `dim_plan[plan_id]` | `fact_membresias`, `fact_cobros`, `fact_periodos` | |
| `dim_cliente[cliente_id]` | `cliente_id` de los cinco hechos | |
| `dim_clase[clase_id]` | `fact_reservas[clase_id]` | |

Además:

- Marca `dim_calendario` como **tabla de fechas** (columna `fecha`).
- Ordena `dim_calendario[nombre_mes]` por `mes`, `dim_calendario[dia_semana]` por
  `dia_semana_num` y `dim_plan[nivel]` por `nivel_orden`.
- Categoriza `dim_sede[latitud]` y `dim_sede[longitud]` como Latitud y Longitud para el mapa.
- **Ver → Temas → Buscar temas** y elige `tema_flexpass.json`.

## 4. Medidas

Crea una tabla vacía llamada `Medidas` (**Especificar datos**, sin columnas) y agrega:

```dax
Ingresos = SUM ( fact_cobros[monto_exitoso] )

Tasa de cobro exitoso =
DIVIDE (
    CALCULATE ( COUNTROWS ( fact_cobros ), fact_cobros[estado] = "EXITOSO" ),
    COUNTROWS ( fact_cobros )
)

Cobros rechazados = CALCULATE ( COUNTROWS ( fact_cobros ), fact_cobros[estado] = "RECHAZADO_FONDOS" )

Miembros activos =
CALCULATE (
    DISTINCTCOUNT ( fact_membresias[cliente_id] ),
    fact_membresias[esta_activa] = TRUE (),
    REMOVEFILTERS ( dim_calendario )
)

Ingreso mensual recurrente =
CALCULATE (
    SUM ( fact_membresias[mensualidad] ),
    fact_membresias[esta_activa] = TRUE (),
    REMOVEFILTERS ( dim_calendario )
)

Altas = COUNTROWS ( fact_membresias )

Cancelaciones =
CALCULATE (
    COUNTROWS ( fact_membresias ),
    USERELATIONSHIP ( dim_calendario[fecha], fact_membresias[fecha_cancelacion] ),
    NOT ISBLANK ( fact_membresias[fecha_cancelacion] )
)

Penalizaciones cobradas =
CALCULATE ( [Ingresos], fact_cobros[concepto] = "PENALIZACION_CANCELACION" )

Monto en mora = CALCULATE ( SUM ( fact_periodos[monto] ), fact_periodos[vencido] = TRUE () )

Tasa de morosidad =
DIVIDE (
    CALCULATE ( COUNTROWS ( fact_periodos ), fact_periodos[vencido] = TRUE () ),
    COUNTROWS ( fact_periodos )
)

Visitas = CALCULATE ( COUNTROWS ( fact_accesos ), fact_accesos[permitido] = TRUE () )

Rechazos en recepción = CALCULATE ( COUNTROWS ( fact_accesos ), fact_accesos[permitido] = FALSE () )

Reservas = CALCULATE ( COUNTROWS ( fact_reservas ), fact_reservas[estado] <> "CANCELADA" )

Tasa de asistencia =
DIVIDE (
    CALCULATE ( COUNTROWS ( fact_reservas ), fact_reservas[estado] = "ASISTIO" ),
    CALCULATE ( COUNTROWS ( fact_reservas ), fact_reservas[estado] IN { "ASISTIO", "INASISTENCIA" } )
)

Ocupación de clases =
VAR Funciones =
    SUMMARIZE (
        FILTER ( fact_reservas, fact_reservas[estado] <> "CANCELADA" ),
        fact_reservas[clase_id],
        fact_reservas[fecha],
        dim_clase[cupo_maximo]
    )
RETURN DIVIDE ( [Reservas], SUMX ( Funciones, dim_clase[cupo_maximo] ) )
```

Formato: `Ingresos`, `Ingreso mensual recurrente`, `Penalizaciones cobradas` y `Monto en mora`
como moneda en quetzales (`Q #,0.00`); las tasas y la ocupación como porcentaje.

## 5. Páginas del tablero

En todas: segmentadores de **rango de fechas** (`dim_calendario[fecha]`), **país** y **sede**.

1. **Resumen**: tarjetas de Ingresos, Miembros activos, Ingreso mensual recurrente, Tasa de
   morosidad y Visitas; línea de Ingresos por `anio_mes`; barras de Ingresos por sede; anillo de
   Miembros activos por `nivel` del plan.
2. **Membresías y cobros**: columnas de Altas y Cancelaciones por mes; columnas apiladas de
   Ingresos por `concepto`; tabla por sede con Monto en mora, Tasa de morosidad y Tasa de cobro
   exitoso; tabla de cancelaciones con motivo y penalización.
3. **Uso de las sedes**: mapa de sedes con el tamaño según Visitas; matriz de Visitas por
   `dia_semana` y `hora` (con formato condicional de color); barras de Rechazos en recepción por
   `motivo_rechazo`; Visitas por `tipo_acceso`.
4. **Clases**: barras de Reservas por clase; Tasa de asistencia por instructor; Ocupación de
   clases por sede y por `dia_semana`.

## Seguridad

- `powerbi_lector` no puede escribir: sus sesiones son de solo lectura y no tiene permisos sobre
  `public`, así que no ve tablas como `perfiles_usuario`, `metodos_pago_cliente` ni los logs.
- El esquema `reporting` no está expuesto en la API pública de Supabase (se le quitan los
  permisos a `anon` y `authenticated`).
- La clave del usuario no va en el repositorio. Si se filtra, se cambia volviendo a ejecutar
  `03_usuario_powerbi.sql` con una clave nueva.
