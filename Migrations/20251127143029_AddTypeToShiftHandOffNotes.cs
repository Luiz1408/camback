using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExcelProcessorApi.Migrations
{
    /// <inheritdoc />
    public partial class AddTypeToShiftHandOffNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "ShiftHandOffNotes",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Type",
                table: "ShiftHandOffNotes");
        }
    }
}
