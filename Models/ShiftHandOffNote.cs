using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ExcelProcessorApi.Models
{
    public class ShiftHandOffNote
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Status { get; set; } = "Pendiente";

        [MaxLength(20)]
        public string Type { get; set; } = "informativo"; // "informativo" o "seguimiento"

        [MaxLength(20)]
        public string Priority { get; set; } = "Media"; // "Alta", "Media", "Baja"

        public int? AssignedCoordinatorId { get; set; }

        // public int? DeliveringUserId { get; set; }
        //
        // [ForeignKey(nameof(DeliveringUserId))]
        // public User? DeliveringUser { get; set; }

        [ForeignKey(nameof(AssignedCoordinatorId))]
        public User? AssignedCoordinator { get; set; }

        public int CreatedByUserId { get; set; }

        [ForeignKey(nameof(CreatedByUserId))]
        public User CreatedByUser { get; set; } = null!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public int? FinalizedByUserId { get; set; }

        [ForeignKey(nameof(FinalizedByUserId))]
        public User? FinalizedByUser { get; set; }

        public DateTime? FinalizedAt { get; set; }

        // Propiedades adicionales para compatibilidad con DashboardController
        [MaxLength(50)]
        public string Turno { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Area { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string Nota { get; set; } = string.Empty;

        public DateTime? AcknowledgedAt { get; set; }

        public bool IsAcknowledged { get; set; } = false;

        public int? AcknowledgedByUserId { get; set; }

        [ForeignKey(nameof(AcknowledgedByUserId))]
        public User? AcknowledgedByUser { get; set; }

        public bool IsFinalized { get; set; } = false;

        public ICollection<ShiftHandOffAcknowledgement> Acknowledgements { get; set; } = new List<ShiftHandOffAcknowledgement>();
    }

    public class ShiftHandOffAcknowledgement
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int NoteId { get; set; }

        [ForeignKey(nameof(NoteId))]
        public ShiftHandOffNote Note { get; set; } = null!;

        public int CoordinatorUserId { get; set; }

        [ForeignKey(nameof(CoordinatorUserId))]
        public User CoordinatorUser { get; set; } = null!;

        public bool IsAcknowledged { get; set; }

        public DateTime? AcknowledgedAt { get; set; }

        public int? UpdatedByUserId { get; set; }

        [ForeignKey(nameof(UpdatedByUserId))]
        public User? UpdatedByUser { get; set; }
    }
}
