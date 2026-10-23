
package com.fitpass.clientes.controllers;

import com.fitpass.clientes.entity.Cliente;
import com.fitpass.clientes.service.ClienteService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.fitpass.clientes.dto.ClienteRequest;
import jakarta.validation.Valid;
import com.fitpass.clientes.dto.ClienteResponse;



import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    private final ClienteService clienteService;

    public ClienteController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    // GET: Listar todos los clientes
   
@GetMapping
public List<ClienteResponse> listarClientes() {

    return clienteService.listarClientes()
            .stream()
            .map(ClienteResponse::new)
            .toList();
}


    // GET: Buscar cliente por ID
   
@GetMapping("/{id}")
public ClienteResponse obtenerCliente(@PathVariable UUID id) {

    Cliente cliente = clienteService.obtenerCliente(id);

    return new ClienteResponse(cliente);
}


    // POST: Registrar nuevo cliente
    

@PostMapping
public ClienteResponse registrarCliente(
        @Valid @RequestBody ClienteRequest request) {

    Cliente cliente = clienteService.registrarClienteDesdeRequest(request);

    return new ClienteResponse(cliente);
}



    // PUT: Actualizar cliente
   
@PutMapping("/{id}")
public ClienteResponse actualizarCliente(
        @PathVariable UUID id,
        @Valid @RequestBody ClienteRequest request) {

    Cliente datos = new Cliente();

    datos.setNombres(request.getNombres());
    datos.setApellidos(request.getApellidos());
    datos.setEmail(request.getEmail());
    datos.setTelefono(request.getTelefono());
    datos.setFechaNacimiento(request.getFechaNacimiento());

    Cliente actualizado = clienteService.actualizarCliente(id, datos);

    return new ClienteResponse(actualizado);
}


    // DELETE: Desactivar cliente
   
@DeleteMapping("/{id}")
public ResponseEntity<Void> desactivarCliente(
        @PathVariable UUID id) {

    clienteService.desactivarCliente(id);

    return ResponseEntity.noContent().build();
}

}
