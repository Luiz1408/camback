import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { parseDateValue } from '../utils/date';

const UserManagementContext = createContext(null);

const PASSWORD_MODAL_INITIAL_STATE = {
  isOpen: false,
  user: null,
  password: '',
  confirm: '',
  error: '',
  loading: false,
};

const FALLBACK_ROLES = [
  { id: 1, name: 'Administrador', description: 'Acceso completo al sistema' },
  { id: 2, name: 'Coordinador', description: 'Puede subir archivos Excel y crear gráficas' },
  { id: 3, name: 'Monitorista', description: 'Puede consultar información y dar seguimiento' },
  { id: 4, name: 'Técnico', description: 'Registra y da seguimiento a actividades técnicas' },
];

const resolveUserDisplayName = (user) => {
  if (!user) {
    return '';
  }

  const fullName = (user.fullName ?? '').trim();
  if (fullName) {
    return fullName;
  }

  const fallbackName = `${(user.firstName ?? '').trim()} ${(user.lastName ?? '').trim()}`.trim();
  if (fallbackName) {
    return fallbackName;
  }

  const username = (user.username ?? '').trim();
  if (username) {
    return username;
  }

  return '';
};

const isProtectedAdminUser = (user) => {
  if (!user) {
    return false;
  }

  const username = (user.username ?? user.Username ?? '').trim().toLowerCase();
  return username === 'admin';
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = parseDateValue(value);
  if (!date) return value;
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(date);
};

const mergeWithFallbackRoles = (roles) => {
  const roleMap = new Map();

  roles.forEach((role) => {
    const resolvedName = (role?.name ?? '').trim();
    if (!resolvedName) {
      return;
    }

    const key = resolvedName.toLowerCase();
    const resolvedRole = {
      id: role?.id ?? null,
      name: resolvedName,
      description: (role?.description ?? '').trim(),
    };

    roleMap.set(key, resolvedRole);
  });

  FALLBACK_ROLES.forEach((role) => {
    const key = role.name.toLowerCase();
    if (!roleMap.has(key)) {
      roleMap.set(key, role);
    } else {
      const existing = roleMap.get(key);
      if (existing && (existing.id == null || existing.description.trim() === '')) {
        roleMap.set(key, {
          id: existing.id ?? role.id,
          name: existing.name,
          description: existing.description || role.description,
        });
      }
    }
  });

  return Array.from(roleMap.values()).sort((a, b) => {
    const idA = a.id ?? Number.MAX_SAFE_INTEGER;
    const idB = b.id ?? Number.MAX_SAFE_INTEGER;
    if (idA !== idB) {
      return idA - idB;
    }
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });
};

export const UserManagementProvider = ({ children }) => {
  const { currentUser, changePassword } = useAuth();

  const isAdmin = useMemo(() => {
    const normalizedRole = (currentUser?.role || '').trim().toLowerCase();
    return ['administrator', 'administrador', 'admin'].includes(normalizedRole);
  }, [currentUser]);

  const normalizedCurrentUsername = useMemo(
    () => currentUser?.username?.trim().toLowerCase() ?? '',
    [currentUser]
  );

  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalLoading, setUserModalLoading] = useState(false);
  const [userModalError, setUserModalError] = useState('');
  const [userModalFeedback, setUserModalFeedback] = useState({ type: '', message: '' });
  const [managedUsers, setManagedUsers] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [savingRoleIds, setSavingRoleIds] = useState(() => new Set());
  const [deletingUserIds, setDeletingUserIds] = useState(() => new Set());
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);
  const [passwordModalState, setPasswordModalState] = useState(PASSWORD_MODAL_INITIAL_STATE);

  const portalRef = useRef(null);

  useEffect(() => {
    const container = document.createElement('div');
    container.className = 'user-management-portal';
    document.body.appendChild(container);
    portalRef.current = container;

    return () => {
      document.body.removeChild(container);
    };
  }, []);

  const resetModalState = useCallback(() => {
    setUserModalLoading(false);
    setUserModalError('');
    setUserModalFeedback({ type: '', message: '' });
    setManagedUsers([]);
    setAvailableRoles([]);
    setSavingRoleIds(() => new Set());
    setDeletingUserIds(() => new Set());
    setPendingDeleteUser(null);
    setPasswordModalState({ ...PASSWORD_MODAL_INITIAL_STATE });
  }, []);

  useEffect(() => {
    if (!isAdmin && showUserModal) {
      setShowUserModal(false);
      resetModalState();
    }
  }, [isAdmin, resetModalState, showUserModal]);

  const fetchRolesAndUsers = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    setUserModalLoading(true);
    setUserModalError('');

    try {
      const [rolesResponse, usersResponse] = await Promise.all([
        api.get('/Auth/roles'),
        api.get('/user'),
      ]);

      const normalizedRoles = Array.isArray(rolesResponse?.data)
        ? rolesResponse.data.map((role) => ({
            id: role.id ?? role.Id ?? null,
            name: role.name ?? role.Name ?? '',
            description: role.description ?? role.Description ?? '',
          }))
        : [];
      const ensuredRoles = mergeWithFallbackRoles(normalizedRoles);

      const normalizedUsers = Array.isArray(usersResponse?.data?.users)
        ? usersResponse.data.users.map((user) => {
            const id = user.id ?? user.Id ?? null;
            const username = (user.username ?? user.Username ?? '').trim();
            const firstName = (user.firstName ?? user.FirstName ?? '').trim();
            const lastName = (user.lastName ?? user.LastName ?? '').trim();
            const fullName = (user.fullName ?? user.FullName ?? `${firstName} ${lastName}`.trim()).trim();
            const roleName = (user.role ?? user.Role ?? '').trim();
            const normalizedRoleName = roleName.toLowerCase();
            const matchedRole = normalizedRoles.find(
              (roleItem) => (roleItem.name ?? '').trim().toLowerCase() === normalizedRoleName
            );

            return {
              id,
              username,
              firstName,
              lastName,
              fullName,
              roleName,
              roleId: matchedRole?.id ?? null,
              isActive: Boolean(user.isActive ?? user.IsActive ?? false),
              createdAt: user.createdAt ?? user.CreatedAt ?? null,
            };
          })
        : [];

      setAvailableRoles(ensuredRoles);
      setManagedUsers(normalizedUsers);
    } catch (modalError) {
      const message =
        modalError?.response?.data?.message ||
        (typeof modalError?.response?.data === 'string' ? modalError.response.data : '') ||
        modalError?.message ||
        'Error al cargar los usuarios.';
      setUserModalError(message);
      setAvailableRoles([]);
      setManagedUsers([]);
    } finally {
      setUserModalLoading(false);
    }
  }, [isAdmin]);

  const openModal = useCallback(() => {
    if (!isAdmin) {
      return false;
    }

    setShowUserModal(true);
    setUserModalFeedback({ type: '', message: '' });
    fetchRolesAndUsers();
    return true;
  }, [fetchRolesAndUsers, isAdmin]);

  const closeModal = useCallback(() => {
    setShowUserModal(false);
    resetModalState();
  }, [resetModalState]);

  const handleChangeUserRole = useCallback(
    async (userId, newRoleId) => {
      if (!isAdmin || !userId) {
        return;
      }

      const targetUser = managedUsers.find((user) => user.id === userId);
      if (isProtectedAdminUser(targetUser)) {
        setUserModalFeedback({ type: 'warning', message: 'El usuario administrador no se puede editar.' });
        return;
      }

      const parsedRoleId = newRoleId || null;
      const roleName = parsedRoleId
        ? availableRoles.find((role) => String(role.id) === String(parsedRoleId))?.name ?? ''
        : '';

      setSavingRoleIds((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });

      try {
        await api.put(`/user/${userId}`, { roleId: parsedRoleId });
        setManagedUsers((prev) =>
          prev.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  roleId: parsedRoleId,
                  roleName: roleName || user.roleName,
                }
              : user
          )
        );
        setUserModalFeedback({ type: 'success', message: 'Rol actualizado correctamente.' });
      } catch (modalError) {
        const message =
          modalError?.response?.data?.message ||
          (typeof modalError?.response?.data === 'string' ? modalError.response.data : '') ||
          modalError?.message ||
          'No se pudo actualizar el rol.';
        setUserModalFeedback({ type: 'danger', message });
      } finally {
        setSavingRoleIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    },
    [availableRoles, isAdmin, managedUsers]
  );

  const handleRequestDeleteUser = useCallback(
    (user) => {
      if (!user?.id) {
        return;
      }

      if (isProtectedAdminUser(user)) {
        setUserModalFeedback({ type: 'warning', message: 'El usuario administrador no se puede eliminar.' });
        return;
      }

      const username = (user.username ?? '').trim().toLowerCase();
      if (username && username === normalizedCurrentUsername) {
        setUserModalFeedback({ type: 'warning', message: 'No puedes eliminar tu propio usuario.' });
        return;
      }

      setPendingDeleteUser({
        id: user.id,
        username: user.username,
        fullName: resolveUserDisplayName(user),
      });
      setUserModalFeedback({ type: '', message: '' });
    },
    [normalizedCurrentUsername]
  );

  const handleCancelDeleteUser = useCallback(() => {
    setPendingDeleteUser(null);
  }, []);

  const handleConfirmDeleteUser = useCallback(async () => {
    if (!pendingDeleteUser?.id || !isAdmin) {
      return;
    }

    const { id } = pendingDeleteUser;

    setDeletingUserIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    try {
      await api.delete(`/user/${id}`);
      setManagedUsers((prev) => prev.filter((user) => user.id !== id));
      setUserModalFeedback({ type: 'success', message: 'Usuario eliminado correctamente.' });
      setPendingDeleteUser(null);
    } catch (modalError) {
      const message =
        modalError?.response?.data?.message ||
        (typeof modalError?.response?.data === 'string' ? modalError.response.data : '') ||
        modalError?.message ||
        'No se pudo eliminar el usuario.';
      setUserModalFeedback({ type: 'danger', message });
    } finally {
      setDeletingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [isAdmin, pendingDeleteUser]);

  const handleOpenPasswordModal = useCallback((user) => {
    if (!user?.id) {
      return;
    }

    if (isProtectedAdminUser(user)) {
      setUserModalFeedback({ type: 'warning', message: 'La contraseña del usuario administrador no se puede modificar.' });
      return;
    }

    setPasswordModalState({
      ...PASSWORD_MODAL_INITIAL_STATE,
      isOpen: true,
      user,
    });
    setUserModalFeedback({ type: '', message: '' });
  }, []);

  const handleClosePasswordModal = useCallback(() => {
    setPasswordModalState({ ...PASSWORD_MODAL_INITIAL_STATE });
  }, []);

  const handlePasswordModalChange = useCallback((field, value) => {
    setPasswordModalState((prev) => ({ ...prev, [field]: value, error: '', loading: false }));
  }, []);

  const handleSubmitPasswordChange = useCallback(async () => {
    const currentState = passwordModalState;
    if (!currentState.isOpen || currentState.loading) {
      return;
    }

    const trimmedPassword = currentState.password.trim();
    const trimmedConfirm = currentState.confirm.trim();
    const resolvedUserId = currentState.user?.id ?? currentState.user?.Id ?? null;

    if (!resolvedUserId) {
      setPasswordModalState((prev) => ({
        ...prev,
        loading: false,
        error: 'Usuario inválido para actualizar contraseña.',
      }));
      return;
    }

    if (trimmedPassword.length < 6) {
      setPasswordModalState((prev) => ({
        ...prev,
        loading: false,
        error: 'La contraseña debe tener al menos 6 caracteres.',
      }));
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      setPasswordModalState((prev) => ({
        ...prev,
        loading: false,
        error: 'Las contraseñas no coinciden.',
      }));
      return;
    }

    const targetUserLabel = resolveUserDisplayName(currentState.user) || 'el usuario seleccionado';

    setPasswordModalState((prev) => ({
      ...prev,
      loading: true,
      error: '',
    }));

    try {
      const result = await changePassword(resolvedUserId, trimmedPassword);

      if (!result?.success) {
        const message = result?.error || 'No se pudo actualizar la contraseña.';
        setPasswordModalState((prev) => ({ ...prev, loading: false, error: message }));
        return;
      }

      setPasswordModalState({ ...PASSWORD_MODAL_INITIAL_STATE });
      setUserModalFeedback({
        type: 'success',
        message: `Contraseña actualizada correctamente para ${targetUserLabel}.`,
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        (typeof error?.response?.data === 'string' ? error.response.data : '') ||
        error?.message ||
        'No se pudo actualizar la contraseña.';
      setPasswordModalState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [changePassword, passwordModalState]);

  const contextValue = useMemo(
    () => ({
      isOpen: showUserModal,
      openModal,
      closeModal,
    }),
    [closeModal, openModal, showUserModal]
  );

  const modalContent = showUserModal ? (
    <>
      <div
        className="user-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-modal-title"
        onClick={closeModal}
      >
        <div className="card user-modal shadow-lg border-0" onClick={(event) => event.stopPropagation()}>
          <div className="card-header d-flex align-items-center justify-content-between">
            <div>
              <h2 className="h5 mb-1" id="user-modal-title">
                Gestión de usuarios
              </h2>
              <p className="user-modal-subtitle mb-0">Cambia roles o elimina cuentas de manera segura.</p>
            </div>
            <button type="button" className="btn-close" onClick={closeModal} aria-label="Cerrar" />
          </div>

          <div className="card-body">
            {userModalError && (
              <div className="alert alert-danger" role="alert">
                {userModalError}
              </div>
            )}

            {userModalFeedback.message && (
              <div className={`alert alert-${userModalFeedback.type || 'info'}`} role="alert">
                {userModalFeedback.message}
              </div>
            )}

            {userModalLoading ? (
              <div className="d-flex justify-content-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando usuarios…</span>
                </div>
              </div>
            ) : managedUsers.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <h3 className="h6">No se encontraron usuarios</h3>
                <p className="mb-0">Crea nuevos usuarios desde la pantalla de login.</p>
              </div>
            ) : (
              <div className="user-modal-table-wrapper">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th scope="col">Usuario</th>
                      <th scope="col">Nombre</th>
                      <th scope="col" style={{ minWidth: '180px' }}>
                        Rol
                      </th>
                      <th scope="col">Estado</th>
                      <th scope="col">Creado</th>
                      <th scope="col" className="text-end">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {managedUsers.map((user) => {
                      const isSelf = user.username?.trim().toLowerCase() === normalizedCurrentUsername;
                      const roleValue = user.roleId ?? '';
                      const deleting = deletingUserIds.has(user.id);
                      const savingRole = savingRoleIds.has(user.id);
                      const protectedAdmin = isProtectedAdminUser(user);

                      return (
                        <tr key={user.id ?? user.username}>
                          <td>
                            <span className="fw-semibold">{user.username}</span>
                          </td>
                          <td>
                            <span>{resolveUserDisplayName(user) || '—'}</span>
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={roleValue}
                              onChange={(event) => handleChangeUserRole(user.id, event.target.value)}
                              disabled={savingRole || availableRoles.length === 0 || protectedAdmin}
                            >
                              <option value="">Selecciona un rol</option>
                              {availableRoles.map((role) => (
                                <option key={`role-option-${role.id}`} value={role.id}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                user.isActive
                                  ? 'bg-success-subtle text-success-emphasis'
                                  : 'bg-secondary-subtle text-secondary-emphasis'
                              }`}
                            >
                              {user.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td>
                            <span className="text-muted small">{formatDate(user.createdAt)}</span>
                          </td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2">
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleOpenPasswordModal(user)}
                                disabled={protectedAdmin}
                              >
                                Cambiar contraseña
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleRequestDeleteUser(user)}
                                disabled={isSelf || deleting || protectedAdmin}
                              >
                                {deleting ? 'Eliminando…' : 'Eliminar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card-footer d-flex justify-content-between align-items-center">
            <small className="text-muted">
              Total usuarios: <strong>{managedUsers.length}</strong>
            </small>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {pendingDeleteUser && (
        <div className="user-modal-confirm">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h3 className="h6 fw-semibold mb-2">Confirmar eliminación</h3>
              <p className="mb-3 text-muted">
                ¿Deseas eliminar al usuario <strong>{pendingDeleteUser.username}</strong>? Esta acción no se puede deshacer.
              </p>
              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleCancelDeleteUser}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={handleConfirmDeleteUser}>
                  Eliminar definitivamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {passwordModalState.isOpen && (
        <div
          className="password-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="password-modal-title"
          onClick={handleClosePasswordModal}
        >
          <div className="card password-modal shadow-lg border-0" onClick={(event) => event.stopPropagation()}>
            <div className="card-header pb-0">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h3 className="h5 mb-1" id="password-modal-title">
                    Cambiar contraseña
                  </h3>
                  <p className="mb-0 text-muted small">
                    Actualiza la contraseña de{' '}
                    <strong className="password-modal__user">
                      {resolveUserDisplayName(passwordModalState.user) || 'el usuario seleccionado'}
                    </strong>
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleClosePasswordModal}
                  aria-label="Cerrar"
                  disabled={passwordModalState.loading}
                />
              </div>
            </div>

            <div className="card-body">
              <p className="text-muted small">
                Ingresa una nueva contraseña de al menos 6 caracteres y confírmala para aplicar los cambios.
              </p>
              {passwordModalState.error && (
                <div className="alert alert-danger" role="alert">
                  {passwordModalState.error}
                </div>
              )}

              <form
                className="d-flex flex-column gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSubmitPasswordChange();
                }}
              >
                <div>
                  <label htmlFor="password-modal-new" className="form-label fw-semibold">
                    Nueva contraseña
                  </label>
                  <input
                    id="password-modal-new"
                    type="password"
                    className="form-control"
                    value={passwordModalState.password}
                    onChange={(event) => handlePasswordModalChange('password', event.target.value)}
                    minLength={6}
                    autoComplete="new-password"
                    required
                    disabled={passwordModalState.loading}
                  />
                </div>

                <div>
                  <label htmlFor="password-modal-confirm" className="form-label fw-semibold">
                    Confirmar contraseña
                  </label>
                  <input
                    id="password-modal-confirm"
                    type="password"
                    className="form-control"
                    value={passwordModalState.confirm}
                    onChange={(event) => handlePasswordModalChange('confirm', event.target.value)}
                    minLength={6}
                    autoComplete="new-password"
                    required
                    disabled={passwordModalState.loading}
                  />
                </div>

                <div className="d-flex justify-content-end gap-2 mt-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handleClosePasswordModal}
                    disabled={passwordModalState.loading}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={passwordModalState.loading}>
                    {passwordModalState.loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        Guardando…
                      </>
                    ) : (
                      'Guardar cambios'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  ) : null;

  return (
    <UserManagementContext.Provider value={contextValue}>
      {children}
      {portalRef.current ? createPortal(modalContent, portalRef.current) : null}
    </UserManagementContext.Provider>
  );
};

export const useUserManagement = () => {
  const context = useContext(UserManagementContext);
  if (!context) {
    throw new Error('useUserManagement debe usarse dentro de un UserManagementProvider.');
  }
  return context;
};
