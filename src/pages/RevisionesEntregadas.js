import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import MainNavbar from '../components/Layout/MainNavbar';
import Footer from '../components/Layout/Footer';
import RevisionFormModal from '../components/RevisionFormModal';
import { useAuth } from '../contexts/AuthContext';
import { useUserManagement } from '../contexts/UserManagementContext';
import { useToast } from '../contexts/ToastContext';
import useDashboardFilters from '../hooks/useDashboardFilters';
import api from '../services/api';
import { formatUserName } from '../utils/formatUserName';
import { crearFolio, getRevisiones, getDetecciones } from '../services/folios';
import './RevisionesEntregadas.css';
import '../styles/responsive.css';

const normalizeHeaderKey = (rawKey) =>
  (rawKey ?? '')
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const DISPLAY_FIELDS = [
  {
    preferredKey: 'fechaEnvio',
    label: 'Fecha de envío',
    matchers: ['fechaenvio', 'fechadeenvio'],
    format: 'date',
  },
  {
    preferredKey: 'ubicacion',
    label: 'Ubicación',
    matchers: ['ubicacion', 'ubicaciongeneral', 'ubicaciondetallada'],
  },
  {
    preferredKey: 'subIndicador',
    label: 'Sub indicador',
    matchers: ['subindicador'],
  },
  {
    preferredKey: 'colaboradorInvolucrado',
    label: 'Colaborador involucrado',
    matchers: ['colaboradorinvolucrado', 'colaborador'],
  },
  {
    preferredKey: 'quienReporta',
    label: 'Quién reporta',
    matchers: ['quienreporta', 'quienreporto', 'monitoristareporta', 'monitorista', 'persona'],
  },
];

const buildTableHeadersFromRow = (row = {}) => {
  const normalizedKeyMap = new Map();

  Object.keys(row).forEach((key) => {
    const normalized = normalizeHeaderKey(key);
    if (normalized && !normalizedKeyMap.has(normalized)) {
      normalizedKeyMap.set(normalized, key);
    }
  });

  return DISPLAY_FIELDS.map(({ preferredKey, label, matchers, format }) => {
    const matchedNormalizedKey = matchers.find((matcher) => normalizedKeyMap.has(matcher));
    const resolvedKey = matchedNormalizedKey ? normalizedKeyMap.get(matchedNormalizedKey) : preferredKey;

    return {
      key: resolvedKey,
      label,
      matchers,
      format,
    };
  });
};

const DEFAULT_TABLE_HEADERS = buildTableHeadersFromRow();

const formatDateForDisplay = (rawValue) => {
  if (rawValue === undefined || rawValue === null) {
    return '—';
  }

  const trimmed = `${rawValue}`.trim();
  if (!trimmed) {
    return '—';
  }

  const isoMatch = trimmed.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year.slice(-2)}`;
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year.slice(-2)}`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const day = parsed.getDate().toString().padStart(2, '0');
    const month = (parsed.getMonth() + 1).toString().padStart(2, '0');
    const year = parsed.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  }

  return trimmed;
};

const getValueForHeader = (rowItem, header) => {
  if (!rowItem || !header) {
    return '—';
  }

  const { data, normalizedData } = rowItem;
  const applyFormat = (raw) => {
    if (raw === undefined || raw === null) {
      return '—';
    }

    const rawString = typeof raw === 'string' ? raw : `${raw}`;
    const trimmed = rawString.trim();
    if (!trimmed) {
      return '—';
    }

    if (header.format === 'date') {
      return formatDateForDisplay(trimmed);
    }

    return trimmed;
  };

  if (header.key && data && Object.prototype.hasOwnProperty.call(data, header.key)) {
    const directValue = data[header.key];
    const formattedDirect = applyFormat(directValue);
    if (formattedDirect !== '—') {
      return formattedDirect;
    }
  }

  const normalizedMap = normalizedData ?? {};

  if (Array.isArray(header.matchers)) {
    for (const matcher of header.matchers) {
      if (Object.prototype.hasOwnProperty.call(normalizedMap, matcher)) {
        const candidate = normalizedMap[matcher];
        const formattedCandidate = applyFormat(candidate);
        if (formattedCandidate !== '—') {
          return formattedCandidate;
        }
      }
    }
  }

  if (header.key) {
    const fallbackNormalized = normalizeHeaderKey(header.key);
    if (fallbackNormalized && Object.prototype.hasOwnProperty.call(normalizedMap, fallbackNormalized)) {
      const fallbackValue = normalizedMap[fallbackNormalized];
      const formattedFallback = applyFormat(fallbackValue);
      if (formattedFallback !== '—') {
        return formattedFallback;
      }
    }
  }

  return '—';
};

const RevisionesEntregadas = () => {
  const { currentUser, logout } = useAuth();
  const { openModal: openUserManagementModal } = useUserManagement();
  const { addToast } = useToast();

  const [showFormModal, setShowFormModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formattedData, setFormattedData] = useState([]);
  const [tableHeaders, setTableHeaders] = useState(DEFAULT_TABLE_HEADERS);
  const [selectedRows, setSelectedRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [deletingAll, setDeletingAll] = useState(false);

  const {
    filterType,
    setFilterType,
    filterAlmacen,
    setFilterAlmacen,
    filterMonitorista,
    setFilterMonitorista,
    filterCoordinador,
    setFilterCoordinador,
    filterFechaEnvio,
    setFilterFechaEnvio,
    filterOptions,
    filterOptionsLoading,
    filterOptionsError,
    fetchFilterOptions,
    normalizeDateFilterValue,
  } = useDashboardFilters();

  const isAdmin = useMemo(() => {
    const normalizedRole = (currentUser?.role || '').trim().toLowerCase();
    return ['administrator', 'administrador', 'admin'].includes(normalizedRole);
  }, [currentUser]);

  const displayName = formatUserName(currentUser);

  // Carga de datos para la tabla - DEFINIDAS PRIMERO
  const fetchRevisiones = useCallback(async () => {
    try {
      setLoading(true);
      const revisiones = await getRevisiones();
      
      // Formatear datos para la tabla
      const formatted = revisiones.map(revision => ({
        id: revision.id,
        data: {
          folio1: revision.folio1,
          folio2: revision.folio2,
          acumulado: revision.acumulado,
          fechaEnvio: revision.fechaEnvio,
          almacen: revision.almacen,
          indicador: revision.indicador,
          subindicador: revision.subindicador,
          monitorista: revision.monitorista,
          coordinadorEnTurno: revision.coordinadorEnTurno,
          observaciones: revision.observaciones,
          mes: revision.mes,
          fechaSolicitud: revision.fechaSolicitud,
          fechaIncidente: revision.fechaIncidente,
          monto: revision.monto,
          comentarioGeneral: revision.comentarioGeneral,
          areaCargo: revision.areaCargo,
          areaSolicita: revision.areaSolicita,
          puesto: revision.puesto,
          codigo: revision.codigo,
          tiempo: revision.tiempo,
          ticket: revision.ticket,
          personalInvolucrado: revision.personalInvolucrado,
          no: revision.no,
          nomina: revision.nomina,
          lineaEmpresaPlacas: revision.lineaEmpresaPlacas,
          ubicacion2: revision.ubicacion2,
          areaEspecifica: revision.areaEspecifica,
          turnoOperativo: revision.turnoOperativo,
          situacion: revision.situacion,
          quienEnvia: revision.quienEnvia,
          fechaCreacion: revision.fechaCreacion
        }
      }));
      
      setFormattedData(formatted);
      setTotalRecords(formatted.length);
    } catch (err) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Error al obtener revisiones';
      addToast({ type: 'error', message });
      setFormattedData([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const fetchDetecciones = useCallback(async () => {
    try {
      setLoading(true);
      const detecciones = await getDetecciones();
      
      // Formatear datos para la tabla
      const formatted = detecciones.map(deteccion => ({
        id: deteccion.id,
        data: {
          folio1: deteccion.folio1,
          folio2: deteccion.folio2,
          acumulado: deteccion.acumulado,
          fechaEnvio: deteccion.fechaEnvio,
          sucursal: deteccion.sucursal,
          codigo: deteccion.codigo,
          indicador: deteccion.indicador,
          subindicador: deteccion.subindicador,
          monitorista: deteccion.monitorista,
          coordinadorEnTurno: deteccion.coordinadorEnTurno,
          puesto: deteccion.puesto,
          puestoColaborador: deteccion.puestoColaborador,
          folioAsignado1: deteccion.folioAsignado1,
          ubicacionSucursal: deteccion.ubicacionSucursal,
          generaImpacto: deteccion.generaImpacto,
          folioAsignado2: deteccion.folioAsignado2,
          colaboradorInvolucrado: deteccion.colaboradorInvolucrado,
          lineaEmpresa: deteccion.lineaEmpresa,
          supervisorJefeTurno: deteccion.supervisorJefeTurno,
          situacionDescripcion: deteccion.situacionDescripcion,
          enviaReporte: deteccion.enviaReporte,
          retroalimentacion: deteccion.retroalimentacion,
          ubicacion: deteccion.ubicacion,
          almacen: deteccion.almacen,
          hora: deteccion.hora,
          no: deteccion.no,
          nomina: deteccion.nomina,
          areaEspecifica: deteccion.areaEspecifica,
          turnoOperativo: deteccion.turnoOperativo,
          fechaCreacion: deteccion.fechaCreacion
        }
      }));
      
      setFormattedData(formatted);
      setTotalRecords(formatted.length);
    } catch (err) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Error al obtener detecciones';
      addToast({ type: 'error', message });
      setFormattedData([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const handleFormSubmit = useCallback(async (formData) => {
    setFormLoading(true);
    
    try {
      const response = await api.post('/revisiones/crear-folio', formData);
      
      addToast({ 
        type: 'success', 
        message: 'Folio creado correctamente.' 
      });
      
      setShowFormModal(false);
      fetchRevisiones(page, filterType);
      fetchDetecciones(page, filterType);
      fetchFilterOptions(filterType);
    } catch (err) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Error al crear el folio.';
      addToast({ 
        type: 'error', 
        message 
      });
    } finally {
      setFormLoading(false);
    }
  }, [addToast, fetchRevisiones, fetchDetecciones, page, filterType, fetchFilterOptions]);

  const handleOpenFormModal = () => {
    setShowFormModal(true);
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
  };

  const handleDeleteSelected = useCallback(async () => {
    if (selectedRows.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de eliminar ${selectedRows.length} registro(s) seleccionado(s)? Esta acción no se puede deshacer.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.post('/upload/delete-selected', {
        ids: selectedRows,
      });
      addToast({ type: 'success', message: 'Registros eliminados correctamente.' });
      setSelectedRows([]);
      fetchRevisiones(page, filterType);
      fetchDetecciones(page, filterType);
    } catch (err) {
      const message =
        err?.response?.data?.message ??
        err?.response?.data ??
        err?.message ??
        'Error al eliminar los registros seleccionados.';

      addToast({
        type: 'error',
        message: typeof message === 'string' ? message : 'Error al eliminar los registros seleccionados.',
      });
    }
  }, [selectedRows, fetchRevisiones, fetchDetecciones, page, filterType, addToast]);

  const handleCreateFolio = useCallback(async (formData) => {
    try {
      setFormLoading(true);
      
      // Preparar datos según el tipo
      const folioData = {
        tipo: formData.tipo,
        fechaEnvio: formData.fechaEnvio,
        hora: formData.hora ? `${formData.hora}:00` : null,
        indicador: formData.indicador,
        subindicador: formData.subindicador,
        monitorista: formData.monitorista,
        puesto: formData.puesto,
        
        // Campos específicos según tipo
        ...(formData.tipo === 'revision' ? {
          almacen: formData.almacen,
          observaciones: formData.observaciones,
          mes: formData.mes,
          fechaSolicitud: formData.fechaSolicitud,
          fechaIncidente: formData.fechaIncidente,
          monto: formData.monto,
          codigo: formData.codigo,
          comentarioGeneral: formData.comentarioGeneral,
          areaCargo: formData.areaCargo,
          tiempo: formData.tiempo,
          ticket: formData.ticket,
          foliosAsignado1: formData.folioAsignado1,
          foliosAsignado2: formData.folioAsignado2,
          personalInvolucrado: formData.personalInvolucrado,
          no: formData.no,
          nomina: formData.nomina,
          lineaEmpresaPlacas: formData.lineaEmpresaPlacas,
          ubicacion2: formData.ubicacion2,
          areaEspecifica: formData.areaEspecifica,
          turnoOperativo: formData.turnoOperativo,
          situacion: formData.situacion,
          quienEnvia: formData.quienEnvia
        } : {
          sucursal: formData.sucursal,
          codigo: formData.codigo,
          folioAsignado1: formData.folioAsignado1,
          ubicacionSucursal: formData.ubicacionSucursal,
          puestoColaborador: formData.puestoColaborador,
          generaImpacto: formData.generaImpacto,
          folioAsignado2: formData.folioAsignado2,
          colaboradorInvolucrado: formData.colaboradorInvolucrado,
          lineaEmpresa: formData.lineaEmpresa,
          supervisorJefeTurno: formData.supervisorJefeTurno,
          situacionDescripcion: formData.situacionDescripcion,
          enviaReporte: formData.enviaReporte,
          retroalimentacion: formData.retroalimentacion
        })
      };

      const response = await crearFolio(folioData);
      
      addToast({ 
        type: 'success', 
        message: `Folio creado exitosamente: ${response.folio.folio1}-${response.folio.folio2} (Acumulado: ${response.folio.acumulado})` 
      });
      
      setShowFormModal(false);
      
      // Recargar datos según el tipo
      if (formData.tipo === 'revision') {
        fetchRevisiones();
      } else {
        fetchDetecciones();
      }
      
    } catch (err) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Error al crear folio';
      addToast({ type: 'error', message });
    } finally {
      setFormLoading(false);
    }
  }, [addToast, fetchRevisiones, fetchDetecciones]);

  const handleDeleteAll = useCallback(async () => {
    const confirmed = window.confirm(
      '¿Estás seguro de eliminar todos los registros? Esta acción no se puede deshacer.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingAll(true);
      await api.post('/upload/delete-all');
      addToast({ type: 'success', message: 'Todos los registros fueron eliminados correctamente.' });
      setSelectedRows([]);
      fetchRevisiones(page, filterType);
      fetchDetecciones(page, filterType);
    } catch (err) {
      const message =
        err?.response?.data?.message ??
        err?.response?.data ??
        err?.message ??
        'Error al eliminar todos los registros.';

      addToast({
        type: 'error',
        message: typeof message === 'string' ? message : 'Error al eliminar todos los registros.',
      });
    } finally {
      setDeletingAll(false);
    }
  }, [fetchRevisiones, fetchDetecciones, page, filterType, addToast]);

  const handleToggleSelectAll = useCallback(() => {
    if (formattedData.length === 0) {
      return;
    }

    if (selectedRows.length === formattedData.length) {
      setSelectedRows([]);
    } else {
      const allIds = formattedData.map((item) => item.rowId).filter(Boolean);
      setSelectedRows(allIds);
    }
  }, [formattedData, selectedRows]);

  const handleToggleRow = useCallback((item) => {
    if (!item?.rowId) {
      return;
    }

    setSelectedRows((prev) => {
      if (prev.includes(item.rowId)) {
        return prev.filter((id) => id !== item.rowId);
      }

      return [...prev, item.rowId];
    });
  }, []);

  const isRowSelected = useCallback(
    (item) => {
      if (!item?.rowId) {
        return false;
      }

      return selectedRows.includes(item.rowId);
    },
    [selectedRows]
  );

  const selectedCount = selectedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const allRowsSelected = formattedData.length > 0 && selectedRows.length === formattedData.length;
  const hasData = totalRecords > 0 || formattedData.length > 0;

  useEffect(() => {
    // Cargar datos según el tipo de filtro
    if (filterType === 'revision') {
      fetchRevisiones();
    } else if (filterType === 'deteccion') {
      fetchDetecciones();
    }
  }, [fetchRevisiones, fetchDetecciones, page, filterType]);

  useEffect(() => {
    fetchFilterOptions(filterType);
  }, [fetchFilterOptions, filterType]);

  const handlePageChange = (newPage) => {
    const clampedPage = Math.max(1, Math.min(newPage, totalPages));
    if (clampedPage === page) {
      return;
    }
    setPage(clampedPage);
  };

  return (
    <div className="dashboard-wrapper min-vh-100">
      <MainNavbar
        displayName={displayName || currentUser?.username || ''}
        role={currentUser?.role}
        isAdmin={currentUser?.role === 'Administrador'}
        onManageUsers={currentUser?.role === 'Administrador' ? openUserManagementModal : undefined}
        onLogout={logout}
      />

      <main className="container py-5">
        <div className="card border-0 shadow-lg">
          <div className="card-body p-4 p-md-5">
            <div className="revisiones-header">
              <div className="revisiones-header__info">
                <h1 className="display-6 mb-2">Revisiones entregadas</h1>
                <p className="text-muted mb-0">
                  Carga, filtra y administra la información de revisiones entregadas.
                </p>
              </div>

              <div className="revisiones-header__controls">
                <div className="revisiones-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm me-2"
                    onClick={handleOpenFormModal}
                  >
                    Crear nuevo folio
                  </button>
                                    <button
                    type="button"
                    className="btn btn-outline-primary btn-sm me-2"
                    onClick={() => {
                      if (filterType === 'revision') {
                        fetchRevisiones();
                      } else if (filterType === 'deteccion') {
                        fetchDetecciones();
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Actualizando…' : 'Actualizar datos'}
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm me-2"
                        onClick={handleDeleteSelected}
                        disabled={selectedCount === 0}
                      >
                        {selectedCount > 0 ? `Eliminar selección (${selectedCount})` : 'Eliminar selección'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm me-2"
                        onClick={handleDeleteAll}
                        disabled={!hasData || deletingAll}
                      >
                        {deletingAll ? 'Eliminando todo…' : 'Eliminar todo'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>



            {error && (
              <div className="alert alert-danger mt-3" role="alert">
                {error}
              </div>
            )}

            <div className="filters-panel d-flex flex-column gap-3 mt-4">
              <div className="filters-panel__inputs d-flex flex-column flex-md-row align-items-stretch gap-2">
                <select
                  className="form-select filters-panel__control"
                  value={filterType}
                  onChange={(event) => {
                    const value = event.target.value;
                    setFilterType(value);
                    setPage(1);
                    if (value === 'revision') {
                      fetchRevisiones();
                    } else if (value === 'deteccion') {
                      fetchDetecciones();
                    }
                    fetchFilterOptions(value);
                  }}
                >
                  <option value="all">Todos</option>
                  <option value="revision">Revisiones</option>
                  <option value="deteccion">Detecciones</option>
                </select>
                <select
                  className="form-select filters-panel__control"
                  value={filterAlmacen}
                  onChange={(event) => setFilterAlmacen(event.target.value)}
                  disabled={filterOptionsLoading}
                >
                  <option value="">Todos los almacenes</option>
                  {filterOptions.almacenes.map((option) => (
                    <option key={`almacen-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select filters-panel__control"
                  value={filterMonitorista}
                  onChange={(event) => setFilterMonitorista(event.target.value)}
                  disabled={filterOptionsLoading}
                >
                  <option value="">Todos los monitoristas</option>
                  {filterOptions.monitoristas.map((option) => (
                    <option key={`monitorista-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select filters-panel__control"
                  value={filterCoordinador}
                  onChange={(event) => setFilterCoordinador(event.target.value)}
                  disabled={filterOptionsLoading}
                >
                  <option value="">Todos los coordinadores</option>
                  {filterOptions.coordinadores.map((option) => (
                    <option key={`coordinador-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  className="form-control filters-panel__control filters-panel__control--date"
                  placeholder="Filtrar por fecha de envío"
                  value={filterFechaEnvio}
                  onChange={(event) => setFilterFechaEnvio(normalizeDateFilterValue(event.target.value))}
                />
                {filterOptionsError && (
                  <span className="text-danger small">{filterOptionsError}</span>
                )}
              </div>

              {loading ? (
                <div className="d-flex justify-content-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              ) : formattedData.length === 0 ? (
                <div className="text-center py-5">
                  <h3 className="h5">No hay registros disponibles.</h3>
                  <p className="text-muted mb-0">Crea nuevos folios usando el formulario manual.</p>
                </div>
              ) : (
                <div className="data-table-wrapper revisiones-table-wrapper mt-3">
                  <table className="table align-middle data-table revisiones-table">
                    <thead>
                      <tr>
                        {isAdmin && (
                          <th
                            scope="col"
                            className="text-center revisiones-table__header revisiones-table__header--checkbox"
                            style={{ width: '3rem' }}
                          >
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={allRowsSelected}
                              onChange={handleToggleSelectAll}
                              aria-label="Seleccionar todos los registros visibles"
                            />
                          </th>
                        )}
                        <th scope="col" className="revisiones-table__header revisiones-table__header--index">
                          #
                        </th>
                        {tableHeaders.map(({ key, label }) => (
                          <th
                            scope="col"
                            key={key}
                            className="text-capitalize revisiones-table__header"
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {formattedData.map((item) => {
                        const rowSelected = isRowSelected(item);
                        return (
                          <tr
                            key={`${item.uploadType || 'unknown'}-${item.rowId}`}
                            className={`revisiones-table__row${rowSelected ? ' is-selected' : ''}`}
                          >
                            {isAdmin && (
                              <td className="text-center revisiones-table__checkbox">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={rowSelected}
                                  onChange={() => handleToggleRow(item)}
                                  aria-label={`Seleccionar registro ${item.rowIndex ?? item.rowId}`}
                                />
                              </td>
                            )}
                            <th scope="row" className="revisiones-table__index">
                              <span className="revisiones-table__index-badge">
                                {item.rowIndex ?? item.rowId}
                              </span>
                            </th>
                            {tableHeaders.map((header) => (
                              <td
                                key={`${item.rowId}-${header.key}`}
                                data-label={header.label}
                                className="revisiones-table__cell"
                              >
                                <span className="revisiones-table__cell-content">
                                  {getValueForHeader(item, header)}
                                </span>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pagination-panel d-flex flex-column flex-lg-row align-items-center justify-content-between gap-3 mt-4">
                <div className="pagination-summary text-muted">
                  Registros totales: <strong>{totalRecords}</strong>
                  {isAdmin && selectedCount > 0 && (
                    <span className="ms-2 text-danger">
                      · Seleccionados: <strong>{selectedCount}</strong>
                    </span>
                  )}
                </div>
                <nav className="pagination-controls" aria-label="Paginación de resultados">
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                    aria-label="Primera página"
                  >
                    «
                  </button>
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    aria-label="Página anterior"
                  >
                    ‹
                  </button>
                  <div className="pagination-indicator" aria-live="polite">
                    <span className="pagination-indicator__label">Página</span>
                    <span className="pagination-indicator__value">{page}</span>
                    <span className="pagination-indicator__separator">de</span>
                    <span className="pagination-indicator__value">{totalPages}</span>
                  </div>
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    aria-label="Página siguiente"
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page === totalPages}
                    aria-label="Última página"
                  >
                    »
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <RevisionFormModal
        isOpen={showFormModal}
        onClose={handleCloseFormModal}
        onSubmit={handleCreateFolio}
        loading={formLoading}
      />
    </div>
  );
};

export default RevisionesEntregadas;
