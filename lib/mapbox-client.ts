/**
 * Client-side Mapbox Geocoding service for fast autocomplete
 * Direct API calls to Mapbox without backend proxy
 */

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export interface MapboxSuggestion {
  full_address: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number;
  longitude?: number;
}

export interface MapboxValidationResult {
  valid: boolean;
  formatted_address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  suggestions: MapboxSuggestion[];
}

/**
 * Validate address using Mapbox API directly (client-side)
 * Much faster than going through backend proxy
 */
export async function validateAddressClientSide(address: string): Promise<MapboxValidationResult> {
  if (!MAPBOX_TOKEN) {
    console.error('NEXT_PUBLIC_MAPBOX_TOKEN not configured');
    throw new Error('Mapbox token not configured');
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&country=US&types=address&limit=5`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data = await response.json();
    const features = data.features || [];

    if (features.length === 0) {
      return {
        valid: false,
        suggestions: []
      };
    }

    // Parse best match (first result)
    const bestMatch = features[0];
    const coordinates = bestMatch.geometry?.coordinates || [];
    let placeName = bestMatch.place_name || '';
    
    // Remove ", United States" suffix
    if (placeName.endsWith(', United States')) {
      placeName = placeName.slice(0, -16);
    }

    // Parse address components from context
    const context = bestMatch.context || [];
    const components = parseMapboxContext(context);

    // Extract street address
    let street = bestMatch.text || '';
    const addressNumber = bestMatch.address;
    if (addressNumber) {
      street = `${addressNumber} ${street}`;
    }

    // Build suggestions from remaining results
    const suggestions: MapboxSuggestion[] = [];
    
    for (let i = 1; i < features.length; i++) {
      const feature = features[i];
      let suggName = feature.place_name || '';
      if (suggName.endsWith(', United States')) {
        suggName = suggName.slice(0, -16);
      }
      
      const suggCoords = feature.geometry?.coordinates || [];
      suggestions.push({
        full_address: suggName,
        street: '',
        city: '',
        state: '',
        zip_code: '',
        latitude: suggCoords[1],
        longitude: suggCoords[0]
      });
    }

    return {
      valid: true,
      formatted_address: placeName,
      street,
      city: components.city || '',
      state: components.state || '',
      zip_code: components.zip_code || '',
      latitude: coordinates[1],
      longitude: coordinates[0],
      suggestions
    };
  } catch (error) {
    console.error('Client-side Mapbox error:', error);
    throw error;
  }
}

/**
 * Parse Mapbox context to extract city, state, and zip code
 */
function parseMapboxContext(context: any[]): {
  city: string | null;
  state: string | null;
  zip_code: string | null;
} {
  const result = {
    city: null as string | null,
    state: null as string | null,
    zip_code: null as string | null
  };

  for (const item of context) {
    const itemId = item.id || '';
    if (itemId.startsWith('place')) {
      result.city = item.text;
    } else if (itemId.startsWith('region')) {
      result.state = (item.short_code || '').replace('US-', '');
    } else if (itemId.startsWith('postcode')) {
      result.zip_code = item.text;
    }
  }

  return result;
}
