
package com.fitpass.amenidades.entity;

import jakarta.persistence.*;

@Entity
@Table(
    name = "sucursal_amenidades",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"sucursal_id", "amenidad_id"}
    )
)
public class SucursalAmenidad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "sucursal_id", nullable = false)
    private Integer sucursalId;

    @Column(name = "amenidad_id", nullable = false)
    private Integer amenidadId;

    @Column(name = "disponible")
    private Boolean disponible = true;

    @Column(name = "capacidad_zona")
    private Integer capacidadZona = 10;

    @Column(name = "horario_especial")
    private String horarioEspecial;

    public SucursalAmenidad() {}

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getSucursalId() {
        return sucursalId;
    }

    public void setSucursalId(Integer sucursalId) {
        this.sucursalId = sucursalId;
    }

    public Integer getAmenidadId() {
        return amenidadId;
    }

    public void setAmenidadId(Integer amenidadId) {
        this.amenidadId = amenidadId;
    }

    public Boolean getDisponible() {
        return disponible;
    }

    public void setDisponible(Boolean disponible) {
        this.disponible = disponible;
    }

    public Integer getCapacidadZona() {
        return capacidadZona;
    }

    public void setCapacidadZona(Integer capacidadZona) {
        this.capacidadZona = capacidadZona;
    }

    public String getHorarioEspecial() {
        return horarioEspecial;
    }

    public void setHorarioEspecial(String horarioEspecial) {
        this.horarioEspecial = horarioEspecial;
    }
}
