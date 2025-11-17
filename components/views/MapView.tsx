'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Address, addressesAPI } from '@/lib/api-client';

// Esri ArcGIS SDK imports - these will be dynamically loaded
let esriMap: any;
let esriMapView: any;
let esriGraphic: any;
let esriGraphicsLayer: any;
let esriSimpleFillSymbol: any;
let esriSimpleLineSymbol: any;

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

export default function MapView({ addresses, onBack, onAddAddress }: MapViewProps) {
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapView = useRef<any>(null);
  const [isLoadingBoundaries, setIsLoadingBoundaries] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [surroundingParcels, setSurroundingParcels] = useState<any[]>([]);
  const mainParcelsLayer = useRef<any>(null);
  const surroundingParcelsLayer = useRef<any>(null);

  // Initialize Esri map
  useEffect(() => {
    if (!mapDiv.current) return;
    if (mapView.current) return; // Only initialize once

    // Dynamically load Esri modules
    const loadEsriModules = async () => {
      const [Map, MapView, Graphic, GraphicsLayer, SimpleFillSymbol, SimpleLineSymbol] = await Promise.all([
        import('@arcgis/core/Map'),
        import('@arcgis/core/views/MapView'),
        import('@arcgis/core/Graphic'),
        import('@arcgis/core/layers/GraphicsLayer'),
        import('@arcgis/core/symbols/SimpleFillSymbol'),
        import('@arcgis/core/symbols/SimpleLineSymbol')
      ]);

      esriMap = Map.default;
      esriMapView = MapView.default;
      esriGraphic = Graphic.default;
      esriGraphicsLayer = GraphicsLayer.default;
      esriSimpleFillSymbol = SimpleFillSymbol.default;
      esriSimpleLineSymbol = SimpleLineSymbol.default;

      // Calculate center from addresses
      const validCoords = addresses.filter(a => a.latitude && a.longitude);
      let center = [-98.5795, 39.8283]; // Center of US as default
      let zoom = 4;

      if (validCoords.length > 0) {
        const avgLat = validCoords.reduce((sum, a) => sum + (a.latitude || 0), 0) / validCoords.length;
        const avgLng = validCoords.reduce((sum, a) => sum + (a.longitude || 0), 0) / validCoords.length;
        center = [avgLng, avgLat];
        zoom = validCoords.length === 1 ? 16 : 13;
      }

      // Create map
      const map = new esriMap({
        basemap: 'streets-vector'
      });

      // Create graphics layers
      mainParcelsLayer.current = new esriGraphicsLayer({ id: 'mainParcels' });
      surroundingParcelsLayer.current = new esriGraphicsLayer({ id: 'surroundingParcels' });

      map.addMany([surroundingParcelsLayer.current, mainParcelsLayer.current]);

      // Create map view
      const view = new esriMapView({
        container: mapDiv.current,
        map: map,
        center: center,
        zoom: zoom,
        navigation: {
          mouseWheelZoomEnabled: true,
          browserTouchPanEnabled: false // Disable pan by touch/drag
        },
        ui: {
          components: ['zoom'] // Only show zoom controls
        }
      });

      // Disable pan with mouse
      view.on('drag', (event: any) => {
        event.stopPropagation();
      });

      mapView.current = view;

      view.when(() => {
        setMapLoaded(true);
      });
    };

    loadEsriModules();

    return () => {
      if (mapView.current) {
        mapView.current.destroy();
        mapView.current = null;
      }
    };
  }, []);

  // Load boundaries and parcels
  useEffect(() => {
    if (!mapLoaded || !mapView.current) return;

    const loadBoundaries = async () => {
      setIsLoadingBoundaries(true);

      // Clear existing graphics
      if (mainParcelsLayer.current) mainParcelsLayer.current.removeAll();
      if (surroundingParcelsLayer.current) surroundingParcelsLayer.current.removeAll();

      const allSurrounding: any[] = [];

      // Load boundaries for each address
      for (const address of addresses) {
        if (!address.latitude || !address.longitude) continue;

        try {
          const boundaryData = await addressesAPI.getBoundary(address.id);

          // Add main parcel boundary
          if (boundaryData.boundary && boundaryData.boundary.geometry) {
            const mainParcelGraphic = new esriGraphic({
              geometry: {
                type: 'polygon',
                rings: boundaryData.boundary.geometry.coordinates[0]
              },
              symbol: new esriSimpleFillSymbol({
                color: [0, 0, 0, 0.15],
                outline: {
                  color: [0, 0, 0],
                  width: 3
                }
              }),
              attributes: boundaryData.boundary.properties
            });

            mainParcelsLayer.current.add(mainParcelGraphic);
          }

          // Add surrounding parcels
          if (boundaryData.surrounding_parcels) {
            console.log(`Found ${boundaryData.surrounding_parcels.length} surrounding parcels`);
            allSurrounding.push(...boundaryData.surrounding_parcels);

            boundaryData.surrounding_parcels.forEach((parcel: any, index: number) => {
              if (parcel.geometry && parcel.geometry.coordinates) {
                const surroundingGraphic = new esriGraphic({
                  geometry: {
                    type: 'polygon',
                    rings: parcel.geometry.coordinates[0]
                  },
                  symbol: new esriSimpleFillSymbol({
                    color: [153, 153, 153, 0.01], // Very light gray fill
                    outline: {
                      color: [153, 153, 153],
                      width: 1.5
                    }
                  }),
                  attributes: {
                    ...parcel.properties,
                    _isSurrounding: true,
                    _index: index
                  }
                });

                surroundingParcelsLayer.current.add(surroundingGraphic);
              }
            });
          }
        } catch (error) {
          console.error(`Error loading boundary for address ${address.id}:`, error);
        }
      }

      setSurroundingParcels(allSurrounding);

      // Set up click handler for surrounding parcels
      if (onAddAddress) {
        mapView.current.on('click', async (event: any) => {
          const response = await mapView.current.hitTest(event);
          
          if (response.results.length > 0) {
            const graphic = response.results[0].graphic;
            
            if (graphic && graphic.attributes && graphic.attributes._isSurrounding) {
              const props = graphic.attributes;
              
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

              // Change to selected style
              graphic.symbol = new esriSimpleFillSymbol({
                color: [0, 0, 0, 0.1],
                outline: {
                  color: [0, 0, 0],
                  width: 2
                }
              });

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
            }
          }
        });

        // Hover effect
        mapView.current.on('pointer-move', async (event: any) => {
          const response = await mapView.current.hitTest(event);
          
          if (response.results.length > 0) {
            const graphic = response.results[0].graphic;
            
            if (graphic && graphic.attributes && graphic.attributes._isSurrounding) {
              mapView.current.container.style.cursor = 'pointer';
              
              // Highlight on hover
              graphic.symbol = new esriSimpleFillSymbol({
                color: [153, 153, 153, 0.15],
                outline: {
                  color: [153, 153, 153],
                  width: 1.5
                }
              });
            } else {
              mapView.current.container.style.cursor = 'default';
            }
          } else {
            mapView.current.container.style.cursor = 'default';
          }
        });
      }

      setIsLoadingBoundaries(false);

      // Fit to extent of all addresses
      if (addresses.length > 1 && mapView.current) {
        const extent = mainParcelsLayer.current.graphics.reduce((ext: any, graphic: any) => {
          if (!ext) return graphic.geometry.extent;
          return ext.union(graphic.geometry.extent);
        }, null);

        if (extent) {
          mapView.current.goTo(extent.expand(1.5));
        }
      }
    };

    loadBoundaries();
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
      <div ref={mapDiv} style={{
        flex: 1,
        position: 'relative'
      }} />

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
        {surroundingParcels.length > 0 && (
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
