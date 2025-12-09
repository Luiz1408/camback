import React, { useState, useRef, useEffect } from 'react';
import './AutocompleteDropdown.css';

const AutocompleteDropdown = ({
  name,
  value,
  onChange,
  options,
  placeholder = 'Seleccionar o escribir...',
  disabled = false,
  required = false,
  error = null,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [filteredOptions, setFilteredOptions] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    // Actualizar el valor del input cuando cambia el valor externo
    const selectedOption = options.find(opt => opt.valor && opt.valor.toString() === value);
    setInputValue(selectedOption ? selectedOption.valor : (value ? value.toString() : ''));
  }, [value, options]);

  useEffect(() => {
    // Filtrar opciones basadas en el input
    const normalizedInput = (inputValue || '').toString();
    const filtered = options.filter(option =>
      option.valor && option.valor.toString().toLowerCase().includes(normalizedInput.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [inputValue, options]);

  useEffect(() => {
    // Cerrar el dropdown cuando se hace clic fuera
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setIsOpen(true);
    
    // Si el valor coincide exactamente con una opción, actualizamos el valor
    const exactMatch = options.find(opt => opt.valor && opt.valor.toString() === value);
    if (exactMatch) {
      onChange({ target: { name, value: exactMatch.valor } });
    } else {
      onChange({ target: { name, value } });
    }
  };

  const handleOptionClick = (option) => {
    setInputValue(option.valor);
    onChange({ target: { name, value: option.valor } });
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`autocomplete-dropdown ${className}`} ref={wrapperRef}>
      <div className="input-group">
        <input
          type="text"
          className={`form-control ${error ? 'is-invalid' : ''}`}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
        />
        <button
          type="button"
          className="btn btn-outline-secondary dropdown-toggle"
          onClick={handleToggleDropdown}
          disabled={disabled}
        >
          <span className="caret"></span>
        </button>
      </div>
      
      {error && <div className="invalid-feedback">{error}</div>}
      
      {isOpen && !disabled && (
        <ul className="autocomplete-dropdown-menu">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <li
                key={option.id || index}
                className={`autocomplete-option ${option.valor === inputValue ? 'selected' : ''}`}
                onClick={() => handleOptionClick(option)}
              >
                {option.valor}
              </li>
            ))
          ) : (
            <li className="autocomplete-no-results">
              No se encontraron resultados
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default AutocompleteDropdown;
