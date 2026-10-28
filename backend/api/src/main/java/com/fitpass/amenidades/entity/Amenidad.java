
package com.fitpass.amenidades.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "amenidades")
public class Amenidad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String nombre;

    @Column(columnDefinition = "text")
    private String descripcion;

    @Column(name = "icono_url", columnDefinition = "text")
    private String iconoUrl;

    @Column(name = "requiere_plan_vip")
    private Boolean requierePlanVip = false;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public Amenidad() {}

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public String getIconoUrl() {
        return iconoUrl;
    }

    public void setIconoUrl(String iconoUrl) {
        this.iconoUrl = iconoUrl;
    }

    public Boolean getRequierePlanVip() {
        return requierePlanVip;
    }

    public void setRequierePlanVip(Boolean requierePlanVip) {
        this.requierePlanVip = requierePlanVip;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
