
package com.fitpass.membresias.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "membresias", schema = "public")
public class Membresia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "cliente_id", nullable = false)
    private UUID clienteId;

    @Column(name = "plan_id", nullable = false)
    private Integer planId;

    @Column(name = "metodo_pago_id")
    private Integer metodoPagoId;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    @Column(name = "fecha_fin_permanencia_minima", nullable = false)
    private LocalDate fechaFinPermanenciaMinima;

    @Column(name = "dia_corte_mensual", nullable = false)
    private Integer diaCorteMensual;

    @Column(name = "descuento_automatico_activo")
    private Boolean descuentoAutomaticoActivo;

    @Column(name = "estado")
    private String estado;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public UUID getClienteId() {
        return clienteId;
    }

    public void setClienteId(UUID clienteId) {
        this.clienteId = clienteId;
    }

    public Integer getPlanId() {
        return planId;
    }

    public void setPlanId(Integer planId) {
        this.planId = planId;
    }

    public Integer getMetodoPagoId() {
        return metodoPagoId;
    }

    public void setMetodoPagoId(Integer metodoPagoId) {
        this.metodoPagoId = metodoPagoId;
    }

    public LocalDate getFechaInicio() {
        return fechaInicio;
    }

    public void setFechaInicio(LocalDate fechaInicio) {
        this.fechaInicio = fechaInicio;
    }

    public LocalDate getFechaFinPermanenciaMinima() {
        return fechaFinPermanenciaMinima;
    }

    public void setFechaFinPermanenciaMinima(
            LocalDate fechaFinPermanenciaMinima) {
        this.fechaFinPermanenciaMinima = fechaFinPermanenciaMinima;
    }

    public Integer getDiaCorteMensual() {
        return diaCorteMensual;
    }

    public void setDiaCorteMensual(Integer diaCorteMensual) {
        this.diaCorteMensual = diaCorteMensual;
    }

    public Boolean getDescuentoAutomaticoActivo() {
        return descuentoAutomaticoActivo;
    }

    public void setDescuentoAutomaticoActivo(
            Boolean descuentoAutomaticoActivo) {
        this.descuentoAutomaticoActivo = descuentoAutomaticoActivo;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }
}
