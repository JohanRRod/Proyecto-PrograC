package com.fitpass.access;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/accesos") public class AccessController {
 private final NamedParameterJdbcTemplate db;
 public AccessController(NamedParameterJdbcTemplate db){this.db=db;}
 public record Checkin(@NotNull UUID clienteId,@NotNull Integer sucursalId,Integer amenidadId){}
 public record Resultado(boolean permitido,String tipo,String motivo){}
 @PostMapping("/checkin") @Transactional public Resultado checkin(@Valid @RequestBody Checkin q){
 var cliente=db.queryForList("SELECT c.estado,c.sucursal_base_id,s.pais_id FROM clientes c JOIN sucursales s ON s.id=c.sucursal_base_id WHERE c.id=:id",Map.of("id",q.clienteId()));
 if(cliente.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Cliente inexistente");
 var sede=db.queryForList("SELECT pais_id,activa,es_sede_vip FROM sucursales WHERE id=:id",Map.of("id",q.sucursalId()));
 if(sede.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Sucursal inexistente");
 var c=cliente.get(0);var s=sede.get(0); String motivo=null,tipo="SEDE_BASE";
 var membresias=db.queryForList("SELECT m.id,m.estado,p.permite_acceso_nacional,p.permite_acceso_internacional,p.permite_amenidades_vip FROM membresias m JOIN planes p ON p.id=m.plan_id WHERE m.cliente_id=:id AND m.estado='ACTIVA' AND m.fecha_inicio<=CURRENT_DATE ORDER BY m.fecha_inicio DESC LIMIT 1",Map.of("id",q.clienteId()));
 if(!"ACTIVO".equals(c.get("estado")))motivo="CLIENTE_NO_ACTIVO";
 else if(!Boolean.TRUE.equals(s.get("activa")))motivo="SUCURSAL_INACTIVA";
 else if(membresias.isEmpty())motivo="SIN_MEMBRESIA_ACTIVA";
 else {var m=membresias.get(0);boolean base=Objects.equals(c.get("sucursal_base_id"),q.sucursalId());boolean nacional=Objects.equals(c.get("pais_id"),s.get("pais_id"));
 if(!base){tipo=nacional?"NACIONAL":"INTERNACIONAL";if(nacional&&!Boolean.TRUE.equals(m.get("permite_acceso_nacional")))motivo="PLAN_SIN_ACCESO_NACIONAL";if(!nacional&&!Boolean.TRUE.equals(m.get("permite_acceso_internacional")))motivo="PLAN_SIN_ACCESO_INTERNACIONAL";}
 if(motivo==null&&Boolean.TRUE.equals(s.get("es_sede_vip"))&&!Boolean.TRUE.equals(m.get("permite_amenidades_vip")))motivo="SEDE_VIP_NO_PERMITIDA";
 if(motivo==null&&q.amenidadId()!=null){var a=db.queryForList("SELECT a.requiere_plan_vip FROM sucursal_amenidades sa JOIN amenidades a ON a.id=sa.amenidad_id WHERE sa.sucursal_id=:s AND sa.amenidad_id=:a AND sa.disponible=true",Map.of("s",q.sucursalId(),"a",q.amenidadId()));if(a.isEmpty())motivo="AMENIDAD_NO_DISPONIBLE";else if(Boolean.TRUE.equals(a.get(0).get("requiere_plan_vip"))&&!Boolean.TRUE.equals(m.get("permite_amenidades_vip")))motivo="AMENIDAD_VIP_NO_PERMITIDA";else tipo="ZONA_EXCLUSIVA_VIP";}
 }
 var args=new HashMap<String,Object>();args.put("c",q.clienteId());args.put("s",q.sucursalId());args.put("a",q.amenidadId());args.put("t",tipo);args.put("ok",motivo==null);args.put("motivo",motivo);
 db.update("INSERT INTO registros_acceso(cliente_id,sucursal_id,amenidad_id,tipo_acceso,acceso_permitido,motivo_rechazo) VALUES (:c,:s,:a,:t,:ok,:motivo)",args);
 return new Resultado(motivo==null,tipo,motivo);
 }
}
