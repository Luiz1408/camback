# Manual de Usuario - Captura de Revisiones
## Sistema TruperCAM

### Tabla de Contenido
1. [Acceso al Sistema](#acceso-al-sistema)
2. [Navegación a Captura de Revisiones](#navegación-a-captura-de-revisiones)
3. [Interfaz Principal](#interfaz-principal)
4. [Vista de Tabla de Revisiones](#vista-de-tabla-de-revisiones)
5. [Vista de Gráficas Estadísticas](#vista-de-gráficas-estadísticas)
6. [Gestión de Revisiones](#gestión-de-revisiones)
7. [Creación de Nuevas Revisiones](#creación-de-nuevas-revisiones)
8. [Filtros Avanzados](#filtros-avanzados)
9. [Estados y Flujo de Trabajo](#estados-y-flujo-de-trabajo)
10. [Gráficos y Reportes](#gráficos-y-reportes)
11. [Buenas Prácticas](#buenas-prácticas)
12. [Solución de Problemas](#solución-de-problemas)

---

## Acceso al Sistema

### Requisitos Previos
- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- Credenciales de acceso proporcionadas por el administrador
- Conexión a internet estable

### Inicio de Sesión
1. Abra el navegador e ingrese a la URL del sistema
2. En la página de login, ingrese:
   - **Usuario**: Su nombre de usuario asignado
   - **Contraseña**: Su contraseña personal
3. Haga clic en el botón **"Iniciar Sesión"**
4. Si las credenciales son correctas, será redirigido al panel principal

---

## Navegación a Captura de Revisiones

### Para usuarios no administradores:
1. Desde el panel principal, haga clic en **"Captura Revisiones"** en el menú de navegación

### Para usuarios administradores:
1. Desde el panel principal, haga clic en **"Captura Revisiones"** en el menú de navegación

---

## Interfaz Principal

### Componentes de la Vista

#### 1. Barra de Navegación Superior
- **Logo TRUPER CAM**: Identificación del sistema
- **Menú de Navegación**: 
  - **Inicio**: Panel principal
  - **Captura Revisiones**: Vista actual (activa)
- **Información de Usuario**: Nombre y rol del usuario actual
- **Botón Cerrar Sesión**: Para salir del sistema de forma segura

#### 2. Encabezado de la Vista
- **Título**: "Captura de Revisiones"
- **Descripción**: "Gestiona y administra las revisiones pendientes y asignaciones"
- **Botón Nueva Revisión**: Botón azul para crear nuevas revisiones

#### 3. Sistema de Pestañas
La interfaz está organizada en dos pestañas principales:

##### Pestaña "Tabla de Revisiones"
- **Icono**: Tabla (`fas fa-table`)
- **Contenido**: Lista detallada de todas las revisiones
- **Funciones**: Filtros, edición, eliminación

##### Pestaña "Gráficas Estadísticas"  
- **Icono**: Gráficos (`fas fa-chart-bar`)
- **Contenido**: Visualizaciones y análisis de datos
- **Funciones**: Reportes visuales, tendencias

---

## Vista de Tabla de Revisiones

### Panel de Filtros Avanzados

#### Filtros Disponibles
1. **Días en Espera**: 
   - 0-10 días (Verde)
   - 11-20 días (Amarillo) 
   - 21-30 días (Naranja)
   - 31+ días (Rojo)

2. **Almacén/Sucursal**: Filtra por ubicación física
3. **Área que Solicita**: Filtra por departamento solicitante
4. **Quién Realiza**: Filtra por monitorista asignado
5. **Estatus**: Filtra por estado de la revisión

#### Botón Limpiar
- Reinicia todos los filtros a su estado inicial
- Muestra todas las revisiones sin filtrar

### Tabla de Revisiones

#### Columnas Principales
- **Fecha de Registro**: Fecha de creación (editable por administradores)
- **Fecha Incidente**: Fecha del evento reportado
- **Días en Espera**: Tiempo transcurrido con código de colores
- **Almacén/Sucursal**: Ubicación física
- **Ubicación**: Área específica
- **Nombre del Correo**: Contacto principal
- **Área que Solicita**: Departamento solicitante
- **Quién Realiza**: Monitorista asignado (desplegable)
- **Estatus**: Estado actual (desplegable)
- **Acciones**: Eliminar (solo administradores)

#### Códigos de Color para Días en Espera
- **Verde**: 0-10 días (reciente)
- **Amarillo**: 11-20 días (atención moderada)
- **Naranja**: 21-30 días (urgente)
- **Rojo**: 31+ días (crítico)

#### Funciones Interactivas
- **Edición de Fecha**: Solo administradores pueden modificar fecha de registro
- **Asignación de Monitorista**: Seleccione de lista desplegable
- **Cambio de Estatus**: Actualice el estado en tiempo real
- **Eliminación**: Botón de basura (solo administradores)

---

## Vista de Gráficas Estadísticas

### Panel 1: Estatus Global
- **Tipo**: Gráfico de pastel
- **Contenido**: Distribución porcentual de estados
- **Leyenda**: Lista de estados con cantidades exactas
- **Colores**: Consistentes con la tabla de revisiones

### Panel 2: Top Almacenes
- **Tipo**: Gráfico de barras apiladas
- **Contenido**: Almacenes con más revisiones
- **Filtro por Mes**: Selector para analizar período específico
- **Ranking**: Lista de los 8 almacenes principales

### Panel 3: Tendencia Mensual por Estatus
- **Tipo**: Gráfico de líneas
- **Contenido**: Evolución temporal de revisiones
- **Periodo**: Todos los meses registrados
- **Resúmenes**: Detalles mensuales por estado

---

## Gestión de Revisiones

### Estados de las Revisiones

#### Cancelada (Rojo #ef476f)
- La revisión fue anulada antes de completarse
- Motivos: duplicidad, error en captura, cancelación por solicitante

#### Pendiente (Amarillo #f7b731)
- Revisión recién creada y asignada
- Espera ser procesada por el monitorista
- **Auto-conversión**: Después de 30 días cambia a "No realizada"

#### Enviada (Verde #1abc9c)
- Revisión ha sido enviada al área correspondiente
- En espera de respuesta o acción

#### En Proceso (Púrpura #9b5de5)
- La revisión está siendo atendida activamente
- Equipos trabajando en la resolución

#### No Realizada (Gris #6c757d)
- Revisión que no pudo completarse
- **Automático**: Se asigna después de 30 días en estado "Pendiente"
- Por falta de recursos, tiempo u otros motivos

### Flujo de Trabajo Típico
1. **Creación** → Estado: Pendiente
2. **Asignación** → Estado: En Proceso  
3. **Procesamiento** → Estado: Enviada
4. **Finalización** → Estado: Completada o Cancelada
5. **Vencimiento** → Estado: No realizada (automático después de 30 días)

---

## Creación de Nuevas Revisiones

### Proceso de Creación

#### 1. Iniciar Nueva Revisión
- Haga clic en el botón **"Nueva Revisión"** (color azul)
- Se abrirá un modal con el formulario de captura

#### 2. Completar Formulario
**Campos Obligatorios (*):**
- **Título (*):** Descripción de la revisión
- **Fecha Incidente (*):** Fecha del evento
- **Ubicación (*):** Almacén y área específica
- **Área que Solicita (*):** Departamento solicitante

**Campos Automáticos:**
- **Fecha Registro:** Se asigna automáticamente (fecha actual)
- **Estatus:** Se inicia como "Pendiente"
- **Quién Realiza:** Se asignará posteriormente

#### 3. Guardar Revisión
- Revise la información ingresada
- Haga clic en **"Guardar"**
- El sistema cerrará el modal y agregará la revisión a la tabla

---

## Filtros Avanzados

### Sistema de Filtrado Combinado
Los filtros funcionan de manera cumulative, permitiendo búsquedas muy específicas:

#### Estrategias de Filtrado
1. **Por Urgencia**: Use "Días en Espera" para identificar casos críticos
2. **Por Ubicación**: Combine "Almacén" con "Área que Solicita"
3. **Por Responsable**: Filtre por "Quién Realiza" para ver asignaciones
4. **Por Estado**: Use "Estatus" para revisar flujo de trabajo

#### Ejemplos de Uso
- **Casos Críticos**: Días en Espera = "31+ días" + Estatus = "Pendiente"
- **Por Sucursal**: Almacén = "SUCURSAL A" + Área que Solicita = "MANTENIMIENTO"
- **Monitorista Específico**: Quién Realiza = "Juan Pérez" + Estatus = "En Proceso"

#### Limpieza de Filtros
- Use el botón **"Limpiar"** para reiniciar todos los filtros
- Los filtros se mantienen al cambiar entre pestañas
- La página recuerda los filtros al recargar

---

## Gráficos y Reportes

### Interpretación de Gráficos

#### Gráfico de Pastel - Estatus Global
- **Segmentos grandes**: Problemas más frecuentes
- **Colores consistentes**: Facilita identificación visual
- **Porcentajes**: Proporción relativa de cada estado
- **Uso**: Identificar cuellos de botella en el proceso

#### Gráfico de Barras - Top Almacenes
- **Altura de barras**: Volumen de revisiones por almacén
- **Colores apilados**: Desglose por estatus
- **Filtro mensual**: Análisis de períodos específicos
- **Ranking**: Identificar sucursales con más actividad

#### Gráfico de Líneas - Tendencia Mensual
- **Tendencia general**: Crecimiento o disminución
- **Picos y valles**: Eventos específicos que afectan el volumen
- **Líneas por estado**: Seguimiento de cada flujo de trabajo
- **Proyecciones**: Basadas en tendencias históricas

### Reportes por Período
- **Selección mensual**: Filtre por mes específico
- **Comparación**: Compare períodos diferentes
- **Tendencias**: Identifique patrones estacionales
- **Resúmenes**: Detalles cuantitativos por estado

---

## Buenas Prácticas

### Durante la Captura
1. **Use títulos descriptivos** que identifiquen claramente el problema
2. **Seleccione fechas correctas** para incidente y registro
3. **Asigne ubicaciones precisas** (almacen + área específica)
4. **Complete áreas solicitantes** con nombres oficiales
5. **Revise información antes de guardar**

### Gestión Diaria
1. **Revise revisiones críticas** (rojo: 31+ días)
2. **Asigne monitoristas** a revisiones pendientes
3. **Actualice estatus** según progreso real
4. **Use filtros** para priorizar trabajo
5. **Monitoree tendencias** en vista de gráficas

### Calidad de Datos
1. **Estandarice nombres** de almacenes y áreas
2. **Evite abreviaturas** que puedan causar confusión
3. **Sea específico** en títulos y descripciones
4. **Mantenga consistencia** en fechas y horas
5. **Actualice información** cuando cambie el estado

### Uso de Filtros
1. **Combine filtros** para búsquedas precisas
2. **Guarde combinaciones** útiles para uso recurrente
3. **Limpie filtros** después de búsquedas específicas
4. **Use códigos de color** para identificar urgencia

---

## Solución de Problemas

### Problemas Comunes

#### No puedo crear una nueva revisión
**Causas posibles:**
- Campos obligatorios incompletos
- Problemas de conexión con el backend
- Permisos insuficientes

**Soluciones:**
- Verifique que todos los campos con * estén completos
- Recargue la página (F5)
- Contacte al administrador si persiste

#### Los gráficos no se muestran
**Causas posibles:**
- Sin datos en el período seleccionado
- Problemas de conexión
- Error en la carga de datos

**Soluciones:**
- Verifique que existan revisiones registradas
- Espere a que carguen completamente los datos
- Intente con un navegador diferente
- Cambie a la pestaña de tabla para verificar datos

#### La tabla no se actualiza después de editar
**Causas posibles:**
- Cache del navegador
- Problemas de sincronización
- Conexión inestable

**Soluciones:**
- Recargue la página completamente (Ctrl+F5)
- Limpie el cache del navegador
- Verifique su conexión a internet
- Intente nuevamente después de unos segundos

#### No puedo asignar un monitorista
**Causas posibles:**
- La lista de monitoristas no cargó
- El monitorista no está en el catálogo
- Permisos restringidos para revisiones antiguas

**Soluciones:**
- Espere a que cargue la lista de monitoristas
- Verifique que el monitorista exista en el sistema
- Contacte al administrador para revisiones mayores a 30 días

#### No puedo cambiar el estatus
**Causas posibles:**
- La revisión supera los 30 días (solo administradores)
- Permisos restringidos
- Error de conexión

**Soluciones:**
- Verifique si la revisión tiene más de 30 días
- Contacte al administrador para revisiones antiguas
- Recargue la página e intente nuevamente

#### Los filtros no funcionan correctamente
**Causas posibles:**
- Combinación muy específica sin resultados
- Datos inconsistentes en los campos
- Problemas con el formato de fechas

**Soluciones:**
- Use filtros menos específicos
- Verifique formato de datos en la tabla
- Limpie filtros y aplique uno por uno

### Mensajes de Error Comunes

#### "Error al cargar revisiones"
- **Acción**: Recargue la página
- **Alternativa**: Verifique conexión y reintente
- **Contacto**: Soporte técnico si persiste

#### "No se puede actualizar el estatus"
- **Acción**: Verifique reglas de tiempo (30 días)
- **Alternativa**: Contacte al administrador
- **Nota**: Solo admins pueden editar revisiones antiguas

#### "Permisos insuficientes"
- **Acción**: Solicite permisos adecuados
- **Información**: Especifique qué acciones necesita realizar
- **Administrador**: Puede asignar roles adicionales

#### "Error al guardar revisión"
- **Acción**: Verifique campos obligatorios
- **Alternativa**: Intente con datos diferentes
- **Contacto**: Soporte si el error persiste

---

## Contacto y Soporte

### Para asistencia técnica:
- **Email**: soporte@trupercam.com
- **Teléfono**: Extensión de TI
- **Horario**: Lunes a Viernes, 9:00 AM - 6:00 PM

### Para reportar errores:
1. Tome una captura de pantalla del error
2. Anote la fecha, hora y descripción del problema
3. Indique el navegador y versión utilizados
4. Describa los pasos que reprodujeron el error
5. Envíe la información al equipo de soporte

---

## Atajos de Teclado

| Función | Atajo |
|---------|-------|
| Nueva Revisión | Ctrl + N |
| Buscar en filtros | Ctrl + F |
| Actualizar página | F5 |
| Recargar completa | Ctrl + F5 |
| Cerrar sesión | Ctrl + L |
| Cambiar pestaña | Alt + 1/2 |
| Limpiar filtros | Esc |

---

## Versiones y Actualizaciones

### Versión Actual: 1.0.0
- **Fecha**: Diciembre 2025
- **Características principales**: 
  - Sistema de doble vista (Tabla/Gráficas)
  - Filtros avanzados combinados
  - Auto-actualización de estatus (30 días)
  - Asignación dinámica de monitoristas
  - Gráficos interactivos en tiempo real
  - Control de permisos por rol

### Próximas Actualizaciones
- Reportes personalizados y exportación a PDF
- Notificaciones automáticas por email
- Sistema de comentarios en revisiones
- Integración con calendario corporativo

---

*Este manual está sujeto a actualizaciones según evolucione el sistema. Para la versión más reciente, consulte el portal de ayuda interno.*
