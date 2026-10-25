package com.fitpass.mensajeria.service;

import com.fitpass.mensajeria.config.RabbitMQConfig;
import com.fitpass.mensajeria.repository.OutboxRepository;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class CobroEventListener {

    private final OutboxRepository repository;

    public CobroEventListener(OutboxRepository repository) {
        this.repository = repository;
    }

    @Transactional
    @RabbitListener(queues = RabbitMQConfig.COLA_PAGOS)
    public void recibir(String mensaje) {

        String[] partes = mensaje.split("\\|", -1);

        if (partes.length != 4) {
            throw new IllegalArgumentException(
                "Formato de evento invalido"
            );
        }

        UUID eventoId = UUID.fromString(partes[0]);
        Integer cobroId = Integer.valueOf(partes[1]);
        String tipo = partes[2];

        if (cobroId <= 0) {
            throw new IllegalArgumentException(
                "ID de cobro invalido"
            );
        }

        if (!tipo.equals("COBRO_EXITOSO")
                && !tipo.equals("COBRO_RECHAZADO")) {
            throw new IllegalArgumentException(
                "Tipo de evento no permitido"
            );
        }

        boolean nuevo = repository.registrarProcesamiento(
            eventoId,
            tipo
        );

        if (!nuevo) {
            System.out.println(
                "[RabbitMQ] Evento duplicado ignorado: " + eventoId
            );
            return;
        }

        System.out.println(
            "[RabbitMQ] Cobro procesado: " + cobroId
            + " | Tipo: " + tipo
            + " | Evento: " + eventoId
        );
    }
}