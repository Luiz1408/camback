import api from './api';

// Obtener permisos del usuario actual
export const getUserPermissions = async () => {
  try {
    const response = await api.get('/auth/permissions');
    return response.data;
  } catch (error) {
    console.error('Error al obtener permisos:', error);
    throw error;
  }
};

// Verificar si el usuario tiene un permiso específico
export const hasPermission = (userPermissions, permissionName) => {
  if (!userPermissions || !Array.isArray(userPermissions)) {
    return false;
  }
  return userPermissions.some(permission => 
    permission.nombre === permissionName || permission.nombre === 'admin'
  );
};

// Verificar si el usuario tiene alguno de los permisos requeridos
export const hasAnyPermission = (userPermissions, permissionNames) => {
  if (!userPermissions || !Array.isArray(userPermissions) || !Array.isArray(permissionNames)) {
    return false;
  }
  return permissionNames.some(permissionName => 
    hasPermission(userPermissions, permissionName)
  );
};

// Permisos disponibles en el sistema
export const PERMISSIONS = {
  DASHBOARD: 'dashboard',
  ENTREGA_TURNO: 'entrega_turno',
  REVISIONES_ENTREGADAS: 'revisiones_entregadas',
  GRAFICAS: 'graficas',
  ADMIN_CATALOGOS: 'admin_catalogos',
  ACTIVIDADES_TECNICAS: 'actividades_tecnicas',
  CRONOGRAMA_SOPORTE: 'cronograma_soporte',
  PLANEACION_TECNICA: 'planeacion_tecnica',
  USUARIOS: 'usuarios',
  SISTEMA: 'sistema'
};

// Componente de protección de rutas basado en permisos
export const ProtectedRoute = ({ children, requiredPermission, userPermissions }) => {
  if (hasPermission(userPermissions, requiredPermission)) {
    return children;
  }
  
  // Si no tiene permiso, redirigir o mostrar mensaje
  return (
    <div className="alert alert-danger">
      <h4>Acceso Denegado</h4>
      <p>No tienes permisos para acceder a esta sección.</p>
    </div>
  );
};

// Hook para verificar permisos en componentes
export const usePermissions = () => {
  const [permissions, setPermissions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadPermissions = async () => {
      try {
        const userPermissions = await getUserPermissions();
        setPermissions(userPermissions);
      } catch (error) {
        console.error('Error cargando permisos:', error);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, []);

  const checkPermission = (permissionName) => {
    return hasPermission(permissions, permissionName);
  };

  const checkAnyPermission = (permissionNames) => {
    return hasAnyPermission(permissions, permissionNames);
  };

  return {
    permissions,
    loading,
    checkPermission,
    checkAnyPermission
  };
};
