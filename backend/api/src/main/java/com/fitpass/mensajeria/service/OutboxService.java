package com.fitpass.mensajeria.service;

import com.fitpass.mensajeria.repository.OutboxRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class OutboxService {

    private final OutboxRepository repository;

    public OutboxService(OutboxRepository repository) {
        this.repository = repository;
    }

    public void registrarEventoCobro(
            Integer cobroId,
            String estado) {

        UUID eventoId = UUID.randomUUID();

        String tipoEvento = "EXITOSO".equals(estado)
            ? "COBRO_EXITOSO"
            : "COBRO_RECHAZADO";

        String payload = String.join(
            "|",
            eventoId.toString(),
            cobroId.toString(),
            tipoEvento,
            OffsetDateTime.now().toString()
        );

        repository.guardar(
            eventoId,
            tipoEvento,
            cobroId,
            payload
        );
    }
}