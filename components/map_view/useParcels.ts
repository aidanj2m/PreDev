import { useState, useEffect, useCallback } from 'react';
import { MapLayerMouseEvent } from 'react-map-gl';
import { Address, addressesAPI } from '@/lib/api-client';
import { ParcelFeature, GeoJSONCollection } from './types';
import { parseBoundaryGeoJSON } from './wkt-parser';

export function useParcels(
  addresses: Address[],
  onAddAddress?: (address: any) => void,
  onRemoveAddress?: (addressId: string) => void
) {
  const [isLoadingBoundaries, setIsLoadingBoundaries] = useState(false);
  const [mainParcels, setMainParcels] = useState<GeoJSONCollection>({ type: 'FeatureCollection', features: [] });
  const [surroundingParcels, setSurroundingParcels] = useState<GeoJSONCollection>({ type: 'FeatureCollection', features: [] });

  // Load boundaries when addresses change
  useEffect(() => {
    const loadBoundaries = async () => {
      // Quick path: If all addresses have cached boundaries
      const allAddressesHaveBoundaries = addresses.every((addr: Address) => addr.boundary_geojson);
      
      if (allAddressesHaveBoundaries && addresses.length > 0) {
        console.log('✓ All addresses have cached boundaries - instant update!');
        
        const mainFeatures: ParcelFeature[] = [];
        addresses
          .filter((addr: Address) => addr.latitude && addr.longitude && addr.boundary_geojson)
          .forEach((address: Address, index: number) => {
            const parsedBoundary = parseBoundaryGeoJSON(address.boundary_geojson);
            if (parsedBoundary && parsedBoundary.geometry) {
              mainFeatures.push({
                type: 'Feature',
                id: index,
                geometry: {
                  type: 'Polygon',
                  coordinates: parsedBoundary.geometry.coordinates
                },
                properties: {
                  ...(parsedBoundary.properties || {}),
                  _isMainParcel: true,
                  _addressId: address.id
                }
              });
            }
          });

        setMainParcels({ type: 'FeatureCollection', features: mainFeatures });
        
        // Filter out surrounding parcels that became main
        setSurroundingParcels((prev: GeoJSONCollection) => ({
          type: 'FeatureCollection',
          features: prev.features.filter((f: ParcelFeature) => {
            const coords = f.geometry.coordinates[0]?.[0];
            if (!coords) return true;
            
            const matchesMain = mainFeatures.some((main: ParcelFeature) => {
              const mainCoords = main.geometry.coordinates[0]?.[0];
              return mainCoords && 
                     Math.abs(mainCoords[0] - coords[0]) < 0.00001 &&
                     Math.abs(mainCoords[1] - coords[1]) < 0.00001;
            });
            
            return !matchesMain;
          })
        }));
        
        setIsLoadingBoundaries(false);
        return;
      }

      // Slow path: Fetch from API
      setIsLoadingBoundaries(true);

      const mainFeatures: ParcelFeature[] = [];
      const surroundingFeatures: ParcelFeature[] = [];

      for (const address of addresses) {
        if (!address.latitude || !address.longitude) continue;

        try {
          if (address.boundary_geojson) {
            const parsedBoundary = parseBoundaryGeoJSON(address.boundary_geojson);
            if (parsedBoundary && parsedBoundary.geometry) {
              mainFeatures.push({
                type: 'Feature',
                id: mainFeatures.length,
                geometry: {
                  type: 'Polygon',
                  coordinates: parsedBoundary.geometry.coordinates
                },
                properties: {
                  ...(parsedBoundary.properties || {}),
                  _isMainParcel: true,
                  _addressId: address.id
                }
              });
            }
          }

          if (!address.boundary_geojson) {
            const boundaryData = await addressesAPI.getBoundary(address.id);

            if (boundaryData.boundary) {
              const parsedBoundary = parseBoundaryGeoJSON(boundaryData.boundary);
              if (parsedBoundary && parsedBoundary.geometry) {
                mainFeatures.push({
                  type: 'Feature',
                  id: mainFeatures.length,
                  geometry: {
                    type: 'Polygon',
                    coordinates: parsedBoundary.geometry.coordinates
                  },
                  properties: {
                    ...(parsedBoundary.properties || {}),
                    _isMainParcel: true,
                    _addressId: address.id
                  }
                });
              }
            }

            if (boundaryData.surrounding_parcels) {
              boundaryData.surrounding_parcels.forEach((parcel: any, index: number) => {
                if (parcel.properties?.is_main_parcel) return;

                if (parcel.geometry && parcel.geometry.coordinates) {
                  surroundingFeatures.push({
                    type: 'Feature',
                    id: surroundingFeatures.length,
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
  }, [addresses]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle parcel clicks
  const handleMapClick = useCallback(async (event: MapLayerMouseEvent) => {
    const features = event.features;
    if (!features || features.length === 0) return;

    const feature = features[0];
    if (!feature.properties) return;

    const props = feature.properties;

    // Remove main parcel
    if (props._isMainParcel && onRemoveAddress) {
      const addressId = props._addressId;
      if (addressId) {
        onRemoveAddress(addressId);
      }
      return;
    }

    // Add surrounding parcel
    if (!props._isSurrounding || !onAddAddress) return;

    let address = props.address || '';
    let city = props.city || '';
    let state = props.state || '';
    let zip = props.zip || '';
    const lat = props.lat ? parseFloat(props.lat) : undefined;
    const lon = props.lon ? parseFloat(props.lon) : undefined;

    // Get address from Mapbox if missing
    if ((!address || !city || !state || !zip) && lat && lon) {
      try {
        const validation = await addressesAPI.validate(`${lon},${lat}`);
        if (validation.valid && validation.street && validation.city && validation.state && validation.zip_code) {
          address = validation.street;
          city = validation.city;
          state = validation.state;
          zip = validation.zip_code;
        } else {
          alert('Could not retrieve address information for this parcel.');
          return;
        }
      } catch (error) {
        console.error('Error fetching address:', error);
        alert('Failed to retrieve address information.');
        return;
      }
    }

    if (!address || !city || !state || !zip) {
      alert('This parcel is missing address information.');
      return;
    }

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

  return {
    isLoadingBoundaries,
    mainParcels,
    surroundingParcels,
    handleMapClick
  };
}
