import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';

const NAV_LINKS = [
  { key: 'dashboard', to: '/', label: 'Inicio', end: true },
  { key: 'revisiones-entregadas', to: '/revisiones-entregadas', label: 'Revisiones entregadas' },
  { key: 'captura-revisiones', to: '/captura-revisiones', label: 'Captura revisiones' },
  { key: 'entrega-turno', to: '/entrega-turno', label: 'Entrega de turno' },
  { key: 'entrega-turno-monitoreo', to: '/entrega-turno-monitoreo', label: 'Monitoreo entrega' },
  { key: 'planeacion-tecnica', to: '/planeacion-tecnica', label: 'Planeación técnica' },
  { key: 'admin-catalogos', to: '/admin-catalogos', label: 'Admin Catálogos' },
  { key: 'charts', to: '/charts', label: 'Ver gráficas' },
];

const MainNavbar = ({
  brandLabel,
  displayName,
  role,
  isAdmin,
  onManageUsers,
  onLogout,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const resolvedBrandLabel = (brandLabel || '').trim() || 'CAM TRUPER';

  // Determinar qué enlaces mostrar según el rol
  const getNavLinks = () => {
    if (isAdmin) {
      return NAV_LINKS;
    }
    
    // Determinar si es coordinador o monitorista
    const isCoordinador = role === 'Coordinador' || role === 'coordinador' || role === 'Coordinator';
    const isMonitorista = role === 'Monitorista' || role === 'monitorista' || role === 'Monitor';
    
    if (isCoordinador || isMonitorista) {
      // Coordinadores y monitoristas ven: Inicio, Captura Revisiones, Monitoreo entrega
      return NAV_LINKS.filter(link => 
        link.key === 'dashboard' || 
        link.key === 'captura-revisiones' || 
        link.key === 'entrega-turno-monitoreo'
      );
    }
    
    // Para otros roles, solo mostrar Inicio y Captura Revisiones
    return NAV_LINKS.filter(link => 
      link.key === 'dashboard' || link.key === 'captura-revisiones'
    );
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="navbar navbar-expand-lg truper-navbar shadow-sm fixed-top">
      <div className="container-fluid px-0 d-flex align-items-center justify-content-between">
        <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-3">
          <div className="d-flex flex-column">
            <span className="navbar-brand fw-semibold mb-0">TRUPER CAM</span>
            <span className="navbar-subtitle small">Plataforma Integral de Operaciones</span>
          </div>
          
          {/* Navegación desktop */}
          <ul className="navbar-nav flex-row flex-wrap gap-2">
            {getNavLinks().map(({ key, to, label, end }) => (
              <li key={key} className="nav-item">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Usuario y acciones */}
        <div className="d-flex flex-column flex-lg-row align-items-lg-center gap-2 gap-lg-3">
          <div className="d-flex flex-column text-end">
            <span className="user-name fw-semibold">{displayName}</span>
            <span className="user-role small text-muted">{role}</span>
          </div>
          <div className="d-flex flex-column flex-lg-row gap-2">
            {isAdmin && typeof onManageUsers === 'function' && (
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={onManageUsers}
              >
                Gestionar usuarios
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={onLogout}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

MainNavbar.propTypes = {
  brandLabel: PropTypes.string,
  displayName: PropTypes.string.isRequired,
  role: PropTypes.string,
  isAdmin: PropTypes.bool,
  onManageUsers: PropTypes.func,
  onLogout: PropTypes.func.isRequired,
};

MainNavbar.defaultProps = {
  brandLabel: 'CAM TRUPER',
  role: '',
  isAdmin: false,
  onManageUsers: undefined,
};

export default MainNavbar;
