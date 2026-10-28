
package com.fitpass.amenidades.repository;

import com.fitpass.amenidades.entity.SucursalAmenidad;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SucursalAmenidadRepository
        extends JpaRepository<SucursalAmenidad, Integer> {

    List<SucursalAmenidad> findBySucursalId(Integer sucursalId);

    Optional<SucursalAmenidad>
        findBySucursalIdAndAmenidadId(
            Integer sucursalId,
            Integer amenidadId
        );

    boolean existsBySucursalIdAndAmenidadId(
        Integer sucursalId,
        Integer amenidadId
    );
}
