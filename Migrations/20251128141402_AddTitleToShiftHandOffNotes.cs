using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExcelProcessorApi.Migrations
{
    /// <inheritdoc />
    public partial class AddTitleToShiftHandOffNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "ShiftHandOffNotes",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Title",
                table: "ShiftHandOffNotes");
        }
    }
}
