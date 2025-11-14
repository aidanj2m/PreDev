'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Address, addressesAPI } from '@/lib/api-client';

interface MapViewProps {
  addresses: Address[];
  onBack: () => void;
}

export default function MapView({ addresses, onBack }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoadingBoundaries, setIsLoadingBoundaries] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.error('Mapbox token not configured');
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    // Calculate center point from addresses
    const validCoords = addresses.filter(a => a.latitude && a.longitude);
    let center: [number, number] = [-98.5795, 39.8283]; // Center of US as default
    let zoom = 4;

    if (validCoords.length > 0) {
      const avgLat = validCoords.reduce((sum, a) => sum + (a.latitude || 0), 0) / validCoords.length;
      const avgLng = validCoords.reduce((sum, a) => sum + (a.longitude || 0), 0) / validCoords.length;
      center = [avgLng, avgLat];
      zoom = validCoords.length === 1 ? 16 : 13;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add markers and boundaries
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const loadBoundariesAndMarkers = async () => {
      setIsLoadingBoundaries(true);

      for (const address of addresses) {
        if (!address.latitude || !address.longitude) continue;

        // Add marker
        const el = document.createElement('div');
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#000000';
        el.style.border = '3px solid #ffffff';
        el.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
        el.style.cursor = 'pointer';

        const marker = new mapboxgl.Marker(el)
          .setLngLat([address.longitude, address.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div style="padding: 8px;">
                <strong style="font-size: 14px;">${address.street}</strong><br/>
                <span style="font-size: 12px; color: #666;">${address.city}, ${address.state} ${address.zip_code}</span>
              </div>`
            )
          )
          .addTo(map.current!);

        // Fetch and add boundary
        try {
          const boundaryData = await addressesAPI.getBoundary(address.id);
          
          if (boundaryData.boundary && map.current) {
            const sourceId = `boundary-${address.id}`;
            const layerId = `boundary-layer-${address.id}`;
            const fillLayerId = `boundary-fill-${address.id}`;

            // Add source if it doesn't exist
            if (!map.current.getSource(sourceId)) {
              map.current.addSource(sourceId, {
                type: 'geojson',
                data: boundaryData.boundary
              });

              // Add fill layer
              map.current.addLayer({
                id: fillLayerId,
                type: 'fill',
                source: sourceId,
                paint: {
                  'fill-color': '#000000',
                  'fill-opacity': 0.1
                }
              });

              // Add outline layer
              map.current.addLayer({
                id: layerId,
                type: 'line',
                source: sourceId,
                paint: {
                  'line-color': '#000000',
                  'line-width': 2
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error loading boundary for address ${address.id}:`, error);
        }
      }

      setIsLoadingBoundaries(false);

      // Fit map to show all addresses
      if (addresses.length > 1 && map.current) {
        const validCoords = addresses.filter(a => a.latitude && a.longitude);
        if (validCoords.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          validCoords.forEach(addr => {
            if (addr.longitude && addr.latitude) {
              bounds.extend([addr.longitude, addr.latitude]);
            }
          });
          map.current.fitBounds(bounds, { padding: 100, maxZoom: 16 });
        }
      }
    };

    loadBoundariesAndMarkers();
  }, [mapLoaded, addresses]);

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
            color: '#000000',
            margin: 0
          }}>
            Property Survey Map
          </h2>
          <p style={{
            fontSize: '13px',
            color: '#666666',
            margin: '4px 0 0 0'
          }}>
            {addresses.length} {addresses.length === 1 ? 'property' : 'properties'} displayed
          </p>
        </div>
        <button
          onClick={onBack}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #e5e5e5',
            backgroundColor: '#ffffff',
            color: '#000000',
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

      {/* Loading overlay */}
      {isLoadingBoundaries && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 20px',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e5e5',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          zIndex: 20,
          fontSize: '14px',
          color: '#666666'
        }}>
          Loading property boundaries...
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapContainer} 
        style={{
          flex: 1,
          width: '100%',
          height: '100%'
        }}
      />

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        padding: '16px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e5e5',
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
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#000000',
            border: '2px solid #ffffff',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
            flexShrink: 0
          }} />
          <span style={{ color: '#666666' }}>Property Location</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '20px',
            height: '2px',
            backgroundColor: '#000000',
            flexShrink: 0
          }} />
          <span style={{ color: '#666666' }}>Property Boundary</span>
        </div>
      </div>
    </div>
  );
}

