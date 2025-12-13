using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ExcelProcessorApi.Data;
using ExcelProcessorApi.Models;
using System.Text.Json;

namespace ExcelProcessorApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FoliosController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public FoliosController(ApplicationDbContext context)
        {
            _context = context;
        }

        // POST: api/folios/crear-folio
        [HttpPost("crear-folio")]
        public async Task<ActionResult<object>> CrearFolio([FromBody] JsonElement folioData)
        {
            try
            {
                // Obtener el tipo de folio desde el JSON
                string tipo = folioData.GetProperty("tipo").GetString() ?? "";
                
                // Obtener el siguiente folio según el tipo
                var siguienteFolio = await GetSiguienteFolioData(tipo);
                
                // Crear el registro correspondiente según el tipo
                if (tipo.ToLower() == "revision")
                {
                    var revision = new Revision
                    {
                        DataJson = JsonSerializer.Serialize(folioData),
                        CreatedAt = DateTime.UtcNow,
                        UploadId = 1 // ID por defecto para el upload
                    };
                    
                    _context.Revisiones.Add(revision);
                    await _context.SaveChangesAsync();
                    
                    var folioResponse = new {
                        folio1 = siguienteFolio.GetType().GetProperty("folio1")?.GetValue(siguienteFolio)?.ToString() ?? "",
                        folio2 = siguienteFolio.GetType().GetProperty("folio2")?.GetValue(siguienteFolio)?.ToString() ?? "",
                        acumulado = siguienteFolio.GetType().GetProperty("acumulado")?.GetValue(siguienteFolio) ?? 0
                    };
                    
                    return Ok(new { 
                        message = "Revisión creada exitosamente",
                        folio = folioResponse
                    });
                }
                else if (tipo.ToLower() == "deteccion")
                {
                    var deteccion = new Deteccion
                    {
                        DataJson = JsonSerializer.Serialize(folioData),
                        CreatedAt = DateTime.UtcNow,
                        UploadId = 1 // ID por defecto para el upload
                    };
                    
                    _context.Detecciones.Add(deteccion);
                    await _context.SaveChangesAsync();
                    
                    var folioResponse = new {
                        folio1 = siguienteFolio.GetType().GetProperty("folio1")?.GetValue(siguienteFolio)?.ToString() ?? "",
                        folio2 = siguienteFolio.GetType().GetProperty("folio2")?.GetValue(siguienteFolio)?.ToString() ?? "",
                        acumulado = siguienteFolio.GetType().GetProperty("acumulado")?.GetValue(siguienteFolio) ?? 0
                    };
                    
                    return Ok(new { 
                        message = "Detección creada exitosamente",
                        folio = folioResponse
                    });
                }
                else
                {
                    return BadRequest("Tipo de folio no válido. Debe ser 'revision' o 'deteccion'.");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al crear folio: {ex.Message}");
            }
        }

        // GET: api/folios/revisiones
        [HttpGet("revisiones")]
        public async Task<ActionResult<IEnumerable<object>>> GetRevisiones()
        {
            try
            {
                var revisiones = await _context.Revisiones
                    .Include(r => r.Upload)
                    .OrderByDescending(r => r.CreatedAt)
                    .ToListAsync();

                var result = revisiones.Select(r => new
                {
                    r.Id,
                    r.CreatedAt,
                    r.UploadId,
                    Upload = r.Upload != null ? new
                    {
                        r.Upload.Id,
                        r.Upload.FileName,
                        r.Upload.UploadedAt,
                        r.Upload.UploadedByUserId
                    } : null,
                    // Parsear el JSON para obtener los campos
                    Data = JsonSerializer.Deserialize<Dictionary<string, object>>(r.DataJson ?? "{}")
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener revisiones: {ex.Message}");
            }
        }

        // GET: api/folios/detecciones
        [HttpGet("detecciones")]
        public async Task<ActionResult<IEnumerable<object>>> GetDetecciones()
        {
            try
            {
                var detecciones = await _context.Detecciones
                    .Include(d => d.Upload)
                    .OrderByDescending(d => d.CreatedAt)
                    .ToListAsync();

                var result = detecciones.Select(d => new
                {
                    d.Id,
                    d.CreatedAt,
                    d.UploadId,
                    Upload = d.Upload != null ? new
                    {
                        d.Upload.Id,
                        d.Upload.FileName,
                        d.Upload.UploadedAt,
                        d.Upload.UploadedByUserId
                    } : null,
                    // Parsear el JSON para obtener los campos
                    Data = JsonSerializer.Deserialize<Dictionary<string, object>>(d.DataJson ?? "{}")
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener detecciones: {ex.Message}");
            }
        }

        // GET: api/folios/siguiente-folio/{tipo}
        [HttpGet("siguiente-folio/{tipo}")]
        public async Task<ActionResult<object>> GetSiguienteFolioEndpoint(string tipo)
        {
            try
            {
                var resultado = await GetSiguienteFolioData(tipo);
                return Ok(resultado);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener siguiente folio: {ex.Message}");
            }
        }

        private async Task<object> GetSiguienteFolioData(string tipo)
        {
            // Aquí implementar la lógica para generar el siguiente folio
            // Por ahora, una implementación simple
            string folioBase = tipo.ToLower() == "revision" ? "REV" : "DET";
            int consecutivo = await GetSiguienteConsecutivo(tipo);
            
            return new
            {
                folio1 = $"{folioBase}-{consecutivo:D4}",
                folio2 = $"{DateTime.Now:yyMM}-{consecutivo:D2}",
                acumulado = consecutivo
            };
        }

        private async Task<int> GetSiguienteConsecutivo(string tipo)
        {
            // Implementar lógica para obtener el siguiente consecutivo
            // Por ahora, un simple contador basado en la fecha actual
            var hoy = DateTime.Today;
            var clave = $"{tipo:hoy:yyyyMMdd}";
            
            // Buscar si ya existe un contador para hoy
            // Por ahora, usar un simple cálculo
            return (hoy.Day * 100) + (hoy.Hour % 100);
        }

        private int? GetCurrentUserId()
        {
            // Obtener el ID del usuario actual desde el contexto
            // Por ahora, retornar null o un valor por defecto
            return 1; // ID del usuario admin por defecto
        }
    }
}
