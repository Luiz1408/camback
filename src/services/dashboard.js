import api from './api';

export const dashboardService = {
  // Obtener métricas principales
  async getMetrics() {
    try {
      const response = await api.get('/Dashboard/metrics');
      return response.data;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }
  },

  // Obtener resumen diario
  async getDailySummary() {
    try {
      const response = await api.get('/Dashboard/summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      throw error;
    }
  },

  // Obtener estadísticas generales
  async getGeneralStats() {
    try {
      const response = await api.get('/Dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching general stats:', error);
      throw error;
    }
  }
};
