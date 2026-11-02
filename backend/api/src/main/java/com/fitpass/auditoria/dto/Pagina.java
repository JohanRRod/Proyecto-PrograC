package com.fitpass.auditoria.dto;

import java.util.List;

public record Pagina<T>(List<T> items, long total, int pagina, int tamano) {}
