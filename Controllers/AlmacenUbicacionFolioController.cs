using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ExcelProcessorApi.Data;
using ExcelProcessorApi.Models;

namespace ExcelProcessorApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AlmacenUbicacionFolioController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AlmacenUbicacionFolioController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/AlmacenUbicacionFolio
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAlmacenesUbicacionesFolios()
        {
            try
            {
                var items = await _context.AlmacenUbicacionFolios
                    .Where(a => a.Activo)
                    .OrderBy(a => a.Almacen)
                    .ThenBy(a => a.Ubicacion)
                    .Select(a => new
                    {
                        a.Id,
                        a.Almacen,
                        a.FolioAsignado1,
                        a.Ubicacion,
                        a.Activo,
                        a.FechaCreacion,
                        a.FechaActualizacion,
                        a.CreadoPor,
                        a.ActualizadoPor
                    })
                    .ToListAsync();
                
                return Ok(items);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener almacenes-ubicación-folios: {ex.Message}");
            }
        }

        // GET: api/AlmacenUbicacionFolio/5
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetAlmacenUbicacionFolio(int id)
        {
            try
            {
                var item = await _context.AlmacenUbicacionFolios
                    .Where(a => a.Id == id && a.Activo)
                    .Select(a => new
                    {
                        a.Id,
                        a.Almacen,
                        a.FolioAsignado1,
                        a.Ubicacion,
                        a.Activo,
                        a.FechaCreacion,
                        a.FechaActualizacion,
                        a.CreadoPor,
                        a.ActualizadoPor
                    })
                    .FirstOrDefaultAsync();

                if (item == null)
                {
                    return NotFound("Registro no encontrado");
                }

                return Ok(item);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener almacén-ubicación-folio: {ex.Message}");
            }
        }

        // POST: api/AlmacenUbicacionFolio
        [HttpPost]
        public async Task<ActionResult<AlmacenUbicacionFolio>> CreateAlmacenUbicacionFolio(AlmacenUbicacionFolio item)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Verificar si ya existe una combinación duplicada
                var exists = await _context.AlmacenUbicacionFolios
                    .AnyAsync(a => a.Almacen.ToUpper() == item.Almacen.ToUpper() 
                                  && a.Ubicacion.ToUpper() == item.Ubicacion.ToUpper() 
                                  && a.FolioAsignado1.ToUpper() == item.FolioAsignado1.ToUpper()
                                  && a.Activo);
                
                if (exists)
                {
                    return BadRequest($"Ya existe un registro con este almacén, ubicación y folio");
                }

                item.FechaCreacion = DateTime.UtcNow;
                item.Activo = true;
                item.CreadoPor = item.CreadoPor ?? "System";
                
                _context.AlmacenUbicacionFolios.Add(item);
                await _context.SaveChangesAsync();
                
                return CreatedAtAction(nameof(GetAlmacenUbicacionFolio), 
                    new { id = item.Id }, item);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al crear almacén-ubicación-folio: {ex.Message}");
            }
        }

        // PUT: api/AlmacenUbicacionFolio/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAlmacenUbicacionFolio(int id, AlmacenUbicacionFolio item)
        {
            try
            {
                if (id != item.Id)
                {
                    return BadRequest("El ID no coincide");
                }

                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var existing = await _context.AlmacenUbicacionFolios.FindAsync(id);
                if (existing == null)
                {
                    return NotFound("Registro no encontrado");
                }

                // Verificar si ya existe una combinación duplicada (excluyendo el actual)
                var exists = await _context.AlmacenUbicacionFolios
                    .AnyAsync(a => a.Id != id 
                                  && a.Almacen.ToUpper() == item.Almacen.ToUpper() 
                                  && a.Ubicacion.ToUpper() == item.Ubicacion.ToUpper()
                                  && a.FolioAsignado1.ToUpper() == item.FolioAsignado1.ToUpper()
                                  && a.Activo);
                
                if (exists)
                {
                    return BadRequest($"Ya existe otro registro con este almacén, ubicación y folio");
                }

                existing.Almacen = item.Almacen;
                existing.FolioAsignado1 = item.FolioAsignado1;
                existing.Ubicacion = item.Ubicacion;
                existing.FechaActualizacion = DateTime.UtcNow;
                existing.ActualizadoPor = item.ActualizadoPor ?? "System";
                
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al actualizar almacén-ubicación-folio: {ex.Message}");
            }
        }

        // DELETE: api/AlmacenUbicacionFolio/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAlmacenUbicacionFolio(int id)
        {
            try
            {
                var item = await _context.AlmacenUbicacionFolios.FindAsync(id);
                if (item == null)
                {
                    return NotFound("Registro no encontrado");
                }

                item.Activo = false;
                item.FechaActualizacion = DateTime.UtcNow;
                item.ActualizadoPor = "System";
                
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al eliminar almacén-ubicación-folio: {ex.Message}");
            }
        }
    }
}
