
package com.fitpass.exceptions;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Errores de validacion de @Valid
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> manejarValidaciones(
            MethodArgumentNotValidException ex) {

        Map<String, String> errores = new LinkedHashMap<>();

        ex.getBindingResult().getFieldErrors().forEach(error ->
            errores.put(
                error.getField(),
                error.getDefaultMessage()
            )
        );

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("mensaje", "Los datos enviados no son validos");
        respuesta.put("errores", errores);

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(respuesta);
    }

    // Errores HTTP controlados por nuestros servicios
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> manejarErrorHttp(
            ResponseStatusException ex) {

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("mensaje", ex.getReason() != null
                ? ex.getReason()
                : "No se pudo procesar la solicitud");

        return ResponseEntity
                .status(ex.getStatusCode())
                .body(respuesta);
    }
}
