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

// ==========================
// EPPlus
// ==========================
ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

// ==========================
// Database
// ==========================
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ==========================
// Services
// ==========================
builder.Services.AddScoped<JwtService>();

// ==========================
// JWT CONFIGURATION
// ==========================
var jwtSection = builder.Configuration.GetSection("JwtSettings");

var jwtSecret = jwtSection.GetValue<string>("Secret");
var jwtIssuer = jwtSection.GetValue<string>("Issuer");
var jwtAudience = jwtSection.GetValue<string>("Audience");

if (string.IsNullOrWhiteSpace(jwtSecret))
    throw new Exception("❌ JwtSettings:Secret no está configurado");

if (string.IsNullOrWhiteSpace(jwtIssuer))
    throw new Exception("❌ JwtSettings:Issuer no está configurado");

if (string.IsNullOrWhiteSpace(jwtAudience))
    throw new Exception("❌ JwtSettings:Audience no está configurado");

var key = Encoding.UTF8.GetBytes(jwtSecret);

// ==========================
// Authentication
// ==========================
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
        ValidIssuer = jwtIssuer,
        ValidateAudience = true,
        ValidAudience = jwtAudience,
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
                var token = authHeader.Trim();

                if (token.StartsWith("\"") && token.EndsWith("\""))
                    token = token[1..^1];

                if (token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                    token = token["Bearer ".Length..];

                context.Token = token;
            }

            return Task.CompletedTask;
        }
    };
});

// ==========================
// CORS
// ==========================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// ==========================
// Controllers
// ==========================
builder.Services.AddControllers();

// ==========================
// Swagger
// ==========================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ExcelProcessor API",
        Version = "v1"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Authorization: Bearer {token}",
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
        Items = new OpenApiSchema { Type = "string", Format = "binary" }
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

// ==========================
// Database Seed
// ==========================
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    try
    {
        if (!dbContext.Roles.Any(r => r.Name == RoleNames.Technician))
            dbContext.Roles.Add(new Role { Name = RoleNames.Technician });

        if (!dbContext.Roles.Any(r => r.Name == RoleNames.Administrator))
            dbContext.Roles.Add(new Role { Name = RoleNames.Administrator });

        if (!dbContext.Roles.Any(r => r.Name == RoleNames.Coordinator))
            dbContext.Roles.Add(new Role { Name = RoleNames.Coordinator });

        if (!dbContext.Roles.Any(r => r.Name == RoleNames.Monitorista))
            dbContext.Roles.Add(new Role { Name = RoleNames.Monitorista });

        if (!dbContext.Users.Any(u => u.Username == "admin"))
        {
            var adminRole = dbContext.Roles.First(r => r.Name == RoleNames.Administrator);

            dbContext.Users.Add(new User
            {
                Username = "admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                RoleId = adminRole.Id,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        dbContext.SaveChanges();
        Console.WriteLine("✅ Base de datos inicializada correctamente");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error inicializando DB: {ex.Message}");
    }
}

// ==========================
// Middleware (ORDEN CORRECTO)
// ==========================
app.UseSwagger();
app.UseSwaggerUI();

app.UseStaticFiles();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
