using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExcelProcessorApi.Migrations
{
    /// <inheritdoc />
    public partial class AddMissingPropertiesToModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AcknowledgedAt",
                table: "ShiftHandOffNotes",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AcknowledgedByUserId",
                table: "ShiftHandOffNotes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Area",
                table: "ShiftHandOffNotes",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsAcknowledged",
                table: "ShiftHandOffNotes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsFinalized",
                table: "ShiftHandOffNotes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Nota",
                table: "ShiftHandOffNotes",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Turno",
                table: "ShiftHandOffNotes",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "IncidenceMetadata",
                table: "ExcelData",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShiftHandOffNotes_AcknowledgedByUserId",
                table: "ShiftHandOffNotes",
                column: "AcknowledgedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ShiftHandOffNotes_Users_AcknowledgedByUserId",
                table: "ShiftHandOffNotes",
                column: "AcknowledgedByUserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ShiftHandOffNotes_Users_AcknowledgedByUserId",
                table: "ShiftHandOffNotes");

            migrationBuilder.DropIndex(
                name: "IX_ShiftHandOffNotes_AcknowledgedByUserId",
                table: "ShiftHandOffNotes");

            migrationBuilder.DropColumn(
                name: "AcknowledgedAt",
                table: "ShiftHandOffNotes");

            migrationBuilder.DropColumn(
                name: "AcknowledgedByUserId",
                table: "ShiftHandOffNotes");

            migrationBuilder.DropColumn(
                name: "Area",
                table: "ShiftHandOffNotes");

            migrationBuilder.DropColumn(
                name: "IsAcknowledged",
                table: "ShiftHandOffNotes");

            migrationBuilder.DropColumn(
                name: "IsFinalized",
                table: "ShiftHandOffNotes");

            migrationBuilder.DropColumn(
                name: "Nota",
                table: "ShiftHandOffNotes");

            migrationBuilder.DropColumn(
                name: "Turno",
                table: "ShiftHandOffNotes");

            migrationBuilder.DropColumn(
                name: "IncidenceMetadata",
                table: "ExcelData");
        }
    }
}
