
package com.fitpass.reservas.repository;

import com.fitpass.reservas.entity.ReservaClase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ReservaRepository
        extends JpaRepository<ReservaClase, Integer> {

    List<ReservaClase> findByClienteIdOrderByFechaClaseDesc(
            UUID clienteId
    );

    long countByClaseIdAndFechaClaseAndEstado(
            Integer claseId,
            LocalDate fechaClase,
            String estado
    );

    boolean existsByClaseIdAndClienteIdAndFechaClaseAndEstado(
            Integer claseId,
            UUID clienteId,
            LocalDate fechaClase,
            String estado
    );
}
