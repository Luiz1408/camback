using System;
using System.Collections.Generic;
using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OfficeOpenXml;
using ExcelProcessorApi.Data;
using ExcelProcessorApi.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text;
using System.Linq;

namespace ExcelProcessorApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UploadController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
        {
            WriteIndented = false
        };

        private sealed class UploadRowProjection
        {
            public int RowId { get; set; }
            public int UploadId { get; set; }
            public string UploadType { get; set; } = string.Empty;
            public string FileName { get; set; } = string.Empty;
            public string SheetName { get; set; } = string.Empty;
            public int RowIndex { get; set; }
            public string DataJson { get; set; } = string.Empty;
            public DateTime UploadedAt { get; set; }
            public int UploadedByUserId { get; set; }
            public string UploadedByUsername { get; set; } = string.Empty;
            public string UploadedByFullName { get; set; } = string.Empty;
            public string? Almacen { get; set; }
            public string? MonitoristaReporta { get; set; }
            public string? CoordinadorTurno { get; set; }
            public string? FechaEnvio { get; set; }
        }

        private sealed class FilterOptionRow
        {
            public string Tipo { get; set; } = string.Empty;
            public string? Almacen { get; set; }
            public string? Monitorista { get; set; }
            public string? Coordinador { get; set; }
            public string DataJson { get; set; } = string.Empty;
        }

        public sealed class DeleteRowsRequest
        {
            public List<DeleteRowItem> Items { get; set; } = new();
        }

        public sealed class DeleteRowItem
        {
            public int RowId { get; set; }
            public string Tipo { get; set; } = string.Empty;
        }

        private static ExcelData BuildExcelData(Dictionary<string, string?> rowData, IReadOnlyList<string> headers, ExcelUpload upload, int uploadedByUserId, int rowIndex)
        {
            var normalizedLookup = BuildNormalizedLookup(rowData);

            var mesRaw = GetFieldValue(normalizedLookup, "MES", "MESINCIDENCIA", "FECHA", "MESREPORTE");
            var mes = ParseMonthValue(mesRaw, upload.UploadedAt);
            var almacen = GetFieldValue(normalizedLookup, "ALMACEN", "ALMACENDESTINO", "ALMACENORIGEN");
            var monitorista = GetFieldValue(normalizedLookup, "MONITORISTAQUIENREPORTA", "MONITORISTA", "REPORTA");
            var coordinador = GetFieldValue(normalizedLookup, "COORDINADORENTURNO", "COORDINADOR", "COORD");
            var fechaEnvioRaw = GetFieldValue(
                normalizedLookup,
                "FECHADEENVIO",
                "FECHAENVIO",
                "FECHAENVÍO",
                "FECHA ENVIÓ",
                "FECHA ENVIO",
                "FECHA DE ENVIO",
                "FECHA DE ENVÍO",
                "FECHA ENVIÓ",
                "FECHA ENVIo",
                "FECHAENVIO (DIA)",
                "FECHA EN QUE SE ENVIA",
                "FECHAENVIADA",
                "FECHA"
            );
            var fechaEnvio = NormalizeDateValue(fechaEnvioRaw);

            var columna1 = GetColumnValue(headers, rowData, 0);
            var columna2 = GetColumnValue(headers, rowData, 1);
            var columna3Value = GetColumnValue(headers, rowData, 2);
            int? columna3 = TryParseNullableInt(columna3Value);

            return new ExcelData
            {
                SheetName = upload.SheetName ?? string.Empty,
                Columna1 = columna1 ?? string.Empty,
                Columna2 = columna2 ?? string.Empty,
                Columna3 = columna3,
                RowIndex = rowIndex,
                Mes = mes,
                MesTexto = string.IsNullOrWhiteSpace(mesRaw) ? null : mesRaw,
                Almacen = string.IsNullOrWhiteSpace(almacen) ? null : almacen,
                MonitoristaReporta = string.IsNullOrWhiteSpace(monitorista) ? null : monitorista,
                CoordinadorTurno = string.IsNullOrWhiteSpace(coordinador) ? null : coordinador,
                FechaEnvio = fechaEnvio,
                FechaCreacion = DateTime.UtcNow,
                UploadedByUserId = uploadedByUserId,
                Upload = upload
            };
        }

        private static Dictionary<string, string?> BuildNormalizedLookup(Dictionary<string, string?> rowData)
        {
            var lookup = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

            foreach (var kvp in rowData)
            {
                var normalizedKey = NormalizeHeaderKey(kvp.Key);
                if (!lookup.ContainsKey(normalizedKey))
                {
                    lookup[normalizedKey] = kvp.Value?.Trim();
                }
            }

            return lookup;
        }

        private static string NormalizeHeaderKey(string? header)
        {
            if (string.IsNullOrWhiteSpace(header))
            {
                return string.Empty;
            }

            var trimmed = header.Trim().ToUpperInvariant().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(trimmed.Length);

            foreach (var ch in trimmed)
            {
                var category = CharUnicodeInfo.GetUnicodeCategory(ch);
                if (category == UnicodeCategory.NonSpacingMark)
                {
                    continue;
                }

                if (char.IsLetterOrDigit(ch))
                {
                    builder.Append(ch);
                }
            }

            return builder.ToString().Normalize(NormalizationForm.FormC);
        }

        private static string? GetFieldValue(IReadOnlyDictionary<string, string?> lookup, params string[] candidateKeys)
        {
            foreach (var key in candidateKeys)
            {
                var normalized = NormalizeHeaderKey(key);
                if (lookup.TryGetValue(normalized, out var value) && !string.IsNullOrWhiteSpace(value))
                {
                    return value.Trim();
                }

                foreach (var kvp in lookup)
                {
                    if (string.IsNullOrWhiteSpace(kvp.Value))
                    {
                        continue;
                    }

                    if (kvp.Key.StartsWith(normalized, StringComparison.Ordinal) ||
                        normalized.StartsWith(kvp.Key, StringComparison.Ordinal) ||
                        kvp.Key.Contains(normalized, StringComparison.Ordinal))
                    {
                        return kvp.Value!.Trim();
                    }
                }
            }

            return null;
        }

        private static DateTime ParseMonthValue(string? mesRaw, DateTime uploadedAt)
        {
            if (!string.IsNullOrWhiteSpace(mesRaw))
            {
                var trimmed = mesRaw.Trim();
                var dayFirstFormats = new[]
                {
                    "dd/MM/yyyy",
                    "d/M/yyyy",
                    "dd-MM-yyyy",
                    "d-M-yyyy",
                    "dd/MM/yy",
                    "d/M/yy",
                    "dd-MM-yy",
                    "d-M-yy"
                };

                var dayFirstCultures = new[]
                {
                    new CultureInfo("es-MX"),
                    new CultureInfo("es-ES"),
                    CultureInfo.CurrentCulture
                };

                foreach (var culture in dayFirstCultures)
                {
                    if (DateTime.TryParseExact(trimmed, dayFirstFormats, culture, DateTimeStyles.AssumeLocal, out var parsedDayFirst))
                    {
                        return parsedDayFirst.Date;
                    }
                }

                var candidates = new[]
                {
                    new CultureInfo("es-MX"),
                    new CultureInfo("es-ES"),
                    CultureInfo.CurrentCulture,
                    CultureInfo.InvariantCulture
                };

                foreach (var culture in candidates)
                {
                    if (DateTime.TryParse(trimmed, culture, DateTimeStyles.AssumeLocal, out var parsed))
                    {
                        return parsed.Date;
                    }

                    var formats = new[] { "MMMM yyyy", "MMM yyyy", "MM/yyyy", "MM-yy", "M/yyyy", "M-yy" };
                    if (DateTime.TryParseExact(trimmed, formats, culture, DateTimeStyles.None, out parsed))
                    {
                        return parsed.Date;
                    }
                }

                if (int.TryParse(mesRaw, out var monthNumber) && monthNumber >= 1 && monthNumber <= 12)
                {
                    return new DateTime(uploadedAt.Year, monthNumber, 1);
                }
            }

            return new DateTime(uploadedAt.Year, uploadedAt.Month, 1);
        }

        private static string? GetColumnValue(IReadOnlyList<string> headers, Dictionary<string, string?> rowData, int index)
        {
            if (index < 0 || index >= headers.Count)
            {
                return null;
            }

            if (rowData.TryGetValue(headers[index], out var value) && !string.IsNullOrWhiteSpace(value))
            {
                return value.Trim();
            }

            return null;
        }

        private static int? TryParseNullableInt(string? value)
        {
            if (int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var number))
            {
                return number;
            }

            return null;
        }

        public UploadController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("upload-excel")]
        [Consumes("multipart/form-data")]
        [Authorize(Roles = RoleNames.Administrator)]
        public async Task<IActionResult> UploadExcel(IFormFile file, [FromQuery] string tipo)
        {
            if (file == null || file.Length == 0)
                return BadRequest("No se ha proporcionado ningún archivo.");

            if (string.IsNullOrWhiteSpace(tipo))
            {
                return BadRequest("Debe especificar el tipo de archivo (detecciones o revisiones).");
            }

            var normalizedType = tipo.Trim().ToLowerInvariant();
            if (normalizedType != "detecciones" && normalizedType != "revisiones")
            {
                return BadRequest("Tipo de archivo no soportado. Use 'detecciones' o 'revisiones'.");
            }

            try
            {
                // Obtener el username del usuario actual desde el token JWT
                var usernameClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
                if (string.IsNullOrEmpty(usernameClaim))
                {
                    return Unauthorized("Usuario no autenticado correctamente.");
                }

                // Buscar al usuario en la base de datos para obtener su ID
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Username == usernameClaim && u.IsActive);
                
                if (user == null)
                {
                    return Unauthorized($"Usuario '{usernameClaim}' no encontrado o inactivo en la base de datos.");
                }

                if (user.Id <= 0)
                {
                    return StatusCode(500, "Error: ID de usuario inválido.");
                }

                using (var stream = new MemoryStream())
                {
                    await file.CopyToAsync(stream);
                    using (var package = new ExcelPackage(stream))
                    {
                        if (package.Workbook.Worksheets.Count == 0)
                        {
                            return BadRequest("El archivo Excel no contiene ninguna hoja de trabajo.");
                        }

                        var worksheet = package.Workbook.Worksheets
                            .FirstOrDefault(ws => (ws.Dimension?.Rows ?? 0) >= 2);

                        if (worksheet == null)
                        {
                            return BadRequest("El archivo Excel debe tener al menos una hoja con encabezado y datos.");
                        }

                        var dimension = worksheet.Dimension;
                        var rowCount = dimension?.Rows ?? 0;
                        var columnCount = dimension?.Columns ?? 0;

                        if (columnCount == 0)
                        {
                            return BadRequest("No se detectaron columnas en la hoja seleccionada.");
                        }

                        var headers = new List<string>();
                        for (int col = 1; col <= columnCount; col++)
                        {
                            var header = worksheet.Cells[1, col].Text?.Trim() ?? $"Columna{col}";
                            headers.Add(string.IsNullOrWhiteSpace(header) ? $"Columna{col}" : header);
                        }

                        var upload = new ExcelUpload
                        {
                            UploadType = normalizedType,
                            FileName = file.FileName,
                            SheetName = worksheet.Name,
                            HeadersJson = JsonSerializer.Serialize(headers, JsonOptions),
                            TotalRows = 0,
                            UploadedAt = DateTime.UtcNow,
                            UploadedByUserId = user.Id
                        };

                        var detecciones = new List<Deteccion>();
                        var revisiones = new List<Revision>();
                        var excelDataRows = new List<ExcelData>();

                        for (int row = 2; row <= rowCount; row++)
                        {
                            var rowData = new Dictionary<string, string?>();
                            var isRowEmpty = true;

                            for (int col = 1; col <= columnCount; col++)
                            {
                                var value = worksheet.Cells[row, col].Text;
                                if (!string.IsNullOrWhiteSpace(value))
                                {
                                    isRowEmpty = false;
                                }
                                rowData[headers[col - 1]] = value;
                            }

                            if (isRowEmpty)
                            {
                                continue;
                            }

                            upload.TotalRows++;

                            var serialized = JsonSerializer.Serialize(rowData, JsonOptions);

                            if (normalizedType == "detecciones")
                            {
                                detecciones.Add(new Deteccion
                                {
                                    Upload = upload,
                                    RowIndex = row,
                                    DataJson = serialized,
                                });
                            }
                            else
                            {
                                revisiones.Add(new Revision
                                {
                                    Upload = upload,
                                    RowIndex = row,
                                    DataJson = serialized,
                                });
                            }

                            var excelData = BuildExcelData(rowData, headers, upload, user.Id, row);
                            excelDataRows.Add(excelData);
                        }

                        if (upload.TotalRows == 0)
                        {
                            return BadRequest("El archivo no contiene filas con datos.");
                        }

                        _context.ExcelUploads.Add(upload);

                        if (detecciones.Count > 0)
                        {
                            await _context.Detecciones.AddRangeAsync(detecciones);
                        }

                        if (revisiones.Count > 0)
                        {
                            await _context.Revisiones.AddRangeAsync(revisiones);
                        }

                        if (excelDataRows.Count > 0)
                        {
                            await _context.ExcelData.AddRangeAsync(excelDataRows);
                        }

                        await _context.SaveChangesAsync();

                        return Ok(new
                        {
                            Message = "Archivo cargado correctamente",
                            UploadId = upload.Id,
                            Tipo = upload.UploadType,
                            upload.TotalRows
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                // Log more detailed error information
                var innerException = ex.InnerException?.Message ?? "No inner exception";
                return StatusCode(500, $"Error interno del servidor: {ex.Message}. Detalles: {innerException}");
            }
        }

        [HttpGet("check-users")]
        public async Task<IActionResult> CheckUsers()
        {
            try
            {
                var users = await _context.Users
                    .Select(u => new { u.Id, u.Username, u.FirstName, u.LastName, u.IsActive, u.RoleId })
                    .ToListAsync();
                
                return Ok(new { users, totalCount = users.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpGet("uploads")]
        [Authorize(Roles = $"{RoleNames.Administrator},{RoleNames.Coordinator},{RoleNames.Monitorista}")]
        public async Task<IActionResult> GetUploads([FromQuery] string? tipo = null)
        {
            var query = _context.ExcelUploads
                .AsNoTracking()
                .Include(x => x.UploadedByUser)
                .OrderByDescending(x => x.UploadedAt)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(tipo))
            {
                var normalizedType = tipo.Trim().ToLowerInvariant();
                query = query.Where(x => x.UploadType == normalizedType);
            }

            var isAdmin = User.IsInRole(RoleNames.Administrator);

            var uploads = await query
                .Select(x => new
                {
                    x.Id,
                    x.UploadType,
                    x.FileName,
                    x.SheetName,
                    x.TotalRows,
                    x.UploadedAt,
                    UploadedBy = isAdmin ? new
                    {
                        x.UploadedByUser.Id,
                        x.UploadedByUser.Username,
                        FullName = x.UploadedByUser.FirstName + " " + x.UploadedByUser.LastName
                    } : null
                })
                .ToListAsync();

            return Ok(uploads);
        }

        [HttpGet("uploads/{uploadId}/rows")]
        [Authorize(Roles = $"{RoleNames.Administrator},{RoleNames.Coordinator},{RoleNames.Monitorista}")]
        public async Task<IActionResult> GetRows(int uploadId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var upload = await _context.ExcelUploads
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == uploadId);

            if (upload == null)
            {
                return NotFound($"No existe un upload con Id {uploadId}");
            }

            var headers = JsonSerializer.Deserialize<List<string>>(upload.HeadersJson ?? "[]", JsonOptions) ?? new List<string>();

            if (upload.UploadType == "detecciones")
            {
                var query = _context.Detecciones
                    .AsNoTracking()
                    .Where(x => x.UploadId == uploadId)
                    .OrderBy(x => x.RowIndex);

                var total = await query.CountAsync();
                var rows = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var parsedRows = rows.Select(r => new
                {
                    r.Id,
                    r.RowIndex,
                    Data = JsonSerializer.Deserialize<Dictionary<string, string?>>(r.DataJson, JsonOptions) ?? new Dictionary<string, string?>()
                });

                return Ok(new
                {
                    upload.Id,
                    upload.UploadType,
                    upload.FileName,
                    upload.SheetName,
                    Headers = headers,
                    TotalRows = total,
                    Page = page,
                    PageSize = pageSize,
                    Rows = parsedRows
                });
            }
            else
            {
                var query = _context.Revisiones
                    .AsNoTracking()
                    .Where(x => x.UploadId == uploadId)
                    .OrderBy(x => x.RowIndex);

                var total = await query.CountAsync();
                var rows = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();

                var parsedRows = rows.Select(r => new
                {
                    r.Id,
                    r.RowIndex,
                    Data = JsonSerializer.Deserialize<Dictionary<string, string?>>(r.DataJson, JsonOptions) ?? new Dictionary<string, string?>()
                });

                return Ok(new
                {
                    upload.Id,
                    upload.UploadType,
                    upload.FileName,
                    upload.SheetName,
                    Headers = headers,
                    TotalRows = total,
                    Page = page,
                    PageSize = pageSize,
                    Rows = parsedRows
                });
            }
        }

        [HttpGet("rows")]
        [Authorize(Roles = $"{RoleNames.Administrator},{RoleNames.Coordinator},{RoleNames.Monitorista}")]
        public async Task<IActionResult> GetAllRows(
            [FromQuery] string? tipo = null,
            [FromQuery] int? uploadId = null,
            [FromQuery] string? almacen = null,
            [FromQuery] string? monitorista = null,
            [FromQuery] string? fechaEnvio = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var normalizedType = tipo?.Trim().ToLowerInvariant();

            if (!string.IsNullOrWhiteSpace(normalizedType) &&
                normalizedType != "detecciones" &&
                normalizedType != "revisiones")
            {
                return BadRequest("Tipo de archivo no soportado. Use 'detecciones' o 'revisiones'.");
            }

            if (page < 1)
            {
                page = 1;
            }

            if (pageSize < 1)
            {
                pageSize = 50;
            }
            else if (pageSize > 500)
            {
                pageSize = 500;
            }

            var deteccionesQuery =
                from d in _context.Detecciones.AsNoTracking()
                join e in _context.ExcelData.AsNoTracking()
                    on new { UploadId = (int?)d.UploadId, d.RowIndex }
                    equals new { e.UploadId, e.RowIndex }
                    into excelDataGroup
                from e in excelDataGroup.DefaultIfEmpty()
                select new UploadRowProjection
                {
                    RowId = d.Id,
                    UploadId = d.UploadId,
                    UploadType = d.Upload.UploadType,
                    FileName = d.Upload.FileName,
                    SheetName = d.Upload.SheetName,
                    RowIndex = d.RowIndex,
                    DataJson = d.DataJson,
                    UploadedAt = d.Upload.UploadedAt,
                    UploadedByUserId = d.Upload.UploadedByUser.Id,
                    UploadedByUsername = d.Upload.UploadedByUser.Username,
                    UploadedByFullName = d.Upload.UploadedByUser.FirstName + " " + d.Upload.UploadedByUser.LastName,
                    Almacen = e != null ? e.Almacen : null,
                    MonitoristaReporta = e != null ? e.MonitoristaReporta : null,
                    CoordinadorTurno = e != null ? e.CoordinadorTurno : null,
                    FechaEnvio = e != null ? (e.FechaEnvio ?? e.Columna1) : null
                };

            var revisionesQuery =
                from r in _context.Revisiones.AsNoTracking()
                join e in _context.ExcelData.AsNoTracking()
                    on new { UploadId = (int?)r.UploadId, r.RowIndex }
                    equals new { e.UploadId, e.RowIndex }
                    into excelDataGroup
                from e in excelDataGroup.DefaultIfEmpty()
                select new UploadRowProjection
                {
                    RowId = r.Id,
                    UploadId = r.UploadId,
                    UploadType = r.Upload.UploadType,
                    FileName = r.Upload.FileName,
                    SheetName = r.Upload.SheetName,
                    RowIndex = r.RowIndex,
                    DataJson = r.DataJson,
                    UploadedAt = r.Upload.UploadedAt,
                    UploadedByUserId = r.Upload.UploadedByUser.Id,
                    UploadedByUsername = r.Upload.UploadedByUser.Username,
                    UploadedByFullName = r.Upload.UploadedByUser.FirstName + " " + r.Upload.UploadedByUser.LastName,
                    Almacen = e != null ? e.Almacen : null,
                    MonitoristaReporta = e != null ? e.MonitoristaReporta : null,
                    CoordinadorTurno = e != null ? e.CoordinadorTurno : null,
                    FechaEnvio = e != null ? (e.FechaEnvio ?? e.Columna1) : null
                };

            IQueryable<UploadRowProjection> query = normalizedType switch
            {
                "detecciones" => deteccionesQuery,
                "revisiones" => revisionesQuery,
                _ => deteccionesQuery.Concat(revisionesQuery)
            };

            if (uploadId.HasValue)
            {
                query = query.Where(x => x.UploadId == uploadId.Value);
            }

            if (!string.IsNullOrWhiteSpace(almacen))
            {
                var pattern = BuildLikePattern(almacen);
                query = query.Where(x => x.Almacen != null && EF.Functions.Like(x.Almacen, pattern));
            }

            if (!string.IsNullOrWhiteSpace(monitorista))
            {
                var pattern = BuildLikePattern(monitorista);
                query = query.Where(x => x.MonitoristaReporta != null && EF.Functions.Like(x.MonitoristaReporta, pattern));
            }

            if (!string.IsNullOrWhiteSpace(fechaEnvio))
            {
                var trimmed = fechaEnvio.Trim();
                var candidatePatterns = new List<string>();

                if (!string.IsNullOrEmpty(trimmed))
                {
                    candidatePatterns.Add(BuildLikePattern(trimmed));
                }

                var normalizedFilter = NormalizeDateValue(trimmed);
                if (!string.IsNullOrEmpty(normalizedFilter) &&
                    !candidatePatterns.Contains(BuildLikePattern(normalizedFilter)))
                {
                    candidatePatterns.Add(BuildLikePattern(normalizedFilter));
                }

                if (DateTime.TryParse(normalizedFilter ?? trimmed, out var parsedDate))
                {
                    var formatted = parsedDate.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);
                    var altPattern = BuildLikePattern(formatted);
                    if (!candidatePatterns.Contains(altPattern))
                    {
                        candidatePatterns.Add(altPattern);
                    }

                    var shortFormatted = parsedDate.ToString("d/M/yyyy", CultureInfo.InvariantCulture);
                    var shortPattern = BuildLikePattern(shortFormatted);
                    if (!candidatePatterns.Contains(shortPattern))
                    {
                        candidatePatterns.Add(shortPattern);
                    }
                }

                if (candidatePatterns.Count == 1)
                {
                    var pattern = candidatePatterns[0];
                    query = query.Where(x => x.FechaEnvio != null && EF.Functions.Like(x.FechaEnvio, pattern));
                }
                else if (candidatePatterns.Count == 2)
                {
                    var pattern1 = candidatePatterns[0];
                    var pattern2 = candidatePatterns[1];
                    query = query.Where(x => x.FechaEnvio != null &&
                        (EF.Functions.Like(x.FechaEnvio, pattern1) || EF.Functions.Like(x.FechaEnvio, pattern2)));
                }
                else if (candidatePatterns.Count >= 3)
                {
                    var pattern1 = candidatePatterns[0];
                    var pattern2 = candidatePatterns[1];
                    var pattern3 = candidatePatterns[2];
                    query = query.Where(x => x.FechaEnvio != null &&
                        (EF.Functions.Like(x.FechaEnvio, pattern1) ||
                         EF.Functions.Like(x.FechaEnvio, pattern2) ||
                         EF.Functions.Like(x.FechaEnvio, pattern3)));
                }
            }

            var totalRows = await query.CountAsync();

            var rows = await query
                .OrderByDescending(x => x.UploadedAt)
                .ThenBy(x => x.RowIndex)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var isAdmin = User.IsInRole(RoleNames.Administrator);

            var parsedRows = rows.Select(row => new
            {
                row.RowId,
                row.UploadId,
                row.UploadType,
                row.FileName,
                row.SheetName,
                row.RowIndex,
                row.UploadedAt,
                UploadedBy = isAdmin ? new
                {
                    Id = row.UploadedByUserId,
                    Username = row.UploadedByUsername,
                    FullName = row.UploadedByFullName
                } : null,
                Data = JsonSerializer.Deserialize<Dictionary<string, string?>>(row.DataJson, JsonOptions)
                        ?? new Dictionary<string, string?>()
            });

            return Ok(new
            {
                TotalRows = totalRows,
                Page = page,
                PageSize = pageSize,
                Rows = parsedRows
            });
        }

        [HttpGet("uploaded-data")]
        [Authorize(Roles = $"{RoleNames.Administrator},{RoleNames.Coordinator},{RoleNames.Monitorista}")]
        public async Task<IActionResult> GetUploadedData(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25,
            [FromQuery] string? tipo = null,
            [FromQuery] string? almacen = null,
            [FromQuery] string? persona = null,
            [FromQuery] string? coordinador = null,
            [FromQuery] string? fechaEnvio = null)
        {
            var normalizedType = tipo?.Trim().ToLowerInvariant();

            if (!string.IsNullOrWhiteSpace(normalizedType) &&
                normalizedType != "detecciones" &&
                normalizedType != "revisiones")
            {
                return BadRequest(new { message = "Tipo de archivo no soportado. Use 'detecciones' o 'revisiones'." });
            }

            if (page < 1)
            {
                page = 1;
            }

            if (pageSize < 1)
            {
                pageSize = 25;
            }
            else if (pageSize > 200)
            {
                pageSize = 200;
            }

            var deteccionesQuery =
                from d in _context.Detecciones.AsNoTracking()
                join e in _context.ExcelData.AsNoTracking()
                    on new { UploadId = (int?)d.UploadId, d.RowIndex }
                    equals new { e.UploadId, e.RowIndex }
                    into excelDataGroup
                from e in excelDataGroup.DefaultIfEmpty()
                select new UploadRowProjection
                {
                    RowId = d.Id,
                    UploadId = d.UploadId,
                    UploadType = d.Upload.UploadType,
                    FileName = d.Upload.FileName,
                    SheetName = d.Upload.SheetName,
                    RowIndex = d.RowIndex,
                    DataJson = d.DataJson,
                    UploadedAt = d.Upload.UploadedAt,
                    UploadedByUserId = d.Upload.UploadedByUser.Id,
                    UploadedByUsername = d.Upload.UploadedByUser.Username,
                    UploadedByFullName = d.Upload.UploadedByUser.FirstName + " " + d.Upload.UploadedByUser.LastName,
                    Almacen = e != null ? e.Almacen : null,
                    MonitoristaReporta = e != null ? e.MonitoristaReporta : null,
                    CoordinadorTurno = e != null ? e.CoordinadorTurno : null,
                    FechaEnvio = e != null ? (e.FechaEnvio ?? e.Columna1) : null
                };

            var revisionesQuery =
                from r in _context.Revisiones.AsNoTracking()
                join e in _context.ExcelData.AsNoTracking()
                    on new { UploadId = (int?)r.UploadId, r.RowIndex }
                    equals new { e.UploadId, e.RowIndex }
                    into excelDataGroup
                from e in excelDataGroup.DefaultIfEmpty()
                select new UploadRowProjection
                {
                    RowId = r.Id,
                    UploadId = r.UploadId,
                    UploadType = r.Upload.UploadType,
                    FileName = r.Upload.FileName,
                    SheetName = r.Upload.SheetName,
                    RowIndex = r.RowIndex,
                    DataJson = r.DataJson,
                    UploadedAt = r.Upload.UploadedAt,
                    UploadedByUserId = r.Upload.UploadedByUser.Id,
                    UploadedByUsername = r.Upload.UploadedByUser.Username,
                    UploadedByFullName = r.Upload.UploadedByUser.FirstName + " " + r.Upload.UploadedByUser.LastName,
                    Almacen = e != null ? e.Almacen : null,
                    MonitoristaReporta = e != null ? e.MonitoristaReporta : null,
                    CoordinadorTurno = e != null ? e.CoordinadorTurno : null,
                    FechaEnvio = e != null ? (e.FechaEnvio ?? e.Columna1) : null
                };

            IQueryable<UploadRowProjection> query = normalizedType switch
            {
                "detecciones" => deteccionesQuery,
                "revisiones" => revisionesQuery,
                _ => deteccionesQuery.Concat(revisionesQuery)
            };

            if (!string.IsNullOrWhiteSpace(almacen))
            {
                var pattern = BuildLikePattern(almacen);
                query = query.Where(x => x.Almacen != null && EF.Functions.Like(x.Almacen, pattern));
            }

            if (!string.IsNullOrWhiteSpace(persona))
            {
                var pattern = BuildLikePattern(persona);
                query = query.Where(x => x.MonitoristaReporta != null && EF.Functions.Like(x.MonitoristaReporta, pattern));
            }

            if (!string.IsNullOrWhiteSpace(coordinador))
            {
                var pattern = BuildLikePattern(coordinador);
                query = query.Where(x => x.CoordinadorTurno != null && EF.Functions.Like(x.CoordinadorTurno, pattern));
            }

            if (!string.IsNullOrWhiteSpace(fechaEnvio))
            {
                var trimmed = fechaEnvio.Trim();
                var candidatePatterns = new List<string>();

                if (!string.IsNullOrEmpty(trimmed))
                {
                    candidatePatterns.Add(BuildLikePattern(trimmed));
                }

                var normalizedFilter = NormalizeDateValue(trimmed);
                if (!string.IsNullOrEmpty(normalizedFilter) &&
                    !candidatePatterns.Contains(BuildLikePattern(normalizedFilter)))
                {
                    candidatePatterns.Add(BuildLikePattern(normalizedFilter));
                }

                if (DateTime.TryParse(normalizedFilter ?? trimmed, out var parsedDate))
                {
                    var formatted = parsedDate.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);
                    var altPattern = BuildLikePattern(formatted);
                    if (!candidatePatterns.Contains(altPattern))
                    {
                        candidatePatterns.Add(altPattern);
                    }

                    var shortFormatted = parsedDate.ToString("d/M/yyyy", CultureInfo.InvariantCulture);
                    var shortPattern = BuildLikePattern(shortFormatted);
                    if (!candidatePatterns.Contains(shortPattern))
                    {
                        candidatePatterns.Add(shortPattern);
                    }
                }

                if (candidatePatterns.Count == 1)
                {
                    var pattern = candidatePatterns[0];
                    query = query.Where(x => x.FechaEnvio != null && EF.Functions.Like(x.FechaEnvio, pattern));
                }
                else if (candidatePatterns.Count == 2)
                {
                    var pattern1 = candidatePatterns[0];
                    var pattern2 = candidatePatterns[1];
                    query = query.Where(x => x.FechaEnvio != null &&
                        (EF.Functions.Like(x.FechaEnvio, pattern1) || EF.Functions.Like(x.FechaEnvio, pattern2)));
                }
                else if (candidatePatterns.Count >= 3)
                {
                    var pattern1 = candidatePatterns[0];
                    var pattern2 = candidatePatterns[1];
                    var pattern3 = candidatePatterns[2];
                    query = query.Where(x => x.FechaEnvio != null &&
                        (EF.Functions.Like(x.FechaEnvio, pattern1) ||
                         EF.Functions.Like(x.FechaEnvio, pattern2) ||
                         EF.Functions.Like(x.FechaEnvio, pattern3)));
                }
            }

            var totalRecords = await query.CountAsync();

            var rows = await query
                .OrderByDescending(x => x.UploadedAt)
                .ThenBy(x => x.RowIndex)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var isAdmin = User.IsInRole(RoleNames.Administrator);

            var data = rows.Select(row =>
            {
                var parsed = JsonSerializer.Deserialize<Dictionary<string, string?>>(row.DataJson ?? "{}", JsonOptions)
                             ?? new Dictionary<string, string?>();

                if (!string.IsNullOrWhiteSpace(row.Almacen))
                {
                    parsed.TryAdd("Almacen", row.Almacen);
                    parsed.TryAdd("almacen", row.Almacen);
                }

                if (!string.IsNullOrWhiteSpace(row.MonitoristaReporta))
                {
                    parsed.TryAdd("Monitorista", row.MonitoristaReporta);
                    parsed.TryAdd("monitorista", row.MonitoristaReporta);
                }

                if (!string.IsNullOrWhiteSpace(row.CoordinadorTurno))
                {
                    parsed.TryAdd("Coordinador", row.CoordinadorTurno);
                    parsed.TryAdd("coordinador", row.CoordinadorTurno);
                }

                if (!string.IsNullOrWhiteSpace(row.FechaEnvio))
                {
                    parsed.TryAdd("FechaEnvio", row.FechaEnvio);
                    parsed.TryAdd("fechaEnvio", row.FechaEnvio);
                }

                return new
                {
                    id = row.RowId,
                    row.UploadId,
                    row.UploadType,
                    row.RowIndex,
                    row.FileName,
                    row.SheetName,
                    row.UploadedAt,
                    data = parsed,
                    uploadedBy = isAdmin
                        ? new
                        {
                            id = row.UploadedByUserId,
                            username = row.UploadedByUsername,
                            fullName = row.UploadedByFullName
                        }
                        : null
                };
            }).ToList();

            object? uploadInfo = null;
            var firstRow = rows.FirstOrDefault();
            if (firstRow != null)
            {
                uploadInfo = new
                {
                    uploadType = firstRow.UploadType,
                    uploadedAt = firstRow.UploadedAt,
                    uploaderName = firstRow.UploadedByFullName,
                    uploaderUsername = firstRow.UploadedByUsername
                };
            }

            return Ok(new
            {
                data,
                totalRecords,
                page,
                pageSize,
                uploadInfo
            });
        }

        [HttpGet("filter-options")]
        [Authorize(Roles = $"{RoleNames.Administrator},{RoleNames.Coordinator},{RoleNames.Monitorista}")]
        public async Task<IActionResult> GetFilterOptions([FromQuery] string? tipo = null)
        {
            if (!TryNormalizeType(tipo, out var normalizedType, out var errorMessage))
            {
                return BadRequest(new { message = errorMessage });
            }

            IQueryable<FilterOptionRow> deteccionesQuery =
                from d in _context.Detecciones.AsNoTracking()
                join e in _context.ExcelData.AsNoTracking()
                    on new { UploadId = (int?)d.UploadId, d.RowIndex }
                    equals new { e.UploadId, e.RowIndex }
                    into excelDataGroup
                from e in excelDataGroup.DefaultIfEmpty()
                select new FilterOptionRow
                {
                    Tipo = d.Upload.UploadType,
                    Almacen = e != null ? e.Almacen : null,
                    Monitorista = e != null ? e.MonitoristaReporta : null,
                    Coordinador = e != null ? e.CoordinadorTurno : null,
                    DataJson = d.DataJson
                };

            IQueryable<FilterOptionRow> revisionesQuery =
                from r in _context.Revisiones.AsNoTracking()
                join e in _context.ExcelData.AsNoTracking()
                    on new { UploadId = (int?)r.UploadId, r.RowIndex }
                    equals new { e.UploadId, e.RowIndex }
                    into excelDataGroup
                from e in excelDataGroup.DefaultIfEmpty()
                select new FilterOptionRow
                {
                    Tipo = r.Upload.UploadType,
                    Almacen = e != null ? e.Almacen : null,
                    Monitorista = e != null ? e.MonitoristaReporta : null,
                    Coordinador = e != null ? e.CoordinadorTurno : null,
                    DataJson = r.DataJson
                };

            IQueryable<FilterOptionRow> combinedQuery = normalizedType switch
            {
                "detecciones" => deteccionesQuery,
                "revisiones" => revisionesQuery,
                _ => deteccionesQuery.Concat(revisionesQuery)
            };

            var rawValues = await combinedQuery.ToListAsync();

            foreach (var item in rawValues)
            {
                if (!string.IsNullOrWhiteSpace(item.Almacen) &&
                    !string.IsNullOrWhiteSpace(item.Monitorista) &&
                    !string.IsNullOrWhiteSpace(item.Coordinador))
                {
                    continue;
                }

                if (string.IsNullOrWhiteSpace(item.DataJson))
                {
                    continue;
                }

                try
                {
                    var parsed = JsonSerializer.Deserialize<Dictionary<string, string?>>(item.DataJson, JsonOptions)
                                 ?? new Dictionary<string, string?>();
                    var lookup = BuildNormalizedLookup(parsed);

                    if (string.IsNullOrWhiteSpace(item.Almacen))
                    {
                        item.Almacen = GetFieldValue(
                            lookup,
                            "ALMACEN",
                            "ALMACENDESTINO",
                            "ALMACENORIGEN",
                            "SUCURSAL",
                            "TIENDA"
                        );
                    }

                    if (string.IsNullOrWhiteSpace(item.Monitorista))
                    {
                        item.Monitorista = GetFieldValue(
                            lookup,
                            "MONITORISTAQUIENREPORTA",
                            "MONITORISTA",
                            "QUIEN REPORTA",
                            "PERSONA QUE REPORTA",
                            "MONITORISTA QUE REPORTA"
                        );
                    }

                    if (string.IsNullOrWhiteSpace(item.Coordinador))
                    {
                        item.Coordinador = GetFieldValue(
                            lookup,
                            "COORDINADORENTURNO",
                            "COORDINADOR",
                            "COORD",
                            "COORDINADOR EN TURNO"
                        );
                    }
                }
                catch
                {
                    // Ignorar registros con JSON no válido.
                }
            }

            var almacenes = rawValues
                .Select(item => item.Almacen?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrEmpty(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToList();

            var monitoristas = rawValues
                .Select(item => item.Monitorista?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrEmpty(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToList();

            var coordinadores = rawValues
                .Select(item => item.Coordinador?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrEmpty(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToList();

            return Ok(new
            {
                almacenes,
                monitoristas,
                coordinadores
            });
        }

        private static string BuildLikePattern(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return "%";
            }

            var trimmed = input.Trim();
            var escaped = trimmed
                .Replace("[", "[[")
                .Replace("%", "[%]")
                .Replace("_", "[_]");

            return $"%{escaped}%";
        }

        private static bool TryNormalizeType(string? tipo, out string? normalizedType, out string? errorMessage)
        {
            normalizedType = null;
            errorMessage = null;

            if (string.IsNullOrWhiteSpace(tipo))
            {
                return true;
            }

            var candidate = tipo.Trim().ToLowerInvariant();

            if (candidate == "detecciones" || candidate == "revisiones")
            {
                normalizedType = candidate;
                return true;
            }

            errorMessage = "Tipo de archivo no soportado. Use 'detecciones' o 'revisiones'.";
            return false;
        }

        [HttpDelete("rows/all")]
        [Authorize(Roles = RoleNames.Administrator)]
        public async Task<IActionResult> DeleteAllRows()
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var detecciones = await _context.Detecciones.ToListAsync();
                var revisiones = await _context.Revisiones.ToListAsync();
                var excelData = await _context.ExcelData.ToListAsync();
                var uploads = await _context.ExcelUploads.ToListAsync();

                var deletedDetecciones = detecciones.Count;
                var deletedRevisiones = revisiones.Count;
                var deletedExcelData = excelData.Count;
                var deletedUploads = uploads.Count;

                if (deletedDetecciones == 0 && deletedRevisiones == 0 && deletedExcelData == 0 && deletedUploads == 0)
                {
                    return Ok(new { message = "No hay registros para eliminar." });
                }

                if (deletedDetecciones > 0)
                {
                    _context.Detecciones.RemoveRange(detecciones);
                }

                if (deletedRevisiones > 0)
                {
                    _context.Revisiones.RemoveRange(revisiones);
                }

                if (deletedExcelData > 0)
                {
                    _context.ExcelData.RemoveRange(excelData);
                }

                if (deletedUploads > 0)
                {
                    _context.ExcelUploads.RemoveRange(uploads);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Se eliminaron todos los registros.",
                    deletedDetecciones,
                    deletedRevisiones,
                    deletedExcelData,
                    deletedUploads
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, $"Error al eliminar todos los registros: {ex.Message}");
            }
        }

        private static string? NormalizeDateValue(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            var trimmed = value.Trim();

            var dayFirstFormats = new[]
            {
                "dd/MM/yyyy",
                "d/M/yyyy",
                "dd-MM-yyyy",
                "d-M-yyyy",
                "dd/MM/yy",
                "d/M/yy",
                "dd-MM-yy",
                "d-M-yy"
            };

            var dayFirstCultures = new[]
            {
                new CultureInfo("es-MX"),
                new CultureInfo("es-ES"),
                CultureInfo.CurrentCulture
            };

            foreach (var culture in dayFirstCultures)
            {
                if (DateTime.TryParseExact(trimmed, dayFirstFormats, culture, DateTimeStyles.AssumeLocal, out var parsedDayFirst))
                {
                    return parsedDayFirst.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                }
            }

            var cultures = new[]
            {
                new CultureInfo("es-MX"),
                new CultureInfo("es-ES"),
                CultureInfo.CurrentCulture,
                CultureInfo.InvariantCulture
            };

            foreach (var culture in cultures)
            {
                if (DateTime.TryParse(trimmed, culture, DateTimeStyles.AssumeLocal, out var parsed))
                {
                    return parsed.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                }

                var formats = new[]
                {
                    "dd/MM/yyyy",
                    "d/M/yyyy",
                    "dd-MM-yyyy",
                    "d-M-yyyy",
                    "yyyy-MM-dd",
                    "yyyy/M/d",
                    "yyyy/M/dd",
                    "yyyy/MM/dd",
                    "dd MMM yyyy",
                    "dd MMMM yyyy"
                };

                if (DateTime.TryParseExact(trimmed, formats, culture, DateTimeStyles.AssumeLocal, out parsed))
                {
                    return parsed.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                }
            }

            return trimmed;
        }

        [HttpDelete("rows")]
        [Authorize(Roles = RoleNames.Administrator)]
        public async Task<IActionResult> DeleteRows([FromBody] DeleteRowsRequest request)
        {
            if (request?.Items == null || request.Items.Count == 0)
            {
                return BadRequest("Debe proporcionar al menos un registro para eliminar.");
            }

            var normalizedItems = request.Items
                .Where(item => item != null)
                .Select(item => new
                {
                    RowId = item.RowId,
                    Tipo = item.Tipo?.Trim().ToLowerInvariant() ?? string.Empty
                })
                .ToList();

            if (normalizedItems.Count == 0 || normalizedItems.Any(item => item.RowId <= 0))
            {
                return BadRequest("No se encontraron registros válidos para eliminar.");
            }

            if (normalizedItems.Any(item => item.Tipo != "detecciones" && item.Tipo != "revisiones"))
            {
                return BadRequest("Solo se pueden eliminar registros de tipo 'detecciones' o 'revisiones'.");
            }

            var deteccionesToRemove = new List<Deteccion>();
            var revisionesToRemove = new List<Revision>();
            var excelDataToRemove = new List<ExcelData>();
            var excelDataIds = new HashSet<int>();
            var uploadRowAdjustments = new Dictionary<int, int>();

            foreach (var group in normalizedItems.GroupBy(item => item.Tipo))
            {
                var ids = group.Select(x => x.RowId).Distinct().ToList();
                if (ids.Count == 0)
                {
                    continue;
                }

                if (group.Key == "detecciones")
                {
                    var rows = await _context.Detecciones
                        .Where(x => ids.Contains(x.Id))
                        .ToListAsync();

                    if (rows.Count == 0)
                    {
                        continue;
                    }

                    deteccionesToRemove.AddRange(rows);

                    foreach (var row in rows)
                    {
                        if (uploadRowAdjustments.TryGetValue(row.UploadId, out var current))
                        {
                            uploadRowAdjustments[row.UploadId] = current + 1;
                        }
                        else
                        {
                            uploadRowAdjustments[row.UploadId] = 1;
                        }
                    }

                    var uploadIds = rows.Select(r => r.UploadId).Distinct().ToList();
                    if (uploadIds.Count > 0)
                    {
                        var rowIndexLookup = rows
                            .GroupBy(r => r.UploadId)
                            .ToDictionary(g => g.Key, g => g.Select(r => r.RowIndex).ToHashSet());

                        var candidates = await _context.ExcelData
                            .Where(x => x.UploadId != null && uploadIds.Contains(x.UploadId.Value))
                            .ToListAsync();

                        foreach (var excel in candidates)
                        {
                            if (excel.UploadId.HasValue &&
                                rowIndexLookup.TryGetValue(excel.UploadId.Value, out var rowIndices) &&
                                rowIndices.Contains(excel.RowIndex))
                            {
                                if (excelDataIds.Add(excel.Id))
                                {
                                    excelDataToRemove.Add(excel);
                                }
                            }
                        }
                    }
                }
                else
                {
                    var rows = await _context.Revisiones
                        .Where(x => ids.Contains(x.Id))
                        .ToListAsync();

                    if (rows.Count == 0)
                    {
                        continue;
                    }

                    revisionesToRemove.AddRange(rows);

                    foreach (var row in rows)
                    {
                        if (uploadRowAdjustments.TryGetValue(row.UploadId, out var current))
                        {
                            uploadRowAdjustments[row.UploadId] = current + 1;
                        }
                        else
                        {
                            uploadRowAdjustments[row.UploadId] = 1;
                        }
                    }

                    var uploadIds = rows.Select(r => r.UploadId).Distinct().ToList();
                    if (uploadIds.Count > 0)
                    {
                        var rowIndexLookup = rows
                            .GroupBy(r => r.UploadId)
                            .ToDictionary(g => g.Key, g => g.Select(r => r.RowIndex).ToHashSet());

                        var candidates = await _context.ExcelData
                            .Where(x => x.UploadId != null && uploadIds.Contains(x.UploadId.Value))
                            .ToListAsync();

                        foreach (var excel in candidates)
                        {
                            if (excel.UploadId.HasValue &&
                                rowIndexLookup.TryGetValue(excel.UploadId.Value, out var rowIndices) &&
                                rowIndices.Contains(excel.RowIndex))
                            {
                                if (excelDataIds.Add(excel.Id))
                                {
                                    excelDataToRemove.Add(excel);
                                }
                            }
                        }
                    }
                }
            }

            var totalRowsToRemove = deteccionesToRemove.Count + revisionesToRemove.Count;

            if (totalRowsToRemove == 0)
            {
                return NotFound(new { message = "No se encontraron registros para eliminar." });
            }

            if (uploadRowAdjustments.Count > 0)
            {
                var uploadIds = uploadRowAdjustments.Keys.ToList();
                var uploads = await _context.ExcelUploads
                    .Where(x => uploadIds.Contains(x.Id))
                    .ToListAsync();

                foreach (var upload in uploads)
                {
                    if (uploadRowAdjustments.TryGetValue(upload.Id, out var decrement))
                    {
                        var newValue = upload.TotalRows - decrement;
                        upload.TotalRows = newValue < 0 ? 0 : newValue;
                    }
                }
            }

            if (deteccionesToRemove.Count > 0)
            {
                _context.Detecciones.RemoveRange(deteccionesToRemove);
            }

            if (revisionesToRemove.Count > 0)
            {
                _context.Revisiones.RemoveRange(revisionesToRemove);
            }

            if (excelDataToRemove.Count > 0)
            {
                _context.ExcelData.RemoveRange(excelDataToRemove);
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Se eliminaron {totalRowsToRemove} registro(s).",
                deletedRows = totalRowsToRemove,
                deletedExcelData = excelDataToRemove.Count
            });
        }
    }
}