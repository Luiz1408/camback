using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ExcelProcessorApi.Data;
using ExcelProcessorApi.Models;
using System.Globalization;

namespace ExcelProcessorApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = $"{RoleNames.Administrator},{RoleNames.Coordinator},{RoleNames.Monitorista}")]
    public class ChartsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ChartsController(ApplicationDbContext context)
        {
            _context = context;
        }

        private static DateTime ResolveEffectiveDate(DateTime mes, string? fechaEnvio, string? mesTexto)
        {
            if (TryParseFlexibleDate(fechaEnvio, out var parsed))
            {
                return parsed.Date;
            }

            if (TryParseFlexibleDate(mesTexto, out parsed))
            {
                return parsed.Date;
            }

            return mes.Date;
        }

        private static bool TryParseFlexibleDate(string? value, out DateTime result)
        {
            result = default;

            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            var trimmed = value.Trim();

            if (DateTime.TryParseExact(trimmed, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out result))
            {
                return true;
            }

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
                if (DateTime.TryParseExact(trimmed, dayFirstFormats, culture, DateTimeStyles.AssumeLocal, out result))
                {
                    return true;
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
                if (DateTime.TryParse(trimmed, culture, DateTimeStyles.AssumeLocal, out result))
                {
                    return true;
                }
            }

            result = default;
            return false;
        }

        private record DistributionSlice(string Name, int Count);

        private record GroupSliceProjection(string Key, string Tipo, string Almacen);

        private record GroupDetail(Dictionary<string, int> ByTipo, Dictionary<string, int> ByAlmacen);

        [HttpGet("monthly-bar-chart")]
        public async Task<IActionResult> GetMonthlyBarChart(
            [FromQuery] string? tipo = null,
            [FromQuery] string? almacen = null,
            [FromQuery] string? monitorista = null,
            [FromQuery] string? coordinador = null)
        {
            try
            {
                if (!TryNormalizeType(tipo, out var normalizedType, out var errorMessage))
                {
                    return BadRequest(new { message = errorMessage });
                }

                var query = _context.ExcelData
                    .Include(x => x.Upload)
                    .AsQueryable();

                query = ApplyIncidenceFilters(query, normalizedType, almacen, monitorista, coordinador);

                var rawRows = await query
                    .Select(x => new
                    {
                        x.Id,
                        x.Mes,
                        x.MesTexto,
                        x.FechaEnvio,
                        Columna3 = x.Columna3 ?? 0,
                        Almacen = x.Almacen ?? "Sin especificar",
                        Monitorista = x.MonitoristaReporta ?? "Sin especificar",
                        Coordinador = x.CoordinadorTurno ?? "Sin especificar",
                        Tipo = x.Upload != null ? x.Upload.UploadType : null
                    })
                    .AsNoTracking()
                    .ToListAsync();

                var enrichedRows = rawRows
                    .Select(row =>
                    {
                        var effectiveDate = ResolveEffectiveDate(row.Mes, row.FechaEnvio, row.MesTexto);
                        return new
                        {
                            row.Id,
                            row.Mes,
                            row.MesTexto,
                            row.FechaEnvio,
                            row.Columna3,
                            row.Almacen,
                            row.Monitorista,
                            row.Coordinador,
                            row.Tipo,
                            EffectiveDate = effectiveDate
                        };
                    })
                    .ToList();

                var monthlyData = enrichedRows
                    .GroupBy(x => new { x.EffectiveDate.Year, x.EffectiveDate.Month })
                    .Select(g => new
                    {
                        Year = g.Key.Year,
                        Month = g.Key.Month,
                        MonthName = GetMonthName(g.Key.Month),
                        Count = g.Count(),
                        SumColumna3 = g.Sum(x => x.Columna3),
                        AvgColumna3 = g.Any() ? g.Average(x => (double)x.Columna3) : 0d
                    })
                    .OrderBy(x => x.Year)
                    .ThenBy(x => x.Month)
                    .ToList();

                var details = enrichedRows
                    .OrderBy(x => x.EffectiveDate)
                    .Select(x => new
                    {
                        x.Id,
                        Mes = x.EffectiveDate,
                        x.MesTexto,
                        Almacen = x.Almacen,
                        Monitorista = x.Monitorista,
                        Coordinador = x.Coordinador,
                        Tipo = x.Tipo
                    })
                    .ToList();

                var chartData = new
                {
                    labels = monthlyData.Select(x => $"{x.MonthName} {x.Year}").ToArray(),
                    datasets = new[]
                    {
                        new
                        {
                            label = "Cantidad de Registros",
                            data = monthlyData.Select(x => x.Count).ToArray(),
                            backgroundColor = "rgba(54, 162, 235, 0.8)",
                            borderColor = "rgba(54, 162, 235, 1)",
                            borderWidth = 1
                        },
                        new
                        {
                            label = "Suma Columna3",
                            data = monthlyData.Select(x => x.SumColumna3).ToArray(),
                            backgroundColor = "rgba(255, 99, 132, 0.8)",
                            borderColor = "rgba(255, 99, 132, 1)",
                            borderWidth = 1
                        }
                    }
                    ,
                    details
                };

                return Ok(chartData);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al generar datos para gráfica de barras: {ex.Message}");
            }
        }

        [HttpGet("pie-chart")]
        public async Task<IActionResult> GetPieChart(
            [FromQuery] string? tipo = null,
            [FromQuery] string? almacen = null,
            [FromQuery] string? monitorista = null,
            [FromQuery] string? coordinador = null,
            [FromQuery] string? dimension = null)
        {
            try
            {
                if (!TryNormalizeType(tipo, out var normalizedType, out var errorMessage))
                {
                    return BadRequest(new { message = errorMessage });
                }

                var query = _context.ExcelData
                    .Include(x => x.Upload)
                    .AsQueryable();

                query = ApplyIncidenceFilters(query, normalizedType, almacen, monitorista, coordinador);

                var dimensionKey = string.IsNullOrWhiteSpace(dimension)
                    ? "almacen"
                    : dimension.Trim().ToLowerInvariant();

                if (dimensionKey != "almacen" && dimensionKey != "monitorista" && dimensionKey != "coordinador" && dimensionKey != "tipo")
                {
                    return BadRequest(new { message = "Dimensión inválida. Use 'almacen', 'monitorista', 'coordinador' o 'tipo'." });
                }

                var dimensionLabel = dimensionKey switch
                {
                    "monitorista" => "Registros por monitorista",
                    "coordinador" => "Registros por coordinador",
                    "tipo" => "Registros por tipo",
                    _ => "Registros por almacén"
                };

                var filteredRows = await query
                    .Select(x => new
                    {
                        Almacen = x.Almacen ?? "Sin especificar",
                        Monitorista = x.MonitoristaReporta ?? "Sin especificar",
                        Coordinador = x.CoordinadorTurno ?? "Sin especificar",
                        Tipo = x.Upload != null && !string.IsNullOrEmpty(x.Upload.UploadType)
                            ? x.Upload.UploadType!
                            : "Sin especificar"
                    })
                    .ToListAsync();

                List<DistributionSlice> distribution = dimensionKey switch
                {
                    "monitorista" => filteredRows
                        .GroupBy(row => row.Monitorista)
                        .Select(g => new DistributionSlice(g.Key, g.Count()))
                        .OrderByDescending(x => x.Count)
                        .ToList(),
                    "coordinador" => filteredRows
                        .GroupBy(row => row.Coordinador)
                        .Select(g => new DistributionSlice(g.Key, g.Count()))
                        .OrderByDescending(x => x.Count)
                        .ToList(),
                    "tipo" => filteredRows
                        .GroupBy(row => row.Tipo)
                        .Select(g => new DistributionSlice(g.Key, g.Count()))
                        .OrderByDescending(x => x.Count)
                        .ToList(),
                    _ => filteredRows
                        .GroupBy(row => row.Almacen)
                        .Select(g => new DistributionSlice(g.Key, g.Count()))
                        .OrderByDescending(x => x.Count)
                        .ToList()
                };

                Func<dynamic, string> keySelector = dimensionKey switch
                {
                    "monitorista" => row => (string)row.Monitorista,
                    "coordinador" => row => (string)row.Coordinador,
                    "tipo" => row => (string)row.Tipo,
                    _ => row => (string)row.Almacen
                };

                var groupDetails = distribution.ToDictionary(
                    slice => slice.Name,
                    slice =>
                    {
                        var matchingRows = filteredRows.Where(row => keySelector(row) == slice.Name);

                        var byTipo = matchingRows
                            .GroupBy(row => row.Tipo)
                            .Select(g => new { Key = g.Key, Count = g.Count() })
                            .OrderByDescending(x => x.Count)
                            .ToDictionary(x => x.Key, x => x.Count);

                        var byAlmacen = matchingRows
                            .GroupBy(row => row.Almacen)
                            .Select(g => new { Key = g.Key, Count = g.Count() })
                            .OrderByDescending(x => x.Count)
                            .ToDictionary(x => x.Key, x => x.Count);

                        return new GroupDetail(byTipo, byAlmacen);
                    });

                var monitoristaDistribution = filteredRows
                    .GroupBy(row => row.Monitorista)
                    .Select(g => new
                    {
                        Name = g.Key,
                        Count = g.Count()
                    })
                    .OrderByDescending(x => x.Count)
                    .ToList();

                var coordinadorDistribution = filteredRows
                    .GroupBy(row => row.Coordinador)
                    .Select(g => new
                    {
                        Name = g.Key,
                        Count = g.Count()
                    })
                    .OrderByDescending(x => x.Count)
                    .ToList();

                var total = distribution.Sum(x => x.Count);
                var pieData = distribution.Select(x => new
                {
                    x.Name,
                    x.Count,
                    Percentage = total > 0 ? Math.Round((double)x.Count / total * 100, 2) : 0
                }).ToList();

                var chartData = new
                {
                    labels = pieData.Select(x => x.Name).ToArray(),
                    datasets = new[]
                    {
                        new
                        {
                            label = dimensionLabel,
                            data = pieData.Select(x => x.Count).ToArray(),
                            backgroundColor = new[]
                            {
                                "rgba(255, 99, 132, 0.8)",
                                "rgba(54, 162, 235, 0.8)",
                                "rgba(255, 205, 86, 0.8)",
                                "rgba(75, 192, 192, 0.8)",
                                "rgba(153, 102, 255, 0.8)",
                                "rgba(255, 159, 64, 0.8)",
                                "rgba(199, 199, 199, 0.8)",
                                "rgba(83, 102, 255, 0.8)"
                            },
                            borderColor = new[]
                            {
                                "rgba(255, 99, 132, 1)",
                                "rgba(54, 162, 235, 1)",
                                "rgba(255, 205, 86, 1)",
                                "rgba(75, 192, 192, 1)",
                                "rgba(153, 102, 255, 1)",
                                "rgba(255, 159, 64, 1)",
                                "rgba(199, 199, 199, 1)",
                                "rgba(83, 102, 255, 1)"
                            },
                            borderWidth = 1
                        }
                    },
                    details = pieData,
                    breakdowns = new
                    {
                        byMonitorista = monitoristaDistribution,
                        byCoordinador = coordinadorDistribution
                    },
                    dimension = dimensionKey,
                    groupDetails
                };

                return Ok(chartData);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al generar datos para gráfica de pastel: {ex.Message}");
            }
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary(
            [FromQuery] string? tipo = null,
            [FromQuery] string? almacen = null,
            [FromQuery] string? monitorista = null,
            [FromQuery] string? coordinador = null)
        {
            try
            {
                if (!TryNormalizeType(tipo, out var normalizedType, out var errorMessage))
                {
                    return BadRequest(new { message = errorMessage });
                }

                var query = _context.ExcelData
                    .Include(x => x.Upload)
                    .AsQueryable();

                query = ApplyIncidenceFilters(query, normalizedType, almacen, monitorista, coordinador);

                var hasData = await query.AnyAsync();

                if (!hasData)
                {
                    return Ok(new
                    {
                        TotalRecords = 0,
                        UniqueSheets = 0,
                        UniqueAlmacenes = 0,
                        UniqueMonitoristas = 0,
                        UniqueCoordinadores = 0,
                        TopAlmacenes = Array.Empty<object>(),
                        TopMonitoristas = Array.Empty<object>(),
                        TopCoordinadores = Array.Empty<object>(),
                        DateRange = (object?)null,
                        LastUpload = (DateTime?)null
                    });
                }

                var totalRecords = await query.CountAsync();
                var uniqueSheets = await query.Select(x => x.SheetName).Distinct().CountAsync();
                var uniqueAlmacenes = await query
                    .Where(x => !string.IsNullOrEmpty(x.Almacen))
                    .Select(x => x.Almacen!)
                    .Distinct()
                    .CountAsync();
                var uniqueMonitoristas = await query
                    .Where(x => !string.IsNullOrEmpty(x.MonitoristaReporta))
                    .Select(x => x.MonitoristaReporta!)
                    .Distinct()
                    .CountAsync();
                var uniqueCoordinadores = await query
                    .Where(x => !string.IsNullOrEmpty(x.CoordinadorTurno))
                    .Select(x => x.CoordinadorTurno!)
                    .Distinct()
                    .CountAsync();

                var topAlmacenes = await query
                    .Where(x => !string.IsNullOrEmpty(x.Almacen))
                    .GroupBy(x => x.Almacen!)
                    .Select(g => new { nombre = g.Key, count = g.Count() })
                    .OrderByDescending(x => x.count)
                    .Take(5)
                    .ToListAsync();

                var topMonitoristas = await query
                    .Where(x => !string.IsNullOrEmpty(x.MonitoristaReporta))
                    .GroupBy(x => x.MonitoristaReporta!)
                    .Select(g => new { nombre = g.Key, count = g.Count() })
                    .OrderByDescending(x => x.count)
                    .Take(5)
                    .ToListAsync();

                var topCoordinadores = await query
                    .Where(x => !string.IsNullOrEmpty(x.CoordinadorTurno))
                    .GroupBy(x => x.CoordinadorTurno!)
                    .Select(g => new { nombre = g.Key, count = g.Count() })
                    .OrderByDescending(x => x.count)
                    .Take(5)
                    .ToListAsync();

                var from = await query.MinAsync(x => x.Mes);
                var to = await query.MaxAsync(x => x.Mes);
                var lastUpload = await query.MaxAsync(x => x.FechaCreacion);

                return Ok(new
                {
                    TotalRecords = totalRecords,
                    UniqueSheets = uniqueSheets,
                    UniqueAlmacenes = uniqueAlmacenes,
                    UniqueMonitoristas = uniqueMonitoristas,
                    UniqueCoordinadores = uniqueCoordinadores,
                    TopAlmacenes = topAlmacenes,
                    TopMonitoristas = topMonitoristas,
                    TopCoordinadores = topCoordinadores,
                    DateRange = new
                    {
                        From = from,
                        To = to
                    },
                    LastUpload = lastUpload
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al generar resumen: {ex.Message}");
            }
        }

        private static IQueryable<ExcelData> ApplyIncidenceFilters(
            IQueryable<ExcelData> source,
            string? normalizedType,
            string? almacen,
            string? monitorista,
            string? coordinador)
        {
            if (!string.IsNullOrEmpty(normalizedType))
            {
                source = source.Where(x => x.Upload != null && x.Upload.UploadType == normalizedType);
            }

            if (!string.IsNullOrWhiteSpace(almacen))
            {
                var pattern = BuildLikePattern(almacen);
                source = source.Where(x => x.Almacen != null && EF.Functions.Like(x.Almacen, pattern));
            }

            if (!string.IsNullOrWhiteSpace(monitorista))
            {
                var pattern = BuildLikePattern(monitorista);
                source = source.Where(x => x.MonitoristaReporta != null && EF.Functions.Like(x.MonitoristaReporta, pattern));
            }

            if (!string.IsNullOrWhiteSpace(coordinador))
            {
                var pattern = BuildLikePattern(coordinador);
                source = source.Where(x => x.CoordinadorTurno != null && EF.Functions.Like(x.CoordinadorTurno, pattern));
            }

            return source;
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

            errorMessage = "Tipo de datos no soportado. Use 'detecciones' o 'revisiones'.";
            return false;
        }

        private static string GetMonthName(int month)
        {
            return month switch
            {
                1 => "Enero",
                2 => "Febrero",
                3 => "Marzo",
                4 => "Abril",
                5 => "Mayo",
                6 => "Junio",
                7 => "Julio",
                8 => "Agosto",
                9 => "Septiembre",
                10 => "Octubre",
                11 => "Noviembre",
                12 => "Diciembre",
                _ => "Desconocido"
            };
        }
    }
}