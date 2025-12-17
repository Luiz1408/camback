using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ExcelProcessorApi.Data;
using ExcelProcessorApi.Models;
using System.Security.Claims;

namespace ExcelProcessorApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DashboardController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("metrics")]
        public async Task<IActionResult> GetMetrics()
        {
            try
            {
                // Contar revisiones procesadas (archivos Excel subidos)
                var revisionesProcesadas = await _context.ExcelUploads
                    .CountAsync();

                // Contar monitoristas activos (usuarios con rol Monitorista)
                var monitoristasActivos = await _context.Users
                    .Include(u => u.Role)
                    .Where(u => u.IsActive && u.Role != null && u.Role.Name == "Monitorista")
                    .CountAsync();

                // Calcular tiempo promedio de revisión (simulado por ahora)
                var tiempoPromedio = revisionesProcesadas > 0 ? "4 min" : "0 min";

                return Ok(new
                {
                    revisionesProcesadas,
                    monitoristasActivos,
                    tiempoPromedio
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error obteniendo métricas", error = ex.Message });
            }
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetDailySummary()
        {
            try
            {
                var today = DateTime.UtcNow.Date;
                var tomorrow = today.AddDays(1);

                // Revisiones hoy (archivos subidos hoy)
                var revisionesHoy = await _context.ExcelUploads
                    .Where(u => u.UploadedAt >= today && u.UploadedAt < tomorrow)
                    .CountAsync();

                // Entregas de turno pendientes (no finalizadas)
                var entregasPendientes = await _context.ShiftHandOffNotes
                    .Where(s => !s.IsAcknowledged && !s.IsFinalized)
                    .CountAsync();

                // Detecciones críticas (simulado - podrías ajustar esto según tu lógica)
                var deteccionesCriticas = await _context.ExcelData
                    .Where(e => e.IncidenceMetadata != null && 
                           e.IncidenceMetadata.Contains("crítico", StringComparison.OrdinalIgnoreCase))
                    .CountAsync();

                return Ok(new
                {
                    revisionesHoy,
                    entregasPendientes,
                    deteccionesCriticas
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error obteniendo resumen diario", error = ex.Message });
            }
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetGeneralStats()
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUser = await _context.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.Id.ToString() == userId);

                if (currentUser == null)
                    return Unauthorized();

                // Estadísticas generales según el rol del usuario
                var stats = new
                {
                    totalUsuarios = await _context.Users.CountAsync(),
                    totalArchivos = await _context.ExcelUploads.CountAsync(),
                    totalRevisiones = await _context.Revisiones.CountAsync(),
                    totalDetecciones = await _context.Detecciones.CountAsync(),
                    totalActividadesTecnicas = await _context.TechnicalActivities.CountAsync(),
                    rolUsuario = currentUser.Role?.Name ?? "Sin rol"
                };

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error obteniendo estadísticas", error = ex.Message });
            }
        }
    }
}
