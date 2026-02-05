import { useState, useCallback, useRef } from 'react';
import { MapRef } from 'react-map-gl';
import { parcelsAPI } from '@/lib/api-client';
import { GeoJSONCollection, ParcelFeature } from './types';

const MIN_ZOOM = 15;
const DEBOUNCE_MS = 500;

type BBox = [number, number, number, number];

function bboxContainedWithin(inner: BBox, outer: BBox, threshold = 0.0005): boolean {
  return (
    inner[0] >= outer[0] - threshold &&
    inner[1] >= outer[1] - threshold &&
    inner[2] <= outer[2] + threshold &&
    inner[3] <= outer[3] + threshold
  );
}

function featureFingerprint(feature: any): string {
  const coords = feature.geometry?.coordinates?.[0]?.[0];
  if (!coords) return Math.random().toString();
  return `${coords[0].toFixed(6)},${coords[1].toFixed(6)}`;
}

export function useViewportParcels(
  mapRef: React.RefObject<MapRef | null>,
  mainParcels: GeoJSONCollection
) {
  const [viewportParcels, setViewportParcels] = useState<GeoJSONCollection>({
    type: 'FeatureCollection',
    features: []
  });
  const [isLoadingViewportParcels, setIsLoadingViewportParcels] = useState(false);

  const lastFetchedBboxRef = useRef<BBox | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedRef = useRef<Map<string, ParcelFeature>>(new Map());

  const fetchParcelsForViewport = useCallback(async () => {
    if (!mapRef.current) return;

    const map = mapRef.current.getMap();
    const zoom = map.getZoom();
    if (zoom < MIN_ZOOM) return;

    const bounds = map.getBounds();
    if (!bounds) return;

    const currentBbox: BBox = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ];

    if (lastFetchedBboxRef.current && bboxContainedWithin(currentBbox, lastFetchedBboxRef.current)) {
      return;
    }

    setIsLoadingViewportParcels(true);

    try {
      const data = await parcelsAPI.getNearbyParcels(currentBbox, { limit: 200 });
      lastFetchedBboxRef.current = currentBbox;

      // Build main parcel fingerprints for exclusion
      const mainFps = new Set(mainParcels.features.map(featureFingerprint));

      if (data.features) {
        for (const feature of data.features) {
          const fp = featureFingerprint(feature);
          if (mainFps.has(fp)) continue;
          if (accumulatedRef.current.has(fp)) continue;

          accumulatedRef.current.set(fp, {
            type: 'Feature',
            id: accumulatedRef.current.size,
            geometry: {
              type: 'Polygon',
              coordinates: feature.geometry.coordinates
            },
            properties: {
              ...feature.properties,
              _isSurrounding: true
            }
          });
        }
      }

      setViewportParcels({
        type: 'FeatureCollection',
        features: Array.from(accumulatedRef.current.values())
      });
    } catch (err) {
      console.error('Error fetching viewport parcels:', err);
    } finally {
      setIsLoadingViewportParcels(false);
    }
  }, [mapRef, mainParcels]);

  const handleViewportChange = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchParcelsForViewport();
    }, DEBOUNCE_MS);
  }, [fetchParcelsForViewport]);

  return {
    viewportParcels,
    isLoadingViewportParcels,
    handleViewportChange
  };
}
