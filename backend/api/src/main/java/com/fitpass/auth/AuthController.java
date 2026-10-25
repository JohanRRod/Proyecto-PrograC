package com.fitpass.auth;

import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    public record InvitarMiembroRequest(
        @NotNull UUID clienteId
    ) {}

    @PostMapping("/miembros/invitar")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public AuthService.InvitacionResponse invitarMiembro(
            @Valid @RequestBody InvitarMiembroRequest request) {

        return authService.invitarMiembro(request.clienteId());
    }
}