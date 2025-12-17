#!/bin/bash

# Script de despliegue para Truper API en producción
# Autor: Sistema de Despliegue Automático
# Fecha: $(date)

set -e  # Detener el script si hay errores

# Variables de configuración
IMAGE_NAME="truper-api"
CONTAINER_NAME="truper-api-container"
PORT="8080"
LOG_FILE="/var/log/truper-api-deploy.log"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función de logging
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Verificar si Docker está instalado
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker no está instalado. Por favor instala Docker primero."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker no está corriendo. Por favor inicia el servicio Docker."
        exit 1
    fi
    
    log "Docker está instalado y corriendo correctamente"
}

# Detener y eliminar contenedor existente
stop_container() {
    log "Deteniendo contenedor existente..."
    
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        docker stop "$CONTAINER_NAME" || warning "No se pudo detener el contenedor"
        log "Contenedor detenido"
    fi
    
    if docker ps -aq -f name="$CONTAINER_NAME" | grep -q .; then
        docker rm "$CONTAINER_NAME" || warning "No se pudo eliminar el contenedor"
        log "Contenedor eliminado"
    fi
}

# Eliminar imagen existente
remove_image() {
    log "Eliminando imagen existente..."
    
    if docker images -q "$IMAGE_NAME" | grep -q .; then
        docker rmi "$IMAGE_NAME:latest" || warning "No se pudo eliminar la imagen"
        log "Imagen eliminada"
    fi
}

# Construir nueva imagen
build_image() {
    log "Construyendo nueva imagen Docker..."
    
    if ! docker build -t "$IMAGE_NAME:latest" .; then
        error "Falló la construcción de la imagen Docker"
        exit 1
    fi
    
    log "Imagen construida exitosamente"
}

# Ejecutar nuevo contenedor
run_container() {
    log "Iniciando nuevo contenedor..."
    
    # Crear directorios necesarios si no existen
    sudo mkdir -p /var/log/truper-api
    sudo mkdir -p /var/uploads/truper-api
    
    # Ejecutar contenedor con configuración de producción
    docker run -d \
        --name "$CONTAINER_NAME" \
        --restart unless-stopped \
        -p "$PORT:80" \
        -v /var/log/truper-api:/app/logs \
        -v /var/uploads/truper-api:/app/wwwroot/uploads \
        --env ASPNETCORE_ENVIRONMENT=Production \
        --env ASPNETCORE_URLS=http://+:80 \
        --env ConnectionStrings__DefaultConnection="Server=10.208.212.37;Database=ExcelProcessorDB;User Id=sa;Password=adm1n.123;TrustServerCertificate=True;Connect Timeout=30;Encrypt=True;" \
        --env JwtSettings__Secret="ExcelProcessorApiSecretKey2024!@#$%^&*()_+" \
        --env JwtSettings__Issuer="ExcelProcessorApi" \
        --env JwtSettings__Audience="ExcelProcessorApiUsers" \
        --env JwtSettings__ExpiryInHours="24" \
        --memory="512m" \
        --cpus="1.0" \
        "$IMAGE_NAME:latest"
    
    log "Contenedor iniciado exitosamente"
}

# Verificar que el contenedor esté corriendo
verify_container() {
    log "Verificando estado del contenedor..."
    
    sleep 10  # Esperar a que el contenedor inicie completamente
    
    if docker ps -f name="$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "$CONTAINER_NAME"; then
        log "Contenedor está corriendo correctamente"
        
        # Verificar salud del contenedor
        if docker exec "$CONTAINER_NAME" curl -f http://localhost:80/swagger/index.html > /dev/null 2>&1; then
            log "API está respondiendo correctamente"
        else
            warning "API no está respondiendo, pero el contenedor está corriendo"
        fi
    else
        error "El contenedor no está corriendo"
        docker logs "$CONTAINER_NAME" | tail -20
        exit 1
    fi
}

# Mostrar información de despliegue
show_deployment_info() {
    log "=== INFORMACIÓN DE DESPLIEGUE ==="
    log "Imagen: $IMAGE_NAME:latest"
    log "Contenedor: $CONTAINER_NAME"
    log "Puerto: $PORT"
    log "URL: http://localhost:$PORT"
    log "Swagger: http://localhost:$PORT/swagger"
    log "Logs: docker logs $CONTAINER_NAME"
    log "==============================="
}

# Función principal
main() {
    log "Iniciando proceso de despliegue de Truper API..."
    
    check_docker
    stop_container
    remove_image
    build_image
    run_container
    verify_container
    show_deployment_info
    
    log "¡Despliegue completado exitosamente!"
}

# Ejecutar función principal
main "$@"
