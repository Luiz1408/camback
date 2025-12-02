import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { toast } from 'react-toastify';
import MainNavbar from '../components/Layout/MainNavbar';
import Footer from '../components/Layout/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useUserManagement } from '../contexts/UserManagementContext';
import { formatDateTime } from '../utils/date';
import {
  fetchTechnicalActivities,
  createTechnicalActivity,
  updateTechnicalActivity,
  fetchTechnicalActivitiesSummary,
  deleteTechnicalActivity,
} from '../services/technicalActivities';
import api from '../services/api';
import ModernModal from '../components/Common/ModernModal';
import '../components/Common/ModernModal.css';
import 'react-datepicker/dist/react-datepicker.css';
import './PlaneacionTecnica.css';
import './PlaneacionTecnica-images.css';
import './PlaneacionTecnica-modal.css';
import './PlaneacionTecnica-edit-images.css';

const STATUS_OPTIONS = [
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'En proceso', label: 'En proceso' },
  { value: 'Programado', label: 'Programado' },
  { value: 'Completada', label: 'Completada' },
  { value: 'No realizada', label: 'No realizada' },
];

const PlaneacionTecnica = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { users } = useUserManagement();

  // Estados principales
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, completed: 0, pending: 0 });

  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [activitiesPerPage] = useState(5);

  // Estados para imágenes
  const [antesImage, setAntesImage] = useState(null);
  const [despuesImage, setDespuesImage] = useState(null);
  const [antesPreview, setAntesPreview] = useState(null);
  const [despuesPreview, setDespuesPreview] = useState(null);
  const [imageError, setImageError] = useState('');

  // Estados para modal de imagen
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [modalImageType, setModalImageType] = useState('');
  const [modalImageFileName, setModalImageFileName] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [modalImages, setModalImages] = useState([]);

  // Estados para formulario
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Pendiente');
  const [formError, setFormError] = useState('');
  const [creatingActivity, setCreatingActivity] = useState(false);
  const [updatingActivity, setUpdatingActivity] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const displayName = useMemo(() => {
    if (!currentUser) return '';
    const firstName = (currentUser.firstName || '').split(' ').map(part => part.trim()).filter(Boolean)[0];
    const lastName = (currentUser.lastName || '').split(' ').map(part => part.trim()).filter(Boolean)[0];
    if (firstName || lastName) return [firstName, lastName].filter(Boolean).join(' ');
    return currentUser.fullName || currentUser.username || '';
  }, [currentUser]);

  // Filtrar actividades por búsqueda y estatus
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const matchesSearch = activity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           activity.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'todos' || activity.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [activities, searchTerm, statusFilter]);

  // Paginación
  const indexOfLastActivity = currentPage * activitiesPerPage;
  const indexOfFirstActivity = indexOfLastActivity - activitiesPerPage;
  const currentActivities = filteredActivities.slice(indexOfFirstActivity, indexOfLastActivity);
  const totalPages = Math.ceil(filteredActivities.length / activitiesPerPage);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const [activitiesData, summaryData] = await Promise.all([
        fetchTechnicalActivities(),
        fetchTechnicalActivitiesSummary()
      ]);
      
      setActivities(activitiesData || []);
      setSummary(summaryData || { total: 0, completed: 0, pending: 0 });
    } catch (error) {
      console.error('Error cargando actividades:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔍 DEBUG: showEditModal changed to:', showEditModal);
    console.log('🔍 DEBUG: editingActivity:', editingActivity);
    console.log('🔍 DEBUG: existingImages:', existingImages);
  }, [showEditModal, editingActivity, existingImages]);

  useEffect(() => {
    loadActivities();
  }, []);

  // Funciones para manejar imágenes
  const handleAntesImageChange = (e) => {
    const file = e.target.files[0];
    console.log('📷 Archivo ANTES seleccionado:', file);
    
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setImageError('Solo se permiten imágenes (JPG, PNG, GIF)');
        return;
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setImageError('La imagen no debe ser mayor a 5MB');
        return;
      }
      
      setAntesImage(file);
      const previewUrl = URL.createObjectURL(file);
      console.log('🔗 Preview URL ANTES:', previewUrl);
      setAntesPreview(previewUrl);
      setImageError('');
    }
  };

  const handleDespuesImageChange = (e) => {
    const file = e.target.files[0];
    console.log('📷 Archivo DESPUÉS seleccionado:', file);
    
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setImageError('Solo se permiten imágenes (JPG, PNG, GIF)');
        return;
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setImageError('La imagen no debe ser mayor a 5MB');
        return;
      }
      
      setDespuesImage(file);
      const previewUrl = URL.createObjectURL(file);
      console.log('🔗 Preview URL DESPUÉS:', previewUrl);
      setDespuesPreview(previewUrl);
      setImageError('');
    }
  };

  const clearAntesImage = () => {
    setAntesImage(null);
    setAntesPreview(null);
  };

  const clearDespuesImage = () => {
    setDespuesImage(null);
    setDespuesPreview(null);
  };

  // Funciones para modal de imagen
  const openImageModal = (imageUrl, imageType, fileName, allImages = [], currentIndex = 0) => {
    const fullImageUrl = imageUrl.startsWith('http') 
      ? imageUrl 
      : `http://localhost:5236${imageUrl}`;
    
    console.log(`🔍 URL del modal: ${fullImageUrl}`);
    console.log(`🔍 Tipo de imagen: ${imageType}`);
    console.log(`🔍 Nombre archivo: ${fileName}`);
    
    setModalImage(fullImageUrl);
    setModalImageType(imageType);
    setModalImageFileName(fileName);
    setCurrentImageIndex(currentIndex);
    setModalImages(allImages);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setModalImage(null);
    setModalImageType('');
    setModalImageFileName('');
    setCurrentImageIndex(0);
    setModalImages([]);
  };

  const navigateImage = (direction) => {
    if (modalImages.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentImageIndex + 1) % modalImages.length;
    } else {
      newIndex = currentImageIndex === 0 ? modalImages.length - 1 : currentImageIndex - 1;
    }
    
    const newImage = modalImages[newIndex];
    const fullImageUrl = newImage.url.startsWith('http') 
      ? newImage.url 
      : `http://localhost:5236${newImage.url}`;
    
    console.log(`🔍 Navegando a imagen: ${fullImageUrl}`);
    
    setModalImage(fullImageUrl);
    setModalImageType(newImage.type);
    setModalImageFileName(newImage.originalFileName);
    setCurrentImageIndex(newIndex);
  };

  // Manejo de teclas
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showImageModal) return;
      
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          closeImageModal();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigateImage('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateImage('next');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showImageModal, currentImageIndex, modalImages]);

  const resetForm = () => {
    setDescription('');
    setStartDate(null);
    setEndDate(null);
    setNotes('');
    setStatus('Pendiente');
    clearAntesImage();
    clearDespuesImage();
    setImageError('');
    setFormError('');
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    resetForm();
  };

  const openEditModal = (activity) => {
    console.log('🔍 DEBUG: openEditModal called with activity:', activity);
    console.log('🔍 DEBUG: existingImages before setting:', existingImages);
    
    setEditingActivity(activity);
    setDescription(activity.description || '');
    setStartDate(activity.startDate ? new Date(activity.startDate) : null);
    setEndDate(activity.endDate ? new Date(activity.endDate) : null);
    setNotes(activity.notes || '');
    setStatus(activity.status || 'Pendiente');
    clearAntesImage();
    clearDespuesImage();
    setImageError('');
    setFormError('');
    // Guardar imágenes existentes para mostrarlas
    setExistingImages(activity.images || []);
    console.log('🔍 DEBUG: existingImages after setting:', activity.images || []);
    console.log('🔍 DEBUG: About to set showEditModal to true');
    setShowEditModal(true);
    console.log('🔍 DEBUG: openEditModal completed');
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingActivity(null);
    setExistingImages([]);
    resetForm();
  };

  const handleCreateActivity = async () => {
    if (!description.trim()) {
      setFormError('La descripción es requerida');
      return;
    }

    try {
      setCreatingActivity(true);
      setFormError('');

      const formData = new FormData();
      
      // Agregar campos del formulario
      formData.append('description', description.trim());
      formData.append('notes', notes.trim());
      formData.append('status', status);
      
      if (startDate) {
        formData.append('startDate', startDate.toISOString());
      }
      
      if (endDate) {
        formData.append('endDate', endDate.toISOString());
      }

      // Agregar imágenes si existen
      if (antesImage) {
        formData.append('antesImage', antesImage);
      }
      
      if (despuesImage) {
        formData.append('despuesImage', despuesImage);
      }

      const newActivity = await createTechnicalActivity(formData);
      
      if (newActivity) {
        setActivities(prev => [newActivity, ...prev]);
        toast.success('✅ Actividad técnica creada exitosamente');
        closeCreateModal();
      }
    } catch (error) {
      console.error('Error creating activity:', error);
      setFormError('Error al crear la actividad. Por favor intente nuevamente.');
      toast.error('❌ Error al crear la actividad');
    } finally {
      setCreatingActivity(false);
    }
  };

  const handleUpdateActivity = async () => {
    if (!editingActivity || !description.trim()) {
      setFormError('La descripción es requerida');
      return;
    }

    try {
      setUpdatingActivity(true);
      setFormError('');

      // Primero actualizar los datos básicos
      const updateData = {
        description: description.trim(),
        notes: notes.trim(),
        status: status,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
      };

      const updatedActivity = await updateTechnicalActivity(editingActivity.id, updateData);
      
      // Luego actualizar las imágenes si hay nuevas
      if (antesImage || despuesImage) {
        const formData = new FormData();
        
        if (antesImage) {
          formData.append('antesImages', antesImage);
        }
        
        if (despuesImage) {
          formData.append('despuesImages', despuesImage);
        }

        try {
          await api.post(`/TechnicalActivities/${editingActivity.id}/images`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        } catch (imageError) {
          console.error('Error updating images:', imageError);
          // No fallar toda la operación si las imágenes fallan
        }
      }
      
      if (updatedActivity) {
        setActivities(prev => 
          prev.map(activity => 
            activity.id === editingActivity.id 
              ? { ...activity, ...updatedActivity }
              : activity
          )
        );
        toast.success('✅ Actividad técnica actualizada exitosamente');
        closeEditModal();
        // Recargar para obtener las imágenes actualizadas
        loadActivities();
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      setFormError('Error al actualizar la actividad. Por favor intente nuevamente.');
      toast.error('❌ Error al actualizar la actividad');
    } finally {
      setUpdatingActivity(false);
    }
  };

  const handleDeleteExistingImage = async (imageId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
      return;
    }

    try {
      await api.delete(`/TechnicalActivities/images/${imageId}`);
      // Actualizar la lista de imágenes existentes
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('✅ Imagen eliminada exitosamente');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('❌ Error al eliminar la imagen');
    }
  };

  const handleUpdateActivityStatus = async (activityId, newStatus) => {
    try {
      await updateTechnicalActivity(activityId, { status: newStatus });
      await loadActivities();
    } catch (error) {
      console.error('Error actualizando estado:', error);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta actividad?')) {
      return;
    }

    try {
      await deleteTechnicalActivity(activityId);
      await loadActivities();
    } catch (error) {
      console.error('Error eliminando actividad:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleManageUsers = () => {
    navigate('/users');
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completada':
        return 'success';
      case 'no realizada':
        return 'secondary';
      case 'pendiente':
      case 'en proceso':
      case 'programado':
      default:
        return 'warning';
    }
  };

  return (
    <div className="planeacion-container">
      <MainNavbar
        displayName={displayName || currentUser?.username || ''}
        role={currentUser?.role}
        isAdmin={currentUser?.role === 'Administrador'}
        onManageUsers={currentUser?.role === 'Administrador' ? handleManageUsers : undefined}
        onLogout={handleLogout}
      />

      <main>
        {/* Header */}
        <div className="planeacion-header">
          <div>
            <h1 className="planeacion-title">Planeación técnica</h1>
            <p className="planeacion-subtitle">
              Registra actividades técnicas, define su estatus y dale seguimiento en un solo lugar.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-planeacion btn-planeacion--outline"
              onClick={loadActivities}
              disabled={loading}
            >
              {loading ? 'Actualizando…' : 'Refrescar'}
            </button>
            <button
              type="button"
              className="btn-planeacion btn-planeacion--primary"
              onClick={() => {
                console.log('🔍 DEBUG: Nueva actividad button clicked');
                setShowCreateModal(true);
              }}
            >
              Nueva actividad
            </button>
          </div>
        </div>

        <div className="planeacion-filters mb-4">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por descripción o notas..."
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
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="todos">Todos los estatus</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <div className="text-muted small d-flex align-items-center h-100">
                {filteredActivities.length} {filteredActivities.length === 1 ? 'actividad' : 'actividades'} encontradas
              </div>
            </div>
          </div>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="planeacion-pagination mb-4">
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted small">
                Página {currentPage} de {totalPages} ({filteredActivities.length} actividades totales)
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

        {/* DEBUG: Mostrar estado del modal */}
        <div style={{
          position: 'fixed', 
          top: '10px', 
          right: '10px', 
          background: 'black', 
          color: 'white', 
          padding: '10px', 
          borderRadius: '5px',
          fontSize: '12px',
          zIndex: 9999
        }}>
          DEBUG: showEditModal = {showEditModal ? 'true' : 'false'}
        </div>

        {/* Estadísticas */}
        <div className="planeacion-stats-grid">
          <div className="planeacion-stat-card">
            <div className="planeacion-stat-value">{summary.total}</div>
            <div className="planeacion-stat-label">Total de actividades</div>
          </div>
          <div className="planeacion-stat-card">
            <div className="planeacion-stat-value">{summary.completed}</div>
            <div className="planeacion-stat-label">Completadas</div>
          </div>
          <div className="planeacion-stat-card">
            <div className="planeacion-stat-value">{summary.pending}</div>
            <div className="planeacion-stat-label">Pendientes</div>
          </div>
        </div>

        {/* Lista de actividades */}
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        ) : currentActivities.length === 0 ? (
          <div className="planeacion-empty-state">
            <h3>No se encontraron actividades</h3>
            <p>No hay actividades que coincidan con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="planeacion-activities-grid">
            {currentActivities.map((activity) => (
              <div key={activity.id} className={`planeacion-activity-card ${activity.status?.toLowerCase().replace(' ', '-')}`}>
                <div className="planeacion-activity-header">
                  <h3 className="planeacion-activity-title">{activity.description}</h3>
                  <span className={`planeacion-activity-priority ${getStatusColor(activity.status)}`}>
                    {activity.status || 'Pendiente'}
                  </span>
                </div>

                <div className="planeacion-activity-description">
                  {activity.notes && (
                    <p>{activity.notes}</p>
                  )}
                </div>

                {/* Mostrar imágenes si existen */}
                {activity.images && activity.images.length > 0 && (
                  <div className="planeacion-activity-images">
                    <div className="planeacion-activity-images-title">📷 Imágenes:</div>
                    <div className="planeacion-activity-images-grid">
                      {/* Ordenar imágenes: ANTES primero, DESPUÉS después */}
                      {activity.images
                        .sort((a, b) => {
                          // ANTES (antes) va primero, DESPUÉS (despues) va después
                          if (a.type === 'antes' && b.type !== 'antes') return -1;
                          if (a.type !== 'antes' && b.type === 'antes') return 1;
                          return 0;
                        })
                        .map((image, index) => {
                          // Construir URL completa del backend
                          const imageUrl = image.url.startsWith('http') 
                            ? image.url 
                            : `http://localhost:5236${image.url}`;
                          
                          console.log(`🔍 URL de imagen: ${imageUrl}`);
                          console.log(`🔍 Datos de imagen:`, image);
                          
                          return (
                            <div key={image.id} className={`planeacion-activity-image-item planeacion-activity-image-item--${image.type}`}>
                              <img 
                                src={imageUrl} 
                                alt={`${image.type === 'antes' ? 'Antes' : 'Después'} - ${image.originalFileName}`}
                                className="planeacion-activity-image"
                                style={{
                                  display: 'block !important',
                                  width: '100% !important',
                                  height: '100px !important',
                                  objectFit: 'cover !important',
                                  visibility: 'visible !important',
                                  opacity: '1 !important'
                                }}
                                onLoad={() => console.log(`✅ Imagen guardada cargada: ${image.type}`, imageUrl)}
                                onError={() => console.log(`❌ Error al cargar imagen guardada: ${image.type}`, imageUrl)}
                                onClick={() => openImageModal(
                                  imageUrl, 
                                  image.type, 
                                  image.originalFileName,
                                  activity.images,
                                  activity.images.findIndex(img => img.id === image.id)
                                )}
                              />
                              <div className="planeacion-activity-image-label">
                                {image.type === 'antes' ? '📷 ANTES' : '📷 DESPUÉS'}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                <div className="planeacion-activity-meta">
                  {activity.startDate && (
                    <div className="planeacion-activity-meta-item">
                      📅 Inicio: {formatDateTime(activity.startDate)}
                    </div>
                  )}
                  {activity.endDate && (
                    <div className="planeacion-activity-meta-item">
                      🏁 Fin: {formatDateTime(activity.endDate)}
                    </div>
                  )}
                  <div className="planeacion-activity-meta-item">
                    👤 {activity.createdByUser?.fullName || 'Usuario'}
                  </div>
                </div>

                <div className="planeacion-activity-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => {
                      console.log('🔍 DEBUG: Edit button clicked for activity:', activity);
                      console.log('🔍 DEBUG: openEditModal function exists:', typeof openEditModal);
                      openEditModal(activity);
                    }}
                  >
                    ✏️ Editar
                  </button>
                  <select
                    value={activity.status}
                    onChange={(e) => handleUpdateActivityStatus(activity.id, e.target.value)}
                    className="form-select form-select-sm"
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDeleteActivity(activity.id)}
                    >
                      🗑️ Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal para editar actividad técnica */}
        {showEditModal && (
          <div style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '95%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '15px'
              }}>
                <h2 style={{ margin: 0, color: '#1f2937', fontSize: '24px' }}>
                  ✏️ Editar actividad técnica
                </h2>
                <button
                  onClick={closeEditModal}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: '0'
                  }}
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  {formError}
                </div>
              )}

              {/* Editar texto de la actividad */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Descripción *
                </label>
                <textarea
                  style={{
                    width: '100%',
                    height: '100px',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe la actividad técnica a realizar..."
                  disabled={updatingActivity}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Estatus
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={updatingActivity}
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subir imagen ANTES */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Subir imagen ANTES (opcional)
                </label>
                <div style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  background: antesPreview ? 'white' : '#f9fafb'
                }}>
                  <input
                    type="file"
                    id="editAntesImage"
                    accept="image/*"
                    onChange={handleAntesImageChange}
                    disabled={updatingActivity}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="editAntesImage" style={{ cursor: 'pointer', display: 'block' }}>
                    {antesPreview ? (
                      <div>
                        <img 
                          src={antesPreview} 
                          alt="Vista previa ANTES" 
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            marginBottom: '10px'
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearAntesImage();
                          }}
                          style={{
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                          disabled={updatingActivity}
                        >
                          ✕ Quitar imagen
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>Imagen ANTES</div>
                          <div style={{ fontSize: '12px' }}>Click para subir imagen</div>
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Subir imagen DESPUÉS */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Subir imagen DESPUÉS (opcional)
                </label>
                <div style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  background: despuesPreview ? 'white' : '#f9fafb'
                }}>
                  <input
                    type="file"
                    id="editDespuesImage"
                    accept="image/*"
                    onChange={handleDespuesImageChange}
                    disabled={updatingActivity}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="editDespuesImage" style={{ cursor: 'pointer', display: 'block' }}>
                    {despuesPreview ? (
                      <div>
                        <img 
                          src={despuesPreview} 
                          alt="Vista previa DESPUÉS" 
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            marginBottom: '10px'
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearDespuesImage();
                          }}
                          style={{
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                          disabled={updatingActivity}
                        >
                          ✕ Quitar imagen
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>Imagen DESPUÉS</div>
                          <div style={{ fontSize: '12px' }}>Click para subir imagen</div>
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '20px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  type="button"
                  style={{
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onClick={closeEditModal}
                  disabled={updatingActivity}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onClick={handleUpdateActivity}
                  disabled={updatingActivity || !description.trim()}
                >
                  {updatingActivity ? 'Actualizando...' : 'Actualizar actividad'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para crear actividad técnica */}
        <ModernModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Nueva actividad técnica"
          onSubmit={handleCreateActivity}
          submitText="Crear actividad"
          submitDisabled={!description.trim()}
          loading={creatingActivity}
        >
          {formError && (
            <div className="alert alert-danger" role="alert">
              {formError}
            </div>
          )}

          {imageError && (
            <div className="alert alert-warning" role="alert">
              {imageError}
            </div>
          )}

          <div className="modern-form-group">
            <label className="modern-form-label">Descripción *</label>
            <textarea
              className="modern-form-textarea"
              rows={3}
              placeholder="Describe la actividad técnica a realizar..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={creatingActivity}
            />
          </div>

          {/* Sección de imágenes */}
          <div className="modern-form-section">
            <h4 className="modern-form-section-title">📷 Imágenes de la actividad</h4>
            
            <div className="modern-form-grid modern-form-grid--2">
              {/* Imagen ANTES */}
              <div className="modern-form-group">
                <label className="modern-form-label">Imagen ANTES (opcional)</label>
                <div className="image-upload-container">
                  <input
                    type="file"
                    id="antesImage"
                    accept="image/*"
                    onChange={handleAntesImageChange}
                    disabled={creatingActivity}
                    className="image-upload-input"
                  />
                  <label htmlFor="antesImage" className={`image-upload-label ${antesPreview ? 'has-image' : ''}`}>
                    {antesPreview ? (
                      <div className="image-preview" style={{display: 'block !important', width: '100%', height: '150px'}}>
                        <img 
                          src={antesPreview} 
                          alt="Vista previa ANTES" 
                          className="image-preview-img"
                          style={{
                            display: 'block !important',
                            width: '100% !important',
                            height: '100% !important',
                            objectFit: 'cover !important',
                            visibility: 'visible !important',
                            opacity: '1 !important'
                          }}
                          onLoad={() => console.log('✅ Imagen ANTES cargada correctamente')}
                          onError={() => console.log('❌ Error al cargar imagen ANTES')}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearAntesImage();
                          }}
                          className="image-clear-btn"
                          disabled={creatingActivity}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="image-upload-placeholder">
                        <div className="image-upload-icon">📷</div>
                        <div className="image-upload-text">
                          <div className="image-upload-title">Imagen ANTES</div>
                          <div className="image-upload-subtitle">Estado inicial o referencia</div>
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Imagen DESPUÉS */}
              <div className="modern-form-group">
                <label className="modern-form-label">Imagen DESPUÉS (opcional)</label>
                <div className="image-upload-container">
                  <input
                    type="file"
                    id="despuesImage"
                    accept="image/*"
                    onChange={handleDespuesImageChange}
                    disabled={creatingActivity}
                    className="image-upload-input"
                  />
                  <label htmlFor="despuesImage" className={`image-upload-label ${despuesPreview ? 'has-image' : ''}`}>
                    {despuesPreview ? (
                      <div className="image-preview" style={{display: 'block !important', width: '100%', height: '150px'}}>
                        <img 
                          src={despuesPreview} 
                          alt="Vista previa DESPUÉS" 
                          className="image-preview-img"
                          style={{
                            display: 'block !important',
                            width: '100% !important',
                            height: '100% !important',
                            objectFit: 'cover !important',
                            visibility: 'visible !important',
                            opacity: '1 !important'
                          }}
                          onLoad={() => console.log('✅ Imagen DESPUÉS cargada correctamente')}
                          onError={() => console.log('❌ Error al cargar imagen DESPUÉS')}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearDespuesImage();
                          }}
                          className="image-clear-btn"
                          disabled={creatingActivity}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="image-upload-placeholder">
                        <div className="image-upload-icon">📷</div>
                        <div className="image-upload-text">
                          <div className="image-upload-title">Imagen DESPUÉS</div>
                          <div className="image-upload-subtitle">Resultado final</div>
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="modern-form-grid modern-form-grid--2">
            <div className="modern-form-group">
              <label className="modern-form-label">Fecha de inicio</label>
              <DatePicker
                selected={startDate}
                onChange={setStartDate}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                dateFormat="dd/MM/yyyy"
                className="modern-form-input"
                placeholderText="Selecciona fecha de inicio"
                disabled={creatingActivity}
              />
            </div>

            <div className="modern-form-group">
              <label className="modern-form-label">Fecha de fin</label>
              <DatePicker
                selected={endDate}
                onChange={setEndDate}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                dateFormat="dd/MM/yyyy"
                className="modern-form-input"
                placeholderText="Selecciona fecha de fin"
                disabled={creatingActivity}
              />
            </div>
          </div>

          <div className="modern-form-group">
            <label className="modern-form-label">Notas adicionales</label>
            <textarea
              className="modern-form-textarea"
              rows={2}
              placeholder="Notas o comentarios adicionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={creatingActivity}
            />
          </div>
        </ModernModal>

        {/* Modal para ver imagen */}
        {showImageModal && (
          <div className="image-modal-overlay" onClick={closeImageModal}>
            <div className="image-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="image-modal-header">
                <h3 className="image-modal-title">
                  📷 {modalImageType === 'antes' ? 'Imagen ANTES' : 'Imagen DESPUÉS'}
                  {modalImages.length > 1 && (
                    <span className="image-modal-counter">
                      ({currentImageIndex + 1} / {modalImages.length})
                    </span>
                  )}
                </h3>
                <button 
                  className="image-modal-close"
                  onClick={closeImageModal}
                >
                  ✕
                </button>
              </div>
              <div className="image-modal-content">
                {/* Botón anterior */}
                {modalImages.length > 1 && (
                  <button 
                    className="image-modal-nav image-modal-nav--prev"
                    onClick={() => navigateImage('prev')}
                    disabled={modalImages.length <= 1}
                  >
                    ⬅️
                  </button>
                )}
                
                <img 
                  src={modalImage} 
                  alt={`${modalImageType === 'antes' ? 'Antes' : 'Después'} - ${modalImageFileName}`}
                  className="image-modal-img"
                  onError={() => console.log('❌ Error al cargar imagen en modal')}
                />
                
                {/* Botón siguiente */}
                {modalImages.length > 1 && (
                  <button 
                    className="image-modal-nav image-modal-nav--next"
                    onClick={() => navigateImage('next')}
                    disabled={modalImages.length <= 1}
                  >
                    ➡️
                  </button>
                )}
              </div>
              <div className="image-modal-footer">
                <div className="image-modal-info">
                  <span className="image-modal-filename">{modalImageFileName}</span>
                  <span className="image-modal-type">{modalImageType.toUpperCase()}</span>
                </div>
                <button 
                  className="image-modal-download"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = modalImage;
                    link.download = modalImageFileName;
                    link.target = '_blank';
                    link.click();
                  }}
                >
                  📥 Descargar
                </button>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </main>
    </div>
  );
};

export default PlaneacionTecnica;
