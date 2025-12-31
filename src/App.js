import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RevisionesEntregadas from './pages/RevisionesEntregadas';
import CapturaRevisiones from './pages/CapturaRevisiones';
import Charts from './pages/Charts';
import EntregaTurnoMonitoreo from './pages/EntregaTurnoMonitoreo';
import PlaneacionTecnica from './pages/PlaneacionTecnica';
import AdminCatalogos from './components/AdminCatalogos';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route
            path="/revisiones-entregadas"
            element={
              <PrivateRoute>
                <RevisionesEntregadas />
              </PrivateRoute>
            }
          />
          <Route
            path="/captura-revisiones"
            element={
              <PrivateRoute>
                <CapturaRevisiones />
              </PrivateRoute>
            }
          />
          <Route
            path="/charts"
            element={
              <PrivateRoute>
                <Charts />
              </PrivateRoute>
            }
          />
          <Route
            path="/entrega-turno"
            element={
              <PrivateRoute>
                <EntregaTurnoMonitoreo />
              </PrivateRoute>
            }
          />
          <Route
            path="/planeacion-tecnica"
            element={
              <PrivateRoute>
                <PlaneacionTecnica />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin-catalogos"
            element={
              <PrivateRoute>
                <AdminCatalogos />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </div>
    </Router>
  );
}

export default App;
