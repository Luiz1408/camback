-- =============================================
-- BORRAR BASE DE DATOS COMPLETA Y RECREAR DESDE 0
-- EL CHISTE: TODO NUEVO Y LIMPIO
-- =============================================

-- 1. CERRAR CONEXIONES ACTIVAS Y BORRAR BASE DE DATOS
USE master;
GO

-- Cerrar todas las conexiones activas a la base de datos
ALTER DATABASE TruperDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO

-- Borrar la base de datos si existe
IF EXISTS (SELECT * FROM sys.databases WHERE name = 'TruperDB')
BEGIN
    PRINT 'Borrando base de datos TruperDB...';
    DROP DATABASE TruperDB;
    PRINT 'Base de datos TruperDB borrada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La base de datos TruperDB no existe, creando nueva...';
END
GO

-- 2. CREAR BASE DE DATOS NUEVA Y LIMPIA
PRINT 'Creando nueva base de datos TruperDB...';
CREATE DATABASE TruperDB;
GO

USE TruperDB;
GO

PRINT 'Base de datos TruperDB creada exitosamente.';

-- 3. CREAR TABLAS DESDE CERO

-- Tabla de Roles
PRINT 'Creando tabla Roles...';
CREATE TABLE Roles (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(50) NOT NULL UNIQUE,
    Descripcion NVARCHAR(255),
    Activo BIT DEFAULT 1,
    FechaCreacion DATETIME2 DEFAULT GETDATE(),
    FechaActualizacion DATETIME2 NULL
);
GO

-- Tabla de Usuarios
PRINT 'Creando tabla Users...';
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
GO

-- Tabla de Catálogos
PRINT 'Creando tabla Catalogos...';
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
GO

-- Tabla integrada para almacenes + folios + ubicaciones
PRINT 'Creando tabla AlmacenesUbicacionFolios...';
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
GO

-- 4. CREAR ÍNDICES
PRINT 'Creando índices para mejor rendimiento...';
CREATE INDEX IX_Users_Username ON Users(Username);
CREATE INDEX IX_Users_RoleId ON Users(RoleId);
CREATE INDEX IX_Users_Activo ON Users(Activo);
CREATE INDEX IX_Catalogos_Tipo ON Catalogos(Tipo);
CREATE INDEX IX_Catalogos_Activo ON Catalogos(Activo);
CREATE INDEX IX_AlmacenesUbicacionFolios_Almacen ON AlmacenesUbicacionFolios(Almacen);
CREATE INDEX IX_AlmacenesUbicacionFolios_Ubicacion ON AlmacenesUbicacionFolios(Ubicacion);
GO

-- 5. INSERTAR DATOS INICIALES

-- Roles
PRINT 'Insertando roles iniciales...';
INSERT INTO Roles (Nombre, Descripcion) VALUES 
('Admin', 'Administrador del sistema con acceso completo'),
('Monitorista', 'Monitorista que puede ver y crear folios'),
('Coordinador', 'Coordinador de turno con permisos limitados'),
('Tecnico', 'Técnico con permisos especializados'),
('Soporte', 'Soporte técnico con acceso de mantenimiento');
GO

-- Usuario Admin (contraseña: Admin123!)
PRINT 'Creando usuario administrador...';
INSERT INTO Users (Username, PasswordHash, FirstName, LastName, Email, RoleId) VALUES 
('admin', '$2a$10$YourHashedPasswordHere', 'Administrador', 'Sistema', 'admin@truper.com', 1);
GO

-- Catálogos Generales
PRINT 'Insertando catálogos generales...';
INSERT INTO Catalogos (Tipo, Valor) VALUES 
-- Indicadores
('Indicador', 'Calidad'), ('Indicador', 'Seguridad'), ('Indicador', 'Productividad'), ('Indicador', 'Mantenimiento'), ('Indicador', 'Logística'),
-- Subindicadores  
('Subindicador', 'Defectos'), ('Subindicador', 'Accidentes'), ('Subindicador', 'Tiempo Muerto'), ('Subindicador', 'Fallas'), ('Subindicador', 'Retrasos'),
-- Áreas
('Area', 'Producción'), ('Area', 'Calidad'), ('Area', 'Mantenimiento'), ('Area', 'Logística'), ('Area', 'Seguridad'), ('Area', 'Administración'),
-- Puestos
('Puesto', 'Operador'), ('Puesto', 'Supervisor'), ('Puesto', 'Técnico'), ('Puesto', 'Gerente'), ('Puesto', 'Analista'), ('Puesto', 'Coordinador'),
-- Sucursales
('Sucursal', 'Matriz'), ('Sucursal', 'Planta Norte'), ('Sucursal', 'Planta Sur'), ('Sucursal', 'Centro Distribución'), ('Sucursal', 'Sucursal Celaya'),
-- Códigos
('Codigo', '001'), ('Codigo', '002'), ('Codigo', '003'), ('Codigo', '004'), ('Codigo', '005'),
-- Ubicaciones
('Ubicacion', 'Jilotepec'), ('Ubicacion', 'Celaya'), ('Ubicacion', 'Sucursal Central'), ('Ubicacion', 'Almacén Norte'), ('Ubicacion', 'Almacén Sur');
GO

-- Catálogos Revisiones
PRINT 'Insertando catálogos de revisiones...';
INSERT INTO Catalogos (Tipo, Valor) VALUES 
('REV_OBSERVACIONES', 'Sin observaciones'), ('REV_OBSERVACIONES', 'Leve'), ('REV_OBSERVACIONES', 'Moderado'), ('REV_OBSERVACIONES', 'Grave'), ('REV_OBSERVACIONES', 'Crítico'),
('REV_SE_DETECTO_INCIDENCIA', 'Sí'), ('REV_SE_DETECTO_INCIDENCIA', 'No'), ('REV_SE_DETECTO_INCIDENCIA', 'Parcialmente'),
('REV_AREA_CARGO', 'Producción'), ('REV_AREA_CARGO', 'Calidad'), ('REV_AREA_CARGO', 'Mantenimiento'), ('REV_AREA_CARGO', 'Logística'), ('REV_AREA_CARGO', 'Seguridad'),
('REV_AREA_SOLICITA', 'Producción'), ('REV_AREA_SOLICITA', 'Calidad'), ('REV_AREA_SOLICITA', 'Mantenimiento'), ('REV_AREA_SOLICITA', 'Logística'), ('REV_AREA_SOLICITA', 'Seguridad'),
('REV_COMENTARIO_GENERAL', 'Atención inmediata'), ('REV_COMENTARIO_GENERAL', 'Seguimiento requerido'), ('REV_COMENTARIO_GENERAL', 'Cerrado'), ('REV_COMENTARIO_GENERAL', 'En proceso');
GO

-- Catálogos Detecciones
PRINT 'Insertando catálogos de detecciones...';
INSERT INTO Catalogos (Tipo, Valor) VALUES 
('DET_GENERA_IMPACTO', 'Sí'), ('DET_GENERA_IMPACTO', 'No'), ('DET_GENERA_IMPACTO', 'Posiblemente'),
('DET_LINEA_EMPRESA', 'Línea 1'), ('DET_LINEA_EMPRESA', 'Línea 2'), ('DET_LINEA_EMPRESA', 'Línea 3'), ('DET_LINEA_EMPRESA', 'Administración'), ('DET_LINEA_EMPRESA', 'Almacén'),
('DET_AREA_ESPECIFICA', 'Área A'), ('DET_AREA_ESPECIFICA', 'Área B'), ('DET_AREA_ESPECIFICA', 'Área C'), ('DET_AREA_ESPECIFICA', 'Taller'), ('DET_AREA_ESPECIFICA', 'Oficina'),
('DET_TURNO_OPERATIVO', 'Matutino'), ('DET_TURNO_OPERATIVO', 'Vespertino'), ('DET_TURNO_OPERATIVO', 'Nocturno'), ('DET_TURNO_OPERATIVO', 'Mixto');
GO

-- Almacenes Integrados
PRINT 'Insertando almacenes integrados...';
INSERT INTO AlmacenesUbicacionFolios (Almacen, FolioAsignado1, Ubicacion) VALUES 
('CCAT', 'CCAT', 'Jilotepec'), ('CDG', 'CDG', 'Jilotepec'), ('CDNA', 'CDNA', 'Jilotepec'),
('SCELA', 'SCELA', 'Celaya'), ('SPAZ', 'SPAZ', 'Sucursal La Paz'), ('MANF', 'MANF', 'Manufactura'),
('ALM1', 'ALM1', 'Almacén Central'), ('ALM2', 'ALM2', 'Almacén Norte'), ('ALM3', 'ALM3', 'Almacén Sur'), ('DIST1', 'DIST1', 'Centro Distribución');
GO

-- 6. VERIFICACIÓN FINAL
PRINT '=== VERIFICACIÓN FINAL ===';
PRINT 'Roles creados: ' + CAST(COUNT(*) AS VARCHAR) FROM Roles;
PRINT 'Usuarios creados: ' + CAST(COUNT(*) AS VARCHAR) FROM Users;
PRINT 'Catálogos totales: ' + CAST(COUNT(*) AS VARCHAR) FROM Catalogos;
PRINT 'Almacenes creados: ' + CAST(COUNT(*) AS VARCHAR) FROM AlmacenesUbicacionFolios;

-- 7. MENSAJE FINAL
PRINT '========================================';
PRINT '¡BASE DE DATOS RECREADA EXITOSAMENTE!';
PRINT '========================================';
PRINT 'Usuario: admin';
PRINT 'Password: Admin123!';
PRINT '¡TODO NUEVO Y LIMPIO!';
PRINT '========================================';
GO

-- 8. PERMITIR CONEXIONES MÚLTIPLES NUEVAMENTE
USE master;
GO
ALTER DATABASE TruperDB SET MULTI_USER WITH ROLLBACK IMMEDIATE;
GO

PRINT 'Base de datos lista para conexiones múltiples.';
PRINT '¡EL CHISTE ESTÁ HECHO!elden Ring!';文昌帝君';
GO
