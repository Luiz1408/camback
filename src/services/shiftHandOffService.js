import api from './api';

// Obtener todas las notas de entrega de turno
export const getShiftHandOffNotes = async () => {
  try {
    const response = await api.get('/ShiftHandOff');
    return response.data.notes || [];
  } catch (error) {
    throw new Error(`Error al obtener notas: ${error.message}`);
  }
};

// Crear una nueva nota de entrega de turno
export const createShiftHandOffNote = async (noteData) => {
  try {
    const response = await api.post('/ShiftHandOff', noteData);
    return response.data; // El backend retorna la nota directamente, no dentro de un objeto 'note'
  } catch (error) {
    throw new Error(`Error al crear nota: ${error.message}`);
  }
};

// Actualizar una nota de entrega de turno
export const updateShiftHandOffNote = async (id, noteData) => {
  try {
    const response = await api.put(`/ShiftHandOff/${id}`, noteData);
    return response.data; // El backend retorna la nota directamente, no dentro de un objeto 'note'
  } catch (error) {
    throw new Error(`Error al actualizar nota: ${error.message}`);
  }
};

// Eliminar una nota de entrega de turno
export const deleteShiftHandOffNote = async (id) => {
  try {
    await api.delete(`/ShiftHandOff/${id}`);
    return true;
  } catch (error) {
    throw new Error(`Error al eliminar nota: ${error.message}`);
  }
};

// Toggle acknowledgement (reconocimiento) de una nota
export const toggleAcknowledgement = async (noteId, coordinatorUserId, isAcknowledged) => {
  try {
    const response = await api.put(`/ShiftHandOff/${noteId}/acknowledgements`, {
      coordinatorUserId,
      isAcknowledged
    });
    return response.data.acknowledgement;
  } catch (error) {
    throw new Error(`Error al actualizar reconocimiento: ${error.message}`);
  }
};
