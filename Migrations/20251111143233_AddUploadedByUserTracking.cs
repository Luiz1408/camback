using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExcelProcessorApi.Migrations
{
    /// <inheritdoc />
    public partial class AddUploadedByUserTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UploadedByUserId",
                table: "ExcelData",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_ExcelData_UploadedByUserId",
                table: "ExcelData",
                column: "UploadedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ExcelData_Users_UploadedByUserId",
                table: "ExcelData",
                column: "UploadedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ExcelData_Users_UploadedByUserId",
                table: "ExcelData");

            migrationBuilder.DropIndex(
                name: "IX_ExcelData_UploadedByUserId",
                table: "ExcelData");

            migrationBuilder.DropColumn(
                name: "UploadedByUserId",
                table: "ExcelData");
        }
    }
}
