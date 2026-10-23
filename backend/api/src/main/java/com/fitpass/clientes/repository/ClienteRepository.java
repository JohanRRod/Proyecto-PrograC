
package com.fitpass.clientes.repository;

import com.fitpass.clientes.entity.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, UUID> {

    boolean existsByEmail(String email);

    boolean existsByDocumentoIdentidad(String documentoIdentidad);

    boolean existsByCodigoQrAcceso(String codigoQrAcceso);
}
