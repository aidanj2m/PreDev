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
// Nearby Parcels Layers (from database/Lightbox)
// ============================================================================

// Nearby parcel fill layer - very subtle, just showing boundaries
export const nearbyParcelsFillLayer: FillLayer = {
  id: 'nearby-parcels-fill',
  type: 'fill',
  source: 'nearby-parcels',
  paint: {
    'fill-color': 'transparent', // No fill by default
    'fill-opacity': 0
  }
};

// Nearby parcel outline layer - light grey boundaries
export const nearbyParcelsLineLayer: LineLayer = {
  id: 'nearby-parcels-line',
  type: 'line',
  source: 'nearby-parcels',
  paint: {
    'line-color': '#D1D5DB',   // Light grey (gray-300)
    'line-width': 0.8,
    'line-opacity': 0.6
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

// ============================================================================
// CAFRA Centers Layers
// ============================================================================

export const cafraCentersFillLayer: FillLayer = {
  id: 'cafra-centers-fill',
  type: 'fill',
  source: 'cafra-centers',
  paint: {
    'fill-color': [
      'match',
      ['get', 'center_type'],
      'CAFRA Core', '#9333EA',      // Purple-600
      'CAFRA Node', '#A855F7',      // Purple-500
      'CAFRA Town', '#C084FC',      // Purple-400
      'CAFRA Village', '#D8B4FE',   // Purple-300
      'CAFRA Hamlet', '#E9D5FF',    // Purple-200
      '#9333EA' // Default
    ],
    'fill-opacity': 0.3
  }
};

export const cafraCentersLineLayer: LineLayer = {
  id: 'cafra-centers-line',
  type: 'line',
  source: 'cafra-centers',
  paint: {
    'line-color': '#7E22CE', // Purple-700
    'line-width': 2
  }
};

// ============================================================================
// Hydrography Layers (Streams & Waterbodies)
// ============================================================================

export const hydroStreamsLineLayer: LineLayer = {
  id: 'hydro-streams-line',
  type: 'line',
  source: 'hydrography',
  filter: ['==', 'layer', 'stream'],
  paint: {
    'line-color': '#0077BE', // Ocean Blue
    'line-width': 2,
    'line-opacity': 0.8
  }
};

export const hydroWaterbodiesFillLayer: FillLayer = {
  id: 'hydro-waterbodies-fill',
  type: 'fill',
  source: 'hydrography',
  filter: ['==', 'layer', 'waterbody'],
  paint: {
    'fill-color': '#0077BE',
    'fill-opacity': 0.3
  }
};

export const hydroWaterbodiesLineLayer: LineLayer = {
  id: 'hydro-waterbodies-line',
  type: 'line',
  source: 'hydrography',
  filter: ['==', 'layer', 'waterbody'],
  paint: {
    'line-color': '#005A8F', // Darker Blue
    'line-width': 1,
    'line-opacity': 0.5
  }
};

// ============================================================================
// Hazardous Waste Sites Layers
// ============================================================================

export const hazardousWasteFillLayer: FillLayer = {
  id: 'hazardous-waste-fill',
  type: 'fill',
  source: 'hazardous-waste-sites',
  paint: {
    'fill-color': [
      'match',
      ['get', 'site_status'],
      'Active', '#DC2626',  // Red for active sites
      'Closed', '#65A30D',  // Green for closed
      'Post NFA Monitoring', '#F59E0B',  // Amber
      '#DC2626'  // Default red
    ],
    'fill-opacity': 0.6
  }
};

export const hazardousWasteLineLayer: LineLayer = {
  id: 'hazardous-waste-line',
  type: 'line',
  source: 'hazardous-waste-sites',
  paint: {
    'line-color': '#991B1B',  // Dark red
    'line-width': 1.5
  }
};

// ============================================================================
// Brownfield Sites Layers
// ============================================================================

export const brownfieldFillLayer: FillLayer = {
  id: 'brownfield-fill',
  type: 'fill',
  source: 'brownfield-sites',
  paint: {
    'fill-color': [
      'match',
      ['get', 'case_status'],
      'Active', '#92400E',  // Brown
      'Active - RAP', '#B45309',  // Light brown
      'Closed', '#65A30D',  // Green
      '#92400E'  // Default brown
    ],
    'fill-opacity': 0.5
  }
};

export const brownfieldLineLayer: LineLayer = {
  id: 'brownfield-line',
  type: 'line',
  source: 'brownfield-sites',
  paint: {
    'line-color': '#78350F',  // Dark brown
    'line-width': 1.5
  }
};

// ============================================================================
// Contaminated Sites Layers
// ============================================================================

export const contaminatedSitesFillLayer: FillLayer = {
  id: 'contaminated-sites-fill',
  type: 'fill',
  source: 'contaminated-sites',
  paint: {
    'fill-color': [
      'match',
      ['get', 'status'],
      'Active', '#DC2626',  // Red
      'Active - Post Rem', '#F59E0B',  // Amber
      'Active - UHOT', '#EA580C',  // Orange
      '#DC2626'  // Default red
    ],
    'fill-opacity': 0.5
  }
};

export const contaminatedSitesLineLayer: LineLayer = {
  id: 'contaminated-sites-line',
  type: 'line',
  source: 'contaminated-sites',
  paint: {
    'line-color': '#7F1D1D',  // Very dark red
    'line-width': 1
  }
};

// ============================================================================
// Pinelands Management Areas Layers
// ============================================================================

export const pinelandsFillLayer: FillLayer = {
  id: 'pinelands-fill',
  type: 'fill',
  source: 'pinelands-areas',
  paint: {
    'fill-color': [
      'match',
      ['get', 'mgt_name'],
      'Preservation Area District', '#14532D',  // Dark green
      'Forest Area', '#166534',  // Green
      'Agricultural Production Area', '#84CC16',  // Light green
      'Rural Development Area', '#A3E635',  // Yellow-green
      'Regional Growth Area', '#FCD34D',  // Yellow
      'Pinelands Village', '#F59E0B',  // Amber
      'Pinelands Town', '#EA580C',  // Orange
      '#059669'  // Default green
    ],
    'fill-opacity': 0.4
  }
};

export const pinelandsLineLayer: LineLayer = {
  id: 'pinelands-line',
  type: 'line',
  source: 'pinelands-areas',
  paint: {
    'line-color': '#065F46',  // Dark green
    'line-width': 2
  }
};

// ============================================================================
// BDA Block/Lot Polygons Layers
// ============================================================================

export const bdaFillLayer: FillLayer = {
  id: 'bda-fill',
  type: 'fill',
  source: 'bda-blocklots',
  paint: {
    'fill-color': [
      'match',
      ['get', 'overall_status'],
      'LSRP Oversight', '#F59E0B',  // Amber
      'Assigned to Program', '#EAB308',  // Yellow
      'Non-Remedial', '#65A30D',  // Green
      '#F59E0B'  // Default amber
    ],
    'fill-opacity': 0.5
  }
};

export const bdaLineLayer: LineLayer = {
  id: 'bda-line',
  type: 'line',
  source: 'bda-blocklots',
  paint: {
    'line-color': '#D97706',  // Orange
    'line-width': 1.5
  }
};

// ============================================================================
// C1 Waters Layers
// ============================================================================

export const c1WatersFillLayer: FillLayer = {
  id: 'c1-waters-fill',
  type: 'fill',
  source: 'c1-waters',
  paint: {
    'fill-color': [
      'match',
      ['get', 'category'],
      'FW2-NTC1/SE1', '#0EA5E9',  // Sky blue
      'FW2-NTC1', '#06B6D4',  // Cyan
      'SE1C1', '#0891B2',  // Teal blue
      'FW2-TPC1', '#0284C7',  // Blue
      'FW2-TMC1', '#0369A1',  // Dark blue
      '#0891B2'  // Default teal
    ],
    'fill-opacity': 0.5
  }
};

export const c1WatersLineLayer: LineLayer = {
  id: 'c1-waters-line',
  type: 'line',
  source: 'c1-waters',
  paint: {
    'line-color': '#075985',  // Deep blue
    'line-width': 2
  }
};

// ============================================================================
// Highlands Preservation/Planning Areas Layers
// ============================================================================

export const highlandsFillLayer: FillLayer = {
  id: 'highlands-fill',
  type: 'fill',
  source: 'highlands-areas',
  paint: {
    'fill-color': [
      'match',
      ['get', 'region'],
      'Highlands Preservation Area', '#7C3AED',  // Purple
      'Highlands Planning Area', '#A78BFA',  // Light purple
      '#8B5CF6'  // Default purple
    ],
    'fill-opacity': 0.4
  }
};

export const highlandsLineLayer: LineLayer = {
  id: 'highlands-line',
  type: 'line',
  source: 'highlands-areas',
  paint: {
    'line-color': '#6D28D9',  // Dark purple
    'line-width': 2
  }
};

// ============================================================================
// Flood Hazard Sites Layers
// ============================================================================

export const floodHazardLineLayer: LineLayer = {
  id: 'flood-hazard-line',
  type: 'line',
  source: 'flood-hazard-sites',
  paint: {
    'line-color': '#1E3A8A',  // Dark blue
    'line-width': 2,
    'line-opacity': 0.7
  }
};
