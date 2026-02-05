import { Address } from '@/lib/api-client';

export interface MapViewProps {
  addresses: Address[];
  onBack: () => void;
  onAddAddress?: (address: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    full_address: string;
    latitude?: number;
    longitude?: number;
    boundary_geojson?: any;
  }) => void;
  onRemoveAddress?: (addressId: string) => void;
  preloadedSurroundingParcels?: any[] | null;
}

export interface ParcelFeature {
  type: 'Feature';
  id?: number;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties: any;
}

export interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: ParcelFeature[];
}
