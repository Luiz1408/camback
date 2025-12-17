import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const ToastContext = createContext(null);

const TOAST_VARIANT_MAP = {
  success: 'success',
  error: 'danger',
  danger: 'danger',
  warning: 'warning',
  info: 'info',
};

const ToastItem = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast.duration) {
      return undefined;
    }

    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration);

    return () => {
      clearTimeout(timer);
    };
  }, [toast, onDismiss]);

  const variant = TOAST_VARIANT_MAP[toast.type] ?? 'info';

  return (
    <div
      className={`toast show align-items-center text-bg-${variant} border-0 mb-2`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="d-flex">
        <div className="toast-body">{toast.message}</div>
        <button
          type="button"
          className="btn-close btn-close-white me-2 m-auto"
          aria-label="Cerrar"
          onClick={() => onDismiss(toast.id)}
        />
      </div>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    if (!toast || !toast.message) {
      return;
    }

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [
      ...prev,
      {
        id,
        type: toast.type ?? 'info',
        message: toast.message,
        duration: toast.duration ?? 5000,
      },
    ]);
  }, []);

  const contextValue = useMemo(
    () => ({
      addToast,
      removeToast,
    }),
    [addToast, removeToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="toast-container position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
};
