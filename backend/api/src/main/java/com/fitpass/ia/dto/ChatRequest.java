package com.fitpass.ia.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatRequest(
        @NotBlank(message = "Escribe una pregunta")
        @Size(max = 500, message = "La pregunta puede tener hasta 500 caracteres")
        String mensaje,

        @Size(max = 100, message = "Identificador de sesión inválido")
        String sesionId) {
}
