import { useState, useCallback } from 'react';
import { MapRef } from 'react-map-gl';
import { environmentalAPI, parcelsAPI, GeoJSONFeatureCollection } from '@/lib/api-client';

export function useEnvironmentalLayers(mapRef: React.RefObject<MapRef | null>) {
  // Wetlands
  const [showWetlands, setShowWetlands] = useState(false);
  const [wetlands, setWetlands] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoadingEnvLayers, setIsLoadingEnvLayers] = useState(false);
  const [wetlandTypes, setWetlandTypes] = useState<any[]>([]);
  const [showWetlandsLegend, setShowWetlandsLegend] = useState(false);
  const [autoRefreshWetlands, setAutoRefreshWetlands] = useState(true);

  // Redevelopment Zones
  const [showRedevZones, setShowRedevZones] = useState(false);
  const [redevZones, setRedevZones] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoadingRedevZones, setIsLoadingRedevZones] = useState(false);

  // CAFRA Centers
  const [showCafra, setShowCafra] = useState(false);
  const [cafraData, setCafraData] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoadingCafra, setIsLoadingCafra] = useState(false);

  // Hydrography
  const [showHydro, setShowHydro] = useState(false);
  const [hydroData, setHydroData] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoadingHydro, setIsLoadingHydro] = useState(false);

  // Nearby Parcels
  const [showNearbyParcels, setShowNearbyParcels] = useState(false);
  const [nearbyParcels, setNearbyParcels] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoadingNearbyParcels, setIsLoadingNearbyParcels] = useState(false);

  // Hazardous Waste
  const [showHazardousWaste, setShowHazardousWaste] = useState(false);
  const [hazardousWasteData, setHazardousWasteData] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoadingHazardousWaste, setIsLoadingHazardousWaste] = useState(false);

  // Brownfield
  const [showBrownfield, setShowBrownfield] = useState(false);
  const [brownfieldData, setBrownfieldData] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoadingBrownfield, setIsLoadingBrownfield] = useState(false);

  // Contaminated Sites
  const [showContaminatedSites, setShowContaminatedSites] = useState(false);
  const [contaminatedSitesData, setContaminatedSitesData] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoadingContaminatedSites, setIsLoadingContaminatedSites] = useState(false);

  // Pinelands
  const [showPinelands, setShowPinelands] = useState(false);
  const [pinelandsData, setPinelandsData] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoadingPinelands, setIsLoadingPinelands] = useState(false);

  // BDA
  const [showBDA, setShowBDA] = useState(false);
  const [bdaData, setBDAData] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoadingBDA, setIsLoadingBDA] = useState(false);

  // C1 Waters
  const [showC1Waters, setShowC1Waters] = useState(false);
  const [c1WatersData, setC1WatersData] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoadingC1Waters, setIsLoadingC1Waters] = useState(false);

  // Highlands
  const [showHighlands, setShowHighlands] = useState(false);
  const [highlandsData, setHighlandsData] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoadingHighlands, setIsLoadingHighlands] = useState(false);

  // Flood Hazard
  const [showFloodHazard, setShowFloodHazard] = useState(false);
  const [floodHazardData, setFloodHazardData] = useState<GeoJSONFeatureCollection>({ type: 'FeatureCollection', features: [] });
  const [isLoadingFloodHazard, setIsLoadingFloodHazard] = useState(false);

  // Fetch functions
  const getBounds = useCallback(() => {
    if (!mapRef.current) return null;
    const map = mapRef.current.getMap();
    const bounds = map.getBounds();
    if (!bounds) return null;
    return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] as [number, number, number, number];
  }, [mapRef]);

  const fetchWetlandsInViewport = useCallback(async () => {
    if (!showWetlands) return;
    const bbox = getBounds();
    if (!bbox) return;
    try {
      const data = await environmentalAPI.getNJWetlandsInBbox(bbox, { limit: 2000 });
      setWetlands(data);
    } catch (err) {
      console.error('Error loading wetlands:', err);
    }
  }, [showWetlands, getBounds]);

  const fetchRedevZonesInViewport = useCallback(async () => {
    if (!showRedevZones) return;
    const bbox = getBounds();
    if (!bbox) return;
    try {
      const data = await environmentalAPI.getNJRedevZonesInBbox(bbox, { limit: 1000 });
      setRedevZones(data);
    } catch (err) {
      console.error('Error loading redev zones:', err);
    }
  }, [showRedevZones, getBounds]);

  const fetchCafraInViewport = useCallback(async () => {
    if (!showCafra) return;
    const bbox = getBounds();
    if (!bbox) return;
    try {
      const data = await environmentalAPI.getNJCafraCentersInBbox(bbox);
      setCafraData(data);
    } catch (err) {
      console.error('Error loading CAFRA centers:', err);
    }
  }, [showCafra, getBounds]);

  const fetchHydroInViewport = useCallback(async () => {
    if (!showHydro) return;
    const bbox = getBounds();
    if (!bbox) return;
    try {
      const data = await environmentalAPI.getNJHydrographyInBbox(bbox);
      setHydroData(data);
    } catch (err) {
      console.error('Error loading hydrography:', err);
    }
  }, [showHydro, getBounds]);

  const fetchNearbyParcelsInViewport = useCallback(async () => {
    if (!showNearbyParcels) return;
    const bbox = getBounds();
    if (!bbox) return;
    try {
      const data = await parcelsAPI.getNearbyParcels(bbox, { limit: 200 });
      setNearbyParcels(data);
    } catch (err) {
      console.error('Error loading nearby parcels:', err);
    }
  }, [showNearbyParcels, getBounds]);

  const fetchHazardousWasteInViewport = useCallback(async () => {
    if (!showHazardousWaste) return;
    const bbox = getBounds();
    if (!bbox) return;
    try {
      const data = await environmentalAPI.getNJHazardousWasteSitesInBbox(bbox, { limit: 500 });
      setHazardousWasteData(data);
    } catch (err) {
      console.error('Error loading hazardous waste sites:', err);
    }
  }, [showHazardousWaste, getBounds]);

  const fetchBrownfieldInViewport = useCallback(async () => {
    if (!showBrownfield) return;
    const bbox = getBounds();
    if (!bbox) return;
    try {
      const data = await environmentalAPI.getNJBrownfieldSitesInBbox(bbox, { limit: 500 });
      setBrownfieldData(data);
    } catch (err) {
      console.error('Error loading brownfield sites:', err);
    }
  }, [showBrownfield, getBounds]);

  const fetchContaminatedSitesInViewport = useCallback(async () => {
    if (!showContaminatedSites) return;
    const bbox = getBounds();
    if (!bbox) return;
    try {
      const data = await environmentalAPI.getNJContaminatedSitesInBbox(bbox, { limit: 500 });
      setContaminatedSitesData(data);
    } catch (err) {
      console.error('Error loading contaminated sites:', err);
    }
  }, [showContaminatedSites, getBounds]);

  const fetchPinelandsInViewport = useCallback(async () => {
    if (!showPinelands) return;
    const bbox = getBounds();
    if (!bbox) return;
    try {
      const data = await environmentalAPI.getNJPinelandsAreasInBbox(bbox);
      setPinelandsData(data);
    } catch (err) {
      console.error('Error loading pinelands:', err);
    }
  }, [showPinelands, getBounds]);

  const fetchBDAInViewport = useCallback(async () => {
    if (!showBDA) return;
    const bbox = getBounds();
    if (!bbox) return;
    try {
      const data = await environmentalAPI.getNJBDABlockLotsInBbox(bbox);
      setBDAData(data);
    } catch (err) {
      console.error('Error loading BDA:', err);
    }
  }, [showBDA, getBounds]);

  const fetchC1WatersInViewport = useCallback(async () => {
    if (!showC1Waters) return;
    const bbox = getBounds();
    if (!bbox) return;
    try {
      const data = await environmentalAPI.getNJC1WatersInBbox(bbox);
      setC1WatersData(data);
    } catch (err) {
      console.error('Error loading C1 waters:', err);
    }
  }, [showC1Waters, getBounds]);

  const fetchHighlandsInViewport = useCallback(async () => {
    if (!showHighlands) return;
    const bbox = getBounds();
    if (!bbox) return;
    try {
      const data = await environmentalAPI.getNJHighlandsAreasInBbox(bbox);
      setHighlandsData(data);
    } catch (err) {
      console.error('Error loading highlands:', err);
    }
  }, [showHighlands, getBounds]);

  const fetchFloodHazardInViewport = useCallback(async () => {
    if (!showFloodHazard) return;
    const bbox = getBounds();
    if (!bbox) return;
    try {
      const data = await environmentalAPI.getNJFloodHazardSitesInBbox(bbox, { limit: 1000 });
      setFloodHazardData(data);
    } catch (err) {
      console.error('Error loading flood hazard sites:', err);
    }
  }, [showFloodHazard, getBounds]);

  return {
    // Wetlands
    showWetlands,
    setShowWetlands,
    wetlands,
    isLoadingEnvLayers,
    wetlandTypes,
    showWetlandsLegend,
    setShowWetlandsLegend,
    autoRefreshWetlands,
    setAutoRefreshWetlands,
    fetchWetlandsInViewport,
    
    // Redev Zones
    showRedevZones,
    setShowRedevZones,
    redevZones,
    isLoadingRedevZones,
    fetchRedevZonesInViewport,
    
    // CAFRA
    showCafra,
    setShowCafra,
    cafraData,
    isLoadingCafra,
    fetchCafraInViewport,
    
    // Hydro
    showHydro,
    setShowHydro,
    hydroData,
    isLoadingHydro,
    fetchHydroInViewport,
    
    // Nearby Parcels
    showNearbyParcels,
    setShowNearbyParcels,
    nearbyParcels,
    isLoadingNearbyParcels,
    fetchNearbyParcelsInViewport,
    
    // Hazardous Waste
    showHazardousWaste,
    setShowHazardousWaste,
    hazardousWasteData,
    isLoadingHazardousWaste,
    fetchHazardousWasteInViewport,
    
    // Brownfield
    showBrownfield,
    setShowBrownfield,
    brownfieldData,
    isLoadingBrownfield,
    fetchBrownfieldInViewport,
    
    // Contaminated Sites
    showContaminatedSites,
    setShowContaminatedSites,
    contaminatedSitesData,
    isLoadingContaminatedSites,
    fetchContaminatedSitesInViewport,
    
    // Pinelands
    showPinelands,
    setShowPinelands,
    pinelandsData,
    isLoadingPinelands,
    fetchPinelandsInViewport,
    
    // BDA
    showBDA,
    setShowBDA,
    bdaData,
    isLoadingBDA,
    fetchBDAInViewport,
    
    // C1 Waters
    showC1Waters,
    setShowC1Waters,
    c1WatersData,
    isLoadingC1Waters,
    fetchC1WatersInViewport,
    
    // Highlands
    showHighlands,
    setShowHighlands,
    highlandsData,
    isLoadingHighlands,
    fetchHighlandsInViewport,
    
    // Flood Hazard
    showFloodHazard,
    setShowFloodHazard,
    floodHazardData,
    isLoadingFloodHazard,
    fetchFloodHazardInViewport
  };
}
