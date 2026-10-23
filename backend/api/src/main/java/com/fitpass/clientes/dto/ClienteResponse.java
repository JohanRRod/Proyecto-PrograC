
package com.fitpass.clientes.dto;

import com.fitpass.clientes.entity.Cliente;
import java.util.UUID;

public class ClienteResponse {

    private UUID id;
    private String nombres;
    private String apellidos;
    private String email;
    private String estado;
    private Integer sucursalBaseId;

    public ClienteResponse(Cliente cliente) {
        this.id = cliente.getId();
        this.nombres = cliente.getNombres();
        this.apellidos = cliente.getApellidos();
        this.email = cliente.getEmail();
        this.estado = cliente.getEstado();
        this.sucursalBaseId = cliente.getSucursalBaseId();
    }

    public UUID getId() {
        return id;
    }

    public String getNombres() {
        return nombres;
    }

    public String getApellidos() {
        return apellidos;
    }

    public String getEmail() {
        return email;
    }

    public String getEstado() {
        return estado;
    }

    public Integer getSucursalBaseId() {
        return sucursalBaseId;
    }
}
