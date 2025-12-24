import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUsersByRole } from '../services/api';
import { getCatalogoByTipo, getAllTipos } from '../services/catalogos';
import AutocompleteDropdown from '../components/AutocompleteDropdown';
import UnifiedModal from '../components/Common/UnifiedModal';
import MainNavbar from '../components/Layout/MainNavbar';
import Footer from '../components/Layout/Footer';
import '../components/Common/UnifiedModal.css';
import './EntregaTurnoMonitoreo.css';

const EntregaTurnoMonitoreo = () => {
  console.log('=== COMPONENTE ENTREGA TURNO MONITOREO CARGADO ===');
  const { currentUser } = useAuth();
  const [checklistData, setChecklistData] = useState({
    actividadesRelevantes: false,
    detalleActividades: '',
    celular: false,
    equipoComputo: false,
    aplicativo: false,
    aplicativoTexto: '',
    turnoEntrega: '',
    quienEntrega: '',
    quienRecibe: ''
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [entregas, setEntregas] = useState([]);
  const [turnosOperativos, setTurnosOperativos] = useState([]);
  const [monitoristas, setMonitoristas] = useState([]);

  // Usar currentUser del AuthContext
  const user = currentUser || {
    displayName: 'Usuario Demo',
    role: 'Administrador',
    isAdmin: true
  };

  // Determinar si es administrador basado en el rol
  const isAdmin = user?.role === 'Administrador' || user?.role === 'admin' || user?.role === 'Admin';
  
  // Determinar si es coordinador
  const isCoordinador = user?.role === 'Coordinador' || user?.role === 'coordinador' || user?.role === 'Coordinator';
  
  // Determinar si es monitorista
  const isMonitorista = user?.role === 'Monitorista' || user?.role === 'monitorista' || user?.role === 'Monitor';
  
  // Determinar si puede elegir ambos campos (admin o coordinador)
  const puedeElegirAmbos = isAdmin || isCoordinador;
  
  // Para monitoristas, autocompletar "quien entrega" con su usuario
  useEffect(() => {
    if (isMonitorista && user) {
      setChecklistData(prev => ({
        ...prev,
        quienEntrega: user.fullName || user.displayName || user.username || 'Usuario'
      }));
    }
  }, [isMonitorista, user]);

  const displayName = user?.fullName || user?.displayName || user?.username || 'Usuario';

  const handleLogout = () => {
    console.log('Cerrando sesión...');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleManageUsers = () => {
    console.log('Gestionar usuarios');
  };

  // Cargar datos dinámicamente desde el backend

  const initialEntregas = [
    {
      id: 1,
      fecha: '2024-01-15',
      actividadesRelevantes: true,
      celular: true,
      equipoComputo: true,
      aplicativo: false,
      aplicativoTexto: '',
      turnoEntrega: 'Turno Matutino (6:00 - 14:00)',
      quienEntrega: 'Juan Pérez',
      quienRecibe: 'María González',
      creadoPor: currentUser?.username || 'Usuario'
    },
    {
      id: 2,
      fecha: '2024-01-14',
      actividadesRelevantes: false,
      celular: true,
      equipoComputo: true,
      aplicativo: false,
      aplicativoTexto: '',
      turnoEntrega: 'Turno Nocturno (22:00 - 6:00)',
      quienEntrega: 'Carlos Rodríguez',
      quienRecibe: 'Ana López',
      creadoPor: currentUser?.username || 'Usuario'
    }
  ];

  useEffect(() => {
    console.log('=== INICIO USEEFECT ===');
    
    const cargarDatos = async () => {
      try {
        // Primero ver todos los catálogos disponibles
        console.log('Verificando todos los catálogos disponibles...');
        try {
          const allCatalogs = await getAllTipos();
          console.log('Todos los catálogos:', allCatalogs);
        } catch (err) {
          console.log('Error obteniendo todos los catálogos:', err.message);
        }
        
        // Usar el catálogo correcto que encontramos: DET_TURNO_OPERATIVO
        console.log('Cargando catálogo DET_TURNO_OPERATIVO...');
        
        let turnosData = [];
        
        try {
          const response = await getCatalogoByTipo('DET_TURNO_OPERATIVO');
          console.log('Respuesta DET_TURNO_OPERATIVO:', response);
          
          if (response && response.length > 0) {
            turnosData = response.map(item => item.valor || item.nombre || item.descripcion);
            console.log('Turnos cargados:', turnosData);
          }
        } catch (err) {
          console.log('Error con DET_TURNO_OPERATIVO:', err.message);
        }
        
        // Si no encontramos datos, usar datos de ejemplo
        if (turnosData.length === 0) {
          console.log('Usando datos de ejemplo para turnos');
          turnosData = [
            'Turno Matutino (6:00 - 14:00)',
            'Turno Vespertino (14:00 - 22:00)', 
            'Turno Nocturno (22:00 - 6:00)',
            'Turno Administrativo (9:00 - 18:00)'
          ];
        }
        
        setTurnosOperativos(turnosData);
        
        // Cargar monitoristas
        try {
          const monitoristasResponse = await getUsersByRole('monitorista');
          const monitoristasData = monitoristasResponse.map(user => ({
            id: user.id,
            valor: user.valor || user.fullName || user.username
          }));
          setMonitoristas(monitoristasData);
        } catch (err) {
          console.log('Error cargando monitoristas, usando ejemplo:', err.message);
          setMonitoristas([
            { id: 1, valor: 'Juan Pérez' },
            { id: 2, valor: 'María González' },
            { id: 3, valor: 'Carlos Rodríguez' },
            { id: 4, valor: 'Ana López' },
            { id: 5, valor: 'Roberto Sánchez' }
          ]);
        }
        
        setEntregas(initialEntregas);
      } catch (error) {
        console.error('Error general:', error);
        // Usar datos de ejemplo en caso de error general
        setTurnosOperativos([
          'Turno Matutino (6:00 - 14:00)',
          'Turno Vespertino (14:00 - 22:00)', 
          'Turno Nocturno (22:00 - 6:00)',
          'Turno Administrativo (9:00 - 18:00)'
        ]);
        setMonitoristas([
          { id: 1, valor: 'Juan Pérez' },
          { id: 2, valor: 'María González' },
          { id: 3, valor: 'Carlos Rodríguez' },
          { id: 4, valor: 'Ana López' },
          { id: 5, valor: 'Roberto Sánchez' }
        ]);
        setEntregas(initialEntregas);
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
    console.log('=== FIN USEEFECT ===');
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setChecklistData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nuevaEntrega = {
      id: entregas.length + 1,
      fecha: new Date().toISOString().split('T')[0],
      ...checklistData,
      creadoPor: currentUser?.username || 'Usuario'
    };
    setEntregas([nuevaEntrega, ...entregas]);
    setShowModal(false);
    setChecklistData({
      actividadesRelevantes: false,
      detalleActividades: '',
      celular: false,
      equipoComputo: false,
      aplicativo: false,
      aplicativoTexto: '',
      turnoEntrega: '',
      quienEntrega: '',
      quienRecibe: ''
    });
  };

  const getBadgeClass = (value) => {
    return value ? 'bg-success' : 'bg-danger';
  };

  const getBadgeText = (value) => {
    return value ? 'Sí' : 'No';
  };

  // Debug para verificar los turnos en el render
  console.log('turnosOperativos en render:', turnosOperativos);

  const handleDeleteEntrega = (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta entrega de turno?')) {
      setEntregas(entregas.filter(entrega => entrega.id !== id));
    }
  };

  if (loading) {
    return (
      <div className='page-wrapper'>
        <MainNavbar
          displayName={displayName}
          role={user.role}
          isAdmin={isAdmin}
          onLogout={handleLogout}
          onManageUsers={handleManageUsers}
        />
        <div className='d-flex justify-content-center align-items-center' style={{ minHeight: '400px' }}>
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      <MainNavbar
        displayName={displayName}
        role={user.role}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        onManageUsers={handleManageUsers}
      />
      
      <div className='container-fluid py-4'>
        <div className='row'>
          <div className='col-12'>
            <div className='d-flex justify-content-between align-items-center mb-4'>
              <h2 className='h3 mb-0'>Checklist de Entrega de Turno</h2>
              <button
                className='btn btn-primary'
                onClick={() => setShowModal(true)}
              >
                <i className='fas fa-plus me-2'></i>
                Nueva Entrega
              </button>
            </div>
            
            <div className='card'>
              <div className='card-body'>
                <div className='table-responsive'>
                  <table className='table table-hover'>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Actividades Relevantes</th>
                        <th>Detalle Actividades</th>
                        <th>Celular</th>
                        <th>Equipo de Cómputo</th>
                        <th>Aplicativo</th>
                        <th>Turno Entrega</th>
                        <th>Quien Entrega</th>
                        <th>Quien Recibe</th>
                        <th>Creado Por</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entregas.map(entrega => (
                        <tr key={entrega.id}>
                          <td>{entrega.fecha}</td>
                          <td>
                            <span className={'badge ' + getBadgeClass(entrega.actividadesRelevantes)}>
                              {getBadgeText(entrega.actividadesRelevantes)}
                            </span>
                          </td>
                          <td>
                            {entrega.detalleActividades ? (
                              <small className='text-muted'>{entrega.detalleActividades}</small>
                            ) : (
                              <span className='text-muted'>-</span>
                            )}
                          </td>
                          <td>
                            <span className={'badge ' + getBadgeClass(entrega.celular)}>
                              {getBadgeText(entrega.celular)}
                            </span>
                          </td>
                          <td>
                            <span className={'badge ' + getBadgeClass(entrega.equipoComputo)}>
                              {getBadgeText(entrega.equipoComputo)}
                            </span>
                          </td>
                          <td>
                            <span className={'badge ' + getBadgeClass(entrega.aplicativo)}>
                              {getBadgeText(entrega.aplicativo)}
                            </span>
                            {entrega.aplicativoTexto && (
                              <div className='mt-1'>
                                <small className='text-muted'>{entrega.aplicativoTexto}</small>
                              </div>
                            )}
                          </td>
                          <td>{entrega.turnoEntrega}</td>
                          <td>{entrega.quienEntrega}</td>
                          <td>{entrega.quienRecibe}</td>
                          <td>
                            <small className='text-muted'>{entrega.creadoPor}</small>
                          </td>
                          <td>
                            {isAdmin && (
                              <button
                                className='btn btn-sm btn-outline-danger'
                                onClick={() => handleDeleteEntrega(entrega.id)}
                                title='Eliminar entrega'
                              >
                                <i className='fas fa-trash'></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para nueva entrega */}
      <UnifiedModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Nueva Entrega de Turno"
        onSubmit={handleSubmit}
        submitText="Guardar Entrega"
        loading={false}
      >
        <form onSubmit={handleSubmit}>
          <div className='row mb-3'>
            <div className='col-md-6'>
              <div className='form-check'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  name='actividadesRelevantes'
                  id='actividadesRelevantes'
                  checked={checklistData.actividadesRelevantes}
                  onChange={handleInputChange}
                />
                <label className='form-check-label' htmlFor='actividadesRelevantes'>
                  Actividades Relevantes
                </label>
              </div>
            </div>
            <div className='col-md-6'>
              <div className='form-check'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  name='celular'
                  id='celular'
                  checked={checklistData.celular}
                  onChange={handleInputChange}
                />
                <label className='form-check-label' htmlFor='celular'>
                  Celular
                </label>
              </div>
            </div>
          </div>
          
          {checklistData.actividadesRelevantes && (
            <div className='row mb-3'>
              <div className='col-12'>
                <label className='form-label'>Detalle de Actividades Relevantes</label>
                <textarea
                  className='form-control'
                  name='detalleActividades'
                  value={checklistData.detalleActividades}
                  onChange={handleInputChange}
                  placeholder='Describa las actividades relevantes realizadas...'
                  rows='3'
                />
              </div>
            </div>
          )}
          
          <div className='row mb-3'>
            <div className='col-md-6'>
              <div className='form-check'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  name='equipoComputo'
                  id='equipoComputo'
                  checked={checklistData.equipoComputo}
                  onChange={handleInputChange}
                />
                <label className='form-check-label' htmlFor='equipoComputo'>
                  Equipo de Cómputo
                </label>
              </div>
            </div>
          </div>
          
          {/* Sección de Aplicativos */}
          <div className='row mb-3'>
            <div className='col-12'>
              <h6 className='mb-3'>Aplicativos</h6>
            </div>
          </div>
          
          <div className='row mb-3'>
            <div className='col-md-6'>
              <div className='form-check mb-2'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  name='aplicativo'
                  id='aplicativo'
                  checked={checklistData.aplicativo}
                  onChange={handleInputChange}
                />
                <label className='form-check-label' htmlFor='aplicativo'>
                  <strong>Todo OK</strong>
                </label>
              </div>
              {!checklistData.aplicativo && (
                <textarea
                  className='form-control form-control-sm ms-4'
                  name='aplicativoTexto'
                  value={checklistData.aplicativoTexto}
                  onChange={handleInputChange}
                  placeholder='Describa el estado del aplicativo...'
                  rows='2'
                />
              )}
            </div>
          </div>
          
          <div className='row mb-3'>
            <div className='col-md-12'>
              <label className='form-label'>Turno Entrega</label>
              <select
                className='form-select'
                name='turnoEntrega'
                value={checklistData.turnoEntrega}
                onChange={handleInputChange}
                required
              >
                <option value=''>Seleccionar turno</option>
                {turnosOperativos.map((turno, index) => (
                  <option key={index} value={turno}>
                    {turno}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className='row mb-3'>
            {puedeElegirAmbos ? (
              <>
                <div className='col-md-6'>
                  <label className='form-label'>Quien Entrega</label>
                  <AutocompleteDropdown
                    name='quienEntrega'
                    value={checklistData.quienEntrega}
                    onChange={handleInputChange}
                    options={monitoristas}
                    placeholder='Escribir o seleccionar monitorista...'
                    required
                  />
                </div>
                <div className='col-md-6'>
                  <label className='form-label'>Quien Recibe</label>
                  <AutocompleteDropdown
                    name='quienRecibe'
                    value={checklistData.quienRecibe}
                    onChange={handleInputChange}
                    options={monitoristas}
                    placeholder='Escribir o seleccionar monitorista...'
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div className='col-md-6'>
                  <label className='form-label'>Quien Entrega</label>
                  <input
                    type='text'
                    className='form-control'
                    value={checklistData.quienEntrega}
                    readOnly
                    disabled
                  />
                  <small className='text-muted'>Usuario actual (solo lectura)</small>
                </div>
                <div className='col-md-6'>
                  <label className='form-label'>Quien Recibe</label>
                  <AutocompleteDropdown
                    name='quienRecibe'
                    value={checklistData.quienRecibe}
                    onChange={handleInputChange}
                    options={monitoristas}
                    placeholder='Escribir o seleccionar monitorista...'
                    required
                  />
                </div>
              </>
            )}
          </div>
        </form>
      </UnifiedModal>

      <Footer />
    </div>
  );
};

export default EntregaTurnoMonitoreo;
