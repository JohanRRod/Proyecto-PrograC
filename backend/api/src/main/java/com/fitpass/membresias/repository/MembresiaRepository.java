
package com.fitpass.membresias.repository;

import com.fitpass.membresias.entity.Membresia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MembresiaRepository
        extends JpaRepository<Membresia, Integer> {

    // Buscar todas las membresias de un cliente
    List<Membresia> findByClienteId(UUID clienteId);

    // Buscar membresias por estado
    List<Membresia> findByEstado(String estado);

    // Verificar si un cliente tiene una membresia activa
    boolean existsByClienteIdAndEstado(
            UUID clienteId,
            String estado
    );
}
