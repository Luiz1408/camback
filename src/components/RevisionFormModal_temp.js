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
            {catalogos.almacenes.map((item) => (
              <option key={item.id} value={item.valor}>
                {item.valor}
              </option>
            ))}
          </select>
          {errors.almacen && <div className="invalid-feedback">{errors.almacen}</div>}
        </div>
        
        <div className="col-md-3">
          <label className="form-label fw-semibold text-secondary">Ubicación *</label>
          <select
            className={`form-select form-select-sm ${errors.ubicacion ? 'is-invalid' : ''}`}
            name="ubicacion"
            value={formData.ubicacion}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
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
          <select
            className="form-select form-select-sm"
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
          <select
            className="form-select form-select-sm"
            name="areaEspecifica"
            value={formData.areaEspecifica}
            onChange={handleInputChange}
            disabled={loadingCatalogos}
          >
            <option value="">Seleccionar...</option>
            {catalogos.areas.map((item) => (
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
            {catalogos.monitoristas.map((item) => (
              <option key={item.id} value={item.valor}>
                {item.valor}
              </option>
            ))}
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
            {catalogos.monitoristas.map((item) => (
              <option key={item.id} value={item.valor}>
                {item.valor}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
