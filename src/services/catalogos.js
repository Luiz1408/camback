import api from './api';

// Obtener catálogo por tipo
export const getCatalogoByTipo = async (tipo) => {
  try {
    const response = await api.get(`/catalogos/${tipo}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener catálogo ${tipo}:`, error);
    throw error;
  }
};

// Obtener todos los tipos de catálogos
export const getAllTipos = async () => {
  try {
    const response = await api.get('/catalogos');
    return response.data;
  } catch (error) {
    console.error('Error al obtener tipos de catálogos:', error);
    throw error;
  }
};

// Crear nuevo catálogo
export const createCatalogo = async (catalogo) => {
  try {
    const response = await api.post('/catalogos', catalogo);
    if (!response.data) {
      throw new Error('No se recibieron datos en la respuesta');
    }
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error al crear catálogo:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Error al crear el catálogo';
    return { success: false, error: errorMessage };
  }
};

// Actualizar catálogo
export const updateCatalogo = async (id, catalogo) => {
  try {
    const response = await api.put(`/catalogos/${id}`, catalogo);
    if (!response.data) {
      throw new Error('No se recibieron datos en la respuesta');
    }
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error al actualizar catálogo:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Error al actualizar el catálogo';
    return { success: false, error: errorMessage };
  }
};

// Eliminar (desactivar) catálogo
export const deleteCatalogo = async (id) => {
  try {
    const response = await api.delete(`/catalogos/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error al eliminar catálogo:', error);
    throw error;
  }
};
