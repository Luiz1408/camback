import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RevisionesEntregadas from './pages/RevisionesEntregadas';
import Charts from './pages/Charts';
import EntregaTurno from './pages/EntregaTurno';
import PlaneacionTecnica from './pages/PlaneacionTecnica';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/revisiones-entregadas"
            element={
              <PrivateRoute>
                <RevisionesEntregadas />
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
                <EntregaTurno />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;