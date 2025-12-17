using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExcelProcessorApi.Migrations
{
    /// <inheritdoc />
    public partial class AddFinalizationToShiftHandOffNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ShiftHandOffAcknowledgements_Users_UpdatedByUserId",
                table: "ShiftHandOffAcknowledgements");

            migrationBuilder.AddColumn<DateTime>(
                name: "FinalizedAt",
                table: "ShiftHandOffNotes",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "FinalizedByUserId",
                table: "ShiftHandOffNotes",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShiftHandOffNotes_FinalizedByUserId",
                table: "ShiftHandOffNotes",
                column: "FinalizedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ShiftHandOffAcknowledgements_Users_UpdatedByUserId",
                table: "ShiftHandOffAcknowledgements",
                column: "UpdatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ShiftHandOffNotes_Users_FinalizedByUserId",
                table: "ShiftHandOffNotes",
                column: "FinalizedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ShiftHandOffAcknowledgements_Users_UpdatedByUserId",
                table: "ShiftHandOffAcknowledgements");

            migrationBuilder.DropForeignKey(
                name: "FK_ShiftHandOffNotes_Users_FinalizedByUserId",
                table: "ShiftHandOffNotes");

            migrationBuilder.DropIndex(
                name: "IX_ShiftHandOffNotes_FinalizedByUserId",
                table: "ShiftHandOffNotes");

            migrationBuilder.DropColumn(
                name: "FinalizedAt",
                table: "ShiftHandOffNotes");

            migrationBuilder.DropColumn(
                name: "FinalizedByUserId",
                table: "ShiftHandOffNotes");

            migrationBuilder.AddForeignKey(
                name: "FK_ShiftHandOffAcknowledgements_Users_UpdatedByUserId",
                table: "ShiftHandOffAcknowledgements",
                column: "UpdatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
