'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Map, { Source, Layer, MapRef, MapLayerMouseEvent } from 'react-map-gl';
import { Address, addressesAPI, environmentalAPI, GeoJSONFeatureCollection } from '@/lib/api-client';
import 'mapbox-gl/dist/mapbox-gl.css';
import ParcelPreviewModal from '@/components/modals/ParcelPreviewModal';
import EnvironmentalLayersPanel from '@/components/map/EnvironmentalLayersPanel';
import { parseBoundaryGeoJSON } from '@/lib/wkt-parser';
import {
  mainParcelFillLayer,
  mainParcelLineLayer,
  surroundingParcelFillLayer,
  surroundingParcelLineLayer,
  wetlandsFillLayer,
  wetlandsLineLayer,
  redevZonesFillLayer,
  redevZonesLineLayer
} from '@/lib/map-layer-styles';

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

  // Environmental layers state (wetlands only)
  const [showWetlands, setShowWetlands] = useState(false);
  const [wetlands, setWetlands] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoadingEnvLayers, setIsLoadingEnvLayers] = useState(false);
  const [wetlandTypes, setWetlandTypes] = useState<any[]>([]);
  const [showWetlandsLegend, setShowWetlandsLegend] = useState(false);
  const [autoRefreshWetlands, setAutoRefreshWetlands] = useState(true);

  // Redevelopment Zones state
  const [showRedevZones, setShowRedevZones] = useState(false);
  const [redevZones, setRedevZones] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoadingRedevZones, setIsLoadingRedevZones] = useState(false);

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

  // Function to fetch redev zones in current viewport
  const fetchRedevZonesInViewport = useCallback(async () => {
    if (!showRedevZones || !mapRef.current) return;

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

      console.log('Fetching redev zones in viewport:', bbox);
      const redevData = await environmentalAPI.getNJRedevZonesInBbox(bbox, {
        limit: 1000
      });

      setRedevZones(redevData);
      console.log(`✓ Loaded ${redevData.features.length} redev zone features in viewport`);
    } catch (err) {
      console.error('Error loading redev zones:', err);
    }
  }, [showRedevZones]);

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

  // Load wetlands when toggled on
  useEffect(() => {
    const loadWetlands = async () => {
      if (!showWetlands) {
        return;
      }

      setIsLoadingEnvLayers(true);

      try {
        await fetchWetlandsInViewport();
      } catch (error) {
        console.error('Error loading wetlands:', error);
      } finally {
        setIsLoadingEnvLayers(false);
      }
    };

    loadWetlands();
  }, [showWetlands, fetchWetlandsInViewport]);

  // Load redevelopment zones when toggled on
  useEffect(() => {
    const loadRedevZones = async () => {
      if (!showRedevZones) return;

      setIsLoadingRedevZones(true);
      try {
        await fetchRedevZonesInViewport();
      } catch (error) {
        console.error('Error loading redev zones:', error);
      } finally {
        setIsLoadingRedevZones(false);
      }
    };

    loadRedevZones();
  }, [showRedevZones, fetchRedevZonesInViewport]);

  // Auto-refresh redev zones when map moves (if enabled - reusing wetlands auto-refresh setting for now or just always auto-refreshing when on)
  useEffect(() => {
    if (!showRedevZones || !mapRef.current) return;

    const map = mapRef.current.getMap();
    let timeoutId: NodeJS.Timeout;

    const handleMoveEnd = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchRedevZonesInViewport();
      }, 500);
    };

    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
      clearTimeout(timeoutId);
    };
  }, [showRedevZones, fetchRedevZonesInViewport]);

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
          // Check if boundary is cached
          if (address.boundary_geojson) {
            console.log(`Using cached boundary for address ${address.id}`);

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

          // Always fetch surrounding parcels from API (queries Supabase or Lightbox as needed)
          console.log(`Fetching surrounding parcels from API for address ${address.id}`);
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

  // Determine if we're still loading critical data
  const isInitialLoading = isLoadingBoundaries || (addresses.length > 0 && mainParcels.features.length === 0);

  // Show loading screen while fetching initial data
  if (isInitialLoading) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <div style={{
            fontSize: '16px',
            fontWeight: 500,
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            Loading parcels...
          </div>
          <div style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>
            {isLoadingBoundaries && 'Fetching boundaries and surrounding parcels'}
            {isLoadingEnvLayers && showWetlands && ' • Loading wetlands data'}
          </div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Map Container */}
      <div style={{
        flex: 1,
        position: 'relative',
        height: '100%'
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          right: '-200px',
          top: 0,
          bottom: 0,
          width: 'calc(100% + 200px)',
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
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
            cursor={cursor}
            interactiveLayerIds={['main-parcels-fill', 'surrounding-parcels-fill']}
            onClick={handleMapClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Wetlands layer */}
            {showWetlands && (
              <Source id="wetlands" type="geojson" data={wetlands}>
                <Layer {...wetlandsFillLayer} />
                <Layer {...wetlandsLineLayer} />
              </Source>
            )}

            {/* Redevelopment Zones layer */}
            {showRedevZones && (
              <Source id="redev-zones" type="geojson" data={redevZones}>
                <Layer {...redevZonesFillLayer} />
                <Layer {...redevZonesLineLayer} />
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
        </div>

        {/* Wetlands Control Panel */}
        <EnvironmentalLayersPanel
          showWetlands={showWetlands}
          onWetlandsChange={setShowWetlands}
          wetlandCount={wetlands.features.length}
          wetlandTypes={wetlandTypes}
          showWetlandsLegend={showWetlandsLegend}
          onToggleWetlandsLegend={() => setShowWetlandsLegend(!showWetlandsLegend)}
          onRefreshWetlands={fetchWetlandsInViewport}
          autoRefreshWetlands={autoRefreshWetlands}
          onAutoRefreshChange={setAutoRefreshWetlands}
          isLoading={isLoadingEnvLayers || isLoadingRedevZones}

          // Redevelopment Zones Props
          showRedevZones={showRedevZones}
          onRedevZonesChange={setShowRedevZones}
          redevZoneCount={redevZones.features.length}
        />

        {/* Parcel Preview Modal (Quick Access Data) */}
        <ParcelPreviewModal parcelInfo={hoveredParcelInfo} />
      </div>
    </div>
  );
}
