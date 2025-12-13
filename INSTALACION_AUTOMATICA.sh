#!/bin/bash

echo "============================================"
echo "INSTALACIÓN AUTOMÁTICA TRUPER CAMFRONT"
echo "============================================"
echo

# 1. Verificar SQL Server
echo "[1/6] Verificando SQL Server..."
if ! command -v sqlcmd &> /dev/null; then
    echo "ERROR: sqlcmd no está instalado. Por favor instala Microsoft ODBC Driver for SQL Server"
    exit 1
fi
echo "SQL Server encontrado!"
echo

# 2. Borrar y recrear base de datos
echo "[2/6] Borrando y recreando base de datos..."
sqlcmd -S localhost -E -i "BORRAR_Y_RECREAR_BD.sql"
if [ $? -ne 0 ]; then
    echo "ERROR: No se pudo ejecutar el script SQL"
    exit 1
fi
echo "Base de datos recreada exitosamente!"
echo

# 3. Verificar .NET
echo "[3/6] Verificando .NET SDK..."
if ! command -v dotnet &> /dev/null; then
    echo "ERROR: .NET SDK no está instalado. Por favor instala .NET 8.0 SDK"
    exit 1
fi
echo ".NET SDK encontrado!"
echo

# 4. Crear proyecto backend
echo "[4/6] Creando proyecto backend..."
if [ -d "TruperBack" ]; then
    echo "Eliminando proyecto existente..."
    rm -rf "TruperBack"
fi
mkdir "TruperBack"
cd "TruperBack"
dotnet new webapi --force
echo "Proyecto backend creado!"
echo

# 5. Copiar archivos
echo "[5/6] Copiando archivos del backend..."
cp "../BACKEND_FILES/TruperBack.csproj" "TruperBack.csproj"
cp "../BACKEND_FILES/Program.cs" "Program.cs"
cp "../BACKEND_FILES/ApplicationDbContext.cs" "ApplicationDbContext.cs"

# Crear carpetas y copiar archivos
mkdir -p "Models"
cp "../BACKEND_FILES/User.cs" "Models/User.cs"
cp "../BACKEND_FILES/Role.cs" "Models/Role.cs"
cp "../BACKEND_FILES/Catalogo.cs" "Models/Catalogo.cs"
cp "../BACKEND_FILES/AlmacenUbicacionFolio.cs" "Models/AlmacenUbicacionFolio.cs"

mkdir -p "Controllers"
cp "../BACKEND_FILES/AuthController.cs" "Controllers/AuthController.cs"
cp "../BACKEND_FILES/UsersController.cs" "Controllers/UsersController.cs"
cp "../BACKEND_FILES/CatalogosController.cs" "Controllers/CatalogosController.cs"
cp "../BACKEND_FILES/AlmacenesUbicacionFoliosController.cs" "Controllers/AlmacenesUbicacionFoliosController.cs"

# Crear appsettings.json
cat > appsettings.json << 'EOF'
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
EOF

echo "Archivos copiados exitosamente!"
echo

# 6. Instalar paquetes
echo "[6/6] Instalando paquetes NuGet..."
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Microsoft.EntityFrameworkCore.SqlServer
dotnet add package Microsoft.EntityFrameworkCore.Tools
dotnet add package Swashbuckle.AspNetCore
dotnet add package System.IdentityModel.Tokens.Jwt
echo "Paquetes instalados!"
echo

# 7. Compilar proyecto
echo "[7/7] Compilando proyecto..."
dotnet build
if [ $? -ne 0 ]; then
    echo "ERROR: No se pudo compilar el proyecto"
    exit 1
fi
echo "Proyecto compilado exitosamente!"
echo

# 8. Iniciar backend
echo "============================================"
echo "¡INSTALACIÓN COMPLETADA!"
echo "============================================"
echo
echo "USUARIO ADMIN:"
echo "Username: admin"
echo "Password: Admin123!"
echo
echo "Backend iniciando en:"
echo "http://localhost:5000 (HTTP)"
echo "http://localhost:5001 (HTTPS)"
echo
echo "Swagger UI: http://localhost:5000/swagger"
echo
echo "Presiona Ctrl+C para detener el servidor"
echo "============================================"
echo

dotnet run
