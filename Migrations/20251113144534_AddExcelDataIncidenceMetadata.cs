using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExcelProcessorApi.Migrations
{
    /// <inheritdoc />
    public partial class AddExcelDataIncidenceMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Almacen",
                table: "ExcelData",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CoordinadorTurno",
                table: "ExcelData",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MesTexto",
                table: "ExcelData",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MonitoristaReporta",
                table: "ExcelData",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Almacen",
                table: "ExcelData");

            migrationBuilder.DropColumn(
                name: "CoordinadorTurno",
                table: "ExcelData");

            migrationBuilder.DropColumn(
                name: "MesTexto",
                table: "ExcelData");

            migrationBuilder.DropColumn(
                name: "MonitoristaReporta",
                table: "ExcelData");
        }
    }
}
