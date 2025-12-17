import React, { useState, useEffect, useMemo } from 'react';
import MainNavbar from '../components/Layout/MainNavbar';
import NuevaRevisionModal from '../components/NuevaRevisionModal';
import { getUsersByRole, getRevisiones, createRevision, updateRevision, deleteRevision } from '../services/api';
import { useUserManagement } from '../contexts/UserManagementContext';
import { formatUserName } from '../utils/formatUserName';
import './CapturaRevisiones.css';
import '../styles/responsive.css';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

const STATUS_CONFIG = [
  { key: 'cancelada', label: 'Cancelada', color: '#ef476f', background: 'rgba(239, 71, 111, 0.25)' },
  { key: 'pendiente', label: 'Pendiente', color: '#f7b731', background: 'rgba(247, 183, 49, 0.3)' },
  { key: 'enviada', label: 'Enviada', color: '#1abc9c', background: 'rgba(26, 188, 156, 0.3)' },
  { key: 'en_proceso', label: 'En proceso', color: '#9b5de5', background: 'rgba(155, 93, 229, 0.3)' },
  { key: 'no_realizada', label: 'No realizada', color: '#6c757d', background: 'rgba(108, 117, 125, 0.25)' },
];

const MESES_ORDEN = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const CapturaRevisiones = () => {
  const { openModal: openUserManagementModal } = useUserManagement();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revisiones, setRevisiones] = useState([]);
  const [monitoristas, setMonitoristas] = useState([]);
  const [activeTab, setActiveTab] = useState('tabla');

  const [monitoristaSeleccionadoIds, setMonitoristaSeleccionadoIds] = useState({});

  const [filtroColor, setFiltroColor] = useState('');
  const [filtroAlmacen, setFiltroAlmacen] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroQuienRealiza, setFiltroQuienRealiza] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [mesSeleccionadoTopAlmacenes, setMesSeleccionadoTopAlmacenes] = useState('');
  const [modalFeedback, setModalFeedback] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        return parsedUser;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    return {
      displayName: 'Usuario Demo',
      role: 'Administrador',
      isAdmin: true
    };
  });

  // Determinar si es administrador basado en el rol
  const isAdmin = user?.role === 'Administrador' || user?.role === 'admin';

  const handleLogout = () => {
    console.log('Cerrando sesión...');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleManageUsers = () => {
    // Abrir modal de gestión de usuarios
    openUserManagementModal();
  };

  const displayName = formatUserName(user);

  // Funciones para el modal de feedback
  const showFeedback = (title, message, type = 'success', options = {}) => {
    setModalFeedback({
      visible: true,
      title,
      message,
      type,
      showCancel: options.showCancel || false,
      onConfirm: options.onConfirm || null,
      confirmLabel: options.confirmLabel || 'Aceptar'
    });
  };

  const closeFeedback = () => {
    setModalFeedback({ ...modalFeedback, visible: false });
  };

  // Efecto para manejar teclas Enter y ESC
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (modalFeedback.visible) {
          closeFeedback();
        }
        if (showModal) {
          handleCloseModal();
        }
      } else if (event.key === 'Enter' && modalFeedback.visible && !modalFeedback.showCancel) {
        if (modalFeedback.onConfirm) {
          modalFeedback.onConfirm();
        }
        closeFeedback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalFeedback.visible, modalFeedback.onConfirm, modalFeedback.showCancel, showModal]);

  useEffect(() => {
    cargarDatos();
  }, []); // Solo al montar el componente

  useEffect(() => {
    // Recargar datos si los monitoristas cambian (para mantener sincronización)
    if (monitoristas.length === 0) {
      cargarDatos();
    }
  }, [monitoristas.length]);

  useEffect(() => {
    const actualizarEstatusNoRealizada = async () => {
      const revisionesVencidas = revisiones.filter((revision) => {
        if (!revision?.fechaIncidente) return false;
        const dias = calcularDiasEspera(revision.fechaIncidente);
        return dias > 30 && revision.estatus === 'pendiente';
      });

      if (revisionesVencidas.length === 0) {
        return;
      }

      try {
        await Promise.all(
          revisionesVencidas.map((revision) =>
            updateRevision(revision.id, { estatus: 'no_realizada' })
          )
        );

        setRevisiones((prev) =>
          prev.map((revision) =>
            revisionesVencidas.some((rev) => rev.id === revision.id)
              ? { ...revision, estatus: 'no_realizada' }
              : revision
          )
        );
      } catch (error) {
        console.error('Error actualizando estatus automático a No realizada:', error);
      }
    };

    if (revisiones.length > 0) {
      actualizarEstatusNoRealizada();
    }
  }, [revisiones]);

  const normalizeString = (value) => (value ?? '').toString().trim().toLowerCase();

  const getMonitoristaDisplayName = (monitorista) => {
    if (!monitorista) return '';
    const fullName =
      monitorista.fullName ||
      monitorista.valor ||
      `${monitorista.firstName ?? ''} ${monitorista.lastName ?? ''}`.trim() ||
      monitorista.username;
    return (fullName && fullName.trim()) || `ID ${monitorista.id}`;
  };

  const buildMonitoristaMap = (revisionesSource, monitoristasSource) => {
    if (!Array.isArray(revisionesSource) || !Array.isArray(monitoristasSource)) {
      return {};
    }

    const mapping = {};
    revisionesSource.forEach((revision) => {
      if (!revision?.quienRealiza) return;
      const revisionName = normalizeString(revision.quienRealiza);
      if (!revisionName) return;

      const coincidente = monitoristasSource.find(
        (monitorista) => normalizeString(getMonitoristaDisplayName(monitorista)) === revisionName
      );

      if (coincidente?.id !== undefined && coincidente?.id !== null) {
        mapping[revision.id] = coincidente.id.toString();
      }
    });

    return mapping;
  };

  const cargarDatos = async () => {
    // Verificar si hay token antes de cargar datos
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No hay token, redirigiendo al login...');
      window.location.href = '/login';
      return;
    }

    try {
      const monitoristasData = await getUsersByRole('Monitorista');
      console.log('Monitoristas cargados:', monitoristasData);
      setMonitoristas(monitoristasData);
      
      const revisionesData = await getRevisiones();
      console.log('Revisiones cargadas:', revisionesData);
      setRevisiones(revisionesData);
      const mapping = buildMonitoristaMap(revisionesData, monitoristasData);
      setMonitoristaSeleccionadoIds(mapping);
    } catch (error) {
      console.error('Error cargando datos:', error);
      // Si hay error de autenticación, redirigir al login
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('Error de autenticación, redirigiendo al login...');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      
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
      
      const response = await createRevision(revisionData);
      console.log('Revisión guardada:', response);
      
      // La respuesta del backend incluye el ID, creamos el objeto completo
      const nuevaRevision = {
        id: response.id,
        ...revisionData,
        createdAt: response.createdAt
      };
      
      setRevisiones(prev => [nuevaRevision, ...prev]);
      handleCloseModal();
      
      showFeedback('Revisión creada', 'La revisión se ha guardado correctamente.', 'success');
    } catch (error) {
      console.error('Error al guardar revisión:', error);
      showFeedback('Error al guardar', 'No se pudo guardar la revisión. Inténtalo de nuevo.', 'danger');
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

  const getEstatusVisual = (revision) => {
    if (revision.estatus === 'pendiente' && calcularDiasEspera(revision.fechaIncidente) > 30) {
      return 'no_realizada';
    }
    return revision.estatus;
  };

  const calcularDiasEspera = (fechaIncidente) => {
    if (!fechaIncidente) return 0;
    const hoy = new Date();
    const incidente =
      fechaIncidente instanceof Date ? fechaIncidente : new Date(`${fechaIncidente}T00:00:00`);
    const diffTime = hoy - incidente;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays - 1, 0);
  };

  const handleDeleteRevision = (revisionId) => {
    if (!isAdmin) {
      showFeedback(
        'Acceso restringido',
        'Solo un administrador puede eliminar revisiones capturadas.',
        'warning'
      );
      return;
    }

    showFeedback(
      'Confirmar eliminación',
      '¿Estás seguro de eliminar esta revisión? Esta acción no se puede deshacer.',
      'warning',
      {
        showCancel: true,
        confirmLabel: 'Eliminar',
        onConfirm: async () => {
          try {
            await deleteRevision(revisionId);
            setRevisiones((prev) => prev.filter((r) => r.id !== revisionId));
            showFeedback('Revisión eliminada', 'El registro se eliminó correctamente.', 'success');
          } catch (error) {
            console.error('Error eliminando revisión:', error);
            
            let errorMessage = 'No se pudo eliminar la revisión. Verifica que el backend esté corriendo e inténtalo de nuevo.';
            
            if (error.response?.status === 404) {
              errorMessage = 'La revisión que intentas eliminar no existe o ya fue eliminada.';
            } else if (error.response?.status === 403) {
              errorMessage = 'No tienes permisos para eliminar esta revisión.';
            } else if (error.response?.status >= 500) {
              errorMessage = 'Error del servidor. Por favor inténtalo más tarde.';
            }
            
            showFeedback(
              'Error al eliminar',
              errorMessage,
              'danger'
            );
          }
        },
      }
    );
  };

  const handleFechaIncidenteChange = async (revisionId, nuevaFecha) => {
    try {
      await updateRevision(revisionId, { fechaIncidente: nuevaFecha });
      setRevisiones((prev) =>
        prev.map((revision) =>
          revision.id === revisionId ? { ...revision, fechaIncidente: nuevaFecha } : revision
        )
      );
      await cargarDatos();
      showFeedback('Fecha actualizada', 'La fecha del incidente se actualizó correctamente.', 'success');
    } catch (error) {
      console.error('Error actualizando fecha del incidente:', error);
      showFeedback(
        'Error al actualizar',
        'No se pudo actualizar la fecha del incidente. Verifica el backend e inténtalo de nuevo.',
        'danger'
      );
    }
  };

  const handleFechaRegistroChange = async (revisionId, nuevaFecha) => {
    if (!isAdmin) {
      showFeedback('Acceso restringido', 'Solo un administrador puede editar la fecha de registro.', 'warning');
      return;
    }

    try {
      await updateRevision(revisionId, { fechaRegistro: nuevaFecha });
      setRevisiones((prev) =>
        prev.map((revision) =>
          revision.id === revisionId ? { ...revision, fechaRegistro: nuevaFecha } : revision
        )
      );
      await cargarDatos();
      showFeedback('Fecha actualizada', 'La fecha de registro se actualizó correctamente.', 'success');
    } catch (error) {
      console.error('Error actualizando fecha de registro:', error);
      showFeedback(
        'Error al actualizar',
        'No se pudo actualizar la fecha de registro. Verifica el backend e inténtalo de nuevo.',
        'danger'
      );
    }
  };

  const handleQuienRealizaChange = async (revisionId, monitoristaId) => {
    // Los administradores pueden editar siempre
    if (!isAdmin) {
      const revisionActual = revisiones.find((rev) => rev.id === revisionId);
      if (
        revisionActual &&
        calcularDiasEspera(revisionActual.fechaIncidente) > 30
      ) {
        showFeedback(
          'Acción no permitida',
          'No puedes editar esta revisión porque supera los 30 días en espera.',
          'warning'
        );
        return;
      }
    }

    const monitoristaSeleccionado = monitoristas.find(
      (m) => m.id === monitoristaId || m.id === parseInt(monitoristaId, 10)
    );
    const nombreMonitorista = getMonitoristaDisplayName(monitoristaSeleccionado);

    if (!nombreMonitorista) {
      showFeedback(
        'Monitorista no identificado',
        'No se pudo identificar al monitorista seleccionado. Intenta con otro registro.',
        'danger'
      );
      return;
    }

    try {
      await updateRevision(revisionId, {
        quienRealiza: nombreMonitorista,
        estatus: 'en_proceso',
      });

      setRevisiones((prev) =>
        prev.map((revision) =>
          revision.id === revisionId
            ? { ...revision, quienRealiza: nombreMonitorista, estatus: 'en_proceso' }
            : revision
        )
      );

      setMonitoristaSeleccionadoIds((prev) => ({
        ...prev,
        [revisionId]: monitoristaId,
      }));

      await cargarDatos();
      showFeedback('Revisión actualizada', 'Se asignó el monitorista correctamente.', 'success');
    } catch (error) {
      console.error('Error actualizando quién realiza:', error);
      showFeedback(
        'Error al actualizar',
        'No se pudo actualizar el monitorista. Verifica el backend e inténtalo de nuevo.',
        'danger'
      );
    }
  };

  const handleEstatusChange = async (revisionId, nuevoEstatus) => {
    // Los administradores pueden editar siempre
    if (!isAdmin) {
      const revisionActual = revisiones.find((rev) => rev.id === revisionId);
      if (
        revisionActual &&
        calcularDiasEspera(revisionActual.fechaIncidente) > 30
      ) {
        showFeedback(
          'Acción no permitida',
          'No puedes editar esta revisión porque supera los 30 días en espera.',
          { type: 'warning' }
        );
        return;
      }
    }

    try {
      await updateRevision(revisionId, { estatus: nuevoEstatus });
      setRevisiones((prev) =>
        prev.map((revision) =>
          revision.id === revisionId ? { ...revision, estatus: nuevoEstatus } : revision
        )
      );
      await cargarDatos();
      showFeedback('Estatus actualizado', 'El estatus se actualizó correctamente.', 'success');
    } catch (error) {
      console.error('Error actualizando estatus:', error);
      showFeedback(
        'Error al actualizar',
        'No se pudo actualizar el estatus. Verifica el backend e inténtalo de nuevo.',
        'danger'
      );
    }
  };

  const getColorPorDias = (dias) => {
    if (dias <= 10) return 'verde';
    if (dias <= 20) return 'amarillo';
    if (dias <= 30) return 'naranja';
    return 'rojo';
  };

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

  const almacenesUnicos = [...new Set(revisiones.map(r => r.almacen))];
  const areasUnicas = [...new Set(revisiones.map(r => r.areaSolicita))];
  const quienesRealizanUnicos = [...new Set(revisiones.map(r => r.quienRealiza).filter(Boolean))];
  const estatusUnicos = [...new Set(revisiones.map(r => r.estatus))];

  const revisionesConEstatusActualizado = useMemo(() => {
    return revisiones.map((revision) => {
      if (revision.estatus === 'pendiente' && calcularDiasEspera(revision.fechaIncidente) > 30) {
        return { ...revision, estatus: 'no_realizada' };
      }
      return revision;
    });
  }, [revisiones]);

  const estatusChartData = useMemo(() => {
    const counts = STATUS_CONFIG.map((status) => ({
      ...status,
      value: revisionesConEstatusActualizado.filter((rev) => rev.estatus === status.key).length,
    }));

    return {
      labels: counts.map((item) => item.label),
      datasets: [
        {
          data: counts.map((item) => item.value),
          backgroundColor: counts.map((item) => item.background.replace('0.35', '0.7')),
          borderColor: counts.map((item) => item.color),
          borderWidth: 2,
        },
      ],
    };
  }, [revisionesConEstatusActualizado]);

  const estatusChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
      },
    }),
    []
  );

  const topAlmacenes = useMemo(() => {
    const counts = {};
    const revisionesFiltradas = mesSeleccionadoTopAlmacenes
      ? revisionesConEstatusActualizado.filter((r) => {
          const mes = new Date(r.fechaRegistro).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
          return mes === mesSeleccionadoTopAlmacenes;
        })
      : revisionesConEstatusActualizado;

    revisionesFiltradas.forEach((revision) => {
      if (!revision.almacen) return;
      if (!counts[revision.almacen]) {
        counts[revision.almacen] = {
          total: 0,
          breakdown: STATUS_CONFIG.reduce((acc, status) => {
            acc[status.key] = 0;
            return acc;
          }, {}),
        };
      }

      counts[revision.almacen].total += 1;
      const estatus = STATUS_CONFIG.find((status) => status.key === revision.estatus)?.key ?? STATUS_CONFIG[0].key;
      counts[revision.almacen].breakdown[estatus] += 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8)
      .map(([almacen, info]) => ({
        almacen,
        total: info.total,
        breakdown: STATUS_CONFIG.map((status) => ({
          key: status.key,
          label: status.label,
          color: status.color,
          background: status.background,
          value: info.breakdown[status.key],
        })),
      }));
  }, [revisionesConEstatusActualizado, mesSeleccionadoTopAlmacenes]);

  const mesesDisponibles = useMemo(() => {
    const mesesSet = new Set();
    revisionesConEstatusActualizado.forEach((r) => {
      const mes = new Date(r.fechaRegistro).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      mesesSet.add(mes);
    });
    return Array.from(mesesSet).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB - dateA;
    });
  }, [revisionesConEstatusActualizado]);

  const almacenesChartData = useMemo(() => {
    if (topAlmacenes.length === 0) {
      return { labels: [], datasets: [] };
    }

    return {
      labels: topAlmacenes.map((item) => item.almacen),
      datasets: STATUS_CONFIG.map((status) => ({
        label: status.label,
        data: topAlmacenes.map((item) =>
          item.breakdown.find((b) => b.key === status.key)?.value ?? 0
        ),
        backgroundColor: status.background.replace('0.35', '0.9'),
        borderColor: status.color,
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 24,
        borderSkipped: false,
      })),
    };
  }, [topAlmacenes]);

  const almacenesChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const status = STATUS_CONFIG.find((s) => s.label === context.dataset.label);
              return `${status?.label ?? context.dataset.label}: ${context.parsed.y}`;
            },
          },
        },
      },
      scales: {
        y: {
          stacked: true,
          ticks: { precision: 0 },
          grid: { color: 'rgba(67,97,238,0.08)' },
        },
        x: {
          stacked: true,
          grid: { display: false },
        },
      },
    }),
    []
  );

  const monthlyData = useMemo(() => {
    const meses = MESES_ORDEN.reduce((acc, mes) => ({ ...acc, [mes]: 0 }), {});
    const estatusPorMes = MESES_ORDEN.reduce((acc, mes) => {
      acc[mes] = STATUS_CONFIG.reduce((statusAcc, status) => {
        statusAcc[status.key] = 0;
        return statusAcc;
      }, {});
      return acc;
    }, {});

    revisionesConEstatusActualizado.forEach((revision) => {
      if (!revision.fechaRegistro) return;
      const fecha = new Date(revision.fechaRegistro);
      if (Number.isNaN(fecha.getTime())) return;
      const nombreMes = fecha.toLocaleDateString('es-ES', { month: 'long' });
      const mesCapitalizado = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
      if (!meses.hasOwnProperty(mesCapitalizado)) return;

      meses[mesCapitalizado] += 1;
      estatusPorMes[mesCapitalizado][revision.estatus] =
        (estatusPorMes[mesCapitalizado][revision.estatus] || 0) + 1;
    });

    const labels = MESES_ORDEN.filter((mes) => meses[mes] > 0);
    const chartLabels = labels.length ? labels : MESES_ORDEN;

    const chartData = {
      labels: chartLabels,
      datasets: STATUS_CONFIG.map((status) => ({
        label: status.label,
        data: chartLabels.map((mes) => estatusPorMes[mes][status.key] || 0),
        borderColor: status.color,
        backgroundColor: status.background.replace('0.35', '0.35'),
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#fff',
        pointBorderColor: status.color,
        fill: true,
        spanGaps: true,
      })),
    };

    const summary = chartLabels.map((mes) => ({
      mes,
      total: STATUS_CONFIG.reduce(
        (total, status) => total + (estatusPorMes[mes][status.key] || 0),
        0
      ),
      breakdown: STATUS_CONFIG.map((status) => ({
        key: status.key,
        label: status.label,
        color: status.color,
        value: estatusPorMes[mes][status.key] || 0,
      })),
    }));

    return { chartData, summary };
  }, [revisionesConEstatusActualizado]);

  const monthlyLineData = monthlyData.chartData;
  const monthlySummary = monthlyData.summary;

  const monthlyLineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
        x: {
          grid: { color: 'rgba(0,0,0,0.03)' },
        },
      },
    }),
    []
  );

  const hasPieData = useMemo(
    () => estatusChartData.datasets?.[0]?.data?.some((value) => value > 0),
    [estatusChartData]
  );

  const hasBarData = useMemo(() => topAlmacenes.length > 0, [topAlmacenes]);

  const hasMonthlyData = useMemo(
    () => monthlyLineData.datasets?.some((dataset) => dataset.data.some((value) => value > 0)),
    [monthlyLineData]
  );

  const balancePorEstatus = useMemo(() => {
    return STATUS_CONFIG.map((status) => ({
      ...status,
      value: revisionesConEstatusActualizado.filter((rev) => rev.estatus === status.key).length,
    }));
  }, [revisionesConEstatusActualizado]);

  return (
    <div className="dashboard-wrapper min-vh-100">
      <MainNavbar
        displayName={displayName}
        role={user.role}
        isAdmin={isAdmin}
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

            {activeTab === 'tabla' ? (
              <>
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
                        {isAdmin && (
                          <th className="border-0 text-muted fw-semibold">
                            <i className="fas fa-trash me-2 text-danger"></i>
                            Acciones
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {revisionesFiltradas.map((revision) => (
                        <tr key={revision.id} className="border-bottom">
                          <td className="align-middle">
                            {isAdmin ? (
                              <input
                                type="date"
                                className="form-control form-control-sm border-0 bg-light"
                                value={revision.fechaRegistro}
                                onChange={(e) => handleFechaRegistroChange(revision.id, e.target.value)}
                              />
                            ) : (
                              <span className="fw-medium">{formatDate(revision.fechaRegistro)}</span>
                            )}
                          </td>
                          <td className="align-middle">
                            <div className="d-flex align-items-center">
                              <div className="bg-warning bg-opacity-10 rounded-circle p-2 me-2">
                                <i className="fas fa-exclamation-triangle text-warning"></i>
                              </div>
                              <input
                                type="date"
                                className="form-control form-control-sm border-0 bg-light"
                                value={revision.fechaIncidente}
                                onChange={(e) => handleFechaIncidenteChange(revision.id, e.target.value)}
                              />
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
                              value={getEstatusVisual(revision)}
                              onChange={(e) => handleEstatusChange(revision.id, e.target.value)}
                            >
                              <option value="pendiente">Pendiente</option>
                              <option value="en_proceso">En Proceso</option>
                              <option value="enviada">Enviada</option>
                              <option value="cancelada">Cancelada</option>
                              <option value="no_realizada">No realizada</option>
                            </select>
                          </td>
                          {isAdmin && (
                            <td className="align-middle">
                              <button
                                className="btn btn-sm btn-danger rounded-circle d-inline-flex align-items-center justify-content-center"
                                style={{ width: '32px', height: '32px', padding: 0, backgroundColor: '#f8d7da', borderColor: '#f5c6cb', color: '#721c24' }}
                                onClick={() => handleDeleteRevision(revision.id)}
                                title="Eliminar revisión"
                              >
                                <i className="fas fa-trash-alt" style={{ fontSize: '0.75rem' }}></i>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="row g-4">
                <div className="col-lg-4">
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-header bg-white border-0">
                      <h6 className="mb-0 text-uppercase text-muted">
                        <i className="fas fa-circle-notch me-1 text-primary"></i>
                        Estatus global
                      </h6>
                    </div>
                    <div className="card-body">
                      {hasPieData ? (
                        <div className="d-flex flex-column flex-lg-row align-items-center gap-3">
                          <div style={{ height: 260, width: '100%' }}>
                            <Pie data={estatusChartData} options={estatusChartOptions} />
                          </div>
                          <div className="w-100">
                            {balancePorEstatus.map((status) => (
                              <div
                                key={status.key}
                                className="d-flex justify-content-between align-items-center border rounded py-1 px-2 mb-2 bg-light"
                              >
                                <div className="d-flex align-items-center">
                                  <span className="badge rounded-circle me-2 bg-secondary" style={{ width: 10, height: 10 }}></span>
                                  <span className="fw-semibold">{status.label}</span>
                                </div>
                                <span className="text-muted">{status.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-muted py-5">
                          <i className="fas fa-chart-pie fa-2x mb-2"></i>
                          <p className="mb-0">Sin datos suficientes</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-lg-8">
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
                      <h6 className="mb-0 text-uppercase text-muted">
                        <i className="fas fa-store-alt me-1 text-primary"></i>
                        Top almacenes
                      </h6>
                      <div className="d-flex align-items-center gap-2">
                        <select
                          className="form-select form-select-sm"
                          value={mesSeleccionadoTopAlmacenes}
                          onChange={(e) => setMesSeleccionadoTopAlmacenes(e.target.value)}
                        >
                          <option value="">Todos los meses</option>
                          {mesesDisponibles.map((mes) => (
                            <option key={mes} value={mes}>
                              {mes}
                            </option>
                          ))}
                        </select>
                        <small className="text-muted">Últimas capturas</small>
                      </div>
                    </div>
                    <div className="card-body">
                      {hasBarData ? (
                        <div className="row g-4">
                          <div className="col-md-8">
                            <div style={{ height: 300 }}>
                              <Bar data={almacenesChartData} options={almacenesChartOptions} />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="border rounded p-2">
                              <h6 className="text-muted mb-2 small">Top almacenes</h6>
                              <div className="small">
                                {topAlmacenes.map((almacen, index) => (
                                  <div key={almacen.almacen} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                                    <span className="text-truncate me-2">
                                      <span className="badge bg-light text-dark border me-1" style={{ fontSize: '0.7em' }}>{index + 1}</span>
                                      {almacen.almacen}
                                    </span>
                                    <span className="badge bg-light text-dark border" style={{ fontSize: '0.75em' }}>{almacen.total}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-muted py-5">
                          <i className="fas fa-chart-bar fa-2x mb-2"></i>
                          <p className="mb-0">No hay registros</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-12">
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
                      <h6 className="mb-0 text-uppercase text-muted">
                        <i className="fas fa-wave-square me-1 text-primary"></i>
                        Tendencia mensual por estatus
                      </h6>
                      <small className="text-muted">Periodo capturado</small>
                    </div>
                    <div className="card-body">
                      {hasMonthlyData ? (
                        <>
                          <div className="d-flex flex-wrap gap-3 mb-3">
                            {balancePorEstatus.map((status) => (
                              <div
                                key={status.key}
                                className="d-flex align-items-center px-3 py-2 rounded-pill bg-light border"
                              >
                                <span className="badge rounded-circle me-2 bg-secondary" style={{ width: 10, height: 10 }}></span>
                                <span className="fw-semibold me-2 text-dark">{status.label}</span>
                                <span className="text-muted">{status.value}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ height: 360 }}>
                            <Line data={monthlyLineData} options={monthlyLineOptions} />
                          </div>
                          <div className="row g-3 mt-3">
                            {monthlySummary.map((mes) => (
                              <div key={mes.mes} className="col-md-4">
                                <div className="border rounded p-3 h-100">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h6 className="mb-0 text-uppercase text-muted">{mes.mes}</h6>
                                    <span className="badge bg-dark text-white">{mes.total} total</span>
                                  </div>
                                  {mes.breakdown.map((item) => (
                                    <div
                                      key={item.key}
                                      className="d-flex justify-content-between align-items-center small py-1 border-bottom"
                                    >
                                      <div className="d-flex align-items-center">
                                        <span className="badge rounded-circle me-2 bg-secondary" style={{ width: 8, height: 8 }}></span>
                                        {item.label}
                                      </div>
                                      <span className="text-muted">{item.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-muted py-5">
                          <i className="fas fa-chart-line fa-2x mb-2"></i>
                          <p className="mb-0">Registra más información para visualizar la tendencia.</p>
                        </div>
                      )}
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

      {modalFeedback.visible && (
        <div className="register-modal-backdrop">
          <div className="register-modal recovery-modal">
            <div className={`recovery-modal__header bg-${modalFeedback.type === 'danger' ? 'danger' : modalFeedback.type === 'warning' ? 'warning' : 'success'}`}>
              <h3 className="mb-0">{modalFeedback.title}</h3>
              <button type="button" className="btn-close" onClick={closeFeedback} aria-label="Cerrar" />
            </div>
            <div className="recovery-modal__body">
              <p className="recovery-modal__description">{modalFeedback.message}</p>
              <div className="d-flex gap-2 justify-content-center">
                {modalFeedback.showCancel && (
                  <button type="button" className="btn btn-secondary" onClick={closeFeedback}>
                    Cancelar
                  </button>
                )}
                {modalFeedback.onConfirm ? (
                  <button
                    type="button"
                    className={`btn btn-${modalFeedback.type === 'danger' ? 'danger' : modalFeedback.type === 'warning' ? 'warning' : 'success'}`}
                    onClick={() => {
                      if (modalFeedback.onConfirm) modalFeedback.onConfirm();
                      closeFeedback();
                    }}
                  >
                    {modalFeedback.confirmLabel || 'Aceptar'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={closeFeedback}
                  >
                    {modalFeedback.confirmLabel || 'Aceptar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapturaRevisiones;
