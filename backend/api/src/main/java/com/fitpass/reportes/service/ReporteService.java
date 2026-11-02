package com.fitpass.reportes.service;

import com.fitpass.reportes.dto.ColumnaReporte;
import com.fitpass.reportes.dto.ReporteDefinicion;
import com.fitpass.reportes.dto.ReporteFiltros;
import com.fitpass.reportes.dto.ReporteInfo;
import com.fitpass.reportes.dto.ReporteResultado;
import com.fitpass.reportes.repository.ReporteCatalogo;
import com.fitpass.reportes.repository.ReporteRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class ReporteService {

    private static final ZoneId ZONA = ZoneId.of("America/Guatemala");

    /** Columnas cuyo contenido es un código (ACTIVA, RECHAZADO_FONDOS...) y se muestra legible. */
    private static final Set<String> COLUMNAS_CODIGO = Set.of(
        "estado", "concepto", "estado_cobro", "estado_membresia", "motivo_rechazo", "dia_semana");

    private static final Pattern CODIGO = Pattern.compile("[A-Z][A-Z_]*");

    private static final Map<String, String> TITULOS = Map.ofEntries(
        Map.entry("cliente", "Cliente"),
        Map.entry("documento", "Documento"),
        Map.entry("email", "Correo"),
        Map.entry("telefono", "Teléfono"),
        Map.entry("sucursal_base", "Sede base"),
        Map.entry("sucursal", "Sede"),
        Map.entry("sucursal_visitada", "Sede visitada"),
        Map.entry("estado", "Estado"),
        Map.entry("fecha_registro", "Fecha de registro"),
        Map.entry("plan", "Plan"),
        Map.entry("fecha_inicio", "Fecha de inicio"),
        Map.entry("fin_permanencia", "Fin de permanencia"),
        Map.entry("dia_cobro", "Día de cobro"),
        Map.entry("monto_mensual", "Cuota mensual"),
        Map.entry("fecha_cancelacion", "Fecha de cancelación"),
        Map.entry("cumplio_permanencia", "Cumplió permanencia"),
        Map.entry("monto_penalizacion", "Penalización"),
        Map.entry("motivo", "Motivo"),
        Map.entry("contrataciones", "Contrataciones"),
        Map.entry("activas", "Activas"),
        Map.entry("canceladas", "Canceladas"),
        Map.entry("porcentaje_del_total", "% del total"),
        Map.entry("mes", "Mes"),
        Map.entry("cobros_exitosos", "Cobros exitosos"),
        Map.entry("ingresos_mensualidades", "Mensualidades"),
        Map.entry("ingresos_inscripciones", "Inscripciones"),
        Map.entry("ingresos_mantenimiento", "Mantenimiento anual"),
        Map.entry("ingresos_penalizaciones", "Penalizaciones"),
        Map.entry("ingresos_totales", "Total"),
        Map.entry("fecha_intento", "Fecha del intento"),
        Map.entry("concepto", "Concepto"),
        Map.entry("monto_intentado", "Monto"),
        Map.entry("metodo_pago", "Método de pago"),
        Map.entry("periodo", "Período"),
        Map.entry("fecha_vencimiento", "Vencimiento"),
        Map.entry("dias_atraso", "Días de atraso"),
        Map.entry("intentos_cobro", "Intentos de cobro"),
        Map.entry("monto_pendiente", "Monto pendiente"),
        Map.entry("estado_membresia", "Estado de la membresía"),
        Map.entry("meses_restantes", "Meses restantes"),
        Map.entry("estado_cobro", "Estado del cobro"),
        Map.entry("monto_cobrado", "Cobrado"),
        Map.entry("tipo_cuenta", "Tipo de cuenta"),
        Map.entry("banco", "Banco"),
        Map.entry("registrados", "Registrados"),
        Map.entry("activos", "Activos"),
        Map.entry("clientes", "Clientes"),
        Map.entry("pais", "País"),
        Map.entry("intentos", "Intentos"),
        Map.entry("permitidos", "Permitidos"),
        Map.entry("rechazados", "Rechazados"),
        Map.entry("porcentaje_rechazo", "% rechazo"),
        Map.entry("clientes_unicos", "Clientes únicos"),
        Map.entry("fecha_hora_acceso", "Fecha y hora"),
        Map.entry("pais_origen", "País de origen"),
        Map.entry("pais_destino", "País visitado"),
        Map.entry("permitido", "Permitido"),
        Map.entry("motivo_rechazo", "Motivo de rechazo"),
        Map.entry("amenidad", "Amenidad"),
        Map.entry("exclusiva_black", "Exclusiva Black"),
        Map.entry("usos", "Usos"),
        Map.entry("sedes", "Sedes"),
        Map.entry("ciudad", "Ciudad"),
        Map.entry("capacidad_maxima", "Capacidad"),
        Map.entry("tiene_zona_black", "Zona Black"),
        Map.entry("activa", "Activa"),
        Map.entry("accesos_permitidos", "Entradas"),
        Map.entry("dias_con_actividad", "Días con entradas"),
        Map.entry("promedio_diario", "Promedio por día"),
        Map.entry("pico_diario", "Día pico"),
        Map.entry("fecha_clase", "Fecha"),
        Map.entry("hora_inicio", "Hora"),
        Map.entry("clase", "Clase"),
        Map.entry("instructor", "Instructor"),
        Map.entry("dia_semana", "Día"),
        Map.entry("cupo", "Cupo"),
        Map.entry("reservas", "Reservas"),
        Map.entry("asistencias", "Asistencias"),
        Map.entry("inasistencias", "Inasistencias"),
        Map.entry("porcentaje_asistencia", "% asistencia"));

    /** Códigos con tilde o con una lectura distinta a la literal. */
    private static final Map<String, String> CODIGOS = Map.ofEntries(
        Map.entry("RECHAZADO_FONDOS", "Rechazado por fondos"),
        Map.entry("SIN_COBRO", "Sin cobro"),
        Map.entry("INSCRIPCION", "Inscripción"),
        Map.entry("PENALIZACION_CANCELACION", "Penalización por cancelación"),
        Map.entry("SUSPENDIDA_IMPAGO", "Suspendida por impago"),
        Map.entry("ASISTIO", "Asistió"),
        Map.entry("INASISTENCIA", "Inasistencia"),
        Map.entry("MIERCOLES", "Miércoles"),
        Map.entry("SABADO", "Sábado"),
        Map.entry("CLIENTE_NO_ACTIVO", "Cliente no activo"),
        Map.entry("SUCURSAL_INACTIVA", "Sede inactiva"),
        Map.entry("SIN_MEMBRESIA_ACTIVA", "Sin membresía activa"),
        Map.entry("PLAN_SIN_ACCESO_NACIONAL", "Plan sin acceso nacional"),
        Map.entry("PLAN_SIN_ACCESO_INTERNACIONAL", "Plan sin acceso internacional"),
        Map.entry("SEDE_VIP_NO_PERMITIDA", "Sede exclusiva Black"),
        Map.entry("AMENIDAD_NO_DISPONIBLE", "Zona no disponible"),
        Map.entry("AMENIDAD_VIP_NO_PERMITIDA", "Zona exclusiva Black"),
        Map.entry("CHECKIN_DUPLICADO", "Entrada duplicada"));

    private final ReporteCatalogo catalogo;
    private final ReporteRepository repository;

    public ReporteService(ReporteCatalogo catalogo, ReporteRepository repository) {
        this.catalogo = catalogo;
        this.repository = repository;
    }

    public List<ReporteInfo> disponibles() {
        return catalogo.todos().stream().map(ReporteDefinicion::info).toList();
    }

    @Transactional(readOnly = true)
    public ReporteResultado generar(String codigo, ReporteFiltros filtros) {
        ReporteDefinicion reporte = catalogo.buscar(codigo)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reporte no encontrado"));

        if (filtros.rangoInvalido()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "La fecha inicial no puede ser posterior a la fecha final");
        }

        // Se ignoran los filtros que el reporte no usa, para que lo exportado diga la verdad.
        ReporteFiltros aplicados = new ReporteFiltros(
            reporte.filtraFechas() ? filtros.desde() : null,
            reporte.filtraFechas() ? filtros.hasta() : null,
            reporte.filtraSucursal() ? filtros.sucursalId() : null);

        String nombreSede = null;
        if (aplicados.sucursalId() != null) {
            nombreSede = repository.nombreSucursal(aplicados.sucursalId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "La sede no existe"));
        }

        List<Map<String, Object>> filas = repository.ejecutar(reporte, aplicados).stream()
            .map(this::normalizar)
            .toList();

        return new ReporteResultado(
            reporte.info(),
            new ReporteResultado.FiltrosAplicados(
                aplicados.desde(), aplicados.hasta(), aplicados.sucursalId(), nombreSede),
            columnas(filas),
            filas,
            totales(reporte, filas),
            OffsetDateTime.now(ZONA));
    }

    /** Convierte los tipos de JDBC a tipos de fecha de Java y traduce los códigos. */
    private Map<String, Object> normalizar(Map<String, Object> fila) {
        Map<String, Object> resultado = new LinkedHashMap<>();
        fila.forEach((clave, valor) -> resultado.put(clave, convertir(clave, valor)));
        return resultado;
    }

    private Object convertir(String clave, Object valor) {
        if (valor instanceof java.sql.Timestamp t) {
            return t.toInstant().atZone(ZONA).toOffsetDateTime();
        }
        if (valor instanceof java.sql.Date d) {
            return d.toLocalDate();
        }
        if (valor instanceof java.sql.Time t) {
            return t.toLocalTime();
        }
        if (valor instanceof String s && COLUMNAS_CODIGO.contains(clave) && CODIGO.matcher(s).matches()) {
            return codigoLegible(s);
        }
        if (valor != null && !(valor instanceof Number) && !(valor instanceof Boolean)
                && !(valor instanceof String)) {
            return valor.toString();
        }
        return valor;
    }

    private static String codigoLegible(String codigo) {
        String conocido = CODIGOS.get(codigo);
        if (conocido != null) {
            return conocido;
        }
        String texto = codigo.replace('_', ' ').toLowerCase();
        return Character.toUpperCase(texto.charAt(0)) + texto.substring(1);
    }

    private List<ColumnaReporte> columnas(List<Map<String, Object>> filas) {
        if (filas.isEmpty()) {
            return List.of();
        }
        List<ColumnaReporte> columnas = new ArrayList<>();
        for (String clave : filas.get(0).keySet()) {
            Object muestra = filas.stream()
                .map(f -> f.get(clave))
                .filter(v -> v != null)
                .findFirst()
                .orElse(null);
            columnas.add(new ColumnaReporte(clave, titulo(clave), tipo(clave, muestra)));
        }
        return columnas;
    }

    private static String titulo(String clave) {
        String conocido = TITULOS.get(clave);
        if (conocido != null) {
            return conocido;
        }
        String texto = clave.replace('_', ' ');
        return Character.toUpperCase(texto.charAt(0)) + texto.substring(1);
    }

    private static String tipo(String clave, Object muestra) {
        if (clave.equals("mes") || clave.equals("periodo")) return "mes";
        if (clave.startsWith("monto") || clave.startsWith("ingresos")) return "moneda";
        if (clave.startsWith("porcentaje")) return "porcentaje";
        if (muestra instanceof Boolean) return "booleano";
        if (muestra instanceof java.time.LocalDate) return "fecha";
        if (muestra instanceof OffsetDateTime) return "fechaHora";
        if (muestra instanceof java.time.LocalTime) return "hora";
        if (muestra instanceof Number) return "numero";
        return "texto";
    }

    private static Map<String, Object> totales(ReporteDefinicion reporte, List<Map<String, Object>> filas) {
        Map<String, Object> totales = new LinkedHashMap<>();
        for (String columna : reporte.columnasTotal()) {
            BigDecimal suma = BigDecimal.ZERO;
            for (Map<String, Object> fila : filas) {
                if (fila.get(columna) instanceof Number n) {
                    suma = suma.add(new BigDecimal(n.toString()));
                }
            }
            totales.put(columna, suma);
        }
        return totales;
    }
}
