import React from 'react';
import ReactDOM from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { UserManagementProvider } from './contexts/UserManagementContext';
import { ToastProvider } from './contexts/ToastContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <UserManagementProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </UserManagementProvider>
    </AuthProvider>
  </React.StrictMode>
);