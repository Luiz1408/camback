# Despliegue Docker para TruperBack en Ubuntu Server

## Requisitos previos en Ubuntu Server

1. **Instalar Docker**
```bash
# Actualizar paquetes
sudo apt update

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Iniciar y habilitar Docker
sudo systemctl start docker
sudo systemctl enable docker

# Agregar usuario al grupo docker (opcional)
sudo usermod -aG docker $USER
```

2. **Verificar instalación**
```bash
docker --version
docker-compose --version
```

## Pasos de despliegue

### 1. Transferir archivos al servidor
```bash
# Opción 1: Usar scp
scp -r TruperBack/ usuario@servidor:/home/usuario/

# Opción 2: Clonar desde GitHub
git clone https://github.com/Luiz1408/Truper_CAM.git
cd Truper_CAM/TruperBack
git checkout prueba-server
```

### 2. Preparar el entorno
```bash
# Crear directorio para logs
sudo mkdir -p /var/log/truper-back
sudo chmod 755 /var/log/truper-back

# Dar permisos al script de despliegue
chmod +x deploy-docker.sh
```

### 3. Ejecutar despliegue
```bash
# Despliegue básico
./deploy-docker.sh

# O con nombre y tag personalizados
./deploy-docker.sh truper-back v1.0.0
```

### 4. Verificar funcionamiento
```bash
# Ver contenedor corriendo
docker ps

# Ver logs
docker logs -f truper-back-api

# Probar API
curl http://localhost:8080/api/User/authenticate
```

## Configuración de variables de entorno

Para modificar la configuración, edita el archivo `.env.docker` o pasa las variables directamente al script:

```bash
# Variables principales
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=Server=10.208.212.37;Database=ExcelProcessorDB;User Id=sa;Password=adm1n.123;TrustServerCertificate=True;
JwtSettings__Secret=TU_SECRETO_JWT
```

## Comandos útiles

### Gestión del contenedor
```bash
# Detener
docker stop truper-back-api

# Reiniciar
docker restart truper-back-api

# Eliminar
docker rm -f truper-back-api

# Ver logs en tiempo real
docker logs -f truper-back-api

# Entrar al contenedor
docker exec -it truper-back-api /bin/bash
```

### Actualización
```bash
# Descargar nueva versión
git pull origin prueba-server

# Redesplegar
./deploy-docker.sh
```

### Monitoreo
```bash
# Ver uso de recursos
docker stats truper-back-api

# Ver información del contenedor
docker inspect truper-back-api
```

## Solución de problemas

### Problemas comunes

1. **Error de conexión a base de datos**
   - Verificar cadena de conexión
   - Confirmar que el servidor SQL sea accesible desde Ubuntu

2. **Error de permisos**
   - Asegurar que Docker tiene permisos suficientes
   - Verificar directorios de volúmenes

3. **Contenedor no inicia**
   - Revisar logs: `docker logs truper-back-api`
   - Verificar variables de entorno

### Logs y diagnóstico
```bash
# Logs completos
docker logs truper-back-api

# Últimas 50 líneas
docker logs --tail 50 truper-back-api

# Logs con timestamp
docker logs --timestamps truper-back-api
```

## Configuración de Nginx (opcional)

Si usas Nginx como proxy reverso:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Seguridad

1. **Cambiar contraseñas por defecto**
2. **Usar HTTPS con certificados SSL**
3. **Configurar firewall para permitir solo puertos necesarios**
4. **Limitar recursos del contenedor**
5. **Regularmente actualizar imágenes Docker**
