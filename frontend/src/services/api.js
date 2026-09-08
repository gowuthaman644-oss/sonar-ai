import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getStats = async () => {
  const response = await api.get('/stats');
  return response.data;
};

export const getHistory = async () => {
  const response = await api.get('/history');
  return response.data;
};

export const analyzeSonar = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await api.post('/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const getTracks = async () => {
  const response = await api.get('/tracks');
  return response.data;
};

export const getTrackDetail = async (trackId) => {
  const response = await api.get(`/tracks/${trackId}`);
  return response.data;
};

export const submitOperatorFeedback = async ({ detectionId, decision, reason, notes }) => {
  const response = await api.post('/feedback', {
    detection_id: detectionId,
    decision,
    reason,
    notes,
  });
  return response.data;
};

export const getOperatorFeedback = async (detectionId) => {
  const response = await api.get(`/feedback/${detectionId}`);
  return response.data;
};

export default api;
