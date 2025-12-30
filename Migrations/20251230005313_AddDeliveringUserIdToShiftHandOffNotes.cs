using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExcelProcessorApi.Migrations
{
    /// <inheritdoc />
    public partial class AddDeliveringUserIdToShiftHandOffNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DeliveringUserId",
                table: "ShiftHandOffNotes",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ShiftHandOffNotes_DeliveringUserId",
                table: "ShiftHandOffNotes",
                column: "DeliveringUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ShiftHandOffNotes_Users_DeliveringUserId",
                table: "ShiftHandOffNotes",
                column: "DeliveringUserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ShiftHandOffNotes_Users_DeliveringUserId",
                table: "ShiftHandOffNotes");

            migrationBuilder.DropIndex(
                name: "IX_ShiftHandOffNotes_DeliveringUserId",
                table: "ShiftHandOffNotes");

            migrationBuilder.DropColumn(
                name: "DeliveringUserId",
                table: "ShiftHandOffNotes");
        }
    }
}
