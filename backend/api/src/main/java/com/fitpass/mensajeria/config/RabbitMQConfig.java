
package com.fitpass.mensajeria.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE = "fitpass.eventos";
    public static final String COLA_PAGOS = "fitpass.pagos.eventos";
    public static final String ROUTING_KEY = "pagos.evento";

    @Bean
    public DirectExchange fitpassExchange() {
        return new DirectExchange(EXCHANGE, true, false);
    }

    @Bean
    public Queue colaPagos() {
        return new Queue(COLA_PAGOS, true);
    }

    @Bean
    public Binding bindingPagos(
            Queue colaPagos,
            DirectExchange fitpassExchange) {

        return BindingBuilder.bind(colaPagos)
                .to(fitpassExchange)
                .with(ROUTING_KEY);
    }
}
