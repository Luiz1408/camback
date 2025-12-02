using Microsoft.EntityFrameworkCore;
using ExcelProcessorApi.Models;

namespace ExcelProcessorApi.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<ExcelData> ExcelData { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<ExcelUpload> ExcelUploads { get; set; }
        public DbSet<Deteccion> Detecciones { get; set; }
        public DbSet<Revision> Revisiones { get; set; }
        public DbSet<ShiftHandOffNote> ShiftHandOffNotes { get; set; }
        public DbSet<ShiftHandOffAcknowledgement> ShiftHandOffAcknowledgements { get; set; }
        public DbSet<TechnicalActivity> TechnicalActivities { get; set; }
        public DbSet<TechnicalActivityImage> TechnicalActivityImages { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuración de la entidad ExcelData
            modelBuilder.Entity<ExcelData>(entity =>
            {
                entity.Property(e => e.SheetName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(e => e.Columna1)
                    .HasMaxLength(255)
                    .IsRequired(false);

                entity.Property(e => e.Columna2)
                    .HasMaxLength(255)
                    .IsRequired(false);

                entity.Property(e => e.Columna3)
                    .IsRequired(false);

                entity.Property(e => e.RowIndex)
                    .IsRequired()
                    .HasDefaultValue(0);

                entity.Property(e => e.MesTexto)
                    .HasMaxLength(255)
                    .IsRequired(false);

                entity.Property(e => e.Almacen)
                    .HasMaxLength(255)
                    .IsRequired(false);

                entity.Property(e => e.MonitoristaReporta)
                    .HasMaxLength(255)
                    .IsRequired(false);

                entity.Property(e => e.CoordinadorTurno)
                    .HasMaxLength(255)
                    .IsRequired(false);

                entity.Property(e => e.FechaEnvio)
                    .HasMaxLength(64)
                    .IsRequired(false);

                entity.Property(e => e.FechaCreacion)
                    .HasDefaultValueSql("GETDATE()");

                entity.HasOne(e => e.UploadedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.UploadedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Upload)
                    .WithMany(u => u.ExcelData)
                    .HasForeignKey(e => e.UploadId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<ExcelUpload>(entity =>
            {
                entity.Property(e => e.UploadType)
                    .IsRequired()
                    .HasMaxLength(50);

                entity.Property(e => e.FileName)
                    .IsRequired()
                    .HasMaxLength(255);

                entity.Property(e => e.SheetName)
                    .HasMaxLength(255);

                entity.Property(e => e.HeadersJson)
                    .IsRequired(false);

                entity.Property(e => e.UploadedAt)
                    .HasDefaultValueSql("GETUTCDATE()");

                entity.HasOne(e => e.UploadedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.UploadedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasMany(e => e.Detecciones)
                    .WithOne(d => d.Upload)
                    .HasForeignKey(d => d.UploadId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasMany(e => e.Revisiones)
                    .WithOne(r => r.Upload)
                    .HasForeignKey(r => r.UploadId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Deteccion>(entity =>
            {
                entity.Property(e => e.DataJson)
                    .IsRequired();

                entity.Property(e => e.CreatedAt)
                    .HasDefaultValueSql("GETUTCDATE()");
            });

            modelBuilder.Entity<Revision>(entity =>
            {
                entity.Property(e => e.DataJson)
                    .IsRequired();

                entity.Property(e => e.CreatedAt)
                    .HasDefaultValueSql("GETUTCDATE()");
            });

            modelBuilder.Entity<ShiftHandOffNote>(entity =>
            {
                entity.Property(e => e.Description)
                    .HasMaxLength(500)
                    .IsRequired(false);

                entity.Property(e => e.Status)
                    .HasMaxLength(50)
                    .HasDefaultValue("Pendiente");

                entity.Property(e => e.CreatedAt)
                    .HasDefaultValueSql("GETUTCDATE()");

                entity.Property(e => e.UpdatedAt)
                    .HasDefaultValueSql("GETUTCDATE()");

                entity.HasOne(e => e.AssignedCoordinator)
                    .WithMany()
                    .HasForeignKey(e => e.AssignedCoordinatorId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.FinalizedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.FinalizedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasMany(e => e.Acknowledgements)
                    .WithOne(a => a.Note)
                    .HasForeignKey(a => a.NoteId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<ShiftHandOffAcknowledgement>(entity =>
            {
                entity.HasIndex(e => new { e.NoteId, e.CoordinatorUserId })
                    .IsUnique();

                entity.HasOne(e => e.CoordinatorUser)
                    .WithMany()
                    .HasForeignKey(e => e.CoordinatorUserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.UpdatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.UpdatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<Role>(entity =>
            {
                entity.Property(r => r.Name)
                    .IsRequired()
                    .HasMaxLength(50);

                entity.Property(r => r.Description)
                    .HasMaxLength(255)
                    .IsRequired(false);

                entity.HasIndex(r => r.Name)
                    .IsUnique();

                entity.HasData(
                    new Role
                    {
                        Id = 1,
                        Name = RoleNames.Administrator,
                        Description = "Acceso completo al sistema"
                    },
                    new Role
                    {
                        Id = 2,
                        Name = RoleNames.Coordinator,
                        Description = "Puede subir archivos Excel y crear gráficas"
                    },
                    new Role
                    {
                        Id = 3,
                        Name = RoleNames.Monitorista,
                        Description = "Puede consultar información y dar seguimiento"
                    },
                    new Role
                    {
                        Id = 4,
                        Name = RoleNames.Technician,
                        Description = "Puede registrar y dar seguimiento a actividades técnicas"
                    });
            });

            modelBuilder.Entity<TechnicalActivity>(entity =>
            {
                entity.Property(a => a.Description)
                    .IsRequired()
                    .HasMaxLength(500);

                entity.Property(a => a.Status)
                    .IsRequired()
                    .HasMaxLength(50)
                    .HasDefaultValue("Pendiente");

                entity.Property(a => a.Notes)
                    .HasMaxLength(1000);

                entity.Property(a => a.CreatedAt)
                    .HasDefaultValueSql("GETUTCDATE()");

                entity.Property(a => a.UpdatedAt)
                    .HasDefaultValueSql("GETUTCDATE()");

                entity.HasOne(a => a.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(a => a.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(a => a.UpdatedByUser)
                    .WithMany()
                    .HasForeignKey(a => a.UpdatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<TechnicalActivityImage>(entity =>
            {
                entity.Property(i => i.Type)
                    .IsRequired()
                    .HasMaxLength(20);

                entity.Property(i => i.FileName)
                    .IsRequired()
                    .HasMaxLength(500);

                entity.Property(i => i.OriginalFileName)
                    .IsRequired()
                    .HasMaxLength(500);

                entity.Property(i => i.FileExtension)
                    .IsRequired()
                    .HasMaxLength(10);

                entity.Property(i => i.FilePath)
                    .IsRequired()
                    .HasMaxLength(1000);

                entity.Property(i => i.Url)
                    .IsRequired()
                    .HasMaxLength(2000);

                entity.Property(i => i.CreatedAt)
                    .HasDefaultValueSql("GETUTCDATE()");

                entity.HasOne(i => i.TechnicalActivity)
                    .WithMany(a => a.Images)
                    .HasForeignKey(i => i.TechnicalActivityId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(i => i.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(i => i.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<User>(entity =>
            {
                entity.Property(u => u.Username)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(u => u.PasswordHash)
                    .IsRequired()
                    .HasMaxLength(255);

                entity.Property(u => u.FirstName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(u => u.LastName)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(u => u.CreatedAt)
                    .HasDefaultValueSql("GETDATE()");

                entity.HasOne(u => u.Role)
                    .WithMany()
                    .HasForeignKey(u => u.RoleId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(u => u.Username)
                    .IsUnique();

                entity.HasData(
                    new User
                    {
                        Id = 1,
                        Username = "admin",
                        PasswordHash = "$2a$11$/MkrViP.Yr1L.J6JmTYPNOk.etb8CjytC3bm/7iXj37.Y/FAWshXC",
                        FirstName = "Administrador",
                        LastName = "Sistema",
                        RoleId = 1,
                        IsActive = true,
                        CreatedAt = new DateTime(2025, 11, 10, 9, 45, 3, 932, DateTimeKind.Local).AddTicks(3187),
                        LastLogin = null
                    });
            });
        }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.ConfigureWarnings(warnings => 
                warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
        }
    }
}