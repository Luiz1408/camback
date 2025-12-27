using System.Security.Claims;
using ExcelProcessorApi.Data;
using ExcelProcessorApi.Models;
using ExcelProcessorApi.Models.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ExcelProcessorApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // AUTORIZACIÓN DESHABILITADA TEMPORALMENTE: reactivar cuando el frontend emita roles válidos
    // [Authorize(Roles = $"{RoleNames.Administrator},{RoleNames.Coordinator}")]
    public class ShiftHandOffController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ShiftHandOffController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetNotes()
        {
            try
            {
                var notes = await _context.ShiftHandOffNotes
                    .Include(n => n.CreatedByUser)
                    .Include(n => n.FinalizedByUser)
                    .Include(n => n.Acknowledgements)
                        .ThenInclude(a => a.CoordinatorUser)
                    .OrderByDescending(n => n.CreatedAt)
                    .ToListAsync();

                return Ok(new { notes = notes.Select(MapNoteToResponse) });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en GetNotes: {ex.Message}");
                return Ok(new { notes = Array.Empty<object>() });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateNote([FromBody] UpsertShiftHandOffNoteDto dto)
        {
            try
            {
                var currentUser = await GetCurrentUserAsync();
                if (currentUser == null)
                {
                    // Temporal: permitir creación sin autenticación para pruebas
                    currentUser = new User { Id = 1, Username = "test" };
                }

                var note = new ShiftHandOffNote
                {
                    Title = dto?.Title?.Trim() ?? "Entrega de turno",
                    Description = dto?.Description?.Trim() ?? "",
                    Status = string.IsNullOrWhiteSpace(dto?.Status) ? "Pendiente" : dto.Status.Trim(),
                    Type = string.IsNullOrWhiteSpace(dto?.Type) ? "informativo" : dto.Type.Trim(),
                    Priority = string.IsNullOrWhiteSpace(dto?.Priority) ? "Media" : dto.Priority.Trim(),
                    AssignedCoordinatorId = dto?.AssignedCoordinatorId,
                    CreatedByUserId = currentUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    Acknowledgements = new List<ShiftHandOffAcknowledgement>()
                };

                _context.ShiftHandOffNotes.Add(note);
                await _context.SaveChangesAsync();

                var createdNote = await _context.ShiftHandOffNotes
                    .Include(n => n.CreatedByUser)
                    .Include(n => n.FinalizedByUser)
                    .Include(n => n.Acknowledgements)
                        .ThenInclude(a => a.CoordinatorUser)
                    .FirstAsync(n => n.Id == note.Id);

                return Ok(new { note = MapNoteToResponse(createdNote) });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error en CreateNote: {ex.Message}");
                return StatusCode(500, new { message = "Error al crear nota" });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateNote(int id, [FromBody] UpdateShiftHandOffNoteDto dto)
        {
            var note = await _context.ShiftHandOffNotes.FirstOrDefaultAsync(n => n.Id == id);
            if (note == null)
            {
                return NotFound(new { message = "Nota no encontrada" });
            }

            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null)
            {
                return Unauthorized(new { message = "Usuario no autenticado" });
            }

            var isAdmin = string.Equals(currentUser.Role?.Name, RoleNames.Administrator, StringComparison.OrdinalIgnoreCase);

            if (!string.IsNullOrWhiteSpace(dto.Description))
            {
                if (!isAdmin)
                {
                    return Forbid();
                }
                note.Description = dto.Description.Trim();
            }

            if (!string.IsNullOrWhiteSpace(dto.Type))
            {
                note.Type = string.IsNullOrWhiteSpace(dto.Type) ? "informativo" : dto.Type.Trim();
            }

            if (dto.Priority != null)
            {
                note.Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Media" : dto.Priority.Trim();
            }

            if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                var trimmedStatus = dto.Status.Trim();
                note.Status = trimmedStatus;

                if (dto.FinalizedAt != null && dto.FinalizedByUserId.HasValue)
                {
                    if (DateTime.TryParse(dto.FinalizedAt, out DateTime parsedDate))
                    {
                        note.FinalizedAt = parsedDate;
                    }
                    else
                    {
                        note.FinalizedAt = DateTime.UtcNow;
                    }
                    note.FinalizedByUserId = dto.FinalizedByUserId.Value;
                }
                else if (trimmedStatus == "Completado" || trimmedStatus == "Cancelado")
                {
                    note.FinalizedByUserId = currentUser.Id;
                    note.FinalizedAt = DateTime.UtcNow;
                }
                else
                {
                    note.FinalizedByUserId = null;
                    note.FinalizedAt = null;
                }
            }

            if (dto.AssignedCoordinatorId.HasValue)
            {
                if (!isAdmin)
                {
                    return Forbid();
                }

                var coordinatorExists = await _context.Users.AnyAsync(u => u.Id == dto.AssignedCoordinatorId.Value && u.IsActive);
                if (!coordinatorExists)
                {
                    return BadRequest(new { message = "Coordinador inválido" });
                }

                note.AssignedCoordinatorId = dto.AssignedCoordinatorId;
            }

            note.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var updatedNote = await _context.ShiftHandOffNotes
                .Include(n => n.CreatedByUser)
                .Include(n => n.FinalizedByUser)
                .Include(n => n.Acknowledgements)
                    .ThenInclude(a => a.CoordinatorUser)
                .AsNoTracking()
                .FirstAsync(n => n.Id == note.Id);

            return Ok(new { note = MapNoteToResponse(updatedNote) });
        }

        [HttpPut("{id}/acknowledgements")]
        public async Task<IActionResult> ToggleAcknowledgement(int id, [FromBody] ShiftHandOffAcknowledgementToggleDto dto)
        {
            var note = await _context.ShiftHandOffNotes
                .Include(n => n.Acknowledgements)
                .FirstOrDefaultAsync(n => n.Id == id);

            if (note == null)
            {
                return NotFound(new { message = "Nota no encontrada" });
            }

            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null)
            {
                return Unauthorized(new { message = "Usuario no autenticado" });
            }

            var targetCoordinatorId = currentUser.Role?.Name == RoleNames.Administrator
                ? dto.CoordinatorUserId ?? currentUser.Id
                : currentUser.Id;

            if (currentUser.Role?.Name != RoleNames.Administrator)
            {
                var isCoordinator = await _context.Users.AnyAsync(u => u.Id == currentUser.Id && u.Role.Name == RoleNames.Coordinator);
                if (!isCoordinator)
                {
                    return Forbid();
                }
            }

            var acknowledgement = note.Acknowledgements.FirstOrDefault(a => a.CoordinatorUserId == targetCoordinatorId);
            if (acknowledgement == null)
            {
                acknowledgement = new ShiftHandOffAcknowledgement
                {
                    NoteId = note.Id,
                    CoordinatorUserId = targetCoordinatorId
                };

                note.Acknowledgements.Add(acknowledgement);
            }

            acknowledgement.IsAcknowledged = dto.IsAcknowledged;
            acknowledgement.AcknowledgedAt = dto.IsAcknowledged ? DateTime.UtcNow : null;
            acknowledgement.UpdatedByUserId = currentUser.Id;
            note.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var savedAcknowledgement = await _context.ShiftHandOffAcknowledgements
                .Include(a => a.CoordinatorUser)
                .AsNoTracking()
                .FirstAsync(a => a.Id == acknowledgement.Id);

            var response = new
            {
                acknowledgement = new
                {
                    savedAcknowledgement.NoteId,
                    savedAcknowledgement.CoordinatorUserId,
                    CoordinatorName = savedAcknowledgement.CoordinatorUser != null
                        ? ($"{savedAcknowledgement.CoordinatorUser.FirstName} {savedAcknowledgement.CoordinatorUser.LastName}").Trim()
                        : string.Empty,
                    CoordinatorUsername = savedAcknowledgement.CoordinatorUser?.Username ?? string.Empty,
                    savedAcknowledgement.IsAcknowledged,
                    AcknowledgedAt = EnsureUtc(savedAcknowledgement.AcknowledgedAt)
                }
            };

            return Ok(response);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNote(int id)
        {
            var note = await _context.ShiftHandOffNotes
                .Include(n => n.Acknowledgements)
                .FirstOrDefaultAsync(n => n.Id == id);

            if (note == null)
            {
                return NotFound(new { message = "Nota no encontrada" });
            }

            _context.ShiftHandOffNotes.Remove(note);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Nota eliminada" });
        }

        private async Task<User?> GetCurrentUserAsync()
        {
            var usernameClaim = User.FindFirst(ClaimTypes.Name)?.Value;
            if (string.IsNullOrWhiteSpace(usernameClaim))
            {
                return null;
            }

            return await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Username == usernameClaim && u.IsActive);
        }

        private static object MapNoteToResponse(ShiftHandOffNote note)
        {
            return new
            {
                Id = note.Id,
                Title = note.Title,
                Description = note.Description,
                Status = note.Status,
                Type = note.Type,
                Priority = note.Priority,
                AssignedCoordinatorId = note.AssignedCoordinatorId,
                CreatedAt = EnsureUtc(note.CreatedAt),
                UpdatedAt = EnsureUtc(note.UpdatedAt),
                FinalizedAt = EnsureUtc(note.FinalizedAt),
                FinalizedByUserId = note.FinalizedByUserId,
                FinalizedBy = note.FinalizedByUser != null
                    ? new
                    {
                        Id = note.FinalizedByUser.Id,
                        FullName = ($"{note.FinalizedByUser.FirstName} {note.FinalizedByUser.LastName}").Trim(),
                        Username = note.FinalizedByUser.Username
                    }
                    : null,
                CreatedBy = note.CreatedByUser != null
                    ? new
                    {
                        note.CreatedByUser.Id,
                        FullName = ($"{note.CreatedByUser.FirstName} {note.CreatedByUser.LastName}").Trim(),
                        note.CreatedByUser.Username
                    }
                    : null,
                acknowledgements = note.Acknowledgements.Select(a => new
                {
                    a.CoordinatorUserId,
                    CoordinatorName = a.CoordinatorUser != null
                        ? ($"{a.CoordinatorUser.FirstName} {a.CoordinatorUser.LastName}").Trim()
                        : string.Empty,
                    CoordinatorUsername = a.CoordinatorUser?.Username ?? string.Empty,
                    a.IsAcknowledged,
                    AcknowledgedAt = EnsureUtc(a.AcknowledgedAt)
                })
            };
        }

        private static DateTime EnsureUtc(DateTime value)
        {
            return DateTime.SpecifyKind(value, DateTimeKind.Utc);
        }

        private static DateTime? EnsureUtc(DateTime? value)
        {
            if (!value.HasValue)
            {
                return null;
            }

            return DateTime.SpecifyKind(value.Value, DateTimeKind.Utc);
        }
    }
}
