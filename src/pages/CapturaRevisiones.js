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
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

// Registrar plugins ANTES de importar react-chartjs-2
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Verificar que el plugin Filler esté disponible

const STATUS_CONFIG = [
  { key: 'cancelada', label: 'Cancelada', color: '#ef476f', background: 'rgba(239, 71, 111, 0.25)' },
  { key: 'pendiente', label: 'Pendiente', color: '#f7b731', background: 'rgba(247, 183, 49, 0.3)' },
  { key: 'enviada', label: 'Enviada', color: '#1abc9c', background: 'rgba(26, 188, 156, 0.3)' },
  { key: 'en_proceso', label: 'En proceso', color: '#9b5de5', background: 'rgba(155, 93, 229, 0.3)' },
  { key: 'plazo_vencido', label: 'P. vencido', color: '#dc3545', background: 'rgba(220, 53, 69, 0.25)' },
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

const DIAS_ORDEN = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Función para obtener el número de semana ISO 8601
const getISOWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
};

// Función para generar semanas del año específico
const generateWeeks = (year = null) => {
  const weeks = [];
  const targetYear = year || new Date().getFullYear();
  const now = new Date();
  
    
  // Obtener el número de semana actual
  const currentWeek = getISOWeekNumber(now);
    
  for (let week = 1; week <= currentWeek; week++) {
    // Calcular el inicio de la semana usando ISO 8601
    const firstDayOfYear = new Date(targetYear, 0, 1);
    const daysOffset = (week - 1) * 7;
    const startOfWeek = new Date(firstDayOfYear);
    startOfWeek.setDate(firstDayOfYear.getDate() + daysOffset);
    
    // Ajustar al lunes (ISO 8601)
    const dayOfWeek = startOfWeek.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(startOfWeek.getDate() - daysToMonday);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    // Solo incluir semanas hasta la fecha actual si es el año actual
    if (targetYear === now.getFullYear() && startOfWeek > now) {
      break;
    }
    
        
    weeks.push({
      value: week,
      label: `Semana ${week} (${startOfWeek.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })} - ${endOfWeek.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })})`,
      start: startOfWeek,
      end: endOfWeek
    });
  }
  
  return weeks;
};

// Función para generar últimos 2 años
const generateYears = () => {
  const years = [];
  const currentYear = new Date().getFullYear();
  
  for (let i = 0; i < 2; i++) {
    const year = currentYear - i;
    years.push({
      value: year,
      label: year.toString()
    });
  }
  
  return years;
};

// Función para generar días disponibles según filtros seleccionados
const generateAvailableDays = (year = null, week = null, month = null) => {
  const days = [];
  const now = new Date();
  const targetYear = year || now.getFullYear();
  
  if (week) {
    // Si hay semana seleccionada, generar días de esa semana
    const weeks = generateWeeks(targetYear);
    const weekData = weeks.find(w => w.value === parseInt(week));
    if (weekData) {
      let currentDay = new Date(weekData.start);
      while (currentDay <= weekData.end) {
        // Solo incluir días hasta hoy si es el año actual
        if (targetYear === now.getFullYear() && currentDay > now) {
          break;
        }
        days.push({
          value: currentDay.toISOString().split('T')[0],
          label: currentDay.toLocaleDateString('es-MX', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        });
        currentDay.setDate(currentDay.getDate() + 1);
      }
    }
  } else if (month) {
    // Si hay mes seleccionado, generar días de ese mes
    const [monthName] = month.split(' ');
    const monthIndex = MESES_ORDEN.indexOf(monthName);
    const monthYear = parseInt(month.split(' ')[1]) || targetYear;
    
    if (monthIndex !== -1) {
      const firstDay = new Date(monthYear, monthIndex, 1);
      const lastDay = new Date(monthYear, monthIndex + 1, 0);
      
      let currentDay = new Date(firstDay);
      while (currentDay <= lastDay) {
        // Solo incluir días hasta hoy si es el año y mes actual
        if (monthYear === now.getFullYear() && monthIndex === now.getMonth() && currentDay > now) {
          break;
        }
        days.push({
          value: currentDay.toISOString().split('T')[0],
          label: currentDay.toLocaleDateString('es-MX', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        });
        currentDay.setDate(currentDay.getDate() + 1);
      }
    }
  } else {
    // Si no hay filtros, generar días del año seleccionado
    const firstDay = new Date(targetYear, 0, 1);
    const lastDay = new Date(targetYear, 11, 31);
    
    let currentDay = new Date(firstDay);
    while (currentDay <= lastDay) {
      // Solo incluir días hasta hoy si es el año actual
      if (targetYear === now.getFullYear() && currentDay > now) {
        break;
      }
      days.push({
        value: currentDay.toISOString().split('T')[0],
        label: currentDay.toLocaleDateString('es-MX', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      });
      currentDay.setDate(currentDay.getDate() + 1);
    }
  }
  
  return days;
};

// Función para generar meses disponibles según año seleccionado
const generateAvailableMonths = (year = null) => {
  const months = [];
  const now = new Date();
  const targetYear = year || now.getFullYear();
  
  MESES_ORDEN.forEach((monthName, index) => {
    // Solo incluir meses hasta hoy si es el año actual
    if (targetYear === now.getFullYear() && index > now.getMonth()) {
      return;
    }
    months.push({
      value: `${monthName} de ${targetYear}`,
label: `${monthName} de ${targetYear}`
    });
  });
  
  return months.reverse(); // Meses más recientes primero
};

const CapturaRevisiones = () => {
  const { openModal: openUserManagementModal } = useUserManagement();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revisiones, setRevisiones] = useState([]);
  const [monitoristas, setMonitoristas] = useState([]);
  const [activeTab, setActiveTab] = useState('tabla');
  const [chartTimeTab, setChartTimeTab] = useState('mes'); // Estado para pestañas de tiempo en gráficas
  
  // Función para obtener la fecha máxima permitida (hoy) - ajustada a zona horaria local
  const getMaxDate = () => {
    const today = new Date();
    // Usar zona horaria local para evitar problemas con UTC
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Inicializar con la fecha de hoy para evitar fechas futuras
  const todayString = getMaxDate();
  
  // Estados de filtros de tiempo
  const [selectedDay, setSelectedDay] = useState(todayString);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [originalDay, setOriginalDay] = useState(todayString);
  const [mesSeleccionadoTopAlmacenes, setMesSeleccionadoTopAlmacenes] = useState('');

  // Efecto para corregir fechas futuras en selectedDay
  useEffect(() => {
    if (selectedDay) {
      const selectedDate = new Date(selectedDay);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (selectedDate > today) {
        const todayString = getMaxDate(); // Usar la misma función para consistencia
        setSelectedDay(todayString);
        setOriginalDay(todayString);
      }
    }
  }, [selectedDay]);

  // Efecto para limpiar filtros cuando cambia el año
  useEffect(() => {
    if (selectedYear) {
      // Limpiar semana y mes cuando cambia el año
      setSelectedWeek('');
      setMesSeleccionadoTopAlmacenes('');
    }
  }, [selectedYear]);

  // Efecto para limpiar día cuando cambia la semana o mes
  useEffect(() => {
    if (selectedWeek || mesSeleccionadoTopAlmacenes) {
      // Limpiar día cuando cambia semana o mes
      setSelectedDay('');
    }
  }, [selectedWeek, mesSeleccionadoTopAlmacenes]);

  // Efecto inicial para corregir fechas futuras al montar
  useEffect(() => {
    const todayString = getMaxDate();
    if (selectedDay && selectedDay > todayString) {
      setSelectedDay(todayString);
      setOriginalDay(todayString);
    }
  }, []); // Solo al montar

  // Función para sincronizar filtros cuando cambia el periodo
  const syncFilters = (newTab) => {
    const today = new Date();
    
    if (newTab === 'dia') {
      // Si venimos de otro periodo, usamos el día original si existe
      // Si no, ponemos hoy
      if (!selectedDay && originalDay) {
        setSelectedDay(originalDay);
      } else if (!selectedDay) {
        const todayString = today.toISOString().split('T')[0];
        setSelectedDay(todayString);
        setOriginalDay(todayString);
      }
      setSelectedWeek('');
      setMesSeleccionadoTopAlmacenes('');
      setSelectedYear('');
    } else if (newTab === 'semana') {
      // Si venimos de día, guardamos el día y calculamos la semana
      if (selectedDay) {
        setOriginalDay(selectedDay); // Guardamos el día original
        const dayDate = new Date(selectedDay);
        const weeks = generateWeeks();
        const currentWeek = weeks.find(w => {
          return dayDate >= w.start && dayDate <= w.end;
        });
        if (currentWeek) {
          setSelectedWeek(currentWeek.value.toString());
        }
      } else if (originalDay) {
        // Si no tenemos día seleccionado pero tenemos día original, lo usamos
        const dayDate = new Date(originalDay);
        const weeks = generateWeeks();
        const currentWeek = weeks.find(w => {
          return dayDate >= w.start && dayDate <= w.end;
        });
        if (currentWeek) {
          setSelectedWeek(currentWeek.value.toString());
        }
      }
      setSelectedDay('');
      setMesSeleccionadoTopAlmacenes('');
      setSelectedYear('');
    } else if (newTab === 'mes') {
      // Si venimos de día, guardamos el día y calculamos el mes
      if (selectedDay) {
        setOriginalDay(selectedDay); // Guardamos el día original
        const dayDate = new Date(selectedDay);
        const monthName = MESES_ORDEN[dayDate.getMonth()];
        const year = dayDate.getFullYear();
        setMesSeleccionadoTopAlmacenes(`${monthName} ${year}`);
      } else if (selectedWeek) {
        // Si venimos de semana, calculamos el mes de esa semana
        const weeks = generateWeeks();
        const weekData = weeks.find(w => w.value === parseInt(selectedWeek));
        if (weekData) {
          const monthName = MESES_ORDEN[weekData.start.getMonth()];
          const year = weekData.start.getFullYear();
          setMesSeleccionadoTopAlmacenes(`${monthName} ${year}`);
        }
      } else if (originalDay) {
        // Si no tenemos día seleccionado pero tenemos día original, lo usamos
        const dayDate = new Date(originalDay);
        const monthName = MESES_ORDEN[dayDate.getMonth()];
        const year = dayDate.getFullYear();
        setMesSeleccionadoTopAlmacenes(`${monthName} ${year}`);
      }
      setSelectedDay('');
      setSelectedWeek('');
      setSelectedYear('');
    } else if (newTab === 'año') {
      // Si venimos de día, guardamos el día y calculamos el año
      if (selectedDay) {
        setOriginalDay(selectedDay); // Guardamos el día original
        setSelectedYear(new Date(selectedDay).getFullYear().toString());
      } else if (selectedWeek) {
        // Si venimos de semana, calculamos el año de esa semana
        const weeks = generateWeeks();
        const weekData = weeks.find(w => w.value === parseInt(selectedWeek));
        if (weekData) {
          setSelectedYear(weekData.start.getFullYear().toString());
        }
      } else if (mesSeleccionadoTopAlmacenes) {
        // Si venimos de mes, calculamos el año de ese mes
        const [mes, año] = mesSeleccionadoTopAlmacenes.split(' ');
        setSelectedYear(año);
      } else if (originalDay) {
        // Si no tenemos día seleccionado pero tenemos día original, lo usamos
        setSelectedYear(new Date(originalDay).getFullYear().toString());
      }
      setSelectedDay('');
      setSelectedWeek('');
      setMesSeleccionadoTopAlmacenes('');
    }
  };

  // Manejador de cambio de pestaña de tiempo
  const handleChartTimeTabChange = (newTab) => {
    syncFilters(newTab);
    setChartTimeTab(newTab);
  };

  // Función para limpiar todos los filtros y poner día de hoy
  const clearAllFilters = () => {
    const todayString = getMaxDate(); // Usar la función con zona horaria local
    setSelectedDay(todayString);
    setOriginalDay(todayString); // También establecemos el día original
    setSelectedWeek('');
    setMesSeleccionadoTopAlmacenes('');
    setSelectedYear('');
    setFiltroUbicacionGraficas(''); // Limpiar filtro de ubicación en gráficas
    // No cambiamos la pestaña, mantenemos la actual
  };

  const [monitoristaSeleccionadoIds, setMonitoristaSeleccionadoIds] = useState({});

  const [filtroColor, setFiltroColor] = useState('');
  const [filtroAlmacen, setFiltroAlmacen] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [filtroQuienRealiza, setFiltroQuienRealiza] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroTitulo, setFiltroTitulo] = useState('');
  const [filtroUbicacionGraficas, setFiltroUbicacionGraficas] = useState('');
  const [modalFeedback, setModalFeedback] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteRevisionId, setDeleteRevisionId] = useState(null);
  const [forceRender, setForceRender] = useState(0);

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
        const newFeedback = {
      visible: true,
      title,
      message,
      type,
      showCancel: options.showCancel || false,
      onConfirm: options.onConfirm || null,
      confirmLabel: options.confirmLabel || 'Aceptar'
    };
    setModalFeedback(newFeedback);
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

  // Efecto para depurar el estado de modalFeedback
  useEffect(() => {
      }, [modalFeedback]);

  // Efecto para depurar el estado de showDeleteConfirm
  useEffect(() => {
      }, [showDeleteConfirm]);

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
            window.location.href = '/login';
      return;
    }

    try {
      const monitoristasData = await getUsersByRole('Monitorista');
            setMonitoristas(monitoristasData);
      
      const revisionesData = await getRevisiones();
            setRevisiones(revisionesData);
      const mapping = buildMonitoristaMap(revisionesData, monitoristasData);
      setMonitoristaSeleccionadoIds(mapping);
    } catch (error) {
      console.error('Error cargando datos:', error);
      // Si hay error de autenticación, redirigir al login
      if (error.response?.status === 401 || error.response?.status === 403) {
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
      return 'plazo_vencido';
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

  // Función para mostrar modal de eliminación directamente
  const showDeleteModal = (revisionId) => {
    // Solo mostrar modal si estamos en la pestaña de tablas
    if (activeTab !== 'tabla') {
            return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'register-modal-backdrop';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.zIndex = '9999';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    
    modal.innerHTML = `
      <div class="register-modal recovery-modal">
        <div class="recovery-modal__header bg-warning">
          <h3 class="mb-0">Confirmar eliminación</h3>
          <button type="button" class="btn-close" onclick="this.closest('.register-modal-backdrop').remove()"></button>
        </div>
        <div class="recovery-modal__body">
          <p class="recovery-modal__description">¿Estás seguro de eliminar esta revisión? Esta acción no se puede deshacer.</p>
          <div class="d-flex gap-2 justify-content-center">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.register-modal-backdrop').remove()">Cancelar</button>
            <button type="button" class="btn btn-danger" onclick="window.confirmDelete(${revisionId})">Eliminar</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Función global para confirmar eliminación
    window.confirmDelete = async (id) => {
      try {
        await deleteRevision(id);
        setRevisiones((prev) => prev.filter((r) => r.id !== id));
        modal.remove();
        // Eliminado el mensaje de éxito - no mostrar alerta
      } catch (error) {
        console.error('Error eliminando revisión:', error);
        modal.remove();
        let errorMessage = 'No se pudo eliminar la revisión. Verifica que el backend esté corriendo e inténtalo de nuevo.';
        if (error.response?.status === 404) {
          errorMessage = 'La revisión que intentas eliminar no existe o ya fue eliminada.';
        } else if (error.response?.status === 403) {
          errorMessage = 'No tienes permisos para eliminar esta revisión.';
        } else if (error.response?.status >= 500) {
          errorMessage = 'Error del servidor. Por favor inténtalo más tarde.';
        }
        showFeedback('Error al eliminar', errorMessage, 'danger');
      }
    };
  };

  const handleDeleteRevision = (revisionId) => {
    console.log('Intentando eliminar revisión:', revisionId);
    console.log('¿Es admin?', isAdmin);
    console.log('Usuario:', user);
    
    if (!isAdmin) {
            showFeedback(
        'Acceso restringido',
        'Solo un administrador puede eliminar revisiones capturadas.',
        'warning'
      );
      return;
    }

        showDeleteModal(revisionId);
  };

  const handleFechaIncidenteChange = async (revisionId, nuevaFecha) => {
    // Validar que la fecha no sea futura
    const hoy = new Date().toISOString().split('T')[0];
    if (nuevaFecha > hoy) {
      showFeedback(
        'Fecha no válida',
        'La fecha del incidente no puede ser futura. Solo se permiten fechas de hoy hacia atrás.',
        'warning'
      );
      return;
    }
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

  // Función para normalizar texto (quitar acentos y caracteres especiales)
  const normalizarTexto = (texto) => {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/[.,;:¡!¿?'""()\/\\&%$#@*+=~`^|<>{}[\]]/g, '') // Quitar caracteres especiales
      .replace(/\s+/g, ' ') // Reemplazar múltiples espacios por uno solo
      .trim();
  };

  const revisionesFiltradas = revisiones.filter(revision => {
    const dias = calcularDiasEspera(revision.fechaIncidente);
    const color = getColorPorDias(dias);
    
    return (
      (!filtroColor || color === filtroColor) &&
      (!filtroAlmacen || revision.almacen === filtroAlmacen) &&
      (!filtroArea || revision.areaSolicita === filtroArea) &&
      (!filtroQuienRealiza || revision.quienRealiza === filtroQuienRealiza) &&
      (!filtroEstatus || revision.estatus === filtroEstatus) &&
      (!filtroTitulo || normalizarTexto(revision.titulo).includes(normalizarTexto(filtroTitulo)))
    );
  });

  const almacenesUnicos = [...new Set(revisiones.map(r => r.almacen))];
  const ubicacionesUnicas = [...new Set(revisiones.map(r => r.ubicacion).filter(Boolean))];
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

  // Aplicar filtro de ubicación a las revisiones para las gráficas
  const revisionesFiltradasParaGraficas = useMemo(() => {
    console.log('🔍 DEBUG - Filtrando revisiones para gráficas:');
    console.log('- filtroUbicacionGraficas:', filtroUbicacionGraficas);
    console.log('- chartTimeTab:', chartTimeTab);
    console.log('- selectedDay:', selectedDay);
    console.log('- selectedWeek:', selectedWeek);
    console.log('- selectedYear:', selectedYear);
    console.log('- mesSeleccionadoTopAlmacenes:', mesSeleccionadoTopAlmacenes);
    console.log('- Total revisiones antes de filtro de ubicación:', revisionesConEstatusActualizado.length);
    
    if (!filtroUbicacionGraficas) {
      console.log('✅ Sin filtro de ubicación, retornando todas las revisiones:', revisionesConEstatusActualizado.length);
      return revisionesConEstatusActualizado;
    }
    const filtradas = revisionesConEstatusActualizado.filter((revision) => 
      revision.ubicacion === filtroUbicacionGraficas
    );
    console.log('✅ Con filtro de ubicación, retornando:', filtradas.length);
    return filtradas;
  }, [revisionesConEstatusActualizado, filtroUbicacionGraficas]);

  const estatusChartData = useMemo(() => {
    const counts = STATUS_CONFIG.map((status) => ({
      ...status,
      value: revisionesFiltradasParaGraficas.filter((rev) => rev.estatus === status.key).length,
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
  }, [revisionesFiltradasParaGraficas]);

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
    let revisionesFiltradas = revisionesFiltradasParaGraficas;

// Aplicar filtro de mes si está seleccionado
if (mesSeleccionadoTopAlmacenes) {
  revisionesFiltradas = revisionesFiltradas.filter((r) => {
    // CORRECCIÓN: Filtro de mes por número
    const fecha = new Date(r.fechaRegistro);
    const mesRevision = fecha.getMonth(); // 0-11
    const añoRevision = fecha.getFullYear();
    
    // Parsear mesSeleccionadoTopAlmacenes "Diciembre de 2025"
    const [mesNombre, , añoStr] = mesSeleccionadoTopAlmacenes.split(' ');
    const mesSeleccionado = MESES_ORDEN.indexOf(mesNombre); // 0-11
    const añoSeleccionado = parseInt(añoStr);
    
    return mesRevision === mesSeleccionado && añoRevision === añoSeleccionado;
  });
}

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
  }, [revisionesFiltradasParaGraficas, mesSeleccionadoTopAlmacenes]);

  const mesesDisponibles = useMemo(() => {
    const mesesSet = new Set();
    revisionesFiltradasParaGraficas.forEach((r) => {
      const fecha = new Date(r.fechaRegistro);
      const mesNombre = MESES_ORDEN[fecha.getMonth()];
      const año = fecha.getFullYear();
      const mesFormateado = `${mesNombre} de ${año}`;
      mesesSet.add(mesFormateado);
    });
    return Array.from(mesesSet).sort((a, b) => {
      // CORRECCIÓN: Ordenamiento correcto de meses
      const dateA = new Date(`${a} 1`);
      const dateB = new Date(`${b} 1`);
      return dateB - dateA; // Más recientes primero
    });
  }, [revisionesFiltradasParaGraficas]);

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
  }, [revisionesFiltradasParaGraficas]);

  const monthlyLineData = monthlyData.chartData;
  const monthlySummary = monthlyData.summary;

  const getRevisionesByPeriod = useMemo(() => {
    let resultado;
    
    if (chartTimeTab === 'dia') {
      // Datos por día específico (00:00 - 23:59)
      if (selectedDay) {
        // Filtrar revisiones del día específico
        const revisionesDelDia = revisionesFiltradasParaGraficas.filter((revision) => {
          if (!revision.fechaRegistro) return false;
          const revisionDate = revision.fechaRegistro.split('T')[0];
          return revisionDate === selectedDay;
        });
        
        // Agrupar por estatus
        const estatusCounts = STATUS_CONFIG.reduce((acc, status) => {
          acc[status.key] = revisionesDelDia.filter(r => r.estatus === status.key).length;
          return acc;
        }, {});
        
        resultado = {
          labels: ['Día seleccionado'],
          datasets: STATUS_CONFIG.map((status) => ({
            label: status.label,
            data: [estatusCounts[status.key] || 0],
            borderColor: status.color,
            backgroundColor: status.background.replace('0.35', '0.35'),
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#fff',
            pointBorderColor: status.color,
            spanGaps: true,
          }))
        };
      } else {
        // Si no hay día seleccionado, mostrar datos por día de la semana
        const diasData = {};
        const DIAS_ORDEN = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        
        DIAS_ORDEN.forEach(dia => {
          diasData[dia] = STATUS_CONFIG.reduce((acc, status) => {
            acc[status.key] = 0;
            return acc;
          }, {});
        });

        revisionesFiltradasParaGraficas.forEach((revision) => {
          if (!revision.fechaRegistro) return;
          const fecha = new Date(revision.fechaRegistro);
          if (isNaN(fecha.getTime())) return;
          
          const diaSemana = DIAS_ORDEN[fecha.getDay() === 0 ? 6 : fecha.getDay() - 1];
          if (diaSemana) {
            diasData[diaSemana][revision.estatus] = (diasData[diaSemana][revision.estatus] || 0) + 1;
          }
        });
        
        resultado = {
          labels: DIAS_ORDEN,
          datasets: STATUS_CONFIG.map((status) => ({
            label: status.label,
            data: DIAS_ORDEN.map(dia => diasData[dia][status.key] || 0),
            borderColor: status.color,
            backgroundColor: status.background.replace('0.35', '0.35'),
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#fff',
            pointBorderColor: status.color,
            spanGaps: true,
          }))
        };
      }
      
      return resultado;
    } else if (chartTimeTab === 'semana') {
      // Datos por semana específica (Lunes a Domingo)
      if (selectedWeek) {
        // Obtener rango de fechas de la semana seleccionada
        const weeks = generateWeeks(selectedYear ? parseInt(selectedYear) : null);
        const weekData = weeks.find(w => w.value === parseInt(selectedWeek));
        
        console.log('Semana seleccionada:', selectedWeek);
        console.log('WeekData encontrado:', weekData);
        
        if (weekData) {
          // Filtrar revisiones dentro del rango de la semana
          const revisionesDeSemana = revisionesFiltradasParaGraficas.filter((revision) => {
            if (!revision.fechaRegistro) return false;
            const fechaRevision = new Date(revision.fechaRegistro);
            const enRango = fechaRevision >= weekData.start && fechaRevision <= weekData.end;
            
            console.log('Revisión:', revision.fechaRegistro, 'Fecha:', fechaRevision.toISOString().split('T')[0], 
                       'Start:', weekData.start.toISOString().split('T')[0], 
                       'End:', weekData.end.toISOString().split('T')[0], 
                       'En rango:', enRango);
            
            return enRango;
          });
          
          console.log('Revisiones de la semana:', revisionesDeSemana.length);
          
          // Agrupar por estatus
          const estatusCounts = STATUS_CONFIG.reduce((acc, status) => {
            acc[status.key] = revisionesDeSemana.filter(r => r.estatus === status.key).length;
            return acc;
          }, {});
          
          resultado = {
            labels: [`Semana ${selectedWeek} (${weekData.start.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })} - ${weekData.end.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })})`],
            datasets: STATUS_CONFIG.map((status) => ({
              label: status.label,
              data: [estatusCounts[status.key] || 0],
              borderColor: status.color,
              backgroundColor: status.background,
              tension: 0.4,
              spanGaps: true,
            }))
          };
        } else {
          resultado = {
            labels: [],
            datasets: STATUS_CONFIG.map((status) => ({
              label: status.label,
              data: [],
              borderColor: status.color,
              backgroundColor: status.background,
              tension: 0.4,
              spanGaps: true,
            }))
          };
        }
      } else {
        // Si no hay semana seleccionada, mostrar últimas 12 semanas
        const semanasData = {};
        const now = new Date();
        
        // Inicializar últimas 12 semanas
        for (let i = 11; i >= 0; i--) {
          const semanaInicio = new Date(now);
          semanaInicio.setDate(now.getDate() - (i * 7));
          const semanaNum = getISOWeekNumber(semanaInicio);
          const semanaKey = `Sem ${semanaNum}`;
          semanasData[semanaKey] = STATUS_CONFIG.reduce((acc, status) => {
            acc[status.key] = 0;
            return acc;
          }, {});
        }

        // Procesar todas las revisiones
        revisionesFiltradasParaGraficas.forEach((revision) => {
          if (!revision.fechaRegistro) return;
          const fecha = new Date(revision.fechaRegistro);
          if (isNaN(fecha.getTime())) return;
          
          const semanaNum = getISOWeekNumber(fecha);
          const semanaKey = `Sem ${semanaNum}`;
          
          if (!semanasData[semanaKey]) {
            semanasData[semanaKey] = STATUS_CONFIG.reduce((acc, status) => {
              acc[status.key] = 0;
              return acc;
            }, {});
          }
          
          semanasData[semanaKey][revision.estatus] = (semanasData[semanaKey][revision.estatus] || 0) + 1;
        });
        
        // Mostrar semanas con datos en orden descendente
        const semanasConDatos = Object.keys(semanasData).filter(semana => {
          return Object.values(semanasData[semana]).some(val => val > 0);
        }).sort((a, b) => {
          const weekA = parseInt(a.replace('Sem ', ''));
          const weekB = parseInt(b.replace('Sem ', ''));
          return weekB - weekA;
        });
        
        resultado = {
          labels: semanasConDatos,
          datasets: STATUS_CONFIG.map((status) => ({
            label: status.label,
            data: semanasConDatos.map(semana => semanasData[semana][status.key] || 0),
            borderColor: status.color,
            backgroundColor: status.background,
            tension: 0.4,
            spanGaps: true,
          }))
        };
      }
      
      return resultado;
    } else if (chartTimeTab === 'año') {
      // Datos por año
      const añosData = {};
      
      let contadorFiltradas = 0;
      revisionesFiltradasParaGraficas.forEach((revision) => {
        if (!revision.fechaRegistro) return;
        const fecha = new Date(revision.fechaRegistro);
        if (isNaN(fecha.getTime())) return;
        const año = fecha.getFullYear().toString();
        
        // Filtrar por año específico si está seleccionado
        if (selectedYear && año !== selectedYear) return;
        
        contadorFiltradas++;
        
        if (!añosData[año]) {
          añosData[año] = STATUS_CONFIG.reduce((acc, status) => {
            acc[status.key] = 0;
            return acc;
          }, {});
        }
        
        añosData[año][revision.estatus] = (añosData[año][revision.estatus] || 0) + 1;
      });

      return {
        labels: Object.keys(añosData).sort(),
        datasets: STATUS_CONFIG.map((status) => ({
          label: status.label,
          data: Object.keys(añosData).sort().map(año => añosData[año][status.key] || 0),
          borderColor: status.color,
          backgroundColor: status.background.replace('0.35', '0.35'),
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#fff',
          pointBorderColor: status.color,
          spanGaps: true,
        }))
      };
    } else {
      // Mensual (usar monthlyLineData ya declarado)
      return monthlyLineData;
    }
  }, [revisionesFiltradasParaGraficas, chartTimeTab, monthlyLineData, selectedDay, selectedWeek, selectedYear]);

  // Datos filtrados para top almacenes por período
  const topAlmacenesByPeriod = useMemo(() => {
    const almacenesCount = {};
    
    revisionesFiltradasParaGraficas.forEach((revision) => {
      if (!revision.fechaRegistro || !revision.almacen) return;
      const fecha = new Date(revision.fechaRegistro);
      if (isNaN(fecha.getTime())) return;
      
      // Aplicar mismos filtros de tiempo que getRevisionesByPeriod
      if (chartTimeTab === 'dia' && selectedDay) {
        const revisionDate = fecha.toISOString().split('T')[0];
        if (revisionDate !== selectedDay) return;
      } else if (chartTimeTab === 'semana' && selectedWeek) {
        // Usar la misma lógica que generateWeeks para calcular la semana
        const weeks = generateWeeks(fecha.getFullYear());
        const weekData = weeks.find(w => w.value === parseInt(selectedWeek));
        if (weekData) {
          if (fecha < weekData.start || fecha > weekData.end) return;
        } else {
          return;
                }
      } else if (chartTimeTab === 'año' && selectedYear) {
        if (fecha.getFullYear().toString() !== selectedYear) return;
      } else if (chartTimeTab === 'mes' && mesSeleccionadoTopAlmacenes) {
        // CORRECCIÓN: Filtro de mes por número
        const mesRevision = fecha.getMonth(); // 0-11
        const añoRevision = fecha.getFullYear();
        
        // Parsear mesSeleccionadoTopAlmacenes "Diciembre de 2025"
        const [mesNombre, , añoStr] = mesSeleccionadoTopAlmacenes.split(' ');
        const mesSeleccionado = MESES_ORDEN.indexOf(mesNombre); // 0-11
        const añoSeleccionado = parseInt(añoStr);
        
        if (mesRevision !== mesSeleccionado || añoRevision !== añoSeleccionado) return;
      }
      
      almacenesCount[revision.almacen] = (almacenesCount[revision.almacen] || 0) + 1;
    });
    
    return Object.entries(almacenesCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([almacen, total]) => ({ almacen, total }));
  }, [revisionesFiltradasParaGraficas, chartTimeTab, selectedDay, selectedWeek, selectedYear, mesSeleccionadoTopAlmacenes]);

  // Datos para gráfica de almacenes filtrados
  const almacenesChartDataByPeriod = useMemo(() => ({
    labels: topAlmacenesByPeriod.map(item => item.almacen),
    datasets: [{
      label: 'Revisiones',
      data: topAlmacenesByPeriod.map(item => item.total),
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
    }]
  }), [topAlmacenesByPeriod]);

  const monthlyLineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        },
        filler: {
          propagate: false,
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
      elements: {
        line: {
          fill: false,
        },
        point: {
          fill: false,
        },
      },
      datasets: {
        line: {
          fill: false,
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
  }, [revisionesFiltradasParaGraficas]);

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
                <div className="row mb-4" data-tab="tabla">
                  <div className="col-12">
                    <div className="card bg-light border-0 shadow-sm">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                          <h6 className="card-title mb-0 text-primary">
                            <i className="fas fa-filter me-2"></i>
                            Filtros y Búsqueda
                          </h6>
                          <button 
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => {
                              setFiltroColor('');
                              setFiltroAlmacen('');
                              setFiltroArea('');
                              setFiltroQuienRealiza('');
                              setFiltroEstatus('');
                              setFiltroTitulo('');
                            }}
                          >
                            <i className="fas fa-eraser me-1"></i>
                            Limpiar Todo
                          </button>
                        </div>
                        
                        {/* Barra de búsqueda principal */}
                        <div className="row mb-4">
                          <div className="col-12">
                            <div className="input-group input-group-lg">
                              <span className="input-group-text bg-primary text-white border-0">
                                <i className="fas fa-search"></i>
                              </span>
                              <input
                                type="text"
                                className="form-control border-0 shadow-sm"
                                style={{fontSize: '16px', fontWeight: '500'}}
                                placeholder="🔍 Buscar por título..."
                                value={filtroTitulo}
                                onChange={(e) => setFiltroTitulo(e.target.value)}
                              />
                              {filtroTitulo && (
                                <span className="input-group-text bg-light border-0">
                                  <span className="badge bg-primary">{revisionesFiltradas.length} resultados</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Filtros secundarios */}
                        <div className="row g-3">
                          <div className="col-md-2">
                            <label className="form-label small text-muted fw-semibold">Almacen/Sucursal</label>
                            <select 
                              className="form-select form-select-sm border-0 shadow-sm"
                              value={filtroAlmacen}
                              onChange={(e) => setFiltroAlmacen(e.target.value)}
                            >
                              <option value="">📍 Todos</option>
                              {almacenesUnicos.map(almacen => (
                                <option key={almacen} value={almacen}>🏢 {almacen}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small text-muted fw-semibold">Área que Solicita</label>
                            <select 
                              className="form-select form-select-sm border-0 shadow-sm"
                              value={filtroArea}
                              onChange={(e) => setFiltroArea(e.target.value)}
                            >
                              <option value="">🔧 Todas</option>
                              {areasUnicas.map(area => (
                                <option key={area} value={area}>⚙️ {area}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small text-muted fw-semibold">Quién Realiza</label>
                            <select 
                              className="form-select form-select-sm border-0 shadow-sm"
                              value={filtroQuienRealiza}
                              onChange={(e) => setFiltroQuienRealiza(e.target.value)}
                            >
                              <option value="">👤 Todos</option>
                              {quienesRealizanUnicos.map(quien => (
                                <option key={quien} value={quien}>👥 {quien}</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small text-muted fw-semibold">Estatus</label>
                            <select 
                              className="form-select form-select-sm border-0 shadow-sm"
                              value={filtroEstatus}
                              onChange={(e) => setFiltroEstatus(e.target.value)}
                            >
                              <option value="">📊 Todos</option>
                              <option value="pendiente">⏳ Pendiente</option>
                              <option value="en_proceso">🔄 En Proceso</option>
                              <option value="enviada">📤 Enviada</option>
                              <option value="cancelada">❌ Cancelada</option>
                              <option value="plazo_vencido">⚠️ P. vencido</option>
                              <option value="no_realizada">🚫 No realizada</option>
                            </select>
                          </div>
                          <div className="col-md-2">
                            <label className="form-label small text-muted fw-semibold">Días en Espera</label>
                            <select 
                              className="form-select form-select-sm border-0 shadow-sm"
                              value={filtroColor}
                              onChange={(e) => setFiltroColor(e.target.value)}
                            >
                              <option value="">📅 Todos</option>
                              <option value="verde">🟢 0-10 días (Verde)</option>
                              <option value="amarillo">🟡 11-20 días (Amarillo)</option>
                              <option value="naranja">🟠 21-30 días (Naranja)</option>
                              <option value="rojo">🔴 31+ días (Rojo)</option>
                            </select>
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
                                onChange={(e) => {
                                  const selectedDate = new Date(e.target.value);
                                  const today = new Date();
                                  today.setHours(23, 59, 59, 999);
                                  if (selectedDate <= today) {
                                    handleFechaIncidenteChange(revision.id, e.target.value);
                                  }
                                }}
                                max={getMaxDate()}
                                title="Solo se permiten fechas de hoy hacia atrás"
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
                              <option value="plazo_vencido">P. vencido</option>
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

                {/* Modal de nueva revisión dentro de la pestaña de tabla */}
                <NuevaRevisionModal
                  isOpen={showModal}
                  onClose={handleCloseModal}
                  onSubmit={handleSubmitRevision}
                  loading={loading}
                />
              </>
            ) : (
              <>
                <div className="row mb-4">
                  <div className="col-12">
                    <div className="card bg-light">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="card-title mb-0">
                            <i className="fas fa-clock me-2"></i>
                            Periodo de Tiempo
                          </h6>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            onClick={clearAllFilters}
                            title="Limpiar filtros y poner día de hoy"
                          >
                            <i className="fas fa-times me-1"></i>
                            Limpiar
                          </button>
                        </div>
                        {/* Primera fila: Pestañas de periodo */}
                        <div className="d-flex justify-content-start mb-3">
                          <ul className="nav nav-pills nav-pills-lg" role="tablist">
                            <li className="nav-item" role="presentation">
                              <button
                                className={`nav-link ${chartTimeTab === 'dia' ? 'active' : ''}`}
                                onClick={() => handleChartTimeTabChange('dia')}
                                type="button"
                              >
                                <i className="fas fa-calendar-day me-2"></i>
                                Día
                              </button>
                            </li>
                            <li className="nav-item" role="presentation">
                              <button
                                className={`nav-link ${chartTimeTab === 'semana' ? 'active' : ''}`}
                                onClick={() => handleChartTimeTabChange('semana')}
                                type="button"
                              >
                                <i className="fas fa-calendar-week me-2"></i>
                                Semana
                              </button>
                            </li>
                            <li className="nav-item" role="presentation">
                              <button
                                className={`nav-link ${chartTimeTab === 'mes' ? 'active' : ''}`}
                                onClick={() => handleChartTimeTabChange('mes')}
                                type="button"
                              >
                                <i className="fas fa-calendar-alt me-2"></i>
                                Mes
                              </button>
                            </li>
                            <li className="nav-item" role="presentation">
                              <button
                                className={`nav-link ${chartTimeTab === 'año' ? 'active' : ''}`}
                                onClick={() => handleChartTimeTabChange('año')}
                                type="button"
                              >
                                <i className="fas fa-calendar me-2"></i>
                                Año
                              </button>
                            </li>
                          </ul>
                        </div>

                        {/* Segunda fila: Filtros específicos */}
                        <div className="d-flex flex-wrap gap-3 p-3 bg-light rounded-3 border align-items-end">
                          {/* Filtro por Ubicación */}
                          <div className="flex-shrink-0">
                            <label className="form-label small fw-semibold text-primary mb-2">
                              <i className="fas fa-map-marker-alt me-2"></i>
                              Ubicación
                            </label>
                            <select 
                              className="form-select form-select-sm border-2 shadow-sm"
                              style={{ borderColor: '#6366f1', borderRadius: '8px', minWidth: '150px' }}
                              value={filtroUbicacionGraficas}
                              onChange={(e) => setFiltroUbicacionGraficas(e.target.value)}
                            >
                              <option value="">Todas</option>
                              {ubicacionesUnicas.map(ubicacion => (
                                <option key={ubicacion} value={ubicacion}>{ubicacion}</option>
                              ))}
                            </select>
                          </div>

                          {/* Filtro específico según el periodo */}
                          <div className="flex-shrink-0">
                            <label className="form-label small fw-semibold text-primary mb-2">
                              {chartTimeTab === 'dia' && <><i className="fas fa-calendar-day me-2"></i>Día</>}
                              {chartTimeTab === 'semana' && <><i className="fas fa-calendar-week me-2"></i>Semana</>}
                              {chartTimeTab === 'mes' && <><i className="fas fa-calendar-alt me-2"></i>Mes</>}
                              {chartTimeTab === 'año' && <><i className="fas fa-calendar me-2"></i>Año</>}
                            </label>
                            {chartTimeTab === 'dia' && (
                              <input
                                type="date"
                                className="form-control form-control-sm border-2 shadow-sm"
                                style={{ borderColor: '#6366f1', borderRadius: '8px', minWidth: '150px' }}
                                value={selectedDay}
                                onChange={(e) => {
                                  const selectedDate = new Date(e.target.value);
                                  const today = new Date();
                                  today.setHours(23, 59, 59, 999);
                                  if (selectedDate <= today) {
                                    setSelectedDay(e.target.value);
                                  }
                                }}
                                max={getMaxDate()}
                                title="Solo se permiten fechas de hoy hacia atrás"
                              />
                            )}
                            {chartTimeTab === 'semana' && (
                              <select
                                className="form-select form-select-sm border-2 shadow-sm"
                                style={{ borderColor: '#6366f1', borderRadius: '8px', minWidth: '200px' }}
                                value={selectedWeek}
                                onChange={(e) => setSelectedWeek(e.target.value)}
                              >
                                <option value="">Seleccionar semana</option>
                                {generateWeeks(selectedYear ? parseInt(selectedYear) : null).map((week) => (
                                  <option key={week.value} value={week.value}>
                                    {week.label}
                                  </option>
                                ))}
                              </select>
                            )}
                            {chartTimeTab === 'mes' && (
                              <select
                                className="form-select form-select-sm border-2 shadow-sm"
                                style={{ borderColor: '#6366f1', borderRadius: '8px', minWidth: '150px' }}
                                value={mesSeleccionadoTopAlmacenes}
                                onChange={(e) => setMesSeleccionadoTopAlmacenes(e.target.value)}
                              >
                                <option value="">Todos los meses</option>
                                {generateAvailableMonths(selectedYear ? parseInt(selectedYear) : null).map((mes) => (
                                  <option key={mes.value} value={mes.value}>
                                    {mes.label}
                                  </option>
                                ))}
                              </select>
                            )}
                            {chartTimeTab === 'año' && (
                              <select
                                className="form-select form-select-sm border-2 shadow-sm"
                                style={{ borderColor: '#6366f1', borderRadius: '8px', minWidth: '120px' }}
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                              >
                                <option value="">Seleccionar año</option>
                                {generateYears().map((year) => (
                                  <option key={year.value} value={year.value}>
                                    {year.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Badge informativo */}
                          <div className="flex-shrink-0">
                            <label className="form-label small mb-2">&nbsp;</label>
                            <div className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill">
                              <i className="fas fa-info-circle me-1"></i>
                              {chartTimeTab === 'dia' && (selectedDay ? `Día: ${selectedDay}` : 'Sin día')}
                              {chartTimeTab === 'semana' && (selectedWeek ? `Semana ${selectedWeek}` : 'Sin semana')}
                              {chartTimeTab === 'mes' && (mesSeleccionadoTopAlmacenes ? mesSeleccionadoTopAlmacenes : 'Todos')}
                              {chartTimeTab === 'año' && (selectedYear ? `Año: ${selectedYear}` : 'Sin año')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

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
                        {estatusChartData.datasets?.[0]?.data?.some((value) => value > 0) ? (
                          <div className="d-flex flex-column flex-lg-row align-items-center gap-3">
                            <div style={{ height: 260, width: '100%' }}>
                              <Pie data={estatusChartData} options={estatusChartOptions} />
                            </div>
                            <div className="w-100">
                              {STATUS_CONFIG.map((status) => {
                                const value = revisionesFiltradasParaGraficas.filter((rev) => rev.estatus === status.key).length;
                                return (
                                  <div
                                    key={status.key}
                                    className="d-flex justify-content-between align-items-center border rounded py-1 px-2 mb-2 bg-light"
                                  >
                                    <div className="d-flex align-items-center">
                                      <span className="badge rounded-circle me-2" style={{ backgroundColor: status.color, width: 10, height: 10 }}></span>
                                      <span className="fw-semibold">{status.label}</span>
                                    </div>
                                    <span className="text-muted">{value}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-muted py-5">
                            <i className="fas fa-chart-pie fa-2x mb-2"></i>
                            <p className="mb-0">Sin datos para el periodo seleccionado</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-8">
                    <div className="card h-100 border-0 shadow-sm">
                      <div className="card-header bg-white border-0">
                        <h6 className="mb-0 text-uppercase text-muted">
                          <i className="fas fa-store-alt me-1 text-primary"></i>
                          Top almacenes
                        </h6>
                      </div>
                      <div className="card-body">
                        {topAlmacenesByPeriod.length > 0 ? (
                          <div className="row g-4">
                            <div className="col-md-8">
                              <div style={{ height: 300 }}>
                                <Bar data={almacenesChartDataByPeriod} options={almacenesChartOptions} />
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="border rounded p-2">
                                <h6 className="text-muted mb-2 small">Top almacenes</h6>
                                <div className="small">
                                  {topAlmacenesByPeriod.map((almacen, index) => (
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
                            <p className="mb-0">No hay datos para el periodo seleccionado</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {chartTimeTab !== 'dia' && (
                  <div className="col-12">
                    <div className="card border-0 shadow-sm">
                      <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 text-uppercase text-muted">
                          <i className="fas fa-wave-square me-1 text-primary"></i>
                          Tendencia por estatus
                        </h6>
                        <small className="text-muted">
                          {chartTimeTab === 'semana' && 'Últimas 12 semanas'}
                          {chartTimeTab === 'mes' && 'Periodo mensual'}
                          {chartTimeTab === 'año' && 'Por año'}
                        </small>
                      </div>
                      <div className="card-body">
                        {getRevisionesByPeriod.datasets?.some((dataset) => dataset.data.some((value) => value > 0)) ? (
                          <>
                            <div className="d-flex flex-wrap justify-content-center gap-2 mb-3">
                              {getRevisionesByPeriod.labels?.map((label, index) => {
                                const dataset = getRevisionesByPeriod.datasets?.[0];
                                const value = dataset?.data?.[index] || 0;
                                const status = STATUS_CONFIG[index];
                                return (
                                  <div
                                    key={label}
                                    className="d-flex align-items-center px-3 py-2 rounded-pill bg-light border"
                                  >
                                    <span className="badge rounded-circle me-2" style={{ backgroundColor: status.color, width: 10, height: 10 }}></span>
                                    <span className="fw-semibold me-2 text-dark">{status.label}</span>
                                    <span className="text-muted">{value}</span>
                                  </div>
                                );
                              })}
                            </div>
                            <div style={{ height: 360 }}>
                              <Line 
                                key={`chart-${chartTimeTab}-${selectedDay || ''}-${selectedWeek || ''}-${selectedYear || ''}`}
                                data={getRevisionesByPeriod} 
                                options={monthlyLineOptions} 
                              />
                            </div>
                          </>
                        ) : (
                          <div className="text-center text-muted py-5">
                            <i className="fas fa-chart-line fa-2x mb-2"></i>
                            <p className="mb-0">No hay datos para el periodo seleccionado</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <NuevaRevisionModal
                  isOpen={showModal}
                  onClose={handleCloseModal}
                  onSubmit={handleSubmitRevision}
                  loading={loading}
                />

                {modalFeedback.visible && (
                  <div key={`feedback-${Date.now()}`} className="register-modal-backdrop">
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
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CapturaRevisiones;
