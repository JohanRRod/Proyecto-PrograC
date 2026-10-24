
package com.fitpass.membresias.service;
import java.sql.SQLException;
import com.fitpass.clientes.entity.Cliente;
import com.fitpass.clientes.repository.ClienteRepository;
import com.fitpass.membresias.dto.MembresiaRequest;
import com.fitpass.membresias.entity.Membresia;
import com.fitpass.membresias.repository.MembresiaRepository;
import com.fitpass.membresias.repository.PlanRepository;
import com.fitpass.membresias.repository.MetodoPagoRepository;
import com.fitpass.membresias.dto.CancelacionRequest;
import com.fitpass.membresias.dto.CancelacionResponse;
import com.fitpass.membresias.repository.CancelacionRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.temporal.ChronoUnit;


@Service
public class MembresiaService {

    private final MembresiaRepository membresiaRepository;
    private final ClienteRepository clienteRepository;
    private final PlanRepository planRepository;
    private final MetodoPagoRepository metodoPagoRepository;
    private final TransactionTemplate transactionTemplate;
    private final CancelacionRepository cancelacionRepository;

   
    

public MembresiaService(
        MembresiaRepository membresiaRepository,
        ClienteRepository clienteRepository,
        PlanRepository planRepository,
        MetodoPagoRepository metodoPagoRepository,
        TransactionTemplate transactionTemplate,
        CancelacionRepository cancelacionRepository) {

    this.membresiaRepository = membresiaRepository;
    this.clienteRepository = clienteRepository;
    this.planRepository = planRepository;
    this.metodoPagoRepository = metodoPagoRepository;
    this.transactionTemplate = transactionTemplate;
    this.cancelacionRepository = cancelacionRepository;
}




    // LISTAR MEMBRESIAS
    
 // LISTAR TODAS LAS MEMBRESIAS
    @Transactional(readOnly = true)
    public List<Membresia> listarMembresias() {
        return membresiaRepository.findAll();
    }

    // LISTAR MEMBRESIAS DE UN CLIENTE
    @Transactional(readOnly = true)
    public List<Membresia> listarPorCliente(UUID clienteId) {

        if (!clienteRepository.existsById(clienteId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Cliente no encontrado"
            );
        }

        return membresiaRepository.findByClienteId(clienteId);
    }



    // BUSCAR MEMBRESIA POR ID
    @Transactional(readOnly = true)
    public Membresia obtenerMembresia(Integer id) {
        return membresiaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Membresia no encontrada"
                ));
    }

    // CONTRATAR MEMBRESIA
    @Transactional
    public Membresia contratarMembresia(MembresiaRequest request) {

        // 1. Verificar que el cliente exista
        Cliente cliente = clienteRepository
                .findById(request.getClienteId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "El cliente seleccionado no existe"
                ));

        // 2. Verificar que el cliente este activo
        if (!"ACTIVO".equals(cliente.getEstado())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El cliente no esta activo"
            );
        }

        // 3. Verificar que no tenga otra membresia activa
        if (membresiaRepository.existsByClienteIdAndEstado(
                request.getClienteId(), "ACTIVA")) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El cliente ya tiene una membresia activa"
            );
        }

        // 4. Consultar los meses de permanencia del plan
        Integer mesesPermanencia = planRepository
                .obtenerMesesPermanencia(request.getPlanId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "El plan seleccionado no existe"
                ));

        if (mesesPermanencia < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El plan tiene una permanencia invalida"
            );
        }


        
// Verificar que el metodo de pago pertenezca al cliente
if (request.getMetodoPagoId() != null) {

    boolean pertenece = metodoPagoRepository.perteneceAlCliente(
            request.getMetodoPagoId(),
            request.getClienteId()
    );

    if (!pertenece) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "El metodo de pago no existe o no pertenece al cliente"
        );
    }
}

        // 5. Calcular fechas
        LocalDate fechaInicio = LocalDate.now();

        LocalDate fechaFinPermanencia =
                fechaInicio.plusMonths(mesesPermanencia);

        // 6. Crear membresia
        Membresia membresia = new Membresia();

        membresia.setClienteId(request.getClienteId());
        membresia.setPlanId(request.getPlanId());
        membresia.setMetodoPagoId(request.getMetodoPagoId());
        membresia.setFechaInicio(fechaInicio);
        membresia.setFechaFinPermanenciaMinima(
                fechaFinPermanencia
        );
        membresia.setDiaCorteMensual(
                request.getDiaCorteMensual()
        );
        membresia.setDescuentoAutomaticoActivo(true);
        membresia.setEstado("ACTIVA");

        // 7. Guardar en Supabase
        
try {
    return transactionTemplate.execute(status ->
            membresiaRepository.saveAndFlush(membresia)
    );

} catch (DataIntegrityViolationException ex) {

    Throwable causa = ex;

    while (causa != null) {

        if (causa instanceof SQLException sqlEx
                && "23505".equals(sqlEx.getSQLState())
                && sqlEx.getMessage() != null
                && sqlEx.getMessage().contains(
                        "uq_membresia_activa_cliente")) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El cliente ya tiene una membresia activa"
            );
        }

        causa = causa.getCause();
    }

    throw ex;
}


    }


    // LISTAR MEMBRESIAS POR ESTADO
    @Transactional(readOnly = true)
    public List<Membresia> listarPorEstado(String estado) {

        if (estado == null || estado.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El estado es obligatorio"
            );
        }

        return membresiaRepository.findByEstado(
                estado.trim().toUpperCase()
        );
    }

      // SOLICITAR CANCELACION DE MEMBRESIA
    @Transactional
    public CancelacionResponse solicitarCancelacion(
            Integer membresiaId,
            CancelacionRequest request) {

        Membresia membresia = membresiaRepository.findById(membresiaId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Membresia no encontrada"
                ));

        if (!"ACTIVA".equals(membresia.getEstado())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Solo se pueden solicitar cancelaciones de membresias activas"
            );
        }

        if (cancelacionRepository.existeSolicitud(membresiaId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ya existe una solicitud de cancelacion para esta membresia"
            );
        }

        CancelacionRepository.DatosPlan plan =
                cancelacionRepository.obtenerDatosPlan(
                        membresia.getPlanId()
                ).orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "El plan asociado no existe"
                ));

        if (plan.precioMensual() == null
                || plan.porcentajePenalizacion() == null
                || plan.precioMensual().signum() < 0
                || plan.porcentajePenalizacion().signum() < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El plan tiene datos de penalizacion invalidos"
            );
        }

        LocalDate hoy = LocalDate.now();

        LocalDate finPermanencia =
                membresia.getFechaFinPermanenciaMinima();

        if (finPermanencia == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La membresia no tiene fecha de permanencia"
            );
        }

        boolean cumplioPermanencia =
                !hoy.isBefore(finPermanencia);

        long mesesRestantes = 0;

        if (!cumplioPermanencia) {
            mesesRestantes = ChronoUnit.MONTHS.between(
                    hoy.withDayOfMonth(1),
                    finPermanencia.withDayOfMonth(1)
            );

            if (hoy.getDayOfMonth() < finPermanencia.getDayOfMonth()) {
                mesesRestantes++;
            }

            mesesRestantes = Math.max(1, mesesRestantes);
        }

        if (mesesRestantes > Integer.MAX_VALUE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Periodo de permanencia invalido"
            );
        }

        BigDecimal penalizacion = plan.precioMensual()
                .multiply(BigDecimal.valueOf(mesesRestantes))
                .multiply(plan.porcentajePenalizacion())
                .divide(
                        BigDecimal.valueOf(100),
                        2,
                        RoundingMode.HALF_UP
                );

        Integer cancelacionId = cancelacionRepository.registrar(
                membresiaId,
                request.getMotivoCancelacion().trim(),
                cumplioPermanencia,
                (int) mesesRestantes,
                penalizacion
        );

        String resultado;

        if (penalizacion.signum() == 0) {
            membresia.setEstado("CANCELADA");
            membresia.setDescuentoAutomaticoActivo(false);
            membresiaRepository.saveAndFlush(membresia);

            resultado = "CANCELACION_COMPLETADA";
        } else {
            resultado = "PENDIENTE_COBRO_PENALIZACION";
        }

        return new CancelacionResponse(
                cancelacionId,
                membresiaId,
                cumplioPermanencia,
                mesesRestantes,
                penalizacion,
                membresia.getEstado(),
                resultado
        );
    }

}
