import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUsersByRole } from '../services/api';
import { getCatalogoByTipo, getAllTipos } from '../services/catalogos';
import { 
  getShiftHandOffNotes, 
  createShiftHandOffNote, 
  updateShiftHandOffNote, 
  deleteShiftHandOffNote 
} from '../services/shiftHandOffService';
import { toast } from 'react-toastify';
import AutocompleteDropdown from '../components/AutocompleteDropdown';
import UnifiedModal from '../components/Common/UnifiedModal';
import MainNavbar from '../components/Layout/MainNavbar';
import Footer from '../components/Layout/Footer';
import '../components/Common/UnifiedModal.css';
import './EntregaTurnoMonitoreo.css';

const TURNOS = [
  { id: 'turno1', nombre: 'Turno 1 (6:00 - 14:00)', horaInicio: '06:00', horaFin: '14:00' },
  { id: 'turno2', nombre: 'Turno 2 (14:00 - 22:00)', horaInicio: '14:00', horaFin: '22:00' },
  { id: 'turno3', nombre: 'Turno 3 (22:00 - 6:00)', horaInicio: '22:00', horaFin: '06:00' }
];

const EntregaTurnoMonitoreo = () => {
  const { currentUser } = useAuth();
  const [checklistData, setChecklistData] = useState({
    actividadesRelevantes: false,
    detalleActividades: '',
    celular: false,
    celularTexto: '',
    laptops: false,
    laptopsTexto: '',
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
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [turnoSeleccionado, setTurnoSeleccionado] = useState('');

  const user = currentUser || {
    displayName: 'Usuario Demo',
    role: 'Administrador',
    isAdmin: true
  };

  const isAdmin = user?.role === 'Administrador' || user?.role === 'admin' || user?.role === 'Admin';
  const isCoordinador = user?.role === 'Coordinador' || user?.role === 'coordinador' || user?.role === 'Coordinator';
  const isMonitorista = user?.role === 'Monitorista' || user?.role === 'monitorista' || user?.role === 'Monitor';
  const puedeElegirAmbos = isAdmin || isCoordinador;
  const displayName = user?.fullName || user?.displayName || user?.username || 'Usuario';

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleManageUsers = () => {};

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        
        const notasData = await getShiftHandOffNotes();
        
        const entregasFromBackend = notasData.map(note => ({
          id: note.id,
          fecha: new Date(note.createdAt).toLocaleDateString('en-CA'),
          actividadesRelevantes: false,
          detalleActividades: note.description || '',
          celular: false,
          equipoComputo: false,
          aplicativo: false,
          aplicativoTexto: '',
          turnoEntrega: note.type || 'No especificado',
          quienEntrega: note.deliveringUser?.fullName || note.deliveringUser?.username || 'No especificado',
          quienRecibe: note.assignedCoordinator?.fullName || 'No asignado',
          creadoPor: note.createdBy?.fullName || note.createdBy?.username || 'Sistema'
        }));
        
        setEntregas(entregasFromBackend);
        
        try {
          await getAllTipos();
        } catch (err) {}
        
        let turnosData = [];
        
        try {
          const response = await getCatalogoByTipo('DET_TURNO_OPERATIVO');
          if (response && response.length > 0) {
            turnosData = response.map(item => item.valor || item.nombre || item.descripcion);
          }
        } catch (err) {}
        
        if (turnosData.length === 0) {
          turnosData = [
            'Turno Matutino (6:00 - 14:00)',
            'Turno Vespertino (14:00 - 22:00)', 
            'Turno Nocturno (22:00 - 6:00)',
            'Turno Administrativo (9:00 - 18:00)'
          ];
        }
        
        setTurnosOperativos(turnosData);
        
        try {
          const monitoristasResponse = await getUsersByRole('monitorista');
          const monitoristasData = monitoristasResponse.map(user => ({
            id: user.id,
            valor: user.valor || user.fullName || user.username
          }));
          setMonitoristas(monitoristasData);
        } catch (err) {}
        
      } catch (error) {
        toast.error('Error al cargar los datos. Por favor, recarga la página.');
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, []);

  useEffect(() => {
    if (isMonitorista && user) {
      setChecklistData(prev => ({
        ...prev,
        quienEntrega: user.fullName || user.displayName || user.username || 'Usuario'
      }));
    }
  }, [isMonitorista, user]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setChecklistData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!checklistData.turnoEntrega) {
      toast.error('Por favor selecciona un turno de entrega');
      return;
    }
    
    if (!checklistData.quienEntrega) {
      toast.error('Por favor selecciona quién entrega');
      return;
    }
    
    if (!checklistData.quienRecibe) {
      toast.error('Por favor selecciona quién recibe');
      return;
    }
    
    if (checklistData.aplicativo && !checklistData.aplicativoTexto.trim()) {
      toast.error('Por favor proporciona el detalle del aplicativo');
      return;
    }
    
    if (checklistData.celular && !checklistData.celularTexto.trim()) {
      toast.error('Por favor proporciona el detalle del celular');
      return;
    }
    
    if (checklistData.laptops && !checklistData.laptopsTexto.trim()) {
      toast.error('Por favor proporciona el detalle de las laptops');
      return;
    }
    
    try {
      setLoading(true);
      
      const noteData = {
        title: `Entrega de Turno - ${checklistData.turnoEntrega}`,
        description: checklistData.detalleActividades || 'Entrega de turno realizada',
        type: checklistData.turnoEntrega || 'informativo',
        assignedCoordinatorId: checklistData.quienRecibe ? monitoristas.find(m => m.valor === checklistData.quienRecibe)?.id : null,
        deliveringUserId: checklistData.quienEntrega ? monitoristas.find(m => m.valor === checklistData.quienEntrega)?.id : null,
        actividadesRelevantes: checklistData.actividadesRelevantes
      };
      
      const newNote = await createShiftHandOffNote(noteData);
      if (!newNote) {
        throw new Error('Backend ShiftHandOff no disponible');
      }
      
      const nuevaEntrega = {
        id: newNote.id,
        fecha: new Date().toLocaleDateString('en-CA'),
        actividadesRelevantes: checklistData.actividadesRelevantes,
        detalleActividades: newNote.description || '',
        celular: checklistData.celular,
        equipoComputo: checklistData.equipoComputo,
        aplicativo: checklistData.aplicativo,
        aplicativoTexto: checklistData.aplicativoTexto,
        turnoEntrega: newNote.type || checklistData.turnoEntrega,
        quienEntrega: newNote.deliveringUser?.fullName || newNote.deliveringUser?.username || 'No especificado',
        quienRecibe: newNote.assignedCoordinator?.fullName || 'No asignado',
        creadoPor: currentUser?.username || 'Usuario'
      };
      
      setEntregas([nuevaEntrega, ...entregas]);
      
      setShowModal(false);
      setChecklistData({
        actividadesRelevantes: false,
        detalleActividades: '',
        celular: false,
        celularTexto: '',
        laptops: false,
        laptopsTexto: '',
        aplicativo: false,
        aplicativoTexto: '',
        turnoEntrega: '',
        quienEntrega: '',
        quienRecibe: ''
      });
      
      toast.success('Entrega de turno guardada correctamente en la base de datos');
      
    } catch (error) {
      toast.error('Error al guardar la entrega de turno. Por favor, inténtalo de nuevo.');
      
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
    } finally {
      setLoading(false);
    }
  };

  const getBadgeClass = (value) => {
    return value ? 'bg-danger' : 'bg-success';
  };

  const getBadgeText = (value) => {
    return value ? 'Sí' : 'No';
  };

  const contarEntregasPorTurno = (turno) => {
    return entregasFiltradas.filter(entrega => {
      if (!turno) return false;
      
      if (turno === 'turno1') {
        return entrega.turnoEntrega && (
          entrega.turnoEntrega.includes('6:00') || 
          entrega.turnoEntrega.includes('1° Turno') ||
          entrega.turnoEntrega.includes('Matutino')
        );
      } else if (turno === 'turno2') {
        return entrega.turnoEntrega && (
          entrega.turnoEntrega.includes('14:00') || 
          entrega.turnoEntrega.includes('2° Turno') ||
          entrega.turnoEntrega.includes('Vespertino')
        );
      } else if (turno === 'turno3') {
        return entrega.turnoEntrega && (
          entrega.turnoEntrega.includes('22:00') || 
          entrega.turnoEntrega.includes('3° Turno') ||
          entrega.turnoEntrega.includes('Nocturno')
        );
      }
      return false;
    }).length;
  };

  const filtrarEntregasPorFechaYTurno = () => {
    if (!fechaFiltro) return entregas;

    const fechaSeleccionada = new Date(fechaFiltro + 'T00:00:00');
    const diaSiguiente = new Date(fechaSeleccionada);
    diaSiguiente.setDate(diaSiguiente.getDate() + 1);

    return entregas.filter(entrega => {
      if (!entrega.fecha) return false;
      
      const fechaEntrega = entrega.fecha;
      
      if (entrega.turnoEntrega && (entrega.turnoEntrega.includes('22:00') || entrega.turnoEntrega.includes('6:00'))) {
        const coincide = fechaEntrega === fechaFiltro || 
                       fechaEntrega === new Date(diaSiguiente).toISOString().split('T')[0];
        return coincide;
      } else {
        const coincide = fechaEntrega === fechaFiltro;
        return coincide;
      }
    });
  };

  const entregasFiltradas = filtrarEntregasPorFechaYTurno();

  const handleDeleteEntrega = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta entrega de turno?')) {
      try {
        setLoading(true);
        
        // Eliminar del backend
        await deleteShiftHandOffNote(id);
                
        // Eliminar del estado local
        setEntregas(entregas.filter(entrega => entrega.id !== id));
        
        // Mostrar mensaje de éxito
        toast.success('Entrega de turno eliminada correctamente de la base de datos');
        
      } catch (error) {
                toast.error('Error al eliminar la entrega de turno. Por favor, inténtalo de nuevo.');
        
        // Si hay error, eliminar localmente como fallback
        setEntregas(entregas.filter(entrega => entrega.id !== id));
      } finally {
        setLoading(false);
      }
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
            
            {/* Filtro por fecha */}
            <div className='card mb-4'>
              <div className='card-body'>
                <h6 className='card-title mb-3'>Filtrar por Fecha</h6>
                <div className='row'>
                  <div className='col-md-4'>
                    <label className='form-label'>Seleccionar Fecha</label>
                    <input
                      type='date'
                      className='form-control'
                      value={fechaFiltro}
                      onChange={(e) => setFechaFiltro(e.target.value)}
                      max={new Date().toISOString().split('T')[0]} // Bloquear días futuros
                    />
                  </div>
                  <div className='col-md-8'>
                    <label className='form-label'>Turnos del Día</label>
                    <div className='row'>
                      {TURNOS.map(turno => (
                        <div key={turno.id} className='col-md-4 mb-2'>
                          <div className='card border-primary'>
                            <div className='card-body p-3'>
                              <h6 className='card-title mb-2'>{turno.nombre}</h6>
                              <small className='text-muted'>{turno.horaInicio} - {turno.horaFin}</small>
                              <div className='mt-2'>
                                <span className='badge bg-info'>
                                  {contarEntregasPorTurno(turno.id)} entregas
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
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
                        <th>Laptops</th>
                        <th>Aplicativo</th>
                        <th>Turno Entrega</th>
                        <th>Quien Entrega</th>
                        <th>Quien Recibe</th>
                        {isAdmin && <th>Creado Por</th>}
                        {isAdmin && <th>Acciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {entregasFiltradas.map(entrega => (
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
                            <span className={'badge ' + getBadgeClass(entrega.laptops)}>
                              {getBadgeText(entrega.laptops)}
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
                          {isAdmin && (
                            <td>
                              <small className='text-muted'>{entrega.creadoPor}</small>
                            </td>
                          )}
                          {isAdmin && (
                            <td>
                              <button
                                className='btn btn-sm btn-outline-danger'
                                onClick={() => handleDeleteEntrega(entrega.id)}
                                title='Eliminar entrega'
                              >
                                <i className='fas fa-trash'></i>
                              </button>
                            </td>
                          )}
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
            <div className='col-12'>
              <h6 className='mb-3'>Dispositivos</h6>
            </div>
          </div>
          
          <div className='row mb-3'>
            <div className='col-md-6'>
              <h6 className='mb-2'>Celular</h6>
              <div className='form-check mb-2'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  name='celular'
                  id='celular'
                  checked={checklistData.celular}
                  onChange={handleInputChange}
                />
                <label className='form-check-label' htmlFor='celular'>
                  Todo OK
                </label>
              </div>
              {!checklistData.celular && (
                <textarea
                  className='form-control'
                  name='celularTexto'
                  value={checklistData.celularTexto || ''}
                  onChange={handleInputChange}
                  placeholder='Describa las incidencias del celular...'
                  rows='3'
                />
              )}
            </div>
            <div className='col-md-6'>
              <h6 className='mb-2'>Laptops</h6>
              <div className='form-check mb-2'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  name='laptops'
                  id='laptops'
                  checked={checklistData.laptops}
                  onChange={handleInputChange}
                />
                <label className='form-check-label' htmlFor='laptops'>
                  Todo OK
                </label>
              </div>
              {!checklistData.laptops && (
                <textarea
                  className='form-control'
                  name='laptopsTexto'
                  value={checklistData.laptopsTexto || ''}
                  onChange={handleInputChange}
                  placeholder='Describa las incidencias de las laptops...'
                  rows='3'
                />
              )}
            </div>
          </div>
          
          {/* Sección de Actividades Relevantes */}
          <div className='row mb-3'>
            <div className='col-12'>
              <h6 className='mb-3'>Actividades Relevantes</h6>
            </div>
          </div>
          
          <div className='row mb-3'>
            <div className='col-md-6'>
              <div className='form-check'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  name='actividadesRelevantes'
                  id='actividadesRelevantesNo'
                  checked={!checklistData.actividadesRelevantes}
                  onChange={() => setChecklistData(prev => ({...prev, actividadesRelevantes: false}))}
                />
                <label className='form-check-label' htmlFor='actividadesRelevantesNo'>
                  No
                </label>
              </div>
            </div>
            <div className='col-md-6'>
              <div className='form-check'>
                <input
                  className='form-check-input'
                  type='checkbox'
                  name='actividadesRelevantes'
                  id='actividadesRelevantesSi'
                  checked={checklistData.actividadesRelevantes}
                  onChange={() => setChecklistData(prev => ({...prev, actividadesRelevantes: true}))}
                />
                <label className='form-check-label' htmlFor='actividadesRelevantesSi'>
                  Sí
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
          
          {/* Sección de Aplicativos */}
          <div className='row mb-3'>
            <div className='col-12'>
              <h6 className='mb-3'>Aplicativos</h6>
            </div>
          </div>
          
          <div className='row mb-3'>
            <div className='col-12'>
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
                  <strong>Sin Incidencias</strong>
                </label>
              </div>
              {!checklistData.aplicativo && (
                <textarea
                  className='form-control'
                  name='aplicativoTexto'
                  value={checklistData.aplicativoTexto}
                  onChange={handleInputChange}
                  placeholder='Describa el estado del aplicativo...'
                  rows='3'
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
