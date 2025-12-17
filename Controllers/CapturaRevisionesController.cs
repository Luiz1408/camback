using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ExcelProcessorApi.Data;
using ExcelProcessorApi.Models;
using System.Text.Json;

namespace ExcelProcessorApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CapturaRevisionesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CapturaRevisionesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/CapturaRevisiones
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetRevisiones()
        {
            try
            {
                var revisiones = await _context.Revisiones
                    .Include(r => r.Upload)
                    .OrderByDescending(r => r.CreatedAt)
                    .ToListAsync();

                var result = revisiones.Select(r => {
                    var data = JsonSerializer.Deserialize<Dictionary<string, object>>(r.DataJson ?? "{}");
                    
                    return new {
                        id = r.Id,
                        fechaRegistro = data?.ContainsKey("fechaRegistro") == true ? data["fechaRegistro"].ToString() : r.CreatedAt.ToString("yyyy-MM-dd"),
                        fechaIncidente = data?.ContainsKey("fechaIncidente") == true ? data["fechaIncidente"].ToString() : "",
                        almacen = data?.ContainsKey("almacen") == true ? data["almacen"].ToString() : "",
                        ubicacion = data?.ContainsKey("ubicacion") == true ? data["ubicacion"].ToString() : "",
                        nombreCorreo = data?.ContainsKey("nombreCorreo") == true ? data["nombreCorreo"].ToString() : "",
                        areaSolicita = data?.ContainsKey("areaSolicita") == true ? data["areaSolicita"].ToString() : "",
                        quienRealiza = data?.ContainsKey("quienRealiza") == true ? data["quienRealiza"].ToString() : "",
                        estatus = data?.ContainsKey("estatus") == true ? data["estatus"].ToString() : "pendiente",
                        titulo = data?.ContainsKey("titulo") == true ? data["titulo"].ToString() : $"Revisión {r.Id}",
                        indicador = data?.ContainsKey("indicador") == true ? data["indicador"].ToString() : "",
                        subindicador = data?.ContainsKey("subindicador") == true ? data["subindicador"].ToString() : "",
                        monto = data?.ContainsKey("monto") == true ? data["monto"].ToString() : "",
                        observaciones = data?.ContainsKey("observaciones") == true ? data["observaciones"].ToString() : "",
                        comentarioGeneral = data?.ContainsKey("comentarioGeneral") == true ? data["comentarioGeneral"].ToString() : "",
                        // Campos adicionales para compatibilidad
                        fechaSolicitud = data?.ContainsKey("fechaSolicitud") == true ? data["fechaSolicitud"].ToString() : "",
                        hora = data?.ContainsKey("hora") == true ? data["hora"].ToString() : "",
                        codigo = data?.ContainsKey("codigo") == true ? data["codigo"].ToString() : "",
                        areaCargo = data?.ContainsKey("areaCargo") == true ? data["areaCargo"].ToString() : "",
                        tiempo = data?.ContainsKey("tiempo") == true ? data["tiempo"].ToString() : "",
                        ticket = data?.ContainsKey("ticket") == true ? data["ticket"].ToString() : "",
                        foliosAsignado1 = data?.ContainsKey("foliosAsignado1") == true ? data["foliosAsignado1"].ToString() : "",
                        foliosAsignado2 = data?.ContainsKey("foliosAsignado2") == true ? data["foliosAsignado2"].ToString() : "",
                        acumulado = data?.ContainsKey("acumulado") == true ? data["acumulado"].ToString() : "",
                        personalInvolucrado = data?.ContainsKey("personalInvolucrado") == true ? data["personalInvolucrado"].ToString() : "",
                        puesto = data?.ContainsKey("puesto") == true ? data["puesto"].ToString() : "",
                        no = data?.ContainsKey("no") == true ? data["no"].ToString() : "",
                        nomina = data?.ContainsKey("nomina") == true ? data["nomina"].ToString() : "",
                        lineaEmpresaPlacas = data?.ContainsKey("lineaEmpresaPlacas") == true ? data["lineaEmpresaPlacas"].ToString() : "",
                        ubicacion2 = data?.ContainsKey("ubicacion2") == true ? data["ubicacion2"].ToString() : "",
                        areaEspecifica = data?.ContainsKey("areaEspecifica") == true ? data["areaEspecifica"].ToString() : "",
                        turnoOperativo = data?.ContainsKey("turnoOperativo") == true ? data["turnoOperativo"].ToString() : "",
                        situacion = data?.ContainsKey("situacion") == true ? data["situacion"].ToString() : "",
                        monitorista = data?.ContainsKey("monitorista") == true ? data["monitorista"].ToString() : "",
                        quienEnvia = data?.ContainsKey("quienEnvia") == true ? data["quienEnvia"].ToString() : "",
                        coordinadorTurno = data?.ContainsKey("coordinadorTurno") == true ? data["coordinadorTurno"].ToString() : "",
                        createdAt = r.CreatedAt
                    };
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener revisiones: {ex.Message}");
            }
        }

        // POST: api/CapturaRevisiones
        [HttpPost]
        public async Task<ActionResult<object>> CreateRevision([FromBody] JsonElement revisionData)
        {
            try
            {
                // Primero crear un ExcelUpload si no existe
                var upload = new ExcelUpload
                {
                    FileName = $"Revision_{DateTime.Now:yyyyMMdd_HHmmss}.json",
                    UploadType = "Revision",
                    UploadedAt = DateTime.UtcNow,
                    UploadedByUserId = 1 // ID por defecto
                };
                
                _context.ExcelUploads.Add(upload);
                await _context.SaveChangesAsync();
                
                // Luego crear la revisión con el UploadId
                var revision = new Revision
                {
                    DataJson = JsonSerializer.Serialize(revisionData),
                    CreatedAt = DateTime.UtcNow,
                    UploadId = upload.Id
                };
                
                _context.Revisiones.Add(revision);
                await _context.SaveChangesAsync();
                
                return Ok(new { 
                    message = "Revisión creada exitosamente",
                    id = revision.Id,
                    uploadId = upload.Id,
                    createdAt = revision.CreatedAt
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al crear revisión: {ex.Message}");
            }
        }

        // PUT: api/CapturaRevisiones/5
        [HttpPut("{id}")]
        public async Task<ActionResult<object>> UpdateRevision(int id, [FromBody] JsonElement updateData)
        {
            try
            {
                var revision = await _context.Revisiones.FindAsync(id);
                if (revision == null)
                {
                    return NotFound("Revisión no encontrada");
                }

                // Debug: log datos recibidos
                Console.WriteLine($"Datos recibidos: {updateData.GetRawText()}");
                Console.WriteLine($"Datos existentes: {revision.DataJson}");

                // Obtener datos existentes con manejo robusto
                Dictionary<string, object> existingData = new Dictionary<string, object>();
                if (!string.IsNullOrEmpty(revision.DataJson))
                {
                    try
                    {
                        var options = new JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        };
                        existingData = JsonSerializer.Deserialize<Dictionary<string, object>>(revision.DataJson, options) ?? new Dictionary<string, object>();
                    }
                    catch (JsonException jex)
                    {
                        Console.WriteLine($"Error deserializando JSON existente: {jex.Message}");
                        existingData = new Dictionary<string, object>();
                    }
                }
                
                // Actualizar con los nuevos datos
                var options2 = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };
                var updateDict = JsonSerializer.Deserialize<Dictionary<string, object>>(updateData.GetRawText(), options2) ?? new Dictionary<string, object>();
                
                foreach (var kvp in updateDict)
                {
                    if (kvp.Key != null)
                    {
                        existingData[kvp.Key] = kvp.Value;
                        Console.WriteLine($"Actualizando campo {kvp.Key} con valor {kvp.Value}");
                    }
                }

                // Serializar con opciones para evitar errores
                var serializeOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = true
                };
                
                string newJson = JsonSerializer.Serialize(existingData, serializeOptions);
                Console.WriteLine($"Nuevo JSON: {newJson}");
                
                revision.DataJson = newJson;
                
                await _context.SaveChangesAsync();
                
                return Ok(new { 
                    message = "Revisión actualizada exitosamente",
                    id = revision.Id,
                    updatedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error completo: {ex.Message}");
                Console.WriteLine($"StackTrace: {ex.StackTrace}");
                return StatusCode(500, $"Error al actualizar revisión: {ex.Message}");
            }
        }

        // DELETE: api/CapturaRevisiones/5
        [HttpDelete("{id}")]
        public async Task<ActionResult<object>> DeleteRevision(int id)
        {
            try
            {
                var revision = await _context.Revisiones.FindAsync(id);
                if (revision == null)
                {
                    return NotFound("Revisión no encontrada");
                }

                _context.Revisiones.Remove(revision);
                await _context.SaveChangesAsync();
                
                return Ok(new { 
                    message = "Revisión eliminada exitosamente",
                    id = id
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al eliminar revisión: {ex.Message}");
            }
        }

        // GET: api/CapturaRevisiones/5
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetRevision(int id)
        {
            try
            {
                var revision = await _context.Revisiones.FindAsync(id);
                if (revision == null)
                {
                    return NotFound("Revisión no encontrada");
                }

                var data = JsonSerializer.Deserialize<Dictionary<string, object>>(revision.DataJson ?? "{}");
                
                return Ok(new {
                    id = revision.Id,
                    data = data,
                    createdAt = revision.CreatedAt
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener revisión: {ex.Message}");
            }
        }
    }
}
