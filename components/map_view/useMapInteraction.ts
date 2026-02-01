import { useState, useRef, useCallback } from 'react';

export function useMapInteraction() {
  const [hoveredParcelId, setHoveredParcelId] = useState<number | null>(null);
  const [hoveredParcelInfo, setHoveredParcelInfo] = useState<any>(null);
  const [cursor, setCursor] = useState<string>('default');
  
  const hoveredParcelIdRef = useRef<number | null>(null);
  const hoveredSourceRef = useRef<'main-parcels' | 'surrounding-parcels' | null>(null);

  const clearHoverState = useCallback(() => {
    // Clear hover state logic would go here if needed
  }, []);

  const handleMouseMove = useCallback((event: any) => {
    const features = event.features;
    if (!features || features.length === 0) {
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
      setCursor('pointer');
      setHoveredParcelId(typeof featureId === 'number' ? featureId : null);
      setHoveredParcelInfo(props);
    } else {
      setCursor('default');
      setHoveredParcelId(null);
      setHoveredParcelInfo(null);
    }
  }, []);

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
