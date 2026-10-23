
package com.fitpass.clientes.service;

import com.fitpass.clientes.entity.Cliente;
import com.fitpass.clientes.repository.ClienteRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import com.fitpass.clientes.dto.ClienteRequest;
import com.fitpass.sucursales.repository.SucursalRepository;

@Service
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final SucursalRepository sucursalRepository;

    
public ClienteService(
        ClienteRepository clienteRepository,
        SucursalRepository sucursalRepository) {

    this.clienteRepository = clienteRepository;
    this.sucursalRepository = sucursalRepository;
}



    // LISTAR CLIENTES
    @Transactional(readOnly = true)
    public List<Cliente> listarClientes() {
        return clienteRepository.findAll();
    }

    // BUSCAR CLIENTE POR ID
    @Transactional(readOnly = true)
    public Cliente obtenerCliente(UUID id) {
        return clienteRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Cliente no encontrado"
                ));
    }

    // REGISTRAR CLIENTE
    @Transactional
    public Cliente registrarCliente(Cliente cliente) {

        if (cliente.getNombres() == null ||
                cliente.getNombres().isBlank() ||
                cliente.getApellidos() == null ||
                cliente.getApellidos().isBlank() ||
                cliente.getEmail() == null ||
                cliente.getEmail().isBlank() ||
                cliente.getDocumentoIdentidad() == null ||
                cliente.getDocumentoIdentidad().isBlank() ||
                cliente.getSucursalBaseId() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Faltan datos obligatorios del cliente"
            );
        }

        if (clienteRepository.existsByEmail(cliente.getEmail())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El correo ya está registrado"
            );
        }

        if (clienteRepository.existsByDocumentoIdentidad(
                cliente.getDocumentoIdentidad())) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El documento de identidad ya está registrado"
            );
        }

        // Generar código de acceso único
        String codigoQr;

        do {
            codigoQr = UUID.randomUUID().toString();
        } while (clienteRepository.existsByCodigoQrAcceso(codigoQr));

        cliente.setId(null);
        cliente.setCodigoQrAcceso(codigoQr);
        cliente.setEstado("ACTIVO");

        return clienteRepository.save(cliente);
    }

    // ACTUALIZAR CLIENTE
    @Transactional
    public Cliente actualizarCliente(UUID id, Cliente datos) {

        Cliente cliente = obtenerCliente(id);

        if (datos.getNombres() != null) {
            cliente.setNombres(datos.getNombres());
        }

        if (datos.getApellidos() != null) {
            cliente.setApellidos(datos.getApellidos());
        }

        if (datos.getTelefono() != null) {
            cliente.setTelefono(datos.getTelefono());
        }

        if (datos.getFechaNacimiento() != null) {
            cliente.setFechaNacimiento(datos.getFechaNacimiento());
        }

        if (datos.getEmail() != null &&
                !datos.getEmail().equals(cliente.getEmail())) {

            if (clienteRepository.existsByEmail(datos.getEmail())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "El correo ya está registrado"
                );
            }

            cliente.setEmail(datos.getEmail());
        }

        return clienteRepository.save(cliente);
    }

    // DESACTIVAR CLIENTE
    @Transactional
    public void desactivarCliente(UUID id) {

        Cliente cliente = obtenerCliente(id);

        cliente.setEstado("INACTIVO");

        clienteRepository.save(cliente);
    }

    

public Cliente registrarClienteDesdeRequest(ClienteRequest request) {

    // Verificar que la sucursal exista en Supabase
    if (!sucursalRepository.existeSucursal(
            request.getSucursalBaseId())) {

        throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST,
                "La sucursal seleccionada no existe"
        );
    }

    // Crear la entidad Cliente
    Cliente cliente = new Cliente();

    cliente.setNombres(request.getNombres());
    cliente.setApellidos(request.getApellidos());
    cliente.setDocumentoIdentidad(request.getDocumentoIdentidad());
    cliente.setEmail(request.getEmail());
    cliente.setTelefono(request.getTelefono());
    cliente.setFechaNacimiento(request.getFechaNacimiento());
    cliente.setSucursalBaseId(request.getSucursalBaseId());

    // Registrar el cliente utilizando la lógica existente
    return registrarCliente(cliente);
}


}
