import api from './api';

export async function fetchTechnicalActivities() {
  const { data } = await api.get('/TechnicalActivities');
  return data?.activities ?? [];
}

export async function fetchTechnicalActivitiesSummary() {
  const { data } = await api.get('/TechnicalActivities/summary');
  return data ?? { total: 0, pending: 0, completed: 0, notCompleted: 0 };
}

export async function createTechnicalActivity(payload) {
  // Si payload es FormData, enviarlo directamente
  if (payload instanceof FormData) {
    const { data } = await api.post('/TechnicalActivities', payload, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data?.activity ?? null;
  }
  
  // Si no, enviar como JSON (mantener compatibilidad)
  const { data } = await api.post('/TechnicalActivities', payload);
  return data?.activity ?? null;
}

export async function updateTechnicalActivity(id, payload) {
  const { data } = await api.put(`/TechnicalActivities/${id}`, payload);
  return data?.activity ?? null;
}

export async function deleteTechnicalActivity(id) {
  await api.delete(`/TechnicalActivities/${id}`);
}
