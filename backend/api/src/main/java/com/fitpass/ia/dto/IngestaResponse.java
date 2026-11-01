package com.fitpass.ia.dto;

import java.util.List;

public record IngestaResponse(int documentos, int fragmentos, List<Archivo> archivos) {

    public record Archivo(String archivo, String titulo, int fragmentos) {}
}
