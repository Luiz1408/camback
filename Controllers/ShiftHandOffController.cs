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
    [Authorize(Roles = $"{RoleNames.Administrator},{RoleNames.Coordinator}")]
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
            Console.WriteLine($"=== DEBUG BACKEND GET NOTES ===");
            
            var notes = await _context.ShiftHandOffNotes
                .Include(n => n.CreatedByUser)
                .Include(n => n.FinalizedByUser)
                .Include(n => n.Acknowledgements)
                    .ThenInclude(a => a.CoordinatorUser)
                .AsNoTracking()
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();

            Console.WriteLine($"📋 Total notas encontradas: {notes.Count}");
            
            foreach (var note in notes)
            {
                Console.WriteLine($"📝 Nota {note.Id}:");
                Console.WriteLine($"  - Status: {note.Status}");
                Console.WriteLine($"  - Type: {note.Type}");
                Console.WriteLine($"  - FinalizedAt: {note.FinalizedAt}");
                Console.WriteLine($"  - FinalizedByUserId: {note.FinalizedByUserId}");
                Console.WriteLine($"  - FinalizedByUser: {note.FinalizedByUser?.FirstName} {note.FinalizedByUser?.LastName}");
                Console.WriteLine($"  - Acknowledgements count: {note.Acknowledgements.Count}");
                
                foreach (var ack in note.Acknowledgements)
                {
                    Console.WriteLine($"    🔄 CoordinatorUserId={ack.CoordinatorUserId}, IsAcknowledged={ack.IsAcknowledged}, AcknowledgedAt={ack.AcknowledgedAt}");
                }
            }

            var response = notes.Select(MapNoteToResponse);
            
            Console.WriteLine($"📤 Enviando {response.Count()} notas al frontend");
            Console.WriteLine($"=== FIN DEBUG BACKEND GET NOTES ===");

            return Ok(new { notes = response });
        }

        [HttpPost]
        public async Task<IActionResult> CreateNote([FromBody] UpsertShiftHandOffNoteDto dto)
        {
            if (dto == null)
            {
                return BadRequest(new { message = "Datos inválidos" });
            }

            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null)
            {
                return Unauthorized(new { message = "Usuario no autenticado" });
            }

            var note = new ShiftHandOffNote
            {
                Title = dto.Title?.Trim() ?? string.Empty,
                Description = dto.Description?.Trim() ?? string.Empty,
                Status = string.IsNullOrWhiteSpace(dto.Status) ? "Pendiente" : dto.Status.Trim(),
                Type = string.IsNullOrWhiteSpace(dto.Type) ? "informativo" : dto.Type.Trim(),
                Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Media" : dto.Priority.Trim(),
                AssignedCoordinatorId = dto.AssignedCoordinatorId,
                CreatedByUserId = currentUser.Id,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            if (dto.Acknowledgements?.Count > 0)
            {
                foreach (var acknowledgementDto in dto.Acknowledgements)
                {
                    var coordinator = await _context.Users
                        .FirstOrDefaultAsync(u => u.Id == acknowledgementDto.CoordinatorUserId && u.IsActive);

                    if (coordinator == null)
                    {
                        continue;
                    }

                    note.Acknowledgements.Add(new ShiftHandOffAcknowledgement
                    {
                        CoordinatorUserId = acknowledgementDto.CoordinatorUserId,
                        IsAcknowledged = acknowledgementDto.IsAcknowledged,
                        AcknowledgedAt = acknowledgementDto.IsAcknowledged ? DateTime.UtcNow : null,
                        UpdatedByUserId = currentUser.Id
                    });
                }
            }

            _context.ShiftHandOffNotes.Add(note);
            await _context.SaveChangesAsync();

            var createdNote = await _context.ShiftHandOffNotes
                .Include(n => n.CreatedByUser)
                .Include(n => n.FinalizedByUser)  // ← ESTA LÍNEA FALTABA
                .Include(n => n.Acknowledgements)
                    .ThenInclude(a => a.CoordinatorUser)
                .AsNoTracking()
                .FirstAsync(n => n.Id == note.Id);

            return Ok(new
            {
                note = MapNoteToResponse(createdNote)
            });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Coordinator)]
        public async Task<IActionResult> UpdateNote(int id, [FromBody] UpdateShiftHandOffNoteDto dto)
        {
            Console.WriteLine($"=== DEBUG BACKEND UPDATE NOTE ===");
            Console.WriteLine($"📝 Nota ID: {id}");
            Console.WriteLine($"📊 DTO recibido: {System.Text.Json.JsonSerializer.Serialize(dto)}");
            Console.WriteLine($"🎯 Priority del DTO: '{dto.Priority}'");
            
            var note = await _context.ShiftHandOffNotes.FirstOrDefaultAsync(n => n.Id == id);
            if (note == null)
            {
                return NotFound(new { message = "Nota no encontrada" });
            }

            Console.WriteLine($"🔍 Nota encontrada - Priority actual: '{note.Priority}'");

            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null)
            {
                return Unauthorized(new { message = "Usuario no autenticado" });
            }

            Console.WriteLine($"👤 Usuario actual: {currentUser.Username} (ID: {currentUser.Id})");

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

            if (dto.Priority != null) // Cambiado a != null en lugar de !IsNullOrWhiteSpace
            {
                Console.WriteLine($"🔄 Actualizando Priority de '{note.Priority}' a '{dto.Priority.Trim()}'");
                note.Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Media" : dto.Priority.Trim();
                Console.WriteLine($"✅ Priority actualizado a: '{note.Priority}'");
            }
            else
            {
                Console.WriteLine($"⚠️ Priority es null, no se actualiza");
            }

            if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                var trimmedStatus = dto.Status.Trim();
                note.Status = trimmedStatus;

                Console.WriteLine($"🔄 Cambiando status a: {trimmedStatus}");
                Console.WriteLine($"📅 FinalizedAt del DTO: {dto.FinalizedAt}");
                Console.WriteLine($"🆔 FinalizedByUserId del DTO: {dto.FinalizedByUserId}");

                // Si el frontend envía datos de finalización, usarlos
                if (dto.FinalizedAt != null && dto.FinalizedByUserId.HasValue)
                {
                    Console.WriteLine("✅ Usando datos de finalización del DTO");
                    Console.WriteLine($"📅 Fecha recibida: {dto.FinalizedAt}");
                    Console.WriteLine($"🆔 ID recibido: {dto.FinalizedByUserId}");
                    
                    // Parse seguro de la fecha
                    if (DateTime.TryParse(dto.FinalizedAt, out DateTime parsedDate))
                    {
                        note.FinalizedAt = parsedDate;
                        Console.WriteLine($"✅ Fecha parseada: {parsedDate}");
                    }
                    else
                    {
                        Console.WriteLine($"❌ Error al parsear fecha: {dto.FinalizedAt}");
                        note.FinalizedAt = DateTime.UtcNow;
                    }
                    
                    note.FinalizedByUserId = dto.FinalizedByUserId.Value;
                    Console.WriteLine($"✅ ID asignado: {note.FinalizedByUserId}");
                }
                // Si es un estatus finalizado pero no hay datos, usar el usuario actual
                else if (trimmedStatus == "Completado" || trimmedStatus == "Cancelado")
                {
                    Console.WriteLine("⚠️ Estatus finalizado pero sin datos del DTO, usando usuario actual");
                    note.FinalizedByUserId = currentUser.Id;
                    note.FinalizedAt = DateTime.UtcNow;
                    Console.WriteLine($"💾 Asignado: FinalizedAt={note.FinalizedAt}, FinalizedByUserId={note.FinalizedByUserId}");
                }
                // Si no es estatus finalizado, limpiar
                else
                {
                    Console.WriteLine("🧹 Limpiando datos de finalización");
                    note.FinalizedByUserId = null;
                    note.FinalizedAt = null;
                }

                Console.WriteLine($"💾 Datos finales antes de guardar: FinalizedAt={note.FinalizedAt}, FinalizedByUserId={note.FinalizedByUserId}");
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
            Console.WriteLine($"✅ Cambios guardados en BD");
            
            // Verificación post-guardado
            var savedNote = await _context.ShiftHandOffNotes
                .AsNoTracking()
                .FirstOrDefaultAsync(n => n.Id == note.Id);
            
            Console.WriteLine($"🔍 Verificación post-guardado:");
            Console.WriteLine($"  - FinalizedAt en BD: {savedNote?.FinalizedAt}");
            Console.WriteLine($"  - FinalizedByUserId en BD: {savedNote?.FinalizedByUserId}");
            Console.WriteLine($"  - Status en BD: {savedNote?.Status}");
            
            // Verificar si el usuario se cargó correctamente
            var noteWithUser = await _context.ShiftHandOffNotes
                .Include(n => n.FinalizedByUser)
                .AsNoTracking()
                .FirstOrDefaultAsync(n => n.Id == note.Id);
            
            Console.WriteLine($"  - FinalizedByUser cargado: {noteWithUser?.FinalizedByUser != null}");
            if (noteWithUser?.FinalizedByUser != null)
            {
                Console.WriteLine($"  - FinalizedByUser.Name: {noteWithUser.FinalizedByUser.FirstName} {noteWithUser.FinalizedByUser.LastName}");
            }

            var updatedNote = await _context.ShiftHandOffNotes
                .Include(n => n.CreatedByUser)
                .Include(n => n.FinalizedByUser)  // ← ESTA LÍNEA FALTABA
                .Include(n => n.Acknowledgements)
                    .ThenInclude(a => a.CoordinatorUser)
                .AsNoTracking()
                .FirstAsync(n => n.Id == note.Id);

            Console.WriteLine($"=== FIN DEBUG BACKEND UPDATE NOTE ===");

            return Ok(new { note = MapNoteToResponse(updatedNote) });
        }

        [HttpPut("{id}/acknowledgements")]
        public async Task<IActionResult> ToggleAcknowledgement(int id, [FromBody] ShiftHandOffAcknowledgementToggleDto dto)
        {
            Console.WriteLine($"=== DEBUG BACKEND ACKNOWLEDGMENT ===");
            Console.WriteLine($"📝 Nota ID: {id}");
            Console.WriteLine($"👤 CoordinatorUserId: {dto.CoordinatorUserId}");
            Console.WriteLine($"✅ IsAcknowledged: {dto.IsAcknowledged}");
            
            var note = await _context.ShiftHandOffNotes
                .Include(n => n.Acknowledgements)
                .FirstOrDefaultAsync(n => n.Id == id);

            if (note == null)
            {
                Console.WriteLine("❌ Nota no encontrada");
                return NotFound(new { message = "Nota no encontrada" });
            }

            Console.WriteLine($"📋 Nota encontrada: {note.Id}, acknowledgements count: {note.Acknowledgements.Count}");
            foreach (var ack in note.Acknowledgements)
            {
                Console.WriteLine($"  🔄 Existing ack: CoordinatorUserId={ack.CoordinatorUserId}, IsAcknowledged={ack.IsAcknowledged}");
            }

            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null)
            {
                Console.WriteLine("❌ Usuario no autenticado");
                return Unauthorized(new { message = "Usuario no autenticado" });
            }

            var targetCoordinatorId = currentUser.Role?.Name == RoleNames.Administrator
                ? dto.CoordinatorUserId ?? currentUser.Id
                : currentUser.Id;

            Console.WriteLine($"🎯 TargetCoordinatorId: {targetCoordinatorId}, User: {currentUser.Username}, Role: {currentUser.Role?.Name}");

            if (currentUser.Role?.Name != RoleNames.Administrator)
            {
                var isCoordinator = await _context.Users.AnyAsync(u => u.Id == currentUser.Id && u.Role.Name == RoleNames.Coordinator);
                if (!isCoordinator)
                {
                    Console.WriteLine("❌ Usuario no es coordinador");
                    return Forbid();
                }
            }

            var acknowledgement = note.Acknowledgements.FirstOrDefault(a => a.CoordinatorUserId == targetCoordinatorId);
            if (acknowledgement == null)
            {
                Console.WriteLine($"➕ Creando nuevo acknowledgement para CoordinatorUserId: {targetCoordinatorId}");
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

            Console.WriteLine($"💾 Guardando cambios: IsAcknowledged={acknowledgement.IsAcknowledged}, AcknowledgedAt={acknowledgement.AcknowledgedAt}");

            var saveResult = await _context.SaveChangesAsync();
            Console.WriteLine($"✅ SaveChangesAsync result: {saveResult} filas afectadas");

            // Verificar que se guardó correctamente
            var savedAcknowledgement = await _context.ShiftHandOffAcknowledgements
                .Include(a => a.CoordinatorUser)
                .AsNoTracking()
                .FirstAsync(a => a.Id == acknowledgement.Id);
            
            Console.WriteLine($"✅ Verificación post-guardado: CoordinatorUserId={savedAcknowledgement.CoordinatorUserId}, IsAcknowledged={savedAcknowledgement.IsAcknowledged}, AcknowledgedAt={savedAcknowledgement.AcknowledgedAt}");

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

            Console.WriteLine($"📤 Enviando respuesta: {System.Text.Json.JsonSerializer.Serialize(response)}");
            Console.WriteLine($"=== FIN DEBUG BACKEND ===");

            return Ok(response);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = RoleNames.Administrator)]
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
                note.Id,
                note.Title,
                note.Description,
                note.Status,
                note.Type,
                note.Priority,
                note.AssignedCoordinatorId,
                CreatedAt = EnsureUtc(note.CreatedAt),
                UpdatedAt = EnsureUtc(note.UpdatedAt),
                FinalizedAt = EnsureUtc(note.FinalizedAt),
                FinalizedByUserId = note.FinalizedByUserId,  // ← AGREGAR ESTA LÍNEA
                FinalizedBy = note.FinalizedByUser != null
                    ? new
                    {
                        note.FinalizedByUser.Id,
                        FullName = ($"{note.FinalizedByUser.FirstName} {note.FinalizedByUser.LastName}").Trim(),
                        note.FinalizedByUser.Username
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
