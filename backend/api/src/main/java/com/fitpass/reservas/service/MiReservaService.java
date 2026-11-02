package com.fitpass.reservas.service;

import com.fitpass.accesos.repository.AccesoRepository;
import com.fitpass.reservas.dto.MiClaseResponse;
import com.fitpass.reservas.dto.MiReservaResponse;
import com.fitpass.reservas.dto.MisClasesResponse;
import com.fitpass.reservas.dto.OcupacionResponse;
import com.fitpass.reservas.entity.ReservaClase;
import com.fitpass.reservas.repository.ClaseConsultaRepository;
import com.fitpass.reservas.repository.ClaseConsultaRepository.ClaseConInstructor;
import com.fitpass.reservas.repository.ClaseConsultaRepository.ReservaActiva;
import com.fitpass.reservas.repository.ClaseConsultaRepository.SedeResumen;
import com.fitpass.reservas.repository.ReservaRepository;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Clases y reservas del miembro que inició sesión. Para reservar y cancelar
 * se usan las mismas reglas de ReservaService.
 */
@Service
public class MiReservaService {

    /** Cuántos días hacia adelante puede ver y reservar el miembro (hoy incluido). */
    public static final int DIAS_VISIBLES = 7;

    private static final ZoneId ZONA = ZoneId.of("America/Guatemala");

    private final ClaseConsultaRepository consultas;
    private final AccesoRepository accesos;
    private final ReservaRepository reservas;
    private final ReservaService reservaService;

    public MiReservaService(
            ClaseConsultaRepository consultas,
            AccesoRepository accesos,
            ReservaRepository reservas,
            ReservaService reservaService) {
        this.consultas = consultas;
        this.accesos = accesos;
        this.reservas = reservas;
        this.reservaService = reservaService;
    }

    @Transactional(readOnly = true)
    public MisClasesResponse clases(UUID clienteId, Integer sucursalId) {
        var filasCliente = accesos.buscarCliente(clienteId);
        if (filasCliente.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "CLIENTE_NO_EXISTE");
        }
        Map<String, Object> cliente = filasCliente.get(0);
        Integer sedeBase = ((Number) cliente.get("sucursal_base_id")).intValue();
        Integer sedeId = sucursalId != null ? sucursalId : sedeBase;

        SedeResumen sede = consultas.sede(sedeId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "SUCURSAL_NO_EXISTE"));

        LocalDate hoy = LocalDate.now(ZONA);
        LocalDate hasta = hoy.plusDays(DIAS_VISIBLES - 1);
        LocalDateTime ahora = LocalDateTime.now(ZONA);

        var membresias = accesos.buscarMembresia(clienteId, hoy);
        boolean permiteVip = !membresias.isEmpty()
                && Boolean.TRUE.equals(membresias.get(0).get("permite_amenidades_vip"));

        String motivo = motivoSede(cliente, membresias, sede, sedeBase);

        Map<String, Long> ocupadas = new HashMap<>();
        for (OcupacionResponse o : consultas.ocupacion(sede.id(), hoy, hasta)) {
            ocupadas.put(o.claseId() + "|" + o.fecha(), o.reservadas());
        }

        Map<String, Integer> mias = new HashMap<>();
        for (ReservaActiva r : consultas.reservasActivasDelCliente(clienteId, hoy, hasta)) {
            mias.put(r.claseId() + "|" + r.fecha(), r.id());
        }

        List<ClaseConInstructor> clasesSede = consultas.clasesDeSede(sede.id());
        List<MiClaseResponse> salida = new ArrayList<>();

        for (LocalDate fecha = hoy; !fecha.isAfter(hasta); fecha = fecha.plusDays(1)) {
            String dia = nombreDia(fecha.getDayOfWeek());
            for (ClaseConInstructor c : clasesSede) {
                if (!dia.equalsIgnoreCase(c.diaSemana())) continue;
                if (!LocalDateTime.of(fecha, c.horaInicio()).isAfter(ahora)) continue;

                String clave = c.id() + "|" + fecha;
                salida.add(new MiClaseResponse(
                        c.id(),
                        c.nombreClase(),
                        c.instructor(),
                        fecha,
                        dia,
                        c.horaInicio(),
                        c.horaFin(),
                        c.cupoMaximo(),
                        ocupadas.getOrDefault(clave, 0L),
                        c.requierePlanVip(),
                        mias.get(clave)));
            }
        }

        return new MisClasesResponse(
                sede.id(), sede.nombre(), Objects.equals(sede.id(), sedeBase), permiteVip, motivo, salida);
    }

    @Transactional(readOnly = true)
    public List<MiReservaResponse> reservas(UUID clienteId) {
        return consultas.reservasDelCliente(clienteId);
    }

    @Transactional
    public ReservaClase reservar(UUID clienteId, Integer claseId, LocalDate fecha) {
        LocalDate hoy = LocalDate.now(ZONA);
        if (fecha.isAfter(hoy.plusDays(DIAS_VISIBLES - 1))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "FECHA_FUERA_DE_RANGO");
        }
        return reservaService.reservar(claseId, clienteId, fecha);
    }

    @Transactional
    public ReservaClase cancelar(UUID clienteId, Integer reservaId) {
        ReservaClase reserva = reservas.findById(reservaId)
                .filter(r -> clienteId.equals(r.getClienteId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "RESERVA_NO_EXISTE"));
        return reservaService.cancelar(reserva.getId());
    }

    /**
     * Las mismas reglas de sede que aplica ReservaService al reservar, para avisarle
     * al miembro antes de que intente. null si puede reservar en esta sede.
     */
    private static String motivoSede(
            Map<String, Object> cliente,
            List<Map<String, Object>> membresias,
            SedeResumen sede,
            Integer sedeBase) {

        if (!"ACTIVO".equals(cliente.get("estado"))) return "CLIENTE_NO_ACTIVO";
        if (!sede.activa()) return "SUCURSAL_INACTIVA";
        if (membresias.isEmpty()) return "SIN_MEMBRESIA_ACTIVA";

        Map<String, Object> m = membresias.get(0);
        boolean mismoPais = Objects.equals(
                ((Number) cliente.get("pais_id")).intValue(), sede.paisId());

        if (!Objects.equals(sede.id(), sedeBase)) {
            if (mismoPais && !Boolean.TRUE.equals(m.get("permite_acceso_nacional"))) {
                return "PLAN_SIN_ACCESO_NACIONAL";
            }
            if (!mismoPais && !Boolean.TRUE.equals(m.get("permite_acceso_internacional"))) {
                return "PLAN_SIN_ACCESO_INTERNACIONAL";
            }
        }

        if (sede.esSedeVip() && !Boolean.TRUE.equals(m.get("permite_amenidades_vip"))) {
            return "SEDE_VIP_NO_PERMITIDA";
        }
        return null;
    }

    private static String nombreDia(DayOfWeek dia) {
        return switch (dia) {
            case MONDAY -> "LUNES";
            case TUESDAY -> "MARTES";
            case WEDNESDAY -> "MIERCOLES";
            case THURSDAY -> "JUEVES";
            case FRIDAY -> "VIERNES";
            case SATURDAY -> "SABADO";
            case SUNDAY -> "DOMINGO";
        };
    }
}
