using System.ComponentModel.DataAnnotations;

namespace ExcelProcessorApi.Models
{
    public class Catalogo
    {
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Tipo { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        public string Valor { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Descripcion { get; set; }

        public bool Activo { get; set; } = true;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public DateTime? FechaActualizacion { get; set; }

        [StringLength(100)]
        public string? CreadoPor { get; set; }

        [StringLength(100)]
        public string? ActualizadoPor { get; set; }
    }
}
