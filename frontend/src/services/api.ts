import axios from 'axios';
import {
  AuthResponse,
  User,
  Dataset,
  DatasetDetail,
  DatasetPreview,
  EdaSummary,
  FeatureSelectionResponse,
  ModelRun,
  SinglePredictionResponse,
  BatchPredictionResponse,
  PredictionRecord,
  DashboardStats
} from '../types';

const getApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (!envUrl) return '/api';
  const clean = String(envUrl).trim().replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

export const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or invalid
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (data: { email: string; password: string; full_name: string; role: string; student_id?: string }): Promise<User> => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  getDemoUsers: async () => {
    const res = await api.get('/auth/demo-users');
    return res.data;
  }
};

// Datasets API
export const datasetsApi = {
  list: async (): Promise<Dataset[]> => {
    const res = await api.get('/datasets');
    return res.data;
  },
  get: async (id: number): Promise<DatasetDetail> => {
    const res = await api.get(`/datasets/${id}`);
    return res.data;
  },
  preview: async (id: number, page: number = 1, pageSize: number = 20): Promise<DatasetPreview> => {
    const res = await api.get(`/datasets/${id}/preview?page=${page}&page_size=${pageSize}`);
    return res.data;
  },
  getEda: async (id: number): Promise<EdaSummary> => {
    const res = await api.get(`/datasets/${id}/eda`);
    return res.data;
  },
  upload: async (formData: FormData): Promise<DatasetDetail> => {
    const res = await api.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/datasets/${id}`);
  },
  getSampleDownloadUrl: () => `${API_BASE_URL}/datasets/sample/download`
};

// Features API
export const featuresApi = {
  select: async (data: { dataset_id: number; target_column: string; method: string; k: number }): Promise<FeatureSelectionResponse> => {
    const res = await api.post('/features/select', data);
    return res.data;
  }
};

// Models API
export const modelsApi = {
  list: async (taskType?: string, datasetId?: number): Promise<ModelRun[]> => {
    let url = '/models';
    const params = new URLSearchParams();
    if (taskType) params.append('task_type', taskType);
    if (datasetId) params.append('dataset_id', String(datasetId));
    if (params.toString()) url += `?${params.toString()}`;
    const res = await api.get(url);
    return res.data;
  },
  get: async (id: number): Promise<ModelRun> => {
    const res = await api.get(`/models/${id}`);
    return res.data;
  },
  trainRegression: async (data: {
    dataset_id: number;
    name: string;
    algorithm: string;
    target_column: string;
    selected_features: string[];
    test_size: number;
    random_seed: number;
  }): Promise<ModelRun> => {
    const res = await api.post('/models/train-regression', data);
    return res.data;
  },
  trainClassification: async (data: {
    dataset_id: number;
    name: string;
    algorithm: string;
    target_column: string;
    is_derived_target: boolean;
    source_score_column?: string;
    derived_thresholds?: Record<string, number>;
    selected_features: string[];
    test_size: number;
    random_seed: number;
  }): Promise<ModelRun> => {
    const res = await api.post('/models/train-classification', data);
    return res.data;
  },
  toggleActive: async (id: number): Promise<ModelRun> => {
    const res = await api.patch(`/models/${id}/toggle-active`);
    return res.data;
  }
};

// Predictions API
export const predictionsApi = {
  single: async (data: {
    model_run_id: number;
    student_identifier?: string;
    input_features: Record<string, any>;
  }): Promise<SinglePredictionResponse> => {
    const res = await api.post('/predictions/single', data);
    return res.data;
  },
  batch: async (modelRunId: number, file: File): Promise<BatchPredictionResponse> => {
    const formData = new FormData();
    formData.append('model_run_id', String(modelRunId));
    formData.append('file', file);
    const res = await api.post('/predictions/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  history: async (filters?: { model_run_id?: number; student_id?: string; task_type?: string; limit?: number }): Promise<PredictionRecord[]> => {
    const params = new URLSearchParams();
    if (filters?.model_run_id) params.append('model_run_id', String(filters.model_run_id));
    if (filters?.student_id) params.append('student_id', filters.student_id);
    if (filters?.task_type) params.append('task_type', filters.task_type);
    if (filters?.limit) params.append('limit', String(filters.limit));
    const res = await api.get(`/predictions/history?${params.toString()}`);
    return res.data;
  },
  exportCsvUrl: () => `${API_BASE_URL}/predictions/export`
};

// System API
export const systemApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await api.get('/system/stats');
    return res.data;
  },
  getHealth: async () => {
    const res = await api.get('/health');
    return res.data;
  }
};
