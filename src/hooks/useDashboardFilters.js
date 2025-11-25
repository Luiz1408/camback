import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { normalizeDateFilterValue } from '../utils/date';

const EMPTY_OPTIONS = {
  almacenes: [],
  monitoristas: [],
  coordinadores: [],
};

const useDashboardFilters = () => {
  const [filterType, setFilterType] = useState('all');
  const [filterAlmacen, setFilterAlmacen] = useState('');
  const [filterMonitorista, setFilterMonitorista] = useState('');
  const [filterCoordinador, setFilterCoordinador] = useState('');
  const [filterFechaEnvio, setFilterFechaEnvio] = useState('');

  const [filterOptions, setFilterOptions] = useState(EMPTY_OPTIONS);
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);
  const [filterOptionsError, setFilterOptionsError] = useState('');

  const fetchFilterOptions = useCallback(
    async (typeOverride) => {
      setFilterOptionsLoading(true);
      setFilterOptionsError('');

      try {
        const params = {};
        const effectiveType = typeOverride ?? filterType;
        if (effectiveType !== 'all') {
          params.tipo = effectiveType;
        }

        const response = await api.get('/upload/filter-options', { params });
        const { almacenes = [], monitoristas = [], coordinadores = [] } = response.data || {};

        const normalizedAlmacenes = Array.isArray(almacenes) ? almacenes : [];
        const normalizedMonitoristas = Array.isArray(monitoristas) ? monitoristas : [];
        const normalizedCoordinadores = Array.isArray(coordinadores) ? coordinadores : [];

        setFilterOptions({
          almacenes: normalizedAlmacenes,
          monitoristas: normalizedMonitoristas,
          coordinadores: normalizedCoordinadores,
        });

        setFilterAlmacen((prev) => (prev && !normalizedAlmacenes.includes(prev) ? '' : prev));
        setFilterMonitorista((prev) => (prev && !normalizedMonitoristas.includes(prev) ? '' : prev));
        setFilterCoordinador((prev) => (prev && !normalizedCoordinadores.includes(prev) ? '' : prev));
      } catch (err) {
        const message =
          err?.response?.data?.message ??
          err?.response?.data ??
          err?.message ??
          'Error al cargar las opciones de filtros.';

        setFilterOptionsError(typeof message === 'string' ? message : 'Error al cargar las opciones de filtros.');
        setFilterOptions(EMPTY_OPTIONS);
      } finally {
        setFilterOptionsLoading(false);
      }
    },
    [filterType]
  );

  useEffect(() => {
    setFilterFechaEnvio((prev) => {
      const normalized = normalizeDateFilterValue(prev);
      return normalized === prev ? prev : normalized;
    });
  }, []);

  return {
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
  };
};

export default useDashboardFilters;
