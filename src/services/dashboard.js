import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5235';

export const dashboardService = {
  // Obtener métricas principales
  async getMetrics() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/dashboard/metrics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }
  },

  // Obtener resumen diario
  async getDailySummary() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/dashboard/summary`);
      return response.data;
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      throw error;
    }
  },

  // Obtener estadísticas generales
  async getGeneralStats() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/dashboard/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching general stats:', error);
      throw error;
    }
  }
};
