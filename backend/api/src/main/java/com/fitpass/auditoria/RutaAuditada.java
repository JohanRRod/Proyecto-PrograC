package com.fitpass.auditoria;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Qué operaciones se registran en la bitácora y cómo se nombran.
 * Cada regla dice el módulo, la acción y la tabla que toca; el primer grupo
 * de la expresión (si existe) es el id del registro afectado.
 */
public record RutaAuditada(String modulo, String accion, String tabla, String registroId, boolean consultarAntes) {

    private record Regla(String metodo, Pattern ruta, String modulo, String accion, String tabla, boolean consultarAntes) {}

    private static Regla r(String metodo, String ruta, String modulo, String accion, String tabla, boolean antes) {
        return new Regla(metodo, Pattern.compile(ruta), modulo, accion, tabla, antes);
    }

    private static final List<Regla> REGLAS = List.of(
        r("POST",   "^/api/clientes$",                          "Clientes",     "CREAR",          "clientes", false),
        r("PUT",    "^/api/clientes/([^/]+)$",                  "Clientes",     "ACTUALIZAR",     "clientes", true),
        r("DELETE", "^/api/clientes/([^/]+)$",                  "Clientes",     "DAR_DE_BAJA",    "clientes", true),

        r("POST",   "^/api/membresias$",                        "Membresías",   "CONTRATAR",      "membresias", false),
        r("POST",   "^/api/membresias/(\\d+)/cancelacion$",     "Membresías",   "CANCELAR",       "membresias", true),

        r("POST",   "^/api/pagos/metodos$",                     "Pagos",        "REGISTRAR_METODO", "metodos_pago_cliente", false),
        r("POST",   "^/api/pagos/cobros$",                      "Pagos",        "COBRAR",         "cobros_automaticos", false),

        r("POST",   "^/api/accesos/checkin$",                   "Recepción",    "REGISTRAR_ENTRADA", "registros_acceso", false),

        r("POST",   "^/api/sucursales/(\\d+)/amenidades$",      "Catálogo",     "ASIGNAR_AMENIDAD", "sucursal_amenidades", false),
        r("PUT",    "^/api/sucursales/(\\d+/amenidades/\\d+)$", "Catálogo",     "ACTUALIZAR_AMENIDAD", "sucursal_amenidades", true),
        r("POST",   "^/api/sucursales$",                        "Catálogo",     "CREAR",          "sucursales", false),
        r("PUT",    "^/api/sucursales/(\\d+)$",                 "Catálogo",     "ACTUALIZAR",     "sucursales", true),
        r("DELETE", "^/api/sucursales/(\\d+)$",                 "Catálogo",     "DESACTIVAR",     "sucursales", true),
        r("POST",   "^/api/planes$",                            "Catálogo",     "CREAR",          "planes", false),
        r("PUT",    "^/api/planes/(\\d+)$",                     "Catálogo",     "ACTUALIZAR",     "planes", true),
        r("DELETE", "^/api/planes/(\\d+)$",                     "Catálogo",     "DESACTIVAR",     "planes", true),
        r("POST",   "^/api/amenidades$",                        "Catálogo",     "CREAR",          "amenidades", false),
        r("PUT",    "^/api/amenidades/(\\d+)$",                 "Catálogo",     "ACTUALIZAR",     "amenidades", true),

        r("POST",   "^/api/clases$",                            "Clases",       "CREAR",          "clases_grupales", false),
        r("PUT",    "^/api/clases/(\\d+)$",                     "Clases",       "ACTUALIZAR",     "clases_grupales", true),
        r("POST",   "^/api/instructores$",                      "Clases",       "CREAR",          "instructores", false),
        r("PUT",    "^/api/instructores/(\\d+)$",               "Clases",       "ACTUALIZAR",     "instructores", true),
        r("POST",   "^/api/reservas$",                          "Clases",       "RESERVAR",       "reservas_clases", false),
        r("PATCH",  "^/api/reservas/(\\d+)/cancelar$",          "Clases",       "CANCELAR_RESERVA", "reservas_clases", true),
        r("PATCH",  "^/api/reservas/(\\d+)/asistencia$",        "Clases",       "MARCAR_ASISTENCIA", "reservas_clases", true),
        r("POST",   "^/api/mi/reservas$",                       "Clases",       "RESERVAR",       "reservas_clases", false),
        r("PATCH",  "^/api/mi/reservas/(\\d+)/cancelar$",       "Clases",       "CANCELAR_RESERVA", "reservas_clases", true),

        r("POST",   "^/api/auth/miembros/invitar$",             "Usuarios",     "INVITAR",        "perfiles_usuario", false),

        r("POST",   "^/api/ia/ingesta$",                        "Asistente IA", "RECARGAR_DOCUMENTOS", "documentos_rag", false),

        r("GET",    "^/api/reportes/([^/]+/(?:excel|pdf))$",    "Reportes",     "EXPORTAR",       "reportes", false)
    );

    /** null si la petición no se registra (lecturas, el chat público, etc.). */
    public static RutaAuditada resolver(String metodo, String ruta) {
        if (ruta == null || !ruta.startsWith("/api/")) return null;

        for (Regla regla : REGLAS) {
            if (!regla.metodo().equals(metodo)) continue;
            Matcher m = regla.ruta().matcher(ruta);
            if (m.matches()) {
                String id = m.groupCount() >= 1 ? m.group(1) : null;
                return new RutaAuditada(regla.modulo(), regla.accion(), regla.tabla(), id,
                        regla.consultarAntes() && id != null);
            }
        }

        // Cualquier otra escritura que no esté en la lista también queda registrada.
        boolean escritura = switch (metodo) {
            case "POST", "PUT", "PATCH", "DELETE" -> true;
            default -> false;
        };
        if (!escritura || ruta.equals("/api/ia/chat")) return null;

        String[] partes = ruta.substring(5).split("/");
        String accion = switch (metodo) {
            case "POST" -> "CREAR";
            case "DELETE" -> "ELIMINAR";
            default -> "ACTUALIZAR";
        };
        return new RutaAuditada("Otro", accion, partes.length > 0 ? partes[0] : "desconocida", null, false);
    }
}
