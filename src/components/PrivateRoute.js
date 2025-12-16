import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  // Mientras carga, mostrar spinner o nada
  if (loading) {
    return <div className="d-flex justify-content-center align-items-center" style={{height: '100vh'}}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Cargando...</span>
      </div>
    </div>;
  }
  
  // Si no hay usuario actual, redirigir al login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // Si hay usuario, permitir acceso
  return children;
};

export default PrivateRoute;