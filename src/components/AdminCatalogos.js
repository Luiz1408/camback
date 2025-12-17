import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserManagement } from '../contexts/UserManagementContext';
import MainNavbar from './Layout/MainNavbar';
import Footer from './Layout/Footer';
import { getCatalogoByTipo, createCatalogo, updateCatalogo, deleteCatalogo } from '../services/catalogos';
import { getAlmacenUbicacionFolios, createAlmacenUbicacionFolio, updateAlmacenUbicacionFolio, deleteAlmacenUbicacionFolio } from '../services/api';
import { formatUserName } from '../utils/formatUserName';
import '../styles/responsive.css';

const AdminCatalogos = () => {
  const { currentUser, logout } = useAuth();
  const { openModal: openUserManagementModal } = useUserManagement();
  
  const displayName = formatUserName(currentUser);
  
  const [catalogos, setCatalogos] = useState({});
  const [showNuevaUbicacionModal, setShowNuevaUbicacionModal] = useState(false);
  const [nuevaUbicacion, setNuevaUbicacion] = useState('');

  // Función para obtener ubicaciones únicas del catálogo integrado
  const getUbicacionesUnicas = () => {
    const ubicacionesSet = new Set();
    if (almacenesUbicacionFolios && Array.isArray(almacenesUbicacionFolios)) {
      almacenesUbicacionFolios.forEach(item => {
        if (item.ubicacion) {
          ubicacionesSet.add(item.ubicacion);
        }
      });
    }
    return Array.from(ubicacionesSet).sort();
  };

  // Función para obtener el icono según el tipo de catálogo
  const getCatalogIcon = (tipo) => {
    const icons = {
      'Indicador': 'fas fa-chart-line',
      'Subindicador': 'fas fa-chart-bar',
      'Area': 'fas fa-map-marker-alt',
      'Puesto': 'fas fa-user-tie',
      'Sucursal': 'fas fa-store',
      'Codigo': 'fas fa-barcode',
      'Ubicacion': 'fas fa-map-pin',
      'REV_OBSERVACIONES': 'fas fa-comment-dots',
      'REV_SE_DETECTO_INCIDENCIA': 'fas fa-search',
      'REV_AREA_CARGO': 'fas fa-briefcase',
      'REV_AREA_SOLICITA': 'fas fa-building',
      'REV_COMENTARIO_GENERAL': 'fas fa-clipboard',
      'DET_LINEA_EMPRESA': 'fas fa-industry',
      'DET_AREA_ESPECIFICA': 'fas fa-crosshairs',
      'DET_TURNO_OPERATIVO': 'fas fa-clock'
    };
    return <i className={icons[tipo] || 'fas fa-folder'}></i>;
  };
  const [almacenesUbicacionFolios, setAlmacenesUbicacionFolios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('almacenes');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  // Definición de catálogos (excluyendo almacenes que es integrado)
  const catalogTypes = [
    { key: 'indicadores', label: 'Indicadores', tipo: 'Indicador' },
    { key: 'subindicadores', label: 'Subindicadores', tipo: 'Subindicador' },
    { key: 'areas', label: 'Áreas', tipo: 'Area' },
    { key: 'puestos', label: 'Puestos', tipo: 'Puesto' },
    { key: 'codigos', label: 'Códigos', tipo: 'Codigo' },
    { key: 'ubicaciones', label: 'Ubicaciones', tipo: 'Ubicacion' },
    { key: 'observacionesRev', label: 'Observaciones', tipo: 'REV_OBSERVACIONES' },
    { key: 'seDetectoIncidenciaRev', label: 'Se Detectó Incidencia', tipo: 'REV_SE_DETECTO_INCIDENCIA' },
    { key: 'areaCargoRev', label: 'Área Cargo', tipo: 'REV_AREA_CARGO' },
    { key: 'areaSolicitaRev', label: 'Área Solicita', tipo: 'REV_AREA_SOLICITA' },
    { key: 'comentarioGeneralRev', label: 'Comentario General', tipo: 'REV_COMENTARIO_GENERAL' },
    { key: 'lineaEmpresaDet', label: 'Línea Empresa', tipo: 'DET_LINEA_EMPRESA' },
    { key: 'areaEspecificaDet', label: 'Área Específica', tipo: 'DET_AREA_ESPECIFICA' },
    { key: 'turnoOperativoDet', label: 'Turno Operativo', tipo: 'DET_TURNO_OPERATIVO' }
  ];

  useEffect(() => {
    cargarCatalogos();
    cargarAlmacenesUbicacionFolios();
  }, []);

  const cargarCatalogos = async () => {
    setLoading(true);
    try {
      const results = {};
      let hasError = false;
      
      for (const catalogType of catalogTypes) {
        try {
          const response = await getCatalogoByTipo(catalogType.tipo);
          if (response && Array.isArray(response)) {
            results[catalogType.key] = response;
          } else if (response && response.data) {
            results[catalogType.key] = response.data;
          } else {
            console.warn(`Formato de respuesta inesperado para ${catalogType.tipo}:`, response);
            results[catalogType.key] = [];
            hasError = true;
          }
        } catch (error) {
          console.error(`Error cargando ${catalogType.tipo}:`, error);
          results[catalogType.key] = [];
          hasError = true;
        }
      }
      
      setCatalogos(results);
      
      if (hasError) {
        console.warn('Algunos catálogos no se cargaron correctamente. Ver la consola para más detalles.');
      }
    } catch (error) {
      console.error('Error general cargando catálogos:', error);
      alert('Error al cargar los catálogos. Por favor, intente recargar la página.');
    } finally {
      setLoading(false);
    }
  };

  const cargarAlmacenesUbicacionFolios = async () => {
    try {
      const data = await getAlmacenUbicacionFolios();
      setAlmacenesUbicacionFolios(data);
    } catch (error) {
      console.error('Error cargando almacenes-ubicación-folios:', error);
    }
  };

  const handleEdit = (item, catalogKey) => {
    setEditingItem(item);
    setFormData(item);
    setShowForm(true);
    setActiveTab(catalogKey);
  };

  const handleDelete = async (id, catalogKey) => {
    if (!window.confirm('¿Está seguro de eliminar este registro?')) return;

    try {
      if (catalogKey === 'almacenes') {
        await deleteAlmacenUbicacionFolio(id);
        await cargarAlmacenesUbicacionFolios();
      } else {
        const catalogType = catalogTypes.find(c => c.key === catalogKey);
        await deleteCatalogo(id);
        await cargarCatalogos();
      }
    } catch (error) {
      console.error('Error eliminando:', error);
      alert('Error al eliminar el registro');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let result;
      
      if (activeTab === 'almacenes') {
        if (editingItem) {
          result = await updateAlmacenUbicacionFolio(editingItem.id, formData);
        } else {
          result = await createAlmacenUbicacionFolio(formData);
        }
        
        if (result && result.success) {
          await cargarAlmacenesUbicacionFolios();
          alert('¡Registro guardado exitosamente!');
        } else {
          throw new Error(result?.error || 'Error al guardar el registro');
        }
      } else {
        const catalogType = catalogTypes.find(c => c.key === activeTab);
        if (!catalogType) {
          throw new Error('Tipo de catálogo no encontrado');
        }
        
        const data = {
          ...formData,
          tipo: catalogType.tipo
        };

        if (editingItem) {
          result = await updateCatalogo(editingItem.id, data);
        } else {
          result = await createCatalogo(data);
        }
        
        if (result && result.success) {
          await cargarCatalogos();
          alert('¡Registro guardado exitosamente!');
        } else {
          throw new Error(result?.error || 'Error al guardar el registro');
        }
      }

      setShowForm(false);
      setEditingItem(null);
      setFormData({});
    } catch (error) {
      console.error('Error al guardar:', error);
      alert(`Error: ${error.message || 'No se pudo guardar el registro'}`);
    }
  };

  const renderForm = () => {
    if (activeTab === 'almacenes') {
      return (
        <form onSubmit={handleSubmit} className="p-4">
          <h4 className="mb-4">
            {editingItem ? 'Editar' : 'Agregar'} Almacén + Folio + Ubicación
          </h4>
          
          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="form-label">Almacén *</label>
              <input
                type="text"
                className="form-control"
                value={formData.almacen || ''}
                onChange={(e) => setFormData({...formData, almacen: e.target.value})}
                required
              />
            </div>
            
            <div className="col-md-4 mb-3">
              <label className="form-label">Folio Asignado 1 *</label>
              <input
                type="text"
                className="form-control"
                value={formData.folioAsignado1 || ''}
                onChange={(e) => setFormData({...formData, folioAsignado1: e.target.value})}
                required
              />
            </div>
            
            <div className="col-md-4 mb-3">
              <label className="form-label">Ubicación *</label>
              <div className="input-group">
                <select
                  className="form-control"
                  value={formData.ubicacion || ''}
                  onChange={(e) => setFormData({...formData, ubicacion: e.target.value})}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {getUbicacionesUnicas().map((ubicacion, index) => (
                    <option key={index} value={ubicacion}>
                      {ubicacion}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowNuevaUbicacionModal(true)}
                  title="Agregar nueva ubicación"
                  style={{
                    backgroundColor: '#007bff',
                    borderColor: '#007bff',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  <i className="fas fa-plus me-1"></i>
                  Nueva
                </button>
              </div>
              <small className="text-muted">Seleccione una existente o haga clic en "Nueva" para agregar</small>
            </div>
          </div>
          
          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary">
              {editingItem ? 'Actualizar' : 'Guardar'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="p-4">
        <h4 className="mb-4">
          {editingItem ? 'Editar' : 'Agregar'} {catalogTypes.find(c => c.key === activeTab)?.label}
        </h4>
        
        <div className="mb-3">
          <label className="form-label">Valor *</label>
          <input
            type="text"
            className="form-control"
            value={formData.valor || ''}
            onChange={(e) => setFormData({...formData, valor: e.target.value})}
            required
          />
        </div>
        
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary">
            {editingItem ? 'Actualizar' : 'Guardar'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
            Cancelar
          </button>
        </div>
      </form>
    );
  };

  const renderCatalogTable = (items, catalogKey) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return (
        <div className="alert alert-info">
          No hay datos disponibles para mostrar.
        </div>
      );
    }

    if (catalogKey === 'almacenes') {
      return (
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Almacén</th>
              <th>Folio Asignado 1</th>
              <th>Ubicación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.almacen}</td>
                <td>{item.folioAsignado1}</td>
                <td>{item.ubicacion}</td>
                <td>
                  <button
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() => handleEdit(item, catalogKey)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDelete(item.id, catalogKey)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return (
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Valor</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.valor}</td>
              <td>
                <button
                  className="btn btn-sm btn-outline-primary me-2"
                  onClick={() => handleEdit(item, catalogKey)}
                >
                  Editar
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => handleDelete(item.id, catalogKey)}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="dashboard-wrapper min-vh-100">
      <MainNavbar
        displayName={displayName}
        role={currentUser?.role}
        isAdmin={currentUser?.role === 'Administrador'}
        onManageUsers={currentUser?.role === 'Administrador' ? openUserManagementModal : undefined}
        onLogout={logout}
      />

      <main className="container py-5">
        <div className="card border-0 shadow-lg">
          <div className="card-body p-4 p-md-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1 className="display-6 mb-0">Administración de Catálogos</h1>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingItem(null);
                  setFormData({});
                  setShowForm(true);
                }}
              >
                Agregar Nuevo
        </button>
      </div>

      {showForm && renderForm()}

      <div className="row g-2 mb-4">
        <div className="col-12">
          <div className="d-flex flex-wrap gap-2">
            <button
              className={`btn ${activeTab === 'almacenes' 
                ? 'btn-primary' 
                : 'btn-outline-primary'} px-3 py-2 d-flex align-items-center gap-2`}
              onClick={() => setActiveTab('almacenes')}
            >
              <i className="fas fa-warehouse"></i>
              <span>Almacenes + Folios + Ubicación</span>
            </button>
            {catalogTypes.map((catalog) => (
              <button
                key={catalog.key}
                className={`btn ${activeTab === catalog.key 
                  ? 'btn-primary' 
                  : 'btn-outline-primary'} px-3 py-2 d-flex align-items-center gap-2`}
                onClick={() => setActiveTab(catalog.key)}
              >
                {getCatalogIcon(catalog.tipo)}
                <span>{catalog.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="tab-content">
        {activeTab === 'almacenes' && (
          <div className="tab-pane fade show active">
            {renderCatalogTable(almacenesUbicacionFolios, 'almacenes')}
          </div>
        )}
        
        {catalogTypes.map((catalog) => (
          <div
            key={catalog.key}
            className={`tab-pane fade ${activeTab === catalog.key ? 'show active' : ''}`}
          >
            {renderCatalogTable(catalogos[catalog.key] || [], catalog.key)}
          </div>
        ))}
      </div>
          </div>
        </div>
      </main>
      <Footer />
      
      {/* Modal para agregar nueva ubicación */}
      {showNuevaUbicacionModal && (
        <div className="password-modal-backdrop">
          <div className="card password-modal shadow-lg border-0">
            <div className="card-header border-0">
              <h5 className="mb-0">
                <i className="fas fa-map-marker-alt me-2"></i>
                Agregar Nueva Ubicación
              </h5>
              <button 
                type="button" 
                className="btn-close btn-close-white" 
                onClick={() => {
                  setShowNuevaUbicacionModal(false);
                  setNuevaUbicacion('');
                }}
                aria-label="Cerrar"
              />
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label fw-semibold text-secondary">Nombre de la ubicación:</label>
                <input
                  type="text"
                  className="form-control"
                  value={nuevaUbicacion}
                  onChange={(e) => setNuevaUbicacion(e.target.value)}
                  placeholder="Ej: Sucursal Central, Almacén Norte, etc."
                  autoFocus
                />
              </div>
            </div>
            <div className="card-footer border-0 bg-transparent">
              <button 
                type="button" 
                className="btn btn-secondary me-2" 
                onClick={() => {
                  setShowNuevaUbicacionModal(false);
                  setNuevaUbicacion('');
                }}
              >
                <i className="fas fa-times me-1"></i>
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  if (nuevaUbicacion.trim()) {
                    setFormData({...formData, ubicacion: nuevaUbicacion.trim()});
                    setShowNuevaUbicacionModal(false);
                    setNuevaUbicacion('');
                  }
                }}
                disabled={!nuevaUbicacion.trim()}
              >
                <i className="fas fa-save me-1"></i>
                Agregar Ubicación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCatalogos;
