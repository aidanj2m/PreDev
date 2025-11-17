'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Map, { Source, Layer, MapRef, MapLayerMouseEvent } from 'react-map-gl';
import type { FillLayer, LineLayer } from 'react-map-gl';
import { Address, addressesAPI } from '@/lib/api-client';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
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
  }) => void;
}

interface ParcelFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties: any;
}

interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: ParcelFeature[];
}

export default function MapView({ addresses, onBack, onAddAddress }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [isLoadingBoundaries, setIsLoadingBoundaries] = useState(false);
  const [mainParcels, setMainParcels] = useState<GeoJSONCollection>({ type: 'FeatureCollection', features: [] });
  const [surroundingParcels, setSurroundingParcels] = useState<GeoJSONCollection>({ type: 'FeatureCollection', features: [] });
  const [hoveredParcelId, setHoveredParcelId] = useState<number | null>(null);
  const [cursor, setCursor] = useState<string>('default');

  // Calculate center and zoom from addresses
  const validCoords = addresses.filter(a => a.latitude && a.longitude);
  let center: [number, number] = [-98.5795, 39.8283]; // Center of US as default
  let zoom = 4;

  if (validCoords.length > 0) {
    const avgLat = validCoords.reduce((sum, a) => sum + (a.latitude || 0), 0) / validCoords.length;
    const avgLng = validCoords.reduce((sum, a) => sum + (a.longitude || 0), 0) / validCoords.length;
    center = [avgLng, avgLat];
    zoom = validCoords.length === 1 ? 16 : 13;
  }

  // Load boundaries and parcels
  useEffect(() => {
    const loadBoundaries = async () => {
      setIsLoadingBoundaries(true);

      const mainFeatures: ParcelFeature[] = [];
      const surroundingFeatures: ParcelFeature[] = [];

      // Load boundaries for each address
      for (const address of addresses) {
        if (!address.latitude || !address.longitude) continue;

        try {
          const boundaryData = await addressesAPI.getBoundary(address.id);

          // Add main parcel boundary
          if (boundaryData.boundary && boundaryData.boundary.geometry) {
            mainFeatures.push({
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: boundaryData.boundary.geometry.coordinates
              },
              properties: boundaryData.boundary.properties || {}
            });
          }

          // Add surrounding parcels
          if (boundaryData.surrounding_parcels) {
            console.log(`Found ${boundaryData.surrounding_parcels.length} surrounding parcels`);
            
            boundaryData.surrounding_parcels.forEach((parcel: any, index: number) => {
              if (parcel.geometry && parcel.geometry.coordinates) {
                surroundingFeatures.push({
                  type: 'Feature',
                  geometry: {
                    type: 'Polygon',
                    coordinates: parcel.geometry.coordinates
                  },
                  properties: {
                    ...parcel.properties,
                    _isSurrounding: true,
                    _index: index
                  }
                });
              }
            });
          }
        } catch (error) {
          console.error(`Error loading boundary for address ${address.id}:`, error);
        }
      }

      setMainParcels({ type: 'FeatureCollection', features: mainFeatures });
      setSurroundingParcels({ type: 'FeatureCollection', features: surroundingFeatures });
      setIsLoadingBoundaries(false);
    };

    loadBoundaries();
  }, [addresses]);

  // Handle parcel click
  const handleMapClick = useCallback((event: MapLayerMouseEvent) => {
    if (!onAddAddress) return;

    const features = event.features;
    if (!features || features.length === 0) return;

    const feature = features[0];
    if (!feature.properties || !feature.properties._isSurrounding) return;

    const props = feature.properties;
    console.log('Clicked parcel properties:', props);

    const address = props.address || '';
    const city = props.city || '';
    const state = props.state || '';
    const zip = props.zip || '';

    if (!address || !city || !state || !zip) {
      console.error('Missing required fields:', { address, city, state, zip });
      alert('This parcel is missing address information. Please enter the address manually.');
      return;
    }

    // Add to assembly
    onAddAddress({
      street: address,
      city: city,
      state: state,
      zip_code: zip,
      full_address: props.full_address || `${address}, ${city}, ${state} ${zip}`,
      latitude: props.lat ? parseFloat(props.lat) : undefined,
      longitude: props.lon ? parseFloat(props.lon) : undefined
    });
  }, [onAddAddress]);

  // Handle mouse move for hover effect
  const handleMouseMove = useCallback((event: MapLayerMouseEvent) => {
    const features = event.features;
    if (features && features.length > 0) {
      const feature = features[0];
      if (feature.properties && feature.properties._isSurrounding) {
        setCursor('pointer');
        if (feature.id !== undefined) {
          setHoveredParcelId(feature.id as number);
        }
        return;
      }
    }
    setCursor('default');
    setHoveredParcelId(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCursor('default');
    setHoveredParcelId(null);
  }, []);

  // Main parcel fill layer
  const mainParcelFillLayer: FillLayer = {
    id: 'main-parcels-fill',
    type: 'fill',
    paint: {
      'fill-color': '#000000',
      'fill-opacity': 0.15
    }
  };

  // Main parcel outline layer
  const mainParcelLineLayer: LineLayer = {
    id: 'main-parcels-line',
    type: 'line',
    paint: {
      'line-color': '#000000',
      'line-width': 3
    }
  };

  // Surrounding parcel fill layer with hover effect
  const surroundingParcelFillLayer: FillLayer = {
    id: 'surrounding-parcels-fill',
    type: 'fill',
    paint: {
      'fill-color': '#999999',
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        0.15,
        0.01
      ]
    }
  };

  // Surrounding parcel outline layer
  const surroundingParcelLineLayer: LineLayer = {
    id: 'surrounding-parcels-line',
    type: 'line',
    paint: {
      'line-color': '#999999',
      'line-width': 1.5
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e5e5',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10
      }}>
        <div>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            margin: 0,
            marginBottom: '4px'
          }}>
            Property Survey Map
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#666666',
            margin: 0
          }}>
            {addresses.length} {addresses.length === 1 ? 'property' : 'properties'} displayed
          </p>
        </div>
        <button
          onClick={onBack}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
          }}
        >
          ← Back to Addresses
        </button>
      </div>

      {/* Map Container */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ.example'}
          initialViewState={{
            longitude: center[0],
            latitude: center[1],
            zoom: zoom
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          cursor={cursor}
          interactiveLayerIds={['surrounding-parcels-fill']}
          onClick={handleMapClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Surrounding parcels */}
          <Source id="surrounding-parcels" type="geojson" data={surroundingParcels}>
            <Layer {...surroundingParcelFillLayer} />
            <Layer {...surroundingParcelLineLayer} />
          </Source>

          {/* Main parcels (on top) */}
          <Source id="main-parcels" type="geojson" data={mainParcels}>
            <Layer {...mainParcelFillLayer} />
            <Layer {...mainParcelLineLayer} />
          </Source>
        </Map>
      </div>

      {/* Loading Overlay */}
      {isLoadingBoundaries && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#ffffff',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          zIndex: 10,
          fontSize: '14px'
        }}>
          Loading property boundaries...
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        backgroundColor: '#ffffff',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        zIndex: 10,
        fontSize: '13px'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '8px', color: '#000000' }}>
          Legend
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{
            width: '20px',
            height: '2px',
            backgroundColor: '#000000',
            flexShrink: 0
          }} />
          <span style={{ color: '#666666' }}>Selected Parcel</span>
        </div>
        {surroundingParcels.features.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '20px',
              height: '2px',
              backgroundColor: '#999999',
              flexShrink: 0
            }} />
            <span style={{ color: '#666666' }}>Nearby (Click to Add)</span>
          </div>
        )}
      </div>
    </div>
  );
}
