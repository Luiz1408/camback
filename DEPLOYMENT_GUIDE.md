# Guía de Despliegue - Truper CAM en Ubuntu Server

## Arquitectura Recomendada

```
Tu PC (desarrollo) → Git (develop/main) → Servidor Ubuntu (producción)
```

## Requisitos Previos

### Servidor Ubuntu
- Ubuntu 20.04+ o 22.04+
- 2GB RAM mínimo (4GB recomendado)
- 20GB disco mínimo
- Acceso SSH con sudo

### Software necesario
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar herramientas básicas
sudo apt install -y curl wget git unzip nginx
```

## 1. Configurar Base de Datos

### Opción A: SQL Server en Ubuntu
```bash
# Instalar SQL Server
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
sudo add-apt-repository "$(wget -qO- https://packages.microsoft.com/config/ubuntu/20.04/mssql-server-2019.list)"
sudo apt update
sudo apt install -y mssql-server

# Configurar
sudo /opt/mssql/bin/mssql-conf setup
# Elegir: 2) Developer (gratis)
# Configurar contraseña SA: TuContraseñaSegura123!

# Habilitar servicio
sudo systemctl enable mssql-server
sudo systemctl start mssql-server

# Instalar herramientas SQL
sudo apt install -y mssql-tools unixodbc-dev
```

### Opción B: PostgreSQL (más simple)
```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres createuser --interactive
sudo -u postgres createdb truper_cam
```

## 2. Configurar Backend (.NET Core)

```bash
# Instalar .NET 8
wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt update
sudo apt install -y dotnet-sdk-8.0

# Crear directorio de aplicación
sudo mkdir -p /var/www/truper-cam/backend
sudo chown $USER:$USER /var/www/truper-cam/backend

# Clonar y compilar
cd /var/www/truper-cam/backend
git clone <tu-repo-backend> .
dotnet restore
dotnet publish -c Release -o /var/www/truper-cam/backend/published

# Crear servicio systemd
sudo nano /etc/systemd/system/truper-cam-backend.service
```

### Archivo de servicio:
```ini
[Unit]
Description=Truper CAM Backend
After=network.target

[Service]
Type=notify
WorkingDirectory=/var/www/truper-cam/backend/published
ExecStart=/usr/bin/dotnet /var/www/truper-cam/backend/published/TruperBack.dll
Restart=always
RestartSec=10
User=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5000

[Install]
WantedBy=multi-user.target
```

```bash
# Habilitar e iniciar servicio
sudo systemctl daemon-reload
sudo systemctl enable truper-cam-backend
sudo systemctl start truper-cam-backend
sudo systemctl status truper-cam-backend
```

## 3. Configurar Frontend (React)

```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Crear directorio
sudo mkdir -p /var/www/truper-cam/frontend
sudo chown $USER:$USER /var/www/truper-cam/frontend

# Clonar y compilar
cd /var/www/truper-cam/frontend
git clone <tu-repo-frontend> .
npm install
npm run build

# Configurar Nginx
sudo nano /etc/nginx/sites-available/truper-cam
```

### Configuración Nginx:
```nginx
server {
    listen 80;
    server_name tu-dominio.com;  # o tu IP

    # Frontend
    location / {
        root /var/www/truper-cam/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/truper-cam /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 4. Configurar Firewall

```bash
# Habilitar puertos necesarios
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS (opcional)
sudo ufw allow 1433  # SQL Server (si es externo)
sudo ufw enable
```

## 5. Variables de Entorno

Crear `/var/www/truper-cam/backend/.env`:
```env
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=Server=localhost;Database=truper_cam;User Id=sa;Password=TuContraseñaSegura123!;
JWT__Secret=tu-secreto-jwt-muy-largo-y-seguro
JWT__Issuer=TruperCAM
JWT__Audience=TruperUsers
JWT__Expiry=24
```

## 6. Flujo de Trabajo (Git)

```bash
# En tu PC local
git checkout develop
# Trabajar en desarrollo...
git add .
git commit -m "nueva funcionalidad"
git push origin develop

# Para producción
git checkout main
git merge develop
git push origin main

# En servidor (automatizar con script)
cd /var/www/truper-cam/backend
git pull origin main
dotnet publish -c Release -o published
sudo systemctl restart truper-cam-backend

cd /var/www/truper-cam/frontend
git pull origin main
npm run build
sudo systemctl reload nginx
```

## 7. Scripts de Despliegue Automático

Crear `/home/tu-usuario/deploy.sh`:
```bash
#!/bin/bash
echo "Iniciando despliegue..."

# Backend
cd /var/www/truper-cam/backend
git pull origin main
dotnet publish -c Release -o published --no-restore
sudo systemctl restart truper-cam-backend

# Frontend
cd /var/www/truper-cam/frontend
git pull origin main
npm ci --production
npm run build
sudo systemctl reload nginx

echo "Despliegue completado!"
```

```bash
chmod +x /home/tu-usuario/deploy.sh
```

## 8. SSL (Opcional pero recomendado)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

## 9. Monitoreo Básico

```bash
# Ver logs del backend
sudo journalctl -u truper-cam-backend -f

# Ver logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Ver estado servicios
sudo systemctl status truper-cam-backend nginx
```

## 10. Resumen de Puertos

| Servicio | Puerto | Nota |
|----------|--------|------|
| SSH | 22 | Administración |
| HTTP | 80 | Web |
| HTTPS | 443 | Web (SSL) |
| Backend | 5000 | Solo localhost |
| SQL Server | 1433 | Solo localhost |

## Pruebas Rápidas

1. **Backend**: `curl http://localhost:5000/api/weatherforecast`
2. **Frontend**: Visita `http://tu-ip` en navegador
3. **Logs**: `sudo journalctl -u truper-cam-backend -n 50`

## Siguientes Pasos

1. Configurar dominio y DNS
2. Implementar SSL
3. Configurar backups automáticos
4. Monitoreo con herramientas como Prometheus/Grafana
5. CI/CD con GitHub Actions
