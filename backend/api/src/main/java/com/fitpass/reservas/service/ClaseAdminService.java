package com.fitpass.reservas.service;

import com.fitpass.reservas.dto.ClaseRequest;
import com.fitpass.reservas.dto.InstructorRequest;
import com.fitpass.reservas.dto.InstructorResponse;
import com.fitpass.reservas.dto.OcupacionResponse;
import com.fitpass.reservas.dto.ReservaClaseResponse;
import com.fitpass.reservas.entity.ClaseGrupal;
import com.fitpass.reservas.entity.ReservaClase;
import com.fitpass.reservas.repository.ClaseConsultaRepository;
import com.fitpass.reservas.repository.ClaseConsultaRepository.SedeResumen;
import com.fitpass.reservas.repository.ClaseRepository;
import com.fitpass.reservas.repository.ReservaRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Lo que el administrador hace con instructores, clases y la asistencia. */
@Service
public class ClaseAdminService {

    private static final ZoneId ZONA = ZoneId.of("America/Guatemala");

    private static final Set<String> DIAS = Set.of(
            "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO");

    private final ClaseConsultaRepository consultas;
    private final ClaseRepository clases;
    private final ReservaRepository reservas;

    public ClaseAdminService(
            ClaseConsultaRepository consultas,
            ClaseRepository clases,
            ReservaRepository reservas) {
        this.consultas = consultas;
        this.clases = clases;
        this.reservas = reservas;
    }

    // ---------- Instructores ----------

    @Transactional(readOnly = true)
    public List<InstructorResponse> instructores() {
        return consultas.instructores();
    }

    @Transactional
    public InstructorResponse crearInstructor(InstructorRequest r) {
        validarInstructor(r, null);
        Integer id = consultas.crearInstructor(r);
        return consultas.instructor(id).orElseThrow();
    }

    @Transactional
    public InstructorResponse actualizarInstructor(Integer id, InstructorRequest r) {
        if (consultas.instructor(id).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "INSTRUCTOR_NO_EXISTE");
        }
        validarInstructor(r, id);
        consultas.actualizarInstructor(id, r);
        return consultas.instructor(id).orElseThrow();
    }

    private void validarInstructor(InstructorRequest r, Integer id) {
        if (consultas.sede(r.sucursalBaseId()).isEmpty()) {
            rechazar("SUCURSAL_NO_EXISTE");
        }
        if (consultas.emailInstructorUsado(r.email().trim(), id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "EMAIL_INSTRUCTOR_REPETIDO");
        }
    }

    // ---------- Clases ----------

    @Transactional
    public ClaseGrupal crearClase(ClaseRequest r) {
        ClaseGrupal clase = new ClaseGrupal();
        validarClase(clase, r);
        aplicar(clase, r);
        return clases.save(clase);
    }

    @Transactional
    public ClaseGrupal actualizarClase(Integer id, ClaseRequest r) {
        ClaseGrupal clase = clases.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "CLASE_NO_EXISTE"));
        validarClase(clase, r);
        aplicar(clase, r);
        return clases.save(clase);
    }

    private void validarClase(ClaseGrupal actual, ClaseRequest r) {
        String dia = r.diaSemana().trim().toUpperCase(Locale.ROOT);
        if (!DIAS.contains(dia)) {
            rechazar("DIA_INVALIDO");
        }

        if (!r.horaInicio().isBefore(r.horaFin())) {
            rechazar("HORARIO_INVALIDO");
        }

        SedeResumen sede = consultas.sede(r.sucursalId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.BAD_REQUEST, "SUCURSAL_NO_EXISTE"));

        // Si la sede cierra después de abrir, la clase tiene que caber en ese horario.
        // Si no (por ejemplo abre 24 horas con 00:00-00:00), no se valida.
        LocalTime abre = sede.apertura();
        LocalTime cierra = sede.cierre();
        if (abre != null && cierra != null && abre.isBefore(cierra)
                && (r.horaInicio().isBefore(abre) || r.horaFin().isAfter(cierra))) {
            rechazar("FUERA_DEL_HORARIO_DE_LA_SEDE");
        }

        boolean esNueva = actual.getId() == null;
        boolean cambiaInstructor = esNueva || !Objects.equals(actual.getInstructorId(), r.instructorId());
        Boolean activo = consultas.instructorActivo(r.instructorId());
        if (activo == null) {
            rechazar("INSTRUCTOR_NO_EXISTE");
        }
        if (cambiaInstructor && !activo) {
            rechazar("INSTRUCTOR_INACTIVO");
        }

        consultas.choqueInstructor(r.instructorId(), dia, r.horaInicio(), r.horaFin(), actual.getId())
                .ifPresent(otra -> rechazar("INSTRUCTOR_OCUPADO"));

        if (!esNueva) {
            long[] futuras = consultas.reservasFuturas(actual.getId(), LocalDate.now(ZONA));
            boolean cambiaDiaOSede = !dia.equalsIgnoreCase(actual.getDiaSemana())
                    || !Objects.equals(actual.getSucursalId(), r.sucursalId());
            if (cambiaDiaOSede && futuras[0] > 0) {
                rechazar("CLASE_CON_RESERVAS");
            }
            if (r.cupoMaximo() < futuras[1]) {
                rechazar("CUPO_MENOR_A_RESERVAS");
            }
        }
    }

    private static void aplicar(ClaseGrupal clase, ClaseRequest r) {
        clase.setSucursalId(r.sucursalId());
        clase.setInstructorId(r.instructorId());
        clase.setNombreClase(r.nombreClase().trim());
        clase.setDiaSemana(r.diaSemana().trim().toUpperCase(Locale.ROOT));
        clase.setHoraInicio(r.horaInicio());
        clase.setHoraFin(r.horaFin());
        clase.setCupoMaximo(r.cupoMaximo());
        clase.setRequierePlanVip(Boolean.TRUE.equals(r.requierePlanVip()));
    }

    // ---------- Reservas ----------

    @Transactional(readOnly = true)
    public List<OcupacionResponse> ocupacion(Integer sucursalId, LocalDate desde, LocalDate hasta) {
        if (desde == null || hasta == null || hasta.isBefore(desde)) {
            rechazar("RANGO_INVALIDO");
        }
        if (ChronoUnit.DAYS.between(desde, hasta) > 62) {
            rechazar("RANGO_MUY_LARGO");
        }
        return consultas.ocupacion(sucursalId, desde, hasta);
    }

    @Transactional(readOnly = true)
    public List<ReservaClaseResponse> reservasDeClase(Integer claseId, LocalDate fecha) {
        if (!clases.existsById(claseId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "CLASE_NO_EXISTE");
        }
        return consultas.reservasDeClase(claseId, fecha);
    }

    /** Marca si el cliente llegó o no. Solo cuando la clase ya empezó. */
    @Transactional
    public ReservaClase marcarAsistencia(Integer reservaId, String estado) {
        ReservaClase reserva = reservas.findById(reservaId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "RESERVA_NO_EXISTE"));

        if ("CANCELADA".equals(reserva.getEstado())) {
            rechazar("RESERVA_CANCELADA");
        }

        ClaseGrupal clase = clases.findById(reserva.getClaseId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "CLASE_NO_EXISTE"));

        LocalDateTime inicio = LocalDateTime.of(reserva.getFechaClase(), clase.getHoraInicio());
        if (inicio.isAfter(LocalDateTime.now(ZONA))) {
            rechazar("CLASE_NO_INICIADA");
        }

        reserva.setEstado(estado);
        return reservas.save(reserva);
    }

    private static void rechazar(String motivo) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, motivo);
    }
}
