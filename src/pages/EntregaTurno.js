import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import MainNavbar from '../components/Layout/MainNavbar';
import Footer from '../components/Layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useUserManagement } from '../contexts/UserManagementContext';
import { formatDateTime } from '../utils/date';
import api from '../services/api';
import ModernModal from '../components/Common/ModernModal';
import '../components/Common/ModernModal.css';
import './EntregaTurno.css';

// Función para formatear solo fecha sin hora
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  
  return `${day}/${month}/${year}`;
};

const DEFAULT_STATUS = 'Pendiente';
const DEFAULT_TYPE = 'informativo';
const DEFAULT_PRIORITY = 'Media';
const DELETE_MODAL_INITIAL_STATE = {
  isOpen: false,
  note: null,
  loading: false,
  error: '',
};

const STATUS_OPTIONS = [
  { value: 'Programado', label: 'Programado' },
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'En proceso', label: 'En proceso' },
  { value: 'Completado', label: 'Completado' },
  { value: 'Cancelado', label: 'Cancelado' },
];

const FINALIZADOS_STATUSES = ['Completado', 'Cancelado'];

// Función para encontrar ID de usuario por username (incluye admins y coordinadores)
const findUserIdByUsername = (username, coordinators, allUsers = null) => {
  if (!username) return null;
  
  console.log(`🔍 Buscando usuario "${username}" en coordinadores:`, coordinators);
  
  // Primero buscar en coordinadores
  if (coordinators) {
    const coordinator = coordinators.find(c => 
      c.username === username || 
      c.fullName === username ||
      c.firstName === username ||
      c.lastName === username
    );
    
    if (coordinator) {
      console.log(`✅ Encontrado en coordinadores:`, coordinator);
      return coordinator.id;
    }
  }
  
  // Si no se encuentra en coordinadores, buscar en todos los usuarios (para admins)
  if (allUsers) {
    const user = allUsers.find(u => 
      u.username === username || 
      u.fullName === username ||
      u.firstName === username ||
      u.lastName === username
    );
    
    if (user) {
      console.log(`✅ Encontrado en todos los usuarios:`, user);
      return user.id;
    }
  }
  
  console.log(`❌ No se encontró usuario "${username}"`);
  return null;
};

// Función para extraer ID del token JWT
const extractIdFromToken = () => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      console.log('🔍 Token encontrado:', token.substring(0, 50) + '...');
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('🔍 Payload del token:', payload);
      
      // Buscar diferentes campos donde podría estar el ID
      const possibleIds = [
        payload.sub,
        payload.userId,
        payload.id,
        payload.nameidentifier,
        payload.unique_name,
        payload.username
      ];
      
      console.log('🔍 Posibles IDs encontrados:', possibleIds);
      
      // Si es string, intentar convertir a número si es posible
      const id = possibleIds.find(id => id != null);
      if (id) {
        // Si es "Adriana", necesitamos buscar su ID en los coordinadores
        if (typeof id === 'string' && isNaN(id)) {
          console.log('🔍 El ID es un nombre, buscando en coordinadores...');
          // Aquí necesitaríamos una función para buscar por username
          return null; // Temporal
        }
        
        return typeof id === 'string' && !isNaN(id) ? parseInt(id) : id;
      }
    }
  } catch (err) {
    console.warn('No se pudo extraer ID del token:', err);
  }
  return null;
};

// Extraer el nombre del usuario de forma segura
const getUserName = (user) => {
  if (!user) return 'Usuario';
  return user.username || user.name || user.fullName || 
         (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : null) ||
         'Usuario';
};

// Función para obtener el nombre del usuario a partir de su ID
const getUserNameById = (userId, coordinators, allUsers = null) => {
  console.log(`🔍 Buscando usuario con ID: ${userId}`);
  console.log(`👥 Coordinadores disponibles:`, coordinators.map(c => ({ id: c.id, name: c.fullName || c.username })));
  
  if (!userId) return 'Usuario';
  
  // Primero buscar en coordinadores
  if (coordinators) {
    const coordinator = coordinators.find(c => c.id == userId);
    console.log(`🎯 Coordinador encontrado:`, coordinator);
    
    if (coordinator) {
      const name = coordinator.fullName || coordinator.name || 
             (coordinator.firstName && coordinator.lastName ? `${coordinator.firstName} ${coordinator.lastName}`.trim() : null) ||
             coordinator.username ||
             `Coordinador ${userId}`;
      
      console.log(`✅ Nombre extraído de coordinador: ${name}`);
      return name;
    }
  }
  
  // Si no encuentra en coordinadores, buscar en todos los usuarios (para admins)
  if (allUsers) {
    const user = allUsers.find(u => u.id == userId);
    console.log(`🎯 Usuario encontrado en allUsers:`, user);
    
    if (user) {
      const name = user.fullName || user.name || 
             (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : null) ||
             user.username ||
             `Usuario ${userId}`;
      
      console.log(`✅ Nombre extraído de allUsers: ${name}`);
      return name;
    }
  }
  
  console.log(`❌ No se encontró usuario con ID ${userId}`);
  return 'Usuario';
};

const EntregaTurno = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const userManagement = useUserManagement();
  const openUserManagementModal = userManagement?.openModal;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coordinatorOptions, setCoordinatorOptions] = useState([]);
  const [ackLoadingKeys, setAckLoadingKeys] = useState(new Set());
  const [deletingNoteIds, setDeletingNoteIds] = useState(new Set());
  const [deleteModalState, setDeleteModalState] = useState(DELETE_MODAL_INITIAL_STATE);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingNote, setCreatingNote] = useState(false);
  const [activeTab, setActiveTab] = useState('activas');
  const [newNoteDescription, setNewNoteDescription] = useState('');
  const [newNoteType, setNewNoteType] = useState('informativo');
  const [createModalError, setCreateModalError] = useState('');

  const isAdmin = currentUser?.role === 'Administrador';
  const isCoordinator = currentUser?.role === 'Coordinador';
  const normalizedCurrentUsername = currentUser?.username?.trim().toLowerCase() ?? '';
  
  const hasPermissionToInteract = isAdmin || isCoordinator;
  const hasPermissionToCreate = isAdmin || isCoordinator;

  const displayName = useMemo(() => {
    if (!currentUser) {
      return '';
    }

    const firstName = (currentUser.firstName || '')
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)[0];
    const lastName = (currentUser.lastName || '')
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)[0];

    if (firstName || lastName) {
      return [firstName, lastName].filter(Boolean).join(' ');
    }

    return currentUser.fullName || currentUser.username || '';
  }, [currentUser]);

  const loadData = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      
      const [notesResponse, coordinatorsResponse] = await Promise.all([
        api.get('/shiftHandOff'),
        api.get('/User/coordinators'),
      ]);

      const notes = notesResponse?.data?.notes ?? notesResponse?.data?.data ?? notesResponse?.data ?? [];
      const coordinators = coordinatorsResponse?.data?.data ?? coordinatorsResponse?.data ?? [];

      const safeNotes = Array.isArray(notes) ? notes : [];
      const safeCoordinators = Array.isArray(coordinators) ? coordinators : [];

      // LIMPIEZA: Eliminar acknowledgments de coordinadores fantasmas del localStorage
      const localAcknowledgments = JSON.parse(localStorage.getItem('turnoAcknowledgments') || '{}');
      const validCoordinatorIds = safeCoordinators.map(c => c.id.toString());
      
      let cleanedAny = false;
      Object.keys(localAcknowledgments).forEach(noteId => {
        const noteAck = localAcknowledgments[noteId];
        const cleanedNoteAck = {};
        
        Object.keys(noteAck).forEach(key => {
          // Mantener solo claves válidas (no coordinadores fantasmas)
          if (!/^\d+$/.test(key) || validCoordinatorIds.includes(key)) {
            cleanedNoteAck[key] = noteAck[key];
          } else {
            cleanedAny = true;
          }
        });
        
        localAcknowledgments[noteId] = cleanedNoteAck;
      });
      
      // Guardar localStorage limpio si se eliminó algo
      if (cleanedAny) {
        localStorage.setItem('turnoAcknowledgments', JSON.stringify(localAcknowledgments));
      }

      const mappedRows = safeNotes.map((note) => {
        // Transformar acknowledgements del backend al formato del frontend
        const transformedAcknowledgedBy = {};
        
        if (note.acknowledgements && Array.isArray(note.acknowledgements)) {
          note.acknowledgements.forEach(ack => {
            // Solo transformar si el coordinador existe en la lista válida
            if (safeCoordinators.find(c => c.id == ack.coordinatorUserId)) {
              transformedAcknowledgedBy[ack.coordinatorUserId] = {
                checked: ack.isAcknowledged || false,
                timestamp: ack.acknowledgedAt || null,
                acknowledgedBy: ack.coordinatorUsername ? {
                  username: ack.coordinatorUsername,
                  fullName: ack.coordinatorName,
                  id: ack.coordinatorUserId
                } : null
              };
            }
          });
        }
        
        // Aplicar localStorage limpio como fallback
        if (localAcknowledgments[note.id]) {
          Object.assign(transformedAcknowledgedBy, localAcknowledgments[note.id]);
          
          // Si fue auto-completada en localStorage, restaurar ese estado SOLO si el backend dice que está completada
          if (localAcknowledgments[note.id]._autoCompleted && note.status === 'Completado') {
            note.status = 'Completado';
            note.finalizedAt = localAcknowledgments[note.id]._autoCompletedAt;
            note.finalizedByUserId = localAcknowledgments[note.id]._autoCompletedBy;
            console.log(`🔄 Restaurando finalización desde localStorage para nota ${note.id}:`, JSON.stringify({
              finalizedAt: note.finalizedAt,
              finalizedByUserId: note.finalizedByUserId
            }, null, 2));
          } else if (localAcknowledgments[note.id]._autoCompleted && note.status !== 'Completado') {
            // La nota fue reactivada, limpiar el estado de auto-completado
            delete localAcknowledgments[note.id]._autoCompleted;
            delete localAcknowledgments[note.id]._autoCompletedAt;
            delete localAcknowledgments[note.id]._autoCompletedBy;
            localStorage.setItem('turnoAcknowledgments', JSON.stringify(localAcknowledgments));
          }
        }
        
        // Logging para verificar datos de finalización del backend
        if (FINALIZADOS_STATUSES.includes(note.status) && (note.finalizedAt || note.finalizedByUserId)) {
          console.log(`📝 Nota ${note.id} con datos de finalización del backend:`, JSON.stringify({
            status: note.status,
            finalizedAt: note.finalizedAt,
            finalizedByUserId: note.finalizedByUserId,
            finalizedBy: note.finalizedBy  // Verificar si viene del backend
          }, null, 2));
          
          // Verificar si getUserNameById funciona
          if (note.finalizedByUserId) {
            const userName = getUserNameById(note.finalizedByUserId, safeCoordinators, [{ ...currentUser, id: 1 }]);
            console.log(`🔍 getUserNameById(${note.finalizedByUserId}) = "${userName}"`);
          }
        }
        
        // Complementar con coordinadores que no tienen acknowledgments
        safeCoordinators.forEach(coordinator => {
          if (!transformedAcknowledgedBy[coordinator.id]) {
            transformedAcknowledgedBy[coordinator.id] = {
              checked: false,
              timestamp: null,
              acknowledgedBy: null
            };
          }
        });

        const result = {
          ...note,
          status: note.status ?? DEFAULT_STATUS,
          description: note.description ?? '',
          type: note.type ?? DEFAULT_TYPE,
          priority: note.priority ?? DEFAULT_PRIORITY,
          assignedCoordinatorId: note.assignedCoordinatorId ?? null,
          acknowledgedBy: transformedAcknowledgedBy,
          // Obtener el nombre del usuario a partir del ID
          finalizedAt: note.finalizedAt || null,
          finalizedBy: note.finalizedByUserId ? getUserNameById(note.finalizedByUserId, safeCoordinators, [{ ...currentUser, id: 1 }]) : null,
          finalizedByUserId: note.finalizedByUserId || null
        };

        return result;
      });

      setRows(mappedRows);
      setCoordinatorOptions(safeCoordinators);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError(`Error al cargar datos: ${err.message || 'No se pudieron cargar los datos de entrega de turno.'}`);
      setRows([]);
      setCoordinatorOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddRow = useCallback(() => {
    // Permitir que cualquier usuario autenticado cree notas
    if (!currentUser) {
      setError('Debes estar autenticado para crear notas.');
      return;
    }

    setShowCreateModal(true);
    setNewNoteDescription('');
    setNewNoteType('informativo');
    setCreateModalError('');
  }, [currentUser]);

  const handleCreateNote = useCallback(async () => {
    if (!newNoteDescription.trim()) {
      setCreateModalError('La descripción de la nota es requerida.');
      return;
    }

    try {
      setCreatingNote(true);
      setCreateModalError('');

      const payload = {
        description: newNoteDescription.trim(),
        type: newNoteType,
        status: DEFAULT_STATUS,
        createdBy: currentUser,
        createdAt: new Date().toISOString()
      };

      const response = await api.post('/shiftHandOff', payload);
      const newNote = response?.data?.data ?? response?.data;

      if (newNote) {
        const processedNote = {
          ...newNote,
          status: newNote.status ?? DEFAULT_STATUS,
          description: newNote.description ?? newNoteDescription.trim(),
          type: newNote.type ?? newNoteType,
          acknowledgedBy: newNote.acknowledgedBy ?? {},
          createdBy: newNote.createdBy ?? currentUser,
          createdAt: newNote.createdAt ?? new Date().toISOString(),
        };

        setRows((prev) => [processedNote, ...prev]);
      }

      setShowCreateModal(false);
      setNewNoteDescription('');
      setNewNoteType('informativo');
    } catch (err) {
      console.error('Error al crear nota:', err);
      setCreateModalError('No se pudo crear la nota.');
    } finally {
      setCreatingNote(false);
    }
  }, [newNoteDescription, newNoteType, currentUser]);

  const handleDescriptionChange = useCallback((noteId, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === noteId ? { ...row, description: value, hasUnsavedChanges: true } : row
      )
    );
  }, []);

  const handleDescriptionBlur = useCallback(async (noteId, value) => {
    const row = rows.find((r) => r.id === noteId);
    if (!row || row.description === value) return;

    try {
      await api.put(`/shiftHandOff/${noteId}`, { description: value });
      setRows((prev) =>
        prev.map((r) => (r.id === noteId ? { ...r, description: value, hasUnsavedChanges: false } : r))
      );
    } catch (err) {
      setError('No se pudo actualizar la descripción.');
      setRows((prev) =>
        prev.map((r) => (r.id === noteId ? { ...r, description: row.description, hasUnsavedChanges: false } : r))
      );
    }
  }, [rows]);

  const handleTypeChange = useCallback(async (noteId, type) => {
    try {
      await api.put(`/shiftHandOff/${noteId}`, { type });
      setRows((prev) =>
        prev.map((row) =>
          row.id === noteId ? { ...row, type } : row
        )
      );
    } catch (err) {
      setError('No se pudo actualizar el tipo.');
    }
  }, []);

  const handlePriorityChange = useCallback(async (noteId, priority) => {
    try {
      await api.put(`/shiftHandOff/${noteId}`, { priority });
      setRows((prev) =>
        prev.map((row) =>
          row.id === noteId ? { ...row, priority } : row
        )
      );
    } catch (err) {
      setError('No se pudo actualizar la prioridad.');
    }
  }, []);

  const handleStatusChange = useCallback(async (noteId, status) => {
    try {
      console.log(`🔄 Cambiando estatus de nota ${noteId} a ${status}`);
      
      // Preparar datos para enviar al backend
      const updateData = { status };
      
      // Agregar información de finalización SOLO para estatus finales
      if (FINALIZADOS_STATUSES.includes(status)) {
        updateData.finalizedAt = new Date().toISOString().split('T')[0]; // Solo fecha sin hora
        // Extraer ID del usuario desde diferentes fuentes
        const userId = currentUser?.id || currentUser?.userId || currentUser?.sub || 
                      extractIdFromToken() || 
                      (currentUser?.username ? findUserIdByUsername(currentUser.username, coordinatorOptions, [{ ...currentUser, id: 1 }]) : null) ||
                      (currentUser?.fullName ? '2' : null); // Temporal: usar ID 2 para Adriana
        
        updateData.finalizedByUserId = userId;
        
        console.log('🔍 Intentando obtener ID de usuario:');
        console.log('  - currentUser.id:', currentUser?.id);
        console.log('  - currentUser.userId:', currentUser?.userId);
        console.log('  - currentUser.sub:', currentUser?.sub);
        console.log('  - extractIdFromToken():', extractIdFromToken());
        console.log('  - currentUser.username:', currentUser?.username);
        console.log('  - findUserIdByUsername():', currentUser?.username ? findUserIdByUsername(currentUser.username, coordinatorOptions, [{ ...currentUser, id: 1 }]) : null);
        console.log('  - ID final usado:', userId);
        
        // NOTA: La BD no guarda el nombre, solo el ID. El nombre se obtendrá al cargar.
        
        console.log('📝 Enviando datos de finalización:', JSON.stringify({
          finalizedAt: updateData.finalizedAt,
          finalizedByUserId: updateData.finalizedByUserId
        }, null, 2));
        console.log('📝 Datos completos enviados al backend:', JSON.stringify(updateData, null, 2));
      } else {
        // Si se reactiva, enviar null para limpiar
        updateData.finalizedAt = null;
        updateData.finalizedByUserId = null;
        
        console.log('📝 Limpiando datos de finalización');
        console.log('📝 Datos completos enviados al backend:', JSON.stringify(updateData, null, 2));
      }
      
      console.log('👤 currentUser completo:', JSON.stringify(currentUser, null, 2));
      console.log('🆔 currentUser.id:', currentUser?.id);
      console.log('🆔 currentUser.username:', currentUser?.username);
      console.log('👥 coordinatorOptions:', coordinatorOptions.map(c => ({ id: c.id, username: c.username, fullName: c.fullName })));
      
      const response = await api.put(`/shiftHandOff/${noteId}`, updateData);
      console.log('✅ Respuesta del backend:', JSON.stringify(response, null, 2));
      
      // Obtener la fila actual para preservar acknowledgments
      const currentRow = rows.find(row => row.id === noteId);
      
      setRows((prev) =>
        prev.map((row) =>
          row.id === noteId
            ? {
                ...row,
                status,
                // Mantener los datos localmente para mostrarlos inmediatamente
                finalizedAt: updateData.finalizedAt,
                finalizedBy: updateData.finalizedByUserId ? getUserNameById(updateData.finalizedByUserId, coordinatorOptions, [{ ...currentUser, id: 1 }]) : null,
                finalizedByUserId: updateData.finalizedByUserId,
                // Limpiar acknowledgments del coordinador que reactiva
                ...(!FINALIZADOS_STATUSES.includes(status) && {
                  acknowledgedBy: {
                    ...(row.acknowledgedBy || {}),
                    [currentUser?.id]: { checked: false, timestamp: null }
                  }
                })
              }
            : row
        )
      );

      // Si se reactiva la nota, limpiar auto-completado Y actualizar backend
      if (!FINALIZADOS_STATUSES.includes(status)) {
        // Limpiar auto-completado del localStorage
        const localAcknowledgments = JSON.parse(localStorage.getItem('turnoAcknowledgments') || '{}');
        if (localAcknowledgments[noteId] && localAcknowledgments[noteId]._autoCompleted) {
          delete localAcknowledgments[noteId]._autoCompleted;
          delete localAcknowledgments[noteId]._autoCompletedAt;
          delete localAcknowledgments[noteId]._autoCompletedBy;
          localStorage.setItem('turnoAcknowledgments', JSON.stringify(localAcknowledgments));
        }
        
        // Si es un coordinador reactivando, limpiar su acknowledgment en el backend
        if (isCoordinator && currentUser?.id) {
          try {
            await api.put(`/shiftHandOff/${noteId}/acknowledge`, {
              coordinatorId: currentUser.id,
              checked: false
            });
            console.log(`✅ Casilla de ${currentUser.username} desmarcada al reactivar nota`);
          } catch (ackErr) {
            console.warn('No se pudo limpiar acknowledgment al reactivar:', ackErr);
          }
        }
      }
      
      // Mostrar mensaje de éxito
      if (FINALIZADOS_STATUSES.includes(status)) {
        const actionText = status === 'Completado' ? 'finalizada' : 'cancelada';
        const userName = getUserName(currentUser);
        toast.success(`✅ Nota ${actionText} exitosamente por ${userName}`);
      } else {
        const userName = getUserName(currentUser);
        if (isCoordinator) {
          toast.success(`✅ Nota reactivada por ${userName} - Tu casilla ha sido desmarcada`);
        } else {
          toast.success(`✅ Estatus actualizado a ${status}`);
        }
      }
    } catch (err) {
      console.error('❌ Error al actualizar estatus:', err);
      console.error('❌ Detalles del error:', err.response?.data || err.message);
      setError('No se pudo actualizar el estatus.');
      toast.error(`❌ Error: ${err.response?.data?.message || err.message || 'No se pudo actualizar el estatus'}`);
    }
  }, [currentUser, isCoordinator, rows]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleManageUsers = useCallback(() => {
    openUserManagementModal();
  }, [openUserManagementModal]);

  const acknowledgedSummary = useMemo(() => {
    if (rows.length === 0) {
      return { totalAcknowledged: 0, totalPossible: 0 };
    }

    const totalAcknowledged = rows.reduce((sum, row) => {
      const acknowledgements = Object.values(row.acknowledgedBy || {});
      return sum + acknowledgements.filter((ack) => ack?.checked).length;
    }, 0);

    const totalPossible = rows.reduce((sum, row) => {
      return sum + Object.keys(row.acknowledgedBy || {}).length;
    }, 0);

    return { totalAcknowledged, totalPossible };
  }, [rows]);

  // Filtrar notas por pestaña activa
  const activeTasks = useMemo(() => {
    return rows.filter(row => !FINALIZADOS_STATUSES.includes(row.status));
  }, [rows]);

  const finalizedTasks = useMemo(() => {
    return rows.filter(row => FINALIZADOS_STATUSES.includes(row.status));
  }, [rows]);

  const currentTasks = activeTab === 'activas' ? activeTasks : finalizedTasks;

  // Verificar si todos los coordinadores han marcado la casilla
  const checkAllCoordinatorsAcknowledged = useCallback((noteId) => {
    const note = rows.find(row => row.id === noteId);
    if (!note || coordinatorOptions.length === 0) return false;

    // Solo contar coordinadores que existen en coordinatorOptions
    const validAcknowledgements = coordinatorOptions.map(coordinator => {
      const ack = note.acknowledgedBy?.[coordinator.id];
      const isChecked = ack?.checked || false;
      
      return {
        coordinatorId: coordinator.id,
        coordinatorName: coordinator.fullName,
        checked: isChecked
      };
    });

    const acknowledgedCount = validAcknowledgements.filter(ack => ack.checked).length;
    const totalCount = validAcknowledgements.length;
    
    return acknowledgedCount === totalCount;
  }, [rows, coordinatorOptions]);

  // Auto-mover a completado si todos los coordinadores marcaron (solo para notas informativas)
  const autoMoveToCompleted = useCallback(async (noteId) => {
    const note = rows.find(row => row.id === noteId);
    if (!note) return;
    
    // Solo auto-mover notas informativas que no estén ya completadas
    if (note.type !== 'informativo') {
      return;
    }
    
    if (FINALIZADOS_STATUSES.includes(note.status)) {
      return;
    }
    
    // Verificar con más detalle
    if (checkAllCoordinatorsAcknowledged(noteId)) {
      try {
        // Guardar en localStorage también
        const localAcknowledgments = JSON.parse(localStorage.getItem('turnoAcknowledgments') || '{}');
        if (localAcknowledgments[noteId]) {
          localAcknowledgments[noteId]._autoCompleted = true;
          localAcknowledgments[noteId]._autoCompletedAt = new Date().toISOString();
          localAcknowledgments[noteId]._autoCompletedBy = currentUser?.id || 2;
          localStorage.setItem('turnoAcknowledgments', JSON.stringify(localAcknowledgments));
        }
        
        await api.put(`/shiftHandOff/${noteId}`, { status: 'Completado' });
        
        // Actualizar estado local inmediatamente
        setRows(prev => prev.map(row => 
          row.id === noteId 
            ? { ...row, status: 'Completado', finalizedAt: new Date().toISOString(), finalizedBy: getUserNameById(currentUser?.id || 2, coordinatorOptions, [{ ...currentUser, id: 1 }]), finalizedByUserId: currentUser?.id || 2 }
            : row
        ));
        
        toast.success(`🎉 Nota informativa completada automáticamente: todos los coordinadores han sido notificados`);
      } catch (err) {
        console.error('❌ Error al auto-mover a completado:', err);
        toast.error('Error al completar automáticamente la nota');
      }
    }
  }, [checkAllCoordinatorsAcknowledged, currentUser, rows]);

  // Función para eliminar notas
  const handleDeleteNote = useCallback(async (noteId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta nota? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await api.delete(`/shiftHandOff/${noteId}`);
      setRows(prev => prev.filter(row => row.id !== noteId));
      console.log('Nota eliminada:', noteId);
    } catch (err) {
      console.error('Error al eliminar nota:', err);
      setError('No se pudo eliminar la nota.');
    }
  }, []);

  const handleCoordinatorAcknowledge = useCallback(async (noteId, coordinatorId, checked) => {
    console.log(`\n🔥 GUARDANDO ACKNOWLEDGMENT ===`);
    console.log(`📝 Nota: ${noteId}`);
    console.log(`👤 Coordinador: ${coordinatorId}`);
    console.log(`✅ Nuevo valor: ${checked}`);
    console.log(`👤 Usuario actual:`, currentUser);
    
    try {
      // Actualizar estado local inmediatamente para feedback instantáneo
      setRows(prev => {
        const updatedRows = prev.map(row => {
          if (row.id === noteId) {
            const updatedAcknowledgedBy = {
              ...row.acknowledgedBy,
              [coordinatorId]: {
                ...row.acknowledgedBy[coordinatorId],
                checked,
                timestamp: new Date().toISOString(),
                acknowledgedBy: currentUser?.id || 2
              }
            };
            
            console.log(`💾 Actualizando estado local:`, JSON.stringify(updatedAcknowledgedBy[coordinatorId], null, 2));
            
            return {
              ...row,
              acknowledgedBy: updatedAcknowledgedBy
            };
          }
          return row;
        });
        return updatedRows;
      });

      // Guardar en localStorage como fallback
      const localAcknowledgments = JSON.parse(localStorage.getItem('turnoAcknowledgments') || '{}');
      if (!localAcknowledgments[noteId]) {
        localAcknowledgments[noteId] = {};
      }
      localAcknowledgments[noteId][coordinatorId] = {
        checked,
        timestamp: new Date().toISOString(),
        acknowledgedBy: currentUser?.id || 2
      };
      localStorage.setItem('turnoAcknowledgments', JSON.stringify(localAcknowledgments));
      console.log(`💾 Guardado en localStorage fallback:`, JSON.stringify(localAcknowledgments[noteId], null, 2));

      // Enviar al backend (intento de guardado principal)
      const payload = { 
        coordinatorId, 
        checked,
        acknowledgedBy: currentUser?.id || 2
      };
      
      console.log(`📤 Enviando al backend:`, JSON.stringify(payload, null, 2));
      
      let response;
      try {
        response = await api.put(`/shiftHandOff/${noteId}/acknowledgements`, payload);
        console.log(`✅ Respuesta del backend:`, JSON.stringify(response.data, null, 2));
      } catch (firstError) {
        console.log(`❌ Primer intento fallido:`, firstError);
        // Intentar con payload simplificado
        const simplePayload = { 
          coordinatorId, 
          checked
        };
        
        console.log(`📤 Enviando payload simplificado:`, JSON.stringify(simplePayload, null, 2));
        response = await api.put(`/shiftHandOff/${noteId}/acknowledgements`, simplePayload);
        console.log(`✅ Respuesta con payload simplificado:`, JSON.stringify(response.data, null, 2));
      }
      
      // Verificar si hay que auto-mover a completado (solo para informativas)
      // Mayor retraso para asegurar que el estado se actualizó completamente
      setTimeout(() => {
        // Forzar una verificación adicional del estado actualizado
        const updatedNote = rows.find(row => row.id === noteId);
        if (updatedNote) {
          // FORZAR sincronización: si todas las casillas visibles están marcadas pero el estado no coincide
          const allVisibleChecked = coordinatorOptions.every(coordinator => {
            // Verificar si la casilla está marcada visualmente (buscando en el DOM)
            const checkbox = document.querySelector(`#ack-${noteId}-${coordinator.id}`);
            const isChecked = checkbox?.checked || false;
            const ackState = updatedNote.acknowledgedBy?.[coordinator.id]?.checked || false;
            
            if (isChecked !== ackState) {
              // Forzar actualización del estado
              updatedNote.acknowledgedBy[coordinator.id] = {
                ...updatedNote.acknowledgedBy[coordinator.id],
                checked: isChecked,
                timestamp: isChecked ? new Date().toISOString() : null
              };
            }
            return isChecked;
          });
          
          autoMoveToCompleted(noteId);
        }
      }, 300); // Reducido a 300ms para mejor UX
      
    } catch (err) {
      console.error('❌ Error al actualizar acknowledgment:', err);
      
      // Revertir el cambio local si falla el backend
      setRows(prev => prev.map(row => {
        if (row.id === noteId) {
          return {
            ...row,
            acknowledgedBy: {
              ...row.acknowledgedBy,
              [coordinatorId]: {
                ...row.acknowledgedBy[coordinatorId],
                checked: !checked,
                timestamp: row.acknowledgedBy[coordinatorId]?.timestamp || null,
                acknowledgedBy: row.acknowledgedBy[coordinatorId]?.acknowledgedBy || null
              }
            }
          };
        }
        return row;
      }));
      
      // También revertir en localStorage
      const localAcknowledgments = JSON.parse(localStorage.getItem('turnoAcknowledgments') || '{}');
      if (localAcknowledgments[noteId] && localAcknowledgments[noteId][coordinatorId]) {
        delete localAcknowledgments[noteId][coordinatorId];
        if (Object.keys(localAcknowledgments[noteId]).length === 0) {
          delete localAcknowledgments[noteId];
        }
        localStorage.setItem('turnoAcknowledgments', JSON.stringify(localAcknowledgments));
      }
      
      const errorMessage = err.response?.data?.message || err.message || 'No se pudo actualizar el estado de notificación';
      setError(errorMessage);
      toast.error(`Error al actualizar notificación: ${errorMessage}`);
    }
    
    console.log(`=== FIN GUARDADO ===\n`);
  }, [currentUser, autoMoveToCompleted, setError]);

  // Si no hay usuario autenticado, mostrar mensaje (después de todos los hooks)
  if (!currentUser) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          <h4>⚠️ No autenticado</h4>
          <p>Por favor, inicia sesión para acceder a Entrega de Turno.</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            Ir al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="turno-container">
      <MainNavbar
        displayName={displayName || currentUser?.username || ''}
        role={currentUser?.role}
        isAdmin={isAdmin}
        onManageUsers={isAdmin ? handleManageUsers : undefined}
        onLogout={handleLogout}
      />

      <main>
        {/* Header */}
        <div className="turno-header">
          <div>
            <h1 className="turno-title">Entrega de turno</h1>
            <p className="turno-subtitle">
              Registra la información clave del turno y marca quién ha sido notificado.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-turno btn-turno--outline"
              onClick={loadData}
              disabled={loading}
            >
              {loading ? 'Actualizando…' : 'Actualizar tabla'}
            </button>
            <button
              type="button"
              className="btn-turno btn-turno--primary"
              onClick={handleAddRow}
              disabled={!currentUser || creatingNote || showCreateModal}
            >
              {creatingNote ? 'Creando…' : 'Nueva nota'}
            </button>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="turno-card">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {/* Pestañas */}
          <div className="turno-tabs">
            <button
              className={`turno-tab ${activeTab === 'activas' ? 'turno-tab--active' : ''}`}
              onClick={() => setActiveTab('activas')}
            >
              Notas Activas ({activeTasks.length})
            </button>
            <button
              className={`turno-tab ${activeTab === 'finalizadas' ? 'turno-tab--active' : ''}`}
              onClick={() => setActiveTab('finalizadas')}
            >
              Notas Finalizadas ({finalizedTasks.length})
            </button>
          </div>

          {loading ? (
            <div className="turno-loading">
              <div className="turno-spinner"></div>
              Cargando datos…
            </div>
          ) : currentTasks.length === 0 ? (
            <div className="turno-empty">
              <div className="turno-empty-icon">
                {activeTab === 'activas' ? '📝' : '✅'}
              </div>
              <h3 className="turno-empty-title">
                {activeTab === 'activas' 
                  ? 'Aún no hay notas activas' 
                  : 'Aún no hay notas finalizadas'
                }
              </h3>
              <p className="turno-empty-description">
                {activeTab === 'activas'
                  ? 'Crea una nueva nota desde el botón "Nueva nota" para comenzar.'
                  : 'Las notas finalizadas aparecerán aquí cuando se completen o cancelen.'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-2 mb-3">
                <span className="text-muted">
                  {activeTab === 'activas' ? 'Notas activas' : 'Notas finalizadas'}: <strong>{currentTasks.length}</strong>
                </span>
                {activeTab === 'activas' && (
                  <span className="turno-badge turno-badge--info">
                    Enterados: {acknowledgedSummary.totalAcknowledged}
                    {acknowledgedSummary.totalPossible > 0 ? ` / ${acknowledgedSummary.totalPossible}` : ''}
                  </span>
                )}
              </div>

              <div className="turno-notes-grid">
                {currentTasks.map((row, index) => (
                  <div key={`note-${row.id || index}`} className={`turno-note-card ${row.status?.toLowerCase().replace(' ', '-')}`}>
                    <div className="turno-note-header">
                      <div>
                        <h4 className="turno-note-title">Nota #{row.id}</h4>
                        <div className="turno-note-time">
                          {formatDate(row.createdAt)}
                        </div>
                      </div>
                      <div>
                        {/* Admins siempre ven dropdown, otros usuarios según permisos */}
                        {(isAdmin || isCoordinator) ? (
                          <select
                            className="turno-form-select"
                            value={row.status || 'Pendiente'}
                            onChange={(event) => handleStatusChange(row.id, event.target.value)}
                            // Bloquear si no tiene permisos O si la nota está finalizada
                          disabled={!isAdmin && !isCoordinator || FINALIZADOS_STATUSES.includes(row.status)}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`turno-status-badge ${row.status?.toLowerCase().replace(' ', '-')}`}>
                            {row.status || 'Pendiente'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="turno-note-content">
                      <textarea
                        className="turno-form-textarea"
                        rows={3}
                        placeholder="Describe la nota o incidencia..."
                        value={row.description}
                        onChange={(event) => handleDescriptionChange(row.id, event.target.value)}
                        onBlur={(event) => handleDescriptionBlur(row.id, event.target.value)}
                        // Bloquear si no tiene permisos O si la nota está finalizada
                          disabled={!isAdmin && !isCoordinator || FINALIZADOS_STATUSES.includes(row.status)}
                      />
                    </div>

                    <div className="turno-note-footer">
                      <div className="d-flex align-items-center gap-2">
                        <label className="turno-form-label">Tipo:</label>
                        <select
                          className="turno-form-select turno-form-select--small"
                          value={row.type || 'informativo'}
                          onChange={(event) => handleTypeChange(row.id, event.target.value)}
                          // Bloquear si no tiene permisos O si la nota está finalizada
                          disabled={!isAdmin && !isCoordinator || FINALIZADOS_STATUSES.includes(row.status)}
                        >
                          <option value="informativo">Informativo</option>
                          <option value="seguimiento">Seguimiento</option>
                        </select>
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <label className="turno-form-label">Prioridad:</label>
                        <select
                          className="turno-form-select turno-form-select--small"
                          value={row.priority || 'Media'}
                          onChange={(event) => handlePriorityChange(row.id, event.target.value)}
                          // Bloquear si no tiene permisos O si la nota está finalizada
                          disabled={!isAdmin && !isCoordinator || FINALIZADOS_STATUSES.includes(row.status)}
                        >
                          <option value="Alta">Alta</option>
                          <option value="Media">Media</option>
                          <option value="Baja">Baja</option>
                        </select>
                      </div>

                      {/* Mostrar quién finalizó la nota y cuándo */}
                      {FINALIZADOS_STATUSES.includes(row.status) && (row.finalizedBy || row.finalizedAt) && (
                        <div className="turno-finalization-info">
                          <span className="turno-finalization-text">
                            {row.status === 'Completado' ? '✅' : '❌'} 
                            {row.status === 'Completado' ? ' Finalizada' : ' Cancelada'} 
                            {row.finalizedBy ? ` por ${row.finalizedBy}` : ''}
                            {row.finalizedAt ? ` el ${formatDate(row.finalizedAt)}` : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Coordinators acknowledgment section */}
                    {(isAdmin || isCoordinator) && (
                      <div className="turno-acknowledgments-section">
                        <div className="turno-acknowledgments-header">
                          <span className="turno-acknowledgments-title">
                            Enterados: {Object.values(row.acknowledgedBy || {}).filter(ack => ack?.checked).length}
                            / {Object.keys(row.acknowledgedBy || {}).length}
                          </span>
                        </div>
                        <div className="turno-acknowledgments-grid">
                          {coordinatorOptions.map((coordinator, coordIndex) => {
                            const isChecked = row.acknowledgedBy?.[coordinator.id]?.checked || false;
                            const canInteract = isAdmin || (isCoordinator && coordinator.username?.toLowerCase() === normalizedCurrentUsername);
                            
                            // Bloquear casillas si la nota está finalizada
                            const isNoteFinalized = FINALIZADOS_STATUSES.includes(row.status);
                            const isDisabled = !canInteract || isNoteFinalized;
                            
                            // Usar el campo correcto para el nombre
                            const displayName = coordinator.fullName || coordinator.name || 
                              (coordinator.firstName && coordinator.lastName ? `${coordinator.firstName} ${coordinator.lastName}`.trim() : null) ||
                              coordinator.username ||
                              `Coordinador ${coordinator.id}`;
                            
                            const noteId = row.id || row.Id || row.note?.id || index;
                            const coordinatorId = coordinator.id || coordIndex;
                            const inputId = `ack-${noteId}-${coordinatorId}`;
                            
                            return (
                              <div key={`coordinator-${coordinatorId}-note-${noteId}`} className="turno-acknowledgment-item">
                                <input
                                  key={`checkbox-${noteId}-${coordinatorId}`}
                                  type="checkbox"
                                  id={inputId}
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const realNoteId = row.id || row.Id || row.note?.id;
                                    
                                    if (!realNoteId) {
                                      console.error('❌ ERROR: noteId es undefined!', row);
                                      return;
                                    }
                                    handleCoordinatorAcknowledge(realNoteId, coordinator.id, e.target.checked);
                                  }}
                                  // Bloquear si no tiene permisos O si la nota está finalizada
                                  disabled={isDisabled}
                                  className="turno-acknowledgment-checkbox"
                                  style={{ 
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    accentColor: isAdmin ? '#10b981' : '#3b82f6',
                                    opacity: isDisabled ? 0.5 : 1
                                  }}
                                  title={
                                    isNoteFinalized
                                      ? 'Nota finalizada - no se pueden modificar los acknowledgments'
                                      : isAdmin 
                                        ? 'Administrador: puede marcar cualquier casilla'
                                        : coordinator.username?.toLowerCase() === normalizedCurrentUsername
                                          ? 'Puedes marcar tu casilla'
                                          : 'Solo puedes marcar tu propia casilla'
                                  }
                                />
                              <label 
                                key={`label-${noteId}-${coordinatorId}`}
                                htmlFor={inputId}
                                className="turno-acknowledgment-label"
                                style={{ 
                                  cursor: isDisabled ? 'not-allowed' : (canInteract ? 'pointer' : 'not-allowed'),
                                  opacity: isDisabled ? 0.5 : (canInteract ? 1 : 0.6)
                                }}
                              >
                                {displayName}
                              </label>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Botón de finalizar para notas de seguimiento */}
                    {row.type === 'seguimiento' && !FINALIZADOS_STATUSES.includes(row.status) && (isAdmin || isCoordinator) && (
                      <button
                        type="button"
                        className="btn-turno btn-turno--success btn-sm"
                        onClick={() => handleStatusChange(row.id, 'Completado')}
                      >
                        Finalizar Seguimiento
                      </button>
                    )}

                    {/* Botón de reactivar para notas finalizadas */}
                    {activeTab === 'finalizadas' && (isAdmin || isCoordinator) && FINALIZADOS_STATUSES.includes(row.status) && (
                      <button
                        type="button"
                        className="btn-turno btn-turno--primary btn-sm"
                        onClick={() => handleStatusChange(row.id, 'Pendiente')}
                        title={
                          isAdmin 
                            ? 'Administrador: puede reactivar cualquier nota'
                            : 'Coordinador: puede reactivar notas'
                        }
                      >
                        Reactivar
                      </button>
                    )}

                    {/* Botón de eliminar para admins */}
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn-turno btn-turno--danger btn-sm"
                        onClick={() => handleDeleteNote(row.id)}
                        disabled={deletingNoteIds.has(row.id)}
                      >
                        {deletingNoteIds.has(row.id) ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Modal para crear nota */}
        <ModernModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Nueva nota de entrega de turno"
          onSubmit={handleCreateNote}
          submitText="Crear nota"
          submitDisabled={!newNoteDescription.trim()}
          loading={creatingNote}
        >
          {createModalError && (
            <div className="alert alert-danger" role="alert">
              {createModalError}
            </div>
          )}

          <div className="modern-form-group">
            <label className="modern-form-label">Descripción de la nota *</label>
            <textarea
              className="modern-form-textarea"
              rows={4}
              placeholder="Describe la incidencia, eventos importantes o información clave del turno..."
              value={newNoteDescription}
              onChange={(e) => setNewNoteDescription(e.target.value)}
              disabled={creatingNote}
            />
          </div>

          <div className="modern-form-group">
            <label className="modern-form-label">Tipo *</label>
            <select
              className="modern-form-select"
              value={newNoteType}
              onChange={(e) => setNewNoteType(e.target.value)}
              disabled={creatingNote}
            >
              <option value="informativo">Informativo</option>
              <option value="seguimiento">Seguimiento</option>
            </select>
          </div>
        </ModernModal>
      </main>
      <Footer />
    </div>
  );
};

export default EntregaTurno;
