
package com.fitpass.amenidades.service;

import com.fitpass.amenidades.dto.AmenidadRequest;
import com.fitpass.amenidades.dto.SucursalAmenidadRequest;
import com.fitpass.amenidades.entity.Amenidad;
import com.fitpass.amenidades.entity.SucursalAmenidad;
import com.fitpass.amenidades.repository.AmenidadRepository;
import com.fitpass.amenidades.repository.SucursalAmenidadRepository;
import com.fitpass.accesos.repository.AccesoRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
public class AmenidadService {

    private final AmenidadRepository amenidadRepository;
    private final SucursalAmenidadRepository sucursalAmenidadRepository;
    private final AccesoRepository accesoRepository;

    public AmenidadService(
            AmenidadRepository amenidadRepository,
            SucursalAmenidadRepository sucursalAmenidadRepository,
            AccesoRepository accesoRepository) {
        this.amenidadRepository = amenidadRepository;
        this.sucursalAmenidadRepository = sucursalAmenidadRepository;
        this.accesoRepository = accesoRepository;
    }

    public List<Amenidad> listar() {
        return amenidadRepository.findAll();
    }

    public Amenidad obtener(Integer id) {
        return amenidadRepository.findById(id)
                .orElseThrow(() -> error(
                        HttpStatus.NOT_FOUND, "AMENIDAD_NO_EXISTE"));
    }

    @Transactional
    public Amenidad crear(AmenidadRequest request) {
        Amenidad amenidad = new Amenidad();
        actualizarDatos(amenidad, request);
        return amenidadRepository.save(amenidad);
    }

    @Transactional
    public Amenidad actualizar(Integer id, AmenidadRequest request) {
        Amenidad amenidad = obtener(id);
        actualizarDatos(amenidad, request);
        return amenidadRepository.save(amenidad);
    }

    public List<SucursalAmenidad> listarPorSucursal(Integer sucursalId) {
        validarSucursal(sucursalId);
        return sucursalAmenidadRepository.findBySucursalId(sucursalId);
    }

    @Transactional
    public SucursalAmenidad asignar(
            Integer sucursalId,
            SucursalAmenidadRequest request) {

        validarSucursal(sucursalId);
        obtener(request.amenidadId());

        if (sucursalAmenidadRepository.existsBySucursalIdAndAmenidadId(
                sucursalId, request.amenidadId())) {
            throw error(HttpStatus.CONFLICT, "AMENIDAD_YA_ASIGNADA");
        }

        SucursalAmenidad asignacion = new SucursalAmenidad();
        asignacion.setSucursalId(sucursalId);
        asignacion.setAmenidadId(request.amenidadId());

        actualizarAsignacion(asignacion, request);

        return sucursalAmenidadRepository.save(asignacion);
    }

    @Transactional
    public SucursalAmenidad actualizarAsignacion(
            Integer sucursalId,
            Integer amenidadId,
            SucursalAmenidadRequest request) {

        validarSucursal(sucursalId);
        obtener(amenidadId);

        if (!amenidadId.equals(request.amenidadId())) {
            throw error(HttpStatus.BAD_REQUEST, "AMENIDAD_ID_NO_COINCIDE");
        }

        SucursalAmenidad asignacion = sucursalAmenidadRepository
                .findBySucursalIdAndAmenidadId(sucursalId, amenidadId)
                .orElseThrow(() -> error(
                        HttpStatus.NOT_FOUND, "AMENIDAD_NO_ASIGNADA"));

        actualizarAsignacion(asignacion, request);

        return sucursalAmenidadRepository.save(asignacion);
    }

    private void actualizarDatos(
            Amenidad amenidad,
            AmenidadRequest request) {

        amenidad.setNombre(request.nombre().trim());
        amenidad.setDescripcion(request.descripcion());
        amenidad.setIconoUrl(request.iconoUrl());
        amenidad.setRequierePlanVip(request.requierePlanVip());
    }

    private void actualizarAsignacion(
            SucursalAmenidad asignacion,
            SucursalAmenidadRequest request) {

        asignacion.setDisponible(request.disponible());
        asignacion.setCapacidadZona(request.capacidadZona());
        asignacion.setHorarioEspecial(request.horarioEspecial());
    }

    
private void validarSucursal(Integer sucursalId) {
    List<Map<String, Object>> sucursales =
            accesoRepository.buscarSucursal(sucursalId);

    if (sucursales == null || sucursales.isEmpty()) {
        throw error(HttpStatus.NOT_FOUND, "SUCURSAL_NO_EXISTE");
    }
}


    private ResponseStatusException error(
            HttpStatus status, String mensaje) {
        return new ResponseStatusException(status, mensaje);
    }
}
