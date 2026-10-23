package com.fitpass.catalog;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/catalogo") public class CatalogController {
 private final NamedParameterJdbcTemplate db;
 public CatalogController(NamedParameterJdbcTemplate db){this.db=db;}
 @GetMapping("/paises") public List<Map<String,Object>> paises(){return db.queryForList("SELECT * FROM paises WHERE activo=true ORDER BY nombre",Map.of());}
 @GetMapping("/planes") public List<Map<String,Object>> planes(){return db.queryForList("SELECT * FROM planes WHERE activo=true ORDER BY precio_mensual",Map.of());}
 @GetMapping("/amenidades") public List<Map<String,Object>> amenidades(){return db.queryForList("SELECT * FROM amenidades ORDER BY nombre",Map.of());}
 @GetMapping("/sucursales") public List<Map<String,Object>> sucursales(){return db.queryForList("SELECT s.*,p.nombre AS pais FROM sucursales s JOIN paises p ON p.id=s.pais_id WHERE s.activa=true ORDER BY s.nombre",Map.of());}
 @GetMapping("/sucursales/{id}/amenidades") public List<Map<String,Object>> amenidadesSucursal(@PathVariable int id){return db.queryForList("SELECT a.*,sa.disponible,sa.capacidad_zona,sa.horario_especial FROM sucursal_amenidades sa JOIN amenidades a ON a.id=sa.amenidad_id WHERE sa.sucursal_id=:id",Map.of("id",id));}
}
