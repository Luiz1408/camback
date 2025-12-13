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
          <select
            className="form-select form-select-sm"
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
          <label className="form-label fw-semibold text-secondary">Puesto Colaborador</label>
          <select
            className="form-select form-select-sm"
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
          <label className="form-label fw-semibold text-secondary">Área Específica</label>
          <select
            className="form-select form-select-sm"
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
            {catalogos.monitoristas.map((item) => (
              <option key={item.id} value={item.valor}>
                {item.valor}
              </option>
            ))}
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
            {catalogos.coordinadoresTurnoDet.map((item) => (
              <option key={item.id} value={item.valor}>
                {item.valor}
              </option>
            ))}
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
