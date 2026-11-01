package com.fitpass.ia.dto;

import java.util.List;

public record ChatResponse(String respuesta, List<Fuente> fuentes, String sesionId) {

    public record Fuente(int numero, String titulo, String categoria, String seccion) {}
}
