using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ExcelProcessorApi.Models
{
    public class TechnicalActivity
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pendiente";

        [MaxLength(1000)]
        public string? Notes { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? CompletedAt { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public int CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }

        public int? UpdatedByUserId { get; set; }
        public User? UpdatedByUser { get; set; }

        // Relación con imágenes
        public ICollection<TechnicalActivityImage> Images { get; set; } = new List<TechnicalActivityImage>();
    }
}
