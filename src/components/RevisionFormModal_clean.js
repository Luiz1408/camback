/* eslint-disable */
import React, { useState, useEffect } from 'react';
import api, { getUsersByRole, getSiguienteFolio, getAlmacenUbicacionFolios, getAreaEspecificaHistorial, saveAreaEspecifica, deleteAreaEspecifica, updateAreaEspecifica } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getCatalogoByTipo } from '../services/catalogos';
import AutocompleteDropdown from './AutocompleteDropdown';
import AreaEspecificaAutocomplete from './AreaEspecificaAutocomplete';

const RevisionFormModal = ({ isOpen, onClose, onSubmit, loading }) => {
  // Estado para catálogos dinámicos
  const [catalogos, setCatalogos] = useState({
    almacenes: [],
    indicadores: [],
    subindicadores: [],
    areas: [],
    puestos: [],
    sucursales: [],
    codigos: [],
    ubicaciones: [],
    observacionesRev: [],
    seDetectoIncidenciaRev: [],
    areaCargoRev: [],
    areaSolicitaRev: [],
    comentarioGeneralRev: [],
    folioAsignado1Det: [],
    ubicacionSucursalDet: [],
    puestoColaboradorDet: [],
    lineaEmpresaDet: [],
    areaEspecificaDet: [],
    turnoOperativoDet: [],
    coordinadoresTurnoDet: [],
    generaImpacto: [],
    lineaEmpresa: [],
    areaEspecifica: [],
    turnoOperativo: [],
    coordinadoresTurno: []
  });

  // Estados separados para usuarios
  const [monitoristas, setMonitoristas] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  // Estado para catálogo integrado de almacenes
  const [almacenesUbicacionFolios, setAlmacenesUbicacionFolios] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  // Estado para áreas específicas guardadas
  const [areasEspecificasGuardadas, setAreasEspecificasGuardadas] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  // Estado para feedback del usuario
  const [userModalFeedback, setUserModalFeedback] = useState(null);
  // Estado para errores de validación
  const [errors, setErrors] = useState({});
  // Estado para administración de catálogos
  const [mostrarAdminCatalogos, setMostrarAdminCatalogos] = useState(false);
  const [nuevoCatalogo, setNuevoCatalogo] = useState({
    tipo: 'Area',
    valor: ''
  });

  const [formData, setFormData] = useState({
    tipo: 'revision',
    fechaEnvio: '',
    ubicacion: '',
    almacen: '',
    hora: '',
    indicador: '',
    subindicador: '',
    folioAsignado1: '',
    folioAsignado2: '',
    acumulado: '',
    colaboradorInvolucrado: '',
    puestoColaborador: '',
    nomina: '',
    lineaEmpresa: '',
    ubicacionSucursal: '',
    areaEspecifica: '',
    turnoOperativo: '',
    situacion: '',
    monitorista: '',
    enviaReporte: '',
    coordinadorTurno: '',
    sucursal: '',
    mes: '',
    fechaSolicitud: '',
    fechaIncidente: '',
    monto: '',
    montoDisabled: false,
    observaciones: '',
    codigo: '',
    seDetectoIncidencia: '',
    comentarioGeneral: '',
    areaCargo: '',
    tiempo: '',
    ticket: '',
    puesto: '',
    lineaEmpresaPlacas: '',
    placas: '',
    ubicacion2: '',
    areaSolicita: '',
    quienEnvia: '',
    generaImpacto: '',
    codigoIndicador: '',
    supervisorJefeTurno: '',
    retroalimentacion: ''
  });

  // Toast context
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      setFormData(prev => ({
        ...prev,
        fechaEnvio: todayStr
      }));
      
      cargarCatalogos();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.almacen && almacenesUbicacionFolios.length > 0) {
      const almacenSeleccionado = almacenesUbicacionFolios.find(a => a.almacen === formData.almacen);
      if (almacenSeleccionado) {
        setFormData(prev => ({
          ...prev,
          folioAsignado1: almacenSeleccionado.folioAsignado1,
          ubicacion: almacenSeleccionado.ubicacion
        }));
      }
    }
  }, [formData.almacen, almacenesUbicacionFolios]);

  const cargarCatalogos = async () => {
    setLoadingCatalogos(true);
    try {
      const catalogTypes = [
        'Almacen', 'Indicador', 'Subindicador', 'Area', 'Puesto', 'Sucursal', 'Codigo', 'Ubicacion',
        'REV_OBSERVACIONES', 'REV_SE_DETECTO_INCIDENCIA', 'REV_AREA_CARGO', 'REV_AREA_SOLICITA', 'REV_COMENTARIO_GENERAL',
        'DET_FOLIO_ASIGNADO1', 'DET_UBICACION_SUCURSAL', 'DET_PUESTO_COLABORADOR', 'DET_LINEA_EMPRESA', 
        'DET_AREA_ESPECIFICA', 'DET_TURNO_OPERATIVO', 'DET_COORDINADOR_TURNO', 'DET_GENERA_IMPACTO'
      ];

      const catalogosPromises = catalogTypes.map(async (tipo) => {
        try {
          const response = await getCatalogoByTipo(tipo);
          return { tipo, data: Array.isArray(response) ? response : [] };
        } catch (error) {
          console.error(`Error cargando catálogo ${tipo}:`, error);
          return { tipo, data: [] };
        }
      });

      const resultados = await Promise.all(catalogosPromises);

      const [monitoristasResponse, coordinadoresResponse] = await Promise.all([
        getUsersByRole('monitorista'),
        getUsersByRole('coordinador')
      ]);
      
      const monitoristasData = Array.isArray(monitoristasResponse) ? monitoristasResponse : monitoristasResponse.data || [];
      const coordinadoresData = Array.isArray(coordinadoresResponse) ? coordinadoresResponse : coordinadoresResponse.data || [];
      
      const nuevosCatalogos = {
        almacenes: resultados.find(r => r.tipo === 'Almacen')?.data || [],
        indicadores: resultados.find(r => r.tipo === 'Indicador')?.data || [],
        subindicadores: resultados.find(r => r.tipo === 'Subindicador')?.data || [],
        areas: resultados.find(r => r.tipo === 'Area')?.data || [],
        puestos: resultados.find(r => r.tipo === 'Puesto')?.data || [],
        sucursales: resultados.find(r => r.tipo === 'Sucursal')?.data || [],
        codigos: resultados.find(r => r.tipo === 'Codigo')?.data || [],
        ubicaciones: resultados.find(r => r.tipo === 'Ubicacion')?.data || [],
        observacionesRev: resultados.find(r => r.tipo === 'REV_OBSERVACIONES')?.data || [],
        seDetectoIncidenciaRev: resultados.find(r => r.tipo === 'REV_SE_DETECTO_INCIDENCIA')?.data || [],
        areaCargoRev: resultados.find(r => r.tipo === 'REV_AREA_CARGO')?.data || [],
        areaSolicitaRev: resultados.find(r => r.tipo === 'REV_AREA_SOLICITA')?.data || [],
        comentarioGeneralRev: resultados.find(r => r.tipo === 'REV_COMENTARIO_GENERAL')?.data || [],
        folioAsignado1Det: resultados.find(r => r.tipo === 'DET_FOLIO_ASIGNADO1')?.data || [],
        ubicacionSucursalDet: resultados.find(r => r.tipo === 'DET_UBICACION_SUCURSAL')?.data || [],
        puestoColaboradorDet: resultados.find(r => r.tipo === 'DET_PUESTO_COLABORADOR')?.data || [],
        lineaEmpresaDet: resultados.find(r => r.tipo === 'DET_LINEA_EMPRESA')?.data || [],
        areaEspecificaDet: resultados.find(r => r.tipo === 'DET_AREA_ESPECIFICA')?.data || [],
        turnoOperativoDet: resultados.find(r => r.tipo === 'DET_TURNO_OPERATIVO')?.data || [],
        coordinadoresTurnoDet: resultados.find(r => r.tipo === 'DET_COORDINADOR_TURNO')?.data || [],
        generaImpacto: resultados.find(r => r.tipo === 'DET_GENERA_IMPACTO')?.data || []
      };

      setCatalogos(prev => ({ ...prev, ...nuevosCatalogos }));
      setMonitoristas(monitoristasData);
      setCoordinators(coordinadoresData);
      
      const almacenesData = await getAlmacenUbicacionFolios();
      setAlmacenesUbicacionFolios(almacenesData);
      
      cargarSiguienteFolio();
    } catch (error) {
      console.error('Error general cargando catálogos:', error);
    } finally {
      setLoadingCatalogos(false);
    }
  };

  const cargarSiguienteFolio = async () => {
    try {
      const folioData = await getSiguienteFolio(formData.tipo);
      setFormData(prev => ({
        ...prev,
        folioAsignado2: folioData.folio2,
        acumulado: folioData.acumulado
      }));
    } catch (error) {
      console.error('Error cargando siguiente folio:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const loadAreasEspecificas = async () => {
    try {
      setLoadingAreas(true);
      const areas = await getAreaEspecificaHistorial();
      setAreasEspecificasGuardadas(areas);
    } catch (error) {
      console.error('Error cargando áreas específicas:', error);
      setAreasEspecificasGuardadas([]);
    } finally {
      setLoadingAreas(false);
    }
  };

  const handleSaveAreaEspecifica = async () => {
    if (!nuevoCatalogo.valor.trim()) return;
    
    try {
      await saveAreaEspecifica({ valor: nuevoCatalogo.valor.trim() });
      await loadAreasEspecificas();
      setNuevoCatalogo({ tipo: 'Area', valor: '' });
      setUserModalFeedback({ type: 'success', message: 'Área específica guardada correctamente' });
    } catch (error) {
      console.error('Error guardando área específica:', error);
      setUserModalFeedback({ type: 'danger', message: 'Error al guardar área específica' });
    }
  };

  const handleDeleteAreaEspecifica = async (areaId) => {
    if (!window.confirm('¿Está seguro de eliminar esta área específica?')) return;
    
    try {
      await api.delete(`/catalogos/area-especificica/${areaId}`);
      await loadAreasEspecificas();
      setUserModalFeedback({ type: 'success', message: 'Área específica eliminada correctamente' });
    } catch (error) {
      console.error('Error eliminando área específica:', error);
      setUserModalFeedback({ type: 'danger', message: 'Error al eliminar área específica' });
    }
  };

  const handleEditAreaEspecifica = (area) => {
    setEditingArea(area);
    setNuevoCatalogo({ tipo: 'Area', valor: area.valor });
  };

  const handleUpdateAreaEspecifica = async () => {
    if (!editingArea || !nuevoCatalogo.valor.trim()) return;
    
    try {
      await api.put(`/catalogos/area-especificica/${editingArea.id}`, { valor: nuevoCatalogo.valor.trim() });
      await loadAreasEspecificas();
      setNuevoCatalogo({ tipo: 'Area', valor: '' });
      setEditingArea(null);
      setUserModalFeedback({ type: 'success', message: 'Área específica actualizada correctamente' });
    } catch (error) {
      console.error('Error actualizando área específica:', error);
      setUserModalFeedback({ type: 'danger', message: 'Error al actualizar área específica' });
    }
  };

  useEffect(() => {
    loadAreasEspecificas();
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal fade show d-block" tabIndex="-1">
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Crear Nuevo Folio</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Tipo de Folio *</label>
                <select className="form-select" name="tipo" value={formData.tipo} onChange={handleInputChange}>
                  <option value="revision">Revisión</option>
                  <option value="deteccion">Detección</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Área Específica</label>
                <AreaEspecificaAutocomplete
                  value={formData.areaEspecifica}
                  onChange={(value) => handleInputChange({ target: { name: 'areaEspecifica', value } })}
                  disabled={loadingCatalogos}
                  placeholder="Escriba el área específica..."
                />
              </div>
            </div>

            {mostrarAdminCatalogos && (
              <div className="card mb-4 border-info">
                <div className="card-header bg-info text-white">
                  <h6 className="mb-0">Administrar Áreas Específicas</h6>
                </div>
                <div className="card-body">
                  <div className="row g-3 mb-3">
                    <div className="col-md-8">
                      <label className="form-label fw-semibold">Nueva Área Específica</label>
                      <AreaEspecificaAutocomplete
                        value={nuevoCatalogo.valor}
                        onChange={(value) => setNuevoCatalogo(prev => ({ ...prev, valor: value }))}
                        disabled={loading}
                        placeholder="Escriba el área específica..."
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">&nbsp;</label>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-success flex-fill"
                          onClick={editingArea ? handleUpdateAreaEspecifica : handleSaveAreaEspecifica}
                          disabled={loading || !nuevoCatalogo.valor.trim()}
                        >
                          {editingArea ? 'Actualizar' : 'Guardar'}
                        </button>
                        {editingArea && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setEditingArea(null);
                              setNuevoCatalogo({ tipo: 'Area', valor: '' });
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h6 className="fw-semibold text-secondary mb-3">Áreas Específicas Registradas</h6>
                    {loadingAreas ? (
                      <div className="text-center py-3">
                        <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                        Cargando áreas...
                      </div>
                    ) : areasEspecificasGuardadas.length === 0 ? (
                      <div className="text-center py-3 text-muted">
                        <p>No hay áreas específicas registradas</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm table-hover">
                          <thead className="table-light">
                            <tr>
                              <th>Área Específica</th>
                              <th className="text-center" style={{ width: '120px' }}>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {areasEspecificasGuardadas.map((area) => (
                              <tr key={area.id}>
                                <td><span className="badge bg-light text-dark">{area.valor}</span></td>
                                <td className="text-center">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary me-1"
                                    onClick={() => handleEditAreaEspecifica(area)}
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDeleteAreaEspecifica(area.id)}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="card-footer border-0 bg-transparent">
            <button type="button" className="btn btn-secondary me-2" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="button" className="btn btn-info me-2" onClick={() => setMostrarAdminCatalogos(!mostrarAdminCatalogos)}>
              {mostrarAdminCatalogos ? 'Ocultar' : 'Administrar Catálogos'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Folio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevisionFormModal;
