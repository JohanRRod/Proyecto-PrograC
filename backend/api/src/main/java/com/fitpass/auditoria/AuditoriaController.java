package com.fitpass.auditoria;

import com.fitpass.auditoria.dto.BitacoraDetalle;
import com.fitpass.auditoria.dto.BitacoraFila;
import com.fitpass.auditoria.dto.BitacoraFiltros;
import com.fitpass.auditoria.dto.LogAgenteFila;
import com.fitpass.auditoria.dto.Pagina;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Consulta de la bitácora del sistema y de las conversaciones con el asistente de IA. Solo ADMIN. */
@RestController
@RequestMapping("/api/bitacora")
@PreAuthorize("hasRole('ADMIN')")
public class AuditoriaController {

    private static final int TAMANO_MAXIMO = 100;

    private final AuditoriaRepository repositorio;

    public AuditoriaController(AuditoriaRepository repositorio) {
        this.repositorio = repositorio;
    }

    @GetMapping
    public Pagina<BitacoraFila> buscar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) String modulo,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) Boolean exitoso,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "25") int tamano) {
        return repositorio.buscar(new BitacoraFiltros(desde, hasta, modulo, accion, exitoso, q),
                Math.max(0, pagina), limitar(tamano));
    }

    @GetMapping("/opciones")
    public Map<String, List<String>> opciones() {
        return repositorio.opciones();
    }

    @GetMapping("/ia")
    public Pagina<LogAgenteFila> conversacionesIa(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "25") int tamano) {
        return repositorio.conversacionesIa(desde, hasta, Math.max(0, pagina), limitar(tamano));
    }

    @GetMapping("/{id}")
    public BitacoraDetalle detalle(@PathVariable long id) {
        return repositorio.detalle(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "REGISTRO_NO_EXISTE"));
    }

    private static int limitar(int tamano) {
        return Math.min(Math.max(tamano, 1), TAMANO_MAXIMO);
    }
}
