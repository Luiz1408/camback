import api from './api';

// Crear nuevo folio
export const crearFolio = async (folioData) => {
  try {
    const response = await api.post('/folios/crear-folio', folioData);
    return response.data;
  } catch (error) {
    console.error('Error al crear folio:', error);
    throw error;
  }
};

// Obtener todas las revisiones
export const getRevisiones = async () => {
  try {
    const response = await api.get('/folios/revisiones');
    return response.data;
  } catch (error) {
    console.error('Error al obtener revisiones:', error);
    throw error;
  }
};

// Obtener todas las detecciones
export const getDetecciones = async () => {
  try {
    const response = await api.get('/folios/detecciones');
    return response.data;
  } catch (error) {
    console.error('Error al obtener detecciones:', error);
    throw error;
  }
};
