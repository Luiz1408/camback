import React from 'react';

const UnifiedModal = ({ 
  show, 
  onClose, 
  title, 
  onSubmit, 
  submitText = "Crear", 
  submitDisabled = false,
  children,
  loading = false 
}) => {
  if (!show) return null;

  return (
    <div className="password-modal-backdrop">
      <div className="card password-modal shadow-lg border-0">
        <div className="card-header border-0">
          <h5 className="mb-0">{title}</h5>
          <button 
            className="btn-close btn-close-white"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar"
          />
        </div>
        
        <div className="card-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {children}
        </div>
        
        <div className="card-footer border-0 bg-transparent">
          <button
            className="btn btn-secondary me-2"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          {onSubmit && (
            <button
              className="btn btn-primary"
              onClick={onSubmit}
              disabled={submitDisabled || loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Procesando...
                </>
              ) : submitText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedModal;
