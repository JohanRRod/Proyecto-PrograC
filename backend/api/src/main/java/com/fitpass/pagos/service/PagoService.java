
package com.fitpass.pagos.service;

import com.fitpass.pagos.dto.*;
import com.fitpass.pagos.repository.PagoRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.*;

@Service
public class PagoService {

    private final PagoRepository repository;

    public PagoService(PagoRepository repository) {
        this.repository = repository;
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

        if (!"ACTIVA".equals(membresia.estado())) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "La membresia no esta activa"
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

        if ("MENSUALIDAD".equals(request.concepto())) {

            if (repository.mensualidadPagadaEsteMes(
                    membresia.id())) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La mensualidad de este mes ya fue pagada"
                );
            }

            monto = membresia.precioMensual();

        } else if ("PENALIZACION_CANCELACION".equals(
                request.concepto())) {

            var penalizacion = repository.penalizacionPendiente(
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

        Integer cobroId = repository.registrarCobro(
            membresia.id(),
            metodo.id(),
            request.concepto(),
            monto,
            estado
        );

        if (exitoso) {
            repository.descontarSaldo(metodo.id(), monto);

            if (cancelacionId != null) {
                repository.completarCancelacion(
                    cancelacionId,
                    cobroId,
                    membresia.id()
                );
            }
        }

        return repository.obtenerCobro(cobroId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "No se pudo consultar el cobro"
            ));
    }
}
