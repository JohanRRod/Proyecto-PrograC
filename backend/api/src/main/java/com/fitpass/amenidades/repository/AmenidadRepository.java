
package com.fitpass.amenidades.repository;

import com.fitpass.amenidades.entity.Amenidad;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AmenidadRepository
        extends JpaRepository<Amenidad, Integer> {
    List<Amenidad> findByRequierePlanVipTrue();
}
