import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import MainNavbar from '../components/Layout/MainNavbar';
import Footer from '../components/Layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useUserManagement } from '../contexts/UserManagementContext';
import api from '../services/api';
import ModernModal from '../components/Common/ModernModal';
import '../components/Common/ModernModal.css';
import './EntregaTurno.css';
import './EntregaTurno-titles.css';

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

const findUserIdByUsername = (username, coordinators, allUsers = null) => {
  if (!username) return null;
  
  console.log(`🔍 Buscando usuario "${username}" en coordinadores:`, coordinators);
  
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

const extractIdFromToken = () => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      console.log('🔍 Token encontrado:', token.substring(0, 50) + '...');
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('🔍 Payload del token:', payload);
      
      const possibleIds = [
        payload.sub,
        payload.userId,
        payload.id,
        payload.nameidentifier,
        payload.unique_name,
        payload.username
      ];
      
      console.log('🔍 Posibles IDs encontrados:', possibleIds);
      
      const id = possibleIds.find(id => id != null);
      if (id) {
        if (typeof id === 'string' && isNaN(id)) {
          console.log('🔍 El ID es un nombre, buscando en coordinadores...');
          return null;
        }
        
        return typeof id === 'string' && !isNaN(id) ? parseInt(id) : id;
      }
    }
  } catch (err) {
    console.warn('No se pudo extraer ID del token:', err);
  }
  return null;
};

const getUserName = (user) => {
  if (!user) return 'Usuario';
  return user.username || user.name || user.fullName || 
         (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : null) ||
         'Usuario';
};

const getUserNameById = (userId, coordinators, allUsers = null) => {
  console.log(`🔍 Buscando usuario con ID: ${userId}`);
  console.log(`👥 Coordinadores disponibles:`, coordinators.map(c => ({ id: c.id, name: c.fullName || c.username })));
  
  if (!userId) return 'Usuario';
  
  if (coordinators) {
    const coordinator = coordinators.find(c => c.id == userId);
    console.log(`🎯 Coordinador encontrado:`, coordinator);
    
    if (coordinator) {
      const name = coordinator.fullName || coordinator.name || 
        (coordinator.firstName && coordinator.lastName ? `${coordinator.firstName} ${coordinator.lastName}`.trim() : null) ||
        coordinator.username ||
        `Coordinador ${coordinator.id}`;
      console.log(`✅ Nombre encontrado: "${name}"`);
      return name;
    }
  }
  
  if (allUsers) {
    const user = allUsers.find(u => u.id == userId);
    console.log(`🎯 Usuario encontrado en allUsers:`, user);
    
    if (user) {
      const name = user.fullName || user.name || 
        (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : null) ||
        user.username ||
        `Usuario ${user.id}`;
      console.log(`✅ Nombre encontrado en allUsers: "${name}"`);
      return name;
    }
  }
  
  console.log(`❌ No se encontró nombre para ID ${userId}`);
  return 'Usuario';
};

const EntregaTurno = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { openUserManagementModal } = useUserManagement();
  
  const [rows, setRows] = useState([]);
  const [coordinatorOptions, setCoordinatorOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('activas');
  const [ackLoadingKeys, setAckLoadingKeys] = useState(new Set());
  const [deletingNoteIds, setDeletingNoteIds] = useState(new Set());

  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [notesPerPage] = useState(5);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteDescription, setNewNoteDescription] = useState('');
  const [newNoteType, setNewNoteType] = useState('informativo');
  const [newNotePriority, setNewNotePriority] = useState('Media');
  const [creatingNote, setCreatingNote] = useState(false);
  const [createModalError, setCreateModalError] = useState('');

  const isAdmin = currentUser?.role === 'Administrador';
  const isCoordinator = currentUser?.role === 'Coordinador';
  const normalizedCurrentUsername = currentUser?.username?.trim().toLowerCase() ?? '';
  
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      const matchesSearch = row.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           row.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = priorityFilter === 'todos' || row.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [rows, searchTerm, priorityFilter]);

  const indexOfLastNote = currentPage * notesPerPage;
  const indexOfFirstNote = indexOfLastNote - notesPerPage;
  const currentNotes = filteredRows.slice(indexOfFirstNote, indexOfLastNote);
  const totalPages = Math.ceil(filteredRows.length / notesPerPage);

  const activeTasks = currentNotes.filter(row => !FINALIZADOS_STATUSES.includes(row.status));
  const finalizedTasks = currentNotes.filter(row => FINALIZADOS_STATUSES.includes(row.status));

  const hasPermissionToInteract = isAdmin;
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
        api.get('/ShiftHandOff'),
        api.get('/User/coordinators'),
      ]);

      const notes = notesResponse?.data?.notes ?? notesResponse?.data?.data ?? notesResponse?.data ?? [];
      const coordinators = coordinatorsResponse?.data?.data ?? coordinatorsResponse?.data ?? [];

      const safeNotes = Array.isArray(notes) ? notes : [];
      const safeCoordinators = Array.isArray(coordinators) ? coordinators : [];

      const localAcknowledgments = JSON.parse(localStorage.getItem('turnoAcknowledgments') || '{}');
      const validCoordinatorIds = safeCoordinators.map(c => c.id.toString());
      
      let cleanedAny = false;
      Object.keys(localAcknowledgments).forEach(noteId => {
        const noteAck = localAcknowledgments[noteId];
        const cleanedNoteAck = {};
        
        Object.keys(noteAck).forEach(key => {
          if (!/^\d+$/.test(key) || validCoordinatorIds.includes(key)) {
            cleanedNoteAck[key] = noteAck[key];
          } else {
            cleanedAny = true;
          }
        });
        
        localAcknowledgments[noteId] = cleanedNoteAck;
      });
      
      if (cleanedAny) {
        localStorage.setItem('turnoAcknowledgments', JSON.stringify(localAcknowledgments));
      }

      const mappedRows = safeNotes.map((note) => {
        const transformedAcknowledgedBy = {};
        
        if (note.acknowledgements && Array.isArray(note.acknowledgements)) {
          note.acknowledgements.forEach(ack => {
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
        
        if (localAcknowledgments[note.id]) {
          Object.assign(transformedAcknowledgedBy, localAcknowledgments[note.id]);
          
          if (localAcknowledgments[note.id]._autoCompleted && note.status === 'Completado') {
            note.status = 'Completado';
            note.finalizedAt = localAcknowledgments[note.id]._autoCompletedAt;
            note.finalizedByUserId = localAcknowledgments[note.id]._autoCompletedBy;
            console.log(`🔄 Restaurando finalización desde localStorage para nota ${note.id}:`, JSON.stringify({
              finalizedAt: note.finalizedAt,
              finalizedByUserId: note.finalizedByUserId
            }, null, 2));
          } else if (localAcknowledgments[note.id]._autoCompleted && note.status !== 'Completado') {
            delete localAcknowledgments[note.id]._autoCompleted;
            delete localAcknowledgments[note.id]._autoCompletedAt;
            delete localAcknowledgments[note.id]._autoCompletedBy;
            localStorage.setItem('turnoAcknowledgments', JSON.stringify(localAcknowledgments));
          }
        }
        
        if (FINALIZADOS_STATUSES.includes(note.status) && (note.finalizedAt || note.finalizedByUserId)) {
          console.log(`📝 Nota ${note.id} con datos de finalización del backend:`, JSON.stringify({
            status: note.status,
            finalizedAt: note.finalizedAt,
            finalizedByUserId: note.finalizedByUserId,
            finalizedBy: note.finalizedBy
          }, null, 2));
          
          if (note.finalizedByUserId) {
            const userName = getUserNameById(note.finalizedByUserId, safeCoordinators, [{ ...currentUser, id: 1 }]);
            console.log(`🔍 getUserNameById(${note.finalizedByUserId}) = "${userName}"`);
          }
        }
        
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
          title: note.title ?? '',
          description: note.description ?? '',
          type: note.type ?? DEFAULT_TYPE,
          priority: note.priority ?? DEFAULT_PRIORITY,
          assignedCoordinatorId: note.assignedCoordinatorId ?? null,
          acknowledgedBy: transformedAcknowledgedBy,
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
    if (!currentUser) {
      setError('Debes estar autenticado para crear notas.');
      return;
    }

    setShowCreateModal(true);
    setNewNoteTitle('');
    setNewNoteDescription('');
    setNewNoteType('informativo');
    setCreateModalError('');
  }, [currentUser]);

  const resetCreateModal = useCallback(() => {
    setNewNoteTitle('');
    setNewNoteDescription('');
    setNewNoteType('informativo');
    setNewNotePriority('Media');
    setCreateModalError('');
  }, []);

  const handleCreateNote = useCallback(async () => {
    if (!newNoteTitle.trim() || !newNoteDescription.trim()) {
      setCreateModalError('El título y la descripción de la nota son requeridos.');
      return;
    }

    try {
      setCreatingNote(true);
      setCreateModalError('');

      const payload = {
        title: newNoteTitle.trim(),
        description: newNoteDescription.trim(),
        type: newNoteType,
        priority: newNotePriority,
        status: DEFAULT_STATUS,
        createdByUserId: currentUser?.id,
        createdAt: new Date().toISOString()
      };

      const response = await api.post('/ShiftHandOff', payload);
      const newNote = response?.data?.data ?? response?.data;

      if (newNote) {
        const processedNote = {
          ...newNote,
          status: newNote.status ?? DEFAULT_STATUS,
          title: newNote.title ?? newNoteTitle.trim(),
          description: newNote.description ?? newNoteDescription.trim(),
          type: newNote.type ?? newNoteType,
          priority: newNote.priority ?? newNotePriority,
          acknowledgedBy: newNote.acknowledgedBy ?? {},
          createdBy: newNote.createdBy ?? currentUser,
          createdAt: newNote.createdAt ?? new Date().toISOString(),
        };

        setRows((prev) => [processedNote, ...prev]);
      }

      setShowCreateModal(false);
      setNewNoteTitle('');
      setNewNoteDescription('');
      setNewNoteType('informativo');
      setNewNotePriority('Media');
    } catch (err) {
      console.error('Error al crear nota:', err);
      setCreateModalError('No se pudo crear la nota.');
    } finally {
      setCreatingNote(false);
    }
  }, [newNoteTitle, newNoteDescription, newNoteType, newNotePriority, currentUser]);

  const handleTitleChange = useCallback((noteId, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === noteId ? { ...row, title: value, hasUnsavedChanges: true } : row
      )
    );
  }, []);

  const handleTitleBlur = useCallback(async (noteId, value) => {
    const row = rows.find((r) => r.id === noteId);
    if (!row || row.title === value) return;

    try {
      await api.put(`/ShiftHandOff/${noteId}`, { title: value });
      setRows((prev) =>
        prev.map((r) => (r.id === noteId ? { ...r, title: value, hasUnsavedChanges: false } : r))
      );
    } catch (err) {
      setError('No se pudo actualizar el título.');
      setRows((prev) =>
        prev.map((r) => (r.id === noteId ? { ...r, title: row.title, hasUnsavedChanges: false } : r))
      );
    }
  }, [rows]);

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
      await api.put(`/ShiftHandOff/${noteId}`, { description: value });
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
      await api.put(`/ShiftHandOff/${noteId}`, { type });
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
      await api.put(`/ShiftHandOff/${noteId}`, { priority });
      setRows((prev) =>
        prev.map((row) =>
          row.id === noteId ? { ...row, priority } : row
        )
      );
    } catch (err) {
      setError('No se pudo actualizar la prioridad.');
    }
  }, []);

  const handleStatusChange = useCallback(async (noteId, status, finalizerName = null) => {
    try {
      console.log(`🔄 Cambiando estatus de nota ${noteId} a ${status}`);
      
      const updateData = { status };
      
      if (FINALIZADOS_STATUSES.includes(status)) {
        updateData.finalizedAt = new Date().toISOString();
        const userId = currentUser?.id || currentUser?.userId || currentUser?.sub || 
                      extractIdFromToken() || 
                      (currentUser?.username ? findUserIdByUsername(currentUser.username, coordinatorOptions, [{ ...currentUser, id: 1 }]) : null) ||
                      (currentUser?.fullName ? '2' : null);
        
        if (!userId || userId === null || userId === undefined) {
          console.warn('⚠️ No se pudo obtener ID de usuario, usando valor por defecto');
          updateData.finalizedByUserId = 2;
        } else {
          updateData.finalizedByUserId = userId;
        }
        
        console.log('🔍 Intentando obtener ID de usuario:');
        console.log('  - currentUser.id:', currentUser?.id);
        console.log('  - currentUser.userId:', currentUser?.userId);
        console.log('  - currentUser.sub:', currentUser?.sub);
        console.log('  - extractIdFromToken():', extractIdFromToken());
        console.log('  - currentUser.username:', currentUser?.username);
        console.log('  - findUserIdByUsername():', currentUser?.username ? findUserIdByUsername(currentUser.username, coordinatorOptions, [{ ...currentUser, id: 1 }]) : null);
        console.log('  - ID final usado:', updateData.finalizedByUserId);
        
        console.log('📝 Enviando datos de finalización:', JSON.stringify({
          finalizedAt: updateData.finalizedAt,
          finalizedByUserId: updateData.finalizedByUserId
        }, null, 2));
        console.log('📝 Datos completos enviados al backend:', JSON.stringify(updateData, null, 2));
      } else {
        updateData.finalizedAt = null;
        updateData.finalizedByUserId = null;
      }
      
      console.log('👤 currentUser completo:', JSON.stringify(currentUser, null, 2));
      console.log('🆔 currentUser.id:', currentUser?.id);
      console.log('🆔 currentUser.username:', currentUser?.username);
      console.log('👥 coordinatorOptions:', coordinatorOptions.map(c => ({ id: c.id, username: c.username, fullName: c.fullName })));
      
      const response = await api.put(`/ShiftHandOff/${noteId}`, updateData);
      console.log('✅ Respuesta del backend:', JSON.stringify(response, null, 2));
      
      const currentRow = rows.find(row => row.id === noteId);
      
      let finalizerDisplayName = finalizerName;
      if (!finalizerDisplayName) {
        finalizerDisplayName = getUserName(currentUser);
      }
      
      setRows((prev) =>
        prev.map((row) =>
          row.id === noteId
            ? {
                ...row,
                status,
                finalizedAt: updateData.finalizedAt,
                finalizedBy: updateData.finalizedByUserId ? finalizerDisplayName : null,
                finalizedByUserId: updateData.finalizedByUserId,
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

      if (!FINALIZADOS_STATUSES.includes(status)) {
        const localAcknowledgments = JSON.parse(localStorage.getItem('turnoAcknowledgments') || '{}');
        if (localAcknowledgments[noteId] && localAcknowledgments[noteId]._autoCompleted) {
          delete localAcknowledgments[noteId]._autoCompleted;
          delete localAcknowledgments[noteId]._autoCompletedAt;
          delete localAcknowledgments[noteId]._autoCompletedBy;
          localStorage.setItem('turnoAcknowledgments', JSON.stringify(localAcknowledgments));
        }
        
        if (isCoordinator && currentUser?.id) {
          try {
            await api.put(`/ShiftHandOff/${noteId}/acknowledge`, {
              coordinatorId: currentUser.id,
              checked: false
            });
            console.log(`✅ Casilla de ${currentUser.username} desmarcada al reactivar nota`);
          } catch (ackErr) {
            console.warn('No se pudo limpiar acknowledgment al reactivar:', ackErr);
          }
        }
      }
      
      if (FINALIZADOS_STATUSES.includes(status)) {
        const actionText = status === 'Completado' ? 'finalizada' : 'cancelada';
        const userName = finalizerDisplayName || getUserName(currentUser);
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
      console.error('Error al cambiar estatus:', err);
      
      if (err.response) {
        console.error('Error response:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
        setError(`Error al actualizar estatus: ${err.response.status} - ${err.response.data?.message || err.response.data || 'Error desconocido'}`);
      } else {
        setError(`Error al actualizar estatus: ${err.message || 'No se pudo actualizar el estatus.'}`);
      }
      
      toast.error(`❌ Error: ${err.response?.data?.message || err.message || 'No se pudo actualizar el estatus'}`);
    }
  }, [currentUser, isCoordinator, coordinatorOptions, rows]);

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

  const currentTasks = activeTab === 'activas' ? activeTasks : finalizedTasks;

  const checkAllCoordinatorsAcknowledged = useCallback((noteId) => {
    const note = rows.find(row => row.id === noteId);
    if (!note || coordinatorOptions.length === 0) return false;

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

  const autoMoveToCompleted = useCallback(async (noteId) => {
    const note = rows.find(row => row.id === noteId);
    if (!note) return;
    
    if (note.type !== 'informativo') {
      return;
    }
    
    if (FINALIZADOS_STATUSES.includes(note.status)) {
      return;
    }
    
    if (checkAllCoordinatorsAcknowledged(noteId)) {
      try {
        const localAcknowledgments = JSON.parse(localStorage.getItem('turnoAcknowledgments') || '{}');
        if (localAcknowledgments[noteId]) {
          localAcknowledgments[noteId]._autoCompleted = true;
          localAcknowledgments[noteId]._autoCompletedAt = new Date().toISOString();
          localAcknowledgments[noteId]._autoCompletedBy = currentUser?.id || 2;
          localStorage.setItem('turnoAcknowledgments', JSON.stringify(localAcknowledgments));
        }
        
        await api.put(`/ShiftHandOff/${noteId}`, { status: 'Completado' });
        
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

  const handleDeleteNote = useCallback(async (noteId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta nota? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await api.delete(`/ShiftHandOff/${noteId}`);
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

      const payload = { 
        coordinatorId, 
        checked,
        acknowledgedBy: currentUser?.id || 2
      };
      
      console.log(`📤 Enviando al backend:`, JSON.stringify(payload, null, 2));
      
      let response;
      try {
        response = await api.put(`/ShiftHandOff/${noteId}/acknowledgements`, payload);
        console.log(`✅ Respuesta del backend:`, JSON.stringify(response.data, null, 2));
      } catch (firstError) {
        console.log(`❌ Primer intento fallido:`, firstError);
        const simplePayload = { 
          coordinatorId, 
          checked
        };
        
        console.log(`📤 Enviando payload simplificado:`, JSON.stringify(simplePayload, null, 2));
        response = await api.put(`/ShiftHandOff/${noteId}/acknowledgements`, simplePayload);
        console.log(`✅ Respuesta con payload simplificado:`, JSON.stringify(response.data, null, 2));
      }
      
      setTimeout(() => {
        const updatedNote = rows.find(row => row.id === noteId);
        if (updatedNote) {
          if (updatedNote.type === 'informativo') {
            const allCoordinatorsChecked = coordinatorOptions.every(coordinator => {
              return updatedNote.acknowledgedBy?.[coordinator.id]?.checked || false;
            });
            
            console.log(`🔍 Verificación auto-finalización para nota ${noteId}:`);
            console.log(`  - Tipo: ${updatedNote.type}`);
            console.log(`  - Todas las casillas marcadas: ${allCoordinatorsChecked}`);
            console.log(`  - Estado actual: ${updatedNote.status}`);
            
            if (allCoordinatorsChecked && updatedNote.status !== 'Completado') {
              console.log(`🚀 Auto-finalizando nota informativa ${noteId}...`);
              const userName = getUserName(currentUser);
              handleStatusChange(noteId, 'Completado', userName);
              toast.success(`✅ Nota informativa finalizada automáticamente por ${userName} (todos los coordinadores enterados)`);
            }
          }
        }
      }, 1000);

    } catch (err) {
      console.error('Error al guardar acknowledgment:', err);
      setRows(prev => prev.map(row => {
        if (row.id === noteId) {
          const originalState = row.acknowledgedBy?.[coordinatorId];
          return {
            ...row,
            acknowledgedBy: {
              ...row.acknowledgedBy,
              [coordinatorId]: {
                ...originalState,
                checked: !checked,
                timestamp: originalState?.timestamp || null
              }
            }
          };
        }
        return row;
      }));
      
      setError('No se pudo guardar el acknowledgment.');
    } finally {
      setAckLoadingKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${noteId}-${coordinatorId}`);
        return newSet;
      });
    }
  }, [currentUser, autoMoveToCompleted, setError, rows, coordinatorOptions]);

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
        isAdmin={currentUser?.role === 'Administrador'}
        onManageUsers={currentUser?.role === 'Administrador' ? handleManageUsers : undefined}
        onLogout={handleLogout}
      />

      <main>
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

        <div className="turno-filters mb-4">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por título o descripción..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="todos">Todas las prioridades</option>
                <option value="Alta">Prioridad Alta</option>
                <option value="Media">Prioridad Media</option>
                <option value="Baja">Prioridad Baja</option>
              </select>
            </div>
            <div className="col-md-2">
              <div className="text-muted small d-flex align-items-center h-100">
                {filteredRows.length} {filteredRows.length === 1 ? 'nota' : 'notas'} encontradas
              </div>
            </div>
          </div>
        </div>

        <div className="turno-card">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

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

          {totalPages > 1 && (
            <div className="turno-pagination mb-4">
              <div className="d-flex justify-content-between align-items-center">
                <div className="text-muted small">
                  Página {currentPage} de {totalPages} ({filteredRows.length} notas totales)
                </div>
                <div className="btn-group" role="group">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <i className="bi bi-chevron-left"></i> Anterior
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>
          )}

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
                        <h4 className="turno-note-title">{row.title || 'Sin título'}</h4>
                        <div className="turno-note-time">
                          {formatDate(row.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="turno-note-content">
                      <div className="turno-note-description">
                        <textarea
                          className="turno-form-textarea"
                          rows={3}
                          placeholder="Describe la nota o incidencia..."
                          value={row.description}
                          onChange={(event) => handleDescriptionChange(row.id, event.target.value)}
                          onBlur={(event) => handleDescriptionBlur(row.id, event.target.value)}
                            disabled={!hasPermissionToInteract || FINALIZADOS_STATUSES.includes(row.status)}
                        />
                      </div>
                    </div>

                    <div className="turno-note-footer">
                      <div className="turno-note-meta-controls">
                        <div className="turno-note-type-control">
                          <label className="turno-form-label-small">Tipo:</label>
                          <select
                            className="turno-form-select turno-form-select--small"
                            value={row.type || 'informativo'}
                            onChange={(event) => handleTypeChange(row.id, event.target.value)}
                            disabled={!hasPermissionToInteract || FINALIZADOS_STATUSES.includes(row.status)}
                          >
                            <option value="informativo">Informativo</option>
                            <option value="seguimiento">Seguimiento</option>
                          </select>
                        </div>
                        <div className="turno-note-priority-control">
                          <label className="turno-form-label-small">Prioridad:</label>
                          <select
                            className="turno-form-select turno-form-select--small"
                            value={row.priority || 'Media'}
                            onChange={(event) => handlePriorityChange(row.id, event.target.value)}
                            disabled={!hasPermissionToInteract || FINALIZADOS_STATUSES.includes(row.status)}
                          >
                            <option value="Alta">Alta</option>
                            <option value="Media">Media</option>
                            <option value="Baja">Baja</option>
                          </select>
                        </div>
                        <div className="turno-note-status-control">
                          <label className="turno-form-label-small">Estatus:</label>
                          {isAdmin ? (
                            <select
                              className="turno-form-select"
                              value={row.status || 'Pendiente'}
                              onChange={(event) => handleStatusChange(row.id, event.target.value)}
                              disabled={!hasPermissionToInteract || FINALIZADOS_STATUSES.includes(row.status)}
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
                            
                            const isNoteFinalized = FINALIZADOS_STATUSES.includes(row.status);
                            const isDisabled = !canInteract || isNoteFinalized;
                            
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
                                  type="checkbox"
                                  id={inputId}
                                  className="turno-acknowledgment-checkbox"
                                  checked={!!(row.acknowledgedBy?.[coordinatorId]?.checked)}
                                  disabled={!isCoordinator || FINALIZADOS_STATUSES.includes(row.status)}
                                  onChange={() => handleCoordinatorAcknowledge(noteId, coordinatorId, !!(row.acknowledgedBy?.[coordinatorId]?.checked))}
                                />
                                <label 
                                  htmlFor={inputId}
                                  className="turno-acknowledgment-label"
                                >
                                  {displayName}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="turno-action-buttons">
                      {row.type === 'seguimiento' && !FINALIZADOS_STATUSES.includes(row.status) && (isAdmin || isCoordinator) && (
                        <button
                          type="button"
                          className="btn-turno btn-turno--success btn-sm"
                          onClick={() => {
                            const userName = getUserName(currentUser);
                            handleStatusChange(row.id, 'Completado', userName);
                          }}
                        >
                          Finalizar Seguimiento
                        </button>
                      )}

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
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <ModernModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Nueva nota de entrega de turno"
          onSubmit={handleCreateNote}
          submitText="Crear nota"
          submitDisabled={!newNoteTitle.trim() || !newNoteDescription.trim() || !newNotePriority.trim()}
          loading={creatingNote}
        >
          {createModalError && (
            <div className="alert alert-danger" role="alert">
              {createModalError}
            </div>
          )}

          <div className="modern-form-group">
            <label className="modern-form-label">Título de la nota *</label>
            <input
              type="text"
              className="modern-form-input"
              placeholder="Título breve y claro de la nota..."
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              disabled={creatingNote}
            />
          </div>

          <div className="modern-form-group">
            <label className="modern-form-label">Prioridad *</label>
            <select
              className="modern-form-select"
              value={newNotePriority}
              onChange={(e) => setNewNotePriority(e.target.value)}
              disabled={creatingNote}
            >
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
          </div>

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
