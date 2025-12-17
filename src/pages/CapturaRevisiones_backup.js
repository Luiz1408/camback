import React, { useState, useEffect } from 'react';
import MainNavbar from '../components/Layout/MainNavbar';
import NuevaRevisionModal from '../components/NuevaRevisionModal';
import { getUsersByRole, getRevisiones, createRevision, updateRevision } from '../services/api';
import './CapturaRevisiones.css';

const CapturaRevisiones = () => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revisiones, setRevisiones] = useState([]);
  const [monitoristas, setMonitoristas] = useState([]);
  const [activeTab, setActiveTab] = useState('tabla'); // 'tabla' o 'graficas'

  // Estado para guardar el ID del monitorista seleccionado por cada revisión
  const [monitoristaSeleccionadoIds, setMonitoristaSeleccionadoIds] = useState({});

  // Estados para filtros
  const [filtroColor, setFiltroColor] = useState('');
  const [filtroAlmacen, setFiltroAlmacen] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroQuienRealiza, setFiltroQuienRealiza] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');

  // Estado para el navbar
  const [user, setUser] = useState(() => {
    // Intentar obtener datos del usuario desde localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    // Valores por defecto si no hay datos guardados
    return {
      displayName: 'Usuario Demo',
      role: 'Monitorista',
      isAdmin: false
    };
  });

  const handleLogout = () => {
    console.log('Cerrando sesión...');
    // Limpiar localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    // Redirigir al login
    window.location.href = '/login';
  };

  const handleManageUsers = () => {
    console.log('Gestionando usuarios...');
    // Aquí iría la lógica para gestionar usuarios
  };

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      // Cargar monitoristas para el dropdown "Quién realiza"
      const monitoristasData = await getUsersByRole('Monitorista');
      console.log('Monitoristas cargados:', monitoristasData);
      setMonitoristas(monitoristasData);
      
      // Cargar revisiones desde la base de datos
      const revisionesData = await getRevisiones();
      console.log('Revisiones cargadas:', revisionesData);
      setRevisiones(revisionesData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      // Si hay error, usar datos de ejemplo
      setRevisiones([
        {
          id: 1,
          fechaRegistro: '2025-12-09',
          fechaIncidente: '2025-12-07',
          almacen: 'SUCURSAL A',
          ubicacion: 'NORTE',
          nombreCorreo: 'juan.perez@truper.com',
          areaSolicita: 'MANTENIMIENTO',
          quienRealiza: '',
          estatus: 'pendiente',
          titulo: 'Revisión de ejemplo'
        }
      ]);
    }
  };

  const handleOpenModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSubmitRevision = async (formData) => {
    setLoading(true);
    try {
      console.log('Datos de la revisión:', formData);
      
      // Preparar datos para la API
      const revisionData = {
        titulo: formData.titulo,
        fechaRegistro: new Date().toISOString().split('T')[0],
        fechaIncidente: formData.fechaIncidente,
        almacen: formData.ubicacion.split(' - ')[0],
        ubicacion: formData.ubicacion.split(' - ')[1],
        nombreCorreo: formData.titulo,
        areaSolicita: formData.areaQueSolicita,
        quienRealiza: '',
        estatus: 'pendiente'
      };
      
      // Guardar en la base de datos
      const revisionGuardada = await createRevision(revisionData);
      console.log('Revisión guardada:', revisionGuardada);
      
      // Agregar al estado local
      setRevisiones(prev => [revisionGuardada, ...prev]);
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar revisión:', error);
      // Mostrar error al usuario (podrías agregar un toast aquí)
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return '';
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const calcularDiasEspera = (fechaIncidente) => {
    if (!fechaIncidente) return 0;
    const hoy = new Date();
    const incidente = fechaIncidente instanceof Date
      ? fechaIncidente
      : new Date(`${fechaIncidente}T00:00:00`);
    const diffTime = hoy - incidente;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays - 1, 0);
  };

  const handleQuienRealizaChange = async (revisionId, monitoristaId) => {
    console.log('Cambiando quién realiza:', revisionId, monitoristaId);
    
    // Buscar el monitorista completo para obtener el nombre
    const monitoristaSeleccionado = monitoristas.find(
      (m) => m.id === monitoristaId || m.id === parseInt(monitoristaId, 10)
    );
    const nombreMonitorista =
      monitoristaSeleccionado?.fullName ||
      monitoristaSeleccionado?.valor ||
      monitoristaSeleccionado?.username ||
      '';
    
    // Actualizar en la base de datos
    try {
      await updateRevision(revisionId, {
        quienRealiza: nombreMonitorista,
        estatus: 'en_proceso'
      });
      console.log('Revisión actualizada en BD');
    } catch (error) {
      console.error('Error actualizando quién realiza:', error);
      // Si falla la BD, solo actualizar estado local
    }
    
    // Guardar el ID seleccionado en el estado
    setMonitoristaSeleccionadoIds(prev => ({
      ...prev,
      [revisionId]: monitoristaId
    }));
    
    // Actualizar estado local
    setRevisiones(prev => prev.map(revision => 
      revision.id === revisionId 
        ? { ...revision, quienRealiza: nombreMonitorista, estatus: 'en_proceso' }
        : revision
    ));
  };

  const handleEstatusChange = async (revisionId, nuevoEstatus) => {
    console.log('Cambiando estatus:', revisionId, nuevoEstatus);
    
    // Actualizar en la base de datos
    try {
      await updateRevision(revisionId, { estatus: nuevoEstatus });
      console.log('Estatus actualizado en BD');
    } catch (error) {
      console.error('Error actualizando estatus:', error);
      // Si falla la BD, solo actualizar estado local
    }
    
    // Actualizar estado local
    setRevisiones(prev => prev.map(revision => 
      revision.id === revisionId 
        ? { ...revision, estatus: nuevoEstatus }
        : revision
    ));
  };

  // Función para obtener el color según días de espera
  const getColorPorDias = (dias) => {
    if (dias <= 10) return 'verde';
    if (dias <= 20) return 'amarillo';
    if (dias <= 30) return 'naranja';
    return 'rojo';
  };

  // Función para filtrar revisiones
  const revisionesFiltradas = revisiones.filter(revision => {
    const dias = calcularDiasEspera(revision.fechaIncidente);
    const color = getColorPorDias(dias);
    
    return (
      (!filtroColor || color === filtroColor) &&
      (!filtroAlmacen || revision.almacen === filtroAlmacen) &&
      (!filtroArea || revision.areaSolicita === filtroArea) &&
      (!filtroQuienRealiza || revision.quienRealiza === filtroQuienRealiza) &&
      (!filtroEstatus || revision.estatus === filtroEstatus)
    );
  });

  // Obtener opciones únicas para filtros
  const almacenesUnicos = [...new Set(revisiones.map(r => r.almacen))];
  const areasUnicas = [...new Set(revisiones.map(r => r.areaSolicita))];
  const quienesRealizanUnicos = [...new Set(revisiones.map(r => r.quienRealiza).filter(Boolean))];
  const estatusUnicos = [...new Set(revisiones.map(r => r.estatus))];

  // Funciones para gráficas
  const getDatosGraficaEstatus = () => {
    const estatusCount = {};
    revisiones.forEach(revision => {
      estatusCount[revision.estatus] = (estatusCount[revision.estatus] || 0) + 1;
    });
    return estatusCount;
  };

  const getDatosGraficaAlmacen = () => {
    const almacenCount = {};
    revisiones.forEach(revision => {
      almacenCount[revision.almacen] = (almacenCount[revision.almacen] || 0) + 1;
    });
    return almacenCount;
  };

  const getDatosGraficaDias = () => {
    const rangos = {
      '0-10 días': 0,
      '11-20 días': 0,
      '21-30 días': 0,
      '31+ días': 0
    };
    
    revisiones.forEach(revision => {
      const dias = calcularDiasEspera(revision.fechaIncidente);
      if (dias <= 10) rangos['0-10 días']++;
      else if (dias <= 20) rangos['11-20 días']++;
      else if (dias <= 30) rangos['21-30 días']++;
      else rangos['31+ días']++;
    });
    
    return rangos;
  };

  const getDatosGraficaAreas = () => {
    const areaCount = {};
    revisiones.forEach(revision => {
      areaCount[revision.areaSolicita] = (areaCount[revision.areaSolicita] || 0) + 1;
    });
    return areaCount;
  };

  const getDatosGraficaMensual = () => {
    const meses = {
      'Enero': 0, 'Febrero': 0, 'Marzo': 0, 'Abril': 0, 'Mayo': 0, 'Junio': 0,
      'Julio': 0, 'Agosto': 0, 'Septiembre': 0, 'Octubre': 0, 'Noviembre': 0, 'Diciembre': 0
    };
    
    const estatusPorMes = {
      'Enero': { pendiente: 0, en_proceso: 0, enviada: 0, cancelada: 0 },
      'Febrero': { pendiente: 0, en_proceso: 0, enviada: 0, cancelada: 0 },
      'Marzo': { pendiente: 0, en_proceso: 0, enviada: 0, cancelada: 0 },
      'Abril': { pendiente: 0, en_proceso: 0, enviada: 0, cancelada: 0 },
      'Mayo': { pendiente: 0, en_proceso: 0, enviada: 0, cancelada: 0 },
      'Junio': { pendiente: 0, en_proceso: 0, enviada: 0, cancelada: 0 },
      'Julio': { pendiente: 0, en_proceso: 0, enviada: 0, cancelada: 0 },
      'Agosto': { pendiente: 0, en_proceso: 0, enviada: 0, cancelada: 0 },
      'Septiembre': { pendiente: 0, en_proceso: 0, enviada: 0, cancelada: 0 },
      'Octubre': { pendiente: 0, en_proceso: 0, enviada: 0, cancelada: 0 },
      'Noviembre': { pendiente: 0, en_proceso: 0, enviada: 0, cancelada: 0 },
      'Diciembre': { pendiente: 0, en_proceso: 0, enviada: 0, cancelada: 0 }
    };
    
    revisiones.forEach(revision => {
      const fecha = new Date(revision.fechaRegistro);
      const nombreMes = fecha.toLocaleDateString('es-ES', { month: 'long' });
      const mesCapitalizado = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
      
      if (meses.hasOwnProperty(mesCapitalizado)) {
        meses[mesCapitalizado]++;
        if (estatusPorMes[mesCapitalizado]) {
          estatusPorMes[mesCapitalizado][revision.estatus] = 
            (estatusPorMes[mesCapitalizado][revision.estatus] || 0) + 1;
        }
      }
    });
    
    return { meses, estatusPorMes };
  };

  return (
    <div className="dashboard-wrapper min-vh-100">
      <MainNavbar
        displayName={user.displayName}
        role={user.role}
        isAdmin={user.isAdmin}
        onLogout={handleLogout}
        onManageUsers={handleManageUsers}
      />

      <main className="container py-5">
        <div className="card border-0 shadow-lg">
          <div className="card-body p-4 p-md-5">
            <div className="revisiones-header">
              <div className="revisiones-header__info">
                <h1 className="display-6 mb-2">Captura de Revisiones</h1>
                <p className="text-muted mb-0">
                  Gestiona y administra las revisiones pendientes y asignaciones.
                </p>
              </div>

              <div className="revisiones-header__controls">
                <div className="revisiones-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleOpenModal}
                  >
                    <i className="fas fa-plus-circle me-2"></i>
                    Nueva Revisión
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="row mb-4">
              <div className="col-12">
                <ul className="nav nav-tabs" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === 'tabla' ? 'active' : ''}`}
                      onClick={() => setActiveTab('tabla')}
                      type="button"
                    >
                      <i className="fas fa-table me-2"></i>
                      Tabla de Revisiones
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === 'graficas' ? 'active' : ''}`}
                      onClick={() => setActiveTab('graficas')}
                      type="button"
                    >
                      <i className="fas fa-chart-bar me-2"></i>
                      Gráficas Estadísticas
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            {/* Contenido según tab activo */}
            {activeTab === 'tabla' ? (
              <>
                {/* Filtros */}
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="card bg-light">
                      <div className="card-body">
                        <h6 className="card-title mb-3">
                          <i className="fas fa-filter me-2"></i>
                          Filtros
                        </h6>
                        <div className="row g-3">
                          <div className="col-md-2">
                            <label className="form-label small">Días en Espera</label>
                            <select 
                              className="form-select form-select-sm"
                              value={filtroColor}
                              onChange={(e) => setFiltroColor(e.target.value)}
                            >
                              <option value="">Todos</option>
                              <option value="verde">0-10 días (Verde)</option>
                              <option value="amarillo">11-20 días (Amarillo)</option>
                              <option value="naranja">21-30 días (Naranja)</option>
                              <option value="rojo">31+ días (Rojo)</option>
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small">Almacén/Sucursal</label>
                            <select 
                              className="form-select form-select-sm"
                              value={filtroAlmacen}
                              onChange={(e) => setFiltroAlmacen(e.target.value)}
                            >
                              <option value="">Todos</option>
                              {almacenesUnicos.map(almacen => (
                                <option key={almacen} value={almacen}>{almacen}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small">Área que Solicita</label>
                            <select 
                              className="form-select form-select-sm"
                              value={filtroArea}
                              onChange={(e) => setFiltroArea(e.target.value)}
                            >
                              <option value="">Todas</option>
                              {areasUnicas.map(area => (
                                <option key={area} value={area}>{area}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small">Quién Realiza</label>
                            <select 
                              className="form-select form-select-sm"
                              value={filtroQuienRealiza}
                              onChange={(e) => setFiltroQuienRealiza(e.target.value)}
                            >
                              <option value="">Todos</option>
                              {quienesRealizanUnicos.map(quien => (
                                <option key={quien} value={quien}>{quien}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small">Estatus</label>
                            <select 
                              className="form-select form-select-sm"
                              value={filtroEstatus}
                              onChange={(e) => setFiltroEstatus(e.target.value)}
                            >
                              <option value="">Todos</option>
                              <option value="pendiente">Pendiente</option>
                              <option value="en_proceso">En Proceso</option>
                              <option value="enviada">Enviada</option>
                              <option value="cancelada">Cancelada</option>
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small">&nbsp;</label>
                            <button 
                              className="btn btn-outline-secondary btn-sm d-block w-100"
                              onClick={() => {
                                setFiltroColor('');
                                setFiltroAlmacen('');
                                setFiltroArea('');
                                setFiltroQuienRealiza('');
                                setFiltroEstatus('');
                              }}
                            >
                              <i className="fas fa-times me-1"></i>
                              Limpiar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                                <option key={quien} value={quien}>{quien}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small">Estatus</label>
                            <select 
                              className="form-select form-select-sm"
                              value={filtroEstatus}
                              onChange={(e) => setFiltroEstatus(e.target.value)}
                            >
                              <option value="">Todos</option>
                              <option value="pendiente">Pendiente</option>
                              <option value="en_proceso">En Proceso</option>
                              <option value="enviada">Enviada</option>
                              <option value="cancelada">Cancelada</option>
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small">&nbsp;</label>
                            <button 
                              className="btn btn-outline-secondary btn-sm d-block w-100"
                              onClick={() => {
                                setFiltroColor('');
                                setFiltroAlmacen('');
                                setFiltroArea('');
                                setFiltroQuienRealiza('');
                                setFiltroEstatus('');
                              }}
                            >
                              <i className="fas fa-times me-1"></i>
                              Limpiar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th className="border-0 text-muted fw-semibold">
                      <i className="fas fa-calendar-plus me-2 text-primary"></i>
                      Fecha de Registro
                    </th>
                    <th className="border-0 text-muted fw-semibold">
                      <i className="fas fa-calendar-day me-2 text-warning"></i>
                      Fecha Incidente
                    </th>
                    <th className="border-0 text-muted fw-semibold">
                      <i className="fas fa-hourglass-half me-2 text-info"></i>
                      Días en Espera
                    </th>
                    <th className="border-0 text-muted fw-semibold">
                      <i className="fas fa-store me-2 text-success"></i>
                      Almacén/Sucursal
                    </th>
                    <th className="border-0 text-muted fw-semibold">
                      <i className="fas fa-map-marker-alt me-2 text-danger"></i>
                      Ubicación
                    </th>
                    <th className="border-0 text-muted fw-semibold">
                      <i className="fas fa-envelope me-2 text-primary"></i>
                      Nombre del Correo
                    </th>
                    <th className="border-0 text-muted fw-semibold">
                      <i className="fas fa-building me-2 text-secondary"></i>
                      Área que Solicita
                    </th>
                    <th className="border-0 text-muted fw-semibold">
                      <i className="fas fa-user-tie me-2 text-info"></i>
                      Quién Realiza
                    </th>
                    <th className="border-0 text-muted fw-semibold">
                      <i className="fas fa-tasks me-2 text-warning"></i>
                      Estatus
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {revisionesFiltradas.map((revision) => (
                    <tr key={revision.id} className="border-bottom">
                      <td className="align-middle">
                        <div className="d-flex align-items-center">
                          <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
                            <i className="fas fa-calendar text-primary"></i>
                          </div>
                          <span className="fw-medium">{formatDate(revision.fechaRegistro)}</span>
                        </div>
                      </td>
                      <td className="align-middle">
                        <div className="d-flex align-items-center">
                          <div className="bg-warning bg-opacity-10 rounded-circle p-2 me-2">
                            <i className="fas fa-exclamation-triangle text-warning"></i>
                          </div>
                          <span className="fw-medium">{formatDate(revision.fechaIncidente)}</span>
                        </div>
                      </td>
                      <td className="align-middle">
                        <span className={`badge rounded-pill px-3 py-2 ${
                          calcularDiasEspera(revision.fechaIncidente) <= 10 
                            ? 'bg-success' 
                            : calcularDiasEspera(revision.fechaIncidente) <= 20 
                            ? 'bg-warning' 
                            : calcularDiasEspera(revision.fechaIncidente) <= 30 
                            ? 'bg-orange' 
                            : 'bg-danger'
                        }`}>
                          <i className="fas fa-clock me-1"></i>
                          {calcularDiasEspera(revision.fechaIncidente)} días
                        </span>
                      </td>
                      <td className="align-middle">
                        <div className="d-flex align-items-center">
                          <div className="bg-success bg-opacity-10 rounded p-1 me-2">
                            <i className="fas fa-store text-success"></i>
                          </div>
                          <span>{revision.almacen}</span>
                        </div>
                      </td>
                      <td className="align-middle">
                        <div className="d-flex align-items-center">
                          <div className="bg-danger bg-opacity-10 rounded p-1 me-2">
                            <i className="fas fa-map-marker-alt text-danger"></i>
                          </div>
                          <span>{revision.ubicacion}</span>
                        </div>
                      </td>
                      <td className="align-middle">
                        <div className="d-flex align-items-center">
                          <div className="bg-primary bg-opacity-10 rounded p-1 me-2">
                            <i className="fas fa-envelope text-primary"></i>
                          </div>
                          <span className="fw-medium">{revision.nombreCorreo}</span>
                        </div>
                      </td>
                      <td className="align-middle">
                        <div className="d-flex align-items-center">
                          <div className="bg-secondary bg-opacity-10 rounded p-1 me-2">
                            <i className="fas fa-building text-secondary"></i>
                          </div>
                          <span>{revision.areaSolicita}</span>
                        </div>
                      </td>
                      <td className="align-middle">
                        <select
                          className="form-select form-select-sm border-0 bg-light"
                          value={monitoristaSeleccionadoIds[revision.id] || ''}
                          onChange={(e) => handleQuienRealizaChange(revision.id, e.target.value)}
                        >
                          <option value="">Seleccionar monitorista</option>
                          {monitoristas.map((monitorista) => {
                            const displayName =
                              monitorista.fullName ||
                              monitorista.valor ||
                              `${monitorista.firstName ?? ''} ${monitorista.lastName ?? ''}`.trim() ||
                              monitorista.username ||
                              `ID ${monitorista.id}`;

                            return (
                              <option key={monitorista.id} value={monitorista.id}>
                                {displayName}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="align-middle">
                        <select
                          className="form-select form-select-sm border-0 bg-light"
                          value={revision.estatus}
                          onChange={(e) => handleEstatusChange(revision.id, e.target.value)}
                        >
                          <option value="pendiente">Pendiente</option>
                          <option value="en_proceso">En Proceso</option>
                          <option value="enviada">Enviada</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              </>
            ) : (
              /* Gráficas */
              <div className="row">
                <div className="col-md-6 mb-4">
                  <div className="card">
                    <div className="card-header bg-primary text-white">
                      <h6 className="mb-0">
                        <i className="fas fa-chart-pie me-2"></i>
                        Revisiones por Estatus
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="text-center">
                        {Object.entries(getDatosGraficaEstatus()).map(([estatus, count]) => (
                          <div key={estatus} className="mb-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="badge bg-secondary">{estatus}</span>
                              <span className="fw-bold">{count}</span>
                            </div>
                            <div className="progress mt-1" style={{ height: '8px' }}>
                              <div 
                                className="progress-bar bg-primary"
                                style={{ width: `${(count / revisiones.length) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-6 mb-4">
                  <div className="card">
                    <div className="card-header bg-success text-white">
                      <h6 className="mb-0">
                        <i className="fas fa-store me-2"></i>
                        Revisiones por Almacén
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="text-center">
                        {Object.entries(getDatosGraficaAlmacen()).map(([almacen, count]) => (
                          <div key={almacen} className="mb-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="badge bg-success">{almacen}</span>
                              <span className="fw-bold">{count}</span>
                            </div>
                            <div className="progress mt-1" style={{ height: '8px' }}>
                              <div 
                                className="progress-bar bg-success"
                                style={{ width: `${(count / revisiones.length) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-6 mb-4">
                  <div className="card">
                    <div className="card-header bg-warning text-dark">
                      <h6 className="mb-0">
                        <i className="fas fa-clock me-2"></i>
                        Días en Espera
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="text-center">
                        {Object.entries(getDatosGraficaDias()).map(([rango, count]) => (
                          <div key={rango} className="mb-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className={`badge ${
                                rango === '0-10 días' ? 'bg-success' :
                                rango === '11-20 días' ? 'bg-warning' :
                                rango === '21-30 días' ? 'bg-orange' : 'bg-danger'
                              }`}>{rango}</span>
                              <span className="fw-bold">{count}</span>
                            </div>
                            <div className="progress mt-1" style={{ height: '8px' }}>
                              <div 
                                className={`progress-bar ${
                                  rango === '0-10 días' ? 'bg-success' :
                                  rango === '11-20 días' ? 'bg-warning' :
                                  rango === '21-30 días' ? 'bg-orange' : 'bg-danger'
                                }`}
                                style={{ width: `${(count / revisiones.length) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-6 mb-4">
                  <div className="card">
                    <div className="card-header bg-info text-white">
                      <h6 className="mb-0">
                        <i className="fas fa-building me-2"></i>
                        Revisiones por Área
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="text-center">
                        {Object.entries(getDatosGraficaAreas()).map(([area, count]) => (
                          <div key={area} className="mb-3">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="badge bg-info">{area}</span>
                              <span className="fw-bold">{count}</span>
                            </div>
                            <div className="progress mt-1" style={{ height: '8px' }}>
                              <div 
                                className="progress-bar bg-info"
                                style={{ width: `${(count / revisiones.length) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <div className="card">
                    <div className="card-header bg-dark text-white">
                      <h6 className="mb-0">
                        <i className="fas fa-calendar-alt me-2"></i>
                        Revisiones Mensuales por Días en Espera
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        {Object.entries(getDatosGraficaMensual().meses).filter(([mes, count]) => count > 0).map(([mes, count]) => (
                          <div key={mes} className="col-md-6 col-lg-4 mb-4">
                            <div className="card border">
                              <div className="card-header bg-light">
                                <h6 className="mb-0 text-center">{mes}</h6>
                              </div>
                              <div className="card-body p-3">
                                <div className="text-center mb-3">
                                  <span className="badge bg-primary fs-6">{count} revisiones</span>
                                </div>
                                {(() => {
                                  const estatusPorMes = getDatosGraficaMensual().estatusPorMes[mes];
                                  const total = count;
                                  const verde = Math.round((estatusPorMes.pendiente / total) * 100) || 0;
                                  const amarillo = Math.round((estatusPorMes.en_proceso / total) * 100) || 0;
                                  const naranja = Math.round((estatusPorMes.enviada / total) * 100) || 0;
                                  const rojo = Math.round((estatusPorMes.cancelada / total) * 100) || 0;
                                  
                                  return (
                                    <div>
                                      <div className="mb-2">
                                        <small className="text-muted">Distribución por estatus:</small>
                                      </div>
                                      <div className="progress mb-1" style={{ height: '20px' }}>
                                        <div 
                                          className="progress-bar bg-success" 
                                          style={{ width: `${verde}%` }}
                                          title={`Pendiente: ${estatusPorMes.pendiente}`}
                                        >
                                          {verde > 5 && `${verde}%`}
                                        </div>
                                        <div 
                                          className="progress-bar bg-warning" 
                                          style={{ width: `${amarillo}%` }}
                                          title={`En Proceso: ${estatusPorMes.en_proceso}`}
                                        >
                                          {amarillo > 5 && `${amarillo}%`}
                                        </div>
                                        <div 
                                          className="progress-bar bg-orange" 
                                          style={{ width: `${naranja}%` }}
                                          title={`Enviada: ${estatusPorMes.enviada}`}
                                        >
                                          {naranja > 5 && `${naranja}%`}
                                        </div>
                                        <div 
                                          className="progress-bar bg-danger" 
                                          style={{ width: `${rojo}%` }}
                                          title={`Cancelada: ${estatusPorMes.cancelada}`}
                                        >
                                          {rojo > 5 && `${rojo}%`}
                                        </div>
                                      </div>
                                      <div className="row text-center mt-2">
                                        <div className="col-3">
                                          <div className="d-flex align-items-center justify-content-center">
                                            <div className="bg-success rounded-circle me-1" style={{ width: '8px', height: '8px' }}></div>
                                            <small>{estatusPorMes.pendiente}</small>
                                          </div>
                                        </div>
                                        <div className="col-3">
                                          <div className="d-flex align-items-center justify-content-center">
                                            <div className="bg-warning rounded-circle me-1" style={{ width: '8px', height: '8px' }}></div>
                                            <small>{estatusPorMes.en_proceso}</small>
                                          </div>
                                        </div>
                                        <div className="col-3">
                                          <div className="d-flex align-items-center justify-content-center">
                                            <div className="bg-orange rounded-circle me-1" style={{ width: '8px', height: '8px' }}></div>
                                            <small>{estatusPorMes.enviada}</small>
                                          </div>
                                        </div>
                                        <div className="col-3">
                                          <div className="d-flex align-items-center justify-content-center">
                                            <div className="bg-danger rounded-circle me-1" style={{ width: '8px', height: '8px' }}></div>
                                            <small>{estatusPorMes.cancelada}</small>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <NuevaRevisionModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSubmit={handleSubmitRevision}
        loading={loading}
      />
    </div>
  );
};

export default CapturaRevisiones;
