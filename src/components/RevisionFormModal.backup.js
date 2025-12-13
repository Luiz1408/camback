import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { getCatalogoByTipo } from '../services/catalogos';

const RevisionFormModal = ({ isOpen, onClose, onSubmit, loading }) => {
  // Estado para catálogos dinámicos
  const [catalogos, setCatalogos] = useState({
    almacenes: [],
    indicadores: [],
    subindicadores: [],
    areas: [],
    puestos: [],
    monitoristas: [],
    sucursales: [],
    codigos: [],
    ubicaciones: [],
    // Catálogos para Revisiones (REV_)
    observacionesRev: [],
    seDetectoIncidenciaRev: [],
    areaCargoRev: [],
    folioAsignado1Rev: [],
    areaSolicitaRev: [],
    comentarioGeneralRev: [],
    // Catálogos para Detecciones (DET_)
    folioAsignado1Det: [],
    ubicacionSucursalDet: [],
    puestoColaboradorDet: [],
    lineaEmpresaDet: [],
    areaEspecificaDet: [],
    turnoOperativoDet: [],
    coordinadoresTurnoDet: []
  });

  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

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
    observaciones: '',
    codigo: '',
    seDetectoIncidencia: '',
    comentarioGeneral: '',
    areaCargo: '',
    tiempo: '',
    ticket: '',
    puesto: '',
    lineaEmpresaPlacas: '',
    ubicacion2: '',
    areaSolicita: '',
    quienEnvia: '',
    
    // Campos específicos de detección
    generaImpacto: '',
    codigoIndicador: '',
    supervisorJefeTurno: '',
    retroalimentacion: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      setFormData(prev => ({
        ...prev,
        tipo: 'revision',
        fechaEnvio: prev.fechaEnvio || todayStr,
      }));
      setErrors({});
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validaciones comunes
    if (!formData.fechaEnvio) newErrors.fechaEnvio = 'Requerido';
    if (!formData.ubicacion) newErrors.ubicacion = 'Requerido';
    if (!formData.almacen) newErrors.almacen = 'Requerido';
    if (!formData.hora) newErrors.hora = 'Requerido';
    if (!formData.indicador) newErrors.indicador = 'Requerido';
    if (!formData.subindicador) newErrors.subindicador = 'Requerido';
    
    if (formData.tipo === 'revision') {
      // Validaciones específicas de revisión
      if (!formData.mes) newErrors.mes = 'Requerido';
      if (!formData.fechaSolicitud) newErrors.fechaSolicitud = 'Requerido';
      if (!formData.fechaIncidente) newErrors.fechaIncidente = 'Requerido';
      if (!formData.monto) newErrors.monto = 'Requerido';
    } else {
      // Validaciones específicas de detección
      if (!formData.sucursal) newErrors.sucursal = 'Requerido';
      if (!formData.codigo) newErrors.codigo = 'Requerido';
      if (!formData.generaImpacto) newErrors.generaImpacto = 'Requerido';
      if (!formData.codigoIndicador) newErrors.codigoIndicador = 'Requerido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Cargar catálogos dinámicamente
  useEffect(() => {
    const cargarCatalogos = async () => {
      if (!isOpen) return;
      
      setLoadingCatalogos(true);
      try {
        const [
          almacenesRes,
          indicadoresRes,
          subindicadoresRes,
          areasRes,
          puestosRes,
          monitoristasRes,
          sucursalesRes,
          codigosRes,
          ubicacionesRes,
          // Catálogos para Revisiones (REV_)
          observacionesRevRes,
          seDetectoIncidenciaRevRes,
          areaCargoRevRes,
          folioAsignado1RevRes,
          areaSolicitaRevRes,
          comentarioGeneralRevRes,
          // Catálogos para Detecciones (DET_)
          folioAsignado1DetRes,
          ubicacionSucursalDetRes,
          puestoColaboradorDetRes,
          lineaEmpresaDetRes,
          areaEspecificaDetRes,
          turnoOperativoDetRes,
          coordinadoresTurnoDetRes
        ] = await Promise.all([
          getCatalogoByTipo('Almacen'),
          getCatalogoByTipo('Indicador'),
          getCatalogoByTipo('Subindicador'),
          getCatalogoByTipo('Area'),
          getCatalogoByTipo('Puesto'),
          getCatalogoByTipo('Monitorista'),
          getCatalogoByTipo('Sucursal'),
          getCatalogoByTipo('Codigo'),
          getCatalogoByTipo('Ubicacion'),
          // Catálogos para Revisiones (REV_)
          getCatalogoByTipo('REV_OBSERVACIONES'),
          getCatalogoByTipo('REV_SE_DETECTO_INCIDENCIA'),
          getCatalogoByTipo('REV_AREA_CARGO'),
          getCatalogoByTipo('REV_FOLIO_ASIGNADO1'),
          getCatalogoByTipo('REV_AREA_SOLICITA'),
          getCatalogoByTipo('REV_COMENTARIO_GENERAL'),
          // Catálogos para Detecciones (DET_)
          getCatalogoByTipo('DET_FOLIO_ASIGNADO1'),
          getCatalogoByTipo('DET_UBICACION_SUCURSAL'),
          getCatalogoByTipo('DET_PUESTO_COLABORADOR'),
          getCatalogoByTipo('DET_LINEA_EMPRESA'),
          getCatalogoByTipo('DET_AREA_ESPECIFICA'),
          getCatalogoByTipo('DET_TURNO_OPERATIVO'),
          getCatalogoByTipo('DET_COORDINADOR_TURNO')
        ]);

        setCatalogos({
          almacenes: almacenesRes,
          indicadores: indicadoresRes,
          subindicadores: subindicadoresRes,
          areas: areasRes,
          puestos: puestosRes,
          monitoristas: monitoristasRes,
          sucursales: sucursalesRes,
          codigos: codigosRes,
          ubicaciones: ubicacionesRes,
          // Catálogos para Revisiones (REV_)
          observacionesRev: observacionesRevRes,
          seDetectoIncidenciaRev: seDetectoIncidenciaRevRes,
          areaCargoRev: areaCargoRevRes,
          folioAsignado1Rev: folioAsignado1RevRes,
          areaSolicitaRev: areaSolicitaRevRes,
          comentarioGeneralRev: comentarioGeneralRevRes,
          // Catálogos para Detecciones (DET_)
          folioAsignado1Det: folioAsignado1DetRes,
          ubicacionSucursalDet: ubicacionSucursalDetRes,
          puestoColaboradorDet: puestoColaboradorDetRes,
          lineaEmpresaDet: lineaEmpresaDetRes,
          areaEspecificaDet: areaEspecificaDetRes,
          turnoOperativoDet: turnoOperativoDetRes,
          coordinadoresTurnoDet: coordinadoresTurnoDetRes
        });
      } catch (error) {
        console.error('Error al cargar catálogos:', error);
      } finally {
        setLoadingCatalogos(false);
      }
    };

    cargarCatalogos();
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  if (!isOpen) return null;

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

              {/* Campos comunes */}
              <div className="row mb-3">
                <div className="col-md-3">
                  <label className="form-label">Fecha Envio *</label>
                  <input
                    type="date"
                    className={`form-control ${errors.fechaEnvio ? 'is-invalid' : ''}`}
                    name="fechaEnvio"
                    value={formData.fechaEnvio}
                    onChange={handleInputChange}
                    required
                  />
                  {errors.fechaEnvio && <div className="invalid-feedback">{errors.fechaEnvio}</div>}
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">{formData.tipo === 'revision' ? 'Área Específica *' : 'Ubicación *'}</label>
                  <select
                    className={`form-select ${errors.ubicacion ? 'is-invalid' : ''}`}
                    name="ubicacion"
                    value={formData.ubicacion}
                    onChange={handleInputChange}
                    disabled={loadingCatalogos}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {catalogos.ubicaciones.map((item) => (
                      <option key={item.id} value={item.valor}>
                        {item.valor}
                      </option>
                    ))}
                  </select>
                  {errors.ubicacion && <div className="invalid-feedback">{errors.ubicacion}</div>}
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">Almacén *</label>
                  <select
                    className={`form-select ${errors.almacen ? 'is-invalid' : ''}`}
                    name="almacen"
                    value={formData.almacen}
                    onChange={handleInputChange}
                    disabled={loadingCatalogos}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {catalogos.almacenes.map((almacen) => (
                      <option key={almacen.id} value={almacen.valor}>
                        {almacen.valor}
                      </option>
                    ))}
                  </select>
                  {errors.almacen && <div className="invalid-feedback">{errors.almacen}</div>}
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">Hora *</label>
                  <input
                    type="time"
                    className={`form-control ${errors.hora ? 'is-invalid' : ''}`}
                    name="hora"
                    value={formData.hora}
                    onChange={handleInputChange}
                    required
                  />
                  {errors.hora && <div className="invalid-feedback">{errors.hora}</div>}
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-3">
                  <label className="form-label">Indicador *</label>
                  <select
                    className={`form-select ${errors.indicador ? 'is-invalid' : ''}`}
                    name="indicador"
                    value={formData.indicador}
                    onChange={handleInputChange}
                    disabled={loadingCatalogos}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {catalogos.indicadores.map((indicador) => (
                      <option key={indicador.id} value={indicador.valor}>
                        {indicador.valor}
                      </option>
                    ))}
                  </select>
                  {errors.indicador && <div className="invalid-feedback">{errors.indicador}</div>}
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">Subindicador *</label>
                  <select
                    className={`form-select ${errors.subindicador ? 'is-invalid' : ''}`}
                    name="subindicador"
                    value={formData.subindicador}
                    onChange={handleInputChange}
                    disabled={loadingCatalogos}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {catalogos.subindicadores.map((subindicador) => (
                      <option key={subindicador.id} value={subindicador.valor}>
                        {subindicador.valor}
                      </option>
                    ))}
                  </select>
                  {errors.subindicador && <div className="invalid-feedback">{errors.subindicador}</div>}
                </div>
                
                {formData.tipo === 'revision' && (
                  <div className="col-md-3">
                    <label className="form-label">Folio Asignado 1</label>
                    <select
                      className="form-control"
                      name="folioAsignado1"
                      value={formData.folioAsignado1}
                      onChange={handleInputChange}
                      disabled={loadingCatalogos}
                    >
                      <option value="">Seleccionar...</option>
                      {catalogos.folioAsignado1Rev.map((item) => (
                        <option key={item.id} value={item.valor}>
                          {item.valor}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="col-md-3">
                  <label className="form-label">Folio Asignado 2</label>
                  <input
                    type="text"
                    className="form-control"
                    name="folioAsignado2"
                    value={formData.folioAsignado2}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Campos del formulario unificado */}
              <div className="form-fields">
                <div className="row mb-3">
                  {/* Almacén - Común a ambos tipos */}
                  <div className="col-md-3">
                    <label className="form-label">Almacén *</label>
                    <select
                      className={`form-control ${errors.almacen ? 'is-invalid' : ''}`}
                      name="almacen"
                      value={formData.almacen}
                      onChange={handleInputChange}
                      disabled={loadingCatalogos}
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {catalogos.almacenes.map((item) => (
                        <option key={item.id} value={item.valor}>
                          {item.valor}
                        </option>
                      ))}
                    </select>
                    {errors.almacen && <div className="invalid-feedback">{errors.almacen}</div>}
                  </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Ubicación / Área específica *</label>
                      <select
                        className={`form-control ${errors.ubicacion ? 'is-invalid' : ''}`}
                        name="ubicacion"
                        value={formData.ubicacion}
                        onChange={handleInputChange}
                        disabled={loadingCatalogos}
                        required
                      >
                        <option value="">Seleccionar...</option>
                        {catalogos.ubicaciones.map((item) => (
                          <option key={item.id} value={item.valor}>
                            {item.valor}
                          </option>
                        ))}
                      </select>
                      {errors.ubicacion && <div className="invalid-feedback">{errors.ubicacion}</div>}
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Fecha Solicitud *</label>
                      <input
                        type="date"
                        className={`form-control ${errors.fechaSolicitud ? 'is-invalid' : ''}`}
                        name="fechaSolicitud"
                        value={formData.fechaSolicitud}
                        onChange={handleInputChange}
                        required
                      />
                      {errors.fechaSolicitud && <div className="invalid-feedback">{errors.fechaSolicitud}</div>}
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Fecha del incidente *</label>
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
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">Hora *</label>
                      <input
                        type="time"
                        className={`form-control ${errors.hora ? 'is-invalid' : ''}`}
                        name="hora"
                        value={formData.hora}
                        onChange={handleInputChange}
                        required
                      />
                      {errors.hora && <div className="invalid-feedback">{errors.hora}</div>}
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Monto *</label>
                      <input
                        type="number"
                        step="0.01"
                        className={`form-control ${errors.monto ? 'is-invalid' : ''}`}
                        name="monto"
                        value={formData.monto}
                        onChange={handleInputChange}
                        required
                      />
                      {errors.monto && <div className="invalid-feedback">{errors.monto}</div>}
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Observaciones</label>
                      <select
                        className="form-control"
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
                      <label className="form-label">Indicador *</label>
                      <select
                        className={`form-control ${errors.indicador ? 'is-invalid' : ''}`}
                        name="indicador"
                        value={formData.indicador}
                        onChange={handleInputChange}
                        disabled={loadingCatalogos}
                        required
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
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">Subindicador *</label>
                      <select
                        className={`form-control ${errors.subindicador ? 'is-invalid' : ''}`}
                        name="subindicador"
                        value={formData.subindicador}
                        onChange={handleInputChange}
                        disabled={loadingCatalogos}
                        required
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
                      <label className="form-label">Código</label>
                      <input
                        type="text"
                        className="form-control"
                        name="codigo"
                        value={formData.codigo}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Se detectó la incidencia reportada</label>
                      <select
                        className="form-control"
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
                      <label className="form-label">Comentario General</label>
                      <select
                        className="form-control"
                        name="comentarioGeneral"
                        value={formData.comentarioGeneral}
                        onChange={handleInputChange}
                        disabled={loadingCatalogos}
                      >
                        <option value="">Seleccionar...</option>
                        {catalogos.comentarioGeneralRev.map((item) => (
                          <option key={item.id} value={item.valor}>
                            {item.valor}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">Área a la que se debe el cargo</label>
                      <select
                        className="form-control"
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
                      <label className="form-label">Tiempo</label>
                      <input
                        type="text"
                        className="form-control"
                        name="tiempo"
                        value={formData.tiempo}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Ticket</label>
                      <input
                        type="text"
                        className="form-control"
                        name="ticket"
                        value={formData.ticket}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Folio Asignado 1</label>
                      <select
                        className="form-control"
                        name="folioAsignado1"
                        value={formData.folioAsignado1}
                        onChange={handleInputChange}
                        disabled={loadingCatalogos}
                      >
                        <option value="">Seleccionar...</option>
                        {catalogos.folioAsignado1Rev.map((item) => (
                          <option key={item.id} value={item.valor}>
                            {item.valor}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">Folio Asignado 2</label>
                      <input
                        type="text"
                        className="form-control"
                        name="folioAsignado2"
                        value={formData.folioAsignado2}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Acumulado</label>
                      <input
                        type="text"
                        className="form-control"
                        name="acumulado"
                        value={formData.acumulado}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Personal involucrado</label>
                      <input
                        type="text"
                        className="form-control"
                        name="personalInvolucrado"
                        value={formData.personalInvolucrado}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Puesto</label>
                      <input
                        type="text"
                        className="form-control"
                        name="puesto"
                        value={formData.puesto}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">No. Nómina</label>
                      <input
                        type="text"
                        className="form-control"
                        name="noNomina"
                        value={formData.noNomina}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Línea/Empresa</label>
                      <select
                        className="form-control"
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
                      <label className="form-label">Placas</label>
                      <input
                        type="text"
                        className="form-control"
                        name="placas"
                        value={formData.placas}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Área Específica</label>
                      <select
                        className="form-control"
                        name="areaEspecifica"
                        value={formData.areaEspecifica}
                        onChange={handleInputChange}
                        disabled={loadingCatalogos}
                      >
                        <option value="">Seleccionar...</option>
                        {catalogos.areaEspecificaDet.map((item) => (
                          <option key={item.id} value={item.valor}>
                            {item.valor}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">Turno operativo</label>
                      <select
                        className="form-control"
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
                      <label className="form-label">Supervisor / Jefe de turno</label>
                      <input
                        type="text"
                        className="form-control"
                        name="supervisorJefeTurno"
                        value={formData.supervisorJefeTurno}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Situación</label>
                      <input
                        type="text"
                        className="form-control"
                        name="situacion"
                        value={formData.situacion}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Área que solicita</label>
                      <select
                        className="form-control"
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
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">Nombre de quien solicita</label>
                      <input
                        type="text"
                        className="form-control"
                        name="nombreSolicitante"
                        value={formData.nombreSolicitante}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Monitorista</label>
                      <select
                        className="form-control"
                        name="monitorista"
                        value={formData.monitorista}
                        onChange={handleInputChange}
                        disabled={loadingCatalogos}
                      >
                        <option value="">Seleccionar...</option>
                        {catalogos.monitoristas.map((item) => (
                          <option key={item.id} value={item.valor}>
                            {item.valor}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Envía reporte</label>
                      <input
                        type="text"
                        className="form-control"
                        name="enviaReporte"
                        value={formData.enviaReporte}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Coordinador en turno</label>
                      <input
                        type="text"
                        className="form-control"
                        name="coordinadorTurno"
                        value={formData.coordinadorTurno}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  {/* Ubicación - Común a ambos tipos */}
                  <div className="col-md-3">
                    <label className="form-label">
                      {formData.tipo === 'revision' ? 'Ubicación / Área específica *' : 'Ubicación *'}
                    </label>
                    <select
                      className={`form-control ${errors.ubicacion ? 'is-invalid' : ''}`}
                      name="ubicacion"
                      value={formData.ubicacion}
                      onChange={handleInputChange}
                      disabled={loadingCatalogos}
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {catalogos.ubicaciones.map((item) => (
                        <option key={item.id} value={item.valor}>
                          {item.valor}
                        </option>
                      ))}
                    </select>
                    {errors.ubicacion && <div className="invalid-feedback">{errors.ubicacion}</div>}
                  </div>
                    
                    <div className="col-md-4">
                      <label className="form-label">Almacén *</label>
                      <select
                        className={`form-select ${errors.almacen ? 'is-invalid' : ''}`}
                        name="almacen"
                        value={formData.almacen}
                        onChange={handleInputChange}
                        disabled={loadingCatalogos}
                        required
                      >
                        <option value="">Seleccionar...</option>
                        {catalogos.almacenes.map((item) => (
                          <option key={item.id} value={item.valor}>
                            {item.valor}
                          </option>
                        ))}
                      </select>
                      {errors.almacen && <div className="invalid-feedback">{errors.almacen}</div>}
                    </div>
                    
                    <div className="col-md-4">
                      <label className="form-label">Hora *</label>
                      <input
                        type="time"
                        className={`form-control ${errors.hora ? 'is-invalid' : ''}`}
                        name="hora"
                        value={formData.hora}
                        onChange={handleInputChange}
                        required
                      />
                      {errors.hora && <div className="invalid-feedback">{errors.hora}</div>}
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">Indicador *</label>
                      <select
                        className={`form-select ${errors.indicador ? 'is-invalid' : ''}`}
                        name="indicador"
                        value={formData.indicador}
                        onChange={handleInputChange}
                        disabled={loadingCatalogos}
                        required
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
                      <label className="form-label">Subindicador *</label>
                      <select
                        className={`form-select ${errors.subindicador ? 'is-invalid' : ''}`}
                        name="subindicador"
                        value={formData.subindicador}
                        onChange={handleInputChange}
                        disabled={loadingCatalogos}
                        required
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
                      <label className="form-label">¿Genera Impacto? *</label>
                      <select
                        className={`form-control ${errors.generaImpacto ? 'is-invalid' : ''}`}
                        name="generaImpacto"
                        value={formData.generaImpacto}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Sí">Sí</option>
                        <option value="No">No</option>
                      </select>
                      {errors.generaImpacto && <div className="invalid-feedback">{errors.generaImpacto}</div>}
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Código de Indicador *</label>
                      <input
                        type="text"
                        className={`form-control ${errors.codigoIndicador ? 'is-invalid' : ''}`}
                        name="codigoIndicador"
                        value={formData.codigoIndicador}
                        onChange={handleInputChange}
                        required
                      />
                      {errors.codigoIndicador && <div className="invalid-feedback">{errors.codigoIndicador}</div>}
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">Folio Asignado 1</label>
                      <select
                        className="form-control"
                        name="folioAsignado1"
                        value={formData.folioAsignado1}
                        onChange={handleInputChange}
                        disabled={loadingCatalogos}
                      >
                        <option value="">Seleccionar...</option>
                        {catalogos.folioAsignado1Det.map((item) => (
                          <option key={item.id} value={item.valor}>
                            {item.valor}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Folio Asignado 2</label>
                      <input
                        type="text"
                        className="form-control"
                        name="folioAsignado2"
                        value={formData.folioAsignado2}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Acumulado</label>
                      <input
                        type="text"
                        className="form-control"
                        name="acumulado"
                        value={formData.acumulado}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Colaborador Involucrado</label>
                      <input
                        type="text"
                        className="form-control"
                        name="colaboradorInvolucrado"
                        value={formData.colaboradorInvolucrado}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">Puesto Colaborador</label>
                      <select
                        className="form-control"
                        name="puestoColaborador"
                        value={formData.puestoColaborador}
                        onChange={handleInputChange}
                        disabled={loadingCatalogos}
                      >
                        <option value="">Seleccionar...</option>
                        {catalogos.puestoColaboradorDet.map((item) => (
                          <option key={item.id} value={item.valor}>
                            {item.valor}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">No.</label>
                      <input
                        type="text"
                        className="form-control"
                        name="no"
                        value={formData.no}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Nómina</label>
                      <input
                        type="text"
                        className="form-control"
                        name="nomina"
                        value={formData.nomina}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Línea/Empresa</label>
                      <select
                        className="form-control"
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
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-3">
                      <label className="form-label">Ubicación en Sucursal</label>
                      <select
                        className="form-control"
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
                      <label className="form-label">Área Específica</label>
                      <select
                        className="form-control"
                        name="areaEspecifica"
                        value={formData.areaEspecifica}
                        onChange={handleInputChange}
                        disabled={loadingCatalogos}
                      >
                        <option value="">Seleccionar...</option>
                        {catalogos.areaEspecificaDet.map((item) => (
                          <option key={item.id} value={item.valor}>
                            {item.valor}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-md-3">
                      <label className="form-label">Turno Operativo</label>
                      <select
                        className="form-control"
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
                      <label className="form-label">Supervisor/Jefe de Turno</label>
                      <input
                        type="text"
                        className="form-control"
                        name="supervisorJefeTurno"
                        value={formData.supervisorJefeTurno}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label">Situación/Descripción</label>
                      <input
                        type="text"
                        className="form-control"
                        name="situacion"
                        value={formData.situacion}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-4">
                      <label className="form-label">Monitorista</label>
                      <select
                        className="form-control"
                        name="monitorista"
                        value={formData.monitorista}
                        onChange={handleInputChange}
                        disabled={loadingCatalogos}
                      >
                        <option value="">Seleccionar...</option>
                        {catalogos.monitoristas.map((item) => (
                          <option key={item.id} value={item.valor}>
                            {item.valor}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-md-4">
                      <label className="form-label">Envía Reporte</label>
                      <input
                        type="text"
                        className="form-control"
                        name="enviaReporte"
                        value={formData.enviaReporte}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Coordinador en Turno</label>
                      <input
                        type="text"
                        className="form-control"
                        name="coordinadorTurno"
                        value={formData.coordinadorTurno}
                        onChange={handleInputChange}
                      />
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">Retroalimentación</label>
                      <textarea
                        className="form-control"
                        name="retroalimentacion"
                        value={formData.retroalimentacion}
                        onChange={handleInputChange}
                        rows="2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Campos comunes adicionales (solo para detecciones) */}
              {formData.tipo === 'deteccion' && (
                <div className="row mb-3">
                  <div className="col-md-3">
                    <label className="form-label">Colaborador Involucrado</label>
                    <input
                      type="text"
                      className="form-control"
                      name="colaboradorInvolucrado"
                      value={formData.colaboradorInvolucrado}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="col-md-3">
                    <label className="form-label">Puesto Colaborador</label>
                    <select
                      className="form-control"
                      name="puestoColaborador"
                      value={formData.puestoColaborador}
                      onChange={handleInputChange}
                      disabled={loadingCatalogos}
                    >
                      <option value="">Seleccionar...</option>
                      {catalogos.puestoColaboradorDet.map((item) => (
                        <option key={item.id} value={item.valor}>
                          {item.valor}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-md-3">
                    <label className="form-label">No. Nómina</label>
                    <input
                      type="text"
                      className="form-control"
                      name="nomina"
                      value={formData.nomina}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              )}

              <div className="row mb-3">
                <div className="col-md-3">
                  <label className="form-label">Línea/Empresa</label>
                  <select
                    className="form-control"
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
                  <label className="form-label">Ubicación en Sucursal</label>
                  <select
                    className="form-control"
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
                  <label className="form-label">Área Específica</label>
                  <select
                    className="form-control"
                    name="areaEspecifica"
                    value={formData.areaEspecifica}
                    onChange={handleInputChange}
                    disabled={loadingCatalogos}
                  >
                    <option value="">Seleccionar...</option>
                    {catalogos.areaEspecificaDet.map((item) => (
                      <option key={item.id} value={item.valor}>
                        {item.valor}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">Turno Operativo</label>
                  <select
                    className="form-control"
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
              </div>

              <div className="row mb-3">
                <div className="col-md-3">
                  <label className="form-label">Monitorista</label>
                  <select
                    className="form-control"
                    name="monitorista"
                    value={formData.monitorista}
                    onChange={handleInputChange}
                    disabled={loadingCatalogos}
                  >
                    <option value="">Seleccionar...</option>
                    {catalogos.monitoristas.map((item) => (
                      <option key={item.id} value={item.valor}>
                        {item.valor}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">Envía Reporte</label>
                  <input
                    type="text"
                    className="form-control"
                    name="enviaReporte"
                    value={formData.enviaReporte}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">Coordinador en Turno</label>
                  <input
                    type="text"
                    className="form-control"
                    name="coordinadorTurno"
                    value={formData.coordinadorTurno}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="col-md-3">
                  <label className="form-label">Acumulado</label>
                  <input
                    type="text"
                    className="form-control"
                    name="acumulado"
                    value={formData.acumulado}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
            
            <div className="card-footer border-0 bg-transparent">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Guardando...
                  </>
                ) : (
                  'Guardar Folio'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default RevisionFormModal;
