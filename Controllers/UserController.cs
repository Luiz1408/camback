using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ExcelProcessorApi.Data;
using ExcelProcessorApi.Models;
using ExcelProcessorApi.Models.DTOs;
using BCrypt.Net;


namespace ExcelProcessorApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = RoleNames.Administrator)]
    public class UserController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UserController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("coordinators")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCoordinators()
        {
            try
            {
                var coordinators = await _context.Users
                    .Include(u => u.Role)
                    .Where(u => u.IsActive && u.Role != null && u.Role.Name == RoleNames.Coordinator)
                    .OrderBy(u => u.FirstName)
                    .ThenBy(u => u.LastName)
                    .Select(u => new
                    {
                        u.Id,
                        FullName = (u.FirstName + " " + u.LastName).Trim(),
                        u.Username
                    })
                    .ToListAsync();

                return Ok(coordinators);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al obtener coordinadores: {ex.Message}" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                var totalUsers = await _context.Users.CountAsync();
                var users = await _context.Users
                    .Include(u => u.Role)
                    .OrderBy(u => u.Username)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(u => new UserDto
                    {
                        Id = u.Id,
                        Username = u.Username,
                        FirstName = u.FirstName,
                        LastName = u.LastName,
                        FullName = u.FirstName + " " + u.LastName,
                        Role = u.Role != null ? u.Role.Name : "User",
                        IsActive = u.IsActive,
                        CreatedAt = u.CreatedAt,
                        LastLogin = u.LastLogin
                    })
                    .ToListAsync();

                return Ok(new
                {
                    users,
                    totalUsers,
                    page,
                    pageSize,
                    totalPages = (int)Math.Ceiling((double)totalUsers / pageSize)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al obtener usuarios: {ex.Message}" });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(int id)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.Role)
                    .Where(u => u.Id == id)
                    .Select(u => new UserDto
                    {
                        Id = u.Id,
                        Username = u.Username,
                        FirstName = u.FirstName,
                        LastName = u.LastName,
                        FullName = u.FirstName + " " + u.LastName,
                        Role = u.Role != null ? u.Role.Name : "User",
                        IsActive = u.IsActive,
                        CreatedAt = u.CreatedAt,
                        LastLogin = u.LastLogin
                    })
                    .FirstOrDefaultAsync();

                if (user == null)
                {
                    return NotFound(new { message = "Usuario no encontrado" });
                }

                return Ok(user);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al obtener usuario: {ex.Message}" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto createUserDto)
        {
            try
            {
                // Check if username already exists
                if (await _context.Users.AnyAsync(u => u.Username == createUserDto.Username))
                {
                    return BadRequest(new { message = "El nombre de usuario ya existe" });
                }

                // Validate role exists
                var role = await _context.Roles.FindAsync(createUserDto.RoleId);
                if (role == null)
                {
                    return BadRequest(new { message = "Rol inválido" });
                }

                var user = new User
                {
                    Username = createUserDto.Username,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(createUserDto.Password),
                    FirstName = createUserDto.FirstName,
                    LastName = createUserDto.LastName,
                    RoleId = createUserDto.RoleId,
                    IsActive = true,
                    CreatedAt = DateTime.Now
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                // Load the role for response
                await _context.Entry(user).Reference(u => u.Role).LoadAsync();

                var userDto = new UserDto
                {
                    Id = user.Id,
                    Username = user.Username,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    FullName = user.FirstName + " " + user.LastName,
                    Role = user.Role != null ? user.Role.Name : "User",
                    IsActive = user.IsActive,
                    CreatedAt = user.CreatedAt,
                    LastLogin = user.LastLogin
                };

                return CreatedAtAction(nameof(GetUser), new { id = user.Id }, userDto);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al crear usuario: {ex.Message}" });
            }
        }

        [HttpGet("role/{roleName}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetUsersByRole(string roleName)
        {
            try
            {
                var users = await _context.Users
                    .Include(u => u.Role)
                    .Where(u => u.IsActive && u.Role != null && u.Role.Name == roleName)
                    .OrderBy(u => u.FirstName)
                    .ThenBy(u => u.LastName)
                    .Select(u => new
                    {
                        u.Id,
                        FullName = (u.FirstName + " " + u.LastName).Trim(),
                        u.Username,
                        Role = u.Role.Name
                    })
                    .ToListAsync();

                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al obtener usuarios por rol: {ex.Message}" });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto updateUserDto)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound(new { message = "Usuario no encontrado" });
                }

                if (user.Id == 1)
                {
                    return BadRequest(new { message = "El usuario administrador principal no se puede modificar" });
                }

                // Update fields if provided
                if (!string.IsNullOrEmpty(updateUserDto.FirstName))
                    user.FirstName = updateUserDto.FirstName;

                if (!string.IsNullOrEmpty(updateUserDto.LastName))
                    user.LastName = updateUserDto.LastName;

                if (updateUserDto.RoleId.HasValue)
                {
                    var role = await _context.Roles.FindAsync(updateUserDto.RoleId.Value);
                    if (role == null)
                    {
                        return BadRequest(new { message = "Rol inválido" });
                    }
                    user.RoleId = updateUserDto.RoleId.Value;
                }

                if (updateUserDto.IsActive.HasValue)
                    user.IsActive = updateUserDto.IsActive.Value;

                await _context.SaveChangesAsync();

                return Ok(new { message = "Usuario actualizado exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al actualizar usuario: {ex.Message}" });
            }
        }

        [HttpPut("{id}/password")]
        public async Task<IActionResult> UpdatePassword(int id, [FromBody] ChangePasswordDto changePasswordDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { message = "Datos inválidos", errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage) });
            }

            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound(new { message = "Usuario no encontrado" });
                }

                if (user.Id == 1)
                {
                    return BadRequest(new { message = "La contraseña del usuario administrador principal no se puede modificar" });
                }

                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(changePasswordDto.NewPassword);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Contraseña actualizada exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al actualizar la contraseña: {ex.Message}" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound(new { message = "Usuario no encontrado" });
                }

                // Don't allow deletion of the admin user
                if (user.Id == 1)
                {
                    return BadRequest(new { message = "No se puede eliminar el usuario administrador principal" });
                }

                _context.Users.Remove(user);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Usuario eliminado exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al eliminar usuario: {ex.Message}" });
            }
        }

        [HttpPost("{id}/toggle-status")]
        public async Task<IActionResult> ToggleUserStatus(int id)
        {
            try
            {
                var user = await _context.Users.FindAsync(id);
                if (user == null)
                {
                    return NotFound(new { message = "Usuario no encontrado" });
                }

                // Don't allow deactivation of the admin user
                if (user.Id == 1 && user.IsActive)
                {
                    return BadRequest(new { message = "No se puede desactivar el usuario administrador principal" });
                }

                user.IsActive = !user.IsActive;
                await _context.SaveChangesAsync();

                return Ok(new { message = $"Usuario {(user.IsActive ? "activado" : "desactivado")} exitosamente" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al cambiar estado del usuario: {ex.Message}" });
            }
        }
    }
}
