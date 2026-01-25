import type { FillLayer, LineLayer } from 'react-map-gl';

// Main parcel fill layer with hover effect
export const mainParcelFillLayer: FillLayer = {
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
export const mainParcelLineLayer: LineLayer = {
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
export const surroundingParcelFillLayer: FillLayer = {
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
export const surroundingParcelLineLayer: LineLayer = {
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

// Wetlands fill layer (color-coded by type)
export const wetlandsFillLayer: FillLayer = {
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
export const wetlandsLineLayer: LineLayer = {
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
