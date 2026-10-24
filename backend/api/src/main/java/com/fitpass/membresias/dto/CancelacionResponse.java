
package com.fitpass.membresias.dto;

import java.math.BigDecimal;

public class CancelacionResponse {

    private Integer cancelacionId;
    private Integer membresiaId;
    private boolean cumplioPermanenciaMinima;
    private long mesesRestantes;
    private BigDecimal montoPenalizacion;
    private String estadoMembresia;
    private String resultado;

    public CancelacionResponse(
            Integer cancelacionId,
            Integer membresiaId,
            boolean cumplioPermanenciaMinima,
            long mesesRestantes,
            BigDecimal montoPenalizacion,
            String estadoMembresia,
            String resultado) {

        this.cancelacionId = cancelacionId;
        this.membresiaId = membresiaId;
        this.cumplioPermanenciaMinima = cumplioPermanenciaMinima;
        this.mesesRestantes = mesesRestantes;
        this.montoPenalizacion = montoPenalizacion;
        this.estadoMembresia = estadoMembresia;
        this.resultado = resultado;
    }

    public Integer getCancelacionId() {
        return cancelacionId;
    }

    public Integer getMembresiaId() {
        return membresiaId;
    }

    public boolean isCumplioPermanenciaMinima() {
        return cumplioPermanenciaMinima;
    }

    public long getMesesRestantes() {
        return mesesRestantes;
    }

    public BigDecimal getMontoPenalizacion() {
        return montoPenalizacion;
    }

    public String getEstadoMembresia() {
        return estadoMembresia;
    }

    public String getResultado() {
        return resultado;
    }
}
