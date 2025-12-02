using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ExcelProcessorApi.Models
{
    public class TechnicalActivityImage
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        public int TechnicalActivityId { get; set; }

        [ForeignKey(nameof(TechnicalActivityId))]
        public TechnicalActivity TechnicalActivity { get; set; } = null!;

        [Required]
        [MaxLength(20)]
        public string Type { get; set; } = "antes"; // "antes" o "despues"

        [Required]
        [MaxLength(500)]
        public string FileName { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string OriginalFileName { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        public string FileExtension { get; set; } = string.Empty;

        [Required]
        public long FileSize { get; set; }

        [Required]
        [MaxLength(1000)]
        public string FilePath { get; set; } = string.Empty;

        [Required]
        [MaxLength(2000)]
        public string Url { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public int CreatedByUserId { get; set; }

        [ForeignKey(nameof(CreatedByUserId))]
        public User CreatedByUser { get; set; } = null!;
    }
}
