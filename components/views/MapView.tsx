'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Map, { Source, Layer, MapRef, MapLayerMouseEvent } from 'react-map-gl';
import type { FillLayer, LineLayer } from 'react-map-gl';
import { Address, addressesAPI, environmentalAPI, GeoJSONFeatureCollection } from '@/lib/api-client';
import 'mapbox-gl/dist/mapbox-gl.css';
import ParcelPreviewModal from '@/components/modals/ParcelPreviewModal';
import { parseBoundaryGeoJSON } from '@/lib/wkt-parser';

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
    boundary_geojson?: any;
  }) => void;
  onRemoveAddress?: (addressId: string) => void;
}

interface ParcelFeature {
  type: 'Feature';
  id?: number;
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

export default function MapView({ addresses, onBack, onAddAddress, onRemoveAddress }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [isLoadingBoundaries, setIsLoadingBoundaries] = useState(false);
  const [mainParcels, setMainParcels] = useState<GeoJSONCollection>({ type: 'FeatureCollection', features: [] });
  const [surroundingParcels, setSurroundingParcels] = useState<GeoJSONCollection>({ type: 'FeatureCollection', features: [] });
  const [hoveredParcelId, setHoveredParcelId] = useState<number | null>(null);
  const [hoveredParcelInfo, setHoveredParcelInfo] = useState<any>(null);
  const [cursor, setCursor] = useState<string>('default');
  const hoveredParcelIdRef = useRef<number | null>(null);
  const hoveredSourceRef = useRef<'main-parcels' | 'surrounding-parcels' | null>(null);
  const hasAutoZoomedRef = useRef<boolean>(false); // Track if we've already auto-zoomed
  const lastAddressesLengthRef = useRef<number>(0); // Track the last addresses count we zoomed for

  // Environmental layers state
  const [showFloodZones, setShowFloodZones] = useState(false);
  const [showWetlands, setShowWetlands] = useState(false);
  const [floodZones, setFloodZones] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [wetlands, setWetlands] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoadingEnvLayers, setIsLoadingEnvLayers] = useState(false);
  const [wetlandTypes, setWetlandTypes] = useState<any[]>([]);
  const [showWetlandsLegend, setShowWetlandsLegend] = useState(false);
  const [autoRefreshWetlands, setAutoRefreshWetlands] = useState(false);

  // Map style state
  const [currentMapStyle, setCurrentMapStyle] = useState<'streets' | 'satellite'>('streets');

  // Calculate center and zoom from addresses
  const validCoords = addresses.filter(a => a.latitude && a.longitude);
  let center: [number, number] = [-98.5795, 39.8283]; // Center of US as default
  let zoom = 4;

  if (validCoords.length > 0) {
    const avgLat = validCoords.reduce((sum, a) => sum + (a.latitude || 0), 0) / validCoords.length;
    const avgLng = validCoords.reduce((sum, a) => sum + (a.longitude || 0), 0) / validCoords.length;
    center = [avgLng, avgLat];
    zoom = validCoords.length === 1 ? 18 : 15; // Increased zoom levels for closer view
  }

  // Auto-zoom to parcels ONLY on first load or when addresses actually change
  useEffect(() => {
    // Check if addresses count changed (new address added/removed)
    const addressesChanged = addresses.length !== lastAddressesLengthRef.current;

    if (addressesChanged) {
      // Reset the flag when addresses change
      hasAutoZoomedRef.current = false;
      lastAddressesLengthRef.current = addresses.length;
    }

    // Only auto-zoom if we haven't zoomed yet for this set of addresses
    if (mapRef.current && validCoords.length > 0 && !hasAutoZoomedRef.current) {
      const map = mapRef.current.getMap();
      if (map) {
        map.flyTo({
          center: center,
          zoom: validCoords.length === 1 ? 18 : 15,
          duration: 1500,
          essential: true
        });
        hasAutoZoomedRef.current = true; // Mark that we've zoomed
      }
    }
  }, [addresses.length, center[0], center[1]]); // Trigger when addresses change

  // Function to fetch wetlands in current viewport
  const fetchWetlandsInViewport = useCallback(async () => {
    if (!showWetlands || !mapRef.current) return;

    try {
      const map = mapRef.current.getMap();
      const bounds = map.getBounds();
      
      if (!bounds) return;
      
      const bbox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
      ];

      console.log('Fetching wetlands in viewport:', bbox);
      const wetlandsData = await environmentalAPI.getNJWetlandsInBbox(bbox, {
        limit: 2000
      });

      setWetlands(wetlandsData);
      console.log(`✓ Loaded ${wetlandsData.features.length} wetland features in viewport`);
    } catch (err) {
      console.error('Error loading wetlands:', err);
    }
  }, [showWetlands]);

  // Load wetland types for legend
  useEffect(() => {
    const loadWetlandTypes = async () => {
      if (!showWetlands) return;
      
      try {
        const result = await environmentalAPI.getWetlandTypes();
        setWetlandTypes(result.wetland_types);
        console.log(`✓ Loaded ${result.wetland_types.length} wetland types for legend`);
      } catch (error) {
        console.error('Error loading wetland types:', error);
      }
    };

    loadWetlandTypes();
  }, [showWetlands]);

  // Load environmental layers when toggled on
  useEffect(() => {
    const loadEnvironmentalLayers = async () => {
      if (!showFloodZones && !showWetlands) {
        return;
      }

      setIsLoadingEnvLayers(true);

      try {
        // Fetch flood zones for all addresses (if toggled on)
        if (showFloodZones && addresses.length > 0) {
          const allFloodFeatures: any[] = [];
          
          for (const address of addresses) {
            try {
              const result = await environmentalAPI.getLayersForAddress(address.id, {
                includeFloodZones: true,
                includeWetlands: false,
              });

              if (result.layers.flood_zones?.features) {
                allFloodFeatures.push(...result.layers.flood_zones.features);
              }
            } catch (err) {
              console.error(`Error loading flood zones for address ${address.id}:`, err);
            }
          }

          setFloodZones({ type: 'FeatureCollection', features: allFloodFeatures });
          console.log(`✓ Loaded ${allFloodFeatures.length} flood zone features`);
        }

        // Fetch wetlands by bounding box when toggled on
        if (showWetlands) {
          await fetchWetlandsInViewport();
        }
      } catch (error) {
        console.error('Error loading environmental layers:', error);
      } finally {
        setIsLoadingEnvLayers(false);
      }
    };

    loadEnvironmentalLayers();
  }, [showFloodZones, showWetlands, addresses, fetchWetlandsInViewport]);

  // Auto-refresh wetlands when map moves (if enabled)
  useEffect(() => {
    if (!autoRefreshWetlands || !showWetlands || !mapRef.current) return;

    const map = mapRef.current.getMap();
    
    // Debounce the refresh to avoid too many API calls
    let timeoutId: NodeJS.Timeout;
    
    const handleMoveEnd = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchWetlandsInViewport();
      }, 500); // Wait 500ms after movement stops
    };

    map.on('moveend', handleMoveEnd);
    
    return () => {
      map.off('moveend', handleMoveEnd);
      clearTimeout(timeoutId);
    };
  }, [autoRefreshWetlands, showWetlands, fetchWetlandsInViewport]);

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
          // Check if boundary AND surrounding parcels are already cached
          if (address.boundary_geojson && address.surrounding_parcels_geojson) {
            console.log(`Using fully cached data for address ${address.id}`);

            // Add main parcel boundary from cached data
            const parsedBoundary = parseBoundaryGeoJSON(address.boundary_geojson);
            if (parsedBoundary && parsedBoundary.geometry) {
              mainFeatures.push({
                type: 'Feature',
                id: mainFeatures.length, // Assign unique numeric ID for hover
                geometry: {
                  type: 'Polygon',
                  coordinates: parsedBoundary.geometry.coordinates
                },
                properties: {
                  ...(parsedBoundary.properties || {}),
                  _isMainParcel: true,
                  _addressId: address.id // Store address ID for removal
                }
              });
            }

            // Add surrounding parcels from cached data
            const cachedFeatures = address.surrounding_parcels_geojson.features || [];
            console.log(`Found ${cachedFeatures.length} cached surrounding parcels`);

            cachedFeatures.forEach((feature: any, index: number) => {
              // Skip the main parcel (it's already added above)
              if (feature.properties?.is_main_parcel) {
                return;
              }

              if (feature.geometry && feature.geometry.coordinates) {
                const featureWithId: any = {
                  type: 'Feature',
                  id: surroundingFeatures.length, // Assign unique numeric ID
                  geometry: {
                    type: 'Polygon',
                    coordinates: feature.geometry.coordinates
                  },
                  properties: {
                    ...feature.properties,
                    _isSurrounding: true,
                    _index: index
                  }
                };
                surroundingFeatures.push(featureWithId);
              }
            });

            // Skip API call since we have all the data
            continue;
          }

          // Check if only boundary is cached (partial cache)
          if (address.boundary_geojson) {
            console.log(`Using cached boundary for address ${address.id}, fetching surrounding parcels`);

            // Add main parcel boundary from cached data
            const parsedBoundary = parseBoundaryGeoJSON(address.boundary_geojson);
            if (parsedBoundary && parsedBoundary.geometry) {
              mainFeatures.push({
                type: 'Feature',
                id: mainFeatures.length, // Assign unique numeric ID for hover
                geometry: {
                  type: 'Polygon',
                  coordinates: parsedBoundary.geometry.coordinates
                },
                properties: {
                  ...(parsedBoundary.properties || {}),
                  _isMainParcel: true,
                  _addressId: address.id // Store address ID for removal
                }
              });
            }
          }

          // Fetch from API if not fully cached
          console.log(`Fetching boundary data from API for address ${address.id}`);
          const boundaryData = await addressesAPI.getBoundary(address.id);

          // Add main parcel boundary (if not already added from cache)
          if (!address.boundary_geojson && boundaryData.boundary) {
            const parsedBoundary = parseBoundaryGeoJSON(boundaryData.boundary);
            if (parsedBoundary && parsedBoundary.geometry) {
              mainFeatures.push({
                type: 'Feature',
                id: mainFeatures.length, // Assign unique numeric ID for hover
                geometry: {
                  type: 'Polygon',
                  coordinates: parsedBoundary.geometry.coordinates
                },
                properties: {
                  ...(parsedBoundary.properties || {}),
                  _isMainParcel: true,
                  _addressId: address.id // Store address ID for removal
                }
              });
            }
          }

          // Add surrounding parcels from API response
          if (boundaryData.surrounding_parcels) {
            console.log(`Found ${boundaryData.surrounding_parcels.length} surrounding parcels from API`);

            boundaryData.surrounding_parcels.forEach((parcel: any, index: number) => {
              // Skip the main parcel (it's marked with is_main_parcel)
              if (parcel.properties?.is_main_parcel) {
                return;
              }

              if (parcel.geometry && parcel.geometry.coordinates) {
                const featureWithId: any = {
                  type: 'Feature',
                  id: surroundingFeatures.length, // Assign unique numeric ID
                  geometry: {
                    type: 'Polygon',
                    coordinates: parcel.geometry.coordinates
                  },
                  properties: {
                    ...parcel.properties,
                    _isSurrounding: true,
                    _index: index
                  }
                };
                surroundingFeatures.push(featureWithId);
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
  const handleMapClick = useCallback(async (event: MapLayerMouseEvent) => {
    const features = event.features;
    if (!features || features.length === 0) return;

    const feature = features[0];
    if (!feature.properties) return;

    const props = feature.properties;

    // Handle clicking on main parcel (to remove)
    if (props._isMainParcel && onRemoveAddress) {
      const addressId = props._addressId;
      if (addressId) {
        console.log('Removing main parcel:', addressId);
        onRemoveAddress(addressId);
      }
      return;
    }

    // Handle clicking on surrounding parcel (to add)
    if (!props._isSurrounding || !onAddAddress) return;

    console.log('Clicked parcel properties:', props);

    let address = props.address || '';
    let city = props.city || '';
    let state = props.state || '';
    let zip = props.zip || '';
    const lat = props.lat ? parseFloat(props.lat) : undefined;
    const lon = props.lon ? parseFloat(props.lon) : undefined;

    // If missing address info but we have coordinates, get address from Mapbox
    if ((!address || !city || !state || !zip) && lat && lon) {
      console.log('Missing address info, fetching from Mapbox with coordinates:', { lat, lon });

      try {
        const validation = await addressesAPI.validate(`${lon},${lat}`);

        if (validation.valid && validation.street && validation.city && validation.state && validation.zip_code) {
          address = validation.street;
          city = validation.city;
          state = validation.state;
          zip = validation.zip_code;
          console.log('Successfully retrieved address from Mapbox:', { address, city, state, zip });
        } else {
          console.error('Could not retrieve valid address from Mapbox');
          alert('Could not retrieve address information for this parcel. Please try again or enter manually.');
          return;
        }
      } catch (error) {
        console.error('Error fetching address from Mapbox:', error);
        alert('Failed to retrieve address information. Please try again.');
        return;
      }
    }

    // Final check - ensure we have all required fields
    if (!address || !city || !state || !zip) {
      console.error('Missing required fields after geocoding:', { address, city, state, zip });
      alert('This parcel is missing address information. Please enter the address manually.');
      return;
    }

    // Add to assembly with boundary geometry
    onAddAddress({
      street: address,
      city: city,
      state: state,
      zip_code: zip,
      full_address: props.full_address || `${address}, ${city}, ${state} ${zip}`,
      latitude: lat,
      longitude: lon,
      boundary_geojson: feature.geometry ? {
        type: 'Feature',
        geometry: feature.geometry,
        properties: props
      } : undefined
    });
  }, [onAddAddress, onRemoveAddress]);

  // Clear previous hover state helper
  const clearHoverState = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || hoveredParcelIdRef.current === null) return;

    // Clear from the tracked source
    if (hoveredSourceRef.current) {
      try {
        map.setFeatureState(
          { source: hoveredSourceRef.current, id: hoveredParcelIdRef.current },
          { hover: false }
        );
      } catch (e) {
        console.warn('Failed to clear hover state:', e);
      }
    }

    hoveredParcelIdRef.current = null;
    hoveredSourceRef.current = null;
  }, []);

  // Handle mouse move for hover effect
  const handleMouseMove = useCallback((event: MapLayerMouseEvent) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const features = event.features;

    // No features under cursor - clear everything
    if (!features || features.length === 0) {
      clearHoverState();
      setCursor('default');
      setHoveredParcelId(null);
      setHoveredParcelInfo(null);
      return;
    }

    const feature = features[0];
    if (!feature.properties) {
      clearHoverState();
      setCursor('default');
      setHoveredParcelId(null);
      setHoveredParcelInfo(null);
      return;
    }

    // Handle hovering over main parcels (selected)
    if (feature.properties._isMainParcel) {
      const featureId = feature.id as number;
      const source = 'main-parcels';

      // Only update if hovering over a different feature
      if (hoveredParcelIdRef.current !== featureId || hoveredSourceRef.current !== source) {
        // Clear previous hover
        clearHoverState();

        // Set new hover
        if (featureId !== undefined) {
          map.setFeatureState({ source, id: featureId }, { hover: true });
          hoveredParcelIdRef.current = featureId;
          hoveredSourceRef.current = source;
          setHoveredParcelId(featureId);
          setHoveredParcelInfo({ ...feature.properties, _isMainParcel: true });
          setCursor('pointer');
        }
      }
      return;
    }

    // Handle hovering over surrounding parcels (to add)
    if (feature.properties._isSurrounding) {
      const featureId = feature.id as number;
      const source = 'surrounding-parcels';

      // Only update if hovering over a different feature
      if (hoveredParcelIdRef.current !== featureId || hoveredSourceRef.current !== source) {
        // Clear previous hover
        clearHoverState();

        // Set new hover
        if (featureId !== undefined) {
          map.setFeatureState({ source, id: featureId }, { hover: true });
          hoveredParcelIdRef.current = featureId;
          hoveredSourceRef.current = source;
          setHoveredParcelId(featureId);
          setHoveredParcelInfo(feature.properties);
          setCursor('pointer');
        }
      }
      return;
    }

    // Not hovering over a parcel - clear state
    clearHoverState();
    setCursor('default');
    setHoveredParcelId(null);
    setHoveredParcelInfo(null);
  }, [clearHoverState]);

  const handleMouseLeave = useCallback(() => {
    clearHoverState();
    setCursor('default');
    setHoveredParcelId(null);
    setHoveredParcelInfo(null);
  }, [clearHoverState]);

  // Main parcel fill layer with hover effect
  const mainParcelFillLayer: FillLayer = {
    id: 'main-parcels-fill',
    type: 'fill',
    source: 'main-parcels',
    paint: {
      'fill-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        '#DC2626',  // Red on hover (to indicate removal)
        '#9CA3AF'   // Grey default
      ],
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        0.5,
        0.5
      ],
      'fill-outline-color': '#000000'
    }
  };

  // Main parcel outline layer
  const mainParcelLineLayer: LineLayer = {
    id: 'main-parcels-line',
    type: 'line',
    source: 'main-parcels',
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        '#DC2626',  // Red border on hover
        '#000000'   // Black border default
      ],
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        4,
        2
      ]
    }
  };

  // Surrounding parcel fill layer
  const surroundingParcelFillLayer: FillLayer = {
    id: 'surrounding-parcels-fill',
    type: 'fill',
    source: 'surrounding-parcels',
    paint: {
      'fill-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        '#3B82F6',  // Blue on hover
        'transparent' // Transparent default
      ],
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        0.25,
        0
      ],
      'fill-outline-color': '#E5E7EB'
    }
  };

  // Surrounding parcel outline layer
  const surroundingParcelLineLayer: LineLayer = {
    id: 'surrounding-parcels-line',
    type: 'line',
    source: 'surrounding-parcels',
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        '#3B82F6',  // Blue border on hover
        '#E5E7EB'   // Grey border default
      ],
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        2,
        1
      ]
    }
  };

  // Flood zone fill layer (blue with transparency)
  const floodZoneFillLayer: FillLayer = {
    id: 'flood-zones-fill',
    type: 'fill',
    source: 'flood-zones',
    paint: {
      'fill-color': [
        'case',
        ['get', 'is_high_risk'],
        '#DC2626',  // Red for high-risk zones (A, AE, V, VE, etc.)
        '#3B82F6'   // Blue for moderate/minimal risk zones (X)
      ],
      'fill-opacity': 0.35
    }
  };

  // Flood zone outline layer
  const floodZoneLineLayer: LineLayer = {
    id: 'flood-zones-line',
    type: 'line',
    source: 'flood-zones',
    paint: {
      'line-color': [
        'case',
        ['get', 'is_high_risk'],
        '#991B1B',  // Dark red for high-risk
        '#1D4ED8'   // Dark blue for other zones
      ],
      'line-width': 2,
      'line-dasharray': [2, 2]
    }
  };

  // Wetlands fill layer (color-coded by type)
  const wetlandsFillLayer: FillLayer = {
    id: 'wetlands-fill',
    type: 'fill',
    source: 'wetlands',
    paint: {
      'fill-color': [
        'match',
        ['get', 'wetland_type'],
        'Freshwater Forested/Shrub Wetland', '#065F46',  // Dark green
        'Riverine', '#0284C7',  // Blue
        'Freshwater Pond', '#0891B2',  // Cyan
        'Freshwater Emergent Wetland', '#059669',  // Emerald
        'Estuarine and Marine Wetland', '#0EA5E9',  // Sky blue
        'Estuarine and Marine Deepwater', '#0C4A6E',  // Dark blue
        'Lake', '#1E3A8A',  // Navy blue
        '#6B7280'  // Gray (default for "Other")
      ],
      'fill-opacity': 0.4
    }
  };

  // Wetlands outline layer
  const wetlandsLineLayer: LineLayer = {
    id: 'wetlands-line',
    type: 'line',
    source: 'wetlands',
    paint: {
      'line-color': [
        'match',
        ['get', 'wetland_type'],
        'Freshwater Forested/Shrub Wetland', '#065F46',
        'Riverine', '#0284C7',
        'Freshwater Pond', '#0891B2',
        'Freshwater Emergent Wetland', '#059669',
        'Estuarine and Marine Wetland', '#0EA5E9',
        'Estuarine and Marine Deepwater', '#0C4A6E',
        'Lake', '#1E3A8A',
        '#6B7280'
      ],
      'line-width': 1.5,
      'line-dasharray': [2, 1]
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      overflow: 'hidden'
    }}>
      {/* Map Container */}
      <div style={{
        flex: 1,
        position: 'relative',
        height: '100%'
      }}>
        <Map
          ref={mapRef}
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGV4YW1wbGUifQ.example'}
          initialViewState={{
            longitude: center[0],
            latitude: center[1],
            zoom: zoom
          }}
          mapStyle={currentMapStyle === 'satellite' ? "mapbox://styles/mapbox/satellite-streets-v12" : "mapbox://styles/mapbox/light-v11"}
          cursor={cursor}
          interactiveLayerIds={['main-parcels-fill', 'surrounding-parcels-fill']}
          onClick={handleMapClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Flood zones layer (bottom) */}
          {showFloodZones && (
            <Source id="flood-zones" type="geojson" data={floodZones}>
              <Layer {...floodZoneFillLayer} />
              <Layer {...floodZoneLineLayer} />
            </Source>
          )}

          {/* Wetlands layer */}
          {showWetlands && (
            <Source id="wetlands" type="geojson" data={wetlands}>
              <Layer {...wetlandsFillLayer} />
              <Layer {...wetlandsLineLayer} />
            </Source>
          )}

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

        {/* Environmental Layers Control Panel */}
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 8,
          padding: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          minWidth: 180,
          zIndex: 10
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#374151',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            🗺️ Environmental Layers
            {isLoadingEnvLayers && (
              <span style={{ fontSize: 10, color: '#6B7280' }}>(loading...)</span>
            )}
          </div>

          {/* Map Style Toggle */}
          <div style={{
            display: 'flex',
            backgroundColor: '#F3F4F6',
            borderRadius: 6,
            padding: 2,
            marginBottom: 12
          }}>
            <button
              onClick={() => setCurrentMapStyle('streets')}
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: 12,
                borderRadius: 4,
                border: 'none',
                backgroundColor: currentMapStyle === 'streets' ? 'white' : 'transparent',
                color: currentMapStyle === 'streets' ? '#1F2937' : '#6B7280',
                boxShadow: currentMapStyle === 'streets' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                fontWeight: currentMapStyle === 'streets' ? 500 : 400
              }}
            >
              Map
            </button>
            <button
              onClick={() => setCurrentMapStyle('satellite')}
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: 12,
                borderRadius: 4,
                border: 'none',
                backgroundColor: currentMapStyle === 'satellite' ? 'white' : 'transparent',
                color: currentMapStyle === 'satellite' ? '#1F2937' : '#6B7280',
                boxShadow: currentMapStyle === 'satellite' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                fontWeight: currentMapStyle === 'satellite' ? 500 : 400
              }}
            >
              Satellite
            </button>
          </div>

          {/* Flood Zones Toggle */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 0',
            cursor: 'pointer',
            fontSize: 13,
            color: '#1F2937'
          }}>
            <input
              type="checkbox"
              checked={showFloodZones}
              onChange={(e) => setShowFloodZones(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <span style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              backgroundColor: '#DC2626',
              opacity: 0.6,
              borderRadius: 2,
              border: '1px solid #991B1B'
            }} />
            Flood Zones
            {showFloodZones && floodZones.features.length > 0 && (
              <span style={{ fontSize: 10, color: '#6B7280' }}>
                ({floodZones.features.length})
              </span>
            )}
          </label>

          {/* Wetlands Toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 0',
              cursor: 'pointer',
              fontSize: 13,
              color: '#1F2937'
            }}>
              <input
                type="checkbox"
                checked={showWetlands}
                onChange={(e) => setShowWetlands(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <span style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                backgroundColor: '#059669',
                opacity: 0.6,
                borderRadius: 2,
                border: '1px solid #047857'
              }} />
              Wetlands
              {showWetlands && wetlands.features.length > 0 && (
                <span style={{ fontSize: 10, color: '#6B7280' }}>
                  ({wetlands.features.length})
                </span>
              )}
            </label>

            {/* Wetlands Controls */}
            {showWetlands && (
              <div style={{
                marginLeft: 24,
                paddingLeft: 8,
                borderLeft: '2px solid #E5E7EB',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}>
                {/* Legend Toggle */}
                {wetlandTypes.length > 0 && (
                  <button
                    onClick={() => setShowWetlandsLegend(!showWetlandsLegend)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 11,
                      color: '#6B7280',
                      textDecoration: 'underline',
                      textAlign: 'left',
                      padding: 0
                    }}
                  >
                    {showWetlandsLegend ? '▼ Hide' : '▶ Show'} Legend
                  </button>
                )}

                {/* Manual Refresh Button */}
                <button
                  onClick={() => fetchWetlandsInViewport()}
                  disabled={isLoadingEnvLayers}
                  style={{
                    fontSize: 11,
                    padding: '4px 8px',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: isLoadingEnvLayers ? 'not-allowed' : 'pointer',
                    opacity: isLoadingEnvLayers ? 0.5 : 1
                  }}
                >
                  {isLoadingEnvLayers ? 'Loading...' : '🔄 Refresh Wetlands'}
                </button>

                {/* Auto-refresh Toggle */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: '#6B7280',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={autoRefreshWetlands}
                    onChange={(e) => setAutoRefreshWetlands(e.target.checked)}
                    style={{ width: 12, height: 12, cursor: 'pointer' }}
                  />
                  Auto-refresh on pan/zoom
                </label>
              </div>
            )}

            {/* Wetlands Legend */}
            {showWetlands && showWetlandsLegend && wetlandTypes.length > 0 && (
              <div style={{
                marginLeft: 24,
                paddingLeft: 8,
                borderLeft: '2px solid #E5E7EB',
                fontSize: 11,
                color: '#6B7280',
                maxHeight: 200,
                overflowY: 'auto'
              }}>
                {wetlandTypes.map((type, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 0'
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      backgroundColor: type.color,
                      opacity: 0.6,
                      borderRadius: 2,
                      border: `1px solid ${type.color}`,
                      flexShrink: 0
                    }} />
                    <span style={{ fontSize: 10, lineHeight: 1.2 }}>
                      {type.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legend for high-risk flood zones */}
          {showFloodZones && floodZones.features.some(f => f.properties?.is_high_risk) && (
            <div style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid #E5E7EB',
              fontSize: 11,
              color: '#6B7280'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  backgroundColor: '#DC2626',
                  opacity: 0.5,
                  borderRadius: 2
                }} />
                High Risk (A, AE, V, VE)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  backgroundColor: '#3B82F6',
                  opacity: 0.5,
                  borderRadius: 2
                }} />
                Moderate/Minimal (X, D)
              </div>
            </div>
          )}
        </div>

        {/* Parcel Preview Modal (Quick Access Data) */}
        <ParcelPreviewModal parcelInfo={hoveredParcelInfo} />
      </div>
    </div>
  );
}
