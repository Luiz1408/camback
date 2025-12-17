# CONFIGURACIÓN BACKEND Y BASE DE DATOS
## CATÁLOGOS UNIFICADOS Y COMPARTIDOS

### 1. ESTRUCTURA DE TABLA SQL

```sql
-- Tabla principal de catálogos
CREATE TABLE Catalogos (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Tipo NVARCHAR(50) NOT NULL,
    Valor NVARCHAR(255) NOT NULL,
    Activo BIT DEFAULT 1,
    FechaCreacion DATETIME2 DEFAULT GETDATE(),
    FechaActualizacion DATETIME2 NULL,
    CreadoPor NVARCHAR(100) DEFAULT 'System',
    ActualizadoPor NVARCHAR(100) NULL
);

-- Tabla integrada para almacenes + folios + ubicaciones
CREATE TABLE AlmacenesUbicacionFolios (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Almacen NVARCHAR(100) NOT NULL UNIQUE,
    FolioAsignado1 NVARCHAR(20) NOT NULL,
    Ubicacion NVARCHAR(255) NOT NULL,
    Activo BIT DEFAULT 1,
    FechaCreacion DATETIME2 DEFAULT GETDATE(),
    FechaActualizacion DATETIME2 NULL,
    CreadoPor NVARCHAR(100) DEFAULT 'System',
    ActualizadoPor NVARCHAR(100) NULL
);

-- Índices para mejor rendimiento
CREATE INDEX IX_Catalogos_Tipo ON Catalogos(Tipo);
CREATE INDEX IX_Catalogos_Activo ON Catalogos(Activo);
CREATE INDEX IX_AlmacenesUbicacionFolios_Almacen ON AlmacenesUbicacionFolios(Almacen);
CREATE INDEX IX_AlmacenesUbicacionFolios_Ubicacion ON AlmacenesUbicacionFolios(Ubicacion);
```

### 2. TIPOS DE CATÁLOGOS A INSERTAR

```sql
-- Catálogos generales (compartidos)
INSERT INTO Catalogos (Tipo, Valor) VALUES 
('Indicador', 'Calidad'),
('Indicador', 'Seguridad'),
('Indicador', 'Productividad'),
('Indicador', 'Mantenimiento'),
('Indicador', 'Logística'),

('Subindicador', 'Defectos'),
('Subindicador', 'Accidentes'),
('Subindicador', 'Tiempo Muerto'),
('Subindicador', 'Fallas'),
('Subindicador', 'Retrasos'),

('Area', 'Producción'),
('Area', 'Calidad'),
('Area', 'Mantenimiento'),
('Area', 'Logística'),
('Area', 'Seguridad'),
('Area', 'Administración'),

('Puesto', 'Operador'),
('Puesto', 'Supervisor'),
('Puesto', 'Técnico'),
('Puesto', 'Gerente'),
('Puesto', 'Analista'),

('Sucursal', 'Matriz'),
('Sucursal', 'Planta Norte'),
('Sucursal', 'Planta Sur'),
('Sucursal', 'Centro Distribución'),

('Codigo', '001'),
('Codigo', '002'),
('Codigo', '003'),
('Codigo', '004'),
('Codigo', '005'),

('Ubicacion', 'Jilotepec'),
('Ubicacion', 'Celaya'),
('Ubicacion', 'Sucursal Central'),
('Ubicacion', 'Almacén Norte'),
('Ubicacion', 'Almacén Sur');

-- Catálogos específicos para Revisiones
INSERT INTO Catalogos (Tipo, Valor) VALUES 
('REV_OBSERVACIONES', 'Sin observaciones'),
('REV_OBSERVACIONES', 'Leve'),
('REV_OBSERVACIONES', 'Moderado'),
('REV_OBSERVACIONES', 'Grave'),
('REV_OBSERVACIONES', 'Crítico'),

('REV_SE_DETECTO_INCIDENCIA', 'Sí'),
('REV_SE_DETECTO_INCIDENCIA', 'No'),
('REV_SE_DETECTO_INCIDENCIA', 'Parcialmente'),

('REV_AREA_CARGO', 'Producción'),
('REV_AREA_CARGO', 'Calidad'),
('REV_AREA_CARGO', 'Mantenimiento'),
('REV_AREA_CARGO', 'Logística'),
('REV_AREA_CARGO', 'Seguridad'),

('REV_AREA_SOLICITA', 'Producción'),
('REV_AREA_SOLICITA', 'Calidad'),
('REV_AREA_SOLICITA', 'Mantenimiento'),
('REV_AREA_SOLICITA', 'Logística'),
('REV_AREA_SOLICITA', 'Seguridad'),

('REV_COMENTARIO_GENERAL', 'Atención inmediata'),
('REV_COMENTARIO_GENERAL', 'Seguimiento requerido'),
('REV_COMENTARIO_GENERAL', 'Cerrado'),
('REV_COMENTARIO_GENERAL', 'En proceso');

-- Catálogos específicos para Detecciones
INSERT INTO Catalogos (Tipo, Valor) VALUES 
('DET_LINEA_EMPRESA', 'Línea 1'),
('DET_LINEA_EMPRESA', 'Línea 2'),
('DET_LINEA_EMPRESA', 'Línea 3'),
('DET_LINEA_EMPRESA', 'Administración'),
('DET_LINEA_EMPRESA', 'Almacén'),

('DET_AREA_ESPECIFICA', 'Área A'),
('DET_AREA_ESPECIFICA', 'Área B'),
('DET_AREA_ESPECIFICA', 'Área C'),
('DET_AREA_ESPECIFICA', 'Taller'),
('DET_AREA_ESPECIFICA', 'Oficina'),

('DET_TURNO_OPERATIVO', 'Matutino'),
('DET_TURNO_OPERATIVO', 'Vespertino'),
('DET_TURNO_OPERATIVO', 'Nocturno'),
('DET_TURNO_OPERATIVO', 'Mixto');

-- Catálogo integrado de almacenes
INSERT INTO AlmacenesUbicacionFolios (Almacen, FolioAsignado1, Ubicacion) VALUES 
('CCAT', 'CCAT', 'Jilotepec'),
('CDG', 'CDG', 'Jilotepec'),
('CDNA', 'CDNA', 'Jilotepec'),
('SCELA', 'SCELA', 'Celaya'),
('SPAZ', 'SPAZ', 'Sucursal La Paz'),
('MANF', 'MANF', 'Manufactura');
```

### 3. ENDPOINTS API REQUERIDOS

#### CatálogosController.cs
```csharp
[ApiController]
[Route("api/[controller]")]
public class CatalogosController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public CatalogosController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/catalogos/tipo
    [HttpGet("{tipo}")]
    public async Task<ActionResult<IEnumerable<Catalogo>>> GetCatalogosByTipo(string tipo)
    {
        var catalogos = await _context.Catalogos
            .Where(c => c.Tipo == tipo && c.Activo)
            .OrderBy(c => c.Valor)
            .ToListAsync();
        
        return Ok(catalogos);
    }

    // GET: api/catalogos
    [HttpGet]
    public async Task<ActionResult<IEnumerable<string>>> GetTipos()
    {
        var tipos = await _context.Catalogos
            .Where(c => c.Activo)
            .Select(c => c.Tipo)
            .Distinct()
            .ToListAsync();
        
        return Ok(tipos);
    }

    // POST: api/catalogos
    [HttpPost]
    public async Task<ActionResult<Catalogo>> CreateCatalogo(Catalogo catalogo)
    {
        catalogo.FechaCreacion = DateTime.UtcNow;
        catalogo.Activo = true;
        
        _context.Catalogos.Add(catalogo);
        await _context.SaveChangesAsync();
        
        return CreatedAtAction(nameof(GetCatalogosByTipo), 
            new { tipo = catalogo.Tipo }, catalogo);
    }

    // PUT: api/catalogos/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCatalogo(int id, Catalogo catalogo)
    {
        if (id != catalogo.Id) return BadRequest();
        
        var existing = await _context.Catalogos.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.Valor = catalogo.Valor;
        existing.FechaActualizacion = DateTime.UtcNow;
        existing.ActualizadoPor = catalogo.ActualizadoPor;
        
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/catalogos/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCatalogo(int id)
    {
        var catalogo = await _context.Catalogos.FindAsync(id);
        if (catalogo == null) return NotFound();
        
        catalogo.Activo = false;
        catalogo.FechaActualizacion = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
```

#### AlmacenesUbicacionFoliosController.cs
```csharp
[ApiController]
[Route("api/[controller]")]
public class AlmacenesUbicacionFoliosController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public AlmacenesUbicacionFoliosController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/almacenesubicacionfolios
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AlmacenUbicacionFolio>>> GetAlmacenes()
    {
        return await _context.AlmacenesUbicacionFolios
            .Where(a => a.Activo)
            .OrderBy(a => a.Almacen)
            .ToListAsync();
    }

    // POST: api/almacenesubicacionfolios
    [HttpPost]
    public async Task<ActionResult<AlmacenUbicacionFolio>> CreateAlmacen(AlmacenUbicacionFolio almacen)
    {
        almacen.FechaCreacion = DateTime.UtcNow;
        almacen.Activo = true;
        
        _context.AlmacenesUbicacionFolios.Add(almacen);
        await _context.SaveChangesAsync();
        
        return CreatedAtAction(nameof(GetAlmacenes), almacen);
    }

    // PUT: api/almacenesubicacionfolios/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAlmacen(int id, AlmacenUbicacionFolio almacen)
    {
        if (id != almacen.Id) return BadRequest();
        
        var existing = await _context.AlmacenesUbicacionFolios.FindAsync(id);
        if (existing == null) return NotFound();
        
        existing.Almacen = almacen.Almacen;
        existing.FolioAsignado1 = almacen.FolioAsignado1;
        existing.Ubicacion = almacen.Ubicacion;
        existing.FechaActualizacion = DateTime.UtcNow;
        existing.ActualizadoPor = almacen.ActualizadoPor;
        
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/almacenesubicacionfolios/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAlmacen(int id)
    {
        var almacen = await _context.AlmacenesUbicacionFolios.FindAsync(id);
        if (almacen == null) return NotFound();
        
        almacen.Activo = false;
        almacen.FechaActualizacion = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
```

### 4. MODELOS DE ENTIDADES

#### Catalogo.cs
```csharp
public class Catalogo
{
    public int Id { get; set; }
    public string Tipo { get; set; }
    public string Valor { get; set; }
    public bool Activo { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaActualizacion { get; set; }
    public string CreadoPor { get; set; }
    public string ActualizadoPor { get; set; }
}
```

#### AlmacenUbicacionFolio.cs
```csharp
public class AlmacenUbicacionFolio
{
    public int Id { get; set; }
    public string Almacen { get; set; }
    public string FolioAsignado1 { get; set; }
    public string Ubicacion { get; set; }
    public bool Activo { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaActualizacion { get; set; }
    public string CreadoPor { get; set; }
    public string ActualizadoPor { get; set; }
}
```

### 5. CONFIGURACIÓN ApplicationDbContext

```csharp
public class ApplicationDbContext : DbContext
{
    public DbSet<Catalogo> Catalogos { get; set; }
    public DbSet<AlmacenUbicacionFolio> AlmacenesUbicacionFolios { get; set; }

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Catalogo>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Tipo).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Valor).IsRequired().HasMaxLength(255);
            entity.Property(e => e.CreadoPor).HasMaxLength(100);
            entity.Property(e => e.ActualizadoPor).HasMaxLength(100);
        });

        modelBuilder.Entity<AlmacenUbicacionFolio>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Almacen).IsRequired().HasMaxLength(100);
            entity.Property(e => e.FolioAsignado1).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Ubicacion).IsRequired().HasMaxLength(255);
            entity.Property(e => e.CreadoPor).HasMaxLength(100);
            entity.Property(e => e.ActualizadoPor).HasMaxLength(100);
            entity.HasIndex(e => e.Almacen).IsUnique();
        });
    }
}
```

### 6. CONFIGURACIÓN STARTUP.CS

```csharp
public void ConfigureServices(IServiceCollection services)
{
    services.AddDbContext<ApplicationDbContext>(options =>
        options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection")));
    
    services.AddControllers();
    services.AddSwaggerGen();
    
    // CORS para permitir peticiones del frontend
    services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", builder =>
        {
            builder.WithOrigins("http://localhost:3000")
                   .AllowAnyHeader()
                   .AllowAnyMethod();
        });
    });
}

public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    if (env.IsDevelopment())
    {
        app.UseDeveloperExceptionPage();
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseHttpsRedirection();
    app.UseRouting();
    app.UseCors("AllowFrontend");
    app.UseAuthentication();
    app.UseAuthorization();
    
    app.UseEndpoints(endpoints =>
    {
        endpoints.MapControllers();
    });
}
```

### 7. CONNECTION STRING

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=your_server;Database=TruperDB;Trusted_Connection=true;MultipleActiveResultSets=true"
  }
}
```

### 8. VERIFICACIÓN FINAL

1. **Base de Datos**: Ejecutar los scripts SQL para crear tablas e insertar datos iniciales
2. **Backend**: Compilar y ejecutar la API con los nuevos controladores
3. **Frontend**: Verificar que los endpoints funcionen correctamente
4. **Testing**: Probar creación, edición y eliminación de catálogos

### 9. ENDPOINTS DISPONIBLES

```
GET    /api/catalogos/tipo          - Obtener catálogos por tipo
GET    /api/catalogos               - Obtener todos los tipos
POST   /api/catalogos               - Crear catálogo
PUT    /api/catalogos/{id}          - Actualizar catálogo
DELETE /api/catalogos/{id}          - Eliminar catálogo

GET    /api/almacenesubicacionfolios - Obtener almacenes
POST   /api/almacenesubicacionfolios - Crear almacén
PUT    /api/almacenesubicacionfolios/{id} - Actualizar almacén
DELETE /api/almacenesubicacionfolios/{id} - Eliminar almacén
```

¡Todo configurado para que los catálogos funcionen correctamente!
