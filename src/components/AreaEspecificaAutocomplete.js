import React, { useState, useEffect, useRef } from 'react';
import api, { getAreaEspecificaHistorial, saveAreaEspecifica } from '../services/api';

const AreaEspecificaAutocomplete = ({ value, onChange, disabled = false, placeholder = "Área específica..." }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [allSuggestions, setAllSuggestions] = useState([]); // Guardar todas las áreas
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Cargar sugerencias previas cuando el componente se monta
  useEffect(() => {
    loadPreviousAreas();
  }, []);

  // Sincronizar valor externo
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const loadPreviousAreas = async () => {
    try {
      setLoading(true);
      console.log('Cargando áreas específicas...');
      const areasData = await getAreaEspecificaHistorial();
      console.log('Datos recibidos del API:', areasData);
      
      // Extraer solo los valores de las áreas
      const areaValues = areasData.map(area => area.valor);
      console.log('Valores de áreas extraídos:', areaValues);
      
      setAllSuggestions(areaValues); // Guardar todas las áreas
      setSuggestions(areaValues); // Mostrar todas inicialmente
      console.log('Sugerencias establecidas:', areaValues);
    } catch (error) {
      console.error('Error cargando áreas previas:', error);
      setAllSuggestions([]);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const saveNewArea = async (areaText) => {
    if (!areaText.trim()) return;
    
    try {
      await saveAreaEspecifica({ valor: areaText.trim() });
      // Recargar sugerencias
      loadPreviousAreas();
    } catch (error) {
      console.error('Error guardando área específica:', error);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);

    console.log('Input cambiado:', newValue);
    console.log('AllSuggestions actuales:', allSuggestions);

    // Filtrar sugerencias basadas en lo que se escribe
    if (newValue.trim()) {
      const filtered = allSuggestions.filter(area => 
        area.toLowerCase().includes(newValue.toLowerCase())
      );
      console.log('Sugerencias filtradas:', filtered);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions(allSuggestions);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    onChange(suggestion);
    setShowSuggestions(false);
  };

  const handleBlur = () => {
    // Guardar el nuevo valor si no existe en las sugerencias
    setTimeout(() => {
      if (inputValue.trim() && !suggestions.includes(inputValue.trim())) {
        saveNewArea(inputValue);
      }
      setShowSuggestions(false);
    }, 200); // Pequeño delay para permitir clic en sugerencias
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setShowSuggestions(false);
      if (inputValue.trim() && !suggestions.includes(inputValue.trim())) {
        saveNewArea(inputValue);
      }
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Clic fuera del componente para cerrar sugerencias
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="area-especificica-autocomplete position-relative" ref={inputRef}>
      <input
        type="text"
        className="form-control form-control-sm"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={() => inputValue.trim() && setShowSuggestions(true)}
        disabled={disabled || loading}
        placeholder={placeholder}
      />
      
      {loading && (
        <div className="position-absolute end-0 top-50 translate-middle-y me-2">
          <div className="spinner-border spinner-border-sm text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="position-absolute w-100 bg-white border border-secondary rounded shadow-lg mt-1 z-1000" 
             style={{ maxHeight: '200px', overflowY: 'auto', zIndex: 1000 }}>
          {console.log('Renderizando sugerencias:', suggestions)}
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-3 py-2 cursor-pointer hover-bg-light"
              style={{ cursor: 'pointer' }}
              onMouseDown={(e) => e.preventDefault()} // Prevenir blur antes del click
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <small className="text-muted">{suggestion}</small>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .hover-bg-light:hover {
          background-color: #f8f9fa;
        }
        
        .z-1000 {
          z-index: 1000;
        }
      `}</style>
    </div>
  );
};

export default AreaEspecificaAutocomplete;
