using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace ExcelProcessorApi.Models.DTOs
{
    public class ShiftHandOffAcknowledgementDto
    {
        [Required]
        public int CoordinatorUserId { get; set; }

        public bool IsAcknowledged { get; set; }
    }

    public class UpsertShiftHandOffNoteDto
    {
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string? Description { get; set; }

        [MaxLength(50)]
        public string? Status { get; set; }

        [MaxLength(20)]
        public string? Type { get; set; }

        [MaxLength(20)]
        public string Priority { get; set; } = "Media";

        public int? AssignedCoordinatorId { get; set; }

        public int? DeliveringUserId { get; set; }

        // Campos para finalización
        public string? FinalizedAt { get; set; }
        public int? FinalizedByUserId { get; set; }

        public List<ShiftHandOffAcknowledgementDto> Acknowledgements { get; set; } = new();
    }

    public class ShiftHandOffAcknowledgementToggleDto
    {
        public bool IsAcknowledged { get; set; }

        public int? CoordinatorUserId { get; set; }
    }

    // DTO para actualizaciones parciales (solo los campos que se quieren cambiar)
    public class UpdateShiftHandOffNoteDto
    {
        public string? Description { get; set; }

        public string? Status { get; set; }

        public string? Type { get; set; }

        public string? Priority { get; set; }

        public int? AssignedCoordinatorId { get; set; }

        // Campos para finalización
        public string? FinalizedAt { get; set; }
        public int? FinalizedByUserId { get; set; }
    }
}
