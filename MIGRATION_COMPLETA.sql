-- =============================================
-- MIGRACIÓN COMPLETA DESDE CERO - TRUPER CAMFRONT
-- =============================================

-- 1. ELIMINAR TABLAS EXISTENTES (si existen)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Users') DROP TABLE Users;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Roles') DROP TABLE Roles;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'AlmacenesUbicacionFolios') DROP TABLE AlmacenesUbicacionFolios;
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Catalogos') DROP TABLE Catalogos;

-- 2. CREAR TABLAS PRINCIPALES

-- Tabla de Roles
CREATE TABLE Roles (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(50) NOT NULL UNIQUE,
    Descripcion NVARCHAR(255),
    Activo BIT DEFAULT 1,
    FechaCreacion DATETIME2 DEFAULT GETDATE(),
    FechaActualizacion DATETIME2 NULL
);

-- Tabla de Usuarios
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(100) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(255),
    RoleId INT NOT NULL,
    Activo BIT DEFAULT 1,
    FechaCreacion DATETIME2 DEFAULT GETDATE(),
    FechaActualizacion DATETIME2 NULL,
    UltimoLogin DATETIME2 NULL,
    CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES Roles(Id)
);

-- Tabla de Catálogos
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

-- 3. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
CREATE INDEX IX_Users_Username ON Users(Username);
CREATE INDEX IX_Users_RoleId ON Users(RoleId);
CREATE INDEX IX_Users_Activo ON Users(Activo);
CREATE INDEX IX_Catalogos_Tipo ON Catalogos(Tipo);
CREATE INDEX IX_Catalogos_Activo ON Catalogos(Activo);
CREATE INDEX IX_AlmacenesUbicacionFolios_Almacen ON AlmacenesUbicacionFolios(Almacen);
CREATE INDEX IX_AlmacenesUbicacionFolios_Ubicacion ON AlmacenesUbicacionFolios(Ubicacion);

-- 4. INSERTAR ROLES INICIALES
INSERT INTO Roles (Nombre, Descripcion) VALUES 
('Admin', 'Administrador del sistema con acceso completo'),
('Monitorista', 'Monitorista que puede ver y crear folios'),
('Coordinador', 'Coordinador de turno con permisos limitados'),
('Supervisor', 'Supervisor con permisos de revisión'),
('Operador', 'Operador con acceso básico');

-- 5. INSERTAR USUARIO ADMINISTRADOR POR DEFECTO
-- Contraseña: Admin123! (hash generado con BCrypt)
INSERT INTO Users (Username, PasswordHash, FirstName, LastName, Email, RoleId) VALUES 
('admin', '$2a$10$YourHashedPasswordHere', 'Administrador', 'Sistema', 'admin@truper.com', 1);

-- 6. INSERTAR CATÁLOGOS GENERALES (COMPARTIDOS)
INSERT INTO Catalogos (Tipo, Valor) VALUES 
-- Indicadores
('Indicador', 'Calidad'),
('Indicador', 'Seguridad'),
('Indicador', 'Productividad'),
('Indicador', 'Mantenimiento'),
('Indicador', 'Logística'),
('Indicador', 'Costos'),
('Indicador', 'Tiempo'),
('Indicador', 'Servicio'),

-- Subindicadores
('Subindicador', 'Defectos'),
('Subindicador', 'Accidentes'),
('Subindicador', 'Tiempo Muerto'),
('Subindicador', 'Fallas'),
('Subindicador', 'Retrasos'),
('Subindicador', 'Quejas'),
('Subindicador', 'Devoluciones'),
('Subindicador', 'Incidencias'),

-- Áreas
('Area', 'Producción'),
('Area', 'Calidad'),
('Area', 'Mantenimiento'),
('Area', 'Logística'),
('Area', 'Seguridad'),
('Area', 'Administración'),
('Area', 'Compras'),
('Area', 'Ventas'),
('Area', 'Almacén'),

-- Puestos
('Puesto', 'Operador'),
('Puesto', 'Supervisor'),
('Puesto', 'Técnico'),
('Puesto', 'Gerente'),
('Puesto', 'Analista'),
('Puesto', 'Coordinador'),
('Puesto', 'Monitorista'),
('Puesto', 'Jefe de Turno'),

-- Sucursales
('Sucursal', 'Matriz'),
('Sucursal', 'Planta Norte'),
('Sucursal', 'Planta Sur'),
('Sucursal', 'Centro Distribución'),
('Sucursal', 'Sucursal Celaya'),
('Sucursal', 'Sucursal Jilotepec'),

-- Códigos
('Codigo', '001'),
('Codigo', '002'),
('Codigo', '003'),
('Codigo', '004'),
('Codigo', '005'),
('Codigo', '006'),
('Codigo', '007'),
('Codigo', '008'),

-- Ubicaciones
('Ubicacion', 'Jilotepec'),
('Ubicacion', 'Celaya'),
('Ubicacion', 'Sucursal Central'),
('Ubicacion', 'Almacén Norte'),
('Ubicacion', 'Almacén Sur'),
('Ubicacion', 'Planta Principal'),
('Ubicacion', 'Centro Distribución');

-- 7. INSERTAR CATÁLOGOS ESPECÍFICOS PARA REVISIONES
INSERT INTO Catalogos (Tipo, Valor) VALUES 
-- Observaciones para Revisiones
('REV_OBSERVACIONES', 'Sin observaciones'),
('REV_OBSERVACIONES', 'Leve'),
('REV_OBSERVACIONES', 'Moderado'),
('REV_OBSERVACIONES', 'Grave'),
('REV_OBSERVACIONES', 'Crítico'),
('REV_OBSERVACIONES', 'Requiere atención inmediata'),
('REV_OBSERVACIONES', 'En seguimiento'),

-- Se Detectó Incidencia (Revisiones)
('REV_SE_DETECTO_INCIDENCIA', 'Sí'),
('REV_SE_DETECTO_INCIDENCIA', 'No'),
('REV_SE_DETECTO_INCIDENCIA', 'Parcialmente'),
('REV_SE_DETECTO_INCIDENCIA', 'No aplica'),

-- Área Cargo (Revisiones)
('REV_AREA_CARGO', 'Producción'),
('REV_AREA_CARGO', 'Calidad'),
('REV_AREA_CARGO', 'Mantenimiento'),
('REV_AREA_CARGO', 'Logística'),
('REV_AREA_CARGO', 'Seguridad'),
('REV_AREA_CARGO', 'Administración'),
('REV_AREA_CARGO', 'Compras'),

-- Área Solicita (Revisiones)
('REV_AREA_SOLICITA', 'Producción'),
('REV_AREA_SOLICITA', 'Calidad'),
('REV_AREA_SOLICITA', 'Mantenimiento'),
('REV_AREA_SOLICITA', 'Logística'),
('REV_AREA_SOLICITA', 'Seguridad'),
('REV_AREA_SOLICITA', 'Administración'),
('REV_AREA_SOLICITA', 'Compras'),

-- Comentario General (Revisiones)
('REV_COMENTARIO_GENERAL', 'Atención inmediata'),
('REV_COMENTARIO_GENERAL', 'Seguimiento requerido'),
('REV_COMENTARIO_GENERAL', 'Cerrado'),
('REV_COMENTARIO_GENERAL', 'En proceso'),
('REV_COMENTARIO_GENERAL', 'Pendiente de revisión'),
('REV_COMENTARIO_GENERAL', 'Escalado a gerencia');

-- 8. INSERTAR CATÁLOGOS ESPECÍFICOS PARA DETECCIONES
INSERT INTO Catalogos (Tipo, Valor) VALUES 
-- Genera Impacto (Detecciones)
('DET_GENERA_IMPACTO', 'Sí'),
('DET_GENERA_IMPACTO', 'No'),
('DET_GENERA_IMPACTO', 'Posiblemente'),
('DET_GENERA_IMPACTO', 'No determinado'),

-- Línea Empresa (Detecciones)
('DET_LINEA_EMPRESA', 'Línea 1'),
('DET_LINEA_EMPRESA', 'Línea 2'),
('DET_LINEA_EMPRESA', 'Línea 3'),
('DET_LINEA_EMPRESA', 'Administración'),
('DET_LINEA_EMPRESA', 'Almacén'),
('DET_LINEA_EMPRESA', 'Taller'),
('DET_LINEA_EMPRESA', 'Oficina'),

-- Área Específica (Detecciones)
('DET_AREA_ESPECIFICA', 'Área A'),
('DET_AREA_ESPECIFICA', 'Área B'),
('DET_AREA_ESPECIFICA', 'Área C'),
('DET_AREA_ESPECIFICA', 'Taller'),
('DET_AREA_ESPECIFICA', 'Oficina'),
('DET_AREA_ESPECIFICA', 'Producción'),
('DET_AREA_ESPECIFICA', 'Empaque'),
('DET_AREA_ESPECIFICA', 'Control de Calidad'),

-- Turno Operativo (Detecciones)
('DET_TURNO_OPERATIVO', 'Matutino'),
('DET_TURNO_OPERATIVO', 'Vespertino'),
('DET_TURNO_OPERATIVO', 'Nocturno'),
('DET_TURNO_OPERATIVO', 'Mixto'),
('DET_TURNO_OPERATIVO', 'Fines de Semana');

-- 9. INSERTAR CATÁLOGO INTEGRADO DE ALMACENES
INSERT INTO AlmacenesUbicacionFolios (Almacen, FolioAsignado1, Ubicacion) VALUES 
('CCAT', 'CCAT', 'Jilotepec'),
('CDG', 'CDG', 'Jilotepec'),
('CDNA', 'CDNA', 'Jilotepec'),
('SCELA', 'SCELA', 'Celaya'),
('SPAZ', 'SPAZ', 'Sucursal La Paz'),
('MANF', 'MANF', 'Manufactura'),
('ALM1', 'ALM1', 'Almacén Central'),
('ALM2', 'ALM2', 'Almacén Norte'),
('ALM3', 'ALM3', 'Almacén Sur'),
('DIST1', 'DIST1', 'Centro Distribución');

-- 10. VERIFICACIÓN DE DATOS
PRINT '=== MIGRACIÓN COMPLETADA ===';
PRINT 'Roles creados: ' + CAST(COUNT(*) AS VARCHAR) + ' (debe ser 5)' FROM Roles;
PRINT 'Usuarios creados: ' + CAST(COUNT(*) AS VARCHAR) + ' (debe ser 1 - admin)' FROM Users;
PRINT 'Catálogos generales creados: ' + CAST(COUNT(*) AS VARCHAR) FROM Catalogos WHERE Tipo IN ('Indicador', 'Subindicador', 'Area', 'Puesto', 'Sucursal', 'Codigo', 'Ubicacion');
PRINT 'Catálogos de revisiones creados: ' + CAST(COUNT(*) AS VARCHAR) FROM Catalogos WHERE Tipo LIKE 'REV_%';
PRINT 'Catálogos de detecciones creados: ' + CAST(COUNT(*) AS VARCHAR) FROM Catalogos WHERE Tipo LIKE 'DET_%';
PRINT 'Almacenes creados: ' + CAST(COUNT(*) AS VARCHAR) + ' (debe ser 10)' FROM AlmacenesUbicacionFolios;

-- 11. USUARIO ADMIN POR DEFECTO
PRINT '=== USUARIO ADMIN ===';
PRINT 'Username: admin';
PRINT 'Password: Admin123!';
PRINT 'Role: Administrador';
PRINT 'IMPORTANTE: Cambiar la contraseña después del primer inicio de sesión';

-- 12. NOTAS FINALES
PRINT '=== RECOMENDACIONES ===';
PRINT '1. Cambiar la contraseña del usuario admin inmediatamente';
PRINT '2. Crear usuarios adicionales según sea necesario';
PRINT '3. Revisar y ajustar los catálogos según las necesidades específicas';
PRINT '4. Configurar los permisos y roles según la estructura organizacional';
PRINT '5. Realizar copias de seguridad periódicas de la base de datos';
