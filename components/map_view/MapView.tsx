'use client';

import React, { useRef } from 'react';
import Map, { Source, Layer, MapRef } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import ParcelPreviewModal from '@/components/modals/ParcelPreviewModal';
import LoadingOverlay from './LoadingOverlay';
import { MapViewProps } from './types';
import { useEnvironmentalLayers } from './useEnvironmentalLayers';
import { useParcels } from './useParcels';
import { useMapInteraction } from './useMapInteraction';
import {
  mainParcelFillLayer,
  mainParcelLineLayer,
  surroundingParcelFillLayer,
  surroundingParcelLineLayer,
  wetlandsFillLayer,
  wetlandsLineLayer,
  redevZonesFillLayer,
  redevZonesLineLayer,
  nearbyParcelsFillLayer,
  nearbyParcelsLineLayer,
  cafraCentersFillLayer,
  cafraCentersLineLayer,
  hydroStreamsLineLayer,
  hydroWaterbodiesFillLayer,
  hydroWaterbodiesLineLayer,
  hazardousWasteFillLayer,
  hazardousWasteLineLayer,
  brownfieldFillLayer,
  brownfieldLineLayer,
  contaminatedSitesFillLayer,
  contaminatedSitesLineLayer,
  pinelandsFillLayer,
  pinelandsLineLayer,
  bdaFillLayer,
  bdaLineLayer,
  c1WatersFillLayer,
  c1WatersLineLayer,
  highlandsFillLayer,
  highlandsLineLayer,
  floodHazardLineLayer
} from './layer-styles';

export default function MapView({ addresses, onBack, onAddAddress, onRemoveAddress }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  
  // Custom hooks
  const envLayers = useEnvironmentalLayers(mapRef);
  const { isLoadingBoundaries, mainParcels, surroundingParcels, handleMapClick } = useParcels(addresses, onAddAddress, onRemoveAddress);
  const { hoveredParcelInfo, cursor, handleMouseMove, handleMouseLeave } = useMapInteraction();

  // Calculate initial center from addresses (no auto-zoom)
  const validCoords = addresses.filter(a => a.latitude && a.longitude);
  let center: [number, number] = [-98.5795, 39.8283];
  let zoom = 4;

  if (validCoords.length > 0) {
    const avgLat = validCoords.reduce((sum, a) => sum + (a.latitude || 0), 0) / validCoords.length;
    const avgLng = validCoords.reduce((sum, a) => sum + (a.longitude || 0), 0) / validCoords.length;
    center = [avgLng, avgLat];
    zoom = validCoords.length === 1 ? 18 : 15;
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden', position: 'relative' }}>
      <div style={{ flex: 1, position: 'relative', height: '100%' }}>
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
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''}
            initialViewState={{ longitude: center[0], latitude: center[1], zoom }}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
            cursor={cursor}
            interactiveLayerIds={['main-parcels-fill', 'surrounding-parcels-fill']}
            onClick={handleMapClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Wetlands */}
            {envLayers.showWetlands && (
              <Source id="wetlands" type="geojson" data={envLayers.wetlands}>
                <Layer {...wetlandsFillLayer} />
                <Layer {...wetlandsLineLayer} />
              </Source>
            )}

            {/* Redevelopment Zones */}
            {envLayers.showRedevZones && (
              <Source id="redev-zones" type="geojson" data={envLayers.redevZones}>
                <Layer {...redevZonesFillLayer} />
                <Layer {...redevZonesLineLayer} />
              </Source>
            )}

            {/* CAFRA Centers */}
            {envLayers.showCafra && (
              <Source id="cafra-centers" type="geojson" data={envLayers.cafraData}>
                <Layer {...cafraCentersFillLayer} />
                <Layer {...cafraCentersLineLayer} />
              </Source>
            )}

            {/* Hydrography */}
            {envLayers.showHydro && (
              <Source id="hydrography" type="geojson" data={envLayers.hydroData}>
                <Layer {...hydroStreamsLineLayer} />
                <Layer {...hydroWaterbodiesFillLayer} />
                <Layer {...hydroWaterbodiesLineLayer} />
              </Source>
            )}

            {/* Hazardous Waste Sites */}
            {envLayers.showHazardousWaste && (
              <Source id="hazardous-waste-sites" type="geojson" data={envLayers.hazardousWasteData}>
                <Layer {...hazardousWasteFillLayer} />
                <Layer {...hazardousWasteLineLayer} />
              </Source>
            )}

            {/* Brownfield Sites */}
            {envLayers.showBrownfield && (
              <Source id="brownfield-sites" type="geojson" data={envLayers.brownfieldData}>
                <Layer {...brownfieldFillLayer} />
                <Layer {...brownfieldLineLayer} />
              </Source>
            )}

            {/* Contaminated Sites */}
            {envLayers.showContaminatedSites && (
              <Source id="contaminated-sites" type="geojson" data={envLayers.contaminatedSitesData}>
                <Layer {...contaminatedSitesFillLayer} />
                <Layer {...contaminatedSitesLineLayer} />
              </Source>
            )}

            {/* Pinelands */}
            {envLayers.showPinelands && (
              <Source id="pinelands-areas" type="geojson" data={envLayers.pinelandsData}>
                <Layer {...pinelandsFillLayer} />
                <Layer {...pinelandsLineLayer} />
              </Source>
            )}

            {/* BDA Block/Lots */}
            {envLayers.showBDA && (
              <Source id="bda-blocklots" type="geojson" data={envLayers.bdaData}>
                <Layer {...bdaFillLayer} />
                <Layer {...bdaLineLayer} />
              </Source>
            )}

            {/* C1 Waters */}
            {envLayers.showC1Waters && (
              <Source id="c1-waters" type="geojson" data={envLayers.c1WatersData}>
                <Layer {...c1WatersFillLayer} />
                <Layer {...c1WatersLineLayer} />
              </Source>
            )}

            {/* Highlands */}
            {envLayers.showHighlands && (
              <Source id="highlands-areas" type="geojson" data={envLayers.highlandsData}>
                <Layer {...highlandsFillLayer} />
                <Layer {...highlandsLineLayer} />
              </Source>
            )}

            {/* Flood Hazard */}
            {envLayers.showFloodHazard && (
              <Source id="flood-hazard-sites" type="geojson" data={envLayers.floodHazardData}>
                <Layer {...floodHazardLineLayer} />
              </Source>
            )}

            {/* Nearby Parcels */}
            {envLayers.showNearbyParcels && (
              <Source id="nearby-parcels" type="geojson" data={envLayers.nearbyParcels}>
                <Layer {...nearbyParcelsFillLayer} />
                <Layer {...nearbyParcelsLineLayer} />
              </Source>
            )}

            {/* Surrounding Parcels */}
            <Source id="surrounding-parcels" type="geojson" data={surroundingParcels}>
              <Layer {...surroundingParcelFillLayer} />
              <Layer {...surroundingParcelLineLayer} />
            </Source>

            {/* Main Parcels (on top) */}
            <Source id="main-parcels" type="geojson" data={mainParcels}>
              <Layer {...mainParcelFillLayer} />
              <Layer {...mainParcelLineLayer} />
            </Source>
          </Map>
        </div>

        <ParcelPreviewModal parcelInfo={hoveredParcelInfo} />
        <LoadingOverlay isLoading={isLoadingBoundaries} />
      </div>
    </div>
  );
}
