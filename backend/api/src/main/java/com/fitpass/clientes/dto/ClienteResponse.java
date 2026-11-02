
package com.fitpass.clientes.dto;

import com.fitpass.clientes.entity.Cliente;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public class ClienteResponse {

    private UUID id;
    private String nombres;
    private String apellidos;
    private String documentoIdentidad;
    private String email;
    private String telefono;
    private LocalDate fechaNacimiento;
    private String estado;
    private Integer sucursalBaseId;
    private OffsetDateTime createdAt;

    public ClienteResponse(Cliente cliente) {
        this.id = cliente.getId();
        this.nombres = cliente.getNombres();
        this.apellidos = cliente.getApellidos();
        this.documentoIdentidad = cliente.getDocumentoIdentidad();
        this.email = cliente.getEmail();
        this.telefono = cliente.getTelefono();
        this.fechaNacimiento = cliente.getFechaNacimiento();
        this.estado = cliente.getEstado();
        this.sucursalBaseId = cliente.getSucursalBaseId();
        this.createdAt = cliente.getCreatedAt();
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

    public String getDocumentoIdentidad() {
        return documentoIdentidad;
    }

    public String getEmail() {
        return email;
    }

    public String getTelefono() {
        return telefono;
    }

    public LocalDate getFechaNacimiento() {
        return fechaNacimiento;
    }

    public String getEstado() {
        return estado;
    }

    public Integer getSucursalBaseId() {
        return sucursalBaseId;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
