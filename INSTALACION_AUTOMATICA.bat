@echo off
echo ============================================
echo INSTALACIÓN AUTOMÁTICA TRUPER CAMFRONT
echo ============================================
echo.

REM 1. Borrar y recrear base de datos
echo [1/5] Borrando y recreando base de datos...
sqlcmd -S localhost -E -i "BORRAR_Y_RECREAR_BD.sql"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: No se pudo ejecutar el script SQL
    pause
    exit /b 1
)
echo Base de datos recreada exitosamente!
echo.

REM 2. Crear proyecto backend
echo [2/5] Creando proyecto backend...
if exist "TruperBack" (
    echo Eliminando proyecto existente...
    rmdir /s /q "TruperBack"
)
mkdir "TruperBack"
cd "TruperBack"
dotnet new webapi --force
echo Proyecto backend creado!
echo.

REM 3. Copiar archivos
echo [3/5] Copiando archivos del backend...
copy "..\BACKEND_FILES\TruperBack.csproj" "TruperBack.csproj"
copy "..\BACKEND_FILES\Program.cs" "Program.cs"
copy "..\BACKEND_FILES\ApplicationDbContext.cs" "ApplicationDbContext.cs"

REM Crear carpetas y copiar archivos
mkdir "Models"
copy "..\BACKEND_FILES\User.cs" "Models\User.cs"
copy "..\BACKEND_FILES\Role.cs" "Models\Role.cs"
copy "..\BACKEND_FILES\Catalogo.cs" "Models\Catalogo.cs"
copy "..\BACKEND_FILES\AlmacenUbicacionFolio.cs" "Models\AlmacenUbicacionFolio.cs"

mkdir "Controllers"
copy "..\BACKEND_FILES\AuthController.cs" "Controllers\AuthController.cs"
copy "..\BACKEND_FILES\UsersController.cs" "Controllers\UsersController.cs"
copy "..\BACKEND_FILES\CatalogosController.cs" "Controllers\CatalogosController.cs"
copy "..\BACKEND_FILES\AlmacenesUbicacionFoliosController.cs" "Controllers\AlmacenesUbicacionFoliosController.cs"

REM Crear appsettings.json manualmente
echo { > appsettings.json
echo   "ConnectionStrings": { >> appsettings.json
echo     "DefaultConnection": "Server=localhost;Database=TruperDB;Trusted_Connection=true;MultipleActiveResultSets=true;TrustServerCertificate=true" >> appsettings.json
echo   }, >> appsettings.json
echo   "JwtSettings": { >> appsettings.json
echo     "SecretKey": "YourSuperSecretKeyThatShouldBeAtLeast32CharactersLong!", >> appsettings.json
echo     "Issuer": "TruperAPI", >> appsettings.json
echo     "Audience": "TruperUsers", >> appsettings.json
echo     "ExpirationHours": 24 >> appsettings.json
echo   }, >> appsettings.json
echo   "Logging": { >> appsettings.json
echo     "LogLevel": { >> appsettings.json
echo       "Default": "Information", >> appsettings.json
echo       "Microsoft.AspNetCore": "Warning" >> appsettings.json
echo     } >> appsettings.json
echo   }, >> appsettings.json
echo   "AllowedHosts": "*" >> appsettings.json
echo } >> appsettings.json

echo Archivos copiados exitosamente!
echo.

REM 4. Instalar paquetes
echo [4/5] Instalando paquetes NuGet...
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Tools
dotnet add package Swashbuckle.AspNetCore
dotnet add package System.IdentityModel.Tokens.Jwt
echo Paquetes instalados!
echo.

REM 5. Compilar proyecto
echo [5/5] Compilando proyecto...
dotnet build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: No se pudo compilar el proyecto
    pause
    exit /b 1
)
echo Proyecto compilado exitosamente!
echo.

REM 6. Iniciar backend
echo ============================================
echo ¡INSTALACIÓN COMPLETADA!
echo ============================================
echo.
echo USUARIO ADMIN:
echo Username: admin
echo Password: Admin123!
echo.
echo Backend iniciando en:
echo http://localhost:5000 (HTTP)
echo http://localhost:5001 (HTTPS)
echo.
echo Swagger UI: http://localhost:5000/swagger
echo.
echo Presiona Ctrl+C para detener el servidor
echo ============================================
echo.

dotnet run
