using System.ComponentModel.DataAnnotations;

namespace ExcelProcessorApi.Models
{
    public class Role
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public static class RoleNames
    {
        public const string Administrator = "Administrador";
        public const string Coordinator = "Coordinador";
        public const string Monitorista = "Monitorista";
        public const string Technician = "Técnico";
    }
}