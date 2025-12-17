using System;
using System.ComponentModel.DataAnnotations;  // Para [Key], [Required], etc.
using System.ComponentModel.DataAnnotations.Schema;  // Para [DatabaseGenerated]

namespace ExcelProcessorApi.Models
{
    public class ExcelData
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public string SheetName { get; set; } = string.Empty;

        public string Columna1 { get; set; } = string.Empty;
        public string Columna2 { get; set; } = string.Empty;
        public int? Columna3 { get; set; }
        public int RowIndex { get; set; }
        public DateTime Mes { get; set; }
        [MaxLength(255)]
        public string? MesTexto { get; set; }
        [MaxLength(255)]
        public string? Almacen { get; set; }
        [MaxLength(255)]
        public string? MonitoristaReporta { get; set; }
        [MaxLength(255)]
        public string? CoordinadorTurno { get; set; }
        [MaxLength(64)]
        public string? FechaEnvio { get; set; }
        public DateTime FechaCreacion { get; set; } = DateTime.Now;

        // Propiedad para metadatos de incidencias
        [Column(TypeName = "nvarchar(max)")]
        public string? IncidenceMetadata { get; set; }

        // Usuario que subió el archivo
        public int UploadedByUserId { get; set; }
        [ForeignKey("UploadedByUserId")]
        public User UploadedByUser { get; set; } = null!;

        // Relación con la carga de Excel original para conocer el tipo (detecciones/revisiones)
        public int? UploadId { get; set; }
        [ForeignKey("UploadId")]
        public ExcelUpload? Upload { get; set; }
    }
}