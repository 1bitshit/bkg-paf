import { fetchWrapper } from './fetchWrapper';
import { API_BASE_URL } from '@/config';

export interface ProviderManagementEntry {
  id: string;
  name: string;
  source: string;
  env: string[];
  key?: string;
  options: Record<string, unknown>;
  models: Record<string, unknown>;
  hasApiKey?: boolean;
}

export interface AddProviderRequest {
  id: string;
  name?: string;
  source?: string;
  env?: string[];
  key?: string;
  options?: Record<string, unknown>;
  models?: Record<string, unknown>;
}

export interface UpdateProviderRequest {
  name?: string;
  source?: string;
  env?: string[];
  key?: string;
  options?: Record<string, unknown>;
  models?: Record<string, unknown>;
}

export interface AddModelRequest {
  modelId: string;
  name?: string;
  limit?: {
    context?: number;
    output?: number;
  };
  options?: Record<string, unknown>;
}

export const providerManagementApi = {
  list: async (): Promise<ProviderManagementEntry[]> => {
    return fetchWrapper<ProviderManagementEntry[]>(`${API_BASE_URL}/api/provider-management`);
  },

  get: async (id: string): Promise<ProviderManagementEntry> => {
    return fetchWrapper<ProviderManagementEntry>(`${API_BASE_URL}/api/provider-management/${id}`);
  },

  add: async (request: AddProviderRequest): Promise<ProviderManagementEntry> => {
    return fetchWrapper<ProviderManagementEntry>(`${API_BASE_URL}/api/provider-management`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  },

  update: async (id: string, request: UpdateProviderRequest): Promise<ProviderManagementEntry> => {
    return fetchWrapper<ProviderManagementEntry>(`${API_BASE_URL}/api/provider-management/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  },

  delete: async (id: string): Promise<void> => {
    await fetchWrapper(`${API_BASE_URL}/api/provider-management/${id}`, {
      method: 'DELETE',
    });
  },

  addModel: async (providerId: string, request: AddModelRequest): Promise<void> => {
    await fetchWrapper(`${API_BASE_URL}/api/provider-management/${providerId}/models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  },

  deleteModel: async (providerId: string, modelId: string): Promise<void> => {
    await fetchWrapper(`${API_BASE_URL}/api/provider-management/${providerId}/models/${modelId}`, {
      method: 'DELETE',
    });
  },
};
