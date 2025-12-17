using System.Security.Claims;
using System.Text.Json;
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
    [Authorize]
    public class TechnicalActivitiesController : ControllerBase
    {
        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "Pendiente",
            "Finalizada",
            "No realizada"
        };

        private static readonly HashSet<string> AllowedImageTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "antes",
            "despues"
        };

        private static readonly List<string> AllowedExtensions = new()
        {
            ".jpg", ".jpeg", ".png", ".gif"
        };

        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _environment;

        public TechnicalActivitiesController(ApplicationDbContext context, IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        [HttpGet]
        public async Task<IActionResult> GetActivities()
        {
            var activities = await _context.TechnicalActivities
                .Include(a => a.CreatedByUser)
                .Include(a => a.UpdatedByUser)
                .Include(a => a.Images)
                .OrderByDescending(a => a.CreatedAt)
                .AsNoTracking()
                .ToListAsync();

            var response = activities.Select(MapToDto);
            return Ok(new { activities = response });
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var total = await _context.TechnicalActivities.CountAsync();
            var pending = await _context.TechnicalActivities.CountAsync(a => a.Status == "Pendiente");
            var completed = await _context.TechnicalActivities.CountAsync(a => a.Status == "Finalizada");
            var notCompleted = await _context.TechnicalActivities.CountAsync(a => a.Status == "No realizada");

            var summary = new TechnicalActivitySummaryDto
            {
                Total = total,
                Pending = pending,
                Completed = completed,
                NotCompleted = notCompleted,
            };

            return Ok(summary);
        }

        [HttpPost]
        [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Technician)]
        public async Task<IActionResult> CreateActivity([FromForm] IFormCollection formData)
        {
            try
            {
                var currentUser = await GetCurrentUserAsync();
                if (currentUser == null)
                {
                    return Unauthorized(new { message = "Usuario no autenticado" });
                }

                // Extraer datos del formulario
                var description = formData["description"].ToString();
                var notes = formData["notes"].ToString();
                var startDateStr = formData["startDate"].ToString();
                var endDateStr = formData["endDate"].ToString();
                var status = formData["status"].ToString();

                if (string.IsNullOrWhiteSpace(description))
                {
                    return BadRequest(new { message = "La descripción es requerida" });
                }

                DateTime? startDate = null;
                DateTime? endDate = null;

                if (!string.IsNullOrWhiteSpace(startDateStr) && DateTime.TryParse(startDateStr, out var parsedStartDate))
                {
                    startDate = parsedStartDate;
                }

                if (!string.IsNullOrWhiteSpace(endDateStr) && DateTime.TryParse(endDateStr, out var parsedEndDate))
                {
                    endDate = parsedEndDate;
                }

                var activity = new TechnicalActivity
                {
                    Description = description.Trim(),
                    Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(),
                    Status = string.IsNullOrWhiteSpace(status) ? "Pendiente" : status.Trim(),
                    StartDate = startDate,
                    EndDate = endDate,
                    CreatedByUserId = currentUser.Id,
                    UpdatedByUserId = currentUser.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                };

                _context.TechnicalActivities.Add(activity);
                await _context.SaveChangesAsync();

                // Procesar imagen ANTES si existe (solo al crear)
                var antesImage = formData.Files.FirstOrDefault(f => f.Name == "antesImage");
                if (antesImage != null)
                {
                    await SaveImageAsync(activity.Id, antesImage, "antes", currentUser.Id);
                }

                // También procesar despuesImage si se envía al crear (opcional)
                var despuesImage = formData.Files.FirstOrDefault(f => f.Name == "despuesImage");
                if (despuesImage != null)
                {
                    await SaveImageAsync(activity.Id, despuesImage, "despues", currentUser.Id);
                }

                await _context.Entry(activity).Reference(a => a.CreatedByUser).LoadAsync();
                await _context.Entry(activity).Reference(a => a.UpdatedByUser).LoadAsync();
                await _context.Entry(activity).Collection(a => a.Images).LoadAsync();

                return CreatedAtAction(nameof(GetActivities), new { id = activity.Id }, new { activity = MapToDto(activity) });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error al crear la actividad", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Technician)]
        public async Task<IActionResult> UpdateActivity(int id, [FromBody] UpdateTechnicalActivityDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var activity = await _context.TechnicalActivities.FirstOrDefaultAsync(a => a.Id == id);
            if (activity == null)
            {
                return NotFound(new { message = "Actividad no encontrada" });
            }

            var currentUser = await GetCurrentUserAsync();
            if (currentUser == null)
            {
                return Unauthorized(new { message = "Usuario no autenticado" });
            }

            if (!string.IsNullOrWhiteSpace(dto.Status))
            {
                var trimmedStatus = dto.Status.Trim();
                if (!AllowedStatuses.Contains(trimmedStatus))
                {
                    return BadRequest(new { message = "Estatus inválido" });
                }

                activity.Status = trimmedStatus;
                activity.CompletedAt = string.Equals(trimmedStatus, "Finalizada", StringComparison.OrdinalIgnoreCase)
                    ? DateTime.UtcNow
                    : null;
            }

            if (dto.Notes != null)
            {
                activity.Notes = dto.Notes.Trim();
            }

            activity.UpdatedAt = DateTime.UtcNow;
            activity.UpdatedByUserId = currentUser.Id;

            await _context.SaveChangesAsync();

            await _context.Entry(activity).Reference(a => a.CreatedByUser).LoadAsync();
            await _context.Entry(activity).Reference(a => a.UpdatedByUser).LoadAsync();
            await _context.Entry(activity).Collection(a => a.Images).LoadAsync();

            return Ok(new { activity = MapToDto(activity) });
        }

        [HttpPost("{id}/images")]
        [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Technician)]
        public async Task<IActionResult> UpdateActivityImages(int id, [FromForm] IFormCollection formData)
        {
            try
            {
                // Log a archivo también
                var logMessage = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] === INICIO UpdateActivityImages ===\n";
                logMessage += $"Activity ID: {id}\n";
                logMessage += $"FormData keys: [{string.Join(", ", formData.Keys)}]\n";
                logMessage += $"Files count: {formData.Files.Count}\n";
                logMessage += $"Files: [{string.Join(", ", formData.Files.Select(f => $"{f.Name} ({f.Length} bytes)"))}]\n";
                
                System.IO.File.AppendAllText("backend_log.txt", logMessage);
                
                Console.WriteLine($"=== INICIO UpdateActivityImages ===");
                Console.WriteLine($"Activity ID: {id}");
                Console.WriteLine($"FormData keys: [{string.Join(", ", formData.Keys)}]");
                Console.WriteLine($"Files count: {formData.Files.Count}");
                Console.WriteLine($"Files: [{string.Join(", ", formData.Files.Select(f => $"{f.Name} ({f.Length} bytes)"))}]");

                var activity = await _context.TechnicalActivities
                    .Include(a => a.Images)
                    .FirstOrDefaultAsync(a => a.Id == id);

                if (activity == null)
                {
                    Console.WriteLine($"Actividad no encontrada: {id}");
                    return NotFound(new { message = "Actividad no encontrada" });
                }

                var currentUser = await GetCurrentUserAsync();
                if (currentUser == null)
                {
                    Console.WriteLine("Usuario no autenticado");
                    return Unauthorized(new { message = "Usuario no autenticado" });
                }

                Console.WriteLine($"Usuario autenticado: {currentUser.Username}");

                // Obtener imágenes existentes que se mantienen
                var existingAntesImagesJson = formData["existingAntesImages"].ToString();
                var existingDespuesImagesJson = formData["existingDespuesImages"].ToString();

                // Log a archivo
                var logImages = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Imágenes existentes:\n";
                logImages += $"existingAntesImagesJson: {existingAntesImagesJson}\n";
                logImages += $"existingDespuesImagesJson: {existingDespuesImagesJson}\n";
                System.IO.File.AppendAllText("backend_log.txt", logImages);

                Console.WriteLine($"existingAntesImagesJson: {existingAntesImagesJson}");
                Console.WriteLine($"existingDespuesImagesJson: {existingDespuesImagesJson}");

                List<TechnicalActivityImage> imagesToKeep = new();

                // Manejar imágenes ANTES existentes
                if (!string.IsNullOrWhiteSpace(existingAntesImagesJson))
                {
                    try
                    {
                        Console.WriteLine($"Deserializando existingAntesImagesJson: {existingAntesImagesJson}");
                        var existingAntes = System.Text.Json.JsonSerializer.Deserialize<List<object>>(existingAntesImagesJson);
                        Console.WriteLine($"Deserialización ANTES result: {existingAntes?.Count ?? 0} items");
                        
                        if (existingAntes != null && existingAntes.Count > 0)
                        {
                            // Si hay imágenes existentes, extraer los IDs
                            var antesIds = new List<int>();
                            foreach (var item in existingAntes)
                            {
                                if (item is JsonElement element)
                                {
                                    // Intentar con "Id" (mayúscula) primero, luego con "id" (minúscula)
                                    if (element.TryGetProperty("Id", out var idProp) || element.TryGetProperty("id", out idProp))
                                    {
                                        antesIds.Add(idProp.GetInt32());
                                        Console.WriteLine($"  - ANTES ID a mantener: {idProp.GetInt32()}");
                                    }
                                }
                            }
                            var antesImagesToKeep = activity.Images.Where(i => i.Type == "antes" && antesIds.Contains(i.Id)).ToList();
                            Console.WriteLine($"Imágenes ANTES a mantener encontradas: {antesImagesToKeep.Count}");
                            imagesToKeep.AddRange(antesImagesToKeep);
                        }
                    }
                    catch (System.Text.Json.JsonException ex)
                    {
                        // Si hay error en la deserialización, loguear y continuar sin imágenes existentes
                        Console.WriteLine($"Error deserializando existingAntesImages: {ex.Message}");
                    }
                }

                // Manejar imágenes DESPUÉS existentes
                if (!string.IsNullOrWhiteSpace(existingDespuesImagesJson))
                {
                    try
                    {
                        Console.WriteLine($"Deserializando existingDespuesImagesJson: {existingDespuesImagesJson}");
                        var existingDespues = System.Text.Json.JsonSerializer.Deserialize<List<object>>(existingDespuesImagesJson);
                        Console.WriteLine($"Deserialización DESPUÉS result: {existingDespues?.Count ?? 0} items");
                        
                        if (existingDespues != null && existingDespues.Count > 0)
                        {
                            // Si hay imágenes existentes, extraer los IDs
                            var despuesIds = new List<int>();
                            foreach (var item in existingDespues)
                            {
                                if (item is JsonElement element)
                                {
                                    // Intentar con "Id" (mayúscula) primero, luego con "id" (minúscula)
                                    if (element.TryGetProperty("Id", out var idProp) || element.TryGetProperty("id", out idProp))
                                    {
                                        despuesIds.Add(idProp.GetInt32());
                                        Console.WriteLine($"  - DESPUÉS ID a mantener: {idProp.GetInt32()}");
                                    }
                                }
                            }
                            var despuesImagesToKeep = activity.Images.Where(i => i.Type == "despues" && despuesIds.Contains(i.Id)).ToList();
                            Console.WriteLine($"Imágenes DESPUÉS a mantener encontradas: {despuesImagesToKeep.Count}");
                            imagesToKeep.AddRange(despuesImagesToKeep);
                        }
                    }
                    catch (System.Text.Json.JsonException ex)
                    {
                        // Si hay error en la deserialización, loguear y continuar sin imágenes existentes
                        Console.WriteLine($"Error deserializando existingDespuesImages: {ex.Message}");
                    }
                }

                Console.WriteLine($"Imágenes a mantener: {imagesToKeep.Count}");
                Console.WriteLine($"Imágenes originales en actividad: {activity.Images.Count}");
                foreach (var img in activity.Images)
                {
                    Console.WriteLine($"  - Original: {img.Id} ({img.Type}): {img.FileName}");
                }
                foreach (var img in imagesToKeep)
                {
                    Console.WriteLine($"  - A mantener: {img.Id} ({img.Type}): {img.FileName}");
                }

                // Eliminar imágenes que no se van a mantener
                // Usar comparación por ID en lugar de Except() para evitar problemas de referencia
                var imagesToDelete = new List<TechnicalActivityImage>();
                foreach (var img in activity.Images)
                {
                    var shouldKeep = imagesToKeep.Any(keepImg => keepImg.Id == img.Id);
                    if (!shouldKeep)
                    {
                        imagesToDelete.Add(img);
                    }
                }
                
                Console.WriteLine($"Imágenes a eliminar: {imagesToDelete.Count}");
                foreach (var imgToDelete in imagesToDelete)
                {
                    Console.WriteLine($"  - Eliminando: {imgToDelete.Id} ({imgToDelete.Type}) - {imgToDelete.FileName}");
                }

                _context.TechnicalActivityImages.RemoveRange(imagesToDelete);

                // Guardar nuevas imágenes
                var antesImages = formData.Files.Where(f => f.Name == "antesImages");
                var despuesImages = formData.Files.Where(f => f.Name == "despuesImages");

                Console.WriteLine($"antesImages count: {antesImages.Count()}");
                Console.WriteLine($"despuesImages count: {despuesImages.Count()}");

                foreach (var image in antesImages)
                {
                    Console.WriteLine($"Guardando imagen ANTES: {image.FileName} ({image.Length} bytes)");
                    await SaveImageAsync(id, image, "antes", currentUser.Id);
                }

                foreach (var image in despuesImages)
                {
                    Console.WriteLine($"Guardando imagen DESPUÉS: {image.FileName} ({image.Length} bytes)");
                    await SaveImageAsync(id, image, "despues", currentUser.Id);
                }

                await _context.SaveChangesAsync();

                // Recargar actividad con imágenes actualizadas
                await _context.Entry(activity).Collection(a => a.Images).LoadAsync();
                
                Console.WriteLine($"Imágenes finales en actividad: {activity.Images.Count}");
                foreach (var img in activity.Images)
                {
                    Console.WriteLine($"  - {img.Id} ({img.Type}): {img.FileName}");
                }
                
                // Log final a archivo
                var logFinal = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Imágenes finales:\n";
                logFinal += $"Total imágenes: {activity.Images.Count}\n";
                foreach (var img in activity.Images)
                {
                    logFinal += $"  - {img.Id} ({img.Type}): {img.FileName}\n";
                }
                logFinal += $"=== FIN UpdateActivityImages - ÉXITO ===\n\n";
                System.IO.File.AppendAllText("backend_log.txt", logFinal);

                Console.WriteLine($"=== FIN UpdateActivityImages - ÉXITO ===");
                return Ok(new { activity = MapToDto(activity) });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"=== ERROR UpdateActivityImages ===");
                Console.WriteLine($"Error: {ex.Message}");
                Console.WriteLine($"StackTrace: {ex.StackTrace}");
                Console.WriteLine($"InnerException: {ex.InnerException?.Message}");
                Console.WriteLine($"================================");

                return StatusCode(500, new { message = "Error al actualizar imágenes", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = RoleNames.Administrator)]
        public async Task<IActionResult> DeleteActivity(int id)
        {
            var activity = await _context.TechnicalActivities
                .Include(a => a.Images)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (activity == null)
            {
                return NotFound(new { message = "Actividad no encontrada" });
            }

            // Eliminar archivos de imágenes
            var uploadsPath = Path.Combine(_environment.WebRootPath, "uploads", "technical-activities");
            foreach (var image in activity.Images)
            {
                var filePath = Path.Combine(uploadsPath, image.FileName);
                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }
            }

            _context.TechnicalActivities.Remove(activity);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Actividad eliminada" });
        }

        private async Task SaveImageAsync(int activityId, IFormFile file, string type, int userId)
        {
            // Validar archivo
            if (file == null || file.Length == 0)
            {
                throw new ArgumentException("Archivo inválido");
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(extension))
            {
                throw new ArgumentException("Tipo de archivo no permitido");
            }

            if (file.Length > 5 * 1024 * 1024) // 5MB
            {
                throw new ArgumentException("El archivo es demasiado grande");
            }

            // Crear directorio si no existe
            var webRootPath = _environment.WebRootPath;
            if (string.IsNullOrEmpty(webRootPath))
            {
                // Fallback si WebRootPath es null
                webRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            }
            
            var uploadsPath = Path.Combine(webRootPath, "uploads", "technical-activities");
            Directory.CreateDirectory(uploadsPath);

            // Generar nombre de archivo único
            var fileName = $"{activityId}_{type}_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}{extension}";
            var filePath = Path.Combine(uploadsPath, fileName);

            // Guardar archivo
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Guardar en base de datos
            var image = new TechnicalActivityImage
            {
                TechnicalActivityId = activityId,
                Type = type,
                FileName = fileName,
                OriginalFileName = file.FileName,
                FileExtension = extension,
                FileSize = file.Length,
                FilePath = filePath,
                Url = $"/uploads/technical-activities/{fileName}",
                CreatedByUserId = userId,
                CreatedAt = DateTime.UtcNow
            };

            _context.TechnicalActivityImages.Add(image);
        }

        private async Task<User?> GetCurrentUserAsync()
        {
            var username = User.FindFirst(ClaimTypes.Name)?.Value;
            if (string.IsNullOrWhiteSpace(username))
            {
                return null;
            }

            return await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Username == username && u.IsActive);
        }

        private TechnicalActivityDto MapToDto(TechnicalActivity activity)
        {
            return new TechnicalActivityDto
            {
                Id = activity.Id,
                Description = activity.Description,
                Status = activity.Status,
                Notes = activity.Notes,
                CreatedAt = activity.CreatedAt,
                UpdatedAt = activity.UpdatedAt,
                CompletedAt = activity.CompletedAt,
                StartDate = activity.StartDate,
                EndDate = activity.EndDate,
                CreatedBy = activity.CreatedByUser != null
                    ? new BasicUserDto
                    {
                        Id = activity.CreatedByUser.Id,
                        FullName = ($"{activity.CreatedByUser.FirstName} {activity.CreatedByUser.LastName}").Trim(),
                        Username = activity.CreatedByUser.Username
                    }
                    : null,
                UpdatedBy = activity.UpdatedByUser != null
                    ? new BasicUserDto
                    {
                        Id = activity.UpdatedByUser.Id,
                        FullName = ($"{activity.UpdatedByUser.FirstName} {activity.UpdatedByUser.LastName}").Trim(),
                        Username = activity.UpdatedByUser.Username
                    }
                    : null,
                Images = activity.Images?.Select(i => new TechnicalActivityImageDto
                {
                    Id = i.Id,
                    Type = i.Type,
                    FileName = i.FileName,
                    OriginalFileName = i.OriginalFileName,
                    FileExtension = i.FileExtension,
                    FileSize = i.FileSize,
                    Url = i.Url,
                    CreatedAt = i.CreatedAt
                }).ToList() ?? new List<TechnicalActivityImageDto>()
            };
        }
    }
}
