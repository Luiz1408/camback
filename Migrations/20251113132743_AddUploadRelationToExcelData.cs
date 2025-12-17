using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ExcelProcessorApi.Migrations
{
    /// <inheritdoc />
    public partial class AddUploadRelationToExcelData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UploadId",
                table: "ExcelData",
                type: "int",
                nullable: true);

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM [Roles] WHERE [Name] = N'Monitorista')
BEGIN
    INSERT INTO [Roles] ([Description], [Name])
    VALUES (N'Puede consultar información y dar seguimiento', N'Monitorista');
END");

            migrationBuilder.CreateIndex(
                name: "IX_ExcelData_UploadId",
                table: "ExcelData",
                column: "UploadId");

            migrationBuilder.AddForeignKey(
                name: "FK_ExcelData_ExcelUploads_UploadId",
                table: "ExcelData",
                column: "UploadId",
                principalTable: "ExcelUploads",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ExcelData_ExcelUploads_UploadId",
                table: "ExcelData");

            migrationBuilder.DropIndex(
                name: "IX_ExcelData_UploadId",
                table: "ExcelData");

            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM [Roles] WHERE [Name] = N'Monitorista')
BEGIN
    DELETE FROM [Roles] WHERE [Name] = N'Monitorista';
END");

            migrationBuilder.DropColumn(
                name: "UploadId",
                table: "ExcelData");
        }
    }
}
