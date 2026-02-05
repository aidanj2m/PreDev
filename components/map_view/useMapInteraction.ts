import { useState, useRef, useCallback } from 'react';
import type { MapRef } from 'react-map-gl';

export function useMapInteraction(mapRef?: React.RefObject<MapRef | null>) {
  const [hoveredParcelId, setHoveredParcelId] = useState<number | null>(null);
  const [hoveredParcelInfo, setHoveredParcelInfo] = useState<any>(null);
  const [cursor, setCursor] = useState<string>('default');
  
  const hoveredParcelIdRef = useRef<number | null>(null);
  const hoveredSourceRef = useRef<'main-parcels' | 'surrounding-parcels' | null>(null);

  const clearHoverState = useCallback(() => {
    // Clear the feature state on the previously hovered feature
    if (mapRef?.current && hoveredParcelIdRef.current !== null && hoveredSourceRef.current) {
      mapRef.current.setFeatureState(
        { source: hoveredSourceRef.current, id: hoveredParcelIdRef.current },
        { hover: false }
      );
    }
    hoveredParcelIdRef.current = null;
    hoveredSourceRef.current = null;
  }, [mapRef]);

  const handleMouseMove = useCallback((event: any) => {
    const features = event.features;
    if (!features || features.length === 0) {
      clearHoverState();
      setCursor('default');
      setHoveredParcelId(null);
      setHoveredParcelInfo(null);
      return;
    }

    const feature = features[0];
    if (!feature.properties) return;

    const props = feature.properties;
    const featureId = feature.id;

    // Set cursor and hover state
    if (props._isMainParcel || props._isSurrounding) {
      const source = props._isMainParcel ? 'main-parcels' : 'surrounding-parcels';
      
      // Only update if hovering over a different feature
      if (featureId !== hoveredParcelIdRef.current || source !== hoveredSourceRef.current) {
        // Clear previous hover state
        clearHoverState();
        
        // Set new hover state
        if (mapRef?.current && typeof featureId === 'number') {
          mapRef.current.setFeatureState(
            { source, id: featureId },
            { hover: true }
          );
          hoveredParcelIdRef.current = featureId;
          hoveredSourceRef.current = source;
        }
      }
      
      setCursor('pointer');
      setHoveredParcelId(typeof featureId === 'number' ? featureId : null);
      setHoveredParcelInfo(props);
    } else {
      clearHoverState();
      setCursor('default');
      setHoveredParcelId(null);
      setHoveredParcelInfo(null);
    }
  }, [mapRef, clearHoverState]);

  const handleMouseLeave = useCallback(() => {
    clearHoverState();
    setCursor('default');
    setHoveredParcelId(null);
    setHoveredParcelInfo(null);
  }, [clearHoverState]);

  return {
    hoveredParcelId,
    hoveredParcelInfo,
    cursor,
    hoveredParcelIdRef,
    hoveredSourceRef,
    clearHoverState,
    handleMouseMove,
    handleMouseLeave
  };
}
