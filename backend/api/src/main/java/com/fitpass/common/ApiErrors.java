package com.fitpass.common;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestControllerAdvice public class ApiErrors { @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class) ResponseEntity<Map<String,String>> status(org.springframework.web.server.ResponseStatusException ex){return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error",String.valueOf(ex.getReason())));} }
