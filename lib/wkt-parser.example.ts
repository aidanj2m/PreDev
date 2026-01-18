/**
 * Example usage of WKT parser for boundary_geojson
 * 
 * This file demonstrates how the parseBoundaryGeoJSON function handles
 * different formats of boundary data that might come from the API.
 */

import { parseBoundaryGeoJSON } from './wkt-parser';

// Example 1: API returns WKT format
const wktFormat = {
  wkt: "POLYGON ((-74.536876 40.561804, -74.536500 40.561700, -74.536300 40.562000, -74.536876 40.561804))",
  properties: {
    owner: "John Doe",
    land_use: "Residential"
  }
};

const parsed1 = parseBoundaryGeoJSON(wktFormat);
console.log('Parsed WKT:', parsed1);
// Result: {
//   type: 'Feature',
//   geometry: {
//     type: 'Polygon',
//     coordinates: [[[-74.536876, 40.561804], [-74.536500, 40.561700], ...]]
//   },
//   properties: { owner: "John Doe", land_use: "Residential" }
// }

// Example 2: API returns standard GeoJSON format (backwards compatible)
const geojsonFormat = {
  geometry: {
    type: 'Polygon',
    coordinates: [[[-74.536876, 40.561804], [-74.536500, 40.561700], [-74.536300, 40.562000], [-74.536876, 40.561804]]]
  },
  properties: {
    owner: "Jane Smith",
    land_use: "Commercial"
  }
};

const parsed2 = parseBoundaryGeoJSON(geojsonFormat);
console.log('Parsed GeoJSON:', parsed2);
// Result: Same structure as input (already in correct format)

// Example 3: API returns raw geometry (type + coordinates)
const rawGeometry = {
  type: 'Polygon',
  coordinates: [[[-74.536876, 40.561804], [-74.536500, 40.561700], [-74.536300, 40.562000], [-74.536876, 40.561804]]],
  properties: {
    owner: "Bob Johnson"
  }
};

const parsed3 = parseBoundaryGeoJSON(rawGeometry);
console.log('Parsed raw geometry:', parsed3);
// Result: {
//   type: 'Feature',
//   geometry: { type: 'Polygon', coordinates: [...] },
//   properties: { owner: "Bob Johnson" }
// }

// Example 4: Invalid or null data
const parsed4 = parseBoundaryGeoJSON(null);
console.log('Parsed null:', parsed4); // Result: null

const parsed5 = parseBoundaryGeoJSON(undefined);
console.log('Parsed undefined:', parsed5); // Result: null
