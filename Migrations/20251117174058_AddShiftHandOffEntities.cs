using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExcelProcessorApi.Migrations
{
    /// <inheritdoc />
    public partial class AddShiftHandOffEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ShiftHandOffNotes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "Pendiente"),
                    AssignedCoordinatorId = table.Column<int>(type: "int", nullable: true),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftHandOffNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftHandOffNotes_Users_AssignedCoordinatorId",
                        column: x => x.AssignedCoordinatorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ShiftHandOffNotes_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ShiftHandOffAcknowledgements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NoteId = table.Column<int>(type: "int", nullable: false),
                    CoordinatorUserId = table.Column<int>(type: "int", nullable: false),
                    IsAcknowledged = table.Column<bool>(type: "bit", nullable: false),
                    AcknowledgedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedByUserId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftHandOffAcknowledgements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShiftHandOffAcknowledgements_ShiftHandOffNotes_NoteId",
                        column: x => x.NoteId,
                        principalTable: "ShiftHandOffNotes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShiftHandOffAcknowledgements_Users_CoordinatorUserId",
                        column: x => x.CoordinatorUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ShiftHandOffAcknowledgements_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ShiftHandOffAcknowledgements_CoordinatorUserId",
                table: "ShiftHandOffAcknowledgements",
                column: "CoordinatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftHandOffAcknowledgements_NoteId_CoordinatorUserId",
                table: "ShiftHandOffAcknowledgements",
                columns: new[] { "NoteId", "CoordinatorUserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShiftHandOffAcknowledgements_UpdatedByUserId",
                table: "ShiftHandOffAcknowledgements",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftHandOffNotes_AssignedCoordinatorId",
                table: "ShiftHandOffNotes",
                column: "AssignedCoordinatorId");

            migrationBuilder.CreateIndex(
                name: "IX_ShiftHandOffNotes_CreatedByUserId",
                table: "ShiftHandOffNotes",
                column: "CreatedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShiftHandOffAcknowledgements");

            migrationBuilder.DropTable(
                name: "ShiftHandOffNotes");
        }
    }
}
