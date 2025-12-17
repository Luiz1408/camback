using Microsoft.EntityFrameworkCore;
using ExcelProcessorApi.Data;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using ExcelProcessorApi.Services;
using ExcelProcessorApi.Swagger;
using ExcelProcessorApi.Models;
using Microsoft.AspNetCore.Http;
using OfficeOpenXml;

var builder = WebApplication.CreateBuilder(args);

ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

// Add services to the container.
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Agrega esto después de AddDbContext
builder.Services.AddScoped<JwtService>();

// JWT Configuration
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var key = Encoding.ASCII.GetBytes(jwtSettings["Secret"]!);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var authHeader = context.Request.Headers["Authorization"].FirstOrDefault();

            if (!string.IsNullOrWhiteSpace(authHeader))
            {
                var header = authHeader.Trim();

                if (header.Length >= 2 && header[0] == '"' && header[^1] == '"')
                {
                    header = header.Substring(1, header.Length - 2).Trim();
                }

                if (header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    header = header.Substring("Bearer ".Length).Trim();
                }

                context.Token = header;
            }

            return Task.CompletedTask;
        }
    };
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});

// Controllers
builder.Services.AddControllers();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "ExcelProcessor API", Version = "v1" });
    
    // Configuración de autenticación JWT en Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.OperationFilter<FormFileOperationFilter>();

    c.MapType<IFormFile>(() => new OpenApiSchema
    {
        Type = "string",
        Format = "binary"
    });

    c.MapType<IEnumerable<IFormFile>>(() => new OpenApiSchema
    {
        Type = "array",
        Items = new OpenApiSchema
        {
            Type = "string",
            Format = "binary"
        }
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    try
    {
        // Crear roles si no existen
        if (!dbContext.Roles.Any(r => r.Name == RoleNames.Technician))
        {
            dbContext.Roles.Add(new Role
            {
                Name = RoleNames.Technician,
                Description = "Puede registrar y dar seguimiento a actividades técnicas"
            });
        }

        if (!dbContext.Roles.Any(r => r.Name == RoleNames.Administrator))
        {
            dbContext.Roles.Add(new Role
            {
                Name = RoleNames.Administrator,
                Description = "Acceso completo a todas las funcionalidades"
            });
        }

        if (!dbContext.Roles.Any(r => r.Name == RoleNames.Coordinator))
        {
            dbContext.Roles.Add(new Role
            {
                Name = RoleNames.Coordinator,
                Description = "Puede coordinar operaciones y gestionar usuarios"
            });
        }

        if (!dbContext.Roles.Any(r => r.Name == RoleNames.Monitorista))
        {
            dbContext.Roles.Add(new Role
            {
                Name = RoleNames.Monitorista,
                Description = "Puede consultar información y dar seguimiento"
            });
        }

        // Crear usuario admin si no existe
        if (!dbContext.Users.Any(u => u.Username == "admin"))
        {
            var adminRole = dbContext.Roles.FirstOrDefault(r => r.Name == RoleNames.Administrator);
            if (adminRole != null)
            {
                var adminUser = new User
                {
                    Username = "admin",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                    RoleId = adminRole.Id,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };
                dbContext.Users.Add(adminUser);
            }
        }

        dbContext.SaveChanges();
        Console.WriteLine("✅ Base de datos inicializada correctamente");
        Console.WriteLine("🔑 Credenciales del administrador:");
        Console.WriteLine("   Usuario: admin");
        Console.WriteLine("   Contraseña: Admin123!");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error inicializando la base de datos: {ex.Message}");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "ExcelProcessor API v1"));
}

app.UseHttpsRedirection();

// Configurar archivos estáticos
app.UseStaticFiles();

// Configurar archivos estáticos personalizados para uploads
var staticFilesOptions = new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads")),
    RequestPath = "/uploads"
};
app.UseStaticFiles(staticFilesOptions);

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();