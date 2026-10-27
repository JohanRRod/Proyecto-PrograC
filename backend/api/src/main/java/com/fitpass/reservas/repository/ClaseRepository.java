
package com.fitpass.reservas.repository;

import com.fitpass.reservas.entity.ClaseGrupal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface ClaseRepository
        extends JpaRepository<ClaseGrupal, Integer> {

    List<ClaseGrupal> findBySucursalId(Integer sucursalId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM ClaseGrupal c WHERE c.id = :id")
    Optional<ClaseGrupal> buscarParaReservar(
            @Param("id") Integer id
    );
}
