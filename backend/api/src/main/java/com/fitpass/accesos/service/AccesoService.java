
package com.fitpass.accesos.service;

import com.fitpass.accesos.dto.CheckInRequest;
import com.fitpass.accesos.dto.CheckInResponse;
import com.fitpass.accesos.repository.AccesoRepository;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccesoService {

    private final AccesoRepository repository;

    @Value("${fitpass.accesos.duplicado-minutos:5}")
    private int duplicadoMinutos;

    public AccesoService(AccesoRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public CheckInResponse checkIn(CheckInRequest request) {

        var clientes = repository.buscarCliente(request.clienteId());

        if (clientes.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Cliente inexistente");
        }

        var sucursales = repository.buscarSucursal(request.sucursalId());

        if (sucursales.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Sucursal inexistente");
        }

        var cliente = clientes.get(0);
        var sucursal = sucursales.get(0);

        String motivo = null;
        String tipo = "SEDE_BASE";

        LocalDate hoy = LocalDate.now(
            ZoneId.of("America/Guatemala"));

        var membresias = repository.buscarMembresia(
            request.clienteId(), hoy);

        if (!"ACTIVO".equals(cliente.get("estado"))) {
            motivo = "CLIENTE_NO_ACTIVO";

        } else if (!Boolean.TRUE.equals(sucursal.get("activa"))) {
            motivo = "SUCURSAL_INACTIVA";

        } else if (membresias.isEmpty()) {
            motivo = "SIN_MEMBRESIA_ACTIVA";

        } else {
            var membresia = membresias.get(0);

            boolean sedeBase = Objects.equals(
                cliente.get("sucursal_base_id"),
                request.sucursalId());

            boolean nacional = Objects.equals(
                cliente.get("pais_id"),
                sucursal.get("pais_id"));

            if (!sedeBase) {
                tipo = nacional ? "NACIONAL" : "INTERNACIONAL";

                if (nacional && !Boolean.TRUE.equals(
                        membresia.get("permite_acceso_nacional"))) {
                    motivo = "PLAN_SIN_ACCESO_NACIONAL";
                }

                if (!nacional && !Boolean.TRUE.equals(
                        membresia.get("permite_acceso_internacional"))) {
                    motivo = "PLAN_SIN_ACCESO_INTERNACIONAL";
                }
            }

            if (motivo == null
                    && Boolean.TRUE.equals(sucursal.get("es_sede_vip"))
                    && !Boolean.TRUE.equals(
                        membresia.get("permite_amenidades_vip"))) {
                motivo = "SEDE_VIP_NO_PERMITIDA";
            }

            if (motivo == null && request.amenidadId() != null) {

                var amenidades = repository.buscarAmenidad(
                    request.sucursalId(), request.amenidadId());

                if (amenidades.isEmpty()) {
                    motivo = "AMENIDAD_NO_DISPONIBLE";

                } else if (Boolean.TRUE.equals(
                        amenidades.get(0).get("requiere_plan_vip"))
                        && !Boolean.TRUE.equals(
                            membresia.get("permite_amenidades_vip"))) {
                    motivo = "AMENIDAD_VIP_NO_PERMITIDA";

                } else {
                    tipo = "ZONA_EXCLUSIVA_VIP";
                }
            }
        }

        if (motivo == null && repository.existeCheckInReciente(
                request.clienteId(),
                request.sucursalId(),
                request.amenidadId(),
                duplicadoMinutos)) {
            motivo = "CHECKIN_DUPLICADO";
        }

        boolean permitido = motivo == null;

        Integer amenidadParaRegistro = request.amenidadId();

if ("AMENIDAD_NO_DISPONIBLE".equals(motivo)) {
    amenidadParaRegistro = null;
}

repository.registrar(
    request.clienteId(),
    request.sucursalId(),
    amenidadParaRegistro,
    tipo,
    permitido,
    motivo
);

        return new CheckInResponse(permitido, tipo, motivo);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> historial(UUID clienteId) {
        return repository.historial(clienteId);
    }
}
