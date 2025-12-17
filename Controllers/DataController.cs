using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ExcelProcessorApi.Data;
using ExcelProcessorApi.Models;


namespace ExcelProcessorApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = $"{RoleNames.Administrator},{RoleNames.Coordinator},{RoleNames.Monitorista}")]
    public class DataController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DataController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("excel-data")]
        public async Task<IActionResult> GetExcelData(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sheetName = null,
            [FromQuery] string? search = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            try
            {
                var query = _context.ExcelData.AsQueryable();

                // Apply filters
                if (!string.IsNullOrEmpty(sheetName))
                {
                    query = query.Where(x => x.SheetName.Contains(sheetName));
                }

                if (!string.IsNullOrEmpty(search))
                {
                    query = query.Where(x => 
                        x.Columna1!.Contains(search) || 
                        x.Columna2!.Contains(search) ||
                        x.SheetName.Contains(search) ||
                        (x.MesTexto != null && x.MesTexto.Contains(search)) ||
                        (x.Almacen != null && x.Almacen.Contains(search)) ||
                        (x.MonitoristaReporta != null && x.MonitoristaReporta.Contains(search)) ||
                        (x.CoordinadorTurno != null && x.CoordinadorTurno.Contains(search)));
                }

                if (fromDate.HasValue)
                {
                    query = query.Where(x => x.Mes >= fromDate.Value);
                }

                if (toDate.HasValue)
                {
                    query = query.Where(x => x.Mes <= toDate.Value);
                }

                var totalRecords = await query.CountAsync();
                
                // Check if user is administrator to show uploaded by information
                var isAdmin = User.IsInRole(RoleNames.Administrator);
                
                var data = await query
                    .Include(x => x.UploadedByUser) // Include user information
                    .OrderByDescending(x => x.FechaCreacion)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(x => new
                    {
                        x.Id,
                        x.SheetName,
                        x.Columna1,
                        x.Columna2,
                        x.Columna3,
                        x.Mes,
                        x.MesTexto,
                        x.Almacen,
                        x.MonitoristaReporta,
                        x.CoordinadorTurno,
                        x.FechaCreacion,
                        // Only show uploaded by info for administrators
                        UploadedBy = isAdmin ? new
                        {
                            x.UploadedByUser.Id,
                            x.UploadedByUser.Username,
                            FullName = x.UploadedByUser.FirstName + " " + x.UploadedByUser.LastName
                        } : null
                    })
                    .ToListAsync();

                return Ok(new
                {
                    data,
                    totalRecords,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling((double)totalRecords / pageSize),
                    filters = new
                    {
                        sheetName,
                        search,
                        fromDate,
                        toDate
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al obtener datos: {ex.Message}" });
            }
        }

        [HttpGet("excel-data/{id}")]
        public async Task<IActionResult> GetExcelDataById(int id)
        {
            try
            {
                var data = await _context.ExcelData.FindAsync(id);
                if (data == null)
                {
                    return NotFound(new { message = "Registro no encontrado" });
                }

                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al obtener registro: {ex.Message}" });
            }
        }

        [HttpGet("sheets")]
        public async Task<IActionResult> GetSheets()
        {
            try
            {
                var sheets = await _context.ExcelData
                    .Select(x => x.SheetName)
                    .Distinct()
                    .OrderBy(x => x)
                    .ToListAsync();

                return Ok(sheets);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al obtener hojas: {ex.Message}" });
            }
        }

        [HttpGet("date-range")]
        public async Task<IActionResult> GetDateRange()
        {
            try
            {
                var hasData = await _context.ExcelData.AnyAsync();
                if (!hasData)
                {
                    return Ok(new { minDate = (DateTime?)null, maxDate = (DateTime?)null });
                }

                var minDate = await _context.ExcelData.MinAsync(x => x.Mes);
                var maxDate = await _context.ExcelData.MaxAsync(x => x.Mes);

                return Ok(new { minDate, maxDate });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al obtener rango de fechas: {ex.Message}" });
            }
        }

        [HttpDelete("excel-data/{id}")]
        [Authorize(Roles = RoleNames.Administrator)]
        public async Task<IActionResult> DeleteExcelData(int id)
        {
            try
            {
                var data = await _context.ExcelData.FindAsync(id);
                if (data == null)
                {
                    return NotFound(new { message = "Registro no encontrado" });
                }

                _context.ExcelData.Remove(data);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Registro eliminado exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al eliminar registro: {ex.Message}" });
            }
        }

        [HttpDelete("excel-data/bulk")]
        [Authorize(Roles = RoleNames.Administrator)]
        public async Task<IActionResult> DeleteExcelDataBulk([FromBody] int[] ids)
        {
            try
            {
                var data = await _context.ExcelData
                    .Where(x => ids.Contains(x.Id))
                    .ToListAsync();

                if (!data.Any())
                {
                    return NotFound(new { message = "No se encontraron registros para eliminar" });
                }

                _context.ExcelData.RemoveRange(data);
                await _context.SaveChangesAsync();

                return Ok(new { message = $"{data.Count} registros eliminados exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al eliminar registros: {ex.Message}" });
            }
        }

        [HttpDelete("excel-data/by-sheet/{sheetName}")]
        [Authorize(Roles = RoleNames.Administrator)]
        public async Task<IActionResult> DeleteBySheet(string sheetName)
        {
            try
            {
                var data = await _context.ExcelData
                    .Where(x => x.SheetName == sheetName)
                    .ToListAsync();

                if (!data.Any())
                {
                    return NotFound(new { message = "No se encontraron registros para la hoja especificada" });
                }

                _context.ExcelData.RemoveRange(data);
                await _context.SaveChangesAsync();

                return Ok(new { message = $"{data.Count} registros de la hoja '{sheetName}' eliminados exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al eliminar registros de la hoja: {ex.Message}" });
            }
        }
    }
}
