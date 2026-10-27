
package com.fitpass.reservas.service;

import com.fitpass.accesos.repository.AccesoRepository;
import com.fitpass.reservas.entity.ClaseGrupal;
import com.fitpass.reservas.entity.ReservaClase;
import com.fitpass.reservas.repository.ClaseRepository;
import com.fitpass.reservas.repository.ReservaRepository;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ReservaService {

    private static final ZoneId ZONA =
            ZoneId.of("America/Guatemala");

    private final ClaseRepository claseRepository;
    private final ReservaRepository reservaRepository;
    private final AccesoRepository accesoRepository;

    public ReservaService(
            ClaseRepository claseRepository,
            ReservaRepository reservaRepository,
            AccesoRepository accesoRepository) {

        this.claseRepository = claseRepository;
        this.reservaRepository = reservaRepository;
        this.accesoRepository = accesoRepository;
    }

    @Transactional(readOnly = true)
    public List<ClaseGrupal> listarClases() {
        return claseRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<ClaseGrupal> clasesPorSucursal(
            Integer sucursalId) {

        return claseRepository.findBySucursalId(sucursalId);
    }

    @Transactional(readOnly = true)
    public ClaseGrupal obtenerClase(Integer id) {
        return claseRepository.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "CLASE_NO_EXISTE"));
    }

    @Transactional(readOnly = true)
    public long cuposDisponibles(
            Integer claseId,
            LocalDate fecha) {

        ClaseGrupal clase = obtenerClase(claseId);
        validarFecha(clase, fecha);

        long ocupados =
                reservaRepository.countByClaseIdAndFechaClaseAndEstado(
                        claseId, fecha, "RESERVADA");

        return Math.max(0, clase.getCupoMaximo() - ocupados);
    }

    @Transactional
    public ReservaClase reservar(
            Integer claseId,
            UUID clienteId,
            LocalDate fecha) {

        // Bloqueamos la clase mientras se procesa la reserva.
        ClaseGrupal clase = claseRepository
                .buscarParaReservar(claseId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "CLASE_NO_EXISTE"));

        validarFecha(clase, fecha);

        var clientes = accesoRepository.buscarCliente(clienteId);

        if (clientes.isEmpty()) {
            rechazar("CLIENTE_NO_EXISTE");
        }

        Map<String, Object> cliente = clientes.get(0);

        if (!"ACTIVO".equals(cliente.get("estado"))) {
            rechazar("CLIENTE_NO_ACTIVO");
        }

        var sucursales =
                accesoRepository.buscarSucursal(clase.getSucursalId());

        if (sucursales.isEmpty()) {
            rechazar("SUCURSAL_NO_EXISTE");
        }

        Map<String, Object> sucursal = sucursales.get(0);

        if (!Boolean.TRUE.equals(sucursal.get("activa"))) {
            rechazar("SUCURSAL_INACTIVA");
        }

        var membresias = accesoRepository.buscarMembresia(
                clienteId, LocalDate.now(ZONA));

        if (membresias.isEmpty()) {
            rechazar("SIN_MEMBRESIA_ACTIVA");
        }

        Map<String, Object> membresia = membresias.get(0);

        boolean sedeBase = Objects.equals(
                cliente.get("sucursal_base_id"),
                clase.getSucursalId());

        boolean mismoPais = Objects.equals(
                cliente.get("pais_id"),
                sucursal.get("pais_id"));

        if (!sedeBase) {
            if (mismoPais && !Boolean.TRUE.equals(
                    membresia.get("permite_acceso_nacional"))) {
                rechazar("PLAN_SIN_ACCESO_NACIONAL");
            }

            if (!mismoPais && !Boolean.TRUE.equals(
                    membresia.get("permite_acceso_internacional"))) {
                rechazar("PLAN_SIN_ACCESO_INTERNACIONAL");
            }
        }

        boolean permiteVip = Boolean.TRUE.equals(
                membresia.get("permite_amenidades_vip"));

        if (Boolean.TRUE.equals(sucursal.get("es_sede_vip"))
                && !permiteVip) {
            rechazar("SEDE_VIP_NO_PERMITIDA");
        }

        if (Boolean.TRUE.equals(clase.getRequierePlanVip())
                && !permiteVip) {
            rechazar("CLASE_VIP_NO_PERMITIDA");
        }

        boolean duplicada = reservaRepository
                .existsByClaseIdAndClienteIdAndFechaClaseAndEstado(
                        claseId, clienteId, fecha, "RESERVADA");

        if (duplicada) {
            rechazar("RESERVA_DUPLICADA");
        }

        long ocupados = reservaRepository
                .countByClaseIdAndFechaClaseAndEstado(
                        claseId, fecha, "RESERVADA");

        if (ocupados >= clase.getCupoMaximo()) {
            rechazar("CLASE_SIN_CUPOS");
        }

        ReservaClase reserva = new ReservaClase();
        reserva.setClaseId(claseId);
        reserva.setClienteId(clienteId);
        reserva.setFechaClase(fecha);
        reserva.setEstado("RESERVADA");

        return reservaRepository.save(reserva);
    }

    @Transactional
    public ReservaClase cancelar(Integer reservaId) {

        ReservaClase reserva = reservaRepository.findById(reservaId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "RESERVA_NO_EXISTE"));

        if (!"RESERVADA".equals(reserva.getEstado())) {
            rechazar("RESERVA_NO_ACTIVA");
        }

        ClaseGrupal clase = obtenerClase(reserva.getClaseId());

        LocalDateTime inicio = LocalDateTime.of(
                reserva.getFechaClase(),
                clase.getHoraInicio());

        if (!inicio.isAfter(LocalDateTime.now(ZONA))) {
            rechazar("CLASE_YA_INICIADA");
        }

        reserva.setEstado("CANCELADA");
        return reservaRepository.save(reserva);
    }

    @Transactional(readOnly = true)
    public List<ReservaClase> historial(UUID clienteId) {
        return reservaRepository
                .findByClienteIdOrderByFechaClaseDesc(clienteId);
    }

    private void validarFecha(
            ClaseGrupal clase,
            LocalDate fecha) {

        if (fecha == null) {
            rechazar("FECHA_OBLIGATORIA");
        }

        LocalDateTime inicio = LocalDateTime.of(
                fecha, clase.getHoraInicio());

        if (!inicio.isAfter(LocalDateTime.now(ZONA))) {
            rechazar("FECHA_U_HORA_PASADA");
        }

        DayOfWeek dia = fecha.getDayOfWeek();

        String esperado = switch (dia) {
            case MONDAY -> "LUNES";
            case TUESDAY -> "MARTES";
            case WEDNESDAY -> "MIERCOLES";
            case THURSDAY -> "JUEVES";
            case FRIDAY -> "VIERNES";
            case SATURDAY -> "SABADO";
            case SUNDAY -> "DOMINGO";
        };

        if (!esperado.equalsIgnoreCase(clase.getDiaSemana())) {
            rechazar("DIA_NO_COINCIDE");
        }
    }

    private void rechazar(String motivo) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, motivo);
    }
}
