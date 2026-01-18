import { parse } from 'wellknown';

export interface BoundaryData {
  wkt?: string;
  geometry?: any;
  properties?: any;
  type?: string;
  coordinates?: any;
}

/**
 * Parses boundary_geojson data that might contain WKT format
 * and converts it to standard GeoJSON format
 */
export function parseBoundaryGeoJSON(boundaryData: BoundaryData | null | undefined): any {
  if (!boundaryData) {
    return null;
  }

  // If it's already in GeoJSON format with geometry
  if (boundaryData.geometry) {
    return boundaryData;
  }

  // If it contains WKT, parse it
  if (boundaryData.wkt) {
    try {
      const geometry = parse(boundaryData.wkt);
      return {
        type: 'Feature',
        geometry: geometry,
        properties: boundaryData.properties || {}
      };
    } catch (error) {
      console.error('Failed to parse WKT:', error);
      return null;
    }
  }

  // If it's a raw geometry object (type + coordinates)
  if (boundaryData.type && boundaryData.coordinates) {
    return {
      type: 'Feature',
      geometry: {
        type: boundaryData.type,
        coordinates: boundaryData.coordinates
      },
      properties: boundaryData.properties || {}
    };
  }

  return null;
}

/**
 * Extracts geometry from parsed boundary data
 */
export function extractGeometry(boundaryData: any): any {
  if (!boundaryData) {
    return null;
  }

  const parsed = parseBoundaryGeoJSON(boundaryData);
  return parsed?.geometry || null;
}
