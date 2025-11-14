/**
 * API client for PreDev backend
 */

// API base URL - defaults to production backend as per user preference
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-api-url.vercel.app/api';

// Types
export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  address_count?: number;
}

export interface Address {
  id: string;
  project_id: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  full_address: string;
  latitude?: number;
  longitude?: number;
  boundary_geojson?: any;
  created_at: string;
}

export interface ProjectWithAddresses extends Project {
  addresses: Address[];
}

export interface AddressValidation {
  valid: boolean;
  formatted_address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  suggestions: string[];
}

// Helper function for fetch requests
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `API request failed: ${response.status}`);
  }

  return response.json();
}

// Project API methods
export const projectsAPI = {
  async create(name: string): Promise<Project> {
    return fetchAPI('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async list(): Promise<Project[]> {
    return fetchAPI('/projects');
  },

  async get(projectId: string): Promise<ProjectWithAddresses> {
    return fetchAPI(`/projects/${projectId}`);
  },

  async update(projectId: string, name: string): Promise<Project> {
    return fetchAPI(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  async delete(projectId: string): Promise<{ status: string; message: string }> {
    return fetchAPI(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  },
};

// Address API methods
export const addressesAPI = {
  async validate(address: string): Promise<AddressValidation> {
    return fetchAPI('/addresses/validate', {
      method: 'POST',
      body: JSON.stringify({ address }),
    });
  },

  async addToProject(projectId: string, address: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    full_address: string;
    latitude?: number;
    longitude?: number;
    boundary_geojson?: any;
  }): Promise<Address> {
    return fetchAPI(`/projects/${projectId}/addresses`, {
      method: 'POST',
      body: JSON.stringify(address),
    });
  },

  async getBoundary(addressId: string): Promise<{ address_id: string; boundary: any }> {
    return fetchAPI(`/addresses/${addressId}/boundary`);
  },

  async delete(addressId: string): Promise<{ status: string; message: string }> {
    return fetchAPI(`/addresses/${addressId}`, {
      method: 'DELETE',
    });
  },
};

// Health check
export const healthAPI = {
  async check(): Promise<{ status: string; service: string }> {
    return fetchAPI('/health');
  },
};

