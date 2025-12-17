using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExcelProcessorApi.Migrations
{
    /// <inheritdoc />
    public partial class AddTechnicalActivities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TechnicalActivities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "Pendiente"),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    UpdatedByUserId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TechnicalActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TechnicalActivities_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TechnicalActivities_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM [Roles] WHERE [Id] = 4 OR [Name] = N'Técnico')
BEGIN
    SET IDENTITY_INSERT [Roles] ON;
    INSERT INTO [Roles] ([Id], [Name], [Description])
    VALUES (4, N'Técnico', N'Puede registrar y dar seguimiento a actividades técnicas');
    SET IDENTITY_INSERT [Roles] OFF;
END
");

            migrationBuilder.CreateIndex(
                name: "IX_TechnicalActivities_CreatedByUserId",
                table: "TechnicalActivities",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TechnicalActivities_UpdatedByUserId",
                table: "TechnicalActivities",
                column: "UpdatedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TechnicalActivities");

            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM [Roles] WHERE [Id] = 4 AND [Name] = N'Técnico')
BEGIN
    DELETE FROM [Roles] WHERE [Id] = 4;
END
");
        }
    }
}
