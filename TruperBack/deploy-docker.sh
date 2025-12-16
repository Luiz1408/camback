#!/bin/bash

# Script de despliegue Docker para TruperBack en Ubuntu Server
# Uso: ./deploy-docker.sh [nombre-imagen] [tag]

# Variables por defecto
IMAGE_NAME=${1:-truper-back}
IMAGE_TAG=${2:-latest}
CONTAINER_NAME="truper-back-api"
PORT=8080

echo "=== Despliegue Docker para TruperBack ==="
echo "Imagen: $IMAGE_NAME:$IMAGE_TAG"
echo "Contenedor: $CONTAINER_NAME"
echo "Puerto: $PORT"
echo ""

# 1. Detener y eliminar contenedor existente
echo "1. Deteniendo contenedor existente..."
if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
    echo "Deteniendo contenedor $CONTAINER_NAME..."
    docker stop $CONTAINER_NAME
fi

if docker ps -aq -f name=$CONTAINER_NAME | grep -q .; then
    echo "Eliminando contenedor $CONTAINER_NAME..."
    docker rm $CONTAINER_NAME
fi

# 2. Eliminar imagen anterior (opcional)
echo ""
echo "2. Eliminando imagen anterior..."
if docker images -q $IMAGE_NAME:$IMAGE_TAG | grep -q .; then
    echo "Eliminando imagen $IMAGE_NAME:$IMAGE_TAG..."
    docker rmi $IMAGE_NAME:$IMAGE_TAG
fi

# 3. Construir nueva imagen
echo ""
echo "3. Construyendo nueva imagen Docker..."
docker build -t $IMAGE_NAME:$IMAGE_TAG .

if [ $? -ne 0 ]; then
    echo "ERROR: Falló la construcción de la imagen Docker"
    exit 1
fi

echo "Imagen construida exitosamente"

# 4. Ejecutar nuevo contenedor
echo ""
echo "4. Iniciando nuevo contenedor..."

# Variables de entorno para producción
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:80

docker run -d \
    --name $CONTAINER_NAME \
    --restart unless-stopped \
    -p $PORT:80 \
    -e ASPNETCORE_ENVIRONMENT=$ASPNETCORE_ENVIRONMENT \
    -e ASPNETCORE_URLS=$ASPNETCORE_URLS \
    -e ConnectionStrings__DefaultConnection="Server=10.110.224.35;Database=ExcelProcessorDB;User Id=sa;Password=adm1n.123;TrustServerCertificate=True;" \
    -e JwtSettings__Secret="ExcelProcessorApiSecretKey2024!@#$%^&*()_+" \
    -e JwtSettings__Issuer="ExcelProcessorApi" \
    -e JwtSettings__Audience="ExcelProcessorApiUsers" \
    -e JwtSettings__ExpiryInHours="24" \
    -v /var/log/truper-back:/app/logs \
    --memory=512m \
    --cpus=0.5 \
    $IMAGE_NAME:$IMAGE_TAG

if [ $? -ne 0 ]; then
    echo "ERROR: Falló el inicio del contenedor"
    exit 1
fi

echo ""
echo "=== Despliegue completado ==="
echo "Contenedor iniciado: $CONTAINER_NAME"
echo "URL: http://localhost:$PORT"
echo ""
echo "Verificando estado del contenedor..."
sleep 5

# 5. Verificar estado
echo ""
echo "5. Verificación del contenedor:"
docker ps -f name=$CONTAINER_NAME

echo ""
echo "Logs del contenedor (últimas 10 líneas):"
docker logs --tail 10 $CONTAINER_NAME

echo ""
echo "=== Comandos útiles ==="
echo "Ver logs: docker logs -f $CONTAINER_NAME"
echo "Detener: docker stop $CONTAINER_NAME"
echo "Reiniciar: docker restart $CONTAINER_NAME"
echo "Eliminar: docker rm -f $CONTAINER_NAME"
echo "Entrar al contenedor: docker exec -it $CONTAINER_NAME /bin/bash"
