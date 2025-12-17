using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ExcelProcessorApi.Models
{
    public class ExcelUpload
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string UploadType { get; set; } = string.Empty; // "detecciones" o "revisiones"

        [Required]
        [MaxLength(255)]
        public string FileName { get; set; } = string.Empty;

        [MaxLength(255)]
        public string SheetName { get; set; } = string.Empty;

        [Column(TypeName = "nvarchar(max)")]
        public string HeadersJson { get; set; } = string.Empty;

        public int TotalRows { get; set; }

        [Required]
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        // Propiedad para compatibilidad con el controlador - mapeada a UploadedAt
        [NotMapped]
        public DateTime CreatedAt 
        { 
            get => UploadedAt; 
            set => UploadedAt = value; 
        }

        [Required]
        public int UploadedByUserId { get; set; }

        [ForeignKey(nameof(UploadedByUserId))]
        public User UploadedByUser { get; set; } = null!;

        public ICollection<Deteccion> Detecciones { get; set; } = new List<Deteccion>();

        public ICollection<Revision> Revisiones { get; set; } = new List<Revision>();

        public ICollection<ExcelData> ExcelData { get; set; } = new List<ExcelData>();
    }
}
