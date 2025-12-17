import React, { useState, useEffect } from 'react';
import ModernModal from './Common/ModernModal';
import AutocompleteDropdown from './AutocompleteDropdown';
import { getAlmacenUbicacionFolios } from '../services/api';
import { getCatalogoByTipo, getAllTipos } from '../services/catalogos';

const NuevaRevisionModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    titulo: '',
    fechaIncidente: '',
    ubicacion: '',
    areaQueSolicita: ''
  });

  const [errors, setErrors] = useState({
    titulo: '',
    fechaIncidente: '',
    ubicacion: '',
    areaQueSolicita: ''
  });

  const [almacenes, setAlmacenes] = useState([]);
  const [areasSolicita, setAreasSolicita] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

  // Cargar catálogos
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        setLoadingCatalogos(true);
        
        // Cargar almacenes
        const almacenesData = await getAlmacenUbicacionFolios();
        setAlmacenes(almacenesData);
        
        // Debug: ver qué catálogos están disponibles
        try {
          const tiposDisponibles = await getAllTipos();
          console.log('Catálogos disponibles:', tiposDisponibles);
        } catch (error) {
          console.log('Error obteniendo tipos de catálogos:', error);
        }
        
        // Cargar áreas que solicita
        try {
          const areasData = await getCatalogoByTipo('REV_AREA_SOLICITA');
          console.log('Áreas que solicita cargadas:', areasData);
          // Mapear al formato correcto para AutocompleteDropdown
          const areasMapeadas = areasData.map(area => ({
            id: area.id,
            valor: area.valor || area.nombre || area.descripcion || area.nombreCatalogo
          }));
          console.log('Áreas mapeadas:', areasMapeadas);
          setAreasSolicita(areasMapeadas);
        } catch (error) {
          console.log('Error cargando REV_AREA_SOLICITA:', error);
        }
        
      } catch (error) {
        console.error('Error cargando catálogos:', error);
      } finally {
        setLoadingCatalogos(false);
      }
    };

    if (isOpen) {
      cargarCatalogos();
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manejador específico para el dropdown de ubicación
  const handleUbicacionChange = (e) => {
    const value = e.target.value;
    // Buscar el almacén seleccionado para obtener "almacen + ubicacion"
    const almacenSeleccionado = almacenes.find(a => a.almacen === value);
    if (almacenSeleccionado) {
      // Guardar "almacen + ubicacion" en el formData
      setFormData(prev => ({
        ...prev,
        ubicacion: `${almacenSeleccionado.almacen} - ${almacenSeleccionado.ubicacion}`
      }));
    }
  };

  // Manejador específico para el dropdown de área que solicita
  const handleAreaSolicitaChange = (e) => {
    const value = e.target.value;
    console.log('Valor seleccionado en área que solicita:', value);
    setFormData(prev => ({
      ...prev,
      areaQueSolicita: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validar campos requeridos
    const newErrors = {};
    let hasErrors = false;
    
    if (!formData.titulo.trim()) {
      newErrors.titulo = 'El título es requerido';
      hasErrors = true;
    }
    
    if (!formData.fechaIncidente) {
      newErrors.fechaIncidente = 'La fecha del incidente es requerida';
      hasErrors = true;
    }
    
    if (!formData.ubicacion.trim()) {
      newErrors.ubicacion = 'La ubicación es requerida';
      hasErrors = true;
    }
    
    if (!formData.areaQueSolicita.trim()) {
      newErrors.areaQueSolicita = 'El área que solicita es requerida';
      hasErrors = true;
    }
    
    if (hasErrors) {
      setErrors(newErrors);
      return;
    }
    
    // Limpiar errores y enviar
    setErrors({});
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  const handleClose = () => {
    setFormData({
      titulo: '',
      fechaIncidente: '',
      ubicacion: '',
      areaQueSolicita: ''
    });
    setErrors({});
    if (onClose) {
      onClose();
    }
  };

  return (
    <ModernModal
      show={isOpen}
      onClose={handleClose}
      title="Nueva Revisión"
      onSubmit={handleSubmit}
      submitText="Crear"
      loading={loading}
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label fw-semibold">Título *</label>
          <input
            type="text"
            className={`form-control ${errors.titulo ? 'is-invalid' : ''}`}
            name="titulo"
            value={formData.titulo}
            onChange={handleInputChange}
            placeholder="Ingrese el título de la revisión"
            required
          />
          {errors.titulo && <div className="invalid-feedback">{errors.titulo}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">Fecha del Incidente *</label>
          <input
            type="date"
            className={`form-control ${errors.fechaIncidente ? 'is-invalid' : ''}`}
            name="fechaIncidente"
            value={formData.fechaIncidente}
            onChange={handleInputChange}
            required
          />
          {errors.fechaIncidente && <div className="invalid-feedback">{errors.fechaIncidente}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">Ubicación *</label>
          <AutocompleteDropdown
            name="ubicacion"
            value={almacenes.find(a => formData.ubicacion.includes(a.almacen))?.almacen || ''}
            onChange={handleUbicacionChange}
            options={almacenes.map(a => ({ id: a.id, valor: a.almacen }))}
            disabled={loadingCatalogos}
            placeholder="Seleccionar almacén..."
          />
          {errors.ubicacion && <div className="text-danger small mt-1">{errors.ubicacion}</div>}
        </div>

        <div className="mb-4">
          <label className="form-label fw-semibold">Área que solicita *</label>
          <AutocompleteDropdown
            name="areaQueSolicita"
            value={formData.areaQueSolicita}
            onChange={handleAreaSolicitaChange}
            options={areasSolicita}
            disabled={loadingCatalogos}
            placeholder="Seleccionar área que solicita..."
          />
          {errors.areaQueSolicita && <div className="text-danger small mt-1">{errors.areaQueSolicita}</div>}
        </div>
      </form>
    </ModernModal>
  );
};

export default NuevaRevisionModal;
