declare module 'wellknown' {
  export interface GeoJSONGeometry {
    type: string;
    coordinates: any;
  }

  /**
   * Parse a WKT string and return a GeoJSON geometry object
   */
  export function parse(wkt: string): GeoJSONGeometry | null;

  /**
   * Encode a GeoJSON geometry object as WKT
   */
  export function stringify(geojson: GeoJSONGeometry): string;
}
