using System.ComponentModel.DataAnnotations;

namespace ExcelProcessorApi.Models.DTOs
{
    public class TechnicalActivityDto
    {
        public int Id { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public BasicUserDto? CreatedBy { get; set; }
        public BasicUserDto? UpdatedBy { get; set; }
        public List<TechnicalActivityImageDto> Images { get; set; } = new();
    }

    public class TechnicalActivityImageDto
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string OriginalFileName { get; set; } = string.Empty;
        public string FileExtension { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public string Url { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class BasicUserDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
    }

    public class CreateTechnicalActivityDto
    {
        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Notes { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? EndDate { get; set; }
    }

    public class UpdateTechnicalActivityDto
    {
        [MaxLength(50)]
        public string? Status { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }
    }

    public class TechnicalActivitySummaryDto
    {
        public int Total { get; set; }
        public int Pending { get; set; }
        public int Completed { get; set; }
        public int NotCompleted { get; set; }
    }
}
