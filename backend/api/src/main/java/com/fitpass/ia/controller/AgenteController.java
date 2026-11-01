package com.fitpass.ia.controller;

import java.util.List;
import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fitpass.ia.dto.ChatRequest;
import com.fitpass.ia.dto.ChatResponse;
import com.fitpass.ia.dto.IngestaResponse;
import com.fitpass.ia.service.AgenteService;
import com.fitpass.ia.service.IngestaService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/ia")
public class AgenteController {

    private final AgenteService agente;
    private final IngestaService ingesta;

    public AgenteController(AgenteService agente, IngestaService ingesta) {
        this.agente = agente;
        this.ingesta = ingesta;
    }

    /** Público: preguntas sobre sedes, planes y políticas. */
    @PostMapping("/chat")
    public ChatResponse chat(@Valid @RequestBody ChatRequest request, HttpServletRequest http) {
        return agente.responder(request.mensaje(), request.sesionId(), http.getRemoteAddr());
    }

    /** Vuelve a cargar los documentos de resources/rag en documentos_rag. */
    @PostMapping("/ingesta")
    @PreAuthorize("hasRole('ADMIN')")
    public IngestaResponse ingerir() {
        return ingesta.ingerirTodo();
    }

    @GetMapping("/documentos")
    @PreAuthorize("hasRole('ADMIN')")
    public List<Map<String, Object>> documentos() {
        return ingesta.listar();
    }
}
