import React, { useState, useEffect } from 'react';
import api from '../services/api';

const UserPermissionsModal = ({ user, isOpen, onClose, onPermissionsUpdated }) => {
  const [permissions, setPermissions] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      loadPermissions();
      loadUserPermissions();
    }
  }, [isOpen, user]);

  const loadPermissions = async () => {
    try {
      const response = await api.get('/permisos');
      setPermissions(response.data || []);
    } catch (error) {
      console.error('Error cargando permisos:', error);
      setError('No se pudieron cargar los permisos disponibles');
    }
  };

  const loadUserPermissions = async () => {
    if (!user?.roleId) return;
    
    try {
      const response = await api.get(`/permisos/rol/${user.roleId}`);
      setUserPermissions(response.data || []);
    } catch (error) {
      console.error('Error cargando permisos del usuario:', error);
    }
  };

  const handleTogglePermission = async (permissionId) => {
    if (saving) return;

    const hasPermission = userPermissions.some(p => p.id === permissionId);
    
    setSaving(true);
    setError('');

    try {
      if (hasPermission) {
        // Revocar permiso
        await api.delete('/permisos/revocar', {
          data: {
            roleId: user.roleId,
            permisoId: permissionId
          }
        });
        setUserPermissions(prev => prev.filter(p => p.id !== permissionId));
      } else {
        // Asignar permiso
        await api.post('/permisos/asignar', {
          roleId: user.roleId,
          permisoId: permissionId
        });
        const permission = permissions.find(p => p.id === permissionId);
        if (permission) {
          setUserPermissions(prev => [...prev, permission]);
        }
      }

      if (onPermissionsUpdated) {
        onPermissionsUpdated();
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Error al actualizar permisos';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const getPermissionIcon = (permissionName) => {
    const icons = {
      'dashboard': 'fas fa-tachometer-alt',
      'entrega_turno': 'fas fa-exchange-alt',
      'revisiones_entregadas': 'fas fa-clipboard-check',
      'graficas': 'fas fa-chart-bar',
      'admin_catalogos': 'fas fa-database',
      'actividades_tecnicas': 'fas fa-tools',
      'cronograma_soporte': 'fas fa-calendar-alt',
      'planeacion_tecnica': 'fas fa-project-diagram',
      'usuarios': 'fas fa-users',
      'sistema': 'fas fa-cogs'
    };
    return icons[permissionName] || 'fas fa-key';
  };

  const getPermissionLabel = (permissionName) => {
    const labels = {
      'dashboard': 'Dashboard',
      'entrega_turno': 'Entrega de Turno',
      'revisiones_entregadas': 'Revisiones Entregadas',
      'graficas': 'Gráficas',
      'admin_catalogos': 'Admin Catálogos',
      'actividades_tecnicas': 'Actividades Técnicas',
      'cronograma_soporte': 'Cronograma de Soporte',
      'planeacion_tecnica': 'Planeación Técnica',
      'usuarios': 'Gestión de Usuarios',
      'sistema': 'Configuración Sistema'
    };
    return labels[permissionName] || permissionName;
  };

  if (!isOpen || !user) return null;

  return (
    <div className="permissions-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="card permissions-modal shadow-lg border-0" onClick={(e) => e.stopPropagation()}>
        <div className="card-header d-flex align-items-center justify-content-between">
          <div>
            <h3 className="h5 mb-1">Gestionar Permisos</h3>
            <p className="mb-0 text-muted">
              Usuario: <strong>{user.firstName} {user.lastName}</strong> ({user.username})
            </p>
            <p className="mb-0 text-muted small">
              Rol actual: <strong>{user.roleName}</strong>
            </p>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar" />
        </div>

        <div className="card-body">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando permisos...</span>
              </div>
            </div>
          ) : (
            <div className="permissions-grid">
              <div className="row g-3">
                {permissions.map((permission) => {
                  const hasPermission = userPermissions.some(p => p.id === permission.id);
                  const isSaving = saving && !hasPermission;
                  const isRevoking = saving && hasPermission;

                  return (
                    <div key={permission.id} className="col-md-6">
                      <div className={`permission-card ${hasPermission ? 'permission-granted' : 'permission-denied'}`}>
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center gap-3">
                            <div className="permission-icon">
                              <i className={getPermissionIcon(permission.nombre)} />
                            </div>
                            <div>
                              <div className="permission-name">
                                {getPermissionLabel(permission.nombre)}
                              </div>
                              <div className="permission-description text-muted small">
                                {permission.descripcion}
                              </div>
                            </div>
                          </div>
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`permission-${permission.id}`}
                              checked={hasPermission}
                              onChange={() => handleTogglePermission(permission.id)}
                              disabled={saving}
                            />
                            <label className="form-check-label" htmlFor={`permission-${permission.id}`}>
                              {hasPermission ? 'Activo' : 'Inactivo'}
                            </label>
                          </div>
                        </div>
                        {(isSaving || isRevoking) && (
                          <div className="permission-loading">
                            <div className="spinner-border spinner-border-sm me-2" />
                            {isSaving ? 'Asignando...' : 'Revocando...'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="card-footer d-flex justify-content-between align-items-center">
          <div className="text-muted small">
            Permisos activos: <strong>{userPermissions.length}</strong> de <strong>{permissions.length}</strong>
          </div>
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={saving}>
              Cerrar
            </button>
            {saving && (
              <button type="button" className="btn btn-primary" disabled>
                <span className="spinner-border spinner-border-sm me-2" />
                Guardando cambios...
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .permissions-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1050;
        }

        .permissions-modal {
          max-width: 800px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .permissions-grid {
          max-height: 400px;
          overflow-y: auto;
        }

        .permission-card {
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 1rem;
          transition: all 0.2s ease;
          position: relative;
        }

        .permission-card.permission-granted {
          border-color: #198754;
          background-color: #f8f9fa;
        }

        .permission-card.permission-denied {
          border-color: #dee2e6;
          background-color: #fff;
        }

        .permission-card:hover {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .permission-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .permission-card.permission-granted .permission-icon {
          background-color: #d1e7dd;
          color: #198754;
        }

        .permission-card.permission-denied .permission-icon {
          background-color: #e9ecef;
          color: #6c757d;
        }

        .permission-name {
          font-weight: 600;
          font-size: 0.9rem;
        }

        .permission-description {
          font-size: 0.8rem;
          line-height: 1.3;
        }

        .permission-loading {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-size: 0.8rem;
          color: #6c757d;
        }

        .form-switch .form-check-input {
          cursor: pointer;
        }

        .form-switch .form-check-input:checked {
          background-color: #198754;
          border-color: #198754;
        }
      `}</style>
    </div>
  );
};

export default UserPermissionsModal;
