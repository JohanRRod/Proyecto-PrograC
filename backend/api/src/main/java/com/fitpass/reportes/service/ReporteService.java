package com.fitpass.reportes.service;

import com.fitpass.reportes.repository.ReporteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ReporteService {

    private final ReporteRepository repository;

    public ReporteService(ReporteRepository repository) {
        this.repository = repository;
    }

    // Primer reporte: clientes registrados
    @Transactional(readOnly = true)
    public List<Map<String, Object>> clientesRegistrados() {
        return repository.clientesRegistrados();
    }

    // Los otros 14 reportes
    @Transactional(readOnly = true)
    public List<Map<String, Object>> consultar(String codigo) {
        return repository.consultar(codigo);
    }

    // Listar reportes disponibles
    public Set<String> disponibles() {
        return repository.reportesDisponibles();
    }
}