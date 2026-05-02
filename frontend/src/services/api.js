import axios from 'axios';

// Base URL for all API calls
const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Automatically attach the JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401 responses
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:   (data) => api.post('/auth/login', data),
  signup:  (data) => api.post('/auth/signup', data),
  me:      ()     => api.get('/auth/me'),
  getUsers:()     => api.get('/auth/users'),
};

// ── Projects ─────────────────────────────────────────────────────────────────
export const projectsAPI = {
  getAll:       ()           => api.get('/projects/'),
  getOne:       (id)         => api.get(`/projects/${id}`),
  create:       (data)       => api.post('/projects/', data),
  update:       (id, data)   => api.put(`/projects/${id}`, data),
  delete:       (id)         => api.delete(`/projects/${id}`),
  addMember:    (id, userId) => api.post(`/projects/${id}/members`, { user_id: userId }),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const tasksAPI = {
  getAll:    (params) => api.get('/tasks/', { params }),
  getOne:    (id)     => api.get(`/tasks/${id}`),
  create:    (data)   => api.post('/tasks/', data),
  update:    (id, data) => api.put(`/tasks/${id}`, data),
  delete:    (id)     => api.delete(`/tasks/${id}`),
  dashboard: ()       => api.get('/tasks/dashboard'),
};

export default api;
