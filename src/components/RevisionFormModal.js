/* eslint-disable */
import React, { useState, useEffect } from 'react';
import api, { getUsersByRole, getSiguienteFolio, getAlmacenUbicacionFolios } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getCatalogoByTipo } from '../services/catalogos';
import AutocompleteDropdown from './AutocompleteDropdown';

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
    // Catálogos específicos para Revisiones
    observacionesRev: [],
    seDetectoIncidenciaRev: [],
    areaCargoRev: [],
    areaSolicitaRev: [],
    comentarioGeneralRev: [],
    // Catálogos específicos para Detecciones (mantener compatibilidad)
    folioAsignado1Det: [],
    ubicacionSucursalDet: [],
    puestoColaboradorDet: [],
    lineaEmpresaDet: [],
    areaEspecificaDet: [],
    turnoOperativoDet: [],
    coordinadoresTurnoDet: [],
    // Nuevos catálogos específicos para Detecciones
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
    // Campos comunes
    fechaEnvio: '',
    ubicacion: '',
    almacen: '',
    hora: '',
    indicador: '',
    subindicador: '',
    folioAsignado1: '',
    folioAsignado2: '',
    acumulado: '',
    // Colaborador involucrado
    colaboradorInvolucrado: '',
    puestoColaborador: '',
    no: '',
    nomina: '',
    lineaEmpresa: '',
    ubicacionSucursal: '',
    areaEspecifica: '',
    turnoOperativo: '',
    situacion: '',
    monitorista: '',
    enviaReporte: '',
    coordinadorTurno: '',
    // Campo para detecciones
    sucursal: '',
    
    // Campos específicos de revisión
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
    
    // Campos específicos de detección
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
      
      // Cargar catálogos cuando se abre el modal
      cargarCatalogos();
    }
  }, [isOpen]);

  // Efecto para autocompletar folio1 y ubicación cuando cambia el almacén
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.almacen, almacenesUbicacionFolios]);

  const cargarCatalogos = async () => {
    setLoadingCatalogos(true);
    try {
      const catalogTypes = [
        // Catálogos generales (compartidos)
        'Almacen',
        'Indicador',
        'Subindicador',
        'Area',
        'Puesto',
        'Sucursal',
        'Codigo',
        'Ubicacion',
        // Catálogos específicos para Revisiones
        'REV_OBSERVACIONES',
        'REV_SE_DETECTO_INCIDENCIA',
        'REV_AREA_CARGO',
        'REV_AREA_SOLICITA',
        'REV_COMENTARIO_GENERAL',
        // Catálogos específicos para Detecciones (mantener compatibilidad)
        'DET_FOLIO_ASIGNADO1',
        'DET_UBICACION_SUCURSAL',
        'DET_PUESTO_COLABORADOR',
        'DET_LINEA_EMPRESA',
        'DET_AREA_ESPECIFICA',
        'DET_TURNO_OPERATIVO',
        'DET_COORDINADOR_TURNO',
        // Nuevos catálogos específicos para Detecciones
        'DET_GENERA_IMPACTO'
      ];

      const catalogosPromises = catalogTypes.map(async (tipo) => {
        try {
          const response = await getCatalogoByTipo(tipo);
          // El servicio devuelve los datos directamente, no en response.data
          return { tipo, data: Array.isArray(response) ? response : [] };
        } catch (error) {
          console.error(`Error cargando catálogo ${tipo}:`, error);
          return { tipo, data: [] };
        }
      });

      const resultados = await Promise.all(catalogosPromises);

      // Cargar usuarios (coordinadores y monitoristas)
      try {
        const [monitoristasResponse, coordinadoresResponse] = await Promise.all([
          getUsersByRole('monitorista'),
          getUsersByRole('coordinador')
        ]);
        
        console.log('monitoristasResponse:', monitoristasResponse);
        console.log('coordinadoresResponse:', coordinadoresResponse);
        
        const monitoristasData = Array.isArray(monitoristasResponse) ? monitoristasResponse : monitoristasResponse.data || [];
        const coordinadoresData = Array.isArray(coordinadoresResponse) ? coordinadoresResponse : coordinadoresResponse.data || [];
        
        console.log('coordinadoresData antes de asignar:', coordinadoresData);
        console.log('typeof coordinadoresData:', typeof coordinadoresData);
        
        const nuevosCatalogos = {
          // Catálogos generales (compartidos)
          almacenes: resultados.find(r => r.tipo === 'Almacen')?.data || [],
          indicadores: resultados.find(r => r.tipo === 'Indicador')?.data || [],
          subindicadores: resultados.find(r => r.tipo === 'Subindicador')?.data || [],
          areas: resultados.find(r => r.tipo === 'Area')?.data || [],
          puestos: resultados.find(r => r.tipo === 'Puesto')?.data || [],
          sucursales: resultados.find(r => r.tipo === 'Sucursal')?.data || [],
          codigos: resultados.find(r => r.tipo === 'Codigo')?.data || [],
          ubicaciones: resultados.find(r => r.tipo === 'Ubicacion')?.data || [],
          // Catálogos específicos para Revisiones
          observacionesRev: resultados.find(r => r.tipo === 'REV_OBSERVACIONES')?.data || [],
          seDetectoIncidenciaRev: resultados.find(r => r.tipo === 'REV_SE_DETECTO_INCIDENCIA')?.data || [],
          areaCargoRev: resultados.find(r => r.tipo === 'REV_AREA_CARGO')?.data || [],
          areaSolicitaRev: resultados.find(r => r.tipo === 'REV_AREA_SOLICITA')?.data || [],
          comentarioGeneralRev: resultados.find(r => r.tipo === 'REV_COMENTARIO_GENERAL')?.data || [],
          // Catálogos específicos para Detecciones (mantener compatibilidad)
          folioAsignado1Det: resultados.find(r => r.tipo === 'DET_FOLIO_ASIGNADO1')?.data || [],
          ubicacionSucursalDet: resultados.find(r => r.tipo === 'DET_UBICACION_SUCURSAL')?.data || [],
          puestoColaboradorDet: resultados.find(r => r.tipo === 'DET_PUESTO_COLABORADOR')?.data || [],
          lineaEmpresaDet: resultados.find(r => r.tipo === 'DET_LINEA_EMPRESA')?.data || [],
          areaEspecificaDet: resultados.find(r => r.tipo === 'DET_AREA_ESPECIFICA')?.data || [],
          turnoOperativoDet: resultados.find(r => r.tipo === 'DET_TURNO_OPERATIVO')?.data || [],
          coordinadoresTurnoDet: resultados.find(r => r.tipo === 'DET_COORDINADOR_TURNO')?.data || [],
          // Nuevos catálogos específicos para Detecciones
          generaImpacto: resultados.find(r => r.tipo === 'DET_GENERA_IMPACTO')?.data || []
        };

        console.log('nuevosCatalogos completo:', nuevosCatalogos);
        console.log('Monitoristas cargados:', monitoristasData);
        console.log('Coordinadores cargados:', coordinadoresData);
        console.log('nuevosCatalogos.coordinators:', nuevosCatalogos.coordinators);
        
        // Actualizar catálogos generales y específicos
        setCatalogos(prev => ({
          ...prev,
          // Catálogos generales (compartidos)
          almacenes: nuevosCatalogos.almacenes,
          indicadores: nuevosCatalogos.indicadores,
          subindicadores: nuevosCatalogos.subindicadores,
          areas: nuevosCatalogos.areas,
          puestos: nuevosCatalogos.puestos,
          sucursales: nuevosCatalogos.sucursales,
          codigos: nuevosCatalogos.codigos,
          ubicaciones: nuevosCatalogos.ubicaciones,
          // Catálogos específicos para Revisiones
          observacionesRev: nuevosCatalogos.observacionesRev,
          seDetectoIncidenciaRev: nuevosCatalogos.seDetectoIncidenciaRev,
          areaCargoRev: nuevosCatalogos.areaCargoRev,
          areaSolicitaRev: nuevosCatalogos.areaSolicitaRev,
          comentarioGeneralRev: nuevosCatalogos.comentarioGeneralRev,
          // Catálogos específicos para Detecciones (mantener compatibilidad)
          folioAsignado1Det: nuevosCatalogos.folioAsignado1Det,
          ubicacionSucursalDet: nuevosCatalogos.ubicacionSucursalDet,
          puestoColaboradorDet: nuevosCatalogos.puestoColaboradorDet,
          lineaEmpresaDet: nuevosCatalogos.lineaEmpresaDet,
          areaEspecificaDet: nuevosCatalogos.areaEspecificaDet,
          turnoOperativoDet: nuevosCatalogos.turnoOperativoDet,
          coordinadoresTurnoDet: nuevosCatalogos.coordinadoresTurnoDet,
          // Nuevos catálogos específicos para Detecciones
          generaImpacto: nuevosCatalogos.generaImpacto
        }));
        
        // Actualizar usuarios en sus estados separados
        setMonitoristas(monitoristasData);
        setCoordinators(coordinadoresData);
        
        // Cargar catálogo integrado de almacenes
        try {
          const almacenesData = await getAlmacenUbicacionFolios();
          setAlmacenesUbicacionFolios(almacenesData);
          console.log('Almacenes-Ubicación-Folios cargados:', almacenesData);
        } catch (error) {
          console.error('Error cargando catálogo integrado de almacenes:', error);
        }
        
        // Cargar folio inicial según el tipo
        cargarSiguienteFolio();
      } catch (error) {
        console.error('Error cargando usuarios:', error);
      }
    } catch (error) {
      console.error('Error general cargando catálogos:', error);
    } finally {
      setLoadingCatalogos(false);
    }
  };

  const cargarSiguienteFolio = async () => {
    try {
      const folioData = await getSiguienteFolio(formData.tipo);
      // No establecer folio1 ya que viene del catálogo integrado
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
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Si cambia el almacén, actualizar folio1 y ubicación automáticamente
    if (name === 'almacen' && value) {
      console.log('🔍 Buscando almacén:', value);
      console.log('📦 Datos disponibles:', almacenesUbicacionFolios);
      
      const almacenSeleccionado = almacenesUbicacionFolios.find(a => a.almacen === value);
      console.log('✅ Almacén encontrado:', almacenSeleccionado);
      
      if (almacenSeleccionado) {
        console.log('🔄 Actualizando folio1 y ubicación:', {
          folioAsignado1: almacenSeleccionado.folioAsignado1,
          ubicacion: almacenSeleccionado.ubicacion
        });
        
        setFormData(prev => ({
          ...prev,
          folioAsignado1: almacenSeleccionado.folioAsignado1,
          ubicacion: almacenSeleccionado.ubicacion
        }));
      } else {
        console.log('❌ No se encontró el almacén seleccionado');
      }
    }

    // Si cambia el tipo, recargar los folios
    if (name === 'tipo') {
      cargarSiguienteFolio();
    }

    // Limpiar error del campo si existe
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Campos comunes requeridos
    if (!formData.fechaEnvio) newErrors.fechaEnvio = 'La fecha de envío es requerida';
    if (!formData.ubicacion) newErrors.ubicacion = 'La ubicación es requerida';
    if (!formData.almacen) newErrors.almacen = 'El almacén es requerido';
    if (!formData.hora) newErrors.hora = 'La hora es requerida';
    if (!formData.indicador) newErrors.indicador = 'El indicador es requerido';
    if (!formData.subindicador) newErrors.subindicador = 'El subindicador es requerido';

    // Validaciones específicas según el tipo
    if (formData.tipo === 'revision') {
      if (!formData.fechaSolicitud) newErrors.fechaSolicitud = 'La fecha de solicitud es requerida';
      if (!formData.fechaIncidente) newErrors.fechaIncidente = 'La fecha del incidente es requerida';
      if (!formData.monto) newErrors.monto = 'El monto es requerido';
    } else if (formData.tipo === 'deteccion') {
      if (!formData.generaImpacto) newErrors.generaImpacto = 'Debe indicar si genera impacto';
      if (!formData.codigoIndicador) newErrors.codigoIndicador = 'El código de indicador es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      if (onSubmit) {
        onSubmit(formData);
      }
    }
  };

  // Funciones para administrar catálogos
  const handleCatalogoChange = (e) => {
    const { name, value } = e.target;
    setNuevoCatalogo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para renderizar campos de revisión
  const renderCamposRevision = () => (
    <>
      <div className="row g-3 mb-4">
      <div className="col-md-3">
        <label className="form-label fw-semibold text-secondary">Fecha Envío *</label>
        <input
          type="date"
          className={`form-control form-control-sm ${errors.fechaEnvio ? 'is-invalid' : ''}`}
          name="fechaEnvio"
          value={formData.fechaEnvio}
          onChange={handleInputChange}
        />
        {errors.fechaEnvio && <div className="invalid-feedback">{errors.fechaEnvio}</div>}
      </div>
      
      <div className="col-md-3">
        <label className="form-label fw-semibold text-secondary">Almacén *</label>
        <select
          className={`form-select form-select-sm ${errors.almacen ? 'is-invalid' : ''}`}
          name="almacen"
          value={formData.almacen}
          onChange={handleInputChange}
          disabled={loadingCatalogos}
        >
          <option value="">Seleccionar...</option>
          {almacenesUbicacionFolios.map((item) => (
            <option key={item.id} value={item.almacen}>
              {item.almacen}
            </option>
          ))}
        </select>
        {errors.almacen && <div className="invalid-feedback">{errors.almacen}</div>}
      </div>
      
      <div className="col-md-3">
        <label className="form-label fw-semibold text-secondary">Ubicación *</label>
        <input
          type="text"
          className={`form-control form-control-sm ${errors.ubicacion ? 'is-invalid' : ''}`}
          name="ubicacion"
          value={formData.ubicacion}
          onChange={handleInputChange}
          disabled={loadingCatalogos}
          placeholder="Se autocompleta al seleccionar almacén"
          readOnly
        />
        {errors.ubicacion && <div className="invalid-feedback">{errors.ubicacion}</div>}
      </div>
      
      <div className="col-md-3">
        <label className="form-label fw-semibold text-secondary">Fecha de Solicitud *</label>
        <input
          type="date"
          className={`form-control form-control-sm ${errors.fechaSolicitud ? 'is-invalid' : ''}`}
          name="fechaSolicitud"
          value={formData.fechaSolicitud}
          onChange={handleInputChange}
        />
        {errors.fechaSolicitud && <div className="invalid-feedback">{errors.fechaSolicitud}</div>}
      </div>
      
      <div className="col-md-3">
        <label className="form-label fw-semibold text-secondary">Fecha del Incidente *</label>
        <input
          type="date"
          className={`form-control form-control-sm ${errors.fechaIncidente ? 'is-invalid' : ''}`}
          name="fechaIncidente"
          value={formData.fechaIncidente}
          onChange={handleInputChange}
        />
        {errors.fechaIncidente && <div className="invalid-feedback">{errors.fechaIncidente}</div>}
      </div>
      
      <div className="col-md-3">
        <label className="form-label fw-semibold text-secondary">Hora *</label>
        <input
          type="time"
          step="1"
          className={`form-control form-control-sm ${errors.hora ? 'is-invalid' : ''}`}
          name="hora"
          value={formData.hora}
          onChange={handleInputChange}
        />
        {errors.hora && <div className="invalid-feedback">{errors.hora}</div>}
      </div>
      
      <div className="col-md-3">
        <label className="form-label fw-semibold text-secondary">Monto *</label>
        <input
          type="number"
          className={`form-control form-control-sm ${errors.monto ? 'is-invalid' : ''}`}
          name="monto"
          value={formData.monto}
          onChange={handleInputChange}
          step="0.01"
          placeholder="0.00"
        />
        {errors.monto && <div className="invalid-feedback">{errors.monto}</div>}
      </div>
      
      <div className="col-md-3">
        <label className="form-label fw-semibold text-secondary">Observaciones</label>
        <select
          className="form-select form-select-sm"
          name="observaciones"
          value={formData.observaciones}
          onChange={handleInputChange}
          disabled={loadingCatalogos}
        >
          <option value="">Seleccionar...</option>
          {catalogos.observacionesRev.map((item) => (
            <option key={item.id} value={item.valor}>
              {item.valor}
            </option>
          ))}
        </select>
      </div>
      
      <div className="col-md-3">
        <label className="form-label fw-semibold text-secondary">Indicador *</label>
        <select
          className={`form-select form-select-sm ${errors.indicador ? 'is-invalid' : ''}`}
          name="indicador"
          value={formData.indicador}
          onChange={handleInputChange}
          disabled={loadingCatalogos}
        >
          <option value="">Seleccionar...</option>
          {catalogos.indicadores.map((item) => (
            <option key={item.id} value={item.valor}>
              {item.valor}
            </option>
          ))}
        </select>
        {errors.indicador && <div className="invalid-feedback">{errors.indicador}</div>}
      </div>
      
      <div className="col-md-3">
        <label className="form-label fw-semibold text-secondary">Subindicador *</label>
        <select
          className={`form-select form-select-sm ${errors.subindicador ? 'is-invalid' : ''}`}
          name="subindicador"
          value={formData.subindicador}
          onChange={handleInputChange}
          disabled={loadingCatalogos}
        >
          <option value="">Seleccionar...</option>
          {catalogos.subindicadores.map((item) => (
            <option key={item.id} value={item.valor}>
              {item.valor}
            </option>
          ))}
        </select>
        {errors.subindicador && <div className="invalid-feedback">{errors.subindicador}</div>}
      </div>
      
      <div className="col-md-3">
        <label className="form-label fw-semibold text-secondary">Código</label>
        <input
          type="text"
          className="form-control form-control-sm"
          name="codigo"
          value={formData.codigo}
          onChange={handleInputChange}
          placeholder="Código de referencia"
        />
      </div>
      
      <div className="col-md-3">
        <label className="form-label fw-semibold text-secondary">Se detectó la Incidencia Reportada</label>
        <select
          className="form-select form-select-sm"
          name="seDetectoIncidencia"
          value={formData.seDetectoIncidencia}
          onChange={handleInputChange}
          disabled={loadingCatalogos}
        >
          <option value="">Seleccionar...</option>
          {catalogos.seDetectoIncidenciaRev.map((item) => (
            <option key={item.id} value={item.valor}>
              {item.valor}
            </option>
          ))}
        </select>
      </div>
      
      <div className="col-md-3">
        <label className="form-label fw-semibold text-secondary">Comentario General</label>
        <textarea
          className="form-control form-control-sm"
          name="comentarioGeneral"
          value={formData.comentarioGeneral}
          onChange={handleInputChange}
          rows="2"
          placeholder="Ingrese comentarios adicionales"
        />
      </div>
      
      <div className="col-md-3">
        <label className="form-label fw-semibold text-secondary">Área a la que se debe el cargo</label>
          <select
            className="form-select form-select-sm"
            name="areaCargo"
            value={formData.areaCargo}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
          >
            <option value="">Seleccionar...</option>
            {catalogos.areaCargoRev.map((item) => (
              <option key={item.id} value={item.valor}>
                {item.valor}
              </option>
            ))}
          </select>
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Tiempo</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="tiempo"
            value={formData.tiempo}
            onChange={handleInputChange}
            placeholder="Tiempo estimado"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Ticket</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="ticket"
            value={formData.ticket}
            onChange={handleInputChange}
            placeholder="Número de ticket"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Folio Asignado 1</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="folioAsignado1"
            value={formData.folioAsignado1}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
            placeholder="Se autocompleta al seleccionar almacén"
            readOnly
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Folio Asignado 2</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="folioAsignado2"
            value={formData.folioAsignado2}
            onChange={handleInputChange}
            placeholder="Segundo folio"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Acumulado</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="acumulado"
            value={formData.acumulado}
            onChange={handleInputChange}
            placeholder="Monto acumulado"
          />
        </div>
        
        <div className="col-md-12">
          <label className="form-label fw-semibold text-secondary">Personal Involucrado</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="colaboradorInvolucrado"
            value={formData.colaboradorInvolucrado}
            onChange={handleInputChange}
            placeholder="Nombre del personal"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Puesto</label>
          <select
            className="form-select form-select-sm"
            name="puesto"
            value={formData.puesto}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
          >
            <option value="">Seleccionar...</option>
            {catalogos.puestos.map((item) => (
              <option key={item.id} value={item.valor}>
                {item.valor}
              </option>
            ))}
          </select>
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">No. Nómina</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="nomina"
            value={formData.nomina}
            onChange={handleInputChange}
            placeholder="Ingrese número de nómina"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Línea/Empresa Placas</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="lineaEmpresaPlacas"
            value={formData.lineaEmpresaPlacas}
            onChange={handleInputChange}
            placeholder="Línea/Empresa/Placas"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Placas</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="placas"
            value={formData.placas || ''}
            onChange={handleInputChange}
            placeholder="Número de placas"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Área Específica</label>
          <AutocompleteDropdown
            value={formData.areaEspecifica}
            onChange={(value) => handleInputChange({ target: { name: 'areaEspecifica', value } })}
            options={catalogos.areas}
            disabled={loadingCatalogos}
            placeholder="Seleccionar área específica..."
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Turno Operativo</label>
          <select
            className="form-select form-select-sm"
            name="turnoOperativo"
            value={formData.turnoOperativo}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
          >
            <option value="">Seleccionar...</option>
            {catalogos.turnoOperativoDet.map((item) => (
              <option key={item.id} value={item.valor}>
                {item.valor}
              </option>
            ))}
          </select>
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Supervisor/Jefe de Turno</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="supervisorJefeTurno"
            value={formData.supervisorJefeTurno}
            onChange={handleInputChange}
            placeholder="Nombre del supervisor"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Situación</label>
          <textarea
            className="form-control form-control-sm"
            name="situacion"
            value={formData.situacion}
            onChange={handleInputChange}
            rows="2"
            placeholder="Describa la situación"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Área que solicita</label>
          <select
            className="form-select form-select-sm"
            name="areaSolicita"
            value={formData.areaSolicita}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
          >
            <option value="">Seleccionar...</option>
            {catalogos.areaSolicitaRev.map((item) => (
              <option key={item.id} value={item.valor}>
                {item.valor}
              </option>
            ))}
          </select>
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Nombre de quien solicita</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="quienEnvia"
            value={formData.quienEnvia}
            onChange={handleInputChange}
            placeholder="Nombre del solicitante"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Monitorista</label>
          <select
            className="form-select form-select-sm"
            name="monitorista"
            value={formData.monitorista}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
          >
            <option value="">Seleccionar...</option>
            {monitoristas?.map((item) => (
              <option key={item.id} value={item.valor || item.fullName || `${item.firstName} ${item.lastName}`}>
                {item.valor || item.fullName || `${item.firstName} ${item.lastName}`}
              </option>
            )) || []}
          </select>
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Envía reporte</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="enviaReporte"
            value={formData.enviaReporte}
            onChange={handleInputChange}
            placeholder="Quien envía el reporte"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Coordinador en turno</label>
          <select
            className="form-select form-select-sm"
            name="coordinadorTurno"
            value={formData.coordinadorTurno}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
          >
            <option value="">Seleccionar...</option>
            {coordinators?.map((item) => (
              <option key={item.id} value={item.valor || item.fullName || `${item.firstName} ${item.lastName}`}>
                {item.valor || item.fullName || `${item.firstName} ${item.lastName}`}
              </option>
            )) || []}
          </select>
        </div>
      </div>
    </>
  );

  // Función para renderizar campos de detección
  const renderCamposDeteccion = () => (
    <>
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Fecha Envío *</label>
          <input
            type="date"
            className={`form-control form-control-sm ${errors.fechaEnvio ? 'is-invalid' : ''}`}
            name="fechaEnvio"
            value={formData.fechaEnvio}
            onChange={handleInputChange}
          />
          {errors.fechaEnvio && <div className="invalid-feedback">{errors.fechaEnvio}</div>}
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Ubicación *</label>
          <input
            type="text"
            className={`form-control form-control-sm ${errors.ubicacion ? 'is-invalid' : ''}`}
            name="ubicacion"
            value={formData.ubicacion}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
            placeholder="Se autocompleta al seleccionar almacén"
            readOnly
          />
          {errors.ubicacion && <div className="invalid-feedback">{errors.ubicacion}</div>}
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Almacén *</label>
          <select
            className={`form-select form-select-sm ${errors.almacen ? 'is-invalid' : ''}`}
            name="almacen"
            value={formData.almacen}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
          >
            <option value="">Seleccionar...</option>
            {almacenesUbicacionFolios.map((item) => (
              <option key={item.id} value={item.almacen}>
                {item.almacen}
              </option>
            ))}
          </select>
          {errors.almacen && <div className="invalid-feedback">{errors.almacen}</div>}
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Hora *</label>
          <input
            type="time"
          step="1"
            className={`form-control form-control-sm ${errors.hora ? 'is-invalid' : ''}`}
            name="hora"
            value={formData.hora}
            onChange={handleInputChange}
          />
          {errors.hora && <div className="invalid-feedback">{errors.hora}</div>}
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Indicador *</label>
          <select
            className={`form-select form-select-sm ${errors.indicador ? 'is-invalid' : ''}`}
            name="indicador"
            value={formData.indicador}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
          >
            <option value="">Seleccionar...</option>
            {catalogos.indicadores.map((item) => (
              <option key={item.id} value={item.valor}>
                {item.valor}
              </option>
            ))}
          </select>
          {errors.indicador && <div className="invalid-feedback">{errors.indicador}</div>}
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Subindicador *</label>
          <select
            className={`form-select form-select-sm ${errors.subindicador ? 'is-invalid' : ''}`}
            name="subindicador"
            value={formData.subindicador}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
          >
            <option value="">Seleccionar...</option>
            {catalogos.subindicadores.map((item) => (
              <option key={item.id} value={item.valor}>
                {item.valor}
              </option>
            ))}
          </select>
          {errors.subindicador && <div className="invalid-feedback">{errors.subindicador}</div>}
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">¿Genera Impacto? *</label>
          <select
            className={`form-select form-select-sm ${errors.generaImpacto ? 'is-invalid' : ''}`}
            name="generaImpacto"
            value={formData.generaImpacto}
            onChange={handleInputChange}
          >
            <option value="">Seleccionar...</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
          </select>
          {errors.generaImpacto && <div className="invalid-feedback">{errors.generaImpacto}</div>}
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Código de Indicador *</label>
          <input
            type="text"
            className={`form-control form-control-sm ${errors.codigoIndicador ? 'is-invalid' : ''}`}
            name="codigoIndicador"
            value={formData.codigoIndicador}
            onChange={handleInputChange}
            placeholder="Código del indicador"
          />
          {errors.codigoIndicador && <div className="invalid-feedback">{errors.codigoIndicador}</div>}
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Folio Asignado 1</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="folioAsignado1"
            value={formData.folioAsignado1}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
            placeholder="Se autocompleta al seleccionar almacén"
            readOnly
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Folio Asignado 2</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="folioAsignado2"
            value={formData.folioAsignado2}
            onChange={handleInputChange}
            placeholder="Segundo folio"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Acumulado</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="acumulado"
            value={formData.acumulado}
            onChange={handleInputChange}
            placeholder="Monto acumulado"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Colaborador Involucrado</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="colaboradorInvolucrado"
            value={formData.colaboradorInvolucrado}
            onChange={handleInputChange}
            placeholder="Nombre del colaborador"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Puesto</label>
          <select
            className="form-select form-select-sm"
            name="puestoColaborador"
            value={formData.puestoColaborador}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
          >
            <option value="">Seleccionar...</option>
            {catalogos.puestos.map((item) => (
              <option key={item.id} value={item.valor}>
                {item.valor}
              </option>
            ))}
          </select>
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">No. Nómina</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="nomina"
            value={formData.nomina}
            onChange={handleInputChange}
            placeholder="Ingrese número de nómina"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Línea/Empresa</label>
          <select
            className="form-select form-select-sm"
            name="lineaEmpresa"
            value={formData.lineaEmpresa}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
          >
            <option value="">Seleccionar...</option>
            {catalogos.lineaEmpresaDet.map((item) => (
              <option key={item.id} value={item.valor}>
                {item.valor}
              </option>
            ))}
          </select>
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Área Específica</label>
          <AutocompleteDropdown
            value={formData.areaEspecifica}
            onChange={(value) => handleInputChange({ target: { name: 'areaEspecifica', value } })}
            options={catalogos.areas}
            disabled={loadingCatalogos}
            placeholder="Seleccionar área específica..."
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Ubicación en Sucursal</label>
          <select
            className="form-select form-select-sm"
            name="ubicacionSucursal"
            value={formData.ubicacionSucursal}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
          >
            <option value="">Seleccionar...</option>
            {catalogos.ubicacionSucursalDet.map((item) => (
              <option key={item.id} value={item.valor}>
                {item.valor}
              </option>
            ))}
          </select>
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Turno Operativo</label>
          <select
            className="form-select form-select-sm"
            name="turnoOperativo"
            value={formData.turnoOperativo}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
          >
            <option value="">Seleccionar...</option>
            {catalogos.turnoOperativoDet.map((item) => (
              <option key={item.id} value={item.valor}>
                {item.valor}
              </option>
            ))}
          </select>
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Supervisor/Jefe de Turno</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="supervisorJefeTurno"
            value={formData.supervisorJefeTurno}
            onChange={handleInputChange}
            placeholder="Nombre del supervisor"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Situación/Descripción</label>
          <textarea
            className="form-control form-control-sm"
            name="situacion"
            value={formData.situacion}
            onChange={handleInputChange}
            rows="2"
            placeholder="Describa la situación"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Monitorista</label>
          <select
            className="form-select form-select-sm"
            name="monitorista"
            value={formData.monitorista}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
          >
            <option value="">Seleccionar...</option>
            {monitoristas?.map((item) => (
              <option key={item.id} value={item.valor || item.fullName || `${item.firstName} ${item.lastName}`}>
                {item.valor || item.fullName || `${item.firstName} ${item.lastName}`}
              </option>
            )) || []}
          </select>
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Envía Reporte</label>
          <input
            type="text"
            className="form-control form-control-sm"
            name="enviaReporte"
            value={formData.enviaReporte}
            onChange={handleInputChange}
            placeholder="Quien envía el reporte"
          />
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Coordinador en Turno</label>
          <select
            className="form-select form-select-sm"
            name="coordinadorTurno"
            value={formData.coordinadorTurno}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
          >
            <option value="">Seleccionar...</option>
            {coordinators?.map((item) => (
              <option key={item.id} value={item.valor || item.fullName || `${item.firstName} ${item.lastName}`}>
                {item.valor || item.fullName || `${item.firstName} ${item.lastName}`}
              </option>
            )) || []}
          </select>
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Retroalimentación</label>
          <textarea
            className="form-control form-control-sm"
            name="retroalimentacion"
            value={formData.retroalimentacion}
            onChange={handleInputChange}
            rows="2"
            placeholder="Ingrese retroalimentación"
          />
        </div>
      </div>
    </>
  );

  // Solo renderizar el modal si isOpen es true
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="password-modal-backdrop">
        <div className="password-modal" style={{ width: 'min(900px, 100%)' }}>
          <div className="card-header border-0">
            <h5 className="mb-0">Crear Nuevo Folio</h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              disabled={loading}
              aria-label="Cerrar"
            />
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="card-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Selector de tipo */}
              <div className="mb-4">
                <label className="form-label fw-bold">Tipo de Folio</label>
                <div className="btn-group w-100" role="group">
                  <input
                    type="radio"
                    className="btn-check"
                    name="tipo"
                    id="tipo-revision"
                    value="revision"
                    checked={formData.tipo === 'revision'}
                    onChange={handleInputChange}
                  />
                  <label className="btn btn-outline-primary" htmlFor="tipo-revision">
                    Revisión
                  </label>
                  
                  <input
                    type="radio"
                    className="btn-check"
                    name="tipo"
                    id="tipo-deteccion"
                    value="deteccion"
                    checked={formData.tipo === 'deteccion'}
                    onChange={handleInputChange}
                  />
                  <label className="btn btn-outline-primary" htmlFor="tipo-deteccion">
                    Detección
                  </label>
                </div>
              </div>
              
              {/* Sección de administración de catálogos */}
              {mostrarAdminCatalogos && (
                <div className="card mb-4 border-info">
                  <div className="card-header bg-info text-white">
                    <h6 className="mb-0">
                      <i className="fas fa-cog me-2"></i>
                      Administrar Áreas Específicas
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row g-3 mb-3">
                      <div className="col-md-8">
                        <label className="form-label fw-semibold">Nueva Área Específica</label>
                        <AutocompleteDropdown
                          value={nuevoCatalogo.valor}
                          onChange={(value) => setNuevoCatalogo(prev => ({ ...prev, valor: value }))}
                          options={catalogos.areas}
                          disabled={loading}
                          placeholder="Seleccionar área específica..."
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
                            <i className="fas fa-save me-1"></i>
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
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Lista de áreas existentes */}
                    <div className="mt-4">
                      <h6 className="fw-semibold text-secondary mb-3">
                        <i className="fas fa-list me-2"></i>
                        Áreas Específicas Registradas
                      </h6>
                      {loadingAreas ? (
                        <div className="text-center py-3">
                          <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                            <span className="visually-hidden">Cargando...</span>
                          </div>
                          Cargando áreas...
                        </div>
                      ) : areasEspecificasGuardadas.length === 0 ? (
                        <div className="text-center py-3 text-muted">
                          <i className="fas fa-inbox fa-2x mb-2"></i>
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
                                  <td>
                                    <span className="badge bg-light text-dark">
                                      {area.valor}
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-primary me-1"
                                      onClick={() => handleEditAreaEspecifica(area)}
                                      title="Editar área"
                                    >
                                      <i className="fas fa-edit"></i>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => handleDeleteAreaEspecifica(area.id)}
                                      title="Eliminar área"
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
                    
                    <div className="mt-3">
                      <small className="text-muted">
                        <i className="fas fa-info-circle me-1"></i>
                        Las áreas específicas se guardan automáticamente cuando se usan en el formulario. 
                        Aquí puedes ver, editar o eliminar las áreas registradas.
                      </small>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Campos específicos según el tipo */}
              {formData.tipo === 'revision' ? renderCamposRevision() : renderCamposDeteccion()}
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default RevisionFormModal;
