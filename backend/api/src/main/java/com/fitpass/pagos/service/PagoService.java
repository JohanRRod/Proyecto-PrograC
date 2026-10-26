
package com.fitpass.pagos.service;

import com.fitpass.pagos.dto.*;
import com.fitpass.pagos.repository.PagoRepository;
import com.fitpass.mensajeria.service.OutboxService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.*;
import java.time.LocalDate;
import java.time.ZoneId;

@Service
public class PagoService {

    private final PagoRepository repository;
    private final OutboxService outboxService;

    public PagoService(
            PagoRepository repository,
            OutboxService outboxService) {

        this.repository = repository;
        this.outboxService = outboxService;
    }

    @Transactional
    public Map<String, Object> registrarMetodo(MetodoPagoRequest request) {

        if (!repository.clienteExiste(request.clienteId())) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Cliente no encontrado"
            );
        }

        Integer id = repository.registrarMetodo(
            request.clienteId(),
            request.tipoCuenta(),
            request.bancoEmisor().trim(),
            request.ultimosCuatroDigitos(),
            request.titular().trim()
        );

        return Map.of(
            "id", id,
            "mensaje", "Metodo de pago simulado registrado"
        );
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarMetodos(UUID clienteId) {
        return repository.listarMetodos(clienteId);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> historial(UUID clienteId) {
        return repository.historial(clienteId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> obtenerCobro(Integer id) {
        return repository.obtenerCobro(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Cobro no encontrado"
            ));
    }

    
@Transactional
public Map<String, Object> cobrar(CobroRequest request) {

    var membresia = repository.bloquearMembresia(
        request.membresiaId()
    ).orElseThrow(() -> new ResponseStatusException(
        HttpStatus.NOT_FOUND,
        "Membresia no encontrada"
    ));

    boolean activa = "ACTIVA".equals(membresia.estado());
    boolean suspendidaImpago =
        "SUSPENDIDA_IMPAGO".equals(membresia.estado());

    if (!activa && !suspendidaImpago) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "La membresia no permite realizar cobros"
        );
    }

    if (suspendidaImpago
            && !"MENSUALIDAD".equals(request.concepto())) {
        throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Una membresia suspendida solo puede pagar mensualidades"
        );
    }

    var metodo = repository.bloquearMetodo(
        request.metodoPagoId()
    ).orElseThrow(() -> new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Metodo de pago inexistente o inactivo"
    ));

    if (!metodo.clienteId().equals(membresia.clienteId())) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "El metodo de pago no pertenece al cliente"
        );
    }

    BigDecimal monto;
    Integer cancelacionId = null;
    Integer periodoFacturacionId = null;

    LocalDate hoy = LocalDate.now(
        ZoneId.of("America/Guatemala")
    );

    if ("MENSUALIDAD".equals(request.concepto())) {

        LocalDate fechaInicio =
            repository.obtenerFechaInicioMembresia(
                membresia.id()
            );

        if (hoy.isBefore(fechaInicio)) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "La membresia aun no ha iniciado"
            );
        }

        Integer diaCorte =
            repository.obtenerDiaCorteMensual(
                membresia.id()
            );

        LocalDate vencimientoActual =
            hoy.withDayOfMonth(
                Math.min(diaCorte, hoy.lengthOfMonth())
            );

        if (vencimientoActual.isBefore(fechaInicio)
                && !repository.existenDeudasVencidas(
                    membresia.id(), hoy)) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "El vencimiento es anterior al inicio de la membresia"
            );
        }

        var periodoPendiente =
            repository.obtenerPeriodoPendienteMasAntiguo(
                membresia.id(),
                hoy
            );

        if (periodoPendiente.isPresent()) {

            periodoFacturacionId = periodoPendiente.get();

        } else {

            if (suspendidaImpago) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "No existen mensualidades vencidas pendientes"
                );
            }

            if (hoy.isBefore(vencimientoActual)) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La mensualidad aun no ha vencido"
                );
            }

            periodoFacturacionId =
                repository.obtenerOCrearPeriodoFacturacion(
                    membresia.id()
                );
        }

        if (repository.periodoFacturacionPagado(
                periodoFacturacionId)) {

            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "La mensualidad de este periodo ya fue pagada"
            );
        }

        // Compatibilidad con cobros antiguos sin periodo.
        // Solo aplica cuando no hay deudas anteriores.
        if (periodoPendiente.isEmpty()
                && repository.existeCobroExitosoSinPeriodoEsteMes(
                    membresia.id())) {

            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Ya existe un cobro exitoso de este mes"
            );
        }

        monto = membresia.precioMensual();

    } else if ("PENALIZACION_CANCELACION".equals(
            request.concepto())) {

        var penalizacion =
            repository.penalizacionPendiente(
                membresia.id()
            ).orElseThrow(() -> new ResponseStatusException(
                HttpStatus.CONFLICT,
                "No existe penalizacion pendiente"
            ));

        cancelacionId = penalizacion.id();
        monto = penalizacion.monto();

    } else {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Concepto no permitido"
        );
    }

    if (monto == null || monto.signum() <= 0) {
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Monto de cobro invalido"
        );
    }

    BigDecimal saldo = metodo.saldo() == null
        ? BigDecimal.ZERO
        : metodo.saldo();

    boolean exitoso = saldo.compareTo(monto) >= 0;

    String estado = exitoso
        ? "EXITOSO"
        : "RECHAZADO_FONDOS";

    Integer cobroId;

    if ("MENSUALIDAD".equals(request.concepto())) {

        cobroId = repository.registrarCobro(
            membresia.id(),
            metodo.id(),
            request.concepto(),
            monto,
            estado,
            periodoFacturacionId
        );

    } else {

        cobroId = repository.registrarCobro(
            membresia.id(),
            metodo.id(),
            request.concepto(),
            monto,
            estado
        );
    }

    if (exitoso) {

        repository.descontarSaldo(metodo.id(), monto);

        if (periodoFacturacionId != null) {

            repository.marcarPeriodoPagado(
                periodoFacturacionId,
                cobroId
            );

            // Reactivar únicamente si todas las
            // mensualidades vencidas están pagadas.
            if (suspendidaImpago) {
                repository.reactivarSiEstaAlDia(
                    membresia.id(),
                    hoy
                );
            }
        }

        if (cancelacionId != null) {
            repository.completarCancelacion(
                cancelacionId,
                cobroId,
                membresia.id()
            );
        }
    }

    // Registrar evento en Outbox dentro
    // de la misma transacción.
    outboxService.registrarEventoCobro(
        cobroId,
        estado
    );

    return repository.obtenerCobro(cobroId)
        .orElseThrow(() -> new ResponseStatusException(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "No se pudo consultar el cobro"
        ));
}

}
