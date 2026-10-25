
package com.fitpass.mensajeria.service;

import com.fitpass.mensajeria.config.RabbitMQConfig;
import com.fitpass.mensajeria.dto.EventoPago;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class EventoPagoService {

    private final RabbitTemplate rabbitTemplate;

    public EventoPagoService(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public EventoPago publicarEventoPrueba(Integer cobroId) {

        EventoPago evento = new EventoPago(
            UUID.randomUUID(),
            cobroId,
            "PAGO_PRUEBA",
            OffsetDateTime.now()
        );

        rabbitTemplate.convertAndSend(
            RabbitMQConfig.EXCHANGE,
            RabbitMQConfig.ROUTING_KEY,
            evento.eventoId() + "|" +
            evento.cobroId() + "|" +
            evento.tipo() + "|" +
            evento.fechaEvento()
        );

        return evento;
    }

    @RabbitListener(queues = RabbitMQConfig.COLA_PAGOS)
    public void consumirEvento(String mensaje) {

        System.out.println(
            "[FitPass RabbitMQ] Evento recibido: " + mensaje
        );
    }
}
