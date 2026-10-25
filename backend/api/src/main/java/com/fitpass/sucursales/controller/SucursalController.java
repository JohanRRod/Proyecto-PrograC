
package com.fitpass.sucursales.controller;

import com.fitpass.sucursales.dto.SucursalRequest;
import com.fitpass.sucursales.repository.SucursalCrudRepository;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sucursales")
public class SucursalController {

    private final SucursalCrudRepository repository;

    public SucursalController(SucursalCrudRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Map<String, Object>> listar() {
        return repository.listar();
    }

    @GetMapping("/{id}")
    public Map<String, Object> obtener(@PathVariable Integer id) {
        return repository.obtener(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Sucursal no encontrada"
            ));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> crear(
            @Valid @RequestBody SucursalRequest request) {

        validarHorarios(request);

        Integer id = repository.crear(request);

        return ResponseEntity
            .created(URI.create("/api/sucursales/" + id))
            .body(obtener(id));
    }

    @PutMapping("/{id}")
    public Map<String, Object> actualizar(
            @PathVariable Integer id,
            @Valid @RequestBody SucursalRequest request) {

        validarHorarios(request);

        if (repository.actualizar(id, request) == 0) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Sucursal no encontrada"
            );
        }

        return obtener(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void desactivar(@PathVariable Integer id) {

        if (repository.desactivar(id) == 0) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Sucursal no encontrada"
            );
        }
    }

    private void validarHorarios(SucursalRequest request) {

        var apertura = request.horarioApertura() == null
            ? java.time.LocalTime.of(5, 0)
            : request.horarioApertura();

        var cierre = request.horarioCierre() == null
            ? java.time.LocalTime.of(22, 0)
            : request.horarioCierre();

        if (!apertura.isBefore(cierre)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "La apertura debe ser anterior al cierre"
            );
        }
    }
}
