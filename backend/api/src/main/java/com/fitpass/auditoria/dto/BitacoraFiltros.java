package com.fitpass.auditoria.dto;

import java.time.LocalDate;

public record BitacoraFiltros(
        LocalDate desde,
        LocalDate hasta,
        String modulo,
        String accion,
        Boolean exitoso,
        String q
) {}
