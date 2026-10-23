
package com.fitpass.clientes.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "clientes", schema = "public")
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String nombres;

    @Column(nullable = false)
    private String apellidos;

    @Column(name = "documento_identidad", nullable = false, unique = true)
    private String documentoIdentidad;

    @Column(nullable = false, unique = true)
    private String email;

    private String telefono;

    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    @Column(name = "sucursal_base_id", nullable = false)
    private Integer sucursalBaseId;

    @Column(name = "codigo_qr_acceso", nullable = false, unique = true)
    private String codigoQrAcceso;

    private String estado = "ACTIVO";

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getNombres() {
        return nombres;
    }

    public void setNombres(String nombres) {
        this.nombres = nombres;
    }

    public String getApellidos() {
        return apellidos;
    }

    public void setApellidos(String apellidos) {
        this.apellidos = apellidos;
    }

    public String getDocumentoIdentidad() {
        return documentoIdentidad;
    }

    public void setDocumentoIdentidad(String documentoIdentidad) {
        this.documentoIdentidad = documentoIdentidad;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public LocalDate getFechaNacimiento() {
        return fechaNacimiento;
    }

    public void setFechaNacimiento(LocalDate fechaNacimiento) {
        this.fechaNacimiento = fechaNacimiento;
    }

    public Integer getSucursalBaseId() {
        return sucursalBaseId;
    }

    public void setSucursalBaseId(Integer sucursalBaseId) {
        this.sucursalBaseId = sucursalBaseId;
    }

    public String getCodigoQrAcceso() {
        return codigoQrAcceso;
    }

    public void setCodigoQrAcceso(String codigoQrAcceso) {
        this.codigoQrAcceso = codigoQrAcceso;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
