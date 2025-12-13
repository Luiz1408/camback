# IMPLEMENTACIÓN COMPLETA TRUPER BACKEND

## PASOS PARA IMPLEMENTAR

### 1. EJECUTAR MIGRACIÓN SQL
```sql
-- Ejecutar el archivo MIGRATION_COMPLETA.sql en SQL Server Management Studio
-- Esto creará todas las tablas e insertará datos iniciales
```

### 2. CREAR PROYECTO .NET
```bash
# Crear nuevo proyecto Web API
dotnet new webapi -n TruperBack

# Copiar archivos creados a la carpeta del proyecto:
# - TruperBack.csproj
# - Program.cs
# - ApplicationDbContext.cs
# - Models/ (User.cs, Role.cs, Catalogo.cs, AlmacenUbicacionFolio.cs)
# - Controllers/ (AuthController.cs, UsersController.cs, CatalogosController.cs, AlmacenesUbicacionFoliosController.cs)
# - appsettings.json (crear manualmente)
```

### 3. INSTALAR PAQUETES NUGET
```bash
cd TruperBack
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Tools
dotnet add package Swashbuckle.AspNetCore
dotnet add package System.IdentityModel.Tokens.Jwt
```

### 4. CONFIGURAR appsettings.json
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=TruperDB;Trusted_Connection=true;MultipleActiveResultSets=true;TrustServerCertificate=true"
  },
  "JwtSettings": {
    "SecretKey": "YourSuperSecretKeyThatShouldBeAtLeast32CharactersLong!",
    "Issuer": "TruperAPI",
    "Audience": "TruperUsers",
    "ExpirationHours": 24
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

### 5. COMPILAR Y EJECUTAR
```bash
dotnet build
dotnet run
```

### 6. VERIFICAR ENDPOINTS
- Swagger: http://localhost:5000 o http://localhost:5001
- Login: POST /api/auth/login
- Register: POST /api/auth/register
- Catálogos: GET /api/catalogos/tipo
- Usuarios: GET /api/users

## USUARIO ADMIN POR DEFECTO
- **Username**: admin
- **Password**: Admin123!
- **Role**: Administrador

## ENDPOINTS DISPONIBLES

### Autenticación
- POST /api/auth/login - Iniciar sesión
- POST /api/auth/register - Registrar usuario
- GET /api/auth/roles - Obtener roles

### Usuarios
- GET /api/users - Obtener todos los usuarios
- GET /api/users/role/{role} - Obtener usuarios por rol
- GET /api/users/{id} - Obtener usuario por ID
- POST /api/users - Crear usuario
- PUT /api/users/{id} - Actualizar usuario
- PUT /api/users/{id}/password - Cambiar contraseña
- DELETE /api/users/{id} - Eliminar usuario

### Catálogos
- GET /api/catalogos/{tipo} - Obtener catálogos por tipo
- GET /api/catalogos - Obtener todos los tipos
- POST /api/catalogos - Crear catálogo
- PUT /api/catalogos/{id} - Actualizar catálogo
- DELETE /api/catalogos/{id} - Eliminar catálogo

### Almacenes + Folios + Ubicaciones
- GET /api/almacenesubicacionfolios - Obtener almacenes
- GET /api/almacenesubicacionfolios/{id} - Obtener almacén por ID
- POST /api/almacenesubicacionfolios - Crear almacén
- PUT /api/almacenesubicacionfolios/{id} - Actualizar almacén
- DELETE /api/almacenesubicacionfolios/{id} - Eliminar almacén

## IMPORTANTE
1. **CAMBIAR CONTRASEÑA ADMIN**: Cambiar inmediatamente la contraseña del usuario admin
2. **BCRYPT**: Implementar hashing real de contraseñas con BCrypt
3. **JWT KEY**: Cambiar la clave secreta de JWT en producción
4. **CORS**: Ajustar configuración CORS según necesidad
5. **VALIDACIONES**: Agregar validaciones adicionales según requerimientos

## FRONTEND CONFIGURADO
El frontend ya está configurado para conectar con:
- http://localhost:5236/api (base URL)
- Autenticación JWT
- Catálogos unificados y compartidos
- Formularios de revisión y detección

¡TODO LISTO PARA FUNCIONAR!
