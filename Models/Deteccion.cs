using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ExcelProcessorApi.Models
{
    public class Deteccion
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int UploadId { get; set; }

        [ForeignKey(nameof(UploadId))]
        public ExcelUpload Upload { get; set; } = null!;

        public int RowIndex { get; set; }

        [Column(TypeName = "nvarchar(max)")]
        public string DataJson { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
