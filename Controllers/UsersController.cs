using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ExcelProcessorApi.Data;
using ExcelProcessorApi.Models;
using System.Text.Json;

namespace ExcelProcessorApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Users
        [HttpGet]
        public async Task<ActionResult<object>> GetUsers()
        {
            try
            {
                var users = await _context.Users
                    .Include(u => u.Role)
                    .OrderByDescending(u => u.CreatedAt)
                    .ToListAsync();

                var result = users.Select(u => new
                {
                    id = u.Id,
                    username = u.Username,
                    name = $"{u.FirstName} {u.LastName}",
                    role = u.Role.Name,
                    createdAt = u.CreatedAt
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener usuarios: {ex.Message}");
            }
        }

        // GET: api/Users/5
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetUser(int id)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.Id == id);
                if (user == null)
                {
                    return NotFound("Usuario no encontrado");
                }

                return Ok(new
                {
                    id = user.Id,
                    username = user.Username,
                    name = $"{user.FirstName} {user.LastName}",
                    role = user.Role.Name,
                    createdAt = user.CreatedAt
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al obtener usuario: {ex.Message}");
            }
        }

        // POST: api/Users
        [HttpPost]
        public async Task<ActionResult<object>> CreateUser([FromBody] CreateUserRequest request)
        {
            try
            {
                // Verificar si el username ya existe
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Username == request.Username);

                if (existingUser != null)
                {
                    return BadRequest(new { message = "El username ya está registrado" });
                }

                // Crear nuevo usuario
                var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

                var user = new User
                {
                    Username = request.Username,
                    FirstName = request.Name,
                    LastName = "",
                    PasswordHash = passwordHash,
                    RoleId = 2, // User role por defecto
                    CreatedAt = DateTime.UtcNow
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Usuario creado exitosamente",
                    id = user.Id,
                    username = user.Username,
                    name = $"{user.FirstName} {user.LastName}",
                    role = "User",
                    createdAt = user.CreatedAt
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al crear usuario: {ex.Message}");
            }
        }

        // PUT: api/Users/5
        [HttpPut("{id}")]
        public async Task<ActionResult<object>> UpdateUser(int id, [FromBody] UpdateUserRequest request)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.Id == id);
                if (user == null)
                {
                    return NotFound("Usuario no encontrado");
                }

                // Actualizar campos
                if (!string.IsNullOrEmpty(request.Name))
                    user.FirstName = request.Name;

                if (!string.IsNullOrEmpty(request.Role))
                {
                    // Aquí deberías buscar el Role por nombre y asignar el RoleId
                    var role = await _context.Roles
                        .FirstOrDefaultAsync(r => r.Name == request.Role);
                    if (role != null)
                        user.RoleId = role.Id;
                }

                if (!string.IsNullOrEmpty(request.Password))
                    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Usuario actualizado exitosamente",
                    id = user.Id,
                    username = user.Username,
                    name = $"{user.FirstName} {user.LastName}",
                    role = user.Role.Name
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al actualizar usuario: {ex.Message}");
            }
        }

        // DELETE: api/Users/5
        [HttpDelete("{id}")]
        public async Task<ActionResult<object>> DeleteUser(int id)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.Id == id);
                if (user == null)
                {
                    return NotFound("Usuario no encontrado");
                }

                _context.Users.Remove(user);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Usuario eliminado exitosamente",
                    id = id
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error al eliminar usuario: {ex.Message}");
            }
        }
    }

    public class CreateUserRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Role { get; set; }
    }

    public class UpdateUserRequest
    {
        public string? Name { get; set; }
        public string? Role { get; set; }
        public string? Password { get; set; }
    }
}
