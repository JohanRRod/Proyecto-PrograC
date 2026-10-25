package com.fitpass.mensajeria.service;

import com.fitpass.mensajeria.config.RabbitMQConfig;
import com.fitpass.mensajeria.repository.OutboxRepository;

import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class OutboxPublisher {

    private final OutboxRepository repository;
    private final RabbitTemplate rabbitTemplate;
    private final TransactionTemplate transactionTemplate;

    public OutboxPublisher(
            OutboxRepository repository,
            RabbitTemplate rabbitTemplate,
            TransactionTemplate transactionTemplate) {

        this.repository = repository;
        this.rabbitTemplate = rabbitTemplate;
        this.transactionTemplate = transactionTemplate;
    }

    @Scheduled(fixedDelayString = "${fitpass.outbox.intervalo-ms:5000}")
    public void publicarPendientes() {

        for (UUID id : repository.listarPendientes()) {
            try {
                publicarUno(id);
            } catch (Exception e) {
                System.err.println(
                    "[Outbox] Error procesando " + id + ": " + e.getMessage()
                );
            }
        }
    }

    private void publicarUno(UUID id) {

        transactionTemplate.executeWithoutResult(status -> {

            var pendiente = repository.bloquearPendiente(id);

            if (pendiente.isEmpty()) {
                return;
            }

            var evento = pendiente.get();

            try {
                CorrelationData confirmacion =
                    new CorrelationData(evento.id().toString());

                rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE,
                    RabbitMQConfig.ROUTING_KEY,
                    evento.payload(),
                    message -> {
                        message.getMessageProperties()
                            .setMessageId(evento.id().toString());
                        message.getMessageProperties()
                            .setDeliveryMode(
                                org.springframework.amqp.core.MessageDeliveryMode.PERSISTENT
                            );
                        return message;
                    },
                    confirmacion
                );

                var resultado = confirmacion.getFuture()
                    .get(5, TimeUnit.SECONDS);

                if (!resultado.isAck()) {
                    throw new IllegalStateException(
                        "RabbitMQ rechazo la publicacion: "
                        + resultado.getReason()
                    );
                }

                if (confirmacion.getReturned() != null) {
                    throw new IllegalStateException(
                        "RabbitMQ devolvio el mensaje sin enrutar"
                    );
                }

                repository.marcarPublicado(id);

                System.out.println(
                    "[Outbox] Evento publicado: " + evento.id()
                );

            } catch (Exception e) {
                repository.registrarError(id, e.getMessage());

                System.err.println(
                    "[Outbox] Evento pendiente de reintento: "
                    + evento.id()
                );
            }
        });
    }
}