/**
 * API client for PreDev backend
 */

// API base URL - defaults to production backend as per user preference
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://entitely-api.vercel.app/api'

if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('NEXT_PUBLIC_API_URL not set, using default:', API_BASE_URL);
}

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
  surrounding_parcels_geojson?: any[];
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

export interface ChatSession {
  id: string;
  project_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image_url?: string | null;
  created_at: string;
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

    // Handle 422 validation errors (FastAPI format)
    if (response.status === 422 && error.detail) {
      if (Array.isArray(error.detail)) {
        const errors = error.detail.map((err: any) => {
          const field = err.loc?.join('.') || 'unknown';
          return `${field}: ${err.msg}`;
        }).join(', ');
        console.error('Validation errors:', error.detail);
        throw new Error(`Validation error: ${errors}`);
      }
      throw new Error(error.detail);
    }

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
    console.log('API Client - Adding address to project:', projectId);
    console.log('API Client - Address data:', JSON.stringify(address, null, 2));
    return fetchAPI(`/projects/${projectId}/addresses`, {
      method: 'POST',
      body: JSON.stringify(address),
    });
  },

  async getBoundary(addressId: string): Promise<{ address_id: string; boundary: any; surrounding_parcels?: any[] }> {
    return fetchAPI(`/addresses/${addressId}/boundary`);
  },

  async unassignFromProject(addressId: string): Promise<{ status: string; message: string }> {
    return fetchAPI(`/addresses/${addressId}/unassign`, {
      method: 'PATCH',
    });
  },

  async delete(addressId: string): Promise<{ status: string; message: string }> {
    return fetchAPI(`/addresses/${addressId}`, {
      method: 'DELETE',
    });
  },

  async getPropertyData(addressId: string): Promise<{
    address: Address;
    parcels: any;
    buildings: any;
    assessments: any;
    ownership: any;
    tax: any;
    zoning: any;
    environmental: any;
    demographics: any;
  }> {
    return fetchAPI(`/addresses/${addressId}/property-data`);
  },
};

// Chat API methods
export const chatAPI = {
  async createSession(projectId: string, title?: string): Promise<ChatSession> {
    return fetchAPI('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, title }),
    });
  },

  async getProjectSessions(projectId: string): Promise<ChatSession[]> {
    return fetchAPI(`/projects/${projectId}/chat/sessions`);
  },

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    return fetchAPI(`/chat/sessions/${sessionId}/messages`);
  }
};

// Health check
export const healthAPI = {
  async check(): Promise<{ status: string; service: string }> {
    return fetchAPI('/health');
  },
};

// Zoning Analysis API methods
export interface ZoningQueryResponse {
  answer: string;
  tool_calls: string[];
}

export const zoningAPI = {
  async query(query: string, context: { projectId?: string; addressIds?: string[]; sessionId?: string } = {}): Promise<ZoningQueryResponse> {
    return fetchAPI('/zoning/query', {
      method: 'POST',
      body: JSON.stringify({
        query,
        project_id: context.projectId,
        address_ids: context.addressIds,
        session_id: context.sessionId
      }),
    });
  },
};

// Concept Plan Generation API methods
export interface ConceptPlanResponse {
  concept_plan_analysis: string;
  parcel_summary: {
    num_parcels: number;
    total_area_sqft: number;
    addresses: string[];
  };
  zoning_summary: {
    districts: string[];
    max_height: number | null;
    max_coverage: number | null;
  };
  compliance_issues: string[];
  image_url: string | null;
  image_base64: string | null;
}

export const conceptPlanAPI = {
  async generate(
    addressIds: string[],
    options: {
      projectId?: string;
      sessionId?: string;
      developmentType?: string;
      customRequirements?: string;
      includeImage?: boolean;
    } = {}
  ): Promise<ConceptPlanResponse> {
    return fetchAPI('/conceptPlan/generate', {
      method: 'POST',
      body: JSON.stringify({
        address_ids: addressIds,
        project_id: options.projectId,
        session_id: options.sessionId,
        development_type: options.developmentType || 'residential',
        custom_requirements: options.customRequirements,
        include_image: options.includeImage || false
      }),
    });
  },

  async checkCompliance(addressIds: string[]): Promise<{
    results: any[];
    all_compliant: boolean;
  }> {
    return fetchAPI('/conceptPlan/check-compliance', {
      method: 'POST',
      body: JSON.stringify({ address_ids: addressIds }),
    });
  },
};

// Feasibility Report API methods
export interface FeasibilityReportResponse {
  report_id: string;
  created_at: string;
  summary_memo: string;
  notes_document: string;
  constraints_diagram_url: string | null;
  concept_plan_url: string | null;
  site_context: any;
  zoning_check: any;
  calculations: any;
  compliance_issues: string[];
}

export const feasibilityAPI = {
  async generate(
    addressIds: string[],
    options: {
      projectId?: string;
      sessionId?: string;
      developmentType?: string;
      unitCountTarget?: number;
      customRequirements?: string;
    } = {}
  ): Promise<FeasibilityReportResponse> {
    return fetchAPI('/feasibility/generate', {
      method: 'POST',
      body: JSON.stringify({
        address_ids: addressIds,
        project_id: options.projectId,
        session_id: options.sessionId,
        development_type: options.developmentType || 'multifamily',
        unit_count_target: options.unitCountTarget,
        custom_requirements: options.customRequirements
      }),
    });
  },
};

// Environmental Layers API - for map visualization of flood zones, wetlands, etc.
export interface EnvironmentalLayersResponse {
  address_id: string;
  full_address: string;
  layers: {
    wetlands: GeoJSONFeatureCollection;
    flood_zones: GeoJSONFeatureCollection;
  };
  regrid_flood_zone?: {
    fema_flood_zone: string | null;
    fema_flood_zone_subtype: string | null;
    fema_nri_risk_rating: string | null;
  };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface ProjectEnvironmentalLayersResponse {
  project_id: string;
  addresses: EnvironmentalLayersResponse[];
  combined_layers: {
    wetlands: GeoJSONFeatureCollection;
    flood_zones: GeoJSONFeatureCollection;
  };
}

export const environmentalAPI = {
  /**
   * Get environmental layers (flood zones, wetlands) for a single address.
   * Returns GeoJSON vector polygons for map overlay.
   */
  async getLayersForAddress(
    addressId: string,
    options: {
      includeWetlands?: boolean;
      includeFloodZones?: boolean;
    } = {}
  ): Promise<EnvironmentalLayersResponse> {
    const params = new URLSearchParams();
    if (options.includeWetlands !== undefined) {
      params.append('include_wetlands', String(options.includeWetlands));
    }
    if (options.includeFloodZones !== undefined) {
      params.append('include_flood_zones', String(options.includeFloodZones));
    }
    const queryString = params.toString();
    const endpoint = `/environmental/layers/${addressId}${queryString ? `?${queryString}` : ''}`;
    return fetchAPI(endpoint);
  },

  /**
   * Get environmental layers for all addresses in a project.
   * Returns combined GeoJSON FeatureCollections for map overlay.
   */
  async getLayersForProject(
    projectId: string,
    options: {
      includeWetlands?: boolean;
      includeFloodZones?: boolean;
    } = {}
  ): Promise<ProjectEnvironmentalLayersResponse> {
    const params = new URLSearchParams();
    if (options.includeWetlands !== undefined) {
      params.append('include_wetlands', String(options.includeWetlands));
    }
    if (options.includeFloodZones !== undefined) {
      params.append('include_flood_zones', String(options.includeFloodZones));
    }
    const queryString = params.toString();
    const endpoint = `/environmental/layers/project/${projectId}${queryString ? `?${queryString}` : ''}`;
    return fetchAPI(endpoint);
  },

  /**
   * Get NJ wetlands within a bounding box directly from Supabase.
   * Uses NJDEP Wetlands 2020 data.
   * 
   * @param bbox Bounding box [minLon, minLat, maxLon, maxLat]
   * @param options Optional filters
   */
  async getNJWetlandsInBbox(
    bbox: [number, number, number, number],
    options: {
      wetlandLabel?: string;  // Filter by wetland classification (partial match)
      limit?: number;
    } = {}
  ): Promise<GeoJSONFeatureCollection> {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const params = new URLSearchParams({
      min_lon: String(minLon),
      min_lat: String(minLat),
      max_lon: String(maxLon),
      max_lat: String(maxLat),
    });

    if (options.wetlandLabel) {
      params.append('wetland_label', options.wetlandLabel);
    }
    if (options.limit) {
      params.append('limit', String(options.limit));
    }

    return fetchAPI(`/nj-wetlands?${params.toString()}`);
  },


  /**
   * Get all wetland types with colors for the legend.
   */
  async getWetlandTypes(): Promise<{
    wetland_types: Array<{
      name: string;
      count: number;
      total_acres: number;
      color: string;
      fillOpacity: number;
      lineColor: string;
      lineWidth: number;
    }>;
    total_types: number;
  }> {
    return fetchAPI('/nj-wetlands/types');
  },

  /**
   * Get information about the NJ wetlands dataset.
   */
  async getWetlandsInfo(): Promise<{
    service: string;
    provider: string;
    data_source: string;
    total_features: number;
    total_acres: number;
    coverage: string;
    note: string;
  }> {
    return fetchAPI('/nj-wetlands/info');
  },

  /**
   * Get NJ Redevelopment Zones within a bounding box.
   * 
   * @param bbox Bounding box [minLon, minLat, maxLon, maxLat]
   * @param options Optional filters
   */
  async getNJRedevZonesInBbox(
    bbox: [number, number, number, number],
    options: {
      limit?: number;
    } = {}
  ): Promise<GeoJSONFeatureCollection> {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const params = new URLSearchParams({
      min_lon: String(minLon),
      min_lat: String(minLat),
      max_lon: String(maxLon),
      max_lat: String(maxLat),
    });

    if (options.limit) {
      params.append('limit', String(options.limit));
    }

    return fetchAPI(`/nj-redev-zones?${params.toString()}`);
  },

  /**
   * Get NJ CAFRA Centers within a bounding box.
   * 
   * @param bbox Bounding box [minLon, minLat, maxLon, maxLat]
   */
  async getNJCafraCentersInBbox(
    bbox: [number, number, number, number]
  ): Promise<GeoJSONFeatureCollection> {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const params = new URLSearchParams({
      min_lon: String(minLon),
      min_lat: String(minLat),
      max_lon: String(maxLon),
      max_lat: String(maxLat),
    });

    return fetchAPI(`/nj-cafra-centers?${params.toString()}`);
  },

  /**
   * Get NJ Hydrography (Streams & Waterbodies) within a bounding box.
   * 
   * @param bbox Bounding box [minLon, minLat, maxLon, maxLat]
   * @param options Optional filters
   */
  async getNJHydrographyInBbox(
    bbox: [number, number, number, number],
    options: {
      layers?: string[]; // 'stream', 'waterbody'
    } = {}
  ): Promise<GeoJSONFeatureCollection> {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const params = new URLSearchParams({
      min_lon: String(minLon),
      min_lat: String(minLat),
      max_lon: String(maxLon),
      max_lat: String(maxLat),
    });

    if (options.layers && options.layers.length > 0) {
      options.layers.forEach(layer => params.append('layers', layer));
    }

    return fetchAPI(`/nj-hydrography?${params.toString()}`);
  },

  /**
   * Get NJ Hazardous Waste Sites within a bounding box.
   * 
   * @param bbox Bounding box [minLon, minLat, maxLon, maxLat]
   * @param options Optional filters
   */
  async getNJHazardousWasteSitesInBbox(
    bbox: [number, number, number, number],
    options: {
      limit?: number;
    } = {}
  ): Promise<GeoJSONFeatureCollection> {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const params = new URLSearchParams({
      min_lon: String(minLon),
      min_lat: String(minLat),
      max_lon: String(maxLon),
      max_lat: String(maxLat),
    });

    if (options.limit) {
      params.append('limit', String(options.limit));
    }

    return fetchAPI(`/nj-hazardous-waste-sites?${params.toString()}`);
  },

  /**
   * Get NJ Brownfield Sites within a bounding box.
   * 
   * @param bbox Bounding box [minLon, minLat, maxLon, maxLat]
   * @param options Optional filters
   */
  async getNJBrownfieldSitesInBbox(
    bbox: [number, number, number, number],
    options: {
      limit?: number;
    } = {}
  ): Promise<GeoJSONFeatureCollection> {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const params = new URLSearchParams({
      min_lon: String(minLon),
      min_lat: String(minLat),
      max_lon: String(maxLon),
      max_lat: String(maxLat),
    });

    if (options.limit) {
      params.append('limit', String(options.limit));
    }

    return fetchAPI(`/nj-brownfield-sites?${params.toString()}`);
  },

  /**
   * Get NJ Contaminated Sites within a bounding box.
   * 
   * @param bbox Bounding box [minLon, minLat, maxLon, maxLat]
   * @param options Optional filters
   */
  async getNJContaminatedSitesInBbox(
    bbox: [number, number, number, number],
    options: {
      limit?: number;
    } = {}
  ): Promise<GeoJSONFeatureCollection> {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const params = new URLSearchParams({
      min_lon: String(minLon),
      min_lat: String(minLat),
      max_lon: String(maxLon),
      max_lat: String(maxLat),
    });

    if (options.limit) {
      params.append('limit', String(options.limit));
    }

    return fetchAPI(`/nj-contaminated-sites?${params.toString()}`);
  },

  /**
   * Get NJ Pinelands Management Areas within a bounding box.
   * 
   * @param bbox Bounding box [minLon, minLat, maxLon, maxLat]
   */
  async getNJPinelandsAreasInBbox(
    bbox: [number, number, number, number]
  ): Promise<GeoJSONFeatureCollection> {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const params = new URLSearchParams({
      min_lon: String(minLon),
      min_lat: String(minLat),
      max_lon: String(maxLon),
      max_lat: String(maxLat),
    });

    return fetchAPI(`/nj-pinelands-areas?${params.toString()}`);
  },

  /**
   * Get NJ BDA Block/Lot Polygons within a bounding box.
   * 
   * @param bbox Bounding box [minLon, minLat, maxLon, maxLat]
   * @param options Optional filters
   */
  async getNJBDABlockLotsInBbox(
    bbox: [number, number, number, number],
    options: {
      limit?: number;
    } = {}
  ): Promise<GeoJSONFeatureCollection> {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const params = new URLSearchParams({
      min_lon: String(minLon),
      min_lat: String(minLat),
      max_lon: String(maxLon),
      max_lat: String(maxLat),
    });

    if (options.limit) {
      params.append('limit', String(options.limit));
    }

    return fetchAPI(`/nj-bda-blocklots?${params.toString()}`);
  },

  /**
   * Get NJ Category One (C1) Waters within a bounding box.
   * 
   * @param bbox Bounding box [minLon, minLat, maxLon, maxLat]
   * @param options Optional filters
   */
  async getNJC1WatersInBbox(
    bbox: [number, number, number, number],
    options: {
      limit?: number;
    } = {}
  ): Promise<GeoJSONFeatureCollection> {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const params = new URLSearchParams({
      min_lon: String(minLon),
      min_lat: String(minLat),
      max_lon: String(maxLon),
      max_lat: String(maxLat),
    });

    if (options.limit) {
      params.append('limit', String(options.limit));
    }

    return fetchAPI(`/nj-c1-waters?${params.toString()}`);
  },

  /**
   * Get NJ Highlands Preservation/Planning Areas within a bounding box.
   * 
   * @param bbox Bounding box [minLon, minLat, maxLon, maxLat]
   */
  async getNJHighlandsAreasInBbox(
    bbox: [number, number, number, number]
  ): Promise<GeoJSONFeatureCollection> {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const params = new URLSearchParams({
      min_lon: String(minLon),
      min_lat: String(minLat),
      max_lon: String(maxLon),
      max_lat: String(maxLat),
    });

    return fetchAPI(`/nj-highlands-areas?${params.toString()}`);
  },

  /**
   * Get NJ Flood Hazard Sites within a bounding box.
   * 
   * @param bbox Bounding box [minLon, minLat, maxLon, maxLat]
   * @param options Optional filters
   */
  async getNJFloodHazardSitesInBbox(
    bbox: [number, number, number, number],
    options: {
      limit?: number;
    } = {}
  ): Promise<GeoJSONFeatureCollection> {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const params = new URLSearchParams({
      min_lon: String(minLon),
      min_lat: String(minLat),
      max_lon: String(maxLon),
      max_lat: String(maxLat),
    });

    if (options.limit) {
      params.append('limit', String(options.limit));
    }

    return fetchAPI(`/nj-flood-hazard-sites?${params.toString()}`);
  },
};

// Parcels API methods
export const parcelsAPI = {
  /**
   * Get nearby parcels within a bounding box.
   * First checks database for cached parcels, then fetches from Lightbox if needed.
   * 
   * @param bbox Bounding box [minLon, minLat, maxLon, maxLat]
   * @param options Optional filters
   */
  async getNearbyParcels(
    bbox: [number, number, number, number],
    options: {
      limit?: number;
    } = {}
  ): Promise<GeoJSONFeatureCollection> {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const params = new URLSearchParams({
      min_lon: String(minLon),
      min_lat: String(minLat),
      max_lon: String(maxLon),
      max_lat: String(maxLat),
    });

    if (options.limit) {
      params.append('limit', String(options.limit));
    }

    return fetchAPI(`/nearby-parcels?${params.toString()}`);
  },
};
