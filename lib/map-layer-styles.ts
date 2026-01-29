import type { FillLayer, LineLayer } from 'react-map-gl';

// ============================================================================
// NJDEP Wetlands 2020 Color Palette
// ============================================================================
// ... (previous wetland colors remain the same) ...

export const NJDEP_WETLAND_COLORS: Record<string, string> = {
  // Wooded Wetlands (Deep Greens)
  'DECIDUOUS WOODED WETLANDS': '#1B4332',           // Dark forest green
  'CONIFEROUS WOODED WETLANDS': '#2D6A4F',          // Evergreen green
  'MIXED WOODED WETLANDS (DECIDUOUS DOM.)': '#40916C',  // Medium forest
  'MIXED WOODED WETLANDS (CONIFEROUS DOM.)': '#52B788', // Light forest
  'ATLANTIC WHITE CEDAR WETLANDS': '#74C69D',       // Cedar green

  // Scrub/Shrub Wetlands (Light Greens)
  'DECIDUOUS SCRUB/SHRUB WETLANDS': '#95D5B2',      // Light sage
  'CONIFEROUS SCRUB/SHRUB WETLANDS': '#B7E4C7',     // Pale green
  'MIXED SCRUB/SHRUB WETLANDS (DECIDUOUS DOM.)': '#D8F3DC', // Very light green
  'MIXED SCRUB/SHRUB WETLANDS (CONIFEROUS DOM.)': '#A7C4BC', // Grayish green

  // Herbaceous/Freshwater (Teals & Cyans)
  'HERBACEOUS WETLANDS': '#14B8A6',                 // Teal
  'FRESHWATER TIDAL MARSHES': '#0D9488',            // Dark teal

  // Saline/Coastal (Blues)
  'SALINE MARSH (LOW MARSH)': '#0284C7',            // Ocean blue
  'SALINE MARSH (HIGH MARSH)': '#0369A1',           // Deep blue
  'UNVEGETATED FLATS': '#94A3B8',                   // Slate gray
  'VEGETATED DUNE COMMUNITIES': '#A3E635',          // Lime green

  // Phragmites/Invasive Species (Reds/Purples - Warning colors)
  'PHRAGMITES DOMINATE COASTAL WETLANDS': '#DC2626', // Red
  'PHRAGMITES DOMINATE INTERIOR WETLANDS': '#B91C1C', // Dark red
  'PHRAGMITES DOMINATE URBAN AREA': '#7F1D1D',       // Very dark red

  // Disturbed/Modified (Oranges/Yellows)
  'DISTURBED WETLANDS (MODIFIED)': '#F59E0B',       // Amber
  'DISTURBED TIDAL WETLANDS': '#D97706',            // Dark amber
  'AGRICULTURAL WETLANDS (MODIFIED)': '#EAB308',    // Yellow
  'FORMER AGRICULTURAL WETLAND (BECOMING SHRUBBY, NOT BUILT-UP)': '#CA8A04', // Dark yellow

  // Managed/Urban (Purples/Grays)
  'MANAGED WETLAND IN MAINTAINED LAWN GREENSPACE': '#8B5CF6',     // Purple
  'MANAGED WETLAND IN BUILT-UP MAINTAINED REC AREA': '#7C3AED',   // Dark purple
  'WETLAND RIGHTS-OF-WAY': '#6B7280',              // Gray
  'CEMETERY ON WETLAND': '#9CA3AF',                // Light gray

  // Other/Damaged
  'SEVERE BURNED WETLAND VEGETATION': '#78350F',   // Brown
};

// Default color for unknown wetland types
const DEFAULT_WETLAND_COLOR = '#6B7280';

// Helper function to get color for a wetland label
export function getWetlandColor(label: string): string {
  return NJDEP_WETLAND_COLORS[label?.toUpperCase()] || DEFAULT_WETLAND_COLOR;
}

// ============================================================================
// Parcel Layers
// ============================================================================

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
    'fill-outline-color': '#6B7280'  // Darker grey (was #E5E7EB)
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
      '#6B7280'   // Darker grey border default (was #E5E7EB)
    ],
    'line-width': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      2.5,
      1.5  // Increased from 1 to 1.5
    ]
  }
};

// ============================================================================
// Wetlands Layers (NJDEP 2020)
// ============================================================================

// Build the Mapbox GL match expression for all 27 wetland labels
const wetlandColorMatchExpression: any[] = [
  'match',
  ['get', 'wetland_label'],
  // Wooded Wetlands
  'DECIDUOUS WOODED WETLANDS', '#1B4332',
  'CONIFEROUS WOODED WETLANDS', '#2D6A4F',
  'MIXED WOODED WETLANDS (DECIDUOUS DOM.)', '#40916C',
  'MIXED WOODED WETLANDS (CONIFEROUS DOM.)', '#52B788',
  'ATLANTIC WHITE CEDAR WETLANDS', '#74C69D',
  // Scrub/Shrub Wetlands
  'DECIDUOUS SCRUB/SHRUB WETLANDS', '#95D5B2',
  'CONIFEROUS SCRUB/SHRUB WETLANDS', '#B7E4C7',
  'MIXED SCRUB/SHRUB WETLANDS (DECIDUOUS DOM.)', '#D8F3DC',
  'MIXED SCRUB/SHRUB WETLANDS (CONIFEROUS DOM.)', '#A7C4BC',
  // Herbaceous/Freshwater
  'HERBACEOUS WETLANDS', '#14B8A6',
  'FRESHWATER TIDAL MARSHES', '#0D9488',
  // Saline/Coastal
  'SALINE MARSH (LOW MARSH)', '#0284C7',
  'SALINE MARSH (HIGH MARSH)', '#0369A1',
  'UNVEGETATED FLATS', '#94A3B8',
  'VEGETATED DUNE COMMUNITIES', '#A3E635',
  // Phragmites (Invasive)
  'PHRAGMITES DOMINATE COASTAL WETLANDS', '#DC2626',
  'PHRAGMITES DOMINATE INTERIOR WETLANDS', '#B91C1C',
  'PHRAGMITES DOMINATE URBAN AREA', '#7F1D1D',
  // Disturbed/Modified
  'DISTURBED WETLANDS (MODIFIED)', '#F59E0B',
  'DISTURBED TIDAL WETLANDS', '#D97706',
  'AGRICULTURAL WETLANDS (MODIFIED)', '#EAB308',
  'FORMER AGRICULTURAL WETLAND (BECOMING SHRUBBY, NOT BUILT-UP)', '#CA8A04',
  // Managed/Urban
  'MANAGED WETLAND IN MAINTAINED LAWN GREENSPACE', '#8B5CF6',
  'MANAGED WETLAND IN BUILT-UP MAINTAINED REC AREA', '#7C3AED',
  'WETLAND RIGHTS-OF-WAY', '#6B7280',
  'CEMETERY ON WETLAND', '#9CA3AF',
  // Other
  'SEVERE BURNED WETLAND VEGETATION', '#78350F',
  // Default fallback
  '#6B7280'
];

// Wetlands fill layer (color-coded by NJDEP label)
export const wetlandsFillLayer: FillLayer = {
  id: 'wetlands-fill',
  type: 'fill',
  source: 'wetlands',
  paint: {
    'fill-color': wetlandColorMatchExpression as any,
    'fill-opacity': 0.5
  }
};

// Wetlands outline layer
export const wetlandsLineLayer: LineLayer = {
  id: 'wetlands-line',
  type: 'line',
  source: 'wetlands',
  paint: {
    'line-color': wetlandColorMatchExpression as any,
    'line-width': 1.5,
    'line-opacity': 0.8
  }
};

// ============================================================================
// Redevelopment Zones Layers
// ============================================================================

// Use an orange hatch pattern visually distinct from wetlands
export const redevZonesFillLayer: FillLayer = {
  id: 'redev-zones-fill',
  type: 'fill',
  source: 'redev-zones',
  paint: {
    'fill-color': [
      'match',
      ['get', 'condemn_authority'],
      'Yes', '#EA580C',  // Orange-600 for Condemnation
      'No', '#FDBA74',   // Orange-300 for Non-Condemnation
      'Unknown', '#FED7AA', // Orange-200 for Unknown
      '#FDBA74' // Default
    ],
    'fill-opacity': 0.4
  }
};

// Redevelopment Zones outline
export const redevZonesLineLayer: LineLayer = {
  id: 'redev-zones-line',
  type: 'line',
  source: 'redev-zones',
  paint: {
    'line-color': '#EA580C', // Orange-600
    'line-width': 2,
    'line-dasharray': [2, 1] // Dashed line to distinguish from wetlands
  }
};
