
package com.fitpass.planes.controller;

import com.fitpass.planes.dto.PlanRequest;
import com.fitpass.planes.repository.PlanCrudRepository;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/planes")
public class PlanController {

    private final PlanCrudRepository repository;

    public PlanController(PlanCrudRepository repository) {
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
                HttpStatus.NOT_FOUND, "Plan no encontrado"
            ));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> crear(
            @Valid @RequestBody PlanRequest request) {

        Integer id = repository.crear(request);

        return ResponseEntity
            .created(URI.create("/api/planes/" + id))
            .body(obtener(id));
    }

    @PutMapping("/{id}")
    public Map<String, Object> actualizar(
            @PathVariable Integer id,
            @Valid @RequestBody PlanRequest request) {

        if (repository.actualizar(id, request) == 0) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Plan no encontrado"
            );
        }

        return obtener(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void desactivar(@PathVariable Integer id) {

        if (repository.desactivar(id) == 0) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Plan no encontrado"
            );
        }
    }
}
